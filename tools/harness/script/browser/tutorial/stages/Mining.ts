/**
 * Port of rs2b0t Mining stages — state-driven.
 */
import {
    type Task,
    Execution,
    Game,
    ChatDialog,
    Inventory,
    Skills,
    Locs,
    Npcs,
    StageTask,
    noDialog,
    walkToward,
    type Loc
} from '../../api.ts';
import type TutorialBot from '../TutorialBot.ts';
import { MINE_Z } from './helpers.ts';

const DEZZICK = 'Mining Instructor';
const COPPER_ROCK_ID = 3042;
const TIN_ROCK_ID = 3043;
/** pack/loc.pack — must not use furnace_side (2785); that hits category smelt and skips %tutorial */
const NEWBIE_FURNACE_ID = 3044;
const USE_ON_RANGE = 12;
const EXIT_GATE_X = 3094;
const EXIT_GATE_BOX = { minX: EXIT_GATE_X - 3, maxX: EXIT_GATE_X + 3, minZ: 9498, maxZ: 9507 };
/** Content hint 0_48_148_22_30 — mine exit Gate (newbiedoor4l/r, tut_mining_exit). */
const EXIT_GATE_TILE = { x: 3094, z: 9502 };
/** After ladder: walk here if Dezzick not in client scene yet (hint: 0_48_148_7_33) */
const DEZZICK_STAND = { x: 3079, z: 9505 };

const inMine = () => {
    const t = Game.tile();
    return t !== null && t.z >= MINE_Z;
};

function rockQuery(id: number) {
    return Locs.query()
        .name('Rocks')
        .where((l: Loc) => l.id === id);
}

interface MiningProgress {
    prospectedCopper: boolean;
    prospectedTin: boolean;
}

/** Walk to Dezzick and Talk-to only when chat is fully closed (rs2b0t). */
async function talkToDezzick(bot: { log: (m: string) => void }): Promise<boolean> {
    // Do not clearDialogs here — AdvanceDialog owns multi-page drain.
    // Clearing mid-chat aborts replace_items before hammer objbox.
    if (ChatDialog.isOpen()) return false;
    const npc = Npcs.query().name(DEZZICK).within(40).nearest();
    if (!npc) {
        // Post-ladder scene lag: walk to instructor stand until NPC spawns in client
        bot.log(`Talk Dezzick: NPC not in scene — walk stand ${DEZZICK_STAND.x},${DEZZICK_STAND.z}`);
        await walkToward(DEZZICK_STAND);
        return false;
    }
    if (npc.distance() > 5) {
        bot.log(`Talk Dezzick walk d=${npc.distance()}`);
        await walkToward(npc.tile());
        return false;
    }
    bot.log(`Talk Dezzick Talk-to d=${npc.distance()} idx=${npc.index}`);
    await npc.interact('Talk-to');
    return true;
}

class TalkMiningInstructor extends StageTask {
    private talked = false;
    validate(): boolean {
        return !this.talked && inMine() && noDialog();
    }
    async execute(): Promise<void> {
        if (!(await talkToDezzick(this.bot))) return;
        // Wait for chat to open then leave clearing to AdvanceDialog
        if (await Execution.delayUntil(() => ChatDialog.isOpen(), 8000)) this.talked = true;
    }
}

class ProspectCopper extends StageTask {
    private done = false;
    constructor(
        bot: TutorialBot,
        private readonly progress: MiningProgress
    ) {
        super(bot);
    }
    validate(): boolean {
        return !this.done && inMine() && noDialog();
    }
    async execute(): Promise<void> {
        const rock = rockQuery(COPPER_ROCK_ID).within(40).nearest();
        if (!rock) return;
        if (rock.distance() > 5) {
            await walkToward(rock.tile());
            return;
        }
        await rock.interact('Prospect');
        // Prospect opens a multi-line chat — mark done when dialog appears; AdvanceDialog drains it
        if (await Execution.delayUntil(() => ChatDialog.isOpen(), 8000)) {
            this.done = true;
            this.progress.prospectedCopper = true;
        }
    }
}

class ProspectTin extends StageTask {
    private done = false;
    constructor(
        bot: TutorialBot,
        private readonly progress: MiningProgress
    ) {
        super(bot);
    }
    validate(): boolean {
        return !this.done && inMine() && noDialog() && this.progress.prospectedCopper;
    }
    async execute(): Promise<void> {
        const rock = rockQuery(TIN_ROCK_ID).within(40).nearest();
        if (!rock) return;
        if (rock.distance() > 5) {
            await walkToward(rock.tile());
            return;
        }
        await rock.interact('Prospect');
        if (await Execution.delayUntil(() => ChatDialog.isOpen(), 8000)) {
            this.done = true;
            this.progress.prospectedTin = true;
        }
    }
}

