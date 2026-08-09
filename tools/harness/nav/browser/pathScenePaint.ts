/**
 * HARNESS ADDON — scene path paint as **ground tile quads** (not dots).
 *
 * Port of rs2b0t `pathScenePaint.ts` + `pathOverlay.projectTileQuad`:
 * each path tile is four projected corners (SW/SE/NE/NW) filled/stroked into
 * the live areaGame Pix2D surface during Client.onAfterWorldRender.
 * Same projection as the 3D scene — HTML center-dots misalign under camera.
 *
 * Harness client-fork only. Pure Client-TS has no paint hook.
 *
 * Defaults (hard-coded for operator; rs2b0t settings default-off):
 *   pack path tiles ON (red), hops green, click white, client tryMove trail ON (cyan/yellow)
 *   scene-expand BFS OFF (experimental even on 274)
 *
 * @see docs/decisions/005-port-rs2b0t-nav.md
 * @see docs/decisions/006-harness-client-fork.md
 */
import Pix2D from '../../../../vendor/client-ts/src/graphics/Pix2D.ts';
import { PathPublish, type PublishedPathTile } from '../pathPublish.ts';
import { getNavPaintDefaults, isNavPaintEnabled, isClientTrailEnabled } from './pathPaintDom.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

type Corner = { x: number; y: number };
type Quad = [Corner, Corner, Corner, Corner];

const PATH_RGB = 0xff0000;
const HOP_RGB = 0x00ff00;
const CLICK_RGB = 0xffffff;
const CLIENT_RGB = 0x00d4ff;
const CLIENT_RUN_ALT = 0xffff00;

function abi(): Any {
    return (globalThis as Any).__lc377;
}

type ProjectCorner = (x: number, z: number, u: number, v: number) => Corner | null;

function projectTileQuad(tile: PublishedPathTile, project: ProjectCorner): Quad | null {
    const sw = project(tile.x, tile.z, 0, 0);
    const se = project(tile.x, tile.z, 1, 0);
    const ne = project(tile.x, tile.z, 1, 1);
    const nw = project(tile.x, tile.z, 0, 1);
    if (!sw || !se || !ne || !nw) return null;
    return [sw, se, ne, nw];
}

function alphaByte(a: number): number {
    return Math.max(0, Math.min(255, Math.round(a * 256)));
}

function fillTri(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    rgb: number,
    alpha: number
): void {
    let ax = x0 | 0;
    let ay = y0 | 0;
    let bx = x1 | 0;
    let by = y1 | 0;
    let cx = x2 | 0;
    let cy = y2 | 0;
    if (ay > by) {
        [ax, bx] = [bx, ax];
        [ay, by] = [by, ay];
    }
    if (ay > cy) {
        [ax, cx] = [cx, ax];
        [ay, cy] = [cy, ay];
    }
    if (by > cy) {
        [bx, cx] = [cx, bx];
        [by, cy] = [cy, by];
    }
    if (ay === cy) return;
    const a = alphaByte(alpha);
    for (let y = ay; y <= cy; y++) {
        let xL: number;
        let xR: number;
        if (y < by) {
            const t0 = ay === by ? 0 : (y - ay) / (by - ay);
            const t1 = ay === cy ? 0 : (y - ay) / (cy - ay);
            xL = ax + (bx - ax) * t0;
            xR = ax + (cx - ax) * t1;
        } else {
            const t0 = by === cy ? 0 : (y - by) / (cy - by);
            const t1 = ay === cy ? 0 : (y - ay) / (cy - ay);
            xL = bx + (cx - bx) * t0;
            xR = ax + (cx - ax) * t1;
        }
        if (xL > xR) [xL, xR] = [xR, xL];
        const x0i = Math.floor(xL);
        const w = Math.ceil(xR) - x0i;
        // Pix2D API is fillRectTrans (not fillsRectTrans — rs2b0t source typo).
        if (w > 0) Pix2D.fillRectTrans(x0i, y, w, 1, rgb, a);
    }
}

function fillQuad(corners: Quad, rgb: number, alpha: number): void {
    fillTri(corners[0].x, corners[0].y, corners[1].x, corners[1].y, corners[2].x, corners[2].y, rgb, alpha);
    fillTri(corners[0].x, corners[0].y, corners[2].x, corners[2].y, corners[3].x, corners[3].y, rgb, alpha);
}

function drawLine(x0: number, y0: number, x1: number, y1: number, rgb: number, alpha: number): void {
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    const a = alphaByte(alpha);
    for (;;) {
        Pix2D.fillRectTrans(x, y, 1, 1, rgb, a);
        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x += sx;
        }
        if (e2 < dx) {
            err += dx;
            y += sy;
        }
    }
}

function strokeQuad(corners: Quad, rgb: number, alpha: number): void {
    const pts = [corners[0], corners[1], corners[2], corners[3], corners[0]];
    for (let i = 0; i < 4; i++) {
        const p0 = pts[i]!;
        const p1 = pts[i + 1]!;
        drawLine(p0.x | 0, p0.y | 0, p1.x | 0, p1.y | 0, rgb, alpha);
    }
}

