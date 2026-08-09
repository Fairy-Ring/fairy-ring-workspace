/**
 * Main-thread PathFinder host for harness (no Worker yet).
 * Loads collision.lcnav.gz once; classic graph via loadDefaultNavEdges.
 */
import { gunzipSync } from 'fflate';
import { PathFinder, type NavPoint, type PathOutcome, type FindPathCallOptions } from '../PathFinder.ts';
import { loadDefaultNavEdges } from '../loadTransportGraph.ts';
import { applyCollisionPatches } from '../data/collisionPatches.ts';

export type PathResult = PathOutcome & { elapsedMs?: number };

let finder: PathFinder | null = null;
let loadPromise: Promise<PathFinder> | null = null;
let failReason = '';

const DEFAULT_PACK_URL = '/harness/collision.lcnav.gz';

export function navReady(): boolean {
    return finder !== null;
}

export function navFailReason(): string {
    return failReason;
}

export function getFinder(): PathFinder | null {
    return finder;
}

export async function ensureNav(packUrl = DEFAULT_PACK_URL): Promise<PathFinder> {
    if (finder) return finder;
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
        try {
            const res = await fetch(packUrl);
            if (!res.ok) throw new Error(`pack fetch HTTP ${res.status} (${packUrl})`);
            const buf = new Uint8Array(await res.arrayBuffer());
            let pack = buf;
            if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
                pack = gunzipSync(buf);
            }
            const f = new PathFinder(pack);
            applyCollisionPatches(f);
            loadDefaultNavEdges(f);
            finder = f;
            console.info(
                `[nav] ready mapsquares=${f.mapsquares} doors=${f.doorEdges} transports=${f.transportEdges} (collision patches applied)`
            );
            return f;
        } catch (e) {
            failReason = e instanceof Error ? e.message : String(e);
            loadPromise = null;
            console.error('[nav] init failed:', failReason);
            throw e;
        }
    })();
    return loadPromise;
}

export async function findPath(
    from: NavPoint,
    to: NavPoint,
    opts?: FindPathCallOptions
): Promise<PathResult> {
    const f = await ensureNav();
    const t0 = performance.now();
    const outcome = f.findPath(from, to, {
        maxExpansions: opts?.maxExpansions ?? 500_000,
        avoidDoors: opts?.avoidDoors,
        state: opts?.state,
        policy: opts?.policy ?? { useTeleports: false },
        useTeleportCatalog: false, // classic mode
        avoidZones: opts?.avoidZones
    });
    return { ...outcome, elapsedMs: performance.now() - t0 };
}
