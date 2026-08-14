import type { Evidence, ReadSnap, WorldTile } from './types.ts';

export const CANNOT_REACH = "I can't reach that!";

export function arrived(tile: WorldTile, radius = 0): Evidence {
    return now => {
        const here = now.tile;
        if (!here || here.level !== (tile.level | 0)) return false;
        return Math.max(Math.abs(here.x - tile.x), Math.abs(here.z - tile.z)) <= radius;
    };
}

export function said(...phrases: string[]): Evidence {
    const want = phrases.map(p => p.trim().toLowerCase());
    return (now, before) => {
        const old = new Set(before.chat.map(t => String(t)));
        return now.chat.some(line => {
            const s = String(line);
            if (old.has(s)) return false;
            const low = s.toLowerCase();
            return want.some(p => low.includes(p));
        });
    };
}

export function itemDelta(match: number | string, change: number): Evidence {
    const total = (snap: ReadSnap): number =>
        snap.inv.reduce((n, it) => {
            const hit =
                typeof match === 'number'
                    ? it.id === match
                    : String(it.name ?? '')
                          .toLowerCase()
                          .includes(String(match).toLowerCase());
            return hit ? n + (it.count | 0) : n;
        }, 0);
    return (now, before) => {
        const moved = total(now) - total(before);
        return change >= 0 ? moved >= change : moved <= change;
    };
}

export function sceneReady(): Evidence {
    return now => now.sceneState === 2 && now.tile != null;
}

export function noTrigger(): Evidence {
    return said('No trigger for');
}

export function npcInCombat(id: number): Evidence {
    return now => now.npcs.some(n => n.id === (id | 0) && n.inCombat);
}

/** True when the count of this pack id in the scene drops (death or tele off-scene). */
export function npcCountDropped(id: number): Evidence {
    const n = (snap: ReadSnap) => snap.npcs.filter(x => x.id === (id | 0)).length;
    return (now, before) => n(now) < n(before);
}

export function groundAppeared(match: number | string | Array<number | string>): Evidence {
    const want = Array.isArray(match) ? match : [match];
    const count = (snap: ReadSnap, m: number | string): number =>
        snap.ground.reduce((acc, g) => {
            const hit =
                typeof m === 'number'
                    ? g.id === m
                    : String(g.name ?? '')
                          .toLowerCase()
                          .includes(String(m).toLowerCase());
            return hit ? acc + (g.count | 0) : acc;
        }, 0);
    return (now, before) => want.some(m => count(now, m) > count(before, m));
}
