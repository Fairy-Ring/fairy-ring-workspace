// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

import { readSnap, sceneReadyValue } from './read.ts';
import type { SendResult, WorldTile } from './types.ts';

function abi(): Any {
    return (globalThis as Any).__lc377;
}

function tick(): number {
    return readSnap().tick;
}

export function walk(tile: WorldTile): SendResult {
    const now = readSnap();
    if (!now.attached) return { sent: false, tick: now.tick, reason: 'not-attached' };
    if (!now.ingame) return { sent: false, tick: now.tick, reason: 'not-ingame' };
    if (now.sceneState !== sceneReadyValue()) {
        return { sent: false, tick: now.tick, reason: 'scene-unavailable' };
    }
    const r = abi()?.reader;
    const a = abi()?.actions;
    const local = r?.toLocal?.(tile.x, tile.z);
    if (!local) return { sent: false, tick: now.tick, reason: 'off-scene' };
    if (now.tile && now.tile.level !== (tile.level | 0)) {
        return { sent: false, tick: now.tick, reason: 'level-mismatch' };
    }
    const ok = a?.walkWorld ? !!a.walkWorld(tile.x, tile.z) : !!a?.walkTo?.(local.lx, local.lz);
    if (!ok) return { sent: false, tick: now.tick, reason: 'unreachable' };
    return { sent: true, tick: tick(), command: { kind: 'walk', tile } };
}

export function interactLoc(x: number, z: number, action: string): SendResult {
    const now = readSnap();
    if (!now.attached) return { sent: false, tick: now.tick, reason: 'not-attached' };
    if (!now.ingame) return { sent: false, tick: now.tick, reason: 'not-ingame' };
    const a = abi()?.actions;
    const loc = now.locs.find(l => l.x === x && l.z === z);
    const label = String(action);
    if (loc && !(loc.ops ?? []).some(o => String(o ?? '').toLowerCase() === label.toLowerCase())) {
        return { sent: false, tick: now.tick, reason: 'invalid-action' };
    }
    const ok = !!(a?.opLocAt?.(x, z, action) || (loc && a?.opLoc?.(loc, action)));
    if (!ok) return { sent: false, tick: now.tick, reason: 'driver-rejected' };
    return {
        sent: true,
        tick: tick(),
        command: { kind: 'op', target: { family: 'loc', x, z, level: loc?.level }, action }
    };
}

export function interactNpc(name: string, action = 'Talk-to'): SendResult {
    const now = readSnap();
    if (!now.attached) return { sent: false, tick: now.tick, reason: 'not-attached' };
    if (!now.ingame) return { sent: false, tick: now.tick, reason: 'not-ingame' };
    const a = abi()?.actions;
    const ok =
        /talk/i.test(action) ? !!a?.talkNpc?.(name) : !!a?.opNpc?.(name, action);
    if (!ok) return { sent: false, tick: now.tick, reason: 'driver-rejected' };
    return {
        sent: true,
        tick: tick(),
        command: { kind: 'op', target: { family: 'npc', name }, action }
    };
}
