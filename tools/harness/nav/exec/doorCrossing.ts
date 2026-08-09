/**
 * Multi-tile door / gate crossing + stall nearby-door open —
 * port of rs2b0t exec/doorCrossing.ts (harness ABI).
 */

import {
    Execution,
    Inventory,
    Locs,
    type Loc
} from '../../script/browser/api.ts';
import { Reachability } from '../browser/Reachability.ts';
import { DirectNavigator } from '../browser/DirectNavigator.ts';
import { CANT_REACH, GameMessages } from '../shims/GameMessages.ts';
import {
    chooseCrossClick,
    isOnFarSide,
    shouldApproachClosedBarrier
} from '../followMath.ts';
import type { TransportInfo } from '../PathFinder.ts';
import { findTransportLoc, interactTransportLoc } from './transportLoc.ts';
import { chatShowsQuestLock, dismissQuestLockDialogue } from './questLock.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const MULTI_DOOR_CROSS_MS = 36_000;
const OPEN_WAIT_MS = 4000;
const APPROACH_WALK_MS = 3000;
const SCENE_STEP_MS = 8000;

export interface PathStepTile {
    x: number;
    z: number;
    level: number;
    transport?: TransportInfo;
}

function worldTile(): { x: number; z: number; level: number } | null {
    return ((globalThis as Any).__lc377?.reader?.worldTile?.() as {
        x: number;
        z: number;
        level: number;
    } | null) ?? null;
}

function toLocal(x: number, z: number): { lx: number; lz: number } | null {
    return ((globalThis as Any).__lc377?.reader?.toLocal?.(x, z) as {
        lx: number;
        lz: number;
    } | null) ?? null;
}

export function isOpenableBarrier(name: string | null, ops: readonly (string | null)[]): boolean {
    return /(door|gate)/i.test(name ?? '') && ops.some(op => op !== null && /^open/i.test(op));
}

export function isOpenBarrierLeaf(name: string | null, ops: readonly (string | null)[]): boolean {
    return /(door|gate)/i.test(name ?? '') && ops.some(op => op !== null && /^close/i.test(op));
}

export function noteFailedDoor(
    step: PathStepTile,
    doorStrikes: Map<string, number>,
    avoidDoors: { x: number; z: number }[]
): void {
    const t = step.transport;
    if (!t) return;
    const key = `${t.locX}|${t.locZ}`;
    const strikes = (doorStrikes.get(key) ?? 0) + 1;
    doorStrikes.set(key, strikes);
    if (strikes >= 2) {
        avoidDoors.push({ x: t.locX, z: t.locZ });
    }
}

export interface PathDoorHint {
    tiles: readonly { x: number; z: number; level: number }[];
    pathIdx: number;
    corridor?: number;
    window?: number;
}

export function pickNearbyDoorTile(
    candidates: readonly { x: number; z: number; level: number }[],
    me: { x: number; z: number; level: number },
    path?: PathDoorHint | null
): { x: number; z: number; level: number } | null {
    if (candidates.length === 0) return null;
    const corridor = path?.corridor ?? 2;
    const window = path?.window ?? 12;
    let best: { x: number; z: number; level: number } | null = null;
    let bestScore = -Infinity;

    for (const c of candidates) {
        if (c.level !== me.level) continue;
        const distMe = Math.max(Math.abs(c.x - me.x), Math.abs(c.z - me.z));
        let score = -distMe;
        if (path && path.tiles.length > 0) {
            const lo = Math.max(0, path.pathIdx);
            const hi = Math.min(path.tiles.length - 1, path.pathIdx + window);
            let onPath = false;
            let pathDist = 999;
            for (let i = lo; i <= hi; i++) {
                const t = path.tiles[i]!;
                if (t.level !== c.level) continue;
                const d = Math.max(Math.abs(c.x - t.x), Math.abs(c.z - t.z));
                if (d < pathDist) pathDist = d;
                if (d <= corridor) onPath = true;
            }
            if (onPath) score = 1000 - pathDist - distMe * 0.01;
            else score = -100 - distMe;
        }
        if (score > bestScore) {
            bestScore = score;
            best = c;
        }
    }
    return best;
}

