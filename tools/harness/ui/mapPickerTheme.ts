/**
 * Map picker display theme — SettingsStore namespace `MapPicker`.
 * Port of rs2b0t mapPickerTheme (parseHtmlColor from pathPaintTheme).
 */
import { parseHtmlColor, rgba } from '../nav/pathPaintTheme.ts';
import { WORLDMAP_KEY_NAMES } from './worldmapKeyNames.ts';
import {
    MAP_PICKER_SETTINGS,
    MAP_PICKER_SETTINGS_NS,
    SettingsBag,
    SettingsStore
} from '../runtime/Settings.ts';

export const MAP_PICKER_DOT_DEFAULT = '#0a3d7a';
export const MAP_PICKER_DOT_ALPHA_DEFAULT = 0.85;

export const MAP_PICKER_BASEMAP_KEY = 'showBasemap';
export const MAP_PICKER_COLOR_KEY = 'dotColor';
export const MAP_PICKER_ALPHA_KEY = 'dotAlpha';
export const MAP_PICKER_KEY_TYPES_KEY = 'keyIconTypes';
export const MAP_PICKER_LABELS_KEY = 'showPlaceLabels';
export const MAP_PICKER_MULTI_KEY = 'showMultiTint';
export const MAP_PICKER_FREE_KEY = 'showFreeTint';

export type MapPickerDotTheme = {
    showBasemap: boolean;
    showWalkable: boolean;
    keyIconTypes: string[];
    showPlaceLabels: boolean;
    showMultiTint: boolean;
    showFreeTint: boolean;
    fill: string;
    colorRaw: string;
    alpha: number;
};

function mapPickerBag(): SettingsBag {
    return new SettingsBag(SettingsStore.resolve(MAP_PICKER_SETTINGS_NS, MAP_PICKER_SETTINGS));
}

export function getMapPickerShowBasemap(): boolean {
    return mapPickerBag().bool(MAP_PICKER_BASEMAP_KEY, true);
}

export function setMapPickerShowBasemap(show: boolean): void {
    SettingsStore.save(MAP_PICKER_SETTINGS_NS, MAP_PICKER_BASEMAP_KEY, show ? 'true' : 'false');
}

export function getMapPickerKeyIconTypes(): string[] {
    const list = mapPickerBag().list(MAP_PICKER_KEY_TYPES_KEY, []);
    const allowed = new Set(WORLDMAP_KEY_NAMES.map(n => n.toLowerCase()));
    return list.filter(n => allowed.has(n.toLowerCase()));
}

export function keyNameToTypeId(name: string): number | null {
    const wanted = name.trim().toLowerCase();
    const i = WORLDMAP_KEY_NAMES.findIndex(n => n.toLowerCase() === wanted);
    return i >= 0 ? i : null;
}

export function resolveMapPickerDotTheme(): MapPickerDotTheme {
    const g = mapPickerBag();
    const showBasemap = g.bool(MAP_PICKER_BASEMAP_KEY, true);
    const showWalkable = !showBasemap;
    const colorRaw = g.str(MAP_PICKER_COLOR_KEY, MAP_PICKER_DOT_DEFAULT);
    const alpha = g.num(MAP_PICKER_ALPHA_KEY, MAP_PICKER_DOT_ALPHA_DEFAULT);
    const rgb = parseHtmlColor(colorRaw, MAP_PICKER_DOT_DEFAULT);
    return {
        showBasemap,
        showWalkable,
        keyIconTypes: getMapPickerKeyIconTypes(),
        showPlaceLabels: g.bool(MAP_PICKER_LABELS_KEY, false),
        showMultiTint: g.bool(MAP_PICKER_MULTI_KEY, false),
        showFreeTint: g.bool(MAP_PICKER_FREE_KEY, false),
        fill: rgba(rgb, alpha),
        colorRaw,
        alpha
    };
}

export function isMapPickerThemeSettingKey(key: string): boolean {
    return (
        key === MAP_PICKER_BASEMAP_KEY ||
        key === MAP_PICKER_COLOR_KEY ||
        key === MAP_PICKER_ALPHA_KEY ||
        key === MAP_PICKER_KEY_TYPES_KEY ||
        key === MAP_PICKER_LABELS_KEY ||
        key === MAP_PICKER_MULTI_KEY ||
        key === MAP_PICKER_FREE_KEY
    );
}
