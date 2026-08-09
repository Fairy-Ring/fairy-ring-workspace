/**
 * Shades of Mort'ton — harness quest module (start → mid temple).
 *
 * Stages: `%morttonquest` varp **339** (no transmit — use getvar / __morttonServerStage).
 * Host: diary flip + brew materials + combat gear; one tele to Mort'ton (no mid-quest tele).
 *
 * Mid-gate defaults:
 *   - Honest kill mid: `__morttonCompleteStage = 40` (5 shades) — **preferred**.
 *   - Temple (50) only when inv has real Loar remains (ground take) — no `give` seed.
 *
 * Host prep cheats only (setstat/give gear/materials/one start tele). No mid-quest tele.
 * No `give shade_bones*` to force hand-in (authenticity — Decision 004 / authenticity-stance).
 *
 * @see docs/research/port-quest-mortton-274-to-377.md
 * @see docs/plans/2026-08-05-port-quest-mortton.md
 */
import {
    Chat,
    ChatDialog,
    Equipment,
    Execution,
    Game,
    GroundItems,
    Inventory,
    Npcs,
    Traversal,
    actions,
    type Npc
} from '../../api.ts';
import { pickDialogOption } from '../dialogPath.ts';
import type { QuestModule, QuestSnapshot, QuestStep, WorldTile } from '../types.ts';

/** Mirror content `quest_mortton.constant`. */
export const MORTTON = {
    NOT_STARTED: 0,
    READ_DIARY: 5,
    MADE_SERUM: 10,
    KILL_SHADES: 15,
    KILLED_1: 20,
    KILLED_2: 25,
    KILLED_3: 30,
    KILLED_4: 35,
    KILLED_5: 40,
    SHADES_TO_RAZMIRE: 45,
    SHADES_TO_ULSQUIRE: 47,
    ULSQUIRE_TEMPLE: 50,
    REBUILD_TEMPLE: 55,
    LIT_PYRE: 80
} as const;

/** m54_51 world coords (54×64+lx, 51×64+lz). */
export const ULSQUIRE = { x: 3496, z: 3289, level: 0 }; // 0 40 25 : 1251
export const RAZMIRE = { x: 3489, z: 3296, level: 0 }; // 0 33 32 : 1253
/** Dense Loar shadow cluster south of Ulsquire. */
export const SHADE_FIELD = { x: 3474, z: 3280, level: 0 }; // 0 18 16 : 1240

export const OBJ = {
    SERUM3: 3410,
    TARROMIN: 253,
    ASHES: 592,
    VIAL_WATER: 227,
    TARROMINVIAL: 95,
    ASHESVIAL: 3406,
    SHADE_BONES1: 3396
} as const;

/** Script-ordered multi path: open kill-shades multi then accept (razmire_keelgan.rs2). */
const RAZMIRE_KILL_PATH = [
    'What are all these shadow creatures',
    'Is there anything worth doing around here',
    "Yes, I'll dispatch those dark and evil creatures",
    'dispatch those dark',
    'Yes'
];

const ULSQUIRE_TEMPLE_PATH = [
    'What can you tell me about that temple',
    'temple',
    'What did you find out about the remains',
    'Ok thanks',
    'Ok, thanks'
];

function serverStage(): number {
    const g = globalThis as { __morttonServerStage?: number };
    const n = Number(g.__morttonServerStage);
    return Number.isFinite(n) ? n | 0 : 0;
}

function completeStage(): number {
    const g = globalThis as { __morttonCompleteStage?: number };
    const n = Number(g.__morttonCompleteStage);
    if (Number.isFinite(n) && n > 0) return n | 0;
    // Default honest mid-gate = five shades killed (not temple — remains need ground take)
    return MORTTON.KILLED_5;
}

function near(tile: WorldTile | null, a: WorldTile, r: number): boolean {
    if (!tile) return false;
    if ((tile.level ?? 0) !== (a.level ?? 0)) return false;
    return Math.max(Math.abs(tile.x - a.x), Math.abs(tile.z - a.z)) <= r;
}

