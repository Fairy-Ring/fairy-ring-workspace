/**
 * Single-quest host — rs2b0t AIOQuester / QuestEngine pattern, one module at a time.
 *
 * Loop: AdvanceDialog → CloseMainModal → QuestDrive
 * Stop when module.readStage() >= completeStage or ScriptControl stop.
 */
import {
    TaskBot,
    Execution,
    Chat,
    ChatDialog,
    Game,
    QuestHardFail,
    actions,
    reader,
    type Task,
    StageTask
} from '../api.ts';
import { ScriptControl } from '../ScriptControl.ts';
import { executeStep } from './executeStep.ts';
import { takeSnapshot } from './snapshot.ts';
import { pickDialogOption } from './dialogPath.ts';
import type { QuestModule, QuestStep } from './types.ts';

/**
 * Same step + stage, no progress → abort (iteration fail-fast).
 *
 * History:
 * - Started at 8 (docs/runbooks/quest-impl.md).
 * - Raised to 36 "prefer long maxMs" — too slow when stuck.
 * - Tile was added to stallKey for basalt — but `jump:…→toTile` already unique
 *   per hop, so tile only **reset** the counter on walk thrash / repath loops.
 *
 * Now: stallKey = `desc|stage` (no player tile). Walk thrash with same target
 * fails quickly. Flip-flop A↔B is caught by STAGE_STALL_AFTER.
 *
 * Override: `globalThis.__questStallFail = N` / `__questStageStallFail = N`.
 */
const STALL_FAIL_AFTER =
    Number((globalThis as { __questStallFail?: number }).__questStallFail) || 12;
/** Same stage across *any* step thrash (walk↔talk flip-flop). */
const STAGE_STALL_AFTER =
    Number((globalThis as { __questStageStallFail?: number }).__questStageStallFail) || 40;

/**
 * While chat is open, QuestDrive is paused — this task owns multi choices.
 * Path comes from the last `talk.prefer` (script-ordered, from the .rs2 tree).
 */
class AdvanceDialog implements Task {
    constructor(
        private readonly bot: QuestBot,
        private readonly mod: QuestModule
    ) {}
    validate() {
        // Stop chewing chat once stage goal is met
        if (this.mod.readStage() >= this.mod.completeStage) return false;
        return ChatDialog.isOpen();
    }
    /** Multi only: last options fingerprint we already clicked */
    private lastMultiFp = '';

    async execute() {
        this.bot.noteDialogOpen();
        // Between pages: open but neither continue nor multi yet
        if (!ChatDialog.canContinue() && ChatDialog.options().length === 0 && !ChatDialog.modalMessage()) {
            await Execution.delayTicks(1);
            return;
        }

        // —— Multi: one pick per unique options set ——
        if (ChatDialog.options().length > 0) {
            const fp = ChatDialog.fingerprint();
            if (fp === this.lastMultiFp) {
                await Execution.delayTicks(2);
                this.lastMultiFp = '';
                return;
            }
            const opts = ChatDialog.options();
            const pick = pickDialogOption(opts, this.bot.dialogPath);
            this.bot.log(`dialog: ${opts[pick]}`);
            this.lastMultiFp = fp;
            const ok = await ChatDialog.chooseOption(opts[pick]);
            if (!ok) {
                this.bot.log('dialog: chooseOption failed');
                this.lastMultiFp = '';
            }
            return;
        }

        // —— Continue / modal: spacebar (1t settle) ——
        if (ChatDialog.modalMessage()) {
            this.bot.log('dialog: continue (modal)');
            await ChatDialog.continue();
            return;
        }
        if (ChatDialog.canContinue()) {
            this.bot.log('dialog: continue');
            await ChatDialog.continue();
            return;
        }
        await Execution.delayTicks(1);
    }
}

class CloseMainModal implements Task {
    validate() {
        const m = reader.modals()?.main ?? -1;
        return m !== -1 && !ChatDialog.isOpen();
    }
    async execute() {
        actions.closeModal();
        await Execution.delayTicks(1);
    }
}

/**
 * After chat closes: getvar stage **before** QuestDrive re-Talks the NPC.
 * Fixes re-click loops while host poll / non-transmit varbits lag.
 */
class AfterDialogStageRefresh implements Task {
    constructor(
        private readonly bot: QuestBot,
        private readonly mod: QuestModule
    ) {}
    validate() {
        // Edge: was in dialog, now closed → need getvar before next Talk
        if (this.bot.sawDialogOpen && !ChatDialog.isOpen() && !this.bot.needsStageRefresh) {
            this.bot.needsStageRefresh = true;
            this.bot.log('dialog closed → will getvar stage before next action');
        }
        return (
            this.bot.needsStageRefresh &&
            !ChatDialog.isOpen() &&
            Game.tile() !== null
        );
    }
    async execute() {
        await this.bot.refreshStageFromServer();
    }
}

