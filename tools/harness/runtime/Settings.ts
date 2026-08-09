/**
 * SettingsStore for the 377 harness — port of rs2b0t Settings (MapPicker + slim Global).
 * localStorage/sessionStorage + `?Name.key=` URL overrides.
 */
import { WORLDMAP_KEY_NAMES } from '../ui/worldmapKeyNames.ts';

type SettingType = 'boolean' | 'number' | 'string' | 'string[]' | 'tile';

export interface SettingDef {
    type: SettingType;
    default: unknown;
    label?: string;
    min?: number;
    max?: number;
    help?: string;
    options?: string[];
    optionLabels?: Record<string, string>;
    group?: string;
    showIf?: { key: string; anyOf: string[] };
}

export function settingOptionLabel(def: SettingDef, value: string): string {
    const option = def.options?.find(candidate => candidate.toLowerCase() === value.trim().toLowerCase());
    return option === undefined ? value : (def.optionLabels?.[option] ?? option);
}

export type SettingsSchema = Record<string, SettingDef>;

export class SettingsBag {
    constructor(private readonly values: Record<string, unknown> = {}) {}

    bool(key: string, fallback = false): boolean {
        const v = this.values[key];
        return typeof v === 'boolean' ? v : fallback;
    }

    num(key: string, fallback = 0): number {
        const v = this.values[key];
        return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
    }

    str(key: string, fallback = ''): string {
        const v = this.values[key];
        return typeof v === 'string' ? v : fallback;
    }

    list(key: string, fallback: string[] = []): string[] {
        const v = this.values[key];
        return Array.isArray(v) ? (v as string[]) : fallback;
    }

    raw(): Record<string, unknown> {
        return { ...this.values };
    }
}

function clampNum(n: number, def: SettingDef): number {
    let v = n;
    if (def.min !== undefined) v = Math.max(def.min, v);
    if (def.max !== undefined) v = Math.min(def.max, v);
    return v;
}

function parseTile(raw: string): { x: number; z: number; level: number } | null {
    const parts = raw.split(',').map(s => Number(s.trim()));
    if (parts.length < 2 || parts.some(p => !Number.isFinite(p))) return null;
    return { x: parts[0]!, z: parts[1]!, level: parts[2] ?? 0 };
}

function parseValue(def: SettingDef, raw: string): unknown {
    switch (def.type) {
        case 'boolean': {
            const normalized = raw.trim().toLowerCase();
            return normalized === 'true' || normalized === '1' || normalized === 'yes';
        }
        case 'number': {
            const n = Number(raw);
            if (!Number.isFinite(n)) return def.default;
            return clampNum(n, def);
        }
        case 'string': {
            if (def.options && def.options.length > 0) {
                const wanted = raw.trim().toLowerCase();
                return def.options.find(o => o.toLowerCase() === wanted) ?? def.default;
            }
            return raw.trim();
        }
        case 'string[]': {
            const values = raw
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            if (!def.options || def.options.length === 0) return values;
            return values.flatMap(value => {
                const wanted = value.toLowerCase();
                const option = def.options!.find(candidate => candidate.toLowerCase() === wanted);
                return option === undefined ? [] : [option];
            });
        }
        case 'tile':
            return parseTile(raw) ?? def.default;
        default:
            return def.default;
    }
}

function settingToString(def: SettingDef, value: unknown): string {
    if (def.type === 'tile' && value && typeof value === 'object') {
        const t = value as { x: number; z: number; level?: number };
        return `${t.x},${t.z},${t.level ?? 0}`;
    }
    if (def.type === 'string[]' && Array.isArray(value)) {
        return (value as string[]).join(', ');
    }
    if (def.type === 'boolean') {
        return value ? 'true' : 'false';
    }
    return String(value);
}

function boxKey(suffix: string): string {
    if (typeof location === 'undefined') return `lc377:${suffix}`;
    const id = new URLSearchParams(location.search).get('box') ?? '';
    return id ? `lc377:${id}:${suffix}` : `lc377:${suffix}`;
}

