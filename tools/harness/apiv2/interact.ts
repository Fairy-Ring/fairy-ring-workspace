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

function npcOpIndex(action: string): number {
    if (/attack/i.test(action)) return 2;
    if (/talk/i.test(action)) return 1;
    return 0;
}

export function interactNpc(name: string, action = 'Talk-to'): SendResult {
    const now = readSnap();
    if (!now.attached) return { sent: false, tick: now.tick, reason: 'not-attached' };
    if (!now.ingame) return { sent: false, tick: now.tick, reason: 'not-ingame' };
    const want = String(name).toLowerCase();
    const pool = now.npcs.filter(n => String(n.name ?? '').toLowerCase() === want);
    const n =
        /attack/i.test(action) ? (pool.find(x => !x.inCombat) ?? pool[0]) : pool[0];
    if (!n) return { sent: false, tick: now.tick, reason: 'stale-target' };
    return interactNpcId(n.id, action);
}

/** Attack / Talk by pack id (Imp 708). attach has npcOp + attackNpc — not opNpc. */
export function interactNpcId(id: number, action = 'Talk-to'): SendResult {
    const now = readSnap();
    if (!now.attached) return { sent: false, tick: now.tick, reason: 'not-attached' };
    if (!now.ingame) return { sent: false, tick: now.tick, reason: 'not-ingame' };
    const pool = now.npcs.filter(n => n.id === (id | 0));
    if (!pool.length) return { sent: false, tick: now.tick, reason: 'stale-target' };
    const n = /attack/i.test(action) ? (pool.find(x => !x.inCombat) ?? pool[0]) : pool[0]!;
    const a = abi()?.actions;
    const op = npcOpIndex(action);
    let ok = false;
    if (op > 0) ok = !!a?.npcOp?.(n.index, op);
    if (!ok && /attack/i.test(action)) ok = !!a?.attackNpc?.(n.name);
    if (!ok && /talk/i.test(action)) ok = !!a?.talkNpc?.(n.name);
    if (!ok) return { sent: false, tick: now.tick, reason: 'driver-rejected' };
    return {
        sent: true,
        tick: tick(),
        command: { kind: 'op', target: { family: 'npc', id: n.id, name: n.name ?? undefined }, action }
    };
}

function groundMatches(g: { id: number; name: string | null }, match: number | string): boolean {
    if (typeof match === 'number') return g.id === match;
    return String(g.name ?? '')
        .toLowerCase()
        .includes(String(match).toLowerCase());
}

export function takeGround(match: number | string): SendResult {
    const now = readSnap();
    if (!now.attached) return { sent: false, tick: now.tick, reason: 'not-attached' };
    if (!now.ingame) return { sent: false, tick: now.tick, reason: 'not-ingame' };
    const hit = now.ground.find(g => groundMatches(g, match));
    if (!hit) return { sent: false, tick: now.tick, reason: 'stale-target' };
    const a = abi()?.actions;
    let ok = false;
    if (a?.takeObj) ok = !!a.takeObj(hit.lx, hit.lz, hit.id);
    if (!ok && hit.name) ok = !!a?.takeGround?.(hit.name);
    if (!ok) return { sent: false, tick: now.tick, reason: 'driver-rejected' };
    return {
        sent: true,
        tick: tick(),
        command: {
            kind: 'op',
            target: { family: 'obj', id: hit.id, name: hit.name ?? undefined, x: hit.x, z: hit.z, level: hit.level },
            action: 'Take'
        }
    };
}
