/**
 * Tai Bwo Wannai Trio — harness quest module.
 *
 * Content: `docs/research/port-tbwt-289-to-377.md`
 * Stages: `%tbwt_main` varp **320** (transmit=yes).
 * Tiadeche: `%tbwt_tiadeche` **725** (transmit=yes) — branch on this, not only main.
 *
 * **Account prep is NOT in this module.** Host smoke: mainlandAccount + setvars +
 * vessel seeds (+ other brothers complete seed for mid-gate ≥6). See quest-tbwt-smoke.mjs.
 *
 * Tiadeche live path (tbwt_tiadeche.rs2):
 *   intro Talk → return_when_caught(2)
 *   → USE loaded vessel on Tiadeche → caught(3) + dialog (Yes/No)
 *   → request_manual(4) — needs Tinsay complete for vessel→crafting manual
 *   → USE vessel on Tinsay → player_received_manual(5) + manual
 *   → USE crafting manual on Tiadeche → complete(6)
 */
import { Inventory, reader } from '../../api.ts';
import type { QuestModule, QuestSnapshot, QuestStep, WorldTile } from '../types.ts';

/** Mirror content `quest_tbwt.constant`. */
export const TBWT = {
    NOT_STARTED: 0,
    SPOKE: 1,
    ASKED_HELP: 2,
    STARTED: 3,
    BROTHERS_DONE: 4,
    GOLD: 5,
    COMPLETE: 6
} as const;

export const TIA = {
    UNKNOWN: 0,
    INTRO: 1,
    RETURN_WHEN_CAUGHT: 2,
    CAUGHT: 3,
    REQUEST_MANUAL: 4,
    RECEIVED_MANUAL: 5,
    COMPLETE: 6
} as const;

/** Pack obj ids — empty vs loaded share display name "Karambwan vessel". */
export const OBJ = {
    VESSEL: 3157,
    VESSEL_LOADED: 3159,
    CRAFTING_MANUAL: 3161 // verify pack
} as const;

/** Map spawns (jm2 level,lx,lz → world). */
const TIMFRAKU = { x: 2780, z: 3087, level: 1 };
/** m45_48 `0 32 46: 2483` multi shore */
const TIADECHE = { x: 2912, z: 3118, level: 0 };
/** m43_46 `0 13 32: 2485` multi island (Cairn Isle) */
const TINSAY = { x: 2765, z: 2976, level: 0 };
/**
 * Cairn Isle rocks — transports.json + specialCrossings (zqclimbingrocks).
 * Mainland stand east; island stand west. Bridge at z≈2979 x 2776–81 falls to river.
 */
const CAIRN_ROCKS_MAINLAND = { x: 2795, z: 2979, level: 0 };
const CAIRN_ROCKS_ISLAND = { x: 2791, z: 2979, level: 0 };
/** m44_47 `0 28 34: 2487` multi jungle — later brothers */
const TAMAYU = { x: 2844, z: 3042, level: 0 };
/** m37_68 `0 2 39: 1171` Lubufu */
const LUBUFU = { x: 2370, z: 4391, level: 0 };

const START_PREFER = [
    'roving adventurer',
    'trufitus sent me',
    'why should i leave',
    'how can i help',
    "i'll help",
    'i will help',
    'yes'
];

const TIA_INTRO_PREFER = [
    'Are you Tiadeche',
    'good news',
    'Is there anything I can do to help',
    'What is a Karambwan',
    'How are you fishing',
    'When will you be finished'
];

const TIA_CAUGHT_PREFER = [
    'Yes',
    'Accept',
    'Can we return',
    'village',
    'ok'
];

function main(snap: QuestSnapshot): number {
    return snap.varps.tbwt_main ?? (reader.varp(320) | 0);
}

function tiaStage(snap: QuestSnapshot): number {
    return snap.varps.tbwt_tiadeche ?? (reader.varp(725) | 0);
}

function invHasId(id: number): boolean {
    return Inventory.items().some(i => (i.id | 0) === id);
}

function invHasName(name: string): boolean {
    return Inventory.count(name) > 0;
}

function completeStage(): number {
    const g = globalThis as { __tbwtCompleteStage?: number };
    const n = Number(g.__tbwtCompleteStage);
    if (Number.isFinite(n) && n > 0) return n | 0;
    return TBWT.COMPLETE;
}

