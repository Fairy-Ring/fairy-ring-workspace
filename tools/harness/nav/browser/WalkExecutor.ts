/**
 * Classic-mode path follower — full port of rs2b0t WalkExecutor (classic path).
 *
 * - dense corridor via expandWaypoints
 * - locateOnPath + CORRIDOR snap
 * - selectClientWalkTarget + repath budget
 * - handleTransport: specialCrossing → multi-tile door → loc Climb/Open/Balance…
 * - No default v2 tele inject / bank-for-runes (Decision 005 classic)
 *
 * Replaces thin WalkAlong stopgap. Prefer this over hop-by-hop thrash.
 *
 * @see docs/decisions/005-port-rs2b0t-nav.md
 * @see docs/plans/2026-08-04-nav-full-executor-port.md
 * @see rs2b0t src/bot/nav/WalkExecutor.ts
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

import type { TransportInfo, Waypoint } from '../PathFinder.ts';
import { PathPublish, formatHopLabel } from '../pathPublish.ts';
import { findPath, ensureNav } from './NavigatorMain.ts';
import { expandWaypoints, expandChebyshevSegment, localBfsPath } from '../pathExpand.ts';
import { isArrived } from '../arrival.ts';
import { Reachability } from './Reachability.ts';
import {
    chebyshev,
    crossingEligible,
    locateOnPath,
    selectClientWalkTarget,
    starvedTerminalIndex,
    findForwardRecoveryIndex
} from '../followMath.ts';
import { PathCameraFollow, pathFacingYaw } from './cameraFollow.ts';
import { ScriptControl } from '../../script/browser/ScriptControl.ts';
import { Execution, Game, Inventory, Locs, Skills } from '../../script/browser/api.ts';
import { RunManager } from '../../script/browser/RunManager.ts';
import { CANT_REACH, GameMessages } from '../shims/GameMessages.ts';
import {
    SPECIAL_CROSSINGS,
    specialCrossingForTransport,
    meetsRequirement,
    meetsSkill
} from '../data/specialCrossings.ts';
import {
    crossMultiTileDoor,
    isOpenBarrierLeaf,
    noteFailedDoor,
    questLockDoorTileNearPlayer,
    tryNearbyDoor
} from '../exec/doorCrossing.ts';
import { handleSpecialCrossing } from '../exec/specialCrossing.ts';
import {
    findTransportLoc,
    interactTransportLoc,
    matchesTransportLanding,
    multiLandingNeedsRepath,
    openShutTrapdoor
} from '../exec/transportLoc.ts';
import { chatShowsQuestLock, dismissQuestLockDialogue } from '../exec/questLock.ts';
import { DirectNavigator } from './DirectNavigator.ts';

// Re-export helpers tests / callers may use
export {
    findTransportLoc,
    matchesTransportLanding,
    multiLandingNeedsRepath,
    interactTransportLoc
};

const TARGET_STEPS = 20;
const TARGET_JITTER = 4;
const ARRIVE_RADIUS = 4;
const PROGRESS_WINDOW = 26;
const CORRIDOR = 3;
/** Off-path snaps before repath (was 2 — thrash on short detours / hop landings). */
const OFF_CORRIDOR_STRIKES = 5;
/** Loop iterations of no progress before stall recovery (was 6 with +2/iter ≈ 3 loops). */
const STALL_TICKS = 14;
const STALL_REACH_STEPS = 256;
const TRIGGER_REACH_STEPS = 256;
/** Still on same tile before counting as noMoveStall when already near click target. */
const STUCK_ITERS = 20;
const TRANSPORT_TRIGGER = ARRIVE_RADIUS;
/** Full A* rebuilds per walkTo (each burns less if stalls recover on the same path). */
const MAX_REPATHS = 8;
const TRANSPORT_WAIT_MS = 12_000;
const SCENE_STEP_MS = 8000;
const REACH_CHECK_STEPS = 1200;
const DEFAULT_TIMEOUT_MS = 180_000;
/** After Squeeze/Climb/exactmove, wait for idle before client walk or stuck repath. */
const POST_HOP_IDLE_MS = 10_000;
/** Extra follow-loop passes after a hop that suppress stuck→repath. */
const POST_HOP_GRACE_ITERS = 4;

export interface WalkOptions {
    radius?: number;
    timeoutMs?: number;
    log?: (msg: string) => void;
    maxExpansions?: number;
    /** Force classic only for harness (v2 not default). */
    navEngine?: 'classic' | 'v2';
}