class TalkForPickaxe extends StageTask {
    private done = false;
    constructor(
        bot: TutorialBot,
        private readonly progress: MiningProgress
    ) {
        super(bot);
    }
    validate(): boolean {
        return !this.done && inMine() && noDialog() && this.progress.prospectedTin && !Inventory.contains('Bronze pickaxe');
    }
    async execute(): Promise<void> {
        if (!(await talkToDezzick(this.bot))) return;
        if (await Execution.delayUntil(() => Inventory.contains('Bronze pickaxe'), 10000)) this.done = true;
    }
}

class MineCopper extends StageTask {
    private done = false;
    validate(): boolean {
        return (
            !this.done &&
            inMine() &&
            noDialog() &&
            Inventory.contains('Bronze pickaxe') &&
            !Inventory.contains('Copper ore') &&
            !Game.animating()
        );
    }
    async execute(): Promise<void> {
        const rock = rockQuery(COPPER_ROCK_ID).within(40).nearest();
        if (!rock) return;
        if (rock.distance() > 5) {
            await walkToward(rock.tile());
            return;
        }
        await rock.interact('Mine');
        if (await Execution.delayUntil(() => Inventory.contains('Copper ore'), 15000)) this.done = true;
    }
}

class MineTin extends StageTask {
    private done = false;
    validate(): boolean {
        return (
            !this.done &&
            inMine() &&
            noDialog() &&
            Inventory.contains('Copper ore') &&
            !Inventory.contains('Tin ore') &&
            !Game.animating()
        );
    }
    async execute(): Promise<void> {
        const rock = rockQuery(TIN_ROCK_ID).within(40).nearest();
        if (!rock) return;
        if (rock.distance() > 5) {
            await walkToward(rock.tile());
            return;
        }
        await rock.interact('Mine');
        if (await Execution.delayUntil(() => Inventory.contains('Tin ore'), 15000)) this.done = true;
    }
}

/**
 * Smelt success = exact Bronze bar + both ores gone (content tut_smelting).
 * Do not advance to TalkForHammer on a single wait timeout / partial state.
 * newbiefurnace is 3×3 forceapproach=east — approach from east of SW corner.
 */
function smeltDone(): boolean {
    return (
        Inventory.contains('Bronze bar') &&
        !Inventory.contains('Copper ore') &&
        !Inventory.contains('Tin ore')
    );
}

class SmeltBronze extends StageTask {
    private attempts = 0;
    validate(): boolean {
        return (
            inMine() &&
            noDialog() &&
            Inventory.contains('Copper ore') &&
            Inventory.contains('Tin ore') &&
            !Inventory.contains('Bronze bar')
        );
    }
    async execute(): Promise<void> {
        // Prefer newbiefurnace (3044). Nearest name "Furnace" is often furnace_side (2785)
        // at 3081,9496 — category smelt gives a bar without advancing %tutorial sticky.
        let furnace = Locs.query()
            .name('Furnace')
            .where((l: Loc) => l.id === NEWBIE_FURNACE_ID)
            .within(20)
            .nearest();
        if (!furnace) {
            furnace = Locs.query().name('Furnace').within(20).nearest();
            if (furnace && furnace.id !== NEWBIE_FURNACE_ID) {
                this.bot.log(
                    `SmeltBronze WARN nearest Furnace id=${furnace.id} (want ${NEWBIE_FURNACE_ID}) — still using; content should guard furnace_side`
                );
            }
        }
        if (!furnace) {
            this.bot.log('SmeltBronze: no Furnace in scene');
            return;
        }
        // forceapproach=east: stand east of multi-tile furnace before use
        const stand = { x: furnace.tile().x + 3, z: furnace.tile().z + 1 };
        const me = Game.tile();
        if (me) {
            const dStand = Math.max(Math.abs(me.x - stand.x), Math.abs(me.z - stand.z));
            if (dStand > 2 || furnace.distance() > USE_ON_RANGE) {
                this.bot.log(
                    `SmeltBronze walk east of furnace id=${furnace.id} dFurn=${furnace.distance()} dStand=${dStand} ` +
                        `furn@${furnace.tile().x},${furnace.tile().z}`
                );
                await walkToward(stand);
                return;
            }
        }
        const ore = Inventory.first('Copper ore') ?? Inventory.first('Tin ore');
        if (!ore) return;
        this.attempts++;
        this.bot.log(
            `SmeltBronze use ${ore.name}#${ore.id}@${ore.slot} on furnace id=${furnace.id} ` +
                `tc=${furnace.typecode} lx=${furnace.snap.lx},${furnace.snap.lz} ` +
                `attempt=${this.attempts} inv=[${Inventory.debugList()}]`
        );
        const sent = await ore.useOn(furnace);
        if (!sent) {
            this.bot.log('SmeltBronze useOn returned false (no packet?)');
            await Execution.delayTicks(2);
            return;
        }
        // Content: p_arrivedelay + p_delay(3) + bar; mes may become modalMessage
        const got = await Execution.delayUntil(() => smeltDone(), 20000);
        if (got) {
            this.bot.log(
                `SmeltBronze OK id=${furnace.id} smithingXp=${Skills.xp('smithing')} inv=[${Inventory.debugList()}]`
            );
            return;
        }
        this.bot.log(
            `SmeltBronze FAIL after 20s inv=[${Inventory.debugList()}] ` +
                `smithingXp=${Skills.xp('smithing')} modal=${ChatDialog.modalMessage() ?? '-'}`
        );
        await Execution.delayTicks(2);
    }
}

