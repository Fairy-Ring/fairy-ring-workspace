/**
 * Bake full-world basemap assets from worldmap.jag for the 377 harness map picker.
 *
 * Port of rs2b0t `tools/map/build-basemap.ts`, adapted for pure Client-TS MapView
 * (maininit; no shouldDrawMapfunctions — keys cleared for terrain).
 *
 * Emits under tools/harness/nav/out/basemap/:
 *   worldmap-basemap.<fp>.png
 *   worldmap-key.<fp>.png
 *   worldmap-key-type-*.<fp>.png
 *   worldmap-labels / multi / free .png
 *   worldmap-basemap.manifest.json
 *   worldmap.jag (cached if downloaded)
 *
 * Usage:
 *   bun tools/harness/map/build-basemap.ts [--jag PATH] [--out DIR] [--revision TAG]
 *   SKIP via env: SKIP_BASEMAP_BAKE=1 (build-client respects this)
 *
 * @see tools/harness/build-client.mjs (runs this before copying basemap to public/)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import {
    BASEMAP_MANIFEST_NAME,
    BASEMAP_SCHEMA,
    type BasemapManifest,
    type WorldmapKeyIndex
} from '../ui/worldMapBasemap.ts';
import { WORLDMAP_KEY_NAMES } from '../ui/worldmapKeyNames.ts';
import { encodePngRgba, pix2dToRgba } from './encodePng.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CLIENT_SRC = path.join(ROOT, 'vendor/client-ts/src');
const SCHEMA_TAG = `basemap-schema-${BASEMAP_SCHEMA}-377`;

type BakeArgs = {
    jag: string | null;
    outDir: string;
    revision: string;
    fetchUrl: string;
    mediaPath: string | null;
};

function parseArgs(): BakeArgs {
    const args = process.argv.slice(2);
    let jag: string | null = null;
    let outDir = path.join(ROOT, 'tools/harness/nav/out/basemap');
    let revision = '377';
    let fetchUrl = 'https://2004.lostcity.rs/worldmap.jag';
    let mediaPath: string | null = path.join(ROOT, 'vendor/engine/data/pack/client/media');
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--jag') jag = args[++i]!;
        else if (a === '--out') outDir = path.resolve(args[++i]!);
        else if (a === '--revision') revision = args[++i]!;
        else if (a === '--fetch-url') fetchUrl = args[++i]!;
        else if (a === '--media') mediaPath = args[++i]!;
        else if (a === '--help' || a === '-h') {
            console.log(
                'usage: bun tools/harness/map/build-basemap.ts [--jag PATH] [--out DIR] [--revision TAG]'
            );
            process.exit(0);
        } else {
            console.error(`unknown arg: ${a}`);
            process.exit(2);
        }
    }
    return { jag, outDir, revision, fetchUrl, mediaPath };
}

async function resolveJag(opts: BakeArgs): Promise<{ bytes: Uint8Array; source: string }> {
    const candidates = [
        opts.jag,
        path.join(ROOT, 'tools/harness/nav/out/worldmap.jag'),
        path.join(opts.outDir, 'worldmap.jag'),
        path.join(ROOT, 'vendor/engine/data/pack/mapview/worldmap.jag'),
        path.join(process.env.HOME || '', 'experiments/rs2b0t/out/worldmap.jag'),
        path.join(process.env.HOME || '', 'code/rs2b2t-engine/data/pack/mapview/worldmap.jag')
    ].filter(Boolean) as string[];

    for (const p of candidates) {
        if (fs.existsSync(p)) {
            return { bytes: new Uint8Array(fs.readFileSync(p)), source: p };
        }
    }

    console.log(`worldmap.jag missing; downloading ${opts.fetchUrl}…`);
    const res = await fetch(opts.fetchUrl);
    if (!res.ok) throw new Error(`download failed HTTP ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    fs.mkdirSync(opts.outDir, { recursive: true });
    const cacheJag = path.join(opts.outDir, '..', 'worldmap.jag');
    fs.mkdirSync(path.dirname(cacheJag), { recursive: true });
    fs.writeFileSync(cacheJag, bytes);
    // also beside basemap out
    fs.writeFileSync(path.join(opts.outDir, 'worldmap.jag'), bytes);
    console.log(`  cached ${cacheJag} (${bytes.length} bytes)`);
    return { bytes, source: `${opts.fetchUrl} → ${cacheJag}` };
}

function fingerprint(jag: Uint8Array): string {
    return createHash('sha256').update(jag).update(SCHEMA_TAG).digest('hex').slice(0, 16);
}

async function installCanvasMock(): Promise<void> {
    // Prefer installed package; fall back to rs2b0t node_modules (same machine layout).
    let GlobalRegistrator: { register: () => void };
    try {
        GlobalRegistrator = (await import('@happy-dom/global-registrator')).GlobalRegistrator;
    } catch {
        const require = createRequire(import.meta.url);
        const candidates = [
            path.join(process.env.HOME || '', 'experiments/rs2b0t/node_modules/@happy-dom/global-registrator'),
            path.join(ROOT, '../rs2b0t/node_modules/@happy-dom/global-registrator')
        ];
        let loaded = false;
        for (const c of candidates) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                GlobalRegistrator = require(c).GlobalRegistrator;
                loaded = true;
                console.log(`[basemap] happy-dom from ${c}`);
                break;
            } catch {
                /* try next */
            }
        }
        if (!loaded) {
            throw new Error(
                'Need @happy-dom/global-registrator. bun add -d @happy-dom/global-registrator'
            );
        }
    }

    GlobalRegistrator!.register();

    function fake2d(c: { width: number; height: number }) {
        return {
            fillStyle: '#000',
            strokeStyle: '#000',
            font: '10px sans-serif',
            textAlign: 'left' as CanvasTextAlign,
            createImageData(w: number, h?: number) {
                const W = typeof w === 'number' ? w : (w as ImageData).width;
                const H = typeof w === 'number' ? (h as number) : (w as ImageData).height;
                return {
                    data: new Uint8ClampedArray(W * H * 4),
                    width: W,
                    height: H,
                    colorSpace: 'srgb' as const
                };
            },
            getImageData(_x: number, _y: number, w: number, h: number) {
                return {
                    data: new Uint8ClampedArray(w * h * 4),
                    width: w,
                    height: h,
                    colorSpace: 'srgb' as const
                };
            },
            putImageData() {},
            fillRect() {},
            strokeRect() {},
            fillText() {},
            measureText: () => ({ width: 8 }),
            drawImage() {},
            beginPath() {},
            moveTo() {},
            lineTo() {},
            stroke() {},
            save() {},
            restore() {},
            clearRect() {},
            canvas: c
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (HTMLCanvasElement.prototype as any).getContext = function (type: string) {
        if (type === '2d') return fake2d(this);
        return null;
    };

    const el = document.createElement('canvas');
    el.id = 'canvas';
    el.width = 765;
    el.height = 503;
    document.body.appendChild(el);
}

/** Blit a MapView Pix32 (0x00RRGGBB, 0 = transparent) into an RGBA buffer. */
function blitSpriteRgba(
    rgba: Uint8Array,
    mapW: number,
    mapH: number,
    sprite: { data: Int32Array; wi: number; hi: number; xof: number; yof: number },
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
            const rgb = sprite.data[sy * sprite.wi + sx]! >>> 0;
            if (rgb === 0) continue;
            const o = (dy * mapW + dx) * 4;
            rgba[o] = (rgb >> 16) & 0xff;
            rgba[o + 1] = (rgb >> 8) & 0xff;
            rgba[o + 2] = rgb & 0xff;
            rgba[o + 3] = 0xff;
        }
    }
}

