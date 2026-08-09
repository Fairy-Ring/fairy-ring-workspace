/**
 * Scene-local reachability probes (port of rs2b0t Reachability for harness).
 * @see docs/NAV.md#arrival
 */
import { CollisionFlag } from '../../../../vendor/client-ts/src/dash3d/CollisionFlag.ts';
import { canReachLocal, canStepLocal, type ReachOptions } from '../localReach.ts';
import type { ArrivalProbe } from '../arrival.ts';
import { chebyshev } from '../followMath.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function abi(): Any {
    return (globalThis as Any).__lc377;
}

export type WorldTile = { x: number; z: number; level: number };

const ARRIVAL_MAX_STEPS = 512;

function flagsAt(lx: number, lz: number): number | null {
    const r = abi()?.reader;
    if (typeof r?.collisionFlags === 'function') {
        return r.collisionFlags(lx, lz);
    }
    return null;
}

export const Reachability = {
    canReach(dest: WorldTile, opts?: ReachOptions): boolean {
        const me = abi()?.reader?.worldTile?.() as WorldTile | null;
        if (!me || me.level !== dest.level) return false;
        const from = abi()?.reader?.toLocal?.(me.x, me.z);
        const to = abi()?.reader?.toLocal?.(dest.x, dest.z);
        if (!from || !to) return false;
        // Without flags, scene-local only means "in loaded map"
        if (typeof abi()?.reader?.collisionFlags !== 'function') {
            return true;
        }
        return canReachLocal(flagsAt, from, to, opts);
    },

    canStep(from: WorldTile, to: WorldTile): boolean {
        if (from.level !== to.level || chebyshev(from, to) !== 1) return false;
        const a = abi()?.reader?.toLocal?.(from.x, from.z);
        if (!a) return false;
        if (typeof abi()?.reader?.collisionFlags !== 'function') return true;
        return canStepLocal(flagsAt, a.lx, a.lz, to.x - from.x, to.z - from.z);
    },

    walkable(dest: WorldTile): boolean {
        const me = abi()?.reader?.worldTile?.() as WorldTile | null;
        if (!me || me.level !== dest.level) return false;
        const to = abi()?.reader?.toLocal?.(dest.x, dest.z);
        if (!to) return false;
        const f = flagsAt(to.lx, to.lz);
        if (f === null) return true; // unknown → don't hard-block
        return (f & CollisionFlag.SQ_BLOCKED) === 0;
    },

    probeable(dest: WorldTile): boolean {
        const me = abi()?.reader?.worldTile?.() as WorldTile | null;
        if (!me || me.level !== dest.level) return false;
        return abi()?.reader?.toLocal?.(dest.x, dest.z) != null;
    },

    arrivalProbe(): ArrivalProbe {
        return {
            canReach: t => Reachability.canReach(t, { maxSteps: ARRIVAL_MAX_STEPS }),
            walkable: t => Reachability.walkable(t),
            canReachAdjacent: t => Reachability.canReach(t, { maxSteps: ARRIVAL_MAX_STEPS, adjacentOk: true }),
            probeable: t => Reachability.probeable(t)
        };
    }
};