/**
 * After **successful** smelt: Talk-to Dezzick → chat → replace_items (hammer objbox).
 * Gate on smeltDone(). AdvanceDialog drains pages — **do not** re-Talk while a
 * conversation may still be in flight (run10: 100+ Talk-to cancelled mid-chain).
 */
class TalkForHammer extends StageTask {
    private done = false;
    private talks = 0;
    private lastTalkAt = 0;
    /** After Talk that opened chat, cool down hard so AdvanceDialog can finish. */
    private cooldownUntil = 0;
    validate(): boolean {
        return (
            !this.done &&
            inMine() &&
            noDialog() &&
            smeltDone() &&
            !Inventory.contains('Hammer')
        );
    }
    async execute(): Promise<void> {
        if (ChatDialog.isOpen()) return; // AdvanceDialog owns the drain
        if (Inventory.contains('Hammer')) {
            this.done = true;
            this.bot.log('TalkForHammer got Hammer');
            return;
        }
        const now = performance.now();
        // 12s cooldown after each Talk attempt (chat + objbox is multi-second)
        if (now < this.cooldownUntil) {
            await Execution.delay(400);
            return;
        }
        this.bot.log(`TalkForHammer Talk-to attempt ${this.talks + 1}`);
        if (!(await talkToDezzick(this.bot))) return;
        this.talks++;
        this.lastTalkAt = performance.now();
        this.cooldownUntil = this.lastTalkAt + 12_000;
        // Wait for hammer (inv_add is before objbox in replace_items) or chat open
        const ok = await Execution.delayUntil(
            () => Inventory.contains('Hammer') || ChatDialog.isOpen(),
            10_000
        );
        if (Inventory.contains('Hammer')) {
            this.done = true;
            this.bot.log('TalkForHammer got Hammer');
            return;
        }
        if (!ok) {
            this.bot.log(`TalkForHammer no dialog/hammer after Talk-to (attempt ${this.talks})`);
        } else {
            this.bot.log('TalkForHammer dialog open — yield to AdvanceDialog for chat+objbox');
            // Extra patience while pages drain (no re-Talk)
            this.cooldownUntil = performance.now() + 15_000;
        }
    }
}

/** After hammer appears mid-dialog, wait until chat closed so Smith can run. */
class WaitHammerDialogClear extends StageTask {
    validate(): boolean {
        return inMine() && Inventory.contains('Hammer') && ChatDialog.isOpen();
    }
    async execute(): Promise<void> {
        // One step; AdvanceDialog also runs — just back off
        await Execution.delayTicks(2);
    }
}

