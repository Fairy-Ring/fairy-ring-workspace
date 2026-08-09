/**
 * # Quest module template (copy → `defs/<slug>.ts`)
 *
 * Pattern: rs2b0t AIOQuester `QuestModule.decide(snap) → QuestStep`
 * Host: `QuestBot` + `scripts.start('quest-<id>')`
 *
 * ## Rules
 * - Prefer **inventory / tile / dialog** for stage gates (QUESTS.md / 274 discipline).
 * - Use **transmitted varps** only when `transmit=yes` (cite pack id in KNOWN_VARPS).
 * - `setup()` may use `::tele` / `::setvar` / `::give` for **setup only** (Decision 004).
 * - Every real proof step must be Talk / OPLOC / use-with — not cheats.
 * - Document the module in `docs/research/port-<slug>-*.md` and register in `register.ts`.
 *
 * ## Skeleton
 *
 * ```ts
 * import type { QuestModule, QuestSnapshot, QuestStep } from '../types.ts';
 * import { actions } from '../../api.ts';
 *
 * export const STAGE = { NOT_STARTED: 0, STARTED: 1, COMPLETE: 99 } as const;
 *
 * export const myQuest: QuestModule = {
 *   id: 'my-quest',
 *   name: 'My Quest',
 *   completeStage: STAGE.COMPLETE,
 *   readStage: () => { ... },
 *   async setup({ log }) {
 *     // optional cheats
 *   },
 *   decide(snap: QuestSnapshot): QuestStep {
 *     const st = this.readStage();
 *     if (st >= STAGE.COMPLETE) return { kind: 'done' };
 *     if (st === STAGE.NOT_STARTED) {
 *       return { kind: 'talk', npc: 'Bob', prefer: ['Yes'], anchor: { x: 1, z: 2 } };
 *     }
 *     return { kind: 'wait', reason: 'stuck' };
 *   }
 * };
 * ```
 *
 * @see ../defs/tbwt.ts — first real module
 * @see docs/plans/2026-08-04-harness-quest-template.md
 */
export {};