export async function tryNearbyDoor(
    log: (msg: string) => void,
    path?: PathDoorHint | null
): Promise<boolean> {
    const me = worldTile();
    if (!me) return false;
    const candidates = Locs.query()
        .where(l => isOpenableBarrier(l.name, l.actions()))
        .within(3)
        .results();
    if (candidates.length === 0) return false;
    const pick = pickNearbyDoorTile(
        candidates.map(l => {
            const t = l.tile();
            return { x: t.x, z: t.z, level: me.level };
        }),
        me,
        path
    );
    const door: Loc | null =
        pick === null
            ? null
            : candidates.find(l => {
                  const t = l.tile();
                  return t.x === pick.x && t.z === pick.z;
              }) ?? null;
    if (!door) return false;

    const op = door.actions().find(a => /^open/i.test(a));
    const t = door.tile();
    const scoped = path && path.tiles.length > 0 ? ' (path-scoped)' : '';
    log(`stalled next to closed '${door.name}' at (${t.x},${t.z})${scoped} — opening it`);
    if (!op || !(await door.interact(op))) return false;
    const opened = await Execution.delayUntil(() => {
        const cur = Locs.query()
            .where(
                l =>
                    l.tile().x === t.x &&
                    l.tile().z === t.z &&
                    (l.name ?? '') === (door.name ?? '') &&
                    isOpenableBarrier(l.name, l.actions())
            )
            .nearest();
        return cur === null || Reachability.canReach(t as Any, { maxSteps: 200, adjacentOk: true });
    }, 5000);

    if (!opened && chatShowsQuestLock()) {
        await dismissQuestLockDialogue();
        return false;
    }
    return opened;
}

export function questLockDoorTileNearPlayer(): { x: number; z: number } | null {
    if (!chatShowsQuestLock()) return null;
    const door = Locs.query()
        .where(l => /(door|gate)/i.test(l.name ?? ''))
        .within(3)
        .nearest();
    if (!door) return null;
    const t = door.tile();
    return { x: t.x, z: t.z };
}

export function barrierLooksOpen(transport: TransportInfo): boolean {
    return findTransportLoc(transport) === null;
}