interface PathStep {
    x: number;
    z: number;
    level: number;
    transport?: TransportInfo;
}

type FollowResult = 'arrived' | 'closest' | 'blocked' | 'repath' | 'failed' | 'interrupted';

function abi(): Any {
    return (globalThis as Any).__lc377;
}

function worldTile(): { x: number; z: number; level: number } | null {
    const t = abi()?.reader?.worldTile?.();
    if (!t) return null;
    return { x: t.x | 0, z: t.z | 0, level: (t.level ?? 0) | 0 };
}

function issueWalk(wx: number, wz: number): boolean {
    const local = abi()?.reader?.toLocal?.(wx, wz);
    if (!local) return false;
    const a = abi()?.actions;
    if (a?.walkWorld) return !!a.walkWorld(wx, wz);
    if (a?.walkTo) return !!a.walkTo(local.lx, local.lz);
    return false;
}

class WalkExecutorImpl {
    remaining = 0;
    lastOutcome:
        | 'arrived'
        | 'closest'
        | 'blocked'
        | 'budget'
        | 'interrupted'
        | 'failed'
        | 'unreachable'
        | null = null;

    private avoidDoors: { x: number; z: number }[] = [];
    private doorStrikes = new Map<string, number>();
    private sessionBlacklistDoors = new Set<string>();
    private walkDepth = 0;

    async walkTo(
        dest: { x: number; z: number; level?: number },
        opts: WalkOptions = {}
    ): Promise<boolean> {
        const radius = opts.radius ?? 2;
        const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        const log = opts.log ?? ((m: string) => console.log(`[nav] ${m}`));
        // Classic only for harness default (Decision 005)
        if (opts.navEngine === 'v2') {
            log('navEngine=v2 requested but harness default is classic — ignoring tele inject');
        }
        const deadline = performance.now() + timeoutMs;
        this.lastOutcome = null;
        this.resetAvoids();
        this.walkDepth++;

        try {
            await ensureNav();
        } catch (e) {
            log(`nav pack unavailable: ${e}`);
            this.lastOutcome = 'failed';
            this.walkDepth = Math.max(0, this.walkDepth - 1);
            return false;
        }

        try {
            /** Same stand tile across repaths → client refuses the corridor (gap false-open). */
            let stuckTileKey = '';
            let stuckRepaths = 0;
            for (let repaths = 0; repaths <= MAX_REPATHS; repaths++) {
                if (ScriptControl.isStopRequested()) {
                    log('walk interrupted (stop)');
                    this.lastOutcome = 'interrupted';
                    return false;
                }
                if (performance.now() > deadline) {
                    log('walkTo timeout');
                    this.lastOutcome = 'failed';
                    return false;
                }
                const me = worldTile();
                if (!me) {
                    this.lastOutcome = 'failed';
                    return false;
                }
                // Early fail-fast: A* may claim a path (pack patch) while live collision
                // never steps — do not burn MAX_REPATHS × STALL_TICKS on one walkTo.
                const sk = `${me.x},${me.z},${me.level ?? 0}`;
                if (repaths > 0 && sk === stuckTileKey) {
                    stuckRepaths++;
                    if (stuckRepaths >= 2) {
                        log(
                            `giving up: no move from (${me.x},${me.z}) across ${stuckRepaths + 1} repaths (live block?)`
                        );
                        this.lastOutcome = 'failed';
                        return false;
                    }
                } else {
                    stuckTileKey = sk;
                    stuckRepaths = 0;
                }
                const to: Waypoint = {
                    x: dest.x,
                    z: dest.z,
                    level: dest.level ?? me.level ?? 0
                };
                if (isArrived(me, to, radius, Reachability.arrivalProbe())) {
                    this.lastOutcome = 'arrived';
                    return true;
                }

                const avoid = this.avoidList();
                let path;
                try {
                    path = await findPath(me, to, {
                        maxExpansions: opts.maxExpansions,
                        // PathFinder key: locX|locZ (pipe)
                        avoidDoors: avoid.length
                            ? new Set(avoid.map(d => `${d.x}|${d.z}`))
                            : undefined
                    });
                } catch (e) {
                    log(`findPath threw: ${e}`);
                    this.lastOutcome = 'failed';
                    return false;
                }
                if (!path.ok) {
                    log(`findPath fail: ${path.reason} expanded=${path.expanded}`);
                    this.lastOutcome = 'failed';
                    return false;
                }

                const tiles = expandWaypoints(
                    path.waypoints.map(w => ({
                        x: w.x,
                        z: w.z,
                        level: w.level,
                        transport: w.transport
                    }))
                ) as PathStep[];

                log(
                    `path ok cost=${path.cost} wp=${path.waypoints.length} dense=${tiles.length} ms=${path.elapsedMs?.toFixed?.(0) ?? '?'}${repaths > 0 ? ` repath=${repaths}` : ''} doors=${path.hops?.filter(h => h.kind === 'door').length ?? 0}`
                );
                this.publishPath(tiles, 0, -1);

                const terminal = tiles[tiles.length - 1];
                if (terminal && me.level === terminal.level && me.x === terminal.x && me.z === terminal.z) {
                    if (!isArrived(me, to, radius, Reachability.arrivalProbe())) {
                        log(
                            `dest (${to.x},${to.z}) unreachable beyond (${me.x},${me.z}) — nearest reachable tile`
                        );
                        this.lastOutcome = 'closest';
                        return true;
                    }
                    this.lastOutcome = 'arrived';
                    return true;
                }

                const result = await this.followPath(tiles, to, radius, deadline, log);
                if (result === 'arrived') {
                    this.lastOutcome = 'arrived';
                    return true;
                }
                if (result === 'closest') {
                    this.lastOutcome = 'closest';
                    return true;
                }
                if (result === 'blocked') {
                    this.lastOutcome = 'blocked';
                    return true;
                }
                if (result === 'failed') {
                    this.lastOutcome = 'failed';
                    return false;
                }
                if (result === 'interrupted') {
                    log('walk interrupted');
                    this.lastOutcome = 'interrupted';
                    return false;
                }
                // repath — brief settle so we do not hammer A* while still animating
                await Execution.delayTicks(3);
            }
            log(`giving up after ${MAX_REPATHS} repaths`);
            this.lastOutcome = 'failed';
            return false;
        } finally {
            this.walkDepth = Math.max(0, this.walkDepth - 1);
            this.remaining = 0;
            PathPublish.clear();
            PathCameraFollow.release();
        }
    }