class QuestDrive extends StageTask {
    private lastDesc = '';
    private lastStallKey = '';
    private stalls = 0;
    private lastStage = -1;
    /** Drive cycles spent on the same quest stage (any step). */
    private stageStalls = 0;
    constructor(
        bot: QuestBot,
        private readonly mod: QuestModule
    ) {
        super(bot);
    }
    validate(): boolean {
        // Never talk until post-dialog getvar finishes
        if ((this.bot as QuestBot).needsStageRefresh) return false;
        return (
            !ChatDialog.isOpen() &&
            Game.sceneReady() &&
            Game.tile() !== null &&
            this.mod.readStage() < this.mod.completeStage
        );
    }
    async execute(): Promise<void> {
        // After tele / map build: do not OPNPC until sceneState=2
        if (!Game.sceneReady()) {
            (this.bot as QuestBot).log(`drive: wait sceneState=2 (now ${Game.sceneState()})`);
            await Game.waitSceneReady(60_000, m => (this.bot as QuestBot).log(m));
            return;
        }

        // Global chat poll — catch No trigger even if last step returned true
        const ntEarly = Chat.noTriggerFor(20);
        if (ntEarly) {
            (this.bot as QuestBot).hardFail(`FAIL-FAST: ${ntEarly}`);
            return;
        }

        const snap = takeSnapshot();
        const step: QuestStep = this.mod.decide(snap);
        // Publish script dialog path for AdvanceDialog (runs while dialog open)
        if (
            (step.kind === 'talk' || step.kind === 'useOnNpc') &&
            step.prefer?.length
        ) {
            (this.bot as QuestBot).dialogPath = step.prefer;
        }
        const desc = describe(step);
        const stage = this.mod.readStage();
        // Do NOT put player tile in the key: repath/walk thrash changes tile every
        // cycle and never hits STALL_FAIL_AFTER. Basalt hops already change `desc`
        // (`jump:label→toTile`). Override via __questStallFail / __questStageStallFail.
        const stallKey = `${desc}|${stage}`;
        const tile = snap.tile;
        const tileHint = tile ? `@${tile.x},${tile.z}` : '';

        // Stage-level watchdog: flip-flop between two steps (walk A ↔ talk B)
        // never shares stallKey — still abort when stage does not advance.
        if (stage === this.lastStage && this.lastStage >= 0) {
            this.stageStalls++;
            if (this.stageStalls >= STAGE_STALL_AFTER) {
                if (stage >= this.mod.completeStage) {
                    (this.bot as QuestBot).markFinished();
                    return;
                }
                (this.bot as QuestBot).hardFail(
                    `FAIL-FAST stage=${stage} stuck ×${this.stageStalls} last=${desc}${tileHint}`
                );
                return;
            }
        } else {
            this.stageStalls = 0;
            this.lastStage = stage;
        }

        if (stallKey === this.lastStallKey) {
            this.stalls++;
            if (this.stalls >= STALL_FAIL_AFTER) {
                const nt = Chat.noTriggerFor(24);
                const nih = Chat.nothingInteresting(12);
                const hint = nt ?? nih ?? `no stage progress ${tileHint}`;
                // Soft-stop if already at/above module completeStage (e.g. TBWT start-gate)
                if (stage >= this.mod.completeStage) {
                    this.bot.log(
                        `stall after completeStage=${this.mod.completeStage} on ${desc} — treating as done (${hint})`
                    );
                    (this.bot as QuestBot).markFinished();
                    return;
                }
                (this.bot as QuestBot).hardFail(
                    `FAIL-FAST stall on ${desc} ×${this.stalls} stage=${stage}: ${hint}`
                );
                return;
            }
        } else {
            this.stalls = 0;
            this.lastStallKey = stallKey;
            this.lastDesc = desc;
            this.bot.log(`step ${desc} stage=${stage}${tileHint}`);
        }

        if (step.kind === 'done') return;

        try {
            const ok = await executeStep(step, {
                log: m => this.bot.log(m),
                snap: () => takeSnapshot()
            });
            if (!ok) {
                const nt = Chat.noTriggerFor(20);
                if (nt) {
                    (this.bot as QuestBot).hardFail(`FAIL-FAST: ${nt}`);
                    return;
                }
                this.bot.log(`step failed: ${desc}`);
                await Execution.delayTicks(2);
            }
        } catch (e) {
            if (e instanceof QuestHardFail || (e as Error)?.name === 'QuestHardFail') {
                (this.bot as QuestBot).hardFail(String((e as Error).message ?? e));
                return;
            }
            throw e;
        }
    }
}

function describe(step: QuestStep): string {
    switch (step.kind) {
        case 'custom':
            return `custom:${step.name}`;
        case 'talk':
            return `talk:${step.npc}`;
        case 'walk':
            return `walk:${step.tile.x},${step.tile.z}`;
        case 'interactLoc':
            return `${step.op}:${step.loc}`;
        case 'jump':
            return `jump:${step.label ?? step.loc}→${step.toTile.x},${step.toTile.z}`;
        case 'useOnLoc':
            return `useOnLoc:${step.item}->${step.loc}`;
        case 'useOnNpc':
            return `useOnNpc:${step.item}${step.itemId != null ? `#${step.itemId}` : ''}->${step.npc}`;
        case 'useOnItem':
            return `useOnItem:${step.use}->${step.target}`;
        case 'equip':
            return `equip:${step.item}`;
        case 'wait':
            return `wait:${step.reason}`;
        case 'done':
            return 'done';
    }
}