function near(tile: WorldTile | null, a: WorldTile, r: number): boolean {
    if (!tile) return false;
    if ((tile.level ?? 0) !== (a.level ?? 0)) return false;
    return Math.max(Math.abs(tile.x - a.x), Math.abs(tile.z - a.z)) <= r;
}

/**
 * West of climb rocks on Cairn (not swimming / not mainland stand).
 * **Strict x≤2792** — do not use a fat radius around island rocks; that also
 * matches the mainland stand (2795,2979) and caused climb thrash (smoke tbwsglr0wm).
 */
function onCairnIsland(tile: WorldTile | null): boolean {
    if (!tile || (tile.level ?? 0) !== 0) return false;
    return tile.x <= 2792 && tile.x >= 2755 && tile.z >= 2955 && tile.z <= 3005;
}

/** River dump after bridge fail (zone timer cairn_island_bridge). */
function inCairnRiver(tile: WorldTile | null): boolean {
    if (!tile || (tile.level ?? 0) !== 0) return false;
    return tile.x >= 2774 && tile.x <= 2785 && tile.z >= 2968 && tile.z <= 2977;
}

/** Standing on / next to the mainland climb pad (east of rocks). */
function atCairnMainlandRocks(tile: WorldTile | null): boolean {
    return near(tile, CAIRN_ROCKS_MAINLAND, 2);
}

function hasCraftingManual(): boolean {
    return invHasId(OBJ.CRAFTING_MANUAL) || invHasName('Crafting manual');
}

function hasAnyVessel(): boolean {
    return invHasId(OBJ.VESSEL) || invHasId(OBJ.VESSEL_LOADED) || invHasName('Karambwan vessel');
}

/**
 * Authentic path Tiadeche shore → Tinsay: walk to rocks → Climb → island → Tinsay.
 * Pack path uses z=2979/2980 west (bridge); never target unwalkable south pads.
 * No mid-quest tele. Climb retries on agility fail; river recover → mainland stand.
 */
function goToTinsay(tile: WorldTile | null): QuestStep {
    if (inCairnRiver(tile)) {
        return {
            kind: 'walk',
            tile: CAIRN_ROCKS_MAINLAND,
            radius: 2,
            label: 'cairn-river-recover-mainland'
        };
    }
    // On island (strict) — walk Tinsay; A* uses bridge corridor
    if (onCairnIsland(tile)) {
        return {
            kind: 'walk',
            tile: TINSAY,
            radius: 3,
            label: 'to-tinsay-island'
        };
    }
    // Mainland: approach rocks then Climb west onto isle
    if (atCairnMainlandRocks(tile)) {
        return {
            kind: 'jump',
            loc: 'Rocks',
            op: 'Climb',
            toTile: CAIRN_ROCKS_ISLAND,
            anchor: CAIRN_ROCKS_MAINLAND,
            radius: 1,
            arrivalRadius: 2,
            label: 'cairn-rocks-to-island'
        };
    }
    return {
        kind: 'walk',
        tile: CAIRN_ROCKS_MAINLAND,
        radius: 2,
        label: 'to-cairn-rocks-mainland'
    };
}

/**
 * Island → mainland via Climb, then free walk to Tiadeche shore.
 * Never re-enter island once x > 2792 (mainland rocks stand).
 */
function leaveCairnForTiadeche(tile: WorldTile | null): QuestStep {
    if (inCairnRiver(tile)) {
        return {
            kind: 'walk',
            tile: CAIRN_ROCKS_MAINLAND,
            radius: 2,
            label: 'cairn-river-recover-mainland'
        };
    }
    if (onCairnIsland(tile)) {
        if (near(tile, CAIRN_ROCKS_ISLAND, 2)) {
            return {
                kind: 'jump',
                loc: 'Rocks',
                op: 'Climb',
                toTile: CAIRN_ROCKS_MAINLAND,
                anchor: CAIRN_ROCKS_ISLAND,
                radius: 1,
                arrivalRadius: 2,
                label: 'cairn-rocks-to-mainland'
            };
        }
        return {
            kind: 'walk',
            tile: CAIRN_ROCKS_ISLAND,
            radius: 2,
            label: 'to-cairn-rocks-island-exit'
        };
    }
    // Mainland (incl. rocks stand after successful Climb) — do not climb west again
    return {
        kind: 'walk',
        tile: TIADECHE,
        radius: 4,
        label: 'return-tiadeche-manual'
    };
}

