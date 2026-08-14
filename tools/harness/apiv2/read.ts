// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

import type { ReadSnap, WorldTile } from './types.ts';

function abi(): Any {
    return (globalThis as Any).__lc377;
}

export function sceneReadyValue(): number {
    return 2;
}

export function readSnap(): ReadSnap {
    const a = abi();
    const r = a?.reader;
    const t = r?.worldTile?.();
    const tile: WorldTile | null = t
        ? { x: t.x | 0, z: t.z | 0, level: (t.level ?? 0) | 0 }
        : null;
    const inv = (r?.inventory?.() ?? []).map((it: Any) => ({
        id: it.id | 0,
        name: it.name ?? null,
        count: it.count | 0,
        slot: it.slot | 0
    }));
    const chat = (r?.chat?.(24) ?? []).map((c: Any) => String(c?.text ?? c ?? ''));
    const locs = (r?.locs?.({ maxDist: 16 }) ?? []).map((l: Any) => ({
        id: l.id | 0,
        name: l.name ?? null,
        x: l.x | 0,
        z: l.z | 0,
        level: (l.level ?? tile?.level ?? 0) | 0,
        ops: (l.ops ?? []) as (string | null)[]
    }));
    const npcs = (r?.npcs?.() ?? []).map((n: Any) => ({
        id: n.id | 0,
        name: n.name ?? null,
        x: (n.tile?.x ?? n.x) | 0,
        z: (n.tile?.z ?? n.z) | 0,
        level: (n.tile?.level ?? n.level ?? tile?.level ?? 0) | 0,
        index: n.index | 0,
        inCombat: !!n.inCombat
    }));
    const ground = (r?.groundItems?.({ maxDist: 24 }) ?? []).map((g: Any) => ({
        id: g.id | 0,
        name: g.name ?? null,
        count: (g.count | 0) || 1,
        x: (g.tile?.x ?? g.x ?? g.wx) | 0,
        z: (g.tile?.z ?? g.z ?? g.wz) | 0,
        level: (g.tile?.level ?? g.level ?? tile?.level ?? 0) | 0,
        lx: g.lx | 0,
        lz: g.lz | 0,
        ops: (g.ops ?? []) as (string | null)[]
    }));
    return {
        tick: (r?.loopCycle?.() ?? 0) | 0,
        attached: !!r,
        ingame: !!r?.ingame?.(),
        sceneState: (r?.sceneState?.() ?? 0) | 0,
        tile,
        inv,
        chat,
        locs,
        npcs,
        ground
    };
}