function invHasId(id: number): boolean {
    return Inventory.items().some(i => (i.id | 0) === id);
}

function invCountId(id: number): number {
    return Inventory.items()
        .filter(i => (i.id | 0) === id)
        .reduce((n, i) => n + (i.count | 0), 0);
}

function hasSerum(): boolean {
    return (
        invHasId(OBJ.SERUM3) ||
        Inventory.items().some(i => /serum 207/i.test(i.name ?? ''))
    );
}

function hasBones(): number {
    return (
        invCountId(OBJ.SHADE_BONES1) ||
        Inventory.count('Loar remains') ||
        Inventory.items()
            .filter(i => /loar remains|shade remain/i.test(i.name ?? ''))
            .reduce((n, i) => n + (i.count | 0), 0)
    );
}

/**
 * getvar morttonquest → __morttonServerStage (non-transmit varp).
 * Chat ring is **newest first**. Only scan the top few lines after the cheat so
 * we never latch an older getvar (caused 30→20 / 15→5 thrash).
 * Also: never apply a **lower** stage than we already believe (stage only rises).
 */
async function refreshMorttonStage(log: (m: string) => void): Promise<number> {
    const before = serverStage();
    actions.cheat('getvar morttonquest');
    const want = 'get morttonquest:';
    let value: number | null = null;
    for (let i = 0; i < 14; i++) {
        await Execution.delayTicks(1);
        // Newest 6 lines only — this reply is almost always #0 or #1
        for (const t of Chat.texts(6)) {
            const low = t.toLowerCase();
            if (!low.includes(want)) continue;
            const m = t.match(/:\s*(?:to\s*)?(-?\d+)/i);
            if (m) {
                value = parseInt(m[1], 10);
                break;
            }
        }
        if (value != null) break;
    }
    if (value != null && Number.isFinite(value)) {
        // Quest progress is monotonic — ignore stale lower readings
        const applied = Math.max(before, value | 0);
        (globalThis as { __morttonServerStage?: number }).__morttonServerStage = applied;
        if (applied !== before) {
            log(
                `getvar morttonquest=${value}` +
                    (applied !== value ? ` (kept ${applied}, ignore lower)` : '') +
                    ` (was ${before})`
            );
        } else if (value < before) {
            log(`getvar ignore lower morttonquest=${value} (keep ${before})`);
        }
        return applied;
    }
    log(`getvar morttonquest: no reply (was ${before})`);
    return before;
}

function findShade(maxDist = 20): Npc | null {
    // Prefer solid Loar Shade, then shadow form (Attack transforms).
    for (const n of ['Loar Shade', 'Loar Shadow']) {
        const hit =
            Npcs.query().name(n).action('Attack').within(maxDist).nearest() ??
            Npcs.query().name(n).within(maxDist).nearest();
        if (hit) return hit;
    }
    return (
        Npcs.query()
            .within(maxDist)
            .where((n: Npc) => {
                const nm = (n.name ?? '').toLowerCase();
                return (
                    (nm.includes('loar') || nm.includes('shade') || nm.includes('shadow')) &&
                    !nm.includes('afflicted') &&
                    !nm.includes('ulsquire') &&
                    !nm.includes('razmire')
                );
            })
            .nearest() ?? null
    );
}

async function ensureMelee(log: (m: string) => void): Promise<void> {
    for (const n of ['Steel scimitar', 'Steel platebody', 'Steel platelegs']) {
        if (Equipment.contains(n)) continue;
        if (!Inventory.contains(n) && !Inventory.firstIncludes?.(n)) {
            // Inventory.first is exact; try interact equip by name
        }
        if (Inventory.contains(n) || Inventory.items().some(i => i.name === n)) {
            log(`equip ${n}`);
            await Equipment.equip(n);
            await Execution.delayTicks(1);
        }
    }
}

