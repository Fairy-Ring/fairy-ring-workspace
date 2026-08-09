/**
 * Thin quest module types for the 377 harness.
 *
 * Pattern source: rs2b0t AIOQuester / QuestEngine (`QuestModule.decide` → `QuestStep`)
 * but **much smaller** — no provisioning queue, multi-quest host, or settings UI yet.
 *
 * @see /Users/acfrazier/experiments/rs2b0t/src/bot/quests/engine/types.ts
 * @see docs/plans/2026-08-04-harness-quest-template.md
 */

export type WorldTile = { x: number; z: number; level?: number };

/** Prefer display-name inventory / NPCs; use varp only when transmit=yes. */
export interface QuestSnapshot {
    tile: WorldTile | null;
    inv: Map<string, number>;
    /** Named varps when transmitted (e.g. tbwt_main=320). */
    varps: Record<string, number>;
    dialogOpen: boolean;
    dialogOptions: string[];
}

/**
 * Imperative step kinds — keep aligned with what `executeStep` can do on the harness ABI.
 * Add kinds only when a second quest needs them (YAGNI).
 */
export type QuestStep =
    | { kind: 'walk'; tile: WorldTile; radius?: number; label?: string }
    | {
          kind: 'talk';
          npc: string;
          /**
           * Script-ordered multi path from the ported `.rs2` (`@multiN` labels).
           * Order = walk the tree; each entry matches when that option is visible.
           * Do **not** list decline options — last multi choice is usually decline.
           */
          prefer?: string[];
          /** Max AdvanceDialog ticks while chat stays open after talk. */
          drainTicks?: number;
          anchor?: WorldTile;
          radius?: number;
      }
    | { kind: 'interactLoc'; loc: string; op: string; anchor?: WorldTile; radius?: number }
    /**
     * Special-crossing style hop (basalt Jump-across): wait idle → OP → land near toTile.
     * @see docs/research/rs2b0t-quester-steal-list.md
     */
    | {
          kind: 'jump';
          loc: string;
          op: string;
          toTile: WorldTile;
          anchor?: WorldTile;
          radius?: number;
          arrivalRadius?: number;
          label?: string;
      }
    | { kind: 'useOnLoc'; item: string; loc: string; anchor?: WorldTile; radius?: number }
    /**
     * Use held item on NPC (OPNPCU). Optional itemId when display names collide
     * (TBWT empty vs loaded Karambwan vessel both named "Karambwan vessel").
     */
    | {
          kind: 'useOnNpc';
          item: string;
          npc: string;
          itemId?: number;
          prefer?: string[];
          anchor?: WorldTile;
          radius?: number;
      }
    | { kind: 'useOnItem'; use: string; target: string }
    | { kind: 'equip'; item: string }
    | {
          kind: 'custom';
          name: string;
          run: (ctx: QuestExecCtx) => Promise<boolean>;
      }
    | { kind: 'wait'; reason: string; ms?: number }
    | { kind: 'done' };

export interface QuestExecCtx {
    log: (m: string) => void;
    snap: () => QuestSnapshot;
}

export interface QuestModule {
    /** Stable id for script host / smoke (`tbwt`). */
    id: string;
    /** Display name (questlist). */
    name: string;
    /**
     * Read stage from client-visible state (varp when transmit, else inv/tile heuristics).
     * Return COMPLETE constant when finished.
     */
    readStage: () => number;
    /** Stage number that means quest complete (number or getter for smoke start-gates). */
    readonly completeStage: number;
    /**
     * Server var name for `getvar` after dialog closes (e.g. `horrorquest`, `tbwt_main`).
     * When set, QuestBot refreshes stage before re-Talking the same NPC.
     */
    stageVarName?: string;
    /**
     * Apply a getvar result into whatever `readStage()` uses
     * (e.g. `globalThis.__horrorServerStage = n`).
     */
    applyServerStage?: (value: number) => void;
    /**
     * Pure-ish decision: given snapshot, what next?
     * Must be restartable — same snap → same step class.
     */
    decide: (snap: QuestSnapshot) => QuestStep;
    /**
     * Optional setup before first decide (cheats for **setup only** — Decision 004).
     * Real OP_LOC / Talk must still prove the path.
     */
    setup?: (ctx: QuestExecCtx) => Promise<void>;
}
