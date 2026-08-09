/**
 * Path A→B→C content roadmap step 1 as a **script** (not cheat probes).
 *
 *   A — Tutorial Island (same stages as TutorialBot)
 *   B — Lumbridge (castle + bank + walk)
 *   C — Kill one Goblin (mainland combat wire)
 *
 * Host: `scripts.start('path-abc')` or `node tools/harness/script/run.mjs path-abc`
 * Thin smoke: `node tools/harness/path-abc-smoke.mjs` → same script.
 *
 * @see docs/plans/2026-08-03-content-delta-sketch.md
 * @see docs/decisions/004-client-bot-harness-boundary.md
 */
import {
    TaskBot,
    Execution,
    ChatDialog,
    Game,
    Inventory,
    Skills,
    reader,
    actions,
    StageTask,
    type Task
} from '../api.ts';
import { survivalStages } from '../tutorial/stages/Survival.ts';
import { chefStages } from '../tutorial/stages/Chef.ts';
import { questGuideStages } from '../tutorial/stages/QuestGuide.ts';
import { miningStages } from '../tutorial/stages/Mining.ts';
import { combatStages } from '../tutorial/stages/Combat.ts';
import { bankChapelStages } from '../tutorial/stages/BankChapel.ts';
import { magicStages } from '../tutorial/stages/Magic.ts';
import { lumbridgeStages, type LumbridgeProgress, onMainland } from './stages/Lumbridge.ts';
import { mainlandCombatStages, type CombatProgress } from './stages/MainlandCombat.ts';

const DESIGN_MODAL = 3559;
const DECLINE_SKIP = ['no, thank you'];
const MOVE_ON = ['ready to move on', 'yes.', 'nothing, thanks', "i'm ready", 'i am ready'];

class AdvanceDialog implements Task {
    validate() {
        return ChatDialog.isOpen();
    }
    async execute() {
        const mm = ChatDialog.modalMessage?.();
        if (mm) {
            console.log(`[script] AdvanceDialog dismiss modalMessage: ${String(mm).slice(0, 60)}`);
            await ChatDialog.continue();
            return;
        }
        if (ChatDialog.canContinue()) {
            await ChatDialog.continue();
            await Execution.delayTicks(1);
            return;
        }
        const opts = ChatDialog.options();
        if (!opts.length) {
            actions.advanceDialog();
            await Execution.delayTicks(1);
            return;
        }
        const lowered = opts.map(o => o.toLowerCase());
        let pick = lowered.findIndex(o => DECLINE_SKIP.some(d => o.includes(d)));
        if (pick === -1) pick = lowered.findIndex(o => MOVE_ON.some(m => o.includes(m)));
        if (pick === -1) pick = opts.length - 1;
        await ChatDialog.chooseOption(opts[pick]);
        await Execution.delayTicks(1);
    }
}

class DesignAccept extends StageTask {
    validate() {
        return reader.modals().main === DESIGN_MODAL;
    }
    async execute() {
        actions.designAccept();
        await Execution.delayUntil(() => reader.modals().main !== DESIGN_MODAL, 4000);
    }
}

class ProgressLog implements Task {
    private lastKey = '';
    constructor(private bot: PathABCBot) {}
    validate() {
        return true;
    }
    async execute() {
        const tile = Game.tile();
        const inv = Inventory.debugList?.() ?? '';
        const key = `${tile?.x},${tile?.z}|${Skills.xp('magic')}|${this.bot.phase()}`;
        if (key !== this.lastKey) {
            this.lastKey = key;
            this.bot.log(
                `phase=${this.bot.phase()} tile=${tile ? `${tile.x},${tile.z}` : '?'} fm=${Skills.xp('firemaking')} cook=${Skills.xp('cooking')} mine=${Skills.xp('mining')} mage=${Skills.xp('magic')} atk=${Skills.xp('attack')} inv=[${inv}]`
            );
        }
        await Execution.delay(0);
    }
}

export default class PathABCBot extends TaskBot {
    /** One client tick between task cycles (Client.loopCycle). */
    override loopTicks = 1;

    private lumb: LumbridgeProgress = { arrived: false, bankOpened: false, walked: false };
    private combat: CombatProgress = { equipped: false, killDone: false };

    phase(): string {
        if (this.combat.killDone) return 'C.done';
        if (this.lumb.walked) return 'C.combat';
        if (this.lumb.arrived) return 'B.lumb';
        if (onMainland()) return 'B.arrive';
        return 'A.tutorial';
    }

    override async onStart(): Promise<void> {
        // Not bare ingame — sceneState=2 before first OP (Decision 007)
        await Execution.delayUntil(() => Game.sceneReady() && Game.tile() !== null, 90_000);
        if (!Game.sceneReady()) {
            this.log(`warn: starting with sceneState=${Game.sceneState()} (want 2)`);
        }
        this.log('PathABCBot — A tutorial → B Lumbridge → C goblin kill (script-first; no force-pass cheats)');

        this.add(new AdvanceDialog());
        this.add(new DesignAccept(this));

        // —— A: tutorial island (shared with TutorialBot) ——
        for (const t of survivalStages(this as never)) this.add(t);
        for (const t of chefStages(this as never)) this.add(t);
        for (const t of questGuideStages(this as never)) this.add(t);
        for (const t of miningStages(this as never)) this.add(t);
        for (const t of combatStages(this as never)) this.add(t);
        for (const t of bankChapelStages(this as never)) this.add(t);
        for (const t of magicStages(this as never)) this.add(t);

        // —— B / C ——
        const lumbReady = () => this.lumb.arrived && this.lumb.bankOpened && this.lumb.walked;
        for (const t of lumbridgeStages(this, this.lumb)) this.add(t);
        for (const t of mainlandCombatStages(this, this.combat, lumbReady)) this.add(t);

        this.add(new ProgressLog(this));
    }

    /** Full A+B+C complete when goblin kill lands. */
    done(): boolean {
        return this.combat.killDone;
    }
}
