/**
 * Walkable-tile map picker — port of enhanced rs2b0t WorldMapPicker.
 *
 * Loads harness collision pack (PathFinder) and draws a zoomable/pannable view:
 *  - **Basemap mode** (default when deploy assets present): worldmap terrain +
 *    optional Key / multi / free / label overlays under selection crosshair.
 *  - **Classic mode**: collision-dot grid + named destinations.
 *
 * Click snaps to nearest walkable. No continuous paint loop — rAF-coalesced.
 * Live MapView Rebuild is not wired (deploy basemap only); Settings toggles are free.
 *
 * Public: `openWorldMapPicker({ level?, x?, z? })` → `{ x, z, level } | null`
 * Also `WorldMapPicker.open()` for rs2b0t-shaped callers.
 *
 * @see /Users/acfrazier/experiments/rs2b0t/src/bot/ui/WorldMapPicker.ts
 */
import { ensureNav, getFinder } from '../nav/browser/NavigatorMain.ts';
import type { PathFinder } from '../nav/PathFinder.ts';
import { WALK_DESTINATIONS } from './walkDestinations.ts';
import {
    BASEMAP_MANIFEST_NAME,
    basemapSourceRect,
    isBasemapManifest,
    type BasemapManifest
} from './worldMapBasemap.ts';
import {
    getMapPickerShowBasemap,
    isMapPickerThemeSettingKey,
    keyNameToTypeId,
    resolveMapPickerDotTheme
} from './mapPickerTheme.ts';
import {
    BASEMAP_REGEN_BODY,
    BASEMAP_REGEN_TITLE,
    getLiveBasemapGeneration,
    regenerateBasemap,
    resolveBasemapBakePrefs
} from './basemapRegen.ts';
import { showConfirmDialog } from './confirmDialog.ts';
import {
    blobToImage,
    clearBasemapLocalCache,
    fetchClientCrcKey,
    prefsKeyFromBakePrefs,
    readBasemapLocalCache,
    saveRegeneratedBasemapLocally
} from './basemapLocalCache.ts';
import {
    MAP_PICKER_SETTINGS,
    MAP_PICKER_SETTINGS_NS,
    SettingsBag,
    SettingsStore
} from '../runtime/Settings.ts';
import ParamsModal from './ParamsModal.ts';

export type PickedTile = { x: number; z: number; level: number };

/** Mainland-ish default centre (Varrock). */
const DEFAULT_CENTRE = { x: 3213, z: 3424 };
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 12;
/** Base: how many world tiles fit across the canvas width at zoom=1. */
const TILES_AT_ZOOM1 = 320;

/** Deploy path next to harness-client (build copies basemap/ into public/harness/). */
const BASEMAP_BASE = '/harness/basemap/';

let basemapPromise: Promise<LoadedBasemap | null> | null = null;

export type LoadedBasemap = {
    manifest: BasemapManifest;
    image: CanvasImageSource;
    keyOverlay?: CanvasImageSource;
    keyTypeOverlays?: Map<string, CanvasImageSource>;
    multiOverlay?: CanvasImageSource;
    freeOverlay?: CanvasImageSource;
    labelsOverlay?: CanvasImageSource;
    playerMarker?: CanvasImageSource;
    hint?: 'stale-crc' | 'prefs-mismatch' | 'crc-unverified';
};

async function fetchOptionalImage(manUrl: URL, rel: string | undefined): Promise<CanvasImageSource | null> {
    if (!rel) return null;
    try {
        const res = await fetch(new URL(rel, manUrl));
        if (!res.ok) return null;
        return blobToImage(await res.blob());
    } catch {
        return null;
    }
}

