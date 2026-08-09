/**
 * Horror from the Deep basalt rock chain — content `basalt_rocks.rs2`, map 39,56.
 *
 * Not walk edges in collision pack: Jump-across exactmove. Modelled as
 * specialCrossings (+ optional transport edges) so quest modules only name
 * destinations (rs2b0t NAV special-crossing pattern).
 *
 * @see docs/research/rs2b0t-quester-steal-list.md
 * @see vendor/content/scripts/quests/quest_horror/scripts/basalt_rocks.rs2
 */
import type { SpecialCrossing } from './specialCrossings.ts';
import type { TransportEdgeData } from '../PathFinder.ts';

/** Map square 39,56 world base. */
const BASE_X = 2496;
const BASE_Z = 3584;

export function basaltWorld(lx: number, lz: number): { x: number; z: number; level: number } {
    return { x: BASE_X + lx, z: BASE_Z + lz, level: 0 };
}

/** Mainland shore after last south jump (spot2 final). */
export const BASALT_MAINLAND_SHORE = basaltWorld(26, 10);
/** Island shore after last north jump (spot9 final). */
export const BASALT_ISLAND_SHORE = basaltWorld(18, 36);

/**
 * One directed Jump-across: stand at `start` local → land near `final` local.
 * Spot ids match basalt_rocks.rs2 horror_jumping_spotN.
 */
const LINKS: {
    spot: number;
    startLx: number;
    startLz: number;
    finalLx: number;
    finalLz: number;
    dir: 'N' | 'S' | 'E' | 'W';
}[] = [
    { spot: 1, startLx: 26, startLz: 11, finalLx: 26, finalLz: 14, dir: 'N' },
    { spot: 2, startLx: 26, startLz: 13, finalLx: 26, finalLz: 10, dir: 'S' },
    { spot: 3, startLx: 26, startLz: 16, finalLx: 26, finalLz: 19, dir: 'N' },
    { spot: 4, startLx: 26, startLz: 18, finalLx: 26, finalLz: 15, dir: 'S' },
    { spot: 5, startLx: 22, startLz: 27, finalLx: 19, finalLz: 27, dir: 'W' },
    { spot: 6, startLx: 20, startLz: 27, finalLx: 22, finalLz: 26, dir: 'E' },
    { spot: 7, startLx: 18, startLz: 29, finalLx: 18, finalLz: 32, dir: 'N' },
    { spot: 8, startLx: 18, startLz: 31, finalLx: 18, finalLz: 28, dir: 'S' },
    { spot: 9, startLx: 18, startLz: 33, finalLx: 18, finalLz: 36, dir: 'N' },
    { spot: 10, startLx: 18, startLz: 35, finalLx: 18, finalLz: 32, dir: 'S' }
];

function linkToCrossing(link: (typeof LINKS)[number]): SpecialCrossing {
    const start = basaltWorld(link.startLx, link.startLz);
    const fin = basaltWorld(link.finalLx, link.finalLz);
    return {
        x: start.x,
        z: start.z,
        level: 0,
        locName: 'Basalt rock',
        action: 'Jump-across',
        toTile: { x: fin.x, z: fin.z, level: 0 },
        arrivalRadius: 1,
        label: `Horror basalt spot${link.spot} ${link.dir}`
    };
}

/** All directed basalt jumps for SPECIAL_CROSSINGS + lookup. */
export const HORROR_BASALT_CROSSINGS: SpecialCrossing[] = LINKS.map(linkToCrossing);

/** Southbound chain order (island → mainland). */
export const BASALT_SOUTH_ORDER = [10, 8, 6, 4, 2] as const;
/** Northbound chain order (mainland → island). */
export const BASALT_NORTH_ORDER = [1, 3, 5, 7, 9] as const;

function crossingBySpot(spot: number): SpecialCrossing {
    const sc = HORROR_BASALT_CROSSINGS.find(c => c.label.includes(`spot${spot} `));
    if (!sc) throw new Error(`basalt spot${spot} missing`);
    return sc;
}

export function basaltSouthCrossings(): SpecialCrossing[] {
    return BASALT_SOUTH_ORDER.map(crossingBySpot);
}

export function basaltNorthCrossings(): SpecialCrossing[] {
    return BASALT_NORTH_ORDER.map(crossingBySpot);
}

function nearTile(
    me: { x: number; z: number },
    t: { x: number; z: number },
    r: number
): boolean {
    return Math.max(Math.abs(me.x - t.x), Math.abs(me.z - t.z)) <= r;
}

/** Hop finished: standing on its toTile, or past it in travel direction. */
function hopDone(
    me: { x: number; z: number },
    sc: SpecialCrossing,
    dir: 'south' | 'north'
): boolean {
    const to = sc.toTile;
    if (!to) return false;
    const rad = sc.arrivalRadius ?? 1;
    if (nearTile(me, to, rad)) return true;
    // Southbound: past dest if further south (lower z)
    if (dir === 'south' && me.z < to.z) return true;
    // Northbound: past dest if further north
    if (dir === 'north' && me.z > to.z) return true;
    return false;
}

/**
 * Next Jump-across toward mainland (south) or island (north).
 * Walks the chain in order and skips hops already completed (on/past toTile).
 * Fixes stall when “jump already at toTile” kept re-picking the same rock.
 */
export function nextBasaltCrossing(
    me: { x: number; z: number; level?: number } | null,
    dir: 'south' | 'north'
): SpecialCrossing | null {
    if (!me) return null;
    const chain = dir === 'south' ? basaltSouthCrossings() : basaltNorthCrossings();
    if (dir === 'south' && me.z <= BASALT_MAINLAND_SHORE.z + 1) return null;
    if (dir === 'north' && me.z >= BASALT_ISLAND_SHORE.z - 1) return null;

    for (const sc of chain) {
        if (!hopDone(me, sc, dir)) return sc;
    }
    return null; // whole chain done
}

/** Lighthouse / basalt north side (Larrissa). */
export function onBasaltIsland(tile: { x: number; z: number } | null): boolean {
    if (!tile) return false;
    if (tile.x >= 2490 && tile.x <= 2545 && tile.z >= 3608) return true;
    return false;
}

/**
 * Graph edges so PathFinder can route across jumps when endpoints are walkable.
 * If collision marks rocks unwalkable, edges are skipped at load — quest still
 * uses nextBasaltCrossing + jump step.
 */
export function horrorBasaltTransportEdges(): TransportEdgeData[] {
    return HORROR_BASALT_CROSSINGS.map(sc => ({
        from: { x: sc.x, z: sc.z, level: sc.level },
        to: {
            x: sc.toTile!.x,
            z: sc.toTile!.z,
            level: sc.toTile!.level ?? 0
        },
        locName: sc.locName,
        action: sc.action,
        kind: 'shortcut',
        locX: sc.x,
        locZ: sc.z,
        debugName: sc.label
    }));
}