    blacklistDoor(x: number, z: number): void {
        this.sessionBlacklistDoors.add(`${x}|${z}`);
        this.avoidDoors.push({ x, z });
    }

    tryNearbyDoor(log: (msg: string) => void): Promise<boolean> {
        return tryNearbyDoor(log);
    }

    private avoidList(): { x: number; z: number }[] {
        return [
            ...this.avoidDoors,
            ...[...this.sessionBlacklistDoors].map(k => {
                const [x, z] = k.split('|').map(Number);
                return { x: x!, z: z! };
            })
        ];
    }

    private resetAvoids(): void {
        this.doorStrikes.clear();
        this.avoidDoors = [];
        // Prefilter special crossings we cannot afford (item / skill)
        for (const sc of SPECIAL_CROSSINGS) {
            try {
                const shortItem =
                    !!sc.requires &&
                    !meetsRequirement(Inventory.count(sc.requires.item), sc.requires);
                const shortSkill =
                    !!sc.requiresSkill &&
                    !meetsSkill(Skills.level(sc.requiresSkill.name), sc.requiresSkill);
                if (shortItem || shortSkill) {
                    this.avoidDoors.push({ x: sc.x, z: sc.z });
                }
            } catch {
                /* optional at boot before adapter */
            }
        }
        for (const key of this.sessionBlacklistDoors) {
            const [x, z] = key.split('|').map(Number);
            this.avoidDoors.push({ x: x!, z: z! });
        }
    }

    private publishClientWalkSegment(
        from: { x: number; z: number; level: number },
        to: { x: number; z: number; level: number }
    ): void {
        try {
            const reader = abi()?.reader;
            const clientPath =
                typeof reader?.lastWalkPathWorld === 'function' ? reader.lastWalkPathWorld() : [];
            if (Array.isArray(clientPath) && clientPath.length >= 2) {
                PathPublish.setClientSegment(clientPath);
                return;
            }
            if (from.level === to.level && typeof reader?.collisionFlags === 'function') {
                const a = reader.toLocal?.(from.x, from.z);
                const b = reader.toLocal?.(to.x, to.z);
                if (a && b) {
                    const path = localBfsPath((lx, lz) => reader.collisionFlags(lx, lz), a, b, 2000);
                    if (path && path.length >= 2) {
                        PathPublish.setClientSegment(
                            path.map(p => ({
                                x: from.x + (p.lx - a.lx),
                                z: from.z + (p.lz - a.lz),
                                level: from.level
                            }))
                        );
                        return;
                    }
                }
            }
            const filled = expandChebyshevSegment(from, to);
            PathPublish.setClientSegment([
                { x: from.x, z: from.z, level: from.level },
                ...filled.map(t => ({ x: t.x, z: t.z, level: to.level }))
            ]);
        } catch {
            /* paint must never abort walk */
        }
    }