class SmithDagger extends StageTask {
    validate(): boolean {
        return (
            (noDialog() || ChatDialog.isMainMakePanel()) &&
            inMine() &&
            Inventory.contains('Bronze bar') &&
            Inventory.contains('Hammer')
        );
    }
    async execute(): Promise<void> {
        // Panel open: products from TYPE_INV columns (Make / Make 5 / Make 10) → INV_BUTTON
        if (ChatDialog.isMainMakePanel()) {
            const products = ChatDialog.mainMakeProducts();
            this.bot.log(
                `SmithDagger panel open products=[${products.join(', ') || '(none)'}] inv=${Inventory.debugList()}`
            );
            if (!products.some(p => p.toLowerCase().includes('dagger'))) {
                this.bot.log('SmithDagger: no dagger product on panel — will not IF_BUTTON-guess');
                await Execution.delayTicks(1);
                return;
            }
            const ok = await ChatDialog.makeFromPanel('dagger');
            this.bot.log(`SmithDagger makeFromPanel('dagger') sent=${ok}`);
            const got = await Execution.delayUntil(() => Inventory.contains('Bronze dagger'), 10000);
            this.bot.log(
                `SmithDagger wait dagger → ${got} panelStill=${ChatDialog.isMainMakePanel()} inv=${Inventory.debugList()}`
            );
            return;
        }

        const anvil = Locs.query().name('Anvil').within(40).nearest();
        if (!anvil) {
            this.bot.log('SmithDagger: no Anvil in range');
            return;
        }
        if (anvil.distance() > USE_ON_RANGE) {
            this.bot.log(`SmithDagger walk to anvil d=${anvil.distance()}`);
            await walkToward(anvil.tile());
            return;
        }
        const bar = Inventory.first('Bronze bar');
        if (!bar) return;
        this.bot.log('SmithDagger use Bronze bar on Anvil');
        await bar.useOn(anvil);
        // rs2b0t waits for panel; also accept dagger if content finishes without us seeing IF
        const opened = await Execution.delayUntil(
            () => ChatDialog.isMainMakePanel() || Inventory.contains('Bronze dagger'),
            8000
        );
        this.bot.log(
            `SmithDagger after useOn opened=${opened} panel=${ChatDialog.isMainMakePanel()} dagger=${Inventory.contains('Bronze dagger')} products=[${ChatDialog.mainMakeProducts().join(', ')}]`
        );
    }
}

/**
 * Mine → combat Gate (newbiedoor4l/r @ ~3094,9502).
 * Loc scan maxDist=15; anvil/smith stand (~3076,9497) is ~18 tiles away so Gate
 * is often **not in the scan** — do not silent-return; walk toward known tile first.
 */
class OpenMineGate extends StageTask {
    private done = false;
    validate(): boolean {
        const t = Game.tile();
        return !this.done && inMine() && noDialog() && Inventory.contains('Bronze dagger') && t !== null && t.x <= EXIT_GATE_X;
    }
    async execute(): Promise<void> {
        let gate = Locs.query().name('Gate').action('Open').inside(EXIT_GATE_BOX).nearest();
        if (!gate) {
            // Widen name match without box (still maxDist 15 from player)
            gate = Locs.query().name('Gate').action('Open').within(15).nearest();
        }
        if (!gate) {
            this.bot.log(
                `OpenMineGate: Gate not in loc scan — walk ${EXIT_GATE_TILE.x},${EXIT_GATE_TILE.z} from ${Game.tile()?.x},${Game.tile()?.z}`
            );
            await walkToward(EXIT_GATE_TILE);
            return;
        }
        // Open only when adjacent — d=4 was sending OPLOC and getting "I can't reach that!".
        if (gate.distance() > 2) {
            this.bot.log(
                `OpenMineGate walk Gate@${gate.tile().x},${gate.tile().z} id=${gate.id} d=${gate.distance()}`
            );
            // Prefer west stand (mine side) so content p_teleport(+1) crosses east into combat.
            const stand = { x: EXIT_GATE_TILE.x - 1, z: EXIT_GATE_TILE.z };
            await walkToward(gate.distance() > 6 ? stand : gate.tile());
            return;
        }
        this.bot.log(`OpenMineGate Open Gate@${gate.tile().x},${gate.tile().z} id=${gate.id} d=${gate.distance()}`);
        await gate.interact('Open');
        const crossed = await Execution.delayUntil(() => {
            const t = Game.tile();
            return t !== null && t.x > EXIT_GATE_X;
        }, 8000);
        if (crossed) this.done = true;
        else {
            this.bot.log(
                `OpenMineGate Open sent but not past x>${EXIT_GATE_X} yet tile=${Game.tile()?.x},${Game.tile()?.z}`
            );
            await walkToward({ x: EXIT_GATE_TILE.x - 1, z: EXIT_GATE_TILE.z });
        }
    }
}

export function miningStages(bot: TutorialBot): Task[] {
    const progress: MiningProgress = { prospectedCopper: false, prospectedTin: false };
    return [
        new TalkMiningInstructor(bot),
        new ProspectCopper(bot, progress),
        new ProspectTin(bot, progress),
        new TalkForPickaxe(bot, progress),
        new MineCopper(bot),
        new MineTin(bot),
        new SmeltBronze(bot),
        new TalkForHammer(bot),
        new WaitHammerDialogClear(bot),
        new SmithDagger(bot),
        new OpenMineGate(bot)
    ];
}