async function loadDeployBasemap(): Promise<LoadedBasemap | null> {
    const manUrl = new URL(`${BASEMAP_BASE}${BASEMAP_MANIFEST_NAME}`, location.origin);
    const manRes = await fetch(manUrl);
    if (!manRes.ok) return null;
    let json: unknown;
    try {
        json = await manRes.json();
    } catch {
        return null;
    }
    if (!isBasemapManifest(json)) return null;
    const imgUrl = new URL(json.basemapUrl, manUrl);
    const imgRes = await fetch(imgUrl);
    if (!imgRes.ok) return null;
    const blob = await imgRes.blob();
    const image = await blobToImage(blob);
    const typeEntries = Object.entries(json.keyTypeOverlayUrls ?? {});
    const [keyOverlay, multiOverlay, freeOverlay, labelsOverlay, playerMarker, ...typeImgs] =
        await Promise.all([
            fetchOptionalImage(manUrl, json.keyOverlayUrl),
            fetchOptionalImage(manUrl, json.multiOverlayUrl),
            fetchOptionalImage(manUrl, json.freeOverlayUrl),
            fetchOptionalImage(manUrl, json.labelsOverlayUrl),
            fetchOptionalImage(manUrl, json.playerMarkerUrl),
            ...typeEntries.map(([, rel]) => fetchOptionalImage(manUrl, rel))
        ]);
    const keyTypeOverlays = new Map<string, CanvasImageSource>();
    for (let i = 0; i < typeEntries.length; i++) {
        const img = typeImgs[i];
        if (img) keyTypeOverlays.set(typeEntries[i]![0], img);
    }
    return {
        manifest: json,
        image,
        keyOverlay: keyOverlay ?? undefined,
        keyTypeOverlays: keyTypeOverlays.size > 0 ? keyTypeOverlays : undefined,
        multiOverlay: multiOverlay ?? undefined,
        freeOverlay: freeOverlay ?? undefined,
        labelsOverlay: labelsOverlay ?? undefined,
        playerMarker: playerMarker ?? undefined
    };
}

function tileKey(t: { x: number; z: number; level: number } | null): string {
    return t ? `${t.x},${t.z},${t.level}` : '';
}

function readPlayerTile(): PickedTile | null {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const me = (globalThis as any).__lc377?.reader?.worldTile?.();
        if (me && Number.isFinite(me.x) && Number.isFinite(me.z)) {
            return { x: me.x, z: me.z, level: me.level ?? 0 };
        }
    } catch {
        /* ignore */
    }
    return null;
}

function paintYouAreHere(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    basemapMode: boolean,
    marker: CanvasImageSource | null
): void {
    if (basemapMode && marker) {
        const mw = 15;
        const mh = 30;
        const scale = Math.max(1, Math.min(2.2, 18 / mw));
        const dw = mw * scale;
        const dh = mh * scale;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, 14);
        g.addColorStop(0, 'rgba(255, 220, 40, 0.55)');
        g.addColorStop(1, 'rgba(255, 220, 40, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx, sy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(marker, sx - dw / 2, sy - dh + 2, dw, dh);
        ctx.restore();
        return;
    }

    if (basemapMode) {
        ctx.save();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(sx - 8, sy - 8);
        ctx.lineTo(sx + 8, sy + 8);
        ctx.moveTo(sx + 8, sy - 8);
        ctx.lineTo(sx - 8, sy + 8);
        ctx.stroke();
        ctx.strokeStyle = '#ffe040';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        return;
    }

    ctx.save();
    const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, 16);
    g.addColorStop(0, 'rgba(255, 230, 60, 0.95)');
    g.addColorStop(0.35, 'rgba(255, 200, 20, 0.55)');
    g.addColorStop(1, 'rgba(255, 180, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe040';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = 'bold 11px sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.fillStyle = '#ffe040';
    ctx.strokeText('You Are Here', sx + 10, sy - 6);
    ctx.fillText('You Are Here', sx + 10, sy - 6);
    ctx.restore();
}

/**
 * Load basemap: IndexedDB (CRC+prefs) → deploy PNG under /harness/basemap/.
 * Never runs MapView on open.
 */
export async function loadBasemap(): Promise<LoadedBasemap | null> {
    if (!basemapPromise) {
        basemapPromise = (async () => {
            const crcKey = await fetchClientCrcKey();
            const local = await readBasemapLocalCache();
            const prefsKey = prefsKeyFromBakePrefs(resolveBasemapBakePrefs());

            const tryLocal = async (
                hint?: LoadedBasemap['hint']
            ): Promise<LoadedBasemap | null> => {
                if (!local) return null;
                try {
                    const image = await blobToImage(local.imageBlob);
                    return { manifest: local.manifest, image, hint };
                } catch {
                    await clearBasemapLocalCache();
                    return null;
                }
            };

            if (local && crcKey && local.crcKey === crcKey && local.prefsKey === prefsKey) {
                const hit = await tryLocal();
                if (hit) return hit;
            }
            if (local && !crcKey) {
                const hit = await tryLocal('crc-unverified');
                if (hit) return hit;
            }

            const deploy = await loadDeployBasemap();
            if (deploy) {
                let hint: LoadedBasemap['hint'];
                if (local && crcKey && local.crcKey !== crcKey) hint = 'stale-crc';
                else if (local && crcKey && local.crcKey === crcKey && local.prefsKey !== prefsKey) {
                    hint = 'prefs-mismatch';
                }
                return { ...deploy, hint };
            }

            if (local) {
                const hint: LoadedBasemap['hint'] =
                    crcKey && local.crcKey !== crcKey ? 'stale-crc' : 'prefs-mismatch';
                return tryLocal(hint);
            }
            return null;
        })().catch(() => {
            basemapPromise = null;
            return null;
        });
    }
    return basemapPromise;
}

