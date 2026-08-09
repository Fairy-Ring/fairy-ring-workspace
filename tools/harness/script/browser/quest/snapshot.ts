/**
 * Build {@link QuestSnapshot} from harness reader.
 * Prefer inv/tile/dialog; named varps only when transmit=yes on server.
 */
import { ChatDialog, Game, Inventory, reader } from '../api.ts';
import type { QuestSnapshot } from './types.ts';

/** Varp debugnames → pack IDs used by quest modules (extend carefully). */
export const KNOWN_VARPS: Record<string, number> = {
    /** Tai Bwo Wannai Trio main progress — transmit=yes */
    tbwt_main: 320,
    tbwt_tiadeche: 725,
    tbwt_tinsay: 726,
    tbwt_tamayu: 727,
    tbwt_lubufu: 728,
    tbwt_flags: 729,
    /** Jungle Potion — transmit */
    junglepotion: 175
};

export function takeSnapshot(extraVarps: Record<string, number> = {}): QuestSnapshot {
    const inv = new Map<string, number>();
    for (const it of Inventory.items()) {
        const n = it.name;
        if (!n) continue;
        inv.set(n, (inv.get(n) ?? 0) + it.count);
    }

    const varps: Record<string, number> = {};
    const ids = { ...KNOWN_VARPS, ...extraVarps };
    for (const [name, id] of Object.entries(ids)) {
        try {
            varps[name] = reader.varp(id) | 0;
        } catch {
            varps[name] = 0;
        }
    }

    const t = Game.tile();
    return {
        tile: t ? { x: t.x, z: t.z, level: t.level ?? 0 } : null,
        inv,
        varps,
        dialogOpen: ChatDialog.isOpen(),
        dialogOptions: ChatDialog.options()
    };
}
