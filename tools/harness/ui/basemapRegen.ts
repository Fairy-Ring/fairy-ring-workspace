/**
 * Manual basemap rebuild for the map picker (user clicks Rebuild + confirms).
 *
 * Uses pure Client-TS MapView **read-only** (dynamic import) — no pure-client edits.
 * Harness LiveBakeMapView subclasses MapView so we never enter GameShell's frame loop
 * or steal the live game canvas event handlers.
 *
 * 377 MapView always stamps Key icons in renderWorldMap; we zero `locMapfunction`
 * when bake prefs want terrain without keys (no pure-client flag needed).
 *
 * Not called on picker open — only from Rebuild button.
 */
import {
    MAP_PICKER_SETTINGS,
    MAP_PICKER_SETTINGS_NS,
    SettingsBag,
    SettingsStore
} from '../runtime/Settings.ts';
import {
    BASEMAP_SCHEMA,
    DEFAULT_MAP_ORIGIN,
    DEFAULT_MAP_SIZE,
    type BasemapManifest
} from './worldMapBasemap.ts';

export type BasemapBakePrefs = {
    labels: boolean;
    borders: boolean;
    npcs: boolean;
    items: boolean;
    /** Stamp Key icons into live Rebuild raster (prefer pre-baked overlay for day-to-day). */
    keyIcons: boolean;
    multimap: boolean;
    freemap: boolean;
};

export type RegeneratedBasemap = {
    manifest: BasemapManifest;
    /** Terrain raster (no free-toggle layers unless bake-stamped). */
    image: CanvasImageSource;
    /** Free toggles — same origin/size as terrain (1 ppt). */
    multiOverlay?: CanvasImageSource;
    freeOverlay?: CanvasImageSource;
    labelsOverlay?: CanvasImageSource;
    keyOverlay?: CanvasImageSource;
    keyTypeOverlays?: Map<string, CanvasImageSource>;
    /** Non-zero RGB samples (sanity — blank bakes mean Pix2D never wrote). */
    nonzeroSamples: number;
};

export type BasemapRegenProgress = (msg: string) => void;

let pendingJag: Uint8Array | null = null;
/** Serialize regenerates so only one MapView bake runs at a time. */
let regenTail: Promise<unknown> = Promise.resolve();
/** Bumped on each successful live rebuild so in-flight deploy loads cannot clobber it. */
let liveBasemapGeneration = 0;

export function getLiveBasemapGeneration(): number {
    return liveBasemapGeneration;
}

export const DEFAULT_BASEMAP_BAKE_PREFS: BasemapBakePrefs = {
    labels: false,
    borders: false,
    npcs: false,
    items: false,
    keyIcons: false,
    multimap: false,
    freemap: false
};

export const MAP_PICKER_BAKE_KEYS = [
    'bakeLabels',
    'bakeBorders',
    'bakeNpcs',
    'bakeItems',
    'bakeKeyIcons',
    'bakeMultimap',
    'bakeFreemap'
] as const;

export type MapPickerBakeKey = (typeof MAP_PICKER_BAKE_KEYS)[number];

export function resolveBasemapBakePrefs(): BasemapBakePrefs {
    const g = new SettingsBag(SettingsStore.resolve(MAP_PICKER_SETTINGS_NS, MAP_PICKER_SETTINGS));
    return {
        labels: g.bool('bakeLabels', DEFAULT_BASEMAP_BAKE_PREFS.labels),
        borders: g.bool('bakeBorders', DEFAULT_BASEMAP_BAKE_PREFS.borders),
        npcs: g.bool('bakeNpcs', DEFAULT_BASEMAP_BAKE_PREFS.npcs),
        items: g.bool('bakeItems', DEFAULT_BASEMAP_BAKE_PREFS.items),
        keyIcons: g.bool('bakeKeyIcons', DEFAULT_BASEMAP_BAKE_PREFS.keyIcons),
        multimap: g.bool('bakeMultimap', DEFAULT_BASEMAP_BAKE_PREFS.multimap),
        freemap: g.bool('bakeFreemap', DEFAULT_BASEMAP_BAKE_PREFS.freemap)
    };
}

