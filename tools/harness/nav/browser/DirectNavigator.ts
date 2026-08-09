/**
 * Scene-local walk issue — rs2b0t DirectNavigator rebound to __lc377.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

import { Reachability } from './Reachability.ts';
import { isArrived } from '../arrival.ts';
import { Execution } from '../../script/browser/api.ts';

function abi(): Any {
    return (globalThis as Any).__lc377;
}

export type WorldTile = { x: number; z: number; level: number };

export const DirectNavigator = {
    walk(dest: WorldTile): boolean {
        const r = abi()?.reader;
        const a = abi()?.actions;
        if (!r || !a) return false;
        const me = r.worldTile?.() as WorldTile | null;
        if (!me) return false;

        const clamped = {
            x: Math.max(me.x - 48, Math.min(me.x + 48, dest.x | 0)),
            z: Math.max(me.z - 48, Math.min(me.z + 48, dest.z | 0))
        };

        if (typeof a.walkWorld === 'function' && a.walkWorld(clamped.x, clamped.z)) {
            return true;
        }
        const local = r.toLocal?.(clamped.x, clamped.z);
        if (!local) return false;
        return !!a.walkTo?.(local.lx, local.lz);
    },

    async walkTo(dest: WorldTile, radius = 2, timeoutMs = 45_000): Promise<boolean> {
        const deadline = performance.now() + timeoutMs;
        while (performance.now() < deadline) {
            const me = abi()?.reader?.worldTile?.() as WorldTile | null;
            if (!me) return false;
            if (isArrived(me, dest, radius, Reachability.arrivalProbe())) return true;
            DirectNavigator.walk(dest);
            await Execution.delayTicks(2);
        }
        const me = abi()?.reader?.worldTile?.() as WorldTile | null;
        return !!me && isArrived(me, dest, radius, Reachability.arrivalProbe());
    }
};
