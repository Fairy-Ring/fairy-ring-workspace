/**
 * Transport location matching + trapdoor open — full port of rs2b0t
 * `src/bot/nav/exec/transportLoc.ts`, rebound to harness `__lc377` / Locs.
 *
 * 377 note: some hop menu labels differ from edge `action` (e.g. wooden log
 * graph action `Balance`, live op `Cross`). Candidates include synonyms so we
 * do not invent hop types in WalkExecutor.
 *
 * @see docs/decisions/005-port-rs2b0t-nav.md
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

import type { TransportInfo } from '../PathFinder.ts';
import { chebyshev } from '../followMath.ts';
import { Loc } from '../../script/browser/api.ts';

export type LocSnap = {
    id: number;
    name: string | null;
    ops: (string | null)[];
    x: number;
    z: number;
    lx?: number;
    lz?: number;
    typecode?: number;
    distance?: number;
};

export type WorldTile = { x: number; z: number; level: number };

function abi(): Any {
    return (globalThis as Any).__lc377;
}

/** Display-name aliases (Stairs vs Staircase). */
function transportNameAliases(locName: string): string[] {
    const base = locName.trim();
    const names = [base];
    if (/^staircase$/i.test(base)) names.push('Stairs');
    else if (/^stairs$/i.test(base)) names.push('Staircase');
    return names;
}

/**
 * Live menu ops that can satisfy a graph transport action.
 * Balance / Cross / Walk-across are one family (274 Balance vs 377 Cross on log).
 */
export function transportActionCandidates(action: string): string[] {
    const a = (action ?? '').trim();
    if (!a) return [];
    const out = new Set<string>([a]);
    if (/^(balance|cross|walk-across)$/i.test(a)) {
        out.add('Balance');
        out.add('Cross');
        out.add('Walk-across');
    }
    if (/^climb(-up|-down)?$/i.test(a)) {
        out.add('Climb');
        out.add('Climb-up');
        out.add('Climb-down');
    }
    if (/^go-through$/i.test(a)) {
        out.add('Go-through');
        out.add('Open');
    }
    return [...out];
}

function opsOfferAction(ops: readonly (string | null)[], candidates: string[]): boolean {
    return candidates.some(c => {
        const want = c.toLowerCase();
        return ops.some(o => o != null && (String(o).toLowerCase() === want || String(o).toLowerCase().includes(want)));
    });
}

/** Prefer exact live op, then substring, else preferred graph action. */
export function resolveLiveTransportAction(
    ops: readonly (string | null)[],
    preferred: string
): string {
    const candidates = transportActionCandidates(preferred);
    for (const c of candidates) {
        const hit = ops.find(o => o != null && String(o).toLowerCase() === c.toLowerCase());
        if (hit) return String(hit);
    }
    for (const c of candidates) {
        const want = c.toLowerCase();
        const hit = ops.find(o => o != null && String(o).toLowerCase().includes(want));
        if (hit) return String(hit);
    }
    return preferred;
}

function nameMatches(locName: string | null, aliases: string[]): boolean {
    if (!locName) return false;
    const n = locName.toLowerCase();
    return aliases.some(a => n === a.toLowerCase() || n.includes(a.toLowerCase()));
}

function sceneLocs(maxDist = 24): LocSnap[] {
    const reader = abi()?.reader;
    if (!reader?.locs) return [];
    return (reader.locs({ maxDist }) ?? []) as LocSnap[];
}

function wrapLoc(snap: LocSnap): Loc {
    return new Loc(snap as Any);
}

export function matchesTransportLoc(
    transport: TransportInfo,
    loc: { readonly id: number; tile(): { x: number; z: number } }
): boolean {
    const t = loc.tile();
    const near = Math.max(Math.abs(t.x - transport.locX), Math.abs(t.z - transport.locZ)) <= 3;
    if (transport.locId === undefined && transport.openLocId === undefined) {
        return near;
    }
    const idOk =
        (transport.locId !== undefined && loc.id === transport.locId) ||
        (transport.openLocId !== undefined && loc.id === transport.openLocId);
    return idOk && near;
}