export function snapshotMapPickerBakeSettings(): Record<MapPickerBakeKey, string> {
    const out = {} as Record<MapPickerBakeKey, string>;
    for (const key of MAP_PICKER_BAKE_KEYS) {
        const def = MAP_PICKER_SETTINGS[key];
        out[key] = SettingsStore.displayString(MAP_PICKER_SETTINGS_NS, key, def!);
    }
    return out;
}

export function restoreMapPickerBakeSettings(snap: Record<MapPickerBakeKey, string>): void {
    for (const key of MAP_PICKER_BAKE_KEYS) {
        const raw = snap[key];
        if (raw !== undefined) {
            SettingsStore.save(MAP_PICKER_SETTINGS_NS, key, raw);
        }
    }
}

export function prefsFingerprint(prefs: BasemapBakePrefs): string {
    const bits = [
        prefs.labels ? 'L' : 'l',
        prefs.borders ? 'B' : 'b',
        prefs.npcs ? 'N' : 'n',
        prefs.items ? 'I' : 'i',
        prefs.keyIcons ? 'K' : 'k',
        prefs.multimap ? 'M' : 'm',
        prefs.freemap ? 'F' : 'f'
    ].join('');
    return bits;
}

async function fetchWorldmapJag(): Promise<Uint8Array> {
    const candidates: string[] = [];
    if (typeof location !== 'undefined') {
        candidates.push(new URL('/harness/worldmap.jag', location.origin).href);
        candidates.push(new URL('/worldmap.jag', location.origin).href);
        candidates.push(new URL('./worldmap.jag', location.href).href);
    }
    let lastErr = 'worldmap.jag not found';
    for (const url of candidates) {
        try {
            const res = await fetch(url);
            if (!res.ok) {
                lastErr = `${url} HTTP ${res.status}`;
                continue;
            }
            return new Uint8Array(await res.arrayBuffer());
        } catch (e) {
            lastErr = e instanceof Error ? e.message : String(e);
        }
    }
    throw new Error(
        `Could not load worldmap.jag (${lastErr}). Deploy /harness/worldmap.jag via build-client.mjs.`
    );
}

function countNonzero(pixels: Int32Array, step = 64): number {
    let n = 0;
    for (let i = 0; i < pixels.length; i += step) {
        if ((pixels[i] >>> 0) !== 0) n++;
    }
    return n;
}

/** Pix2D RGB → canvas (prefer canvas over ImageBitmap for reliable drawImage). */
function pix2dToCanvas(pixels: Int32Array, width: number, height: number): HTMLCanvasElement {
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < pixels.length; i++) {
        const p = pixels[i] >>> 0;
        const o = i * 4;
        rgba[o] = (p >> 16) & 0xff;
        rgba[o + 1] = (p >> 8) & 0xff;
        rgba[o + 2] = p & 0xff;
        rgba[o + 3] = 0xff;
    }
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    c.getContext('2d')!.putImageData(new ImageData(rgba, width, height), 0, 0);
    return c;
}

function rgbaToCanvas(rgba: Uint8ClampedArray, width: number, height: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    c.getContext('2d')!.putImageData(new ImageData(rgba, width, height), 0, 0);
    return c;
}

/** Multicombat / free-to-play tint sheets (MapView fillRectTrans colours @ α≈96). */
function tintGridToCanvas(
    grid: boolean[][] | undefined,
    width: number,
    height: number,
    r: number,
    g: number,
    b: number,
    a: number
): HTMLCanvasElement | undefined {
    if (!grid?.length) return undefined;
    const rgba = new Uint8ClampedArray(width * height * 4);
    let any = false;
    for (let x = 0; x < width; x++) {
        const col = grid[x];
        if (!col) continue;
        for (let y = 0; y < height; y++) {
            if (!col[y]) continue;
            const o = (y * width + x) * 4;
            rgba[o] = r;
            rgba[o + 1] = g;
            rgba[o + 2] = b;
            rgba[o + 3] = a;
            any = true;
        }
    }
    return any ? rgbaToCanvas(rgba, width, height) : undefined;
}