/** Drop tiles behind player on an ordered trail (client-trail continuous paint). */
function remainingPathFromPlayer(
    path: readonly PublishedPathTile[],
    me: { x: number; z: number; level: number }
): PublishedPathTile[] {
    if (!path.length) return [];
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < path.length; i++) {
        const t = path[i]!;
        if (t.level !== me.level) continue;
        const d = Math.max(Math.abs(t.x - me.x), Math.abs(t.z - me.z));
        if (d < bestD) {
            bestD = d;
            best = i;
        }
    }
    return path.slice(best);
}

/** Dense Chebyshev fill between sparse pack waypoints (no experimental scene BFS). */
function densifyPath(tiles: PublishedPathTile[]): PublishedPathTile[] {
    if (tiles.length < 2) return tiles.slice();
    const out: PublishedPathTile[] = [{ ...tiles[0]! }];
    for (let i = 1; i < tiles.length; i++) {
        const prev = tiles[i - 1]!;
        const next = tiles[i]!;
        if (next.transport || next.level !== prev.level) {
            out.push({ ...next });
            continue;
        }
        const dx = Math.sign(next.x - prev.x);
        const dz = Math.sign(next.z - prev.z);
        const steps = Math.max(Math.abs(next.x - prev.x), Math.abs(next.z - prev.z));
        for (let s = 1; s <= steps; s++) {
            const isLast = s === steps;
            out.push({
                x: prev.x + dx * s,
                z: prev.z + dz * s,
                level: next.level,
                transport: isLast ? next.transport : undefined,
                label: isLast ? next.label : undefined,
                locX: isLast ? next.locX : undefined,
                locZ: isLast ? next.locZ : undefined,
                locId: isLast ? next.locId : undefined,
                locName: isLast ? next.locName : undefined,
                action: isLast ? next.action : undefined,
                kind: isLast ? next.kind : undefined
            });
        }
    }
    return out;
}

/**
 * Call only from harness Client fork `onAfterWorldRender` while Pix2D = areaGame.
 *
 * Classic dual paint (rs2b0t):
 *   1. **Red** — baked pack path (`PathPublish.tiles`, remaining from pathIdx)
 *   2. **Cyan / yellow checker** — client tryMove trail (`clientSegment`) when run is on
 *      (solid cyan while walking)
 */
export function paintNavPathInGame(_client: unknown): void {
    if (!isNavPaintEnabled()) return;
    const prefs = getNavPaintDefaults();
    if (!prefs.showPath) return;

    const path = PathPublish.get();
    if (!path || !path.tiles.length) return;

    const reader = abi()?.reader;
    if (!reader?.worldTile || typeof reader.projectAreaGameWorld !== 'function') return;
    const me = reader.worldTile();
    if (!me) return;

    const project: ProjectCorner = (x, z, u, v) => reader.projectAreaGameWorld(x, z, 0, u, v);

    // ── 1) Pack / baked path (red tiles, green hops) ─────────────────────────
    // WalkAlong already expands dense; densify only fills sparse re-publishes.
    const packTiles = densifyPath(path.tiles);
    // pathIdx is on the published (often already dense) array — clamp, don't re-map.
    const from = Math.max(0, Math.min(path.pathIdx, packTiles.length - 1) - 2);
    for (let i = from; i < packTiles.length; i++) {
        const t = packTiles[i]!;
        if (t.level !== me.level) continue;
        const corners = projectTileQuad(t, project);
        if (!corners) continue;
        const done = i < path.pathIdx;
        if (done) {
            fillQuad(corners, PATH_RGB, 0.12);
            strokeQuad(corners, PATH_RGB, 0.35);
        } else if (t.transport) {
            fillQuad(corners, HOP_RGB, 0.45);
            strokeQuad(corners, HOP_RGB, 0.95);
        } else {
            fillQuad(corners, PATH_RGB, 0.32);
            strokeQuad(corners, PATH_RGB, 0.9);
        }
    }

    // Click target (white) — next pack click
    if (path.clickIdx >= 0 && path.clickIdx < path.tiles.length) {
        const ct = path.tiles[path.clickIdx]!;
        if (ct.level === me.level) {
            const corners = projectTileQuad(ct, project);
            if (corners) {
                strokeQuad(corners, CLICK_RGB, 1);
                const c2 = projectTileQuad(ct, (x, z, u, v) => project(x, z, 0.08 + u * 0.84, 0.08 + v * 0.84));
                if (c2) strokeQuad(c2, CLICK_RGB, 0.85);
            }
        }
    }

    // ── 2) Client tryMove trail (cyan solid / cyan+yellow when run) ───────────
    if (isClientTrailEnabled() && path.clientSegment?.length) {
        let running = false;
        try {
            // Prefer live run flag; adapter may also expose alreadyrunning
            running = !!reader.runEnabled?.();
        } catch {
            running = false;
        }
        // Dense fill if segment is sparse corners only
        const rawSeg = densifyPath(path.clientSegment as PublishedPathTile[]);
        const seg = remainingPathFromPlayer(rawSeg, me);
        for (const t of seg) {
            if (t.level !== me.level) continue;
            const corners = projectTileQuad(t, project);
            if (!corners) continue;
            // Run: checkerboard by world tile (stable as trail trims). Walk: solid cyan.
            const rgb = running && ((t.x + t.z) & 1) === 1 ? CLIENT_RUN_ALT : CLIENT_RGB;
            fillQuad(corners, rgb, running ? 0.55 : 0.45);
            strokeQuad(corners, rgb, 0.95);
        }
    }
}