export function resetBasemapCache(): void {
    basemapPromise = null;
}

export function installBasemapOverride(next: LoadedBasemap): void {
    basemapPromise = Promise.resolve({ ...next, hint: undefined });
}

/** Nearest walkable tile within `radius` (Chebyshev), or null. */
export function nearestWalkable(
    finder: PathFinder,
    x: number,
    z: number,
    level: number,
    radius = 8
): { x: number; z: number } | null {
    const ix = Math.round(x);
    const iz = Math.round(z);
    if (finder.walkable(ix, iz, level)) {
        return { x: ix, z: iz };
    }
    let best: { x: number; z: number; d: number } | null = null;
    for (let r = 1; r <= radius; r++) {
        for (let dx = -r; dx <= r; dx++) {
            for (let dz = -r; dz <= r; dz++) {
                if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
                const nx = ix + dx;
                const nz = iz + dz;
                if (!finder.walkable(nx, nz, level)) continue;
                const d = Math.hypot(dx, dz);
                if (!best || d < best.d) best = { x: nx, z: nz, d };
            }
        }
        if (best) return { x: best.x, z: best.z };
    }
    return null;
}

/** Step size for sampling walkable dots given zoom (higher zoom → denser). */
export function sampleStep(zoom: number): number {
    if (zoom >= 6) return 1;
    if (zoom >= 3) return 2;
    if (zoom >= 1.5) return 3;
    if (zoom >= 0.8) return 5;
    return 8;
}

/** Raise step so the visible grid never exceeds ~maxSamples on either axis. */
export function cappedSampleStep(
    zoom: number,
    tilesAcross: number,
    tilesHigh: number,
    maxSamples = 96
): number {
    let step = sampleStep(zoom);
    const need = Math.max(tilesAcross / maxSamples, tilesHigh / maxSamples, 1);
    if (need > step) step = Math.ceil(need);
    return step;
}

export type OpenMapOpts = {
    level?: number;
    x?: number;
    z?: number;
};

/**
 * Opens interactive walkable-map modal. Resolves with picked tile or null on cancel.
 */