async function maybeEat(log: (m: string) => void): Promise<void> {
    // Soft heal if lobster available (no HP reader required)
    const food =
        Inventory.first('Lobster') ??
        Inventory.items().find(i => /lobster|swordfish|shark|trout|salmon/i.test(i.name ?? ''));
    if (!food) return;
    // Eat only when in combat (aggro thrash) to avoid food waste
    if (!Game.inCombat()) return;
    log(`eat ${food.name}`);
    await food.interact('Eat');
    await Execution.delayTicks(2);
}

/**
 * Clear shade aggro before Talk/OPNPCU — Mort'ton streets are multi-hostile.
 * Returns true if we spent a cycle fighting (caller may retry talk next tick).
 */
async function clearShadeAggro(log: (m: string) => void): Promise<boolean> {
    if (ChatDialog.isOpen()) return false;
    // Only fight when actually in combat — proximity is normal in Mort'ton
    if (!Game.inCombat()) return false;

    await ensureMelee(log);
    await maybeEat(log);

    let shade = findShade(12);
    if (!shade) {
        log('aggro: in combat, no shade in 12 — wait');
        await Execution.delayUntil(() => !Game.inCombat(), 15_000);
        return true;
    }
    log(`aggro: Attack ${shade.name}#${shade.index} d=${shade.distance()}`);
    await shade.interact('Attack');
    const idx = shade.index;
    await Execution.delayUntil(
        () => !Npcs.query().where((n: Npc) => n.index === idx).exists() || !Game.inCombat(),
        45_000
    );
    await maybeEat(log);
    await Execution.delayUntil(() => !Game.inCombat(), 6_000);
    await Execution.delayTicks(2);
    return true;
}

/**
 * Drive Razmire dialog until morttonquest >= kill_shades (15).
 * Multi for accept is easy to miss with bulk clearDialogs after OPNPCU.
 */
async function razmireAcceptKill(log: (m: string) => void): Promise<boolean> {
    const st0 = serverStage();
    if (st0 >= MORTTON.KILL_SHADES) return true;

    // Shades interrupt Talk ("already under attack" / can't reach) — clear first
    if (await clearShadeAggro(log)) {
        await Execution.delayTicks(2);
        // Don't open dialog while combat settling
        if (Game.inCombat()) return false;
    }

    // Stand on shop pad (slightly inside door corridor)
    if (!near(Game.tile(), RAZMIRE, 3)) {
        await Traversal.walkTo(RAZMIRE, { radius: 1, log });
    }

    // Cure if still afflicted
    const aff = Npcs.query().name('Afflicted(Razmire)').within(14).nearest();
    if (aff && hasSerum()) {
        const serum =
            Inventory.items().find(i => (i.id | 0) === OBJ.SERUM3) ??
            Inventory.items().find(i => /serum 207/i.test(i.name ?? ''));
        if (serum) {
            log(`razmire: serum on Afflicted(Razmire)`);
            if (aff.distance() > 1) {
                await Traversal.walkTo(aff.tile(), { radius: 1, log });
            }
            await serum.useOn(aff);
            await Execution.delayTicks(5);
            // Serum OP may open chat — drain with kill path if multi appears
            for (let i = 0; i < 20 && ChatDialog.isOpen(); i++) {
                const opts = ChatDialog.options();
                if (opts.length) {
                    const pick = pickDialogOption(opts, RAZMIRE_KILL_PATH);
                    log(`razmire multi(post-serum): → ${opts[pick]}`);
                    await ChatDialog.chooseOption(opts[pick]);
                } else if (ChatDialog.canContinue() || ChatDialog.modalMessage()) {
                    await ChatDialog.continue();
                } else {
                    await Execution.delayTicks(1);
                }
            }
            const mid = await refreshMorttonStage(log);
            if (mid >= MORTTON.KILL_SHADES) return true;
        }
    }

    // Talk if no chat open
    if (!ChatDialog.isOpen()) {
        // Re-check stage — serum multi may already have accepted kill-shades
        const check = await refreshMorttonStage(log);
        if (check >= MORTTON.KILL_SHADES) return true;

        // Only block Talk when actually in combat (shade nearby is normal)
        if (Game.inCombat()) {
            log('razmire: still in combat — clear before Talk');
            await clearShadeAggro(log);
            return false;
        }
        const raz =
            Npcs.query().name('Razmire Keelgan').within(14).nearest() ??
            Npcs.query().name('Afflicted(Razmire)').within(14).nearest();
        if (!raz) {
            log('razmire: not in scene — walk');
            await Traversal.walkTo(RAZMIRE, { radius: 2, log });
            return false;
        }
        if (raz.distance() > 2) {
            await Traversal.walkTo(raz.tile(), { radius: 1, log });
        }
        log(`razmire: Talk-to ${raz.name}`);
        await raz.interact('Talk-to');
        const opened = await Execution.delayUntil(() => ChatDialog.isOpen(), 10_000);
        if (!opened) {
            // Combat steal or reach fail
            const chat = Chat.texts(12).join(' | ');
            log(`razmire: no dialog (${chat.slice(0, 120)})`);
            await clearShadeAggro(log);
            return false;
        }
    }

    // Drain chat with prefer path (do not bulk-clear)
    for (let i = 0; i < 48; i++) {
        if (!ChatDialog.isOpen()) break;
        const opts = ChatDialog.options();
        if (opts.length > 0) {
            const pick = pickDialogOption(opts, RAZMIRE_KILL_PATH);
            log(`razmire multi: [${opts.join(' | ')}] → ${opts[pick]}`);
            await ChatDialog.chooseOption(opts[pick]);
            await Execution.delayTicks(2);
            continue;
        }
        if (ChatDialog.canContinue() || ChatDialog.modalMessage()) {
            await ChatDialog.continue();
            continue;
        }
        await Execution.delayTicks(1);
    }

    const st = await refreshMorttonStage(log);
    log(`razmire accept done stage ${st0}→${st}`);
    return st >= MORTTON.KILL_SHADES;
}