type SpriteLike = {
    data: Int32Array;
    wi: number;
    hi: number;
    xof: number;
    yof: number;
};

function blitSpriteRgba(
    rgba: Uint8ClampedArray,
    mapW: number,
    mapH: number,
    sprite: SpriteLike,
    destX: number,
    destY: number
): void {
    const x0 = (destX + sprite.xof) | 0;
    const y0 = (destY + sprite.yof) | 0;
    for (let sy = 0; sy < sprite.hi; sy++) {
        const dy = y0 + sy;
        if (dy < 0 || dy >= mapH) continue;
        for (let sx = 0; sx < sprite.wi; sx++) {
            const dx = x0 + sx;
            if (dx < 0 || dx >= mapW) continue;
            const rgb = sprite.data[sy * sprite.wi + sx] >>> 0;
            if (rgb === 0) continue;
            const o = (dy * mapW + dx) * 4;
            rgba[o] = (rgb >> 16) & 0xff;
            rgba[o + 1] = (rgb >> 8) & 0xff;
            rgba[o + 2] = rgb & 0xff;
            rgba[o + 3] = 0xff;
        }
    }
}

/**
 * Per-type Key icon overlays + composite from locMapfunction (1 ppt).
 * Type id string matches deploy keyTypeOverlayUrls keys.
 */
function buildKeyOverlays(
    view: {
        mapWidth: number;
        mapHeight: number;
        locMapfunction: number[][];
        mapfunction: Array<SpriteLike | undefined | null>;
    },
    width: number,
    height: number
): { composite?: HTMLCanvasElement; perType?: Map<string, HTMLCanvasElement> } {
    const compositeRgba = new Uint8ClampedArray(width * height * 4);
    const typeRgba = new Map<string, Uint8ClampedArray>();
    let any = false;
    for (let x = 0; x < width; x++) {
        const col = view.locMapfunction[x];
        if (!col) continue;
        for (let y = 0; y < height; y++) {
            const mf = col[y] | 0;
            if (mf === 0) continue;
            const type = mf - 1;
            const sprite = view.mapfunction[type];
            if (!sprite?.data) continue;
            const key = String(type);
            let sheet = typeRgba.get(key);
            if (!sheet) {
                sheet = new Uint8ClampedArray(width * height * 4);
                typeRgba.set(key, sheet);
            }
            // 1ppt: tile top-left (x,y); MapView centres with length/2 → 0 for 1px tiles.
            blitSpriteRgba(compositeRgba, width, height, sprite, x - 7, y - 7);
            blitSpriteRgba(sheet, width, height, sprite, x - 7, y - 7);
            any = true;
        }
    }
    if (!any) return {};
    const perType = new Map<string, HTMLCanvasElement>();
    for (const [k, rgba] of typeRgba) {
        perType.set(k, rgbaToCanvas(rgba, width, height));
    }
    return { composite: rgbaToCanvas(compositeRgba, width, height), perType };
}

function labelsDiffToCanvas(
    terrain: Int32Array,
    labeled: Int32Array,
    width: number,
    height: number
): HTMLCanvasElement | undefined {
    const rgba = new Uint8ClampedArray(width * height * 4);
    let any = false;
    for (let i = 0; i < terrain.length; i++) {
        const a = terrain[i] >>> 0;
        const b = labeled[i] >>> 0;
        if (a === b) continue;
        const o = i * 4;
        rgba[o] = (b >> 16) & 0xff;
        rgba[o + 1] = (b >> 8) & 0xff;
        rgba[o + 2] = b & 0xff;
        rgba[o + 3] = 0xff;
        any = true;
    }
    return any ? rgbaToCanvas(rgba, width, height) : undefined;
}