export async function openWorldMapPicker(opts?: OpenMapOpts): Promise<PickedTile | null> {
    let loadError: string | null = null;
    let finder: PathFinder | null = null;
    try {
        await ensureNav();
        finder = getFinder();
        if (!finder) loadError = 'nav pack not ready';
    } catch (e) {
        loadError = e instanceof Error ? e.message : String(e);
    }

    let defaultX = opts?.x ?? DEFAULT_CENTRE.x;
    let defaultZ = opts?.z ?? DEFAULT_CENTRE.z;
    if (opts?.x == null || opts?.z == null) {
        const me = readPlayerTile();
        if (me) {
            defaultX = me.x;
            defaultZ = me.z;
        }
    }

    return new Promise(resolve => {
        const level0 = opts?.level ?? readPlayerTile()?.level ?? 0;
        let level = Math.max(0, Math.min(3, level0));
        let centreX = defaultX;
        let centreZ = defaultZ;
        let zoom = 1.2;
        let selected: PickedTile | null = null;
        let dragging = false;
        let lastMx = 0;
        let lastMy = 0;
        let downX = 0;
        let downY = 0;
        let basemap: LoadedBasemap | null = null;
        let basemapState: 'loading' | 'ready' | 'missing' | 'error' = 'loading';
        /** Sticky line after Rebuild so setStatus does not look like a no-op. */
        let rebuildNote: string | null = null;
        /** Generation when this picker last installed a live bake (ignore stale deploy loads). */
        let liveGenAtInstall = 0;

        let here: PickedTile | null = readPlayerTile();
        let hereKey = tileKey(here);

        const overlay = document.createElement('div');
        overlay.className = 'rs2b0t-modal-overlay rs2b0t-walkmap-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: '1100',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'ui-monospace, Menlo, monospace'
        });

        const canvas = document.createElement('canvas');
        canvas.width = 720;
        canvas.height = 540;
        canvas.className = 'rs2b0t-walkmap-canvas';
        canvas.dataset.basemap = 'loading';
        Object.assign(canvas.style, {
            backgroundColor: '#0a0e14',
            border: '2px solid #555',
            cursor: 'crosshair',
            touchAction: 'none',
            maxWidth: '96vw'
        });
        const ctx = canvas.getContext('2d')!;

        const instruction = document.createElement('div');
        instruction.className = 'rs2b0t-walkmap-hint';
        Object.assign(instruction.style, {
            color: '#aaa',
            margin: '8px 0 4px',
            fontSize: '13px',
            textAlign: 'center',
            maxWidth: '720px'
        });
        instruction.textContent =
            'Scroll, drag, click to select (snaps to walkable). Open Settings for basemap and layers.';

        const status = document.createElement('div');
        status.className = 'rs2b0t-walkmap-status';
        Object.assign(status.style, {
            color: '#8ab4f8',
            fontSize: '12px',
            marginBottom: '6px',
            fontFamily: 'monospace'
        });
        status.textContent = finder ? 'ready' : 'loading collision pack…';
        status.dataset.basemap = 'loading';

        const toolbar = document.createElement('div');
        Object.assign(toolbar.style, {
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            marginBottom: '8px',
            flexWrap: 'wrap',
            justifyContent: 'center'
        });

        const levelLabel = document.createElement('label');
        levelLabel.style.color = '#ccc';
        levelLabel.style.fontSize = '13px';
        levelLabel.textContent = 'Level ';
        const levelSelect = document.createElement('select');
        levelSelect.className = 'rs2b0t-walkmap-level';
        for (let L = 0; L <= 3; L++) {
            const opt = document.createElement('option');
            opt.value = String(L);
            opt.textContent = String(L);
            if (L === level) opt.selected = true;
            levelSelect.appendChild(opt);
        }
        levelLabel.appendChild(levelSelect);
        toolbar.appendChild(levelLabel);

        const zoomOut = document.createElement('button');
        zoomOut.type = 'button';
        zoomOut.className = 'rs2b0t-button rs2b0t-walkmap-zoom-out';
        zoomOut.textContent = '−';
        zoomOut.title = 'Zoom out';
        const zoomIn = document.createElement('button');
        zoomIn.type = 'button';
        zoomIn.className = 'rs2b0t-button rs2b0t-walkmap-zoom-in';
        zoomIn.textContent = '+';
        zoomIn.title = 'Zoom in';
        toolbar.appendChild(zoomOut);
        toolbar.appendChild(zoomIn);

        const meBtn = document.createElement('button');
        meBtn.type = 'button';
        meBtn.className = 'rs2b0t-button rs2b0t-walkmap-me';
        meBtn.textContent = 'Me';
        meBtn.title = 'Centre on local player';
        toolbar.appendChild(meBtn);

        const settingsBtn = document.createElement('button');
        settingsBtn.type = 'button';
        settingsBtn.className = 'rs2b0t-button rs2b0t-walkmap-settings';
        settingsBtn.textContent = 'Settings';
        settingsBtn.title = 'Basemap, walkable dots, worldmap layers';
        toolbar.appendChild(settingsBtn);

        const rebuildBtn = document.createElement('button');
        rebuildBtn.type = 'button';
        rebuildBtn.className = 'rs2b0t-button rs2b0t-walkmap-rebuild';
        rebuildBtn.textContent = 'Rebuild map…';
        rebuildBtn.title =
            'Offline-only in 377 harness. Everyday Key/multi/free layers are pre-baked — use Settings.';
        toolbar.appendChild(rebuildBtn);

        const syncBasemapChrome = (): void => {
            const show = getMapPickerShowBasemap();
            rebuildBtn.style.display = show ? '' : 'none';
            const attr = show ? basemapState : 'off';
            canvas.dataset.basemap = attr;
            status.dataset.basemap = attr;
        };
        syncBasemapChrome();

        const btnRow = document.createElement('div');
        Object.assign(btnRow.style, { display: 'flex', gap: '8px', marginTop: '10px' });

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'rs2b0t-button rs2b0t-walkmap-cancel';
        cancelBtn.textContent = 'Cancel';

        const confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.className = 'rs2b0t-button rs2b0t-walkmap-confirm';
        confirmBtn.textContent = 'Confirm';
        confirmBtn.disabled = true;

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(confirmBtn);

        overlay.appendChild(toolbar);
        overlay.appendChild(canvas);
        overlay.appendChild(instruction);
        overlay.appendChild(status);
        overlay.appendChild(btnRow);
        document.body.appendChild(overlay);

        const tilesAcross = (): number => TILES_AT_ZOOM1 / zoom;
        const pxPerTile = (): number => canvas.width / tilesAcross();

        const worldToScreen = (wx: number, wz: number): { sx: number; sy: number } => {
            const ppt = pxPerTile();
            const sx = canvas.width / 2 + (wx - centreX) * ppt;
            const sy = canvas.height / 2 - (wz - centreZ) * ppt;
            return { sx, sy };
        };

        const screenToWorld = (sx: number, sy: number): { x: number; z: number } => {
            const ppt = pxPerTile();
            const x = centreX + (sx - canvas.width / 2) / ppt;
            const z = centreZ - (sy - canvas.height / 2) / ppt;
            return { x, z };
        };

        const setBasemapAttr = (s: typeof basemapState): void => {
            basemapState = s;
            syncBasemapChrome();
        };

        const setStatus = (): void => {
            if (loadError) {
                status.textContent = loadError;
                status.style.color = '#f88';
                return;
            }
            const sel = selected
                ? `selected ${selected.x},${selected.z},L${selected.level}`
                : 'no selection';
            let bm = 'basemap off';
            if (getMapPickerShowBasemap()) {
                if (basemapState === 'ready') {
                    const rev = basemap?.manifest.revision ?? '';
                    const live = rev === 'live-regen-377' || rev.startsWith('live-regen');
                    bm = live
                        ? `LIVE ${basemap?.manifest.fingerprint ?? ''}`
                        : `basemap ok ${basemap?.manifest.fingerprint.slice(0, 8) ?? ''}`;
                    if (basemap?.hint === 'stale-crc') bm += ' · outdated (Rebuild map…)';
                    else if (basemap?.hint === 'prefs-mismatch') bm += ' · layers differ (Rebuild map…)';
                    else if (basemap?.hint === 'crc-unverified') bm += ' · CRC unverified';
                } else if (basemapState === 'loading') bm = 'basemap…';
                else if (basemapState === 'missing') bm = 'basemap missing';
                else if (basemapState === 'error') bm = 'basemap error';
            }
            const halfH = (canvas.height / canvas.width) * (tilesAcross() / 2);
            const step = cappedSampleStep(zoom, tilesAcross(), halfH * 2);
            const note = rebuildNote ? ` · ${rebuildNote}` : '';
            status.textContent = `zoom ${zoom.toFixed(2)} · step ${step} · ${sel} · centre ${Math.round(centreX)},${Math.round(centreZ)} · ${bm}${note}`;
            status.style.color =
                rebuildNote || (basemap?.hint && getMapPickerShowBasemap())
                    ? '#fa0'
                    : '#8ab4f8';
        };

        const paintBasemap = (w: number, h: number): void => {
            if (!getMapPickerShowBasemap() || !basemap) return;
            const { manifest, image } = basemap;
            const src = basemapSourceRect(
                centreX,
                centreZ,
                tilesAcross(),
                w,
                h,
                manifest.origin,
                manifest.sizeTiles,
                manifest.pixelsPerTile
            );
            const theme = resolveMapPickerDotTheme();
            ctx.save();
            ctx.globalAlpha = level === 0 ? 1 : 0.4;
            try {
                ctx.drawImage(image, src.sx, src.sy, src.sw, src.sh, 0, 0, w, h);
                if (theme.showFreeTint && basemap.freeOverlay) {
                    ctx.drawImage(basemap.freeOverlay, src.sx, src.sy, src.sw, src.sh, 0, 0, w, h);
                }
                if (theme.showMultiTint && basemap.multiOverlay) {
                    ctx.drawImage(basemap.multiOverlay, src.sx, src.sy, src.sw, src.sh, 0, 0, w, h);
                }
                if (theme.keyIconTypes.length > 0) {
                    if (basemap.keyTypeOverlays && basemap.keyTypeOverlays.size > 0) {
                        for (const name of theme.keyIconTypes) {
                            const id = keyNameToTypeId(name);
                            if (id === null) continue;
                            const layer = basemap.keyTypeOverlays.get(String(id));
                            if (layer) {
                                ctx.drawImage(layer, src.sx, src.sy, src.sw, src.sh, 0, 0, w, h);
                            }
                        }
                    } else if (basemap.keyOverlay) {
                        ctx.drawImage(basemap.keyOverlay, src.sx, src.sy, src.sw, src.sh, 0, 0, w, h);
                    }
                }
                if (theme.showPlaceLabels && basemap.labelsOverlay) {
                    ctx.drawImage(basemap.labelsOverlay, src.sx, src.sy, src.sw, src.sh, 0, 0, w, h);
                }
            } catch {
                /* out-of-bounds source rects — skip frame */
            }
            ctx.restore();
        };

        let paintRaf = 0;
        let closed = false;

        const paintNow = (): void => {
            if (closed) return;
            const w = canvas.width;
            const h = canvas.height;
            ctx.fillStyle = '#0a0e14';
            ctx.fillRect(0, 0, w, h);

            if (!finder) {
                ctx.fillStyle = '#666';
                ctx.font = '14px sans-serif';
                ctx.fillText(loadError ?? 'Loading collision pack…', 24, 40);
                setStatus();
                return;
            }

            paintBasemap(w, h);

            const ppt = pxPerTile();
            const halfW = tilesAcross() / 2;
            const halfH = (h / w) * halfW;
            const step = cappedSampleStep(zoom, tilesAcross(), halfH * 2);
            const minX = Math.floor(centreX - halfW) - step;
            const maxX = Math.ceil(centreX + halfW) + step;
            const minZ = Math.floor(centreZ - halfH) - step;
            const maxZ = Math.ceil(centreZ + halfH) + step;

            syncBasemapChrome();
            const theme = resolveMapPickerDotTheme();
            if (theme.showWalkable) {
                const size = Math.max(1, Math.min(4, ppt * 0.45));
                const half = size / 2;
                ctx.fillStyle = theme.fill;
                for (let x = minX; x <= maxX; x += step) {
                    for (let z = minZ; z <= maxZ; z += step) {
                        if (!finder.walkable(x, z, level)) continue;
                        const { sx, sy } = worldToScreen(x, z);
                        if (sx < -4 || sy < -4 || sx > w + 4 || sy > h + 4) continue;
                        ctx.fillRect(sx - half, sy - half, size, size);
                    }
                }

                ctx.font = '11px sans-serif';
                for (const dest of WALK_DESTINATIONS) {
                    if (dest.level !== level) continue;
                    const { sx, sy } = worldToScreen(dest.x, dest.z);
                    if (sx < 0 || sy < 0 || sx > w || sy > h) continue;
                    ctx.fillStyle = '#00ffff';
                    ctx.fillRect(sx - 3, sy - 3, 6, 6);
                    ctx.strokeStyle = '#000';
                    ctx.strokeRect(sx - 3, sy - 3, 6, 6);
                    ctx.fillStyle = '#9cf';
                    ctx.fillText(dest.name, sx + 6, sy + 4);
                }
            }

            if (selected && selected.level === level) {
                const { sx, sy } = worldToScreen(selected.x, selected.z);
                ctx.strokeStyle = '#ff0';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(sx - 12, sy);
                ctx.lineTo(sx + 12, sy);
                ctx.moveTo(sx, sy - 12);
                ctx.lineTo(sx, sy + 12);
                ctx.stroke();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 4;
                ctx.globalCompositeOperation = 'destination-over';
                ctx.beginPath();
                ctx.moveTo(sx - 12, sy);
                ctx.lineTo(sx + 12, sy);
                ctx.moveTo(sx, sy - 12);
                ctx.lineTo(sx, sy + 12);
                ctx.stroke();
                ctx.globalCompositeOperation = 'source-over';
                ctx.lineWidth = 1;
            }

            if (here && here.level === level) {
                const { sx, sy } = worldToScreen(here.x + 0.5, here.z + 0.5);
                if (sx >= -20 && sy >= -20 && sx <= w + 20 && sy <= h + 20) {
                    paintYouAreHere(ctx, sx, sy, theme.showBasemap, basemap?.playerMarker ?? null);
                }
            }

            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath();
            ctx.moveTo(w / 2, 0);
            ctx.lineTo(w / 2, h);
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            ctx.stroke();

            setStatus();
        };

        const requestPaint = (): void => {
            if (closed || paintRaf !== 0) return;
            paintRaf = requestAnimationFrame(() => {
                paintRaf = 0;
                paintNow();
            });
        };

        const settingsModal = new ParamsModal(() => false, () => requestPaint());

        const unsubSettings = SettingsStore.onChange((name, key) => {
            if (name === MAP_PICKER_SETTINGS_NS && isMapPickerThemeSettingKey(key)) {
                requestPaint();
            }
        });

        // Poll stand tile lightly (no BotHost tick in harness) while open.
        const hereTimer = window.setInterval(() => {
            if (closed) return;
            const next = readPlayerTile();
            const key = tileKey(next);
            if (key === hereKey) return;
            hereKey = key;
            here = next;
            requestPaint();
        }, 500);

        const cleanup = (): void => {
            closed = true;
            if (paintRaf !== 0) {
                cancelAnimationFrame(paintRaf);
                paintRaf = 0;
            }
            clearInterval(hereTimer);
            unsubSettings();
            settingsModal.close();
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointercancel', onPointerUp);
            canvas.removeEventListener('click', onClick);
            window.removeEventListener('keydown', onKey);
            overlay.remove();
        };

        const finish = (value: PickedTile | null): void => {
            cleanup();
            resolve(value);
        };

        cancelBtn.addEventListener('click', () => finish(null));
        confirmBtn.addEventListener('click', () => {
            if (selected) finish(selected);
        });

        levelSelect.addEventListener('change', () => {
            level = Number(levelSelect.value) || 0;
            selected = null;
            confirmBtn.disabled = true;
            requestPaint();
        });

        const clampZoom = (z: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

        zoomIn.addEventListener('click', () => {
            zoom = clampZoom(zoom * 1.25);
            requestPaint();
        });
        zoomOut.addEventListener('click', () => {
            zoom = clampZoom(zoom / 1.25);
            requestPaint();
        });
        meBtn.addEventListener('click', () => {
            const me = readPlayerTile();
            if (me) {
                centreX = me.x;
                centreZ = me.z;
                level = me.level;
                levelSelect.value = String(level);
                requestPaint();
            }
        });

        settingsBtn.addEventListener('click', () => {
            // Persist all MapPicker keys on change (including bake prefs).
            // Upstream discards uncommitted bake drafts on close — that made
            // Rebuild options look broken in the harness.
            settingsModal.open(MAP_PICKER_SETTINGS_NS, MAP_PICKER_SETTINGS, {
                title: 'Map picker settings',
                zIndex: 1200,
                intro:
                    'Worldmap layers (Key / multi / free / place names) toggle free after a live Rebuild. '
                    + '“Basemap rebuild” stamps only apply the next time you click Rebuild map…'
            });
        });

        rebuildBtn.addEventListener('click', () => {
            if (rebuildBtn.disabled || !getMapPickerShowBasemap()) return;
            void (async () => {
                const skip = new SettingsBag(
                    SettingsStore.resolve(MAP_PICKER_SETTINGS_NS, MAP_PICKER_SETTINGS)
                ).bool('skipRebuildConfirm', false);

                if (!skip) {
                    const answer = await showConfirmDialog({
                        title: BASEMAP_REGEN_TITLE,
                        body: BASEMAP_REGEN_BODY,
                        dontAskAgainLabel: "Don't ask again",
                        confirmLabel: 'Yes, rebuild',
                        cancelLabel: 'No',
                        zIndex: 1300
                    });
                    if (!answer.confirmed) return;
                    if (answer.dontAskAgain) {
                        SettingsStore.save(MAP_PICKER_SETTINGS_NS, 'skipRebuildConfirm', 'true');
                    }
                }

                if (closed) return;
                rebuildBtn.disabled = true;
                rebuildNote = 'rebuilding…';
                status.textContent = 'rebuilding basemap…';
                status.style.color = '#fa0';
                try {
                    const prefs = resolveBasemapBakePrefs();
                    const next = await regenerateBasemap(prefs, msg => {
                        if (closed) return;
                        rebuildNote = msg;
                        status.textContent = `rebuild: ${msg}`;
                        status.style.color = '#fa0';
                    });
                    if (closed) return;
                    const crcKey = await fetchClientCrcKey();
                    if (crcKey) {
                        try {
                            await saveRegeneratedBasemapLocally(crcKey, prefs, next.manifest, next.image);
                        } catch {
                            /* optional */
                        }
                    }
                    // Live terrain + free-toggle overlays (same origin as terrain).
                    const installed: LoadedBasemap = {
                        manifest: next.manifest,
                        image: next.image,
                        multiOverlay: next.multiOverlay,
                        freeOverlay: next.freeOverlay,
                        labelsOverlay: next.labelsOverlay,
                        keyOverlay: next.keyOverlay,
                        keyTypeOverlays: next.keyTypeOverlays
                    };
                    installBasemapOverride(installed);
                    basemap = installed;
                    liveGenAtInstall = getLiveBasemapGeneration();
                    setBasemapAttr('ready');
                    const layerBits = [
                        next.multiOverlay ? 'multi' : null,
                        next.freeOverlay ? 'free' : null,
                        next.labelsOverlay ? 'labels' : null,
                        next.keyTypeOverlays?.size ? `keys×${next.keyTypeOverlays.size}` : null
                    ]
                        .filter(Boolean)
                        .join('+');
                    rebuildNote = `REBUILT live · ${next.nonzeroSamples} px · layers ${layerBits || 'terrain-only'} · ${next.manifest.fingerprint}`;
                    instruction.textContent =
                        'Live MapView basemap. Settings → Worldmap layers toggles Key / multi / free / place names (no rebuild).';
                    status.textContent = rebuildNote;
                    status.style.color = '#7d7';
                    paintNow();
                } catch (err) {
                    if (closed) return;
                    const msg = err instanceof Error ? err.message : String(err);
                    rebuildNote = null;
                    status.textContent = `rebuild: ${msg}`;
                    status.style.color = '#f88';
                    console.error('[harness] basemap rebuild failed', err);
                } finally {
                    if (!closed) rebuildBtn.disabled = false;
                }
            })();
        });

        const onWheel = (e: WheelEvent): void => {
            e.preventDefault();
            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            const rect = canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const before = screenToWorld(sx, sy);
            zoom = clampZoom(zoom * factor);
            const after = screenToWorld(sx, sy);
            centreX += before.x - after.x;
            centreZ += before.z - after.z;
            requestPaint();
        };

        const onPointerDown = (e: PointerEvent): void => {
            if (e.button !== 0) return;
            dragging = true;
            lastMx = e.clientX;
            lastMy = e.clientY;
            canvas.setPointerCapture(e.pointerId);
            canvas.style.cursor = 'grabbing';
        };

        const onPointerMove = (e: PointerEvent): void => {
            if (!dragging) return;
            const ppt = pxPerTile();
            const dx = e.clientX - lastMx;
            const dy = e.clientY - lastMy;
            lastMx = e.clientX;
            lastMy = e.clientY;
            centreX -= dx / ppt;
            centreZ += dy / ppt;
            requestPaint();
        };

        const onPointerUp = (e: PointerEvent): void => {
            if (!dragging) return;
            dragging = false;
            canvas.style.cursor = 'crosshair';
            try {
                canvas.releasePointerCapture(e.pointerId);
            } catch {
                /* ignore */
            }
            requestPaint();
        };

        canvas.addEventListener('pointerdown', e => {
            downX = e.clientX;
            downY = e.clientY;
            onPointerDown(e);
        });

        const onClick = (e: MouseEvent): void => {
            if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
            if (!finder) return;
            const rect = canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const w = screenToWorld(sx, sy);
            const snap = nearestWalkable(finder, w.x, w.z, level, 12);
            if (!snap) {
                status.textContent = 'no walkable tile nearby — zoom in or pan';
                status.style.color = '#fa0';
                return;
            }
            selected = { x: snap.x, z: snap.z, level };
            confirmBtn.disabled = false;
            requestPaint();
        };

        const onKey = (e: KeyboardEvent): void => {
            if (e.key !== 'Escape') return;
            if (settingsModal.isOpen()) {
                e.preventDefault();
                e.stopPropagation();
                settingsModal.close();
                return;
            }
            if (document.querySelector('.rs2b0t-confirm-backdrop')) return;
            finish(null);
        };

        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);
        canvas.addEventListener('click', onClick);
        window.addEventListener('keydown', onKey);

        void loadBasemap()
            .then(bm => {
                if (closed) return;
                // Do not clobber a live Rebuild that finished while deploy PNG was still loading.
                if (liveGenAtInstall > 0 && getLiveBasemapGeneration() >= liveGenAtInstall) {
                    requestPaint();
                    return;
                }
                if (basemap?.manifest?.revision === 'live-regen-377') {
                    requestPaint();
                    return;
                }
                if (bm) {
                    basemap = bm;
                    basemapState = 'ready';
                    syncBasemapChrome();
                } else {
                    basemapState = 'missing';
                    syncBasemapChrome();
                }
                requestPaint();
            })
            .catch(() => {
                if (closed) return;
                if (basemap?.manifest?.revision === 'live-regen-377') return;
                basemapState = 'error';
                syncBasemapChrome();
                requestPaint();
            });

        requestPaint();
    });
}

/** rs2b0t-shaped class API. */
export class WorldMapPicker {
    public static open(initial?: Partial<PickedTile>): Promise<PickedTile | null> {
        return openWorldMapPicker({
            level: initial?.level,
            x: initial?.x,
            z: initial?.z
        });
    }
}