/** Tiadeche brother branch while main === STARTED. */
function decideTiadeche(snap: QuestSnapshot): QuestStep {
    const tia = tiaStage(snap);
    const tile = snap.tile;

    // 0–1: intro Talk → content sets return_when_caught (2)
    if (tia < TIA.RETURN_WHEN_CAUGHT) {
        return {
            kind: 'talk',
            npc: 'Tiadeche',
            prefer: TIA_INTRO_PREFER,
            anchor: TIADECHE,
            radius: 6,
            drainTicks: 64
        };
    }

    // 2: hand over loaded vessel (OPNPCU) — Tiadeche keeps loaded; empty seed remains for Tinsay
    if (tia === TIA.RETURN_WHEN_CAUGHT) {
        if (invHasId(OBJ.VESSEL_LOADED)) {
            return {
                kind: 'useOnNpc',
                item: 'Karambwan vessel',
                itemId: OBJ.VESSEL_LOADED,
                npc: 'Tiadeche',
                prefer: TIA_CAUGHT_PREFER,
                anchor: TIADECHE,
                radius: 4
            };
        }
        // Host should seed loaded vessel; wait rather than thrash Talk
        return {
            kind: 'wait',
            reason: 'need loaded Karambwan vessel (host seed) for Tiadeche',
            ms: 2000
        };
    }

    // 3: accept first catch / return favour → request_manual
    if (tia === TIA.CAUGHT) {
        return {
            kind: 'talk',
            npc: 'Tiadeche',
            prefer: TIA_CAUGHT_PREFER,
            anchor: TIADECHE,
            radius: 4,
            drainTicks: 80
        };
    }

    // 4: need crafting manual via Tinsay (host seeds tinsay complete for mid-gate)
    // Content: inv_del vessel → if_close → p_delay(3) → inv_add manual + set stage 5.
    // Between if_close and inv_add, inv is empty of vessel/manual — wait, do not thrash.
    if (tia === TIA.REQUEST_MANUAL) {
        if (hasCraftingManual()) {
            if (!near(tile, TIADECHE, 14)) {
                return leaveCairnForTiadeche(tile);
            }
            return {
                kind: 'useOnNpc',
                item: 'Crafting manual',
                itemId: OBJ.CRAFTING_MANUAL,
                npc: 'Tiadeche',
                prefer: ['return', 'village', 'yes', 'ok'],
                anchor: TIADECHE,
                radius: 4
            };
        }
        // Empty or loaded vessel → Tinsay (accepts either if tinsay complete)
        if (hasAnyVessel()) {
            if (!near(tile, TINSAY, 10)) {
                return goToTinsay(tile);
            }
            return {
                kind: 'useOnNpc',
                item: 'Karambwan vessel',
                itemId: invHasId(OBJ.VESSEL) ? OBJ.VESSEL : OBJ.VESSEL_LOADED,
                npc: 'Tinsay',
                prefer: ['help', 'yes', 'vessel', 'craft', 'ok'],
                anchor: TINSAY,
                radius: 6
            };
        }
        // Mid exchange (p_delay after vessel del) or lag — sit still until manual/varp
        return {
            kind: 'wait',
            reason: 'await Tinsay crafting manual (post-vessel p_delay)',
            ms: 2500
        };
    }

    // 5: hand crafting manual to Tiadeche (or reclaim via Tinsay if lost)
    if (tia === TIA.RECEIVED_MANUAL) {
        if (!hasCraftingManual()) {
            // Reclaim needs a vessel again (content opnpcu)
            if (hasAnyVessel()) {
                if (!near(tile, TINSAY, 10)) {
                    return goToTinsay(tile);
                }
                return {
                    kind: 'useOnNpc',
                    item: 'Karambwan vessel',
                    itemId: invHasId(OBJ.VESSEL) ? OBJ.VESSEL : OBJ.VESSEL_LOADED,
                    npc: 'Tinsay',
                    prefer: ['lost', 'another', 'yes', 'ok'],
                    anchor: TINSAY,
                    radius: 6
                };
            }
            return {
                kind: 'wait',
                reason: 'await crafting manual inv (stage 5)',
                ms: 2500
            };
        }
        if (!near(tile, TIADECHE, 14)) {
            return leaveCairnForTiadeche(tile);
        }
        return {
            kind: 'useOnNpc',
            item: 'Crafting manual',
            itemId: OBJ.CRAFTING_MANUAL,
            npc: 'Tiadeche',
            prefer: ['return', 'village', 'yes', 'ok'],
            anchor: TIADECHE,
            radius: 4
        };
    }

    // 6+: Tiadeche done — fall through to other brothers / Timfraku
    return {
        kind: 'wait',
        reason: 'tiadeche complete — next brother/main',
        ms: 500
    };
}

