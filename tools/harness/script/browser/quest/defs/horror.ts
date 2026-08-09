/**
 * Horror from the Deep — harness quest module (e2e).
 *
 * Stage = varbit `horrorquest` (host: `globalThis.__horrorServerStage`).
 * Default completeStage = COMPLETE (10). Override `__horrorCompleteStage`.
 *
 * Travel: destinations only. Basalt rocks are **nav special crossings**
 * (`nav/data/horrorBasalt.ts`) via `jump` steps with toTile wait.
 * Host: one setup tele to Larrissa; no mid-quest tele.
 *
 * @see docs/research/rs2b0t-quester-steal-list.md
 */
import { Inventory } from '../../api.ts';
import {
    BASALT_MAINLAND_SHORE,
    nextBasaltCrossing,
    onBasaltIsland
} from '../../../../nav/data/horrorBasalt.ts';
import type { QuestModule, QuestSnapshot, QuestStep, WorldTile } from '../types.ts';

export const HORROR = {
    NOT_STARTED: 0,
    STARTED: 1,
    ENTERED: 2,
    FIXING: 3,
    REPAIRED: 4,
    DEFEATED_DAGJR: 5,
    COMPLETE: 10
} as const;

/** m39_56 Larrissa */
export const LARRISSA = { x: 2508, z: 3635, level: 0 };
/**
 * Gunnjorn static spawn from pack `n39_55` (npc 607).
 * jm2 line `0 44 28: 607` = level, **localX**, **localZ** (ImportNpcCsv order)
 * → world (39×64+44, 55×64+28) = **2540,3548**. Not 2524,3564 (locals swapped).
 * Inside Barbarian Outpost — gate needs **barcrawl complete** (`%barcrawl = 2`)
 * or Open is hijacked by guard dialog (`outpost_gate.rs2`).
 */
export const GUNNJORN = { x: 2540, z: 3548, level: 0 };
/**
 * Pathable stand near Gunnjorn after gate Open + **Obstacle pipe** Squeeze-through
 * (barbarian_obstacle_pipe 2287 @ 2552,3559 — not wallgrill / wall punch).
 * **No host tele** — only Larrissa setup tele in smoke.
 */
export const GUNNJORN_APPROACH = { x: 2542, z: 3556, level: 0 };
/** Outpost gate stand (doors.json ~2545,3569) — Open after barcrawl seed. */
export const OUTPOST_GATE = { x: 2545, z: 3569, level: 0 };

/**
 * Gate is E–W (`outpost_gate.rs2` teleports by coordx). Outside approach is **east**
 * (higher x); Gunnjorn / course is **west** (lower x). Open **always swaps sides** —
 * re-Open thrash is the classic in/out loop.
 */
function outsideOutpostGate(tile: WorldTile | null): boolean {
    if (!tile) return false;
    return tile.x > OUTPOST_GATE.x;
}
function insideOutpost(tile: WorldTile | null): boolean {
    if (!tile) return false;
    return tile.x <= OUTPOST_GATE.x && tile.z >= 3545 && tile.z <= 3585;
}

function gateOpenCount(): number {
    return Number((globalThis as { __horrorGateOpens?: number }).__horrorGateOpens) || 0;
}
function bumpGateOpen(): void {
    const g = globalThis as { __horrorGateOpens?: number };
    g.__horrorGateOpens = gateOpenCount() + 1;
}
/**
 * South of basalt landing — rock pad often disconnected from world graph
 * (findPath expansion budget). Walk here before Gunnjorn.
 */
export const COAST_OFF_BASALT = { x: 2525, z: 3575, level: 0 };
/** Approach toward Gunnjorn (2540,3548 agility pad), not NW empty pad. */
export const COAST_TO_OUTPOST = { x: 2540, z: 3555, level: 0 };
/** Broken bridge spots (locs L1; stands on L0). Gap at 2597 seals L0 left↔right. */
export const BRIDGE_LEFT = { x: 2596, z: 3608, level: 0 };
export const BRIDGE_RIGHT = { x: 2598, z: 3608, level: 0 };
/** East pier stand so USELOC on right half is in range (not "I can't reach that!"). */
export const BRIDGE_EAST_STAND = { x: 2601, z: 3608, level: 0 };

