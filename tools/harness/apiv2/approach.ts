/**
 * Walk to an NPC, opening pack doors on the way (Decision 015 / PR 604).
 * Talk/Attack still send immediately — call this first when a wall is between you.
 */
import { readSnap } from './read.ts';
import { travelTo, type TravelOutcome } from './travel.ts';

export type ApproachOutcome = TravelOutcome | { kind: 'stale-target' } | { kind: 'already'; at: NonNullable<ReturnType<typeof readSnap>['tile']> };

export async function approachNpcId(id: number, radius = 1): Promise<ApproachOutcome> {
    const now = readSnap();
    const n = now.npcs.find(x => x.id === (id | 0));
    if (!n) return { kind: 'stale-target' };
    const here = now.tile;
    if (
        here &&
        here.level === n.level &&
        Math.max(Math.abs(here.x - n.x), Math.abs(here.z - n.z)) <= radius
    ) {
        return { kind: 'already', at: here };
    }
    return travelTo({ x: n.x, z: n.z, level: n.level }, { radius });
}