/** Live scene still has this transport placement (or open leaf for Open). */
export function transportLocValid(transport: TransportInfo): boolean {
    return findTransportLoc(transport) !== null || barrierLooksOpen(transport);
}

function barrierLooksOpen(transport: TransportInfo): boolean {
    if (!/^open$/i.test(transport.action)) return false;
    const aliases = transportNameAliases(transport.locName);
    for (const loc of sceneLocs(16)) {
        if (!nameMatches(loc.name, aliases)) continue;
        if (chebyshev(loc, { x: transport.locX, z: transport.locZ }) > 3) continue;
        if ((loc.ops ?? []).some(o => o != null && /^close$/i.test(String(o)))) {
            return true;
        }
    }
    return false;
}

export function matchesTransportLanding(
    transport: TransportInfo,
    expectedLevel: number,
    before: WorldTile | null,
    current: WorldTile | null
): boolean {
    if (!current) return false;
    if (transport.toTile && current.level === expectedLevel && chebyshev(current, transport.toTile) <= 3) {
        return true;
    }
    // Level-only hops (Climb-up/down without exact toTile on some edges)
    if (transport.toLevel !== undefined && current.level === transport.toLevel) {
        return true;
    }
    return (
        transport.acceptAnyLanding === true &&
        before !== null &&
        (current.level !== before.level || chebyshev(current, before) > 64)
    );
}

/**
 * After acceptAnyLanding hops, live tile can be far from planned `to`.
 * Force repath from real landing.
 */
export function multiLandingNeedsRepath(
    transport: TransportInfo,
    plannedLevel: number,
    live: { x: number; z: number; level: number } | null
): boolean {
    if (!live || transport.acceptAnyLanding !== true || !transport.toTile) {
        return false;
    }
    if (live.level !== plannedLevel) return true;
    return chebyshev(live, transport.toTile) > 3;
}

/**
 * Live scene loc for a graph transport hop.
 * Returns Loc (interactable) or null when already open / missing.
 */
export function findTransportLoc(transport: TransportInfo): Loc | null {
    const aliases = transportNameAliases(transport.locName);
    const candidates = transportActionCandidates(transport.action);
    const locs = sceneLocs(24);

    const nearPlacement = (loc: LocSnap, r: number) =>
        chebyshev(loc, { x: transport.locX, z: transport.locZ }) <= r;

    // 1) name + any candidate action at placement
    let best: LocSnap | null = null;
    let bestD = 99;
    for (const loc of locs) {
        if (!nameMatches(loc.name, aliases)) continue;
        if (!opsOfferAction(loc.ops ?? [], candidates)) continue;
        if (!nearPlacement(loc, 5)) continue;
        const d = chebyshev(loc, { x: transport.locX, z: transport.locZ });
        if (d < bestD) {
            bestD = d;
            best = loc;
        }
    }
    if (best) return wrapLoc(best);

    // 2) locId match near placement
    if (transport.locId != null || transport.openLocId != null) {
        for (const loc of locs) {
            if (loc.id !== transport.locId && loc.id !== transport.openLocId) continue;
            if (!nearPlacement(loc, 3)) continue;
            if (!opsOfferAction(loc.ops ?? [], candidates)) continue;
            return wrapLoc(loc);
        }
        // id match without action (transform lag) — still useful for open leaf probe
        for (const loc of locs) {
            if (loc.id !== transport.locId && loc.id !== transport.openLocId) continue;
            if (!nearPlacement(loc, 3)) continue;
            if (opsOfferAction(loc.ops ?? [], candidates) || loc.ops?.some(Boolean)) {
                // Prefer when any op; interact will resolve action
                if (opsOfferAction(loc.ops ?? [], candidates)) return wrapLoc(loc);
            }
        }
    }

    // 3) Stairs: Climb-* at placement (Stairs vs Staircase)
    if (/climb/i.test(transport.action) && /stair/i.test(transport.locName)) {
        for (const loc of locs) {
            if (!nearPlacement(loc, 2)) continue;
            if (!/stair/i.test(loc.name ?? '')) continue;
            if (!opsOfferAction(loc.ops ?? [], candidates)) continue;
            return wrapLoc(loc);
        }
    }

    // 4) Ladder family
    if (/climb/i.test(transport.action) && /ladder/i.test(transport.locName)) {
        for (const loc of locs) {
            if (!nearPlacement(loc, 3)) continue;
            if (!/ladder/i.test(loc.name ?? '')) continue;
            if (!opsOfferAction(loc.ops ?? [], candidates)) continue;
            return wrapLoc(loc);
        }
    }

    // 5) Same-level hop by name near placement without strict action
    //    (Balance edge, live Cross only — already covered by candidates; this is id-less fallback)
    if (transport.locId != null) {
        for (const loc of locs) {
            if (loc.id !== transport.locId) continue;
            if (!nearPlacement(loc, 4)) continue;
            return wrapLoc(loc);
        }
    }

    // 6) Door already open (Close op) — caller walks through
    if (/^open$/i.test(transport.action)) {
        for (const loc of locs) {
            if (!nameMatches(loc.name, aliases)) continue;
            if (!nearPlacement(loc, 3)) continue;
            if ((loc.ops ?? []).some(o => o != null && /^close$/i.test(String(o)))) {
                return null;
            }
        }
    }

    return null;
}