export const tbwtQuest: QuestModule = {
    id: 'tbwt',
    name: 'Tai Bwo Wannai Trio',
    stageVarName: 'tbwt_main',
    applyServerStage: (_v: number) => {
        // Client varp 320 mirrors; getvar confirms server
    },
    get completeStage() {
        return completeStage();
    },

    readStage: () => reader.varp(320) | 0,

    decide(snap: QuestSnapshot): QuestStep {
        const st = main(snap);
        const doneAt = completeStage();

        if (st >= doneAt || st >= TBWT.COMPLETE) {
            return { kind: 'done' };
        }

        if (snap.dialogOpen) {
            return { kind: 'wait', reason: 'dialog', ms: 200 };
        }

        // Start path: Timfraku until STARTED (3)
        if (st < TBWT.STARTED) {
            return {
                kind: 'talk',
                npc: 'Timfraku',
                prefer: START_PREFER,
                anchor: TIMFRAKU,
                radius: 5,
                drainTicks: 32
            };
        }

        // Brothers while main === STARTED
        if (st === TBWT.STARTED && doneAt > TBWT.STARTED) {
            const tia = tiaStage(snap);
            if (tia < TIA.COMPLETE) {
                // Only auto-walk to Tiadeche when the step needs him on the shore.
                // request_manual → Tinsay island (do not pull back to 2912).
                const needTiaPad =
                    tia < TIA.REQUEST_MANUAL ||
                    tia === TIA.RECEIVED_MANUAL ||
                    tia === TIA.CAUGHT;
                if (
                    needTiaPad &&
                    !near(snap.tile, TIADECHE, 24) &&
                    (snap.tile?.level ?? 0) === 1
                ) {
                    // Still in Timfraku hut (L1) — leave via ladder path to shore
                    return {
                        kind: 'walk',
                        tile: TIADECHE,
                        radius: 6,
                        label: 'to-tiadeche-shore'
                    };
                }
                return decideTiadeche(snap);
            }

            // Host seeds other brothers complete for mid-gate; if live stubs still needed:
            const tin = snap.varps.tbwt_tinsay ?? 0;
            const tam = snap.varps.tbwt_tamayu ?? 0;
            const lub = snap.varps.tbwt_lubufu ?? 0;
            // Non-transmit brothers may read 0 client-side even when complete — prefer getvar
            // via host. If all look incomplete, still try Timfraku after Tiadeche complete.
            if (tin > 0 && tin < 7) {
                return {
                    kind: 'talk',
                    npc: 'Tinsay',
                    prefer: ['yes', 'help', 'banana', 'rum', 'ok', 'bones'],
                    anchor: TINSAY,
                    radius: 8,
                    drainTicks: 48
                };
            }
            if (tam > 0 && tam < 4) {
                return {
                    kind: 'talk',
                    npc: 'Tamayu',
                    prefer: ['yes', 'help', 'spear', 'ok'],
                    anchor: TAMAYU,
                    radius: 8,
                    drainTicks: 48
                };
            }
            if (lub > 0 && lub < 31) {
                return {
                    kind: 'talk',
                    npc: 'Lubufu',
                    prefer: ['yes', 'help', 'who are you', 'what do you do', 'ok'],
                    anchor: LUBUFU,
                    radius: 8,
                    drainTicks: 48
                };
            }

            // Tiadeche done; others assumed seeded complete → Timfraku advances main
            return {
                kind: 'talk',
                npc: 'Timfraku',
                prefer: ['yes', 'sons', 'home', 'ok', 'thank', 'return'],
                anchor: TIMFRAKU,
                radius: 5,
                drainTicks: 48
            };
        }

        if (st === TBWT.BROTHERS_DONE || st === TBWT.GOLD) {
            return {
                kind: 'talk',
                npc: 'Timfraku',
                prefer: ['yes', 'ok', 'thank', 'gold', 'reward'],
                anchor: TIMFRAKU,
                radius: 5,
                drainTicks: 40
            };
        }

        return { kind: 'wait', reason: `no step for tbwt_main=${st}`, ms: 1500 };
    }
};