const START_DIALOG = [
    'With what?',
    'But how can I help?',
    "Okay, I'll help!",
    "I'll see what I can do"
];

const GUNNJORN_DIALOG = [
    'Hi, are you called Gunnjorn',
    'cousin',
    'Larrissa',
    'key',
    'yes'
];

const RETURN_DIALOG = [
    "I've got your key for you",
    "I've fixed the bridge for you",
    'key',
    'bridge',
    "I'll see what I can do"
];

function serverStage(): number {
    const g = globalThis as { __horrorServerStage?: number };
    const n = Number(g.__horrorServerStage);
    return Number.isFinite(n) ? n | 0 : 0;
}

function completeStage(): number {
    const g = globalThis as { __horrorCompleteStage?: number };
    const n = Number(g.__horrorCompleteStage);
    if (Number.isFinite(n) && n > 0) return n | 0;
    return HORROR.COMPLETE;
}

function invCount(name: string): number {
    return Inventory.count(name) | 0;
}

function near(tile: WorldTile | null, a: WorldTile, r: number): boolean {
    if (!tile) return false;
    if ((tile.level ?? 0) !== (a.level ?? 0)) return false;
    return Math.max(Math.abs(tile.x - a.x), Math.abs(tile.z - a.z)) <= r;
}

function basaltJump(tile: WorldTile | null, dir: 'south' | 'north'): QuestStep {
    const sc = nextBasaltCrossing(tile, dir);
    if (!sc || !sc.toTile) {
        return {
            kind: 'walk',
            tile: dir === 'south' ? BASALT_MAINLAND_SHORE : LARRISSA,
            radius: 3,
            label: dir === 'south' ? 'mainland-shore' : 'to-larrissa'
        };
    }
    // Walk onto first stand only when still on solid ground (Larrissa pad / mainland).
    // Mid-chain rock tiles are not mutually pathable — no anchor.
    const me = tile;
    const d = me ? Math.max(Math.abs(me.x - sc.x), Math.abs(me.z - sc.z)) : 99;
    const solidApproach =
        d > 2 &&
        ((dir === 'south' && (me?.z ?? 0) > sc.z + 3) ||
            (dir === 'north' && (me?.z ?? 0) < sc.z - 3));
    return {
        kind: 'jump',
        loc: sc.locName,
        op: sc.action,
        toTile: { x: sc.toTile.x, z: sc.toTile.z, level: sc.toTile.level ?? 0 },
        anchor: solidApproach || d <= 2 ? { x: sc.x, z: sc.z, level: 0 } : undefined,
        radius: 1,
        arrivalRadius: sc.arrivalRadius ?? 1,
        label: sc.label
    };
}

/**
 * Smoke seeds 4 planks; each half consumes 1 + 4 nails (quest_horror.rs2).
 * After left: 3 planks. After both: 2 planks. Independent of key.
 */
function bridgeFixed(): boolean {
    return invCount('Plank') <= 2;
}

/** Left first. After one plank spent (3 remain), do right half. */
function needRightHalf(): boolean {
    const p = invCount('Plank');
    return p === 3;
}

function needBridge(): boolean {
    return invCount('Plank') > 2;
}