function bakeTintRgba(
    grid: boolean[][],
    width: number,
    height: number,
    r: number,
    g: number,
    b: number,
    a: number
): Uint8Array {
    const rgba = new Uint8Array(width * height * 4);
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
        }
    }
    return rgba;
}

function clearKeyPlacements(view: {
    mapWidth: number;
    mapHeight: number;
    locMapfunction: number[][];
}): void {
    for (let x = 0; x < view.mapWidth; x++) {
        const col = view.locMapfunction[x];
        if (!col) continue;
        for (let z = 0; z < view.mapHeight; z++) col[z] = 0;
    }
}

type BakeResult = {
    terrain: Int32Array;
    keyRgba: Uint8Array;
    keyTypeRgba: Record<string, Uint8Array>;
    labelsRgba: Uint8Array;
    multiRgba: Uint8Array;
    freeRgba: Uint8Array;
    keyIndex: WorldmapKeyIndex;
    width: number;
    height: number;
    originX: number;
    originZ: number;
};

async function bake(jagBytes: Uint8Array): Promise<BakeResult> {
    await installCanvasMock();
    (globalThis as { __basemapJag?: Uint8Array }).__basemapJag = jagBytes;

    // Pure client-ts MapView (path aliases via bun --preload or relative).
    const { MapView } = await import(path.join(CLIENT_SRC, 'mapview/MapView.ts'));
    const JagFile = (await import(path.join(CLIENT_SRC, 'io/JagFile.ts'))).default;
    const PixMap = (await import(path.join(CLIENT_SRC, 'graphics/PixMap.ts'))).default;
    const { sleep } = await import(path.join(CLIENT_SRC, 'util/JsUtil.ts'));

    class BakeMapView extends MapView {
        override async run(): Promise<void> {
            // 377 MapView bootstrap is maininit (not GameShell.load).
            await this.maininit();
        }
        override async drawProgress(): Promise<void> {}
        override async loadWorldmap() {
            if (!this.worldmap) {
                const raw = (globalThis as { __basemapJag?: Uint8Array }).__basemapJag;
                if (!raw) throw new Error('no jag bytes');
                this.worldmap = new JagFile(raw);
            }
            return this.worldmap;
        }
        protected override resize(width: number, height: number): void {
            this.drawArea = new PixMap(width, height);
        }
    }

    // Terrain-only first pass (no stamps).
    MapView.shouldDrawLabels = false;
    MapView.shouldDrawBorders = false;
    MapView.shouldDrawNpcs = false;
    MapView.shouldDrawItems = false;
    MapView.shouldDrawMultimap = false;
    MapView.shouldDrawFreemap = false;

    const view = new BakeMapView();
    const t0 = performance.now();
    while (!view.blendedGroundColour?.length) {
        await sleep(20);
        if (performance.now() - t0 > 120_000) {
            throw new Error('MapView.maininit timed out');
        }
    }

    const width = view.mapWidth;
    const height = view.mapHeight;
    view.zoom = 4;
    view.targetZoom = 4;

    // Key overlays from locMapfunction **before** clearing for terrain.
    const keyRgba = new Uint8Array(width * height * 4);
    const keyTypeRgba: Record<string, Uint8Array> = {};
    const placements: Record<string, [number, number][]> = {};
    for (let x = 0; x < width; x++) {
        const col = view.locMapfunction[x];
        if (!col) continue;
        for (let y = 0; y < height; y++) {
            const mf = col[y] | 0;
            if (mf === 0) continue;
            const type = mf - 1;
            const key = String(type);
            if (!placements[key]) {
                placements[key] = [];
                keyTypeRgba[key] = new Uint8Array(width * height * 4);
            }
            placements[key]!.push([x, y]);
            const sprite = view.mapfunction[type];
            if (sprite?.data) {
                blitSpriteRgba(keyRgba, width, height, sprite, x - 7, y - 7);
                blitSpriteRgba(keyTypeRgba[key]!, width, height, sprite, x - 7, y - 7);
            }
        }
    }

    const multiRgba = bakeTintRgba(view.multiPos, width, height, 0xff, 0x00, 0x00, 96);
    const freeRgba = bakeTintRgba(view.freePos, width, height, 0x00, 0xff, 0x00, 96);

    // Clean terrain (377 always stamps keys in renderWorldMap — clear placements).
    clearKeyPlacements(view);
    const pix = new PixMap(width, height);
    pix.setPixels();
    view.renderWorldMap(0, 0, width, height, 0, 0, width, height);
    const terrain = new Int32Array(pix.data);

    // Labels overlay = diff with labels on.
    MapView.shouldDrawLabels = true;
    const pixLabeled = new PixMap(width, height);
    pixLabeled.setPixels();
    view.renderWorldMap(0, 0, width, height, 0, 0, width, height);
    MapView.shouldDrawLabels = false;
    const labelsRgba = new Uint8Array(width * height * 4);
    for (let i = 0; i < terrain.length; i++) {
        const a = terrain[i]! >>> 0;
        const b = pixLabeled.data[i]! >>> 0;
        if (a === b) continue;
        const o = i * 4;
        labelsRgba[o] = (b >> 16) & 0xff;
        labelsRgba[o + 1] = (b >> 8) & 0xff;
        labelsRgba[o + 2] = b & 0xff;
        labelsRgba[o + 3] = 0xff;
    }

    const names = view.keyNames?.length ? [...view.keyNames] : [...WORLDMAP_KEY_NAMES];
    const keyIndex: WorldmapKeyIndex = {
        schema: 1,
        names,
        placements
    };

    return {
        terrain,
        keyRgba,
        keyTypeRgba,
        labelsRgba,
        multiRgba,
        freeRgba,
        keyIndex,
        width,
        height,
        originX: view.mapOriginX,
        originZ: view.mapOriginZ
    };
}