/**
 * Kill one Loar shade (shadow → solid). Refreshes stage after death.
 */
async function killOneShade(log: (m: string) => void): Promise<boolean> {
    if (ChatDialog.isOpen()) {
        await ChatDialog.continue();
        return false;
    }
    await ensureMelee(log);
    await maybeEat(log);

    let shade = findShade(18);
    if (!shade) {
        log('kill-shade: none in scan — walk field');
        await Traversal.walkTo(SHADE_FIELD, { radius: 3, log });
        await Execution.delayTicks(4);
        return false;
    }
    if (shade.distance() > 6) {
        log(`kill-shade: walk to ${shade.name}@${shade.tile().x},${shade.tile().z}`);
        await Traversal.walkTo(shade.tile(), { radius: 2, log });
        await Execution.delayTicks(2);
        shade = findShade(18);
        if (!shade) return false;
    }
    const idx = shade.index;
    const name = shade.name ?? 'Loar';
    const st0 = serverStage();
    log(`kill-shade: Attack ${name}#${idx} d=${shade.distance()} stage=${st0}`);
    await shade.interact('Attack');
    // Wait death: index gone, or stage advanced (quest kill queue)
    await Execution.delayUntil(() => {
        const stNow = serverStage();
        // refresh is slow — also check index
        if (!Npcs.query().where((n: Npc) => n.index === idx).exists()) return true;
        return false;
    }, 55_000);
    await maybeEat(log);
    await Execution.delayTicks(3);
    // Authentic remains: Take Loar remains from ground (death_drop shade_bones1)
    await takeNearbyRemains(log);
    const st = await refreshMorttonStage(log);
    log(`kill-shade done stage ${st0}→${st}`);
    return st > st0 || !Npcs.query().where((n: Npc) => n.index === idx).exists();
}