export const horrorQuest: QuestModule = {
    id: 'horror',
    name: 'Horror from the Deep',
    stageVarName: 'horrorquest',
    applyServerStage: (v: number) => {
        (globalThis as { __horrorServerStage?: number }).__horrorServerStage = v;
    },
    get completeStage() {
        return completeStage();
    },
    readStage: () => serverStage(),

    decide(snap: QuestSnapshot): QuestStep {
        const st = serverStage();
        const doneAt = completeStage();
        const tile = snap.tile;

        if (st >= doneAt || st >= HORROR.COMPLETE) {
            return { kind: 'done' };
        }
        if (snap.dialogOpen) {
            return { kind: 'wait', reason: 'dialog' };
        }

        // 0 → 1 Larrissa start
        if (st < HORROR.STARTED) {
            if (!near(tile, LARRISSA, 12) && !onBasaltIsland(tile) && (tile?.z ?? 0) < 3605) {
                return basaltJump(tile, 'north');
            }
            return {
                kind: 'talk',
                npc: 'Larrissa',
                prefer: START_DIALOG,
                anchor: LARRISSA,
                radius: 2,
                drainTicks: 80
            };
        }

        // 1 → 2: **bridge first** (north shore, same peninsula as Larrissa) →
        // basalt S → Gunnjorn key → basalt N → Larrissa (content: both halves + key).
        if (st === HORROR.STARTED) {
            const hasKey = invCount('Lighthouse key') > 0;
            const atBridge =
                near(tile, BRIDGE_LEFT, 22) ||
                near(tile, BRIDGE_RIGHT, 22) ||
                near(tile, BRIDGE_EAST_STAND, 8);

            // ── 1) Fix bridge before leaving for Gunnjorn ─────────────────────
            if (needBridge()) {
                // Still south of rocks from a prior attempt — get north first.
                if (!atBridge && !onBasaltIsland(tile) && (tile?.z ?? 0) < 3600) {
                    return basaltJump(tile, 'north');
                }
                if (!atBridge && onBasaltIsland(tile) && (tile?.z ?? 0) < 3618) {
                    return basaltJump(tile, 'north');
                }
                // Left half (west stand)
                if (!needRightHalf()) {
                    if (!near(tile, BRIDGE_LEFT, 4)) {
                        return {
                            kind: 'walk',
                            tile: BRIDGE_LEFT,
                            radius: 3,
                            label: 'to-broken-bridge-left'
                        };
                    }
                    return {
                        kind: 'useOnLoc',
                        item: 'Plank',
                        loc: 'Broken bridge',
                        anchor: BRIDGE_LEFT,
                        radius: 3
                    };
                }
                // Right half: authentic **Cross** (oploc1) on left spot — not pure walk.
                // quest_horror.rs2 horror_cross_bridge: even with one half fixed, agility
                // exactmove + forcemove hops east (dx=+1 from left). Pack gap punch is a
                // false path: client collision still blocks L0 walk across 2597.
                if (tile === null || tile.x < BRIDGE_RIGHT.x) {
                    return {
                        kind: 'jump',
                        loc: 'Broken bridge',
                        op: 'Cross',
                        toTile: BRIDGE_RIGHT,
                        anchor: BRIDGE_LEFT,
                        radius: 1,
                        arrivalRadius: 2,
                        label: 'cross-bridge-to-east'
                    };
                }
                return {
                    kind: 'useOnLoc',
                    item: 'Plank',
                    loc: 'Broken bridge',
                    anchor: BRIDGE_RIGHT,
                    radius: 3
                };
            }

            // ── 2) Key from Gunnjorn (after bridge) ───────────────────────────
            if (!hasKey) {
                // East of gap after right plank: authentic Cross west (right spot
                // dx=-1). Pure walk to coast is pack-open / live-block again.
                if (tile && tile.x >= BRIDGE_RIGHT.x && tile.z >= 3600) {
                    return {
                        kind: 'jump',
                        loc: 'Broken bridge',
                        op: 'Cross',
                        toTile: BRIDGE_LEFT,
                        anchor: BRIDGE_RIGHT,
                        radius: 1,
                        arrivalRadius: 2,
                        label: 'cross-bridge-to-west'
                    };
                }
                if (onBasaltIsland(tile) || (tile && tile.z > BASALT_MAINLAND_SHORE.z + 2 && tile.x < 2535)) {
                    if (tile && tile.z > BASALT_MAINLAND_SHORE.z + 1) {
                        return basaltJump(tile, 'south');
                    }
                }
                if (tile && tile.z >= 3585) {
                    return {
                        kind: 'walk',
                        tile: COAST_OFF_BASALT,
                        radius: 4,
                        label: 'coast-off-basalt'
                    };
                }
                if (tile && near(tile, GUNNJORN, 10)) {
                    return {
                        kind: 'custom',
                        name: 'client-walk-and-talk-gunnjorn',
                        run: async ctx => {
                            const { actions, Execution, ChatDialog } = await import('../../api.ts');
                            if (!actions.talkNpc('Gunnjorn')) {
                                ctx.log('talkNpc Gunnjorn failed (on pad)');
                                return false;
                            }
                            const opened = await Execution.delayUntil(
                                () => ChatDialog.isOpen(),
                                8_000
                            );
                            if (!opened) {
                                ctx.log('Gunnjorn: no dialog after OPNPC (on pad)');
                                return false;
                            }
                            for (let d = 0; d < 48; d++) {
                                if (!ChatDialog.isOpen()) break;
                                if (ChatDialog.options().length) {
                                    actions.chooseOption(GUNNJORN_DIALOG);
                                } else {
                                    actions.advanceDialog();
                                }
                                await Execution.delayTicks(1);
                            }
                            await Execution.delayTicks(2);
                            const got = invCount('Lighthouse key') > 0;
                            ctx.log(`Gunnjorn pad talk key=${got}`);
                            return got;
                        }
                    };
                }
                if (gateOpenCount() < 1 && !insideOutpost(tile) && !near(tile, GUNNJORN, 8)) {
                    const gateOutside = {
                        x: OUTPOST_GATE.x + 2,
                        z: OUTPOST_GATE.z,
                        level: 0
                    };
                    if (!outsideOutpostGate(tile) || !near(tile, OUTPOST_GATE, 5)) {
                        return {
                            kind: 'walk',
                            tile: gateOutside,
                            radius: 2,
                            label: 'to-outpost-gate-outside'
                        };
                    }
                    return {
                        kind: 'custom',
                        name: 'open-outpost-gate-once',
                        run: async ctx => {
                            const { executeStep } = await import('../executeStep.ts');
                            bumpGateOpen();
                            ctx.log('outpost gate: Open once (barcrawl must be complete)');
                            const ok = await executeStep(
                                {
                                    kind: 'interactLoc',
                                    loc: 'Gate',
                                    op: 'Open',
                                    anchor: {
                                        x: OUTPOST_GATE.x + 1,
                                        z: OUTPOST_GATE.z,
                                        level: 0
                                    },
                                    radius: 2
                                },
                                ctx
                            );
                            const { Execution, Game } = await import('../../api.ts');
                            await Game.waitIdle(4_000, m => ctx.log(m));
                            await Execution.delayTicks(2);
                            const t = Game.tile();
                            ctx.log(
                                `after gate Open: tile=${t ? `${t.x},${t.z}` : '?'} inside=${insideOutpost(t)}`
                            );
                            return ok;
                        }
                    };
                }
                if (tile && !near(tile, GUNNJORN, 3)) {
                    return {
                        kind: 'walk',
                        tile: GUNNJORN,
                        radius: 2,
                        label: 'to-gunnjorn'
                    };
                }
                return {
                    kind: 'talk',
                    npc: 'Gunnjorn',
                    prefer: GUNNJORN_DIALOG,
                    anchor: GUNNJORN,
                    radius: 3,
                    drainTicks: 48
                };
            }

            // ── 3) Return Larrissa (bridge + key) ─────────────────────────────
            if (!near(tile, LARRISSA, 12)) {
                if (atBridge || (tile && tile.x >= 2550 && tile.z >= 3600)) {
                    return {
                        kind: 'walk',
                        tile: LARRISSA,
                        radius: 2,
                        label: 'return-larrissa'
                    };
                }
                if (!onBasaltIsland(tile) || (tile && tile.z < 3620)) {
                    return basaltJump(tile, 'north');
                }
                return {
                    kind: 'walk',
                    tile: LARRISSA,
                    radius: 2,
                    label: 'return-larrissa'
                };
            }

            return {
                kind: 'talk',
                npc: 'Larrissa',
                prefer: RETURN_DIALOG,
                anchor: LARRISSA,
                radius: 2,
                drainTicks: 48
            };
        }

        if (st >= HORROR.ENTERED && st < doneAt) {
            return {
                kind: 'wait',
                reason: `horror st=${st} next interior/combat (walk)`,
                ms: 2500
            };
        }

        return { kind: 'wait', reason: `no step st=${st}`, ms: 1500 };
    }
};
