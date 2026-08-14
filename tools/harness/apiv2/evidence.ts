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