export default class QuestBot extends TaskBot {
    /** 1 client tick between cycles — continue pages unique via body text fingerprint. */
    override loopTicks = 1;
    override idleTicks = 1;

    private finished = false;
    /** Set by hardFail — content gap / stall; smoke should exit non-zero. */
    failReason: string | null = null;
    /**
     * Ordered multi choices from the ported `.rs2` (last talk step's `prefer`).
     * AdvanceDialog uses this while QuestDrive is idle during chat.
     */
    dialogPath: string[] = [];
    /** True after chat closed; QuestDrive blocked until getvar refresh. */
    needsStageRefresh = false;
    /** Set while AdvanceDialog is chewing chat. */
    sawDialogOpen = false;

    constructor(private readonly mod: QuestModule) {
        super();
    }

    done(): boolean {
        return this.finished || this.mod.readStage() >= this.mod.completeStage;
    }

    /** Call while dialog is open so we can detect close → stage refresh. */
    noteDialogOpen(): void {
        this.sawDialogOpen = true;
    }

    /**
     * After dialogue exits: `getvar <stageVarName>` and apply to readStage()
     * **before** any re-Talk.
     */
    async refreshStageFromServer(): Promise<void> {
        const name = this.mod.stageVarName;
        if (!name) {
            this.needsStageRefresh = false;
            this.sawDialogOpen = false;
            await Execution.delayTicks(1);
            return;
        }
        const before = this.mod.readStage();
        this.log(`dialog closed → getvar ${name} (was ${before})`);
        actions.cheat(`getvar ${name}`);
        const want = `get ${name.toLowerCase()}:`;
        let value: number | null = null;
        for (let i = 0; i < 14; i++) {
            await Execution.delayTicks(1);
            const hit = Chat.texts(28).find(t => t.toLowerCase().includes(want));
            if (!hit) continue;
            const m = hit.match(/:\s*(?:to\s*)?(-?\d+)/i);
            if (m) {
                value = parseInt(m[1], 10);
                break;
            }
        }
        if (value != null && Number.isFinite(value)) {
            if (this.mod.applyServerStage) {
                this.mod.applyServerStage(value);
            } else {
                (globalThis as { __questServerStage?: number }).__questServerStage = value;
            }
            this.log(`stage now ${name}=${value} (was ${before})`);
        } else {
            this.log(`stage refresh: no getvar reply for ${name}`);
        }
        this.needsStageRefresh = false;
        this.sawDialogOpen = false;
        await Execution.delayTicks(1);
    }

    /** Immediate stop — log + ScriptControl so host sees result without maxMs wait. */
    hardFail(reason: string): void {
        this.failReason = reason;
        this.log(reason);
        this.stop();
    }

    /** Soft success stop (start-gate / completeStage reached). */
    markFinished(): void {
        this.finished = true;
        this.stop();
    }

    async onStart(): Promise<void> {
        this.log(`QuestBot ${this.mod.id} — ${this.mod.name}`);
        this.failReason = null;
        this.dialogPath = [];
        this.needsStageRefresh = false;
        this.sawDialogOpen = false;
        ScriptControl.clearStop();
        // Not bare ingame — wait sceneState=2 so first Talk/seed is not early thrash
        await Execution.delayUntil(() => Game.sceneReady() && Game.tile() !== null, 90_000);
        if (!Game.sceneReady()) {
            this.log(`warn: starting with sceneState=${Game.sceneState()} (want 2)`);
        }

        if (this.mod.setup) {
            this.log('setup… (after scene ready)');
            await Game.waitSceneReady(60_000, m => this.log(m));
            await this.mod.setup({
                log: m => this.log(m),
                snap: () => takeSnapshot()
            });
        }

        // Seed dialog path before first Talk (decide while idle)
        const seed = this.mod.decide(takeSnapshot());
        if (seed.kind === 'talk' && seed.prefer?.length) {
            this.dialogPath = seed.prefer;
            this.log(`dialog path: ${seed.prefer.join(' → ')}`);
        }

        // Priority: dialog → post-dialog getvar → main modal close → drive
        this.add(
            new AdvanceDialog(this, this.mod),
            new AfterDialogStageRefresh(this, this.mod),
            new CloseMainModal(),
            new QuestDrive(this, this.mod)
        );
    }

    override async run(maxMs = 45 * 60_000): Promise<string> {
        const result = await super.run(maxMs);
        if (this.failReason) {
            this.log(`quest hard-fail: ${this.failReason}`);
            return `fail:${this.failReason.slice(0, 120)}`;
        }
        if (this.mod.readStage() >= this.mod.completeStage) {
            this.finished = true;
            this.log(`quest complete stage=${this.mod.readStage()}`);
            return 'done';
        }
        return result;
    }
}