export async function crossMultiTileDoor(
    approach: PathStepTile,
    step: PathStepTile,
    transport: TransportInfo,
    log: (msg: string) => void,
    onQuestLock?: (x: number, z: number) => void
): Promise<boolean> {
    const dir = { x: Math.sign(step.x - approach.x), z: Math.sign(step.z - approach.z) };
    const landing = { x: step.x + dir.x, z: step.z + dir.z, level: step.level };

    if (barrierLooksOpen(transport)) {
        const here0 = worldTile();
        if (isOnFarSide(here0, approach, step)) {
            log(`crossed '${transport.locName}' at (${transport.locX},${transport.locZ}) (already past)`);
            return true;
        }
        const passage =
            Reachability.canStep(approach, step) ||
            Reachability.canReach(step, { maxSteps: 64, adjacentOk: true });
        if (passage) {
            log(`${transport.locName} at (${transport.locX},${transport.locZ}) already open — continuing`);
            if (
                here0 &&
                here0.level === approach.level &&
                here0.x === approach.x &&
                here0.z === approach.z
            ) {
                DirectNavigator.walk(step);
                await Execution.delayUntil(() => isOnFarSide(worldTile(), approach, step), 2500);
                if (isOnFarSide(worldTile(), approach, step)) {
                    log(`crossed '${transport.locName}' at (${transport.locX},${transport.locZ})`);
                    return true;
                }
            }
            return true;
        }
        log(`${transport.locName} open-loc missing but edge blocked — scene-stepping`);
    }

    const deadline = performance.now() + MULTI_DOOR_CROSS_MS;
    while (performance.now() < deadline) {
        const here = worldTile();
        if (isOnFarSide(here, approach, step)) {
            log(`crossed '${transport.locName}' at (${transport.locX},${transport.locZ})`);
            return true;
        }
        const shut = findTransportLoc(transport);
        if (shouldApproachClosedBarrier(here, approach, shut !== null)) {
            DirectNavigator.walk(approach);
            await Execution.delayUntil(() => {
                const p = worldTile();
                return p !== null && p.x === approach.x && p.z === approach.z && p.level === approach.level;
            }, APPROACH_WALK_MS);
            continue;
        }
        if (shut) {
            const mark = GameMessages.mark();
            const p0 = worldTile();
            if (
                p0 &&
                (p0.x !== approach.x || p0.z !== approach.z || p0.level !== approach.level) &&
                Math.max(Math.abs(p0.x - approach.x), Math.abs(p0.z - approach.z)) <= 4
            ) {
                DirectNavigator.walk(approach);
                await Execution.delayUntil(() => {
                    const p = worldTile();
                    return p !== null && p.x === approach.x && p.z === approach.z && p.level === approach.level;
                }, APPROACH_WALK_MS);
            }
            const knife = transport.action === 'Slash' ? Inventory.first('Knife') : null;
            if (knife !== null) {
                log(`using the ${knife.name} on ${transport.locName} at (${transport.locX},${transport.locZ})`);
            }
            const sent =
                knife !== null
                    ? await Promise.resolve(knife.useOn(shut))
                    : interactTransportLoc(shut, transport.action);
            if (!sent) {
                log(
                    `'${transport.action}' not offered by ${transport.locName} (ops: ${shut.actions().join(', ')})`
                );
                return false;
            }
            await Execution.delayUntil(
                () =>
                    findTransportLoc(transport) === null ||
                    Reachability.canStep(approach, step) ||
                    GameMessages.sawSince(mark, CANT_REACH) ||
                    chatShowsQuestLock(),
                OPEN_WAIT_MS
            );
            if (GameMessages.sawSince(mark, CANT_REACH)) {
                log(`server says can't reach ${transport.locName} — repathing`);
                return false;
            }
            if (chatShowsQuestLock()) {
                log(`quest-locked '${transport.locName}' at (${transport.locX},${transport.locZ}) — blacklisting`);
                await dismissQuestLockDialogue();
                onQuestLock?.(transport.locX, transport.locZ);
                return false;
            }
            await Execution.delayTicks(1);
            DirectNavigator.walk(step);
            await Execution.delayUntil(() => isOnFarSide(worldTile(), approach, step), 4000);
            continue;
        }
        const canStepEdge = Reachability.canStep(approach, step);
        const landingLocal = toLocal(landing.x, landing.z);
        const canReachLanding = landingLocal !== null && Reachability.canReach(landing, { maxSteps: 128 });
        const choice = chooseCrossClick(canStepEdge, canReachLanding);
        if (choice === 'step') {
            DirectNavigator.walk(step);
            await Execution.delayUntil(() => isOnFarSide(worldTile(), approach, step), 3000);
        } else if (choice === 'landing-click' && landingLocal) {
            const a = (globalThis as Any).__lc377?.actions;
            a?.walkTo?.(landingLocal.lx, landingLocal.lz);
            await Execution.delayTicks(2);
        } else {
            log(`leaf blocks landing — scene-stepping through '${transport.locName}'`);
            DirectNavigator.walk(landing);
            await Execution.delayUntil(() => isOnFarSide(worldTile(), approach, step), SCENE_STEP_MS);
        }
    }
    if (chatShowsQuestLock()) {
        log(`quest-locked '${transport.locName}' at (${transport.locX},${transport.locZ}) — blacklisting`);
        await dismissQuestLockDialogue();
        onQuestLock?.(transport.locX, transport.locZ);
    }
    log(`${transport.locName} at (${transport.locX},${transport.locZ}) did not cross in time, repathing`);
    return false;
}

