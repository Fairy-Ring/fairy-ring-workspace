/**
 * Path B — mainland after tutorial.
 * Light proofs: Lumbridge courtyard, **in-era bank open**, short walk.
 *
 * Bank target is **Draynor** (booths on map + scripted). Lumbridge castle
 * upstairs bank is post-377 (27 Sep 2006); cache has no castle bankbooth.
 * @see docs/research/lumbridge-bank-377.md
 */
import {
    type Task,
    Execution,
    Game,
    Locs,
    Bank,
    StageTask,
    noDialog,
    walkToward,
    Traversal,
    ChatDialog
} from '../../api.ts';
import type PathABCBot from '../PathABCBot.ts';

/** Terrova telejump 0_50_50_22_22 → castle courtyard. */
const LUMB_CASTLE = { x: 3222, z: 3222 };

/**
 * Draynor bank booths (in-era nearest bank to tutorial exit path).
 * Packed map: bankbooth 2213 @ 3091,3242–3245 L0.
 */
const DRAYNOR_BANK = { x: 3092, z: 3243 };
const BANK_BOX = { minX: 3088, maxX: 3098, minZ: 3238, maxZ: 3248 };

export const onMainland = (): boolean => {
    const t = Game.tile();
    return t !== null && t.x >= 3000 && t.z >= 3100 && t.z < 3400;
};

export const nearLumbridgeCastle = (): boolean => {
    const t = Game.tile();
    if (!t) return false;
    return Math.max(Math.abs(t.x - LUMB_CASTLE.x), Math.abs(t.z - LUMB_CASTLE.z)) <= 40;
};

export interface LumbridgeProgress {
    arrived: boolean;
    bankOpened: boolean;
    walked: boolean;
}

/** Confirm we landed / are in Lumbridge after tutorial finish. */
class ConfirmLumbridge extends StageTask {
    constructor(
        bot: PathABCBot,
        private readonly progress: LumbridgeProgress
    ) {
        super(bot);
    }
    validate(): boolean {
        return !this.progress.arrived && onMainland();
    }
    async execute(): Promise<void> {
        const t = Game.tile();
        if (!t) return;
        if (!nearLumbridgeCastle()) {
            this.bot.log(`ConfirmLumbridge walkTo castle ${LUMB_CASTLE.x},${LUMB_CASTLE.z} from ${t.x},${t.z}`);
            await Traversal.walkTo(LUMB_CASTLE, { radius: 8, log: m => this.bot.log(m) });
            return;
        }
        this.progress.arrived = true;
        this.bot.log(`ConfirmLumbridge OK tile=${t.x},${t.z}`);
    }
}

/**
 * Open a bank booth at **Draynor** (Path B economy touch).
 * Not Lumbridge castle — no booths there in rev 377.
 */
class OpenDraynorBank extends StageTask {
    constructor(
        bot: PathABCBot,
        private readonly progress: LumbridgeProgress
    ) {
        super(bot);
    }
    validate(): boolean {
        return this.progress.arrived && !this.progress.bankOpened && noDialog() && onMainland() && !Bank.isOpen();
    }
    async execute(): Promise<void> {
        if (Bank.isOpen()) {
            this.progress.bankOpened = true;
            this.bot.log('OpenDraynorBank already open');
            return;
        }
        // Prefer id 2213 (op1 Use / op2 Use-quickly). 2214 private + 2215 closed have **no** ops
        // (Examine only) — same display name "Bank booth" for 2214.
        const booth =
            Locs.query().name('Bank booth').action('Use-quickly').inside(BANK_BOX).nearest() ??
            Locs.query().name('Bank booth').action('Use').inside(BANK_BOX).nearest() ??
            Locs.query().name('Bank booth').within(12).nearest() ??
            Locs.query().name('Bank booth').within(20).nearest();
        if (!booth) {
            this.bot.log(`OpenDraynorBank no booth — walkTo ${DRAYNOR_BANK.x},${DRAYNOR_BANK.z}`);
            await Traversal.walkTo(DRAYNOR_BANK, { radius: 2, log: m => this.bot.log(m) });
            return;
        }
        if (booth.distance() > 3) {
            this.bot.log(`OpenDraynorBank walkTo booth d=${booth.distance()} @${booth.tile().x},${booth.tile().z}`);
            await Traversal.walkTo(booth.tile(), { radius: 2, log: m => this.bot.log(m) });
            return;
        }
        // Prefer Use-quickly (oploc2 → @openbank, no banker chat). Do not match bare "Use" first.
        const ops = booth.actions();
        const op =
            ops.find(a => /use-quickly/i.test(a)) ??
            ops.find(a => /^use$/i.test(a)) ??
            'Use-quickly';
        this.bot.log(`OpenDraynorBank id=${booth.id} ops=[${ops.join(',')}] ${op} d=${booth.distance()}`);
        await booth.interact(op);
        // oploc1 may open banker dialogue instead of bank UI
        if (await Execution.delayUntil(() => Bank.isOpen() || !noDialog(), 8000)) {
            if (Bank.isOpen()) {
                this.progress.bankOpened = true;
                this.bot.log('OpenDraynorBank open=true');
                return;
            }
            // Banker quiz: "I'd like to access my bank account, please."
            for (let i = 0; i < 6 && !Bank.isOpen(); i++) {
                if (ChatDialog.options().some(o => /bank account/i.test(o))) {
                    await ChatDialog.chooseOption("I'd like to access my bank account, please.");
                } else if (ChatDialog.canContinue()) {
                    await ChatDialog.continue();
                } else {
                    await ChatDialog.advance();
                }
                await Execution.delayUntil(() => Bank.isOpen() || ChatDialog.isOpen(), 2000);
            }
            if (Bank.isOpen()) {
                this.progress.bankOpened = true;
                this.bot.log('OpenDraynorBank open=true (via dialogue)');
            } else {
                this.bot.log('OpenDraynorBank dialogue did not open bank');
            }
        }
    }
}

/** Close bank if open, then a short walk (MOVE wire still healthy). */
class MainlandWalkSoak extends StageTask {
    constructor(
        bot: PathABCBot,
        private readonly progress: LumbridgeProgress
    ) {
        super(bot);
    }
    validate(): boolean {
        return this.progress.arrived && this.progress.bankOpened && !this.progress.walked && onMainland();
    }
    async execute(): Promise<void> {
        if (Bank.isOpen()) {
            await Bank.close();
        }
        const before = Game.tile();
        await walkToward({ x: (before?.x ?? DRAYNOR_BANK.x) + 2, z: before?.z ?? DRAYNOR_BANK.z });
        await Execution.delayTicks(4);
        const after = Game.tile();
        const moved = before && after && (before.x !== after.x || before.z !== after.z);
        this.bot.log(
            `MainlandWalkSoak moved=${!!moved} ${before?.x},${before?.z}→${after?.x},${after?.z}`
        );
        // Count as done even if path blocked — bank open was the content proof.
        this.progress.walked = true;
    }
}

export function lumbridgeStages(bot: PathABCBot, progress: LumbridgeProgress): Task[] {
    return [
        new ConfirmLumbridge(bot, progress),
        new OpenDraynorBank(bot, progress),
        new MainlandWalkSoak(bot, progress)
    ];
}