async function extractMapmarkerPng(mediaBytes: Uint8Array, spriteIndex: number): Promise<Uint8Array> {
    const JagFile = (await import(path.join(CLIENT_SRC, 'io/JagFile.ts'))).default;
    const Pix32 = (await import(path.join(CLIENT_SRC, 'graphics/Pix32.ts'))).default;
    const jag = new JagFile(mediaBytes);
    const s = Pix32.depack(jag, 'mapmarker', spriteIndex);
    const w = s.owi;
    const h = s.ohi;
    const rgba = new Uint8Array(w * h * 4);
    for (let y = 0; y < s.hi; y++) {
        for (let x = 0; x < s.wi; x++) {
            const rgb = s.data[y * s.wi + x]! >>> 0;
            if (!rgb) continue;
            const dx = x + s.xof;
            const dy = y + s.yof;
            if (dx < 0 || dy < 0 || dx >= w || dy >= h) continue;
            const o = (dy * w + dx) * 4;
            rgba[o] = (rgb >> 16) & 0xff;
            rgba[o + 1] = (rgb >> 8) & 0xff;
            rgba[o + 2] = rgb & 0xff;
            rgba[o + 3] = 0xff;
        }
    }
    return encodePngRgba(rgba, w, h);
}

async function main(): Promise<void> {
    const opts = parseArgs();
    const started = performance.now();

    const { bytes, source } = await resolveJag(opts);
    const fp = fingerprint(bytes);
    console.log(`[basemap] source: ${source}`);
    console.log(`[basemap] fingerprint: ${fp}`);
    console.log(`[basemap] revision: ${opts.revision}`);
    console.log(`[basemap] schema: ${BASEMAP_SCHEMA}`);

    // Ensure nav/out has worldmap.jag for live Rebuild too.
    const jagOut = path.join(ROOT, 'tools/harness/nav/out/worldmap.jag');
    fs.mkdirSync(path.dirname(jagOut), { recursive: true });
    if (!fs.existsSync(jagOut)) {
        fs.writeFileSync(jagOut, bytes);
    }

    const result = await bake(bytes);
    const { width, height } = result;
    console.log(
        `[basemap] raster: ${width}×${height} (${((performance.now() - started) / 1000).toFixed(1)}s so far)`
    );

    // Clean previous fingerprinted assets in out dir (keep worldmap.jag).
    fs.mkdirSync(opts.outDir, { recursive: true });
    for (const name of fs.readdirSync(opts.outDir)) {
        if (name === 'worldmap.jag') continue;
        if (/^worldmap-/.test(name) || name === BASEMAP_MANIFEST_NAME) {
            fs.unlinkSync(path.join(opts.outDir, name));
        }
    }

    const terrainName = `worldmap-basemap.${fp}.png`;
    const keyName = `worldmap-key.${fp}.png`;
    const labelsName = `worldmap-labels.${fp}.png`;
    const multiName = `worldmap-multi.${fp}.png`;
    const freeName = `worldmap-free.${fp}.png`;
    const keyIndexName = `worldmap-key-index.${fp}.json`;

    const terrainPng = encodePngRgba(pix2dToRgba(result.terrain), width, height);
    const keyPng = encodePngRgba(result.keyRgba, width, height);
    const labelsPng = encodePngRgba(result.labelsRgba, width, height);
    const multiPng = encodePngRgba(result.multiRgba, width, height);
    const freePng = encodePngRgba(result.freeRgba, width, height);

    fs.writeFileSync(path.join(opts.outDir, terrainName), terrainPng);
    fs.writeFileSync(path.join(opts.outDir, keyName), keyPng);
    fs.writeFileSync(path.join(opts.outDir, labelsName), labelsPng);
    fs.writeFileSync(path.join(opts.outDir, multiName), multiPng);
    fs.writeFileSync(path.join(opts.outDir, freeName), freePng);
    fs.writeFileSync(
        path.join(opts.outDir, keyIndexName),
        JSON.stringify(result.keyIndex, null, 2) + '\n'
    );

    const keyTypeOverlayUrls: Record<string, string> = {};
    let keyTypeBytes = 0;
    for (const [typeId, rgba] of Object.entries(result.keyTypeRgba)) {
        const name = `worldmap-key-type-${typeId}.${fp}.png`;
        const png = encodePngRgba(rgba, width, height);
        fs.writeFileSync(path.join(opts.outDir, name), png);
        keyTypeOverlayUrls[typeId] = `./${name}`;
        keyTypeBytes += png.length;
    }

    let playerMarkerUrl: string | undefined;
    if (opts.mediaPath && fs.existsSync(opts.mediaPath)) {
        try {
            const marker = await extractMapmarkerPng(
                new Uint8Array(fs.readFileSync(opts.mediaPath)),
                0
            );
            const markerName = `worldmap-player-marker.${fp}.png`;
            fs.writeFileSync(path.join(opts.outDir, markerName), marker);
            playerMarkerUrl = `./${markerName}`;
            console.log(
                `[basemap] player marker: ${markerName} (${(marker.length / 1024).toFixed(1)} KB)`
            );
        } catch (e) {
            console.warn(
                `[basemap] player marker: skip (${e instanceof Error ? e.message : e})`
            );
        }
    }

    const placementCount = Object.values(result.keyIndex.placements).reduce(
        (n, a) => n + a.length,
        0
    );
    const typeCount = Object.keys(result.keyIndex.placements).length;

    const manifest: BasemapManifest = {
        schema: BASEMAP_SCHEMA,
        revision: opts.revision,
        fingerprint: fp,
        origin: { x: result.originX, z: result.originZ },
        sizeTiles: { w: width, h: height },
        pixelsPerTile: 1,
        basemapUrl: `./${terrainName}`,
        keyOverlayUrl: `./${keyName}`,
        keyIndexUrl: `./${keyIndexName}`,
        keyTypeOverlayUrls,
        labelsOverlayUrl: `./${labelsName}`,
        multiOverlayUrl: `./${multiName}`,
        freeOverlayUrl: `./${freeName}`,
        playerMarkerUrl,
        jagBytes: bytes.length
    };
    const manPath = path.join(opts.outDir, BASEMAP_MANIFEST_NAME);
    fs.writeFileSync(manPath, JSON.stringify(manifest, null, 2) + '\n');

    console.log('[basemap] report:');
    console.log(`  terrain: ${terrainName} (${(terrainPng.length / 1024).toFixed(0)} KB)`);
    console.log(`  key all: ${keyName} (${(keyPng.length / 1024).toFixed(0)} KB)`);
    console.log(
        `  key types: ${typeCount} PNGs (${(keyTypeBytes / 1024).toFixed(0)} KB) — ${placementCount} icons`
    );
    console.log(`  labels: ${labelsName} (${(labelsPng.length / 1024).toFixed(0)} KB)`);
    console.log(`  multi: ${multiName} (${(multiPng.length / 1024).toFixed(0)} KB)`);
    console.log(`  free: ${freeName} (${(freePng.length / 1024).toFixed(0)} KB)`);
    console.log(`  manifest: ${manPath}`);
    console.log(`  origin: ${result.originX},${result.originZ}`);
    console.log(`  elapsed: ${((performance.now() - started) / 1000).toFixed(1)}s`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