/** Take Loar remains near the player (real OP_OBJ3 Take — no give seed). */
async function takeNearbyRemains(log: (m: string) => void): Promise<number> {
    let taken = 0;
    for (let attempt = 0; attempt < 6; attempt++) {
        const drop =
            GroundItems.nearest('Loar remains', 10) ??
            GroundItems.nearest('remains', 10) ??
            GroundItems.all(10).find(g => (g.id | 0) === OBJ.SHADE_BONES1) ??
            null;
        if (!drop) break;
        const before = hasBones();
        log(`take ground ${drop.name}#${drop.id} d=${drop.distance()} @${drop.tile().x},${drop.tile().z}`);
        await drop.interact('Take');
        const ok = await Execution.delayUntil(() => hasBones() > before, 8_000);
        if (ok) {
            taken++;
            await Execution.delayTicks(1);
        } else {
            // walk onto tile and retry
            await Traversal.walkTo(drop.tile(), { radius: 0, log });
            await Execution.delayTicks(2);
            await drop.interact('Take');
            await Execution.delayUntil(() => hasBones() > before, 6_000);
            if (hasBones() > before) taken++;
            else break;
        }
    }
    if (taken) log(`take remains: +${taken} inv now ${hasBones()}`);
    return taken;
}

/** Hand remains to Razmire at stage 40 → 45. */
async function razmireHandRemains(log: (m: string) => void): Promise<boolean> {
    const st0 = serverStage();
    if (st0 >= MORTTON.SHADES_TO_RAZMIRE) return true;
    if (await clearShadeAggro(log)) return false;
    if (!near(Game.tile(), RAZMIRE, 3)) {
        await Traversal.walkTo(RAZMIRE, { radius: 1, log });
    }
    if (Npcs.query().name('Afflicted(Razmire)').within(12).nearest() && hasSerum()) {
        const serum =
            Inventory.items().find(i => (i.id | 0) === OBJ.SERUM3) ??
            Inventory.items().find(i => /serum 207/i.test(i.name ?? ''));
        const aff = Npcs.query().name('Afflicted(Razmire)').within(12).nearest();
        if (serum && aff) {
            await serum.useOn(aff);
            await Execution.delayTicks(4);
        }
    }
    if (!ChatDialog.isOpen()) {
        const raz =
            Npcs.query().name('Razmire Keelgan').within(14).nearest() ??
            Npcs.query().name('Afflicted(Razmire)').within(14).nearest();
        if (!raz) return false;
        await raz.interact('Talk-to');
        await Execution.delayUntil(() => ChatDialog.isOpen(), 10_000);
    }
    for (let i = 0; i < 40 && ChatDialog.isOpen(); i++) {
        const opts = ChatDialog.options();
        if (opts.length) {
            const pick = pickDialogOption(opts, ['Yes', 'Ok', 'store', 'general']);
            await ChatDialog.chooseOption(opts[pick]);
        } else if (ChatDialog.canContinue() || ChatDialog.modalMessage()) {
            await ChatDialog.continue();
        } else {
            await Execution.delayTicks(1);
        }
    }
    const st = await refreshMorttonStage(log);
    log(`razmire remains stage ${st0}→${st}`);
    return st >= MORTTON.SHADES_TO_RAZMIRE;
}

