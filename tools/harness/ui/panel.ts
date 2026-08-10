/**
 * Harness side panel — **operator / agent eyes**, not a BotHost.
 *
 *   cli    — multicolor thrash/live box (no section-title underline)
 *   status — state / tile / dialog / energy / walk
 *   tools  — WalkTo / Clear / Shot / Reset +xp
 *   stats  — eff/base + session +xp gains
 *   log
 *
 * No Start/Stop, no inv/chat. Prefer the pretty `.rs2b0t-cli` box over a
 * “cli residual” header with border-bottom.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

import { el, row, button } from './dom.ts';
import { LogBus } from '../script/logBus.ts';
import { getPanelWalkStatus, isPanelWalkActive, panelWalkStop } from './panelWalk.ts';
import { WalkToModal, getLastWalkToSelection } from './WalkToModal.ts';

function abi(): Any {
    return (globalThis as Any).__lc377;
}

function navApi(): Any {
    return (globalThis as Any).__lc377Nav;
}

const SKILL_ORDER: { i: number; short: string }[] = [
    { i: 0, short: 'atk' },
    { i: 1, short: 'def' },
    { i: 2, short: 'str' },
    { i: 3, short: 'hp' },
    { i: 4, short: 'rng' },
    { i: 5, short: 'pry' },
    { i: 6, short: 'mag' },
    { i: 7, short: 'cook' },
    { i: 8, short: 'wc' },
    { i: 9, short: 'flet' },
    { i: 10, short: 'fish' },
    { i: 11, short: 'fm' },
    { i: 12, short: 'craft' },
    { i: 13, short: 'smith' },
    { i: 14, short: 'mine' },
    { i: 15, short: 'herb' },
    { i: 16, short: 'agi' },
    { i: 17, short: 'thiev' },
    { i: 18, short: 'slay' },
    { i: 20, short: 'rc' }
];

type CliResidual = {
    tag?: string;
    phase?: string | null;
    action?: string | null;
    stage?: number | null;
    t?: number | null;
    at?: number;
    tile?: string | null;
    free?: number | null;
    detail?: string | null;
    /** Last host smoke line (installSmokePanelMirror / panelLog) */
    host?: string | null;
    inv?: string | null;
    locs?: string | null;
};

/** Human activity from live snap — not “idle” just because path length is 0. */
function liveActivity(snap: Any, r: Any): string {
    if (snap?.combat || r?.inCombat?.()) {
        const foe = nearestCombatNpc(snap);
        return foe ? `combat · ${foe}` : 'combat';
    }
    if (r?.dialogOpen?.()) return 'dialog';
    if (r?.modalMessage?.()) {
        const m = String(r.modalMessage());
        return m ? `modal: ${m.slice(0, 28)}` : 'modal';
    }
    if (snap?.moving || r?.playerMoving?.()) return 'walking';
    const anim = snap?.anim ?? r?.selfAnim?.() ?? -1;
    if (anim != null && anim >= 0) return `anim ${anim}`;
    return 'standing';
}

function nearestCombatNpc(snap: Any): string | null {
    const list = (snap?.npcs ?? []) as { name?: string; combat?: boolean; d?: number }[];
    const foes = list
        .filter(n => n.combat)
        .sort((a, b) => (a.d ?? 99) - (b.d ?? 99));
    return foes[0]?.name ?? null;
}

export class HarnessPanel {
    private root: HTMLElement;
    private cliBox!: HTMLElement;
    private walkToBtn!: HTMLButtonElement;
    private clearBtn!: HTMLButtonElement;
    private shotBtn!: HTMLButtonElement;
    private walkStatus!: HTMLElement;
    private walkToModal: WalkToModal;
    private stateCell!: HTMLElement;
    private tileCell!: HTMLElement;
    private dialogCell!: HTMLElement;
    private energyCell!: HTMLElement;
    private statsSec!: HTMLElement;
    private statsTitle!: HTMLElement;
    private statsBody!: HTMLElement;
    private statsGrid!: HTMLElement;
    private statsMeta!: HTMLElement;
    private statsExpanded = false;
    private logBox!: HTMLElement;
    private lastRender = 0;
    private lastThrashKey = '';
    private lastThrashAt = 0;
    private lastWalkKey = '';
    private lastCliKey = '';
    private xpBase: number[] | null = null;
    private unsubLog: (() => void) | null = null;
    private raf = 0;