/**
 * Fire OPLOC for transport action (Climb-down / Open / Balance→Cross / …).
 * Prefers exact typecode when loc snap has it.
 */
export function interactTransportLoc(loc: Loc | LocSnap, action: string): boolean {
    if (loc instanceof Loc) {
        const live = resolveLiveTransportAction(loc.actions(), action);
        // Loc.interact is async in api — fire sync path via menuAction
        const snap = (loc as Any).snap as LocSnap | undefined;
        if (snap) return interactSnap(snap, live);
        // fallback: fire-and-forget async
        void loc.interact(live);
        return true;
    }
    return interactSnap(loc, resolveLiveTransportAction(loc.ops ?? [], action));
}

function interactSnap(loc: LocSnap, action: string): boolean {
    const actions = abi()?.actions;
    if (!actions) return false;
    const want = action.toLowerCase();
    const ops = loc.ops ?? [];
    let oi = ops.findIndex(o => o != null && String(o).toLowerCase() === want);
    if (oi < 0) {
        oi = ops.findIndex(o => o != null && String(o).toLowerCase().includes(want));
    }
    // Last resort: first candidate family op on loc
    if (oi < 0) {
        const cands = transportActionCandidates(action);
        oi = ops.findIndex(
            o => o != null && cands.some(c => String(o).toLowerCase().includes(c.toLowerCase()))
        );
    }
    if (oi < 0) return false;

    if (loc.typecode != null && loc.lx != null && loc.lz != null && actions.menuAction) {
        const OP_LOC = [625, 721, 743, 357, 1071];
        const code = OP_LOC[oi];
        if (code != null) return !!actions.menuAction(code, loc.typecode, loc.lx, loc.lz);
    }
    if (actions.opLocAt) {
        return !!actions.opLocAt(loc.x, loc.z, action);
    }
    return false;
}

export async function openShutTrapdoor(
    transport: TransportInfo,
    log: (msg: string) => void,
    delayUntil: (pred: () => boolean, ms: number) => Promise<boolean>
): Promise<boolean> {
    const locs = sceneLocs(16);
    const shut = locs.find(
        loc =>
            nameMatches(loc.name, transportNameAliases(transport.locName)) &&
            Math.max(Math.abs(loc.x - transport.locX), Math.abs(loc.z - transport.locZ)) <= 3 &&
            (loc.ops ?? []).some(a => a != null && /^open/i.test(String(a)))
    );
    if (!shut) return false;
    const op = (shut.ops ?? []).find(a => a != null && /^open/i.test(String(a)));
    if (!op || !interactSnap(shut, String(op))) return false;
    log(`opened the shut '${transport.locName}' at (${shut.x},${shut.z}) before descending`);
    return delayUntil(() => findTransportLoc(transport) !== null, 4000);
}

/** Convenience: async interact via Loc API when available. */
export async function interactTransportLocAsync(loc: Loc, action: string): Promise<boolean> {
    const live = resolveLiveTransportAction(loc.actions(), action);
    return loc.interact(live);
}