/**
 * 377 MapView always plots Key icons. Zero placements so terrain bake stays clean
 * without patching pure client (no shouldDrawMapfunctions in stock 377).
 */
function clearKeyPlacements(view: {
    mapWidth: number;
    mapHeight: number;
    locMapfunction: number[][];
}): void {
    for (let x = 0; x < view.mapWidth; x++) {
        const col = view.locMapfunction[x];
        if (!col) continue;
        for (let z = 0; z < view.mapHeight; z++) {
            col[z] = 0;
        }
    }
}

export function regenerateBasemap(
    prefs: BasemapBakePrefs = resolveBasemapBakePrefs(),
    onProgress?: BasemapRegenProgress
): Promise<RegeneratedBasemap> {
    const run = (): Promise<RegeneratedBasemap> => regenerateBasemapOnce(prefs, onProgress);
    const next = regenTail.then(run, run);
    regenTail = next.then(
        () => undefined,
        () => undefined
    );
    return next;
}

async function regenerateBasemapOnce(
    prefs: BasemapBakePrefs,
    onProgress?: BasemapRegenProgress
): Promise<RegeneratedBasemap> {
    const progress = (m: string): void => {
        try {
            onProgress?.(m);
        } catch {
            /* ignore */
        }
    };

    progress('fetching worldmap.jag…');
    const jag = await fetchWorldmapJag();
    pendingJag = jag;

    progress('loading MapView…');
    // Pure client modules — resolved via harness build #/ plugin; relative for clarity.
    const { canvas, canvas2d } = await import('../../../vendor/client-ts/src/graphics/Canvas.ts');
    const { sleep } = await import('../../../vendor/client-ts/src/util/JsUtil.ts');
    const { MapView } = await import('../../../vendor/client-ts/src/mapview/MapView.ts');
    const JagFile = (await import('../../../vendor/client-ts/src/io/JagFile.ts')).default;
    const PixMap = (await import('../../../vendor/client-ts/src/graphics/PixMap.ts')).default;

    // Offscreen 2d for bake PixMaps — avoid createImageData(mapW,mapH) on the game canvas.
    const bakeCanvas = document.createElement('canvas');
    bakeCanvas.width = 64;
    bakeCanvas.height = 64;
    const bakeCtx = bakeCanvas.getContext('2d', { alpha: false });
    if (!bakeCtx) {
        throw new Error('2d context unavailable for basemap bake');
    }

    let saved: ImageData | null = null;
    let savedCursor: string | null = null;
    if (canvas) {
        savedCursor = canvas.style.cursor;
        if (canvas2d && canvas.width > 0 && canvas.height > 0) {
            try {
                saved = canvas2d.getImageData(0, 0, canvas.width, canvas.height);
            } catch {
                saved = null;
            }
        }
    }

    const prev = {
        labels: MapView.shouldDrawLabels,
        borders: MapView.shouldDrawBorders,
        npcs: MapView.shouldDrawNpcs,
        items: MapView.shouldDrawItems,
        multimap: MapView.shouldDrawMultimap,
        freemap: MapView.shouldDrawFreemap
    };

    MapView.shouldDrawLabels = prefs.labels;
    MapView.shouldDrawBorders = prefs.borders;
    MapView.shouldDrawNpcs = prefs.npcs;
    MapView.shouldDrawItems = prefs.items;
    MapView.shouldDrawMultimap = prefs.multimap;
    MapView.shouldDrawFreemap = prefs.freemap;

    let resolveReady!: () => void;
    let rejectReady!: (e: unknown) => void;
    const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
    });

    let aborted = false;
    const checkAbort = (): void => {
        if (aborted) throw new Error('basemap rebuild cancelled');
    };

    /**
     * One-shot MapView: maininit only, no game loop / no canvas event handlers.
     * Suppress overview paint during maininit (second full paint is the real bake).
     */
    class LiveBakeMapView extends MapView {
        /** Skip expensive overview renderWorldMap inside maininit. */
        suppressWorldPaint = true;

        override renderWorldMap(
            left: number,
            top: number,
            right: number,
            bottom: number,
            widthOffset: number,
            heightOffset: number,
            width: number,
            height: number
        ): void {
            if (this.suppressWorldPaint) return;
            super.renderWorldMap(left, top, right, bottom, widthOffset, heightOffset, width, height);
        }

        override async run(): Promise<void> {
            try {
                checkAbort();
                // 377 MapView bootstrap is maininit (GameShell.load is empty).
                await this.maininit();
                checkAbort();
                resolveReady();
            } catch (e) {
                rejectReady(e);
            }
        }

        override async drawProgress(message?: string): Promise<void> {
            checkAbort();
            if (message) progress(String(message));
            await sleep(0);
            checkAbort();
        }

        override async loadWorldmap() {
            checkAbort();
            if (!this.worldmap) {
                if (!pendingJag) throw new Error('no worldmap.jag bytes');
                this.worldmap = new JagFile(pendingJag);
            }
            return this.worldmap;
        }

        protected override resize(width: number, height: number): void {
            // Offscreen PixMap; do not resize the live game canvas.
            this.drawArea = new PixMap(width, height, bakeCtx!);
        }
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
        await sleep(0);
        checkAbort();
        progress('decoding worldmap (maininit)…');
        const view = new LiveBakeMapView();
        const timeout = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                aborted = true;
                reject(new Error('basemap rebuild timed out while loading worldmap.jag'));
            }, 120_000);
        });
        try {
            await Promise.race([ready, timeout]);
        } finally {
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
        }
        checkAbort();

        if (!view.blendedGroundColour?.length) {
            throw new Error('MapView maininit left ground empty (maininit did not run?)');
        }

        const width = view.mapWidth;
        const height = view.mapHeight;
        view.zoom = 4;
        view.targetZoom = 4;
        view.suppressWorldPaint = false;

        /**
         * Free-toggle layers (Settings → Worldmap layers) — built from MapView data
         * before we clear keys for a clean terrain raster. Same origin/size as terrain.
         */
        progress('building layer overlays…');
        const multiOverlay = tintGridToCanvas(view.multiPos, width, height, 0xff, 0x00, 0x00, 96);
        const freeOverlay = tintGridToCanvas(view.freePos, width, height, 0x00, 0xff, 0x00, 96);
        const keySheets = buildKeyOverlays(view, width, height);
        await sleep(0);

        // Terrain base: no free-toggle layers stamped (unless bake prefs request stamps).
        if (!prefs.keyIcons) {
            clearKeyPlacements(view);
        }
        MapView.shouldDrawLabels = prefs.labels;
        MapView.shouldDrawBorders = prefs.borders;
        MapView.shouldDrawNpcs = prefs.npcs;
        MapView.shouldDrawItems = prefs.items;
        MapView.shouldDrawMultimap = prefs.multimap;
        MapView.shouldDrawFreemap = prefs.freemap;

        progress(`painting terrain ${width}×${height}…`);
        bakeCanvas.width = width;
        bakeCanvas.height = height;
        const pix = new PixMap(width, height, bakeCtx);

        /**
         * Pix2D is a **process-wide singleton**. The live Client rebinds it every
         * frame (drawArea.setPixels). Reclaim the bind at the start of every strip.
         */
        const strip = 48;
        const paintStrips = async (label: string): Promise<void> => {
            for (let left = 0; left < width; left += strip) {
                checkAbort();
                pix.setPixels();
                const right = Math.min(left + strip, width);
                view.renderWorldMap(left, 0, right, height, left, 0, right, height);
                if ((left / strip) % 4 === 0) {
                    progress(
                        `${label} ${Math.min(100, Math.round((right / width) * 100))}%…`
                    );
                    await sleep(0);
                }
            }
            pix.setPixels();
        };

        await paintStrips('terrain');

        const nonzeroSamples = countNonzero(pix.data);
        if (nonzeroSamples < 8) {
            throw new Error(
                `bake produced blank raster (nonzero≈${nonzeroSamples}). Pix2D may not have bound the bake buffer.`
            );
        }

        const terrainCopy = new Int32Array(pix.data);
        const image = pix2dToCanvas(pix.data, width, height);

        // Labels overlay = pixels that change when shouldDrawLabels is on (free toggle).
        progress('painting labels overlay…');
        MapView.shouldDrawLabels = true;
        MapView.shouldDrawBorders = false;
        MapView.shouldDrawNpcs = false;
        MapView.shouldDrawItems = false;
        MapView.shouldDrawMultimap = false;
        MapView.shouldDrawFreemap = false;
        await paintStrips('labels');
        const labelsOverlay = labelsDiffToCanvas(terrainCopy, pix.data, width, height);

        // Point Pix2D back at the live Client drawArea.
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const client = (globalThis as any).__lc377Client as {
                drawArea?: { setPixels?: () => void };
            } | undefined;
            client?.drawArea?.setPixels?.();
        } catch {
            /* next client frame will rebind */
        }

        const fp = `regen-${prefsFingerprint(prefs)}-${Date.now().toString(36)}`;
        const manifest: BasemapManifest = {
            schema: BASEMAP_SCHEMA,
            revision: 'live-regen-377',
            fingerprint: fp,
            origin: { x: view.mapOriginX, z: view.mapOriginZ },
            sizeTiles: { w: width, h: height },
            pixelsPerTile: 1,
            basemapUrl: 'live-regen',
            jagBytes: jag.length
        };

        if (!manifest.origin.x) {
            manifest.origin = { ...DEFAULT_MAP_ORIGIN };
        }
        if (!manifest.sizeTiles.w) {
            manifest.sizeTiles = { ...DEFAULT_MAP_SIZE };
        }

        liveBasemapGeneration++;
        progress(`done · ${nonzeroSamples} samples · ${fp}`);
        console.info('[harness] basemap rebuilt', {
            fp,
            origin: manifest.origin,
            size: manifest.sizeTiles,
            nonzeroSamples,
            gen: liveBasemapGeneration,
            overlays: {
                multi: !!multiOverlay,
                free: !!freeOverlay,
                labels: !!labelsOverlay,
                keyTypes: keySheets.perType?.size ?? 0
            }
        });

        return {
            manifest,
            image,
            multiOverlay,
            freeOverlay,
            labelsOverlay,
            keyOverlay: keySheets.composite,
            keyTypeOverlays: keySheets.perType,
            nonzeroSamples
        };
    } finally {
        aborted = true;
        if (timeoutId !== null) clearTimeout(timeoutId);
        MapView.shouldDrawLabels = prev.labels;
        MapView.shouldDrawBorders = prev.borders;
        MapView.shouldDrawNpcs = prev.npcs;
        MapView.shouldDrawItems = prev.items;
        MapView.shouldDrawMultimap = prev.multimap;
        MapView.shouldDrawFreemap = prev.freemap;
        pendingJag = null;
        if (canvas && savedCursor !== null) {
            canvas.style.cursor = savedCursor;
        }
        if (saved && canvas2d) {
            try {
                canvas2d.putImageData(saved, 0, 0);
            } catch {
                /* ignore restore failure */
            }
        }
    }
}

export const BASEMAP_REGEN_TITLE = 'Rebuild basemap?';

export const BASEMAP_REGEN_BODY =
    'This re-runs MapView from worldmap.jag (harness subclass — pure Client-TS is not edited) '
    + 'and freezes the tab for several seconds.\n\n'
    + 'Everyday Key icons / multi / free layers are already pre-baked at deploy — toggle them under '
    + 'Settings → Worldmap layers without rebuilding.\n\n'
    + 'Use Rebuild after a game/cache update, or for experimental stamps (place labels, NPC/item dots, …).';