export const morttonQuest: QuestModule = {
    id: 'mortton',
    name: "Shades of Mort'ton",
    stageVarName: 'morttonquest',
    applyServerStage: (v: number) => {
        (globalThis as { __morttonServerStage?: number }).__morttonServerStage = v;
    },
    get completeStage() {
        return completeStage();
    },
    readStage: () => serverStage(),

    async setup(ctx) {
        // Seed stage from server once (host may have flipped diary already).
        const st = await refreshMorttonStage(ctx.log);
        await ensureMelee(ctx.log);
        ctx.log(`setup morttonquest=${st} completeStage=${completeStage()}`);
    },

    decide(snap: QuestSnapshot): QuestStep {
        const st = serverStage();
        const doneAt = completeStage();
        const tile = snap.tile;

        if (st >= doneAt) {
            return { kind: 'done' };
        }
        if (snap.dialogOpen) {
            return { kind: 'wait', reason: 'dialog' };
        }

        // Death at Lumbridge: do **not** mid-quest tele (authenticity). Fail via stall /
        // host restart. Higher combat floor + food is the real mitigation.

        // Global: only when **in combat** (not merely "shade nearby" — streets are full of them)
        if (st < MORTTON.KILL_SHADES && st >= MORTTON.MADE_SERUM && Game.inCombat()) {
            return {
                kind: 'custom',
                name: 'clear-aggro-pre-quest',
                run: async ctx => {
                    await clearShadeAggro(ctx.log);
                    return true;
                }
            };
        }

        // ── 0: diary should be host-prep; if still 0, wait (host fail) ──
        if (st < MORTTON.READ_DIARY) {
            return {
                kind: 'wait',
                reason: 'need-diary-host-prep-stage5',
                ms: 2000
            };
        }

        // ── 5 → 10: brew Serum 207 (tarromin + ashes + vial) ──
        // Both unfinished forms display as "Unfinished potion" — use ids in custom step.
        if (st === MORTTON.READ_DIARY) {
            return {
                kind: 'custom',
                name: 'brew-serum-207',
                run: async ctx => {
                    const byId = (id: number) => Inventory.items().find(i => (i.id | 0) === id) ?? null;
                    const log = ctx.log;
                    // Always re-sync first — brew may already have advanced server stage
                    let stNow = await refreshMorttonStage(log);
                    if (stNow >= MORTTON.MADE_SERUM) return true;

                    // Path A: tarrominvial + ashes
                    let unf = byId(OBJ.TARROMINVIAL) ?? byId(OBJ.ASHESVIAL);
                    if (unf && (byId(OBJ.ASHES) || byId(OBJ.TARROMIN))) {
                        const other =
                            (unf.id | 0) === OBJ.TARROMINVIAL ? byId(OBJ.ASHES) : byId(OBJ.TARROMIN);
                        if (other) {
                            log(`brew: use ${other.name}#${other.id} on ${unf.name}#${unf.id}`);
                            await other.useOn(unf);
                            await Execution.delayTicks(5);
                            stNow = await refreshMorttonStage(log);
                            return stNow >= MORTTON.MADE_SERUM;
                        }
                    }
                    // Path B: make unfinished (tarromin or ashes on vial of water)
                    const vial = byId(OBJ.VIAL_WATER) ?? Inventory.first('Vial of water');
                    const herb = byId(OBJ.TARROMIN) ?? Inventory.first('Tarromin');
                    const ashes = byId(OBJ.ASHES) ?? Inventory.first('Ashes');
                    if (vial && herb) {
                        log(`brew: Tarromin on Vial of water`);
                        await herb.useOn(vial);
                        await Execution.delayTicks(4);
                        return true; // one hop; next cycle finishes serum
                    }
                    if (vial && ashes) {
                        log(`brew: Ashes on Vial of water`);
                        await ashes.useOn(vial);
                        await Execution.delayTicks(4);
                        return true;
                    }
                    // Materials gone — if we already made serum, stage should be 10
                    stNow = await refreshMorttonStage(log);
                    if (stNow >= MORTTON.MADE_SERUM) return true;
                    if (hasSerum() && Chat.texts(20).some(t => /make serum 207/i.test(t))) {
                        log('brew: serum in inv + mes — force re-getvar');
                        stNow = await refreshMorttonStage(log);
                        return stNow >= MORTTON.MADE_SERUM;
                    }
                    log(
                        `brew: missing materials inv=${Inventory.debugList?.() ?? Inventory.items().map(i => i.name).join(',')}`
                    );
                    await Execution.delayTicks(4);
                    return false;
                }
            };
        }

        // ── 10 → 15: cure Razmire + accept kill-5 (custom dialog path) ──
        if (st === MORTTON.MADE_SERUM) {
            if (!near(tile, RAZMIRE, 10)) {
                return { kind: 'walk', tile: RAZMIRE, radius: 2, label: 'to-razmire' };
            }
            return {
                kind: 'custom',
                name: 'razmire-accept-kill',
                run: async ctx => razmireAcceptKill(ctx.log)
            };
        }

        // ── 15–35: kill shades until 40 ──
        if (st >= MORTTON.KILL_SHADES && st < MORTTON.KILLED_5) {
            return {
                kind: 'custom',
                name: `kill-shade-st${st}`,
                run: async ctx => killOneShade(ctx.log)
            };
        }

        // ── 40: remains → Razmire ──
        // Authenticity: remains must come from shade death_drop + ground take.
        // Harness has **no** ground-item ABI yet — do **not** `give shade_bones1`.
        // If completeStage > 40 and no remains, hard-fail with a clear gap message.
        if (st === MORTTON.KILLED_5) {
            if (hasBones() < 5) {
                // Sweep ground first (drops may lag after last kill)
                return {
                    kind: 'custom',
                    name: 'take-ground-remains',
                    run: async ctx => {
                        const n = await takeNearbyRemains(ctx.log);
                        if (hasBones() >= 5) return true;
                        if (doneAt <= MORTTON.KILLED_5) {
                            ctx.log(
                                `kill mid-gate done stage=40 remains=${hasBones()} (want 5 for temple)`
                            );
                            return true; // completeStage 40 — done without remains
                        }
                        if (n === 0 && hasBones() < 5) {
                            ctx.log(
                                `still need remains inv=${hasBones()}/5 — walk shade field / re-kill`
                            );
                            await Traversal.walkTo(SHADE_FIELD, { radius: 4, log: ctx.log });
                        }
                        return hasBones() >= 5;
                    }
                };
            }
            if (!near(tile, RAZMIRE, 8)) {
                return { kind: 'walk', tile: RAZMIRE, radius: 2, label: 'return-razmire' };
            }
            return {
                kind: 'custom',
                name: 'razmire-hand-remains',
                run: async ctx => razmireHandRemains(ctx.log)
            };
        }

        // ── 45: show remains to Ulsquire ──
        if (st === MORTTON.SHADES_TO_RAZMIRE) {
            if (hasBones() < 1) {
                return {
                    kind: 'custom',
                    name: 'need-one-remain-for-ulsquire',
                    run: async ctx => {
                        throw new Error(
                            'mortton: need shade remains in inv for Ulsquire (no give seed)'
                        );
                    }
                };
            }
            if (!near(tile, ULSQUIRE, 6)) {
                return { kind: 'walk', tile: ULSQUIRE, radius: 2, label: 'to-ulsquire' };
            }
            if (Npcs.query().name('Afflicted(Ulsquire)').within(12).nearest() && hasSerum()) {
                return {
                    kind: 'useOnNpc',
                    item: 'Serum 207',
                    itemId: OBJ.SERUM3,
                    npc: 'Afflicted(Ulsquire)',
                    prefer: ULSQUIRE_TEMPLE_PATH,
                    anchor: ULSQUIRE,
                    radius: 2
                };
            }
            return {
                kind: 'talk',
                npc: 'Ulsquire Shauncy',
                prefer: ULSQUIRE_TEMPLE_PATH,
                anchor: ULSQUIRE,
                radius: 2,
                drainTicks: 50
            };
        }

        // ── 47 → 50: temple dialog ──
        if (st === MORTTON.SHADES_TO_ULSQUIRE || st === MORTTON.ULSQUIRE_TEMPLE) {
            if (st >= MORTTON.ULSQUIRE_TEMPLE && st >= doneAt) {
                return { kind: 'done' };
            }
            if (!near(tile, ULSQUIRE, 6)) {
                return { kind: 'walk', tile: ULSQUIRE, radius: 2, label: 'to-ulsquire-temple' };
            }
            return {
                kind: 'talk',
                npc: 'Ulsquire Shauncy',
                prefer: ULSQUIRE_TEMPLE_PATH,
                anchor: ULSQUIRE,
                radius: 2,
                drainTicks: 60
            };
        }

        return {
            kind: 'wait',
            reason: `no-step-for-stage-${st}`,
            ms: 2000
        };
    }
};
