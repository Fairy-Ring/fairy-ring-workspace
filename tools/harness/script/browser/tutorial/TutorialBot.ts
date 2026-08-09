/**
 * Adapted from rs2b0t TutorialBot — harness script host (not full bot client).
 *
 * Stages are **state-driven** (inv / skills / tile / dialog). Tutorial varp 281
 * is logged only — many progress varps never reach the client (274 experience).
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
import { survivalStages } from './stages/Survival.ts';
import { chefStages } from './stages/Chef.ts';
import { questGuideStages } from './stages/QuestGuide.ts';
import { miningStages } from './stages/Mining.ts';
import { combatStages } from './stages/Combat.ts';
import { bankChapelStages } from './stages/BankChapel.ts';
import { magicStages } from './stages/Magic.ts';

const DESIGN_MODAL = 3559;
const DECLINE_SKIP = ['no, thank you'];
const MOVE_ON = ['ready to move on', 'yes.', 'nothing, thanks', "i'm ready", 'i am ready'];

/**
 * Drain blocking chat: chatModal Continue/options **and** tutComMessage
 * ("Click to continue" parchment after smelt mes while tut sticky is set).
 */
class AdvanceDialog implements Task {
    validate() {
        return ChatDialog.isOpen();
    }
    async execute() {
        const mm = ChatDialog.modalMessage?.();
        if (mm) {
            // Client-local dismiss — same as left-click on chatback
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
    constructor(private bot: TutorialBot) {}
    validate() {
        return true;
    }
    async execute() {
        const tile = Game.tile();
        const inv = Inventory.items()
            .map(i => i.name)
            .filter(Boolean)
            .slice(0, 10)
            .join(',');
        const key = [
            tile ? `${tile.x},${tile.z}` : '?',
            `fm=${Skills.xp('firemaking')}`,
            `ck=${Skills.xp('cooking')}`,
            `mi=${Skills.xp('mining')}`,
            `mg=${Skills.xp('magic')}`,
            `rg=${Skills.xp('ranged')}`,
            inv
        ].join('|');
        if (key !== this.lastKey) {
            this.lastKey = key;
            this.bot.log(
                `tile=${tile ? `${tile.x},${tile.z}` : '?'} fm=${Skills.xp('firemaking')} cook=${Skills.xp('cooking')} mine=${Skills.xp('mining')} mage=${Skills.xp('magic')} range=${Skills.xp('ranged')} inv=[${inv}] tutVarp=${reader.tutorial()}`
            );
        }
        await Execution.delay(0);
    }
}

export default class TutorialBot extends TaskBot {
    /** One client tick between task cycles (Client.loopCycle). */
    override loopTicks = 1;

    override async onStart(): Promise<void> {
        // Not bare ingame — sceneState=2 before first OP (Decision 007)
        await Execution.delayUntil(() => Game.sceneReady() && Game.tile() !== null, 90_000);
        if (!Game.sceneReady()) {
            this.log(`warn: starting with sceneState=${Game.sceneState()} (want 2)`);
        }
        this.log('TutorialBot (harness) — full island stages (state-driven; no varp gates)');
        // Cheats OK for out-of-band setup (give/tele/reload content pack) — never to force-pass
        // a stage that should be proven by real OPLOC/Talk/inv outcomes. See decision 004.

        this.add(new AdvanceDialog());
        this.add(new DesignAccept(this));

        for (const t of survivalStages(this)) this.add(t);
        for (const t of chefStages(this)) this.add(t);
        for (const t of questGuideStages(this)) this.add(t);
        for (const t of miningStages(this)) this.add(t);
        for (const t of combatStages(this)) this.add(t);
        for (const t of bankChapelStages(this)) this.add(t);
        for (const t of magicStages(this)) this.add(t);

        this.add(new ProgressLog(this));
    }

    /**
     * Mainland or magic complete. Not based on tut varp alone.
     */
    done(): boolean {
        const tile = Game.tile();
        if (tile && tile.x >= 3200) return true;
        if (tile && tile.x >= 3140 && tile.z <= 3090 && Skills.xp('magic') > 0) return true;
        return false;
    }
}