    constructor(root: HTMLElement) {
        this.root = root;
        root.replaceChildren();
        root.id = root.id || 'bot-panel';
        this.walkToModal = new WalkToModal();

        const title = el('div', 'rs2b0t-title');
        title.textContent = 'Fairy Ring harness';
        const sub = document.createElement('span');
        sub.className = 'rs2b0t-wall-link';
        sub.style.float = 'right';
        sub.style.fontSize = '11px';
        sub.style.fontWeight = 'normal';
        sub.textContent = 'r377';
        title.appendChild(sub);
        root.appendChild(title);

        // Multicolor thrash/live box — no sectionTitle (user: keep box, skip header underline).
        const cliSec = el('div', 'rs2b0t-section rs2b0t-section-fixed');
        this.cliBox = el('div', 'rs2b0t-cli');
        this.cliBox.textContent = 'idle — thrashPoint / live snap when smoke runs';
        cliSec.appendChild(this.cliBox);
        root.appendChild(cliSec);

        // Compact status rows — no sectionTitle (no underlined header).
        // Thrash lives in the multicolor cli box above.
        const status = el('div', 'rs2b0t-section rs2b0t-section-fixed');
        this.stateCell = row(status, 'state');
        this.tileCell = row(status, 'tile');
        this.dialogCell = row(status, 'dialog');
        this.energyCell = row(status, 'energy');
        this.walkStatus = row(status, 'walk');
        this.walkStatus.textContent = '—';
        root.appendChild(status);

        const tools = el('div', 'rs2b0t-buttons');
        this.walkToBtn = button(tools, 'WalkTo…', () => this.handleWalkToOpen());
        this.walkToBtn.title = 'Operator walk toy (after nav / client route)';
        this.clearBtn = button(tools, 'Clear log', () => {
            LogBus.clear();
            this.renderLog();
        });
        this.shotBtn = button(tools, 'Shot', () => void this.handleShot());
        const resetXp = button(tools, 'Reset +xp', () => {
            this.xpBase = null;
            this.renderStats();
            LogBus.add('info', 'stats XP gain baseline reset');
        });
        resetXp.title = 'Re-baseline session XP gains';
        root.appendChild(tools);

        // Stats · +xp — collapsed by default (more room for log during thrash)
        this.statsSec = el('div', 'rs2b0t-section rs2b0t-section-stats rs2b0t-stats-collapsed');
        this.statsTitle = el('div', 'rs2b0t-section-title rs2b0t-stats-toggle');
        this.statsTitle.setAttribute('role', 'button');
        this.statsTitle.tabIndex = 0;
        this.statsTitle.title = 'Click to expand/collapse XP panel';
        this.statsTitle.addEventListener('click', () => this.toggleStats());
        this.statsTitle.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleStats();
            }
        });
        this.statsSec.appendChild(this.statsTitle);
        this.statsBody = el('div', 'rs2b0t-stats-body');
        this.statsMeta = el('div', 'rs2b0t-stats-meta');
        this.statsMeta.textContent = 'eff/base · gains only';
        this.statsBody.appendChild(this.statsMeta);
        this.statsGrid = el('div', 'rs2b0t-stats');
        this.statsBody.appendChild(this.statsGrid);
        this.statsSec.appendChild(this.statsBody);
        root.appendChild(this.statsSec);
        this.applyStatsCollapsed();

        // Log: no underlined section header either
        const logSection = el('div', 'rs2b0t-section rs2b0t-section-log');
        this.logBox = el('div', 'rs2b0t-log');
        logSection.appendChild(this.logBox);
        root.appendChild(logSection);

        this.unsubLog = LogBus.onChange(() => this.renderLog());
        this.renderLog();
        this.renderCli();
        this.scheduleLoop();
        LogBus.add('info', 'panel eyes: multicolor cli box (no residual header); live + thrashPoint');
    }

    destroy(): void {
        this.unsubLog?.();
        if (this.raf) cancelAnimationFrame(this.raf);
    }

    private toggleStats(): void {
        this.statsExpanded = !this.statsExpanded;
        this.applyStatsCollapsed();
        if (this.statsExpanded) this.renderStats();
    }

    private applyStatsCollapsed(): void {
        const open = this.statsExpanded;
        this.statsSec.classList.toggle('rs2b0t-stats-collapsed', !open);
        this.statsSec.classList.toggle('rs2b0t-section-stats', open);
        this.statsTitle.textContent = open ? '▾ stats · +xp' : '▸ stats · +xp';
        this.statsBody.hidden = !open;
        this.statsTitle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    private scheduleLoop(): void {
        const tick = () => {
            this.raf = requestAnimationFrame(tick);
            this.maybeRender(250);
        };
        this.raf = requestAnimationFrame(tick);
    }

    private maybeRender(minMs: number): void {
        const now = performance.now();
        if (now - this.lastRender < minMs) return;
        this.lastRender = now;
        this.renderStatus();
        this.renderCli();
        this.renderWalk();
        this.renderStats();
        this.maybeThrashHeartbeat(now);
    }

    /** Multicolor key/value thrash + live activity (no section header). */
    private renderCli(): void {
        const a = abi();
        const api = a?.scripts ?? null;
        const running = !!api?.running?.();
        const scriptName = api?.current?.() ?? null;
        const cli = (a?.cliResidual ?? null) as (CliResidual & { live?: string }) | null;
        const ageMs =
            cli?.at != null && typeof cli.at === 'number' ? Date.now() - cli.at : null;
        const thrashFresh =
            !!cli?.tag &&
            cli.tag !== 'live' &&
            ageMs != null &&
            ageMs < 30000;
        const hostFresh =
            !!cli?.host && ageMs != null && ageMs < 45000;

        const lines: { k: string; v: string; hi?: boolean }[] = [];

        // Host smoke line first when fresh (operator eyes on CLI thrash)
        if (hostFresh && cli?.host) {
            lines.push({ k: 'host', v: String(cli.host), hi: true });
        }

        if (cli?.live) {
            lines.push({
                k: 'live',
                v: String(cli.live),
                hi: /combat|walk/i.test(String(cli.live))
            });
        }

        if (thrashFresh && cli) {
            lines.push({ k: 'tag', v: String(cli.tag), hi: true });
            if (cli.phase && cli.phase !== cli.tag) {
                lines.push({ k: 'phase', v: String(cli.phase) });
            }
            if (cli.action) lines.push({ k: 'action', v: String(cli.action), hi: true });
            if (cli.stage != null) lines.push({ k: 'stage', v: String(cli.stage) });
            if (cli.t != null) lines.push({ k: 'tick', v: `t${cli.t}` });
        } else if (cli?.tag && cli.tag !== 'live') {
            lines.push({
                k: 'tag',
                v: `${cli.tag} (stale)`,
                hi: false
            });
            if (cli.action) lines.push({ k: 'last', v: String(cli.action) });
        } else if (running) {
            lines.push({
                k: 'driver',
                v: `in-page script: ${scriptName ?? '?'}`,
                hi: true
            });
        } else if (!cli?.live && !hostFresh) {
            lines.push({ k: 'driver', v: 'idle — launch CLI smoke' });
        }

        // Live density (always useful; thrashPoint optional). Scene is in status.state only.
        if (cli?.tile) lines.push({ k: 'tile', v: String(cli.tile) });
        if (cli?.free != null) lines.push({ k: 'free', v: String(cli.free) });
        if (cli?.inv) lines.push({ k: 'inv', v: String(cli.inv) });
        if (cli?.locs) lines.push({ k: 'locs', v: String(cli.locs) });
        if (cli?.detail) lines.push({ k: 'detail', v: String(cli.detail) });
        if (thrashFresh && ageMs != null) {
            const stale = ageMs >= 15000;
            lines.push({
                k: 'age',
                v: stale
                    ? `${(ageMs / 1000).toFixed(0)}s (stale)`
                    : `${(ageMs / 1000).toFixed(1)}s`,
                hi: !stale
            });
        }

        const key = lines.map(l => `${l.k}=${l.v}`).join('|');
        if (key !== this.lastCliKey) {
            this.lastCliKey = key;
            this.cliBox.replaceChildren();
            for (const { k, v, hi } of lines) {
                const r = el('div', 'rs2b0t-cli-row');
                const kk = el('span', 'rs2b0t-cli-k');
                kk.textContent = k;
                const vv = el('span', hi ? 'rs2b0t-cli-v rs2b0t-cli-v-hi' : 'rs2b0t-cli-v');
                vv.textContent = v;
                vv.title = v; // full text on hover when truncated in CSS
                r.appendChild(kk);
                r.appendChild(vv);
                this.cliBox.appendChild(r);
            }
        }

        this.shotBtn.disabled = typeof (globalThis as Any).__harnessShot !== 'function';
        this.walkToBtn.textContent = isPanelWalkActive() ? 'Stop walk' : 'WalkTo…';
    }

    private maybeThrashHeartbeat(now: number): void {
        const a = abi();
        if (!a?.reader?.ingame?.() || (a.reader.sceneState?.() ?? 0) !== 2) return;
        if (now - this.lastThrashAt < 1500) return;

        let snap: Any = null;
        try {
            snap =
                typeof a.thrashSnap === 'function'
                    ? a.thrashSnap({ maxNpcs: 8, maxGround: 4, maxChat: 2, maxLocs: 8 })
                    : null;
        } catch {
            return;
        }
        if (!snap) return;

        const tile = snap.tile
            ? `${snap.tile.x},${snap.tile.z}` +
              (snap.tile.level != null && snap.tile.level !== 0 ? ` L${snap.tile.level}` : '')
            : '—';
        const act = liveActivity(snap, a.reader);
        const has = snap.has
            ? Object.entries(snap.has as Record<string, boolean>)
                  .filter(([, v]) => v)
                  .map(([k]) => k)
                  .join(',')
            : '';
        const npcs = snap.npcNames
            ? Object.entries(snap.npcNames as Record<string, number>)
                  .slice(0, 6)
                  .map(([k, v]) => `${k}×${v}`)
                  .join(' ')
            : '';
        const invArr = (snap.inv ?? []) as string[];
        const inv =
            invArr.length > 0
                ? invArr
                      .slice(0, 8)
                      .map(n => String(n).replace(/\s+/g, ' ').slice(0, 22))
                      .join(' · ') + (invArr.length > 8 ? ` +${invArr.length - 8}` : '')
                : '∅';
        const locArr = (snap.locs ?? []) as { name?: string; id?: number; d?: number }[];
        const locs =
            locArr.length > 0
                ? locArr
                      .slice(0, 6)
                      .map(l => {
                          const nm = l.name || `id${l.id ?? '?'}`;
                          return l.d != null ? `${nm}@${l.d}` : nm;
                      })
                      .join(' · ')
                : 'none';
        const free = snap.free != null ? `free=${snap.free}` : '';
        const key = `${tile}|${act}|${has}|${npcs}|${free}|${inv}|${locs}`;
        // Standing with no inv/loc change: refresh CLI residual but don't spam log
        const quietStand = act === 'standing' && key === this.lastThrashKey;
        if (quietStand && now - this.lastThrashAt < 8000) return;
        this.lastThrashKey = key;
        this.lastThrashAt = now;

        // Publish live activity for status.action; do not invent thrash tags.
        const prev = (a.cliResidual ?? {}) as CliResidual;
        const thrashFresh =
            !!prev.tag &&
            prev.tag !== 'live' &&
            typeof prev.at === 'number' &&
            Date.now() - prev.at < 20000;
        const hostFresh =
            !!prev.host && typeof prev.at === 'number' && Date.now() - prev.at < 45000;

        a.cliResidual = {
            ...prev,
            // keep thrashPoint tag/phase/action when fresh; always refresh live fields
            action: thrashFresh && prev.action ? prev.action : act,
            live: act,
            tile,
            free: snap.free ?? null,
            inv,
            locs,
            detail:
                [has && `[${has}]`, npcs || null].filter(Boolean).join(' ') || prev.detail,
            // Preserve host timestamp while host line is fresh
            at: thrashFresh || hostFresh ? prev.at : Date.now()
        };

        // Only log when something meaningful moved (not idle standing spam)
        if (!quietStand && act !== 'standing') {
            LogBus.add(
                'info',
                ['live', act, `@${tile}`, free, has && `[${has}]`, npcs || 'npcs:none']
                    .filter(Boolean)
                    .join(' ')
            );
        }
    }

    private handleWalkToOpen(): void {
        if (isPanelWalkActive()) {
            panelWalkStop();
            this.renderWalk();
            return;
        }
        this.walkToModal.open({ onClosed: () => this.renderWalk() });
        this.renderWalk();
    }

    private async handleShot(): Promise<void> {
        const fn = (globalThis as Any).__harnessShot;
        if (typeof fn !== 'function') {
            LogBus.add('warn', 'shot bridge not installed (Playwright host only)');
            return;
        }
        try {
            const p = await fn('panel');
            LogBus.add('info', p ? `shot → ${p}` : 'shot failed');
        } catch (e) {
            LogBus.add('error', `shot: ${e}`);
        }
    }

    private renderWalk(): void {
        this.shotBtn.disabled = typeof (globalThis as Any).__harnessShot !== 'function';
        this.walkToBtn.textContent = isPanelWalkActive() ? 'Stop walk' : 'WalkTo…';

        let text = '—';
        let cls = 'rs2b0t-value rs2b0t-dim';
        let title = 'No active nav, route, or WalkTo';

        try {
            const path = navApi()?.PathPublish?.get?.();
            if (path?.tiles?.length) {
                const tiles = path.tiles as {
                    x: number;
                    z: number;
                    label?: string;
                }[];
                const idx = Math.min(Math.max(path.pathIdx | 0, 0), tiles.length - 1);
                const click =
                    path.clickIdx >= 0 && path.clickIdx < tiles.length
                        ? tiles[path.clickIdx]
                        : null;
                const next = tiles[idx];
                const dest = tiles[tiles.length - 1];
                const hop = click?.label || next?.label;
                text = [
                    'nav',
                    hop || null,
                    next ? `next ${next.x},${next.z}` : null,
                    dest ? `→ ${dest.x},${dest.z}` : null,
                    `${idx + 1}/${tiles.length}`
                ]
                    .filter(Boolean)
                    .join(' · ');
                cls = 'rs2b0t-value rs2b0t-state-running';
                title = 'Active PathPublish nav walk';
            }
        } catch {
            /* optional */
        }

        if (cls.includes('dim')) {
            const route = this.clientRouteDest();
            if (route) {
                text = `route → ${route.x},${route.z} (${route.steps} left)`;
                cls = 'rs2b0t-value rs2b0t-state-running';
                title = 'Client player route queue';
            }
        }

        if (cls.includes('dim')) {
            const ws = getPanelWalkStatus();
            if (ws.active && ws.dest) {
                text = `WalkTo → ${ws.label}`;
                cls = 'rs2b0t-value rs2b0t-state-running';
                title = 'Panel WalkTo toy';
            }
        }

        // Do not show stale “last Draynor bank” while thrashing Flamtaer —
        // only active nav / route / WalkTo (shot 01-47-47 noise).

        if (text !== this.lastWalkKey) {
            this.lastWalkKey = text;
            this.walkStatus.textContent = text;
            this.walkStatus.className = cls;
            this.walkStatus.title = title;
        }
    }

    private clientRouteDest(): { x: number; z: number; steps: number } | null {
        try {
            const client = abi()?.client;
            const p = client?.localPlayer;
            if (!p) return null;
            const len = (p.routeLength ?? 0) | 0;
            if (len <= 0) return null;
            const lx = (p.routeX?.[len - 1] ?? p.routeX?.[0]) | 0;
            const lz = (p.routeZ?.[len - 1] ?? p.routeZ?.[0]) | 0;
            const baseX = (client.mapBuildBaseX ?? 0) | 0;
            const baseZ = (client.mapBuildBaseZ ?? 0) | 0;
            const wx = lx > 2000 ? lx : baseX + lx;
            const wz = lz > 2000 ? lz : baseZ + lz;
            return { x: wx, z: wz, steps: len };
        } catch {
            return null;
        }
    }

    private renderStatus(): void {
        const a = abi();
        if (!a?.reader) {
            this.stateCell.textContent = 'adapter offline';
            return;
        }
        const r = a.reader;
        const ingame = !!r.ingame?.();
        const scene = r.sceneState?.() ?? -1;
        let stateLabel = 'title / offline';
        let stateClass = 'rs2b0t-value rs2b0t-dim';
        if (ingame && scene === 2) {
            stateLabel = 'ready (scene 2)';
            stateClass = 'rs2b0t-value rs2b0t-state-running';
        } else if (ingame) {
            stateLabel = `ingame · scene ${scene} (wait)`;
            stateClass = 'rs2b0t-value rs2b0t-state-paused';
        }
        this.stateCell.textContent = stateLabel;
        this.stateCell.className = stateClass;

        // Keep live activity on cliResidual for the multicolor box (renderCli).
        if (ingame && scene === 2) {
            try {
                const snap =
                    typeof a.thrashSnap === 'function'
                        ? a.thrashSnap({ maxNpcs: 6, maxGround: 0, maxChat: 0 })
                        : null;
                if (snap) {
                    const live = liveActivity(snap, r);
                    const prev = (a.cliResidual ?? {}) as CliResidual & { live?: string };
                    a.cliResidual = { ...prev, live };
                }
            } catch {
                /* ignore */
            }
        }

        const tile = r.worldTile?.();
        this.tileCell.textContent = tile ? `${tile.x},${tile.z} (lv ${tile.level ?? 0})` : '—';

        // Isolate dialog/energy so one reader throw cannot leave both stuck at "—".
        try {
            const mm = r.modalMessage?.() as string | null;
            const dlg = !!r.dialogOpen?.();
            if (mm) {
                this.dialogCell.textContent = `modal: ${mm.slice(0, 48)}`;
                this.dialogCell.className = 'rs2b0t-value rs2b0t-state-paused';
            } else if (dlg) {
                this.dialogCell.textContent = 'chat open';
                this.dialogCell.className = 'rs2b0t-value rs2b0t-state-paused';
            } else {
                this.dialogCell.textContent = 'clear';
                this.dialogCell.className = 'rs2b0t-value';
            }
        } catch {
            this.dialogCell.textContent = 'err';
            this.dialogCell.className = 'rs2b0t-value rs2b0t-state-paused';
        }

        try {
            if (ingame) {
                const energy = r.energy?.() ?? 0;
                const weight = r.weight?.() ?? 0;
                this.energyCell.textContent = `${energy}% · ${weight} kg`;
                this.energyCell.className = `rs2b0t-value ${energy < 20 ? 'rs2b0t-state-paused' : ''}`;
            } else {
                this.energyCell.textContent = '—';
                this.energyCell.className = 'rs2b0t-value rs2b0t-dim';
            }
        } catch {
            this.energyCell.textContent = 'err';
            this.energyCell.className = 'rs2b0t-value rs2b0t-state-paused';
        }
    }

    private renderStats(): void {
        // Always track XP baseline while collapsed; only paint grid when open
        const a = abi();
        const r = a?.reader;
        const ingame = !!r?.ingame?.() && (r.sceneState?.() ?? 0) === 2;

        if (!ingame || !r?.stat) {
            if (this.statsExpanded && this.statsGrid.childElementCount === 0) {
                const empty = el('div', 'rs2b0t-stats-empty');
                empty.textContent = 'waiting for scene 2…';
                this.statsGrid.appendChild(empty);
            }
            return;
        }

        // Capture baseline even while collapsed so expand shows real +xp
        if (!this.xpBase) {
            try {
                this.xpBase = SKILL_ORDER.map(s => (r.stat(s.i)?.xp ?? 0) | 0);
            } catch {
                /* ignore */
            }
        }
        if (!this.statsExpanded) return;

        const cur: { short: string; eff: number; base: number; xp: number }[] = [];
        for (const s of SKILL_ORDER) {
            try {
                const st = r.stat(s.i);
                cur.push({
                    short: s.short,
                    eff: (st?.effective ?? st?.base ?? 1) | 0,
                    base: (st?.base ?? 1) | 0,
                    xp: (st?.xp ?? 0) | 0
                });
            } catch {
                cur.push({ short: s.short, eff: 1, base: 1, xp: 0 });
            }
        }

        if (!this.xpBase) {
            this.xpBase = cur.map(c => c.xp);
            this.statsMeta.textContent = 'baseline set · +xp only';
        }

        this.statsGrid.replaceChildren();
        let totalGain = 0;
        for (let n = 0; n < cur.length; n++) {
            const c = cur[n];
            const baseXp = this.xpBase![n] ?? c.xp;
            const d = Math.max(0, c.xp - baseXp);
            totalGain += d;

            const cell = el('div', 'rs2b0t-stat');
            const name = el('span', 'rs2b0t-stat-name');
            name.textContent = c.short;
            const lvl = el('span', 'rs2b0t-stat-lvl');
            lvl.textContent = `${c.eff}/${c.base}`;
            if (c.eff < c.base) lvl.classList.add('rs2b0t-stat-down');
            else if (c.eff > c.base) lvl.classList.add('rs2b0t-stat-up');

            const delta = el('span', 'rs2b0t-stat-dx');
            if (d > 0) {
                delta.textContent = `+${formatXp(d)}`;
                delta.classList.add('rs2b0t-stat-up');
            } else {
                delta.textContent = '·';
                delta.classList.add('rs2b0t-dim');
            }
            cell.appendChild(name);
            cell.appendChild(lvl);
            cell.appendChild(delta);
            this.statsGrid.appendChild(cell);
        }

        this.statsMeta.textContent =
            totalGain > 0
                ? `session +${formatXp(totalGain)} xp`
                : 'no +xp yet · baseline locked';
    }

    private renderLog(): void {
        const atBottom =
            this.logBox.scrollHeight - this.logBox.scrollTop - this.logBox.clientHeight < 40;
        this.logBox.replaceChildren();
        const t0 = LogBus.lines()[0]?.t ?? performance.now();
        for (const line of LogBus.lines()) {
            const div = el('div', 'rs2b0t-log-line');
            if (line.level === 'warn') div.classList.add('rs2b0t-log-warn');
            if (line.level === 'error') div.classList.add('rs2b0t-log-error');
            const sec = ((line.t - t0) / 1000).toFixed(1);
            div.textContent = `+${sec}s  ${line.msg}`;
            this.logBox.appendChild(div);
        }
        if (atBottom) this.logBox.scrollTop = this.logBox.scrollHeight;
    }
}

function formatXp(n: number): string {
    const a = Math.abs(n);
    if (a >= 1_000_000) return `${(a / 1_000_000).toFixed(2)}m`;
    if (a >= 10_000) return `${(a / 1000).toFixed(1)}k`;
    if (a >= 1000) return `${(a / 1000).toFixed(2)}k`;
    return String(n);
}

export function mountHarnessPanel(selector = '#bot-panel'): HarnessPanel | null {
    const root = document.querySelector(selector) as HTMLElement | null;
    if (!root) {
        console.warn('[harness] panel root missing:', selector);
        return null;
    }
    const panel = new HarnessPanel(root);
    (globalThis as Any).__harnessPanel = panel;
    return panel;
}