/** Minimal Global schema (nav path / engine readers). */
export const GLOBAL_SETTINGS: SettingsSchema = {
    navEngine: {
        type: 'string',
        default: 'classic',
        options: ['classic', 'v2'],
        label: 'Nav engine',
        help: 'classic = collision pack only; v2 = tele/edge graph (when wired).'
    },
    showNavPath: {
        type: 'boolean',
        default: false,
        label: 'Show nav path'
    },
    navPathShowText: { type: 'boolean', default: true, label: 'Hop labels' },
    navPathTextSize: { type: 'number', default: 11, min: 8, max: 28, label: 'Hop label size' },
    navPathColorPath: { type: 'string', default: '#FF0000', label: 'Path colour' },
    navPathColorTransport: { type: 'string', default: '#00FF00', label: 'Transport colour' },
    navPathColorClick: { type: 'string', default: '#FFFFFF', label: 'Click target colour' },
    navPathColorText: { type: 'string', default: '#FFFFFF', label: 'Hop label colour' },
    navPathSceneExpand: { type: 'boolean', default: false, label: 'Scene-aware path expand' },
    navPathClientSegment: { type: 'boolean', default: false, label: 'Paint client walk trail' },
    navPathColorClient: { type: 'string', default: '#00D4FF', label: 'Client trail colour' },
    navPathColorClientRunAlt: { type: 'string', default: '#FFFF00', label: 'Client run alt colour' }
};

export const MAP_PICKER_SETTINGS_NS = 'MapPicker';

export const MAP_PICKER_SETTINGS: SettingsSchema = {
    showBasemap: {
        type: 'boolean',
        default: true,
        label: 'Show basemap',
        group: 'Display',
        help:
            'On (default): classic worldmap terrain + optional Key / multi / free layers. '
            + 'Off: collision-dot grid with named destination markers. '
            + 'Clicks always snap to nearest walkable tile either way.'
    },
    dotColor: {
        type: 'string',
        default: '#0a3d7a',
        label: 'Walkable colour',
        group: 'Display',
        showIf: { key: 'showBasemap', anyOf: ['false'] },
        help: 'HTML #RGB / #RRGGBB for walkable dots when basemap is off (default #0a3d7a).'
    },
    dotAlpha: {
        type: 'number',
        default: 0.85,
        min: 0.15,
        max: 1,
        label: 'Walkable opacity',
        group: 'Display',
        showIf: { key: 'showBasemap', anyOf: ['false'] },
        help: '0.15–1 (default 0.85). Only used when basemap is off.'
    },
    keyIconTypes: {
        type: 'string[]',
        default: [],
        options: [...WORLDMAP_KEY_NAMES],
        optionLabels: { '???': 'Unknown (Key ???)' },
        label: 'Key icons',
        group: 'Worldmap layers',
        showIf: { key: 'showBasemap', anyOf: ['true'] },
        help:
            'Which Key legend types to draw (Bank, Altar, Fishing Spot, …). '
            + 'Uses deploy overlays or live Rebuild sheets — toggle free, no extra rebuild. '
            + 'Default none = terrain only.'
    },
    showPlaceLabels: {
        type: 'boolean',
        default: false,
        label: 'Place names',
        group: 'Worldmap layers',
        showIf: { key: 'showBasemap', anyOf: ['true'] },
        help: 'Town / area names overlay (deploy pack or live Rebuild). Free — no rebuild.'
    },
    showMultiTint: {
        type: 'boolean',
        default: false,
        label: 'Multicombat areas',
        group: 'Worldmap layers',
        showIf: { key: 'showBasemap', anyOf: ['true'] },
        help: 'Red multicombat tint overlay. Free — no rebuild.'
    },
    showFreeTint: {
        type: 'boolean',
        default: false,
        label: 'Free-to-play areas',
        group: 'Worldmap layers',
        showIf: { key: 'showBasemap', anyOf: ['true'] },
        help: 'Green free-to-play tint overlay. Free — no rebuild.'
    },
    bakeLabels: {
        type: 'boolean',
        default: false,
        label: 'Stamp labels into rebuild',
        group: 'Basemap rebuild',
        showIf: { key: 'showBasemap', anyOf: ['true'] },
        help: 'Prefer Worldmap layers → Place names (pre-baked). Only for live Rebuild.'
    },
    bakeBorders: {
        type: 'boolean',
        default: false,
        label: 'Map-square borders',
        group: 'Basemap rebuild',
        showIf: { key: 'showBasemap', anyOf: ['true'] },
        help: '64×64 map-square grid when regenerating (dev).'
    },
    bakeNpcs: {
        type: 'boolean',
        default: false,
        label: 'NPC dots',
        group: 'Basemap rebuild',
        showIf: { key: 'showBasemap', anyOf: ['true'] },
        help: 'NPC positions when regenerating.'
    },
    bakeItems: {
        type: 'boolean',
        default: false,
        label: 'Item dots',
        group: 'Basemap rebuild',
        showIf: { key: 'showBasemap', anyOf: ['true'] },
        help: 'Ground-item positions when regenerating.'
    },
    bakeKeyIcons: {
        type: 'boolean',
        default: false,
        label: 'Stamp Key icons into rebuild',
        group: 'Basemap rebuild',
        showIf: { key: 'showBasemap', anyOf: ['true'] },
        help: 'Prefer Worldmap layers → Key icons (pre-baked per type).'
    },
    bakeMultimap: {
        type: 'boolean',
        default: false,
        label: 'Stamp multicombat into rebuild',
        group: 'Basemap rebuild',
        showIf: { key: 'showBasemap', anyOf: ['true'] },
        help: 'Prefer Worldmap layers → Multicombat areas (pre-baked).'
    },
    bakeFreemap: {
        type: 'boolean',
        default: false,
        label: 'Stamp free-to-play into rebuild',
        group: 'Basemap rebuild',
        showIf: { key: 'showBasemap', anyOf: ['true'] },
        help: 'Prefer Worldmap layers → Free-to-play areas (pre-baked).'
    },
    skipRebuildConfirm: {
        type: 'boolean',
        default: false,
        label: "Don't ask before rebuild",
        group: 'Basemap rebuild',
        showIf: { key: 'showBasemap', anyOf: ['true'] },
        help:
            'Rebuild map… re-runs MapView from worldmap.jag in a harness subclass (tab freezes). '
            + 'Everyday Key layers need no rebuild — use Worldmap layers toggles.'
    }
};

