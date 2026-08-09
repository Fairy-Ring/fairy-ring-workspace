/**
 * Optional orbit-camera path facing (client-only).
 * Port of rs2b0t `src/bot/nav/cameraFollow.ts` for harness.
 *
 * Yaw math matches the client's cinema look-at:
 *   yaw = (atan2(dx, dz) * -325.949) & 0x7ff
 *
 * Smoothing runs on rAF (game draw cadence), not the walk tick.
 *
 * Harness default ON (rs2b0t Global.navCameraFollow defaults off).
 * Disable: `?NAV_CAMERA=0` or setNavCameraFollow(false).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function abi(): Any {
    return (globalThis as Any).__lc377;
}

/** Scene-unit / tile delta → orbit camera yaw (0–2047). */
export function yawTowardDelta(dx: number, dz: number): number {
    if (dx === 0 && dz === 0) return 0;
    return ((Math.atan2(dx, dz) * -325.949) | 0) & 0x7ff;
}

/** Shortest signed yaw delta in (-1024, 1024]. */
export function yawDelta(from: number, to: number): number {
    let d = (to - from) & 0x7ff;
    if (d > 1024) d -= 2048;
    return d;
}

/** Step current yaw toward target by at most maxStep units. */
export function stepYaw(current: number, target: number, maxStep: number): number {
    if (maxStep <= 0) return target & 0x7ff;
    const d = yawDelta(current, target);
    if (d > maxStep) return (current + maxStep) & 0x7ff;
    if (d < -maxStep) return (current - maxStep) & 0x7ff;
    return target & 0x7ff;
}

/**
 * Ease toward target: blend of error + velocity damping (mirrors client keycam feel).
 */
export function easeYaw(
    current: number,
    target: number,
    velocity: number,
    opts?: { gain?: number; maxSpeed?: number; damping?: number; deadzone?: number }
): { yaw: number; velocity: number } {
    const gain = opts?.gain ?? 0.14;
    const maxSpeed = opts?.maxSpeed ?? 18;
    const damping = opts?.damping ?? 0.72;
    const deadzone = opts?.deadzone ?? 6;

    const err = yawDelta(current, target);
    if (Math.abs(err) <= deadzone && Math.abs(velocity) < 1) {
        return { yaw: current & 0x7ff, velocity: 0 };
    }

    let desired = err * gain;
    if (desired > maxSpeed) desired = maxSpeed;
    else if (desired < -maxSpeed) desired = -maxSpeed;

    let v = velocity * damping + desired * (1 - damping);
    if (Math.abs(v) < 0.15) v = 0;

    const next = (current + Math.round(v / 2)) & 0x7ff;
    return { yaw: next, velocity: v };
}

export interface TileLike {
    x: number;
    z: number;
    level?: number;
    transport?: unknown;
}

/** Look-ahead tile on the path (less twitchy than every footstep). */
export function lookAheadTile(tiles: TileLike[], pathIdx: number, lookAhead = 12): TileLike | null {
    if (tiles.length === 0) return null;
    const i = Math.min(tiles.length - 1, Math.max(0, pathIdx) + Math.max(1, lookAhead));
    return tiles[i] ?? null;
}

const TRANSPORT_JUMP_TILES = 32;

function isTransportBoundary(a: TileLike, b: TileLike): boolean {
    if (a.level !== undefined && b.level !== undefined && a.level !== b.level) return true;
    if (b.transport) return true;
    const dx = Math.abs(b.x - a.x);
    const dz = Math.abs(b.z - a.z);
    return Math.max(dx, dz) >= TRANSPORT_JUMP_TILES;
}

/**
 * Average heading from `from` across path tiles ahead. Stops at transport /
 * level hop so dungeon landings do not yank yaw to the remote side.
 */