    private publishPath(tiles: PathStep[], pathIdx: number, clickIdx: number): void {
        PathPublish.set(
            tiles.map(t => {
                const tr = t.transport;
                if (!tr) return { x: t.x, z: t.z, level: t.level };
                return {
                    x: t.x,
                    z: t.z,
                    level: t.level,
                    transport: true,
                    label: formatHopLabel({
                        locName: tr.locName,
                        action: tr.action,
                        teleportId: tr.teleportId,
                        kind: tr.kind
                    }),
                    locX: tr.locX,
                    locZ: tr.locZ,
                    locId: tr.locId,
                    locName: tr.locName,
                    action: tr.action,
                    kind: tr.kind,
                    teleportId: tr.teleportId
                };
            }),
            pathIdx,
            clickIdx
        );
    }

    private maybeFacePathCamera(
        me: { x: number; z: number; level: number },
        tiles: PathStep[],
        pathIdx: number
    ): void {
        const yaw = pathFacingYaw(me, tiles, pathIdx, 12);
        if (yaw !== null) PathCameraFollow.samplePathYaw(yaw);
    }

    private async followPath(
        tiles: PathStep[],
        dest: { x: number; z: number; level: number },
        radius: number,
        deadline: number,
        log: (msg: string) => void
    ): Promise<FollowResult> {
        let pathIdx = 0;
        let offCorridor = 0;
        let stallTicks = 0;
        let stallRetries = 0;
        let clickIdx = -1;
        let clicks = 0;
        let warnedCombat = false;
        let lastTile: PathStep | null = null;
        let stillIters = 0;
        let walkClickMark: number | null = null;
        let walkClickAt: PathStep | null = null;
        /** Suppress stuck/no-candidate repath while post-hop exactmove settles. */
        let postHopGrace = 0;
        /** One soft retry when client has no walk target (often mid-anim after hop). */
        let noClickRetries = 0;

        RunManager.enable();
        RunManager.tick();

        const inScene = (t: PathStep): boolean => abi()?.reader?.toLocal?.(t.x, t.z) != null;
        const clickable = (t: PathStep): boolean => {
            if (!inScene(t)) return false;
            try {
                if (typeof abi()?.reader?.collisionFlags === 'function') {
                    return (
                        Reachability.canReach(t, { maxSteps: REACH_CHECK_STEPS }) ||
                        chebyshev(worldTile() ?? t, t) <= 12
                    );
                }
            } catch {
                /* fall through */
            }
            return true;
        };

        while (performance.now() < deadline) {
            if (ScriptControl.isStopRequested()) {
                log('walk interrupted (stop)');
                PathCameraFollow.release();
                PathPublish.clear();
                return 'interrupted';
            }
            RunManager.tick();

            const me = worldTile();
            if (!me) return 'failed';

            if (
                walkClickAt &&
                (me.x !== walkClickAt.x || me.z !== walkClickAt.z || me.level !== walkClickAt.level)
            ) {
                walkClickMark = null;
                walkClickAt = null;
            }

            if (
                walkClickMark !== null &&
                walkClickAt !== null &&
                me.x === walkClickAt.x &&
                me.z === walkClickAt.z &&
                me.level === walkClickAt.level &&
                GameMessages.sawSince(walkClickMark, CANT_REACH)
            ) {
                log(
                    `server "I can't reach that!" after walk click toward path idx ${clickIdx} — repathing (${clicks} clicks)`
                );
                walkClickMark = null;
                walkClickAt = null;
                return 'repath';
            }

            if (isArrived(me, dest, radius, Reachability.arrivalProbe())) {
                log(`arrived (${clicks} clicks)`);
                PathCameraFollow.release();
                return 'arrived';
            }
            const terminal = tiles[tiles.length - 1];
            if (terminal && me.level === terminal.level && me.x === terminal.x && me.z === terminal.z) {
                log(`reached path terminal short of dest (${clicks} clicks)`);
                PathCameraFollow.release();
                return 'closest';
            }

            const progressLimit = tiles.findIndex(
                (tile, index) => index >= pathIdx && tile.transport !== undefined
            );
            const found = locateOnPath(
                tiles,
                me,
                pathIdx,
                PROGRESS_WINDOW,
                CORRIDOR,
                progressLimit === -1 ? tiles.length - 1 : progressLimit
            );
            if (found !== -1) {
                pathIdx = found;
                offCorridor = 0;
            } else if (++offCorridor >= OFF_CORRIDOR_STRIKES) {
                if (postHopGrace > 0) {
                    // Exactmove landings often sit off the dense corridor briefly.
                    offCorridor = 0;
                } else {
                    log(
                        `deviated from path at (${me.x},${me.z},${me.level}) — repathing (${clicks} clicks)`
                    );
                    return 'repath';
                }
            }
            this.remaining = tiles.length - 1 - pathIdx;
            this.publishPath(tiles, pathIdx, clickIdx);
            this.maybeFacePathCamera(me, tiles, pathIdx);

            const moved =
                !lastTile ||
                me.x !== lastTile.x ||
                me.z !== lastTile.z ||
                me.level !== lastTile.level;
            stillIters = moved ? 0 : stillIters + 1;
            const shortOfTarget = clickIdx === -1 || chebyshev(me, tiles[clickIdx]!) > ARRIVE_RADIUS;
            const noMoveStall =
                postHopGrace <= 0 &&
                !moved &&
                (shortOfTarget ||
                    stillIters >= STUCK_ITERS ||
                    (clickIdx !== -1 &&
                        !Reachability.canReach(tiles[clickIdx]!, { maxSteps: STALL_REACH_STEPS })));
            stallTicks = noMoveStall ? stallTicks + 1 : 0;
            if (postHopGrace > 0) postHopGrace--;
            lastTile = me;

            let nextCrossingIdx = -1;
            for (let i = pathIdx + 1; i < tiles.length; i++) {
                if (tiles[i]!.transport) {
                    nextCrossingIdx = i;
                    break;
                }
            }

            const approachable = (t: PathStep): boolean =>
                Reachability.canReach(t, { maxSteps: TRIGGER_REACH_STEPS, adjacentOk: true });
            const scanHi = Math.min(tiles.length, pathIdx + PROGRESS_WINDOW);
            let crossingIdx = -1;
            for (let i = Math.max(1, pathIdx - 5); i < scanHi; i++) {
                if (
                    tiles[i]!.transport &&
                    crossingEligible(me, tiles[i - 1]!, tiles[i]!, TRANSPORT_TRIGGER, approachable)
                ) {
                    crossingIdx = i;
                    break;
                }
            }
            if (crossingIdx !== -1) {
                const hop = tiles[crossingIdx]!;
                const hopTransport = hop.transport!;
                const handled = await this.handleTransport(tiles[crossingIdx - 1]!, hop, log);
                if (handled) {
                    hop.transport = undefined;
                    if (multiLandingNeedsRepath(hopTransport, hop.level, worldTile())) {
                        const live = worldTile();
                        log(
                            `multi-landing hop arrived at (${live?.x},${live?.z}) not planned (${hopTransport.toTile!.x},${hopTransport.toTile!.z}) — repathing`
                        );
                        return 'repath';
                    }
                    // Exactmove / Climb / Squeeze leave the client busy — wait idle
                    // before issuing walk clicks or declaring stuck.
                    await Game.waitIdle(POST_HOP_IDLE_MS, m => log(m));
                    await Execution.delayTicks(2);
                    pathIdx = Math.max(pathIdx, crossingIdx - 1);
                    stallTicks = 0;
                    stallRetries = 0;
                    noClickRetries = 0;
                    postHopGrace = POST_HOP_GRACE_ITERS;
                    clickIdx = -1;
                    lastTile = null;
                    continue;
                }
                noteFailedDoor(hop, this.doorStrikes, this.avoidDoors);
                log(
                    `transport hop failed ${hopTransport.action ?? '?'} ${hopTransport.locName ?? ''} at (${hop.x},${hop.z},L${hop.level}) — repathing`
                );
                return 'repath';
            }

            if (stallTicks >= STALL_TICKS) {
                stallTicks = 0;
                if (stallRetries === 0) {
                    const limit = nextCrossingIdx !== -1 ? nextCrossingIdx - 1 : tiles.length - 1;
                    const recover = findForwardRecoveryIndex(tiles, me, pathIdx, clickable, {
                        corridor: CORRIDOR,
                        window: PROGRESS_WINDOW + 20,
                        limitIdx: limit
                    });
                    if (recover !== -1) {
                        const t = tiles[recover]!;
                        log(`stall recovery → path idx ${recover} (${t.x},${t.z})`);
                        const mark = GameMessages.mark();
                        if (issueWalk(t.x, t.z)) {
                            walkClickMark = mark;
                            walkClickAt = { x: me.x, z: me.z, level: me.level };
                            this.publishClientWalkSegment(me, t);
                            clickIdx = recover;
                            clicks++;
                            stallRetries = 1;
                            this.publishPath(tiles, pathIdx, clickIdx);
                            await Execution.delayTicks(2);
                            continue;
                        }
                        log('stall recovery walk rejected by client — repathing');
                        return 'repath';
                    }
                    stallRetries = 1;
                    clickIdx = -1;
                } else if (abi()?.reader?.inCombat?.()) {
                    if (!warnedCombat) {
                        warnedCombat = true;
                        log('under attack — holding course');
                    }
                    stallRetries = 0;
                    clickIdx = -1;
                } else {
                    const end = tiles[tiles.length - 1]!;
                    const adjacentToEnd =
                        clicks === 0 && me.level === end.level && chebyshev(me, end) <= 1;
                    if (adjacentToEnd) {
                        const openLeaf = Locs.query()
                            .where(
                                l =>
                                    isOpenBarrierLeaf(l.name, l.actions()) &&
                                    chebyshev(l.tile(), end) <= 2
                            )
                            .within(3)
                            .nearest();
                        if (openLeaf) {
                            log(
                                `(${end.x},${end.z}) leaf-flagged by open '${openLeaf.name}' — scene-stepping onto it`
                            );
                            DirectNavigator.walk(end);
                            await Execution.delayUntil(() => {
                                const cur = worldTile();
                                return (
                                    cur !== null &&
                                    cur.level === end.level &&
                                    cur.x === end.x &&
                                    cur.z === end.z
                                );
                            }, SCENE_STEP_MS);
                            stallRetries = 0;
                            clickIdx = -1;
                            lastTile = null;
                            continue;
                        }
                    }
                    if (
                        await tryNearbyDoor(log, {
                            tiles,
                            pathIdx,
                            corridor: CORRIDOR,
                            window: PROGRESS_WINDOW
                        })
                    ) {
                        stallRetries = 0;
                        clickIdx = -1;
                        lastTile = null;
                        continue;
                    }
                    const lockTile = questLockDoorTileNearPlayer();
                    if (lockTile) {
                        log(`quest-locked door at (${lockTile.x},${lockTile.z}) — blacklisting`);
                        this.blacklistDoor(lockTile.x, lockTile.z);
                        await dismissQuestLockDialogue();
                        return 'repath';
                    }
                    if (chatShowsQuestLock()) await dismissQuestLockDialogue();
                    if (adjacentToEnd) {
                        log(`(${end.x},${end.z}) blocked live — as close as reachable`);
                        return 'blocked';
                    }
                    if (postHopGrace > 0) {
                        await Execution.delayTicks(2);
                        continue;
                    }
                    log(`stuck at (${me.x},${me.z}) — repathing (${clicks} clicks)`);
                    return 'repath';
                }
            }

            // Re-click policy (click-miss thrash fix):
            // Do NOT re-issue tryMove every loop while still approaching the *current*
            // click target. On short paths (cost ≤ ARRIVE_RADIUS) that condition was
            // always true → 6–7 clicks for a 2-tile walk, route cancelled mid-step,
            // OPNPC/OPLOC "misses" (no dialog for 30s). Only re-click when:
            //   - no active click, or path advanced past click, or
            //   - near an *intermediate* click and need the next segment.
            // Terminal / pre-hop click: let the route finish; stuck/stall handles fail.
            const clickLimit =
                nextCrossingIdx !== -1 ? nextCrossingIdx - 1 : tiles.length - 1;
            const nearClick =
                clickIdx !== -1 && chebyshev(me, tiles[clickIdx]!) <= ARRIVE_RADIUS;
            const clickIsTerminal = clickIdx !== -1 && clickIdx >= clickLimit;
            // Terminal click: never re-fire from pathIdx catch-up either (same thrash).
            const needClick =
                clickIdx === -1 ||
                (!clickIsTerminal && (clickIdx <= pathIdx || nearClick));
            if (needClick) {
                const limit = clickLimit;
                const steps =
                    TARGET_STEPS + Math.floor(Math.random() * (2 * TARGET_JITTER + 1)) - TARGET_JITTER;
                const tryWalkAt = (i: number): boolean => {
                    const t = tiles[i]!;
                    if (t.x === me.x && t.z === me.z) return false;
                    if (!abi()?.reader?.toLocal?.(t.x, t.z)) return false;
                    // Same terminal already walking — don't cancel route with re-tryMove
                    if (
                        clickIdx === i &&
                        clickIsTerminal &&
                        walkClickAt &&
                        me.x === walkClickAt.x &&
                        me.z === walkClickAt.z
                    ) {
                        return false;
                    }
                    const mark = GameMessages.mark();
                    const ok = issueWalk(t.x, t.z);
                    if (ok) {
                        walkClickMark = mark;
                        walkClickAt = { x: me.x, z: me.z, level: me.level };
                        this.publishClientWalkSegment(me, t);
                    }
                    return ok;
                };
                let chosen = selectClientWalkTarget(
                    tiles,
                    pathIdx,
                    steps,
                    limit,
                    me.level,
                    clickable,
                    tryWalkAt
                );
                if (chosen === -1) {
                    const starve = starvedTerminalIndex(tiles, me, clickable);
                    if (
                        starve !== -1 &&
                        (nextCrossingIdx === -1 ||
                            pathIdx === tiles.length - 1 ||
                            clickIdx === tiles.length - 1) &&
                        tryWalkAt(starve)
                    ) {
                        chosen = starve;
                    }
                }
                if (chosen !== -1) {
                    clickIdx = chosen;
                    clicks++;
                    stallTicks = 0;
                    noClickRetries = 0;
                    this.publishPath(tiles, pathIdx, clickIdx);
                } else {
                    walkClickMark = null;
                    walkClickAt = null;
                    PathPublish.setClientSegment(null);
                    if (nextCrossingIdx !== -1) {
                        const appr = tiles[nextCrossingIdx - 1]!;
                        const hop = tiles[nextCrossingIdx]!;
                        if (
                            me.level === appr.level &&
                            chebyshev(me, appr) <= TRANSPORT_TRIGGER + 2
                        ) {
                            const hopTransport = hop.transport!;
                            const handled = await this.handleTransport(appr, hop, log);
                            if (handled) {
                                hop.transport = undefined;
                                if (multiLandingNeedsRepath(hopTransport, hop.level, worldTile())) {
                                    return 'repath';
                                }
                                await Game.waitIdle(POST_HOP_IDLE_MS, m => log(m));
                                await Execution.delayTicks(2);
                                pathIdx = Math.max(pathIdx, nextCrossingIdx - 1);
                                stallTicks = 0;
                                stallRetries = 0;
                                noClickRetries = 0;
                                postHopGrace = POST_HOP_GRACE_ITERS;
                                clickIdx = -1;
                                lastTile = null;
                                continue;
                            }
                            noteFailedDoor(hop, this.doorStrikes, this.avoidDoors);
                            return 'repath';
                        }
                    }
                    // Soft settle: often mid exactmove / scene after hop — do not
                    // burn a full A* repath on the first empty candidate set.
                    if (noClickRetries < 2 || postHopGrace > 0) {
                        noClickRetries++;
                        log(
                            `client walk: no click candidates near path idx ${pathIdx} — waiting (retry ${noClickRetries})`
                        );
                        await Game.waitIdle(6_000, m => log(m));
                        await Execution.delayTicks(3);
                        clickIdx = -1;
                        continue;
                    }
                    log(
                        `client walk pathfind failed for all click candidates near path idx ${pathIdx} — repathing (${clicks} clicks)`
                    );
                    return 'repath';
                }
            }

            await Execution.delayTicks(2);
        }

        log('walk timed out');
        PathCameraFollow.release();
        return 'failed';
    }

