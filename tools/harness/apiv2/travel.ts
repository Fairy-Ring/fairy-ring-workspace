/**
 * PR 604 Traveller, rebound to our 377 PathFinder + collision pack.
 * Walk legs: furthest in-scene click, shrink reach when the client refuses.
 * Door/stair tiles still go through WalkExecutor.handleTransport via callback.
 */
import { ensureNav, findPath } from '../nav/browser/NavigatorMain.ts';
import { expandWaypoints } from '../nav/pathExpand.ts';
import type { TransportInfo } from '../nav/PathFinder.ts';
import { arrived, CANNOT_REACH, said, sceneReady } from './evidence.ts';
import { walk } from './interact.ts';
import { readSnap } from './read.ts';
import { perform, until } from './settle.ts';
import type { WorldTile } from './types.ts';

export type TravelOutcome =
    | { kind: 'arrived'; at: WorldTile }
    | { kind: 'blocked'; at: WorldTile; detail: string }
    | { kind: 'refused'; at: WorldTile; reason: string }
    | { kind: 'gave-up'; at: WorldTile; hops: number };

export type CrossHop = (step: {
    x: number;
    z: number;
    level: number;
    transport: TransportInfo;
}) => Promise<boolean>;

function here(): WorldTile {
    return readSnap().tile ?? { x: 0, z: 0, level: 0 };
}

function inScene(tile: WorldTile): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = (globalThis as any).__lc377;
    return !!a?.reader?.toLocal?.(tile.x, tile.z);
}

function furthestClickable(
    path: WorldTile[],
    from: number,
    reach = Number.POSITIVE_INFINITY
): number | null {
    let fallback: number | null = null;
    const ceiling = Math.min(path.length - 1, from + reach);
    for (let at = ceiling; at >= from; at--) {
        const tile = path[at]!;
        if (!inScene(tile)) continue;
        if (fallback === null) fallback = at;
        return at;
    }
    return fallback;
}

async function walkLeg(
    path: WorldTile[],
    limits: { closeEnough: number; budgetTicks: number; maxHops: number }
): Promise<TravelOutcome | null> {
    let next = 0;
    let hops = 0;
    let reach = Number.POSITIVE_INFINITY;
    let rebuilds = 0;
    while (next < path.length) {
        if (++hops > limits.maxHops) return { kind: 'gave-up', at: here(), hops };
        const aimIndex = furthestClickable(path, next, reach);
        if (aimIndex === null) {
            return {
                kind: 'blocked',
                at: here(),
                detail: `no remaining tile of ${path.length - next} is in the loaded scene`
            };
        }
        const aim = path[aimIndex]!;
        const sent = walk(aim);
        if (!sent.sent) {
            if (
                (sent.reason === 'scene-unavailable' ||
                    sent.reason === 'off-scene' ||
                    sent.reason === 'level-mismatch') &&
                rebuilds < 12
            ) {
                rebuilds++;
                await until({ arms: { ready: sceneReady() }, budgetTicks: 30 });
                continue;
            }
            if (sent.reason === 'unreachable') {
                const span = aimIndex - next;
                if (span > 1) {
                    reach = Math.max(1, span >> 1);
                    continue;
                }
                return {
                    kind: 'blocked',
                    at: here(),
                    detail: `client will not walk even one tile to ${aim.x},${aim.z}`
                };
            }
            return { kind: 'refused', at: here(), reason: sent.reason };
        }
        const outcome = await until({
            arms: {
                close: arrived(aim, limits.closeEnough),
                unreachable: said(CANNOT_REACH)
            },
            budgetTicks: limits.budgetTicks
        });
        if (outcome.kind === 'matched' && outcome.arm === 'unreachable') {
            const span = aimIndex - next;
            if (span > 1) {
                reach = Math.max(1, span >> 1);
                continue;
            }
            return { kind: 'refused', at: here(), reason: `cannot reach ${aim.x},${aim.z}` };
        }
        if (!(outcome.kind === 'matched' && outcome.arm === 'close')) {
            return {
                kind: 'blocked',
                at: here(),
                detail: `walk to ${aim.x},${aim.z} ended ${outcome.kind}`
            };
        }
        reach = Number.POSITIVE_INFINITY;
        next = aimIndex + 1;
    }
    return null;
}

/**
 * Plan on the 377 pack, walk with PR 604 hop-splitting.
 * `cross` handles door/stair tiles (WalkExecutor.handleTransport).
 */
export async function travelTo(
    dest: WorldTile,
    opts: {
        radius?: number;
        log?: (m: string) => void;
        cross?: CrossHop;
        budgetTicksPerHop?: number;
        maxHops?: number;
    } = {}
): Promise<TravelOutcome> {
    const log = opts.log ?? ((m: string) => console.log(`[travel] ${m}`));
    const radius = opts.radius ?? 2;
    await ensureNav();
    const me = here();
    if (arrived(dest, radius)(readSnap(), readSnap())) {
        return { kind: 'arrived', at: me };
    }
    const path = await findPath(me, dest, {});
    if (!path.ok) {
        return { kind: 'refused', at: me, reason: path.reason };
    }
    const tiles = expandWaypoints(
        path.waypoints.map(w => ({
            x: w.x,
            z: w.z,
            level: w.level,
            transport: w.transport
        }))
    );
    log(`route cost=${path.cost} wp=${path.waypoints.length} dense=${tiles.length}`);

    let i = 0;
    while (i < tiles.length) {
        const hopAt = tiles.findIndex((t, idx) => idx >= i && t.transport);
        const walkEnd = hopAt === -1 ? tiles.length : hopAt;
        const walkPath: WorldTile[] = tiles.slice(i, walkEnd).map(t => ({
            x: t.x,
            z: t.z,
            level: t.level
        }));
        if (walkPath.length) {
            const walked = await walkLeg(walkPath, {
                closeEnough: radius,
                budgetTicks: opts.budgetTicksPerHop ?? 60,
                maxHops: opts.maxHops ?? 60
            });
            if (walked) return walked;
        }
        if (hopAt === -1) break;
        const step = tiles[hopAt]!;
        if (step.transport && opts.cross) {
            const ok = await opts.cross({
                x: step.x,
                z: step.z,
                level: step.level,
                transport: step.transport
            });
            if (!ok) {
                return {
                    kind: 'blocked',
                    at: here(),
                    detail: `transport ${step.transport.action} ${step.transport.locName}`
                };
            }
        } else if (step.transport) {
            const outcome = await perform(() => walk({ x: step.x, z: step.z, level: step.level }), {
                arms: { there: arrived({ x: step.x, z: step.z, level: step.level }, 1) },
                budgetTicks: 40
            });
            if (!(outcome.kind === 'matched')) {
                return {
                    kind: 'blocked',
                    at: here(),
                    detail: `no cross() for ${step.transport.locName}`
                };
            }
        }
        i = hopAt + 1;
    }
    const at = here();
    if (arrived(dest, radius)(readSnap(), readSnap())) return { kind: 'arrived', at };
    return { kind: 'arrived', at };
}