export function pathFacingYaw(
    from: TileLike,
    tiles: TileLike[],
    pathIdx: number,
    lookAhead = 12
): number | null {
    if (tiles.length === 0) return null;
    const start = Math.max(0, pathIdx) + 1;
    const end = Math.min(tiles.length - 1, Math.max(0, pathIdx) + Math.max(2, lookAhead));
    if (start > end) return null;
    let dx = 0;
    let dz = 0;
    let n = 0;
    let prev: TileLike = from;
    for (let i = start; i <= end; i++) {
        const t = tiles[i]!;
        if (isTransportBoundary(prev, t)) break;
        if (from.level !== undefined && t.level !== undefined && from.level !== t.level) break;
        dx += t.x - from.x;
        dz += t.z - from.z;
        n++;
        prev = t;
    }
    if (n === 0 || (dx === 0 && dz === 0)) return null;
    return yawTowardDelta(dx, dz);
}

export function yawTowardTiles(from: TileLike, to: TileLike): number | null {
    if (from.level !== undefined && to.level !== undefined && from.level !== to.level) return null;
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    if (dx === 0 && dz === 0) return null;
    return yawTowardDelta(dx, dz);
}

const TARGET_RETARGET_MIN = 28;
const STALE_MS = 3000;

let cameraFollowEnabled = true;

export function isNavCameraFollowEnabled(): boolean {
    try {
        if (typeof location !== 'undefined') {
            if (location.search.includes('NAV_CAMERA=0') || location.search.includes('navCamera=0')) {
                return false;
            }
            if (location.search.includes('NAV_CAMERA=1') || location.search.includes('navCamera=1')) {
                return true;
            }
        }
        const g = (globalThis as { __navCameraFollow?: boolean }).__navCameraFollow;
        if (g === false) return false;
        if (g === true) return true;
    } catch {
        /* default */
    }
    return cameraFollowEnabled;
}

export function setNavCameraFollow(on: boolean): void {
    cameraFollowEnabled = on;
    (globalThis as { __navCameraFollow?: boolean }).__navCameraFollow = on;
    if (!on) PathCameraFollow.release();
}

class PathCameraFollowImpl {
    private raf = 0;
    private active = false;
    private desiredYaw: number | null = null;
    private velocity = 0;
    private lastSampleAt = 0;

    private ensureRaf(): void {
        if (this.raf) return;
        if (typeof requestAnimationFrame !== 'function') return;
        const tick = () => {
            this.raf = requestAnimationFrame(tick);
            this.onFrame();
        };
        this.raf = requestAnimationFrame(tick);
    }

    /**
     * Called from the walk follow loop with the latest path-facing yaw.
     */
    samplePathYaw(yaw: number): void {
        if (!isNavCameraFollowEnabled()) {
            this.release();
            return;
        }
        this.ensureRaf();
        this.active = true;
        this.lastSampleAt = performance.now();

        if (this.desiredYaw === null) {
            this.desiredYaw = yaw & 0x7ff;
            return;
        }
        if (Math.abs(yawDelta(this.desiredYaw, yaw)) >= TARGET_RETARGET_MIN) {
            this.desiredYaw = yaw & 0x7ff;
        }
    }

    /** Call when a walkTo finishes so the camera coasts to a stop. */
    release(): void {
        this.active = false;
        this.desiredYaw = null;
        this.velocity = 0;
    }

    /** Also tick from onAfterWorldRender if rAF is throttled in background tabs. */
    onFrame(): void {
        if (!this.active || this.desiredYaw === null) return;
        if (!isNavCameraFollowEnabled()) {
            this.release();
            return;
        }
        const reader = abi()?.reader;
        const actions = abi()?.actions;
        if (!reader?.ingame?.()) return;

        if (performance.now() - this.lastSampleAt > STALE_MS) {
            this.velocity *= 0.6;
            if (Math.abs(this.velocity) < 0.5) this.release();
            return;
        }

        const current =
            typeof reader.cameraYaw === 'function' ? reader.cameraYaw() & 0x7ff : 0;
        const next = easeYaw(current, this.desiredYaw, this.velocity);
        this.velocity = next.velocity;
        if (next.yaw !== current || Math.abs(this.velocity) > 0.2) {
            if (typeof actions?.setCameraYaw === 'function') {
                actions.setCameraYaw(next.yaw);
            } else if (typeof reader.setCameraYaw === 'function') {
                reader.setCameraYaw(next.yaw);
            }
        }
    }
}

export const PathCameraFollow = new PathCameraFollowImpl();
