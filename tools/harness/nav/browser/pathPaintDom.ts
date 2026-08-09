/**
 * HTML path paint — hop **labels only**.
 *
 * Path / client-trail **tiles** are scene quads (pathScenePaint → Pix2D during
 * onAfterWorldRender), matching rs2b0t: four-corner projectTileQuad, not center dots.
 *
 * rs2b0t Overlay also draws labelsOnly on the HTML canvas; tile fills live in
 * pathScenePaint. This module is the same split for the harness.
 *
 * DOM label loop is off unless `?PATH_PAINT_DOM=1` (hop captions). Tile paint
 * defaults ON via pathScenePaint (NAV_PAINT=0 to disable both).
 *
 * Defaults (hard-coded for operator; rs2b0t settings default-off):
 *   pack path + client trail ON; scene-expand experimental OFF.
 */
import { PathPublish } from '../pathPublish.ts';

let root: HTMLDivElement | null = null;
let raf = 0;

/** Hard-coded operator prefs (not SettingsStore). */
export type NavPaintDefaults = {
    showPath: boolean;
    hopLabels: boolean;
    /** Cyan tryMove trail (rs2b0t navPathClientSegment) — painted as tiles in pathScenePaint. */
    clientTrail: boolean;
    /** Experimental scene BFS expand — keep false (even on 274). */
    sceneExpand: boolean;
};

const paintPrefs: NavPaintDefaults = {
    showPath: true,
    hopLabels: true,
    clientTrail: true,
    sceneExpand: false
};

export function setNavPaintDefaults(partial: Partial<NavPaintDefaults>): void {
    Object.assign(paintPrefs, partial);
}

export function getNavPaintDefaults(): Readonly<NavPaintDefaults> {
    return paintPrefs;
}

export function isNavPaintEnabled(): boolean {
    try {
        const g = (globalThis as { __navPaint?: boolean }).__navPaint;
        if (g === false) return false;
        if (g === true) return paintPrefs.showPath;
        return paintPrefs.showPath;
    } catch {
        return paintPrefs.showPath;
    }
}

export function setNavPaintEnabled(on: boolean): void {
    (globalThis as { __navPaint?: boolean }).__navPaint = on;
    paintPrefs.showPath = on;
    if (!on) clearPaintDom();
}

export function isClientTrailEnabled(): boolean {
    return paintPrefs.clientTrail && isNavPaintEnabled();
}

function ensureRoot(): HTMLDivElement | null {
    const stage = document.getElementById('game-stage');
    if (!stage) return null;
    if (root && root.isConnected) return root;
    root = document.createElement('div');
    root.id = 'nav-path-overlay';
    root.style.cssText =
        'position:absolute;inset:0;pointer-events:none;z-index:5;overflow:hidden;font:11px ui-monospace,Menlo,monospace;color:#8f8;';
    stage.style.position = stage.style.position || 'relative';
    stage.appendChild(root);
    return root;
}

function clearPaintDom(): void {
    if (root) root.replaceChildren();
}

/**
 * Tile centre → CSS % on #game-stage.
 * Uses four-corner projection average when available (same as rs2b0t quadCenter),
 * never a bare world-space heuristic for path tiles.
 */
function tileCenterCss(tile: { x: number; z: number }): { left: string; top: string } | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const project = (globalThis as any).__lc377?.reader?.projectAreaGameWorld as
        | ((wx: number, wz: number, h: number, u: number, v: number) => { x: number; y: number } | null)
        | undefined;
    if (typeof project !== 'function') return null;

    // Four corners (SW,SE,NE,NW) — same u,v as pathOverlay.projectTileQuad.
    const corners = [
        project(tile.x, tile.z, 0, 0, 0),
        project(tile.x, tile.z, 0, 1, 0),
        project(tile.x, tile.z, 0, 1, 1),
        project(tile.x, tile.z, 0, 0, 1)
    ];
    if (corners.some(c => !c || !Number.isFinite(c.x) || !Number.isFinite(c.y))) return null;
    const cx = (corners[0]!.x + corners[1]!.x + corners[2]!.x + corners[3]!.x) / 4;
    const cy = (corners[0]!.y + corners[1]!.y + corners[2]!.y + corners[3]!.y) / 4;
    // areaGame is drawn at (4,4) inside 765×503 canvas; stage CSS stretches that canvas.
    const left = ((cx + 4) / 765) * 100;
    const top = ((cy + 4) / 503) * 100;
    if (left < -5 || left > 105 || top < -5 || top > 105) return null;
    return { left: `${left}%`, top: `${top}%` };
}

/** Hop captions only — never path dots (tiles are scene quads). */
function paintLabelsOnce(): void {
    if (!isNavPaintEnabled() || !paintPrefs.hopLabels) {
        clearPaintDom();
        return;
    }
    const el = ensureRoot();
    if (!el) return;
    const path = PathPublish.get();
    el.replaceChildren();
    if (!path?.tiles?.length) return;

    path.tiles.forEach((t, i) => {
        if (i < path.pathIdx - 1) return;
        if (!t.transport || !t.label) return;
        const pos = tileCenterCss(t);
        if (!pos) return;
        const lab = document.createElement('div');
        lab.textContent = t.label;
        lab.style.cssText = `position:absolute;left:${pos.left};top:${pos.top};transform:translate(-50%,-120%);
          background:rgba(0,0,0,0.65);padding:1px 4px;border-radius:2px;white-space:nowrap;color:#fff;font-size:11px;
          text-shadow:1px 1px 0 #000;`;
        el.appendChild(lab);
    });
}

/**
 * Optional hop-label DOM loop. Preferred tile paint is pathScenePaint
 * (onAfterWorldRender tile quads). Enable labels: `?PATH_PAINT_DOM=1`.
 */
export function startPathPaintLoop(): void {
    const wantDom =
        typeof location !== 'undefined' &&
        (location.search.includes('PATH_PAINT_DOM=1') || location.search.includes('pathPaintDom=1'));
    if (!wantDom) {
        clearPaintDom();
        return;
    }
    if (raf) return;
    const tick = () => {
        raf = requestAnimationFrame(tick);
        paintLabelsOnce();
    };
    raf = requestAnimationFrame(tick);
}

export function stopPathPaintLoop(): void {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    clearPaintDom();
}