const hasSession = typeof sessionStorage !== 'undefined';
const hasLocal = typeof localStorage !== 'undefined';

function storageKey(name: string, key: string): string {
    return boxKey(`set:${name}:${key}`);
}

export type SettingChangeListener = (name: string, key: string, value: string) => void;

class SettingsStoreImpl {
    private urlParams: URLSearchParams | null =
        typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
    private changeListeners = new Set<SettingChangeListener>();

    private urlOverride(name: string, key: string): string | null {
        if (!this.urlParams) return null;
        const wanted = `${name}.${key}`.toLowerCase();
        for (const [k, v] of this.urlParams.entries()) {
            if (k.toLowerCase() === wanted) return v;
        }
        return null;
    }

    saved(name: string, key: string): string | undefined {
        if (hasSession) {
            const v = sessionStorage.getItem(storageKey(name, key));
            if (v !== null) return v;
        }
        if (hasLocal) {
            const v = localStorage.getItem(storageKey(name, key));
            if (v !== null) return v;
        }
        return undefined;
    }

    save(name: string, key: string, rawString: string): void {
        if (hasSession) sessionStorage.setItem(storageKey(name, key), rawString);
        if (hasLocal) localStorage.setItem(storageKey(name, key), rawString);
        for (const fn of this.changeListeners) {
            try {
                fn(name, key, rawString);
            } catch {
                /* ignore */
            }
        }
    }

    onChange(listener: SettingChangeListener): () => void {
        this.changeListeners.add(listener);
        return () => {
            this.changeListeners.delete(listener);
        };
    }

    isUrlOverride(name: string, key: string): boolean {
        return this.urlOverride(name, key) !== null;
    }

    clear(name: string, key: string): void {
        if (hasSession) sessionStorage.removeItem(storageKey(name, key));
        if (hasLocal) localStorage.removeItem(storageKey(name, key));
    }

    private winningRaw(name: string, key: string, def: SettingDef): { raw: string | null; def: SettingDef } {
        const url = this.urlOverride(name, key);
        if (url !== null) return { raw: url, def };
        const saved = this.saved(name, key);
        if (saved !== undefined) return { raw: saved, def };
        if (name !== 'Global' && key in GLOBAL_SETTINGS) {
            const gdef = GLOBAL_SETTINGS[key]!;
            const gurl = this.urlOverride('Global', key);
            if (gurl !== null) return { raw: gurl, def: gdef };
            const gsaved = this.saved('Global', key);
            if (gsaved !== undefined) return { raw: gsaved, def: gdef };
            return { raw: null, def: gdef };
        }
        return { raw: null, def };
    }

    displayString(name: string, key: string, def: SettingDef): string {
        const w = this.winningRaw(name, key, def);
        return w.raw !== null ? w.raw : settingToString(w.def, w.def.default);
    }

    resolve(name: string, schema: SettingsSchema): Record<string, unknown> {
        const out: Record<string, unknown> = {};
        for (const [key, def] of Object.entries(schema)) {
            const w = this.winningRaw(name, key, def);
            out[key] = w.raw !== null ? parseValue(w.def, w.raw) : w.def.default;
        }
        return out;
    }

    globalBag(): SettingsBag {
        return new SettingsBag(this.resolve('Global', GLOBAL_SETTINGS));
    }
}

export const SettingsStore = new SettingsStoreImpl();