    /**
     * Classic transport hop: specialCrossing → multi-tile door → loc interact
     * (Climb / Open / Balance↔Cross / gangplank / dungeon).
     * No v2 tele inject.
     */
    private async handleTransport(
        approach: PathStep,
        step: PathStep,
        log: (msg: string) => void
    ): Promise<boolean> {
        const transport = step.transport!;

        // Approach stand tile before OPLOC when same plane
        if (transport.toLevel === undefined || approach.level === (worldTile()?.level ?? approach.level)) {
            for (let i = 0; i < 10; i++) {
                const me = worldTile();
                if (!me) break;
                if (chebyshev(me, approach) <= 1 && me.level === approach.level) break;
                issueWalk(approach.x, approach.z);
                await Execution.delayTicks(2);
            }
        }

        const special = specialCrossingForTransport(transport, approach, step);
        if (special) {
            return handleSpecialCrossing(approach, step, special, log, (d, o) => this.walkTo(d, o));
        }

        // Same-level barrier without toTile / toLevel → multi-tile door path
        if (transport.toLevel === undefined && transport.toTile === undefined && chebyshev(approach, step) >= 1) {
            return crossMultiTileDoor(approach, step, transport, log, (x, z) =>
                this.blacklistDoor(x, z)
            );
        }

        for (let attempt = 0; attempt < 2; attempt++) {
            const loc = findTransportLoc(transport);
            if (!loc) {
                if (transport.toLevel === undefined && transport.toTile === undefined) {
                    if (
                        Reachability.canStep(approach, step) ||
                        Reachability.canReach(step, { maxSteps: 64, adjacentOk: true })
                    ) {
                        log(`${transport.locName} at (${transport.locX},${transport.locZ}) already open`);
                        return true;
                    }
                    log(`transport loc '${transport.locName}' not found but the way is blocked`);
                    return false;
                }
                if (
                    transport.toTile !== undefined &&
                    (await openShutTrapdoor(transport, log, Execution.delayUntil.bind(Execution)))
                ) {
                    continue;
                }
                // Already-open / no shut target — try stepping for same-level dungeon landings
                if (transport.toTile !== undefined) {
                    const me = worldTile();
                    if (me && matchesTransportLanding(transport, step.level, me, me)) {
                        return true;
                    }
                }
                log(
                    `transport loc '${transport.locName}' / ${transport.action} not found near (${transport.locX},${transport.locZ})`
                );
                return false;
            }

            const before = worldTile();
            const mark = GameMessages.mark();
            if (!interactTransportLoc(loc, transport.action)) {
                log(
                    `'${transport.action}' not offered by ${loc.name ?? transport.locName} ` +
                        `(ops: ${loc.actions().join(', ')})`
                );
                return false;
            }
            log(
                `${transport.action} ${loc.name ?? transport.locName} @${loc.tile().x},${loc.tile().z} ` +
                    `(attempt ${attempt + 1})`
            );

            const cantReach = (): boolean => GameMessages.sawSince(mark, CANT_REACH);
            let crossed: boolean;
            if (transport.toLevel !== undefined) {
                const toLevel = transport.toLevel;
                const climbed = (): boolean => worldTile()?.level === toLevel;
                crossed =
                    (await Execution.delayUntil(() => climbed() || cantReach(), TRANSPORT_WAIT_MS)) &&
                    climbed();
            } else if (transport.toTile !== undefined) {
                const landed = (): boolean =>
                    matchesTransportLanding(transport, step.level, before, worldTile());
                crossed =
                    (await Execution.delayUntil(() => landed() || cantReach(), TRANSPORT_WAIT_MS)) &&
                    landed();
            } else {
                const open = (): boolean =>
                    findTransportLoc(transport) === null || Reachability.canStep(approach, step);
                crossed =
                    (await Execution.delayUntil(
                        () => open() || cantReach() || chatShowsQuestLock(),
                        TRANSPORT_WAIT_MS
                    )) && open();
            }

            if (crossed) {
                if (transport.toLevel !== undefined) {
                    // docs/NAV.md#level-change-loc-lag
                    await Execution.delayTicks(2);
                }
                log(
                    `${transport.action} ${transport.locName} at (${transport.locX},${transport.locZ}) ok`
                );
                return true;
            }
            if (chatShowsQuestLock()) {
                log(
                    `quest-locked '${transport.locName}' at (${transport.locX},${transport.locZ}) — blacklisting`
                );
                this.blacklistDoor(transport.locX, transport.locZ);
                await dismissQuestLockDialogue();
                return false;
            }
            if (cantReach()) {
                log(
                    `server says can't reach ${transport.locName} at (${transport.locX},${transport.locZ}) — repathing`
                );
                return false;
            }
            log(`${transport.action} ${transport.locName} did not resolve, retrying`);
        }
        return false;
    }
}

export const WalkExecutor = new WalkExecutorImpl();

/** Script-facing walkTo (classic). Same signature as prior WalkAlong.walkTo. */
export type WalkToOpts = WalkOptions;

export async function walkTo(
    dest: { x: number; z: number; level?: number },
    opts: WalkToOpts = {}
): Promise<boolean> {
    return WalkExecutor.walkTo(dest, opts);
}
