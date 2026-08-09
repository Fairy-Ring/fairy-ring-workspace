/**
 * Harness side panel — shaped like rs2b0t BotPanel.
 *
 * Layout (flex column, fill viewport height):
 *   script (Start / Stop / WalkTo…)
 *   status
 *   log          ← largest scroll area
 *   inv + chat   ← split remaining space evenly
 *
 * WalkTo: **modal** (presets + coords + map) — not inline form fields.
 * Same idea as rs2b0t “Edit parameters” / script config.
 *
 * @see tools/harness/ui/WalkToModal.ts
 * @see rs2b0t src/bot/ui/ParamsModal.ts
 * @see docs/plans/2026-08-04-harness-panel-mvp.md
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

import { el, sectionTitle, row, button } from './dom.ts';
import { LogBus } from '../script/logBus.ts';
import { getPanelWalkStatus, isPanelWalkActive, panelWalkStop } from './panelWalk.ts';
import { WalkToModal, getLastWalkToSelection } from './WalkToModal.ts';

function abi(): Any {
    return (globalThis as Any).__lc377;
}

export class HarnessPanel {
    private root: HTMLElement;
    private scriptName!: HTMLElement;
    private startBtn!: HTMLButtonElement;
    private stopBtn!: HTMLButtonElement;
    private walkToBtn!: HTMLButtonElement;
    private clearBtn!: HTMLButtonElement;
    private shotBtn!: HTMLButtonElement;
    private scriptStatus!: HTMLElement;
    private walkStatus!: HTMLElement;
    private walkToModal: WalkToModal;
    private stateCell!: HTMLElement;
    private tileCell!: HTMLElement;
    private sceneCell!: HTMLElement;
    private dialogCell!: HTMLElement;
    private hpCell!: HTMLElement;
    private energyCell!: HTMLElement;
    private xpCell!: HTMLElement;
    private invList!: HTMLElement;
    private chatList!: HTMLElement;
    private logBox!: HTMLElement;
    /** Default Start target — path-abc = content roadmap step 1 (A+B+C). */
    private selectedScript = 'path-abc';
    private lastRender = 0;
    private unsubLog: (() => void) | null = null;
    private raf = 0;

    constructor(root: HTMLElement) {
        this.root = root;
        root.replaceChildren();
        root.id = root.id || 'bot-panel';
        this.walkToModal = new WalkToModal();

        const title = el('div', 'rs2b0t-title');
        title.textContent = 'LC-rs2 harness';
        const sub = document.createElement('span');
        sub.className = 'rs2b0t-wall-link';
        sub.style.float = 'right';
        sub.style.fontSize = '11px';
        sub.style.fontWeight = 'normal';
        sub.textContent = 'r377';
        title.appendChild(sub);
        root.appendChild(title);

        // —— script (compact header) ——
        const script = el('div', 'rs2b0t-section rs2b0t-section-fixed');
        script.appendChild(sectionTitle('script'));
        const pick = el('div', 'rs2b0t-buttons');
        this.scriptName = el('span', 'rs2b0t-current-script');
        this.scriptName.textContent = this.selectedScript;
        this.scriptName.style.flex = '1';
        this.scriptName.style.alignSelf = 'center';
        pick.appendChild(this.scriptName);
        script.appendChild(pick);

        const buttons = el('div', 'rs2b0t-buttons');
        this.startBtn = button(buttons, 'Start', () => void this.handleStart());
        this.stopBtn = button(buttons, 'Stop', () => this.handleStop());
        this.walkToBtn = button(buttons, 'WalkTo…', () => this.handleWalkToOpen());
        this.walkToBtn.title = 'Open WalkTo destination (presets, coords, map)';
        this.clearBtn = button(buttons, 'Clear log', () => {
            LogBus.clear();
            this.renderLog();
        });
        this.shotBtn = button(buttons, 'Shot', () => void this.handleShot());
        script.appendChild(buttons);
        this.scriptStatus = row(script, 'status');
        this.walkStatus = row(script, 'walk');
        this.walkStatus.textContent = 'idle';
        root.appendChild(script);

        // —— status (compact; inv lives in its own scroll section below) ——
        const status = el('div', 'rs2b0t-section rs2b0t-section-fixed');
        status.appendChild(sectionTitle('status'));
        this.stateCell = row(status, 'state');
        this.tileCell = row(status, 'tile');
        this.sceneCell = row(status, 'scene');
        this.dialogCell = row(status, 'dialog');
        this.hpCell = row(status, 'hp');
        this.energyCell = row(status, 'energy');
        this.xpCell = row(status, 'xp');
        root.appendChild(status);

        // —— log (largest flex region — tutorial dumps a lot) ——
        const logSection = el('div', 'rs2b0t-section rs2b0t-section-log');
        logSection.appendChild(sectionTitle('log'));
        this.logBox = el('div', 'rs2b0t-log');
        logSection.appendChild(this.logBox);
        root.appendChild(logSection);

        // —— inv + chat (split remaining space evenly) ——
        const bottom = el('div', 'rs2b0t-bottom');

        const inv = el('div', 'rs2b0t-section rs2b0t-section-grow');
        inv.appendChild(sectionTitle('inv'));
        this.invList = el('div', 'rs2b0t-inv');
        inv.appendChild(this.invList);
        bottom.appendChild(inv);

        const chat = el('div', 'rs2b0t-section rs2b0t-section-grow');
        chat.appendChild(sectionTitle('chat'));
        this.chatList = el('div', 'rs2b0t-chat');
        chat.appendChild(this.chatList);
        bottom.appendChild(chat);

        root.appendChild(bottom);

        this.unsubLog = LogBus.onChange(() => this.renderLog());
        this.renderLog();
        this.renderScriptControls();
        this.scheduleLoop();
        LogBus.add('info', 'harness panel ready (script · WalkTo… modal · log · inv · chat)');
    }

    destroy(): void {
        this.unsubLog?.();
        if (this.raf) cancelAnimationFrame(this.raf);
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
        this.renderScriptControls();
    }

    private scriptsApi(): Any {
        return abi()?.scripts ?? null;
    }

    private handleStart(): void {
        const api = this.scriptsApi();
        if (!api?.start) {
            LogBus.add('error', 'scripts host not registered');
            return;
        }
        if (api.running?.()) {
            LogBus.add('warn', 'script already running — stop first');
            return;
        }
        const name = this.selectedScript;
        LogBus.add('info', `start ${name}`);
        // Fire-and-forget long run (same as Playwright page.evaluate start)
        void api
            .start(name, 25 * 60_000)
            .then((r: string) => LogBus.add('info', `${name} → ${r}`))
            .catch((e: unknown) => LogBus.add('error', `start failed: ${e}`));
        this.renderScriptControls();
    }

    private handleStop(): void {
        const api = this.scriptsApi();
        api?.stop?.();
        panelWalkStop();
        LogBus.add('info', 'stop requested (script + walkto + nav)');
        this.renderScriptControls();
    }

    private handleWalkToOpen(): void {
        if (isPanelWalkActive()) {
            // Second click while walking: stop (same as Stop for walk)
            panelWalkStop();
            this.renderScriptControls();
            return;
        }
        this.walkToModal.open({ onClosed: () => this.renderScriptControls() });
        this.renderScriptControls();
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

    private renderScriptControls(): void {
        const api = this.scriptsApi();
        const running = !!api?.running?.();
        const walking = isPanelWalkActive();
        const name = api?.current?.() ?? null;
        this.startBtn.disabled = running || walking;
        this.stopBtn.disabled = !running && !walking;
        this.shotBtn.disabled = typeof (globalThis as Any).__harnessShot !== 'function';
        this.walkToBtn.disabled = false;
        this.walkToBtn.textContent = walking ? 'Stop walk' : 'WalkTo…';

        if (!api) {
            this.scriptStatus.textContent = 'no host';
            this.scriptStatus.className = 'rs2b0t-value rs2b0t-dim';
        } else if (running) {
            this.scriptStatus.textContent = `running: ${name ?? '?'}`;
            this.scriptStatus.className = 'rs2b0t-value rs2b0t-state-running';
        } else {
            this.scriptStatus.textContent = 'idle';
            this.scriptStatus.className = 'rs2b0t-value';
        }

        const ws = getPanelWalkStatus();
        if (ws.active && ws.dest) {
            this.walkStatus.textContent = `→ ${ws.label}`;
            this.walkStatus.className = 'rs2b0t-value rs2b0t-state-running';
        } else {
            const last = getLastWalkToSelection();
            this.walkStatus.textContent = last
                ? `${last.label} (${last.x},${last.z})`
                : 'idle — WalkTo…';
            this.walkStatus.className = 'rs2b0t-value rs2b0t-dim';
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
        // "logged in" (ingame) ≠ world ready — scene must be 2 before OP/walk/seed use
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

        const tile = r.worldTile?.();
        this.tileCell.textContent = tile ? `${tile.x},${tile.z} (lv ${tile.level ?? 0})` : '—';
        this.sceneCell.textContent = String(scene);

        const mm = r.modalMessage?.() as string | null;
        const dlg = !!r.dialogOpen?.();
        if (mm) {
            this.dialogCell.textContent = `modal: ${mm.slice(0, 40)}`;
            this.dialogCell.className = 'rs2b0t-value rs2b0t-state-paused';
        } else if (dlg) {
            this.dialogCell.textContent = 'chat open';
            this.dialogCell.className = 'rs2b0t-value rs2b0t-state-paused';
        } else {
            this.dialogCell.textContent = 'clear';
            this.dialogCell.className = 'rs2b0t-value';
        }

        if (ingame) {
            const hp = r.hitpoints?.() as { effective?: number; base?: number } | undefined;
            if (hp) {
                this.hpCell.textContent = `${hp.effective ?? '?'} / ${hp.base ?? '?'}`;
                const low = (hp.effective ?? 99) < (hp.base ?? 10) * 0.4;
                this.hpCell.className = `rs2b0t-value ${low ? 'rs2b0t-log-error' : ''}`;
            } else {
                const s = r.stat?.(3);
                this.hpCell.textContent = s ? `${s.effective} / ${s.base}` : '—';
                this.hpCell.className = 'rs2b0t-value';
            }
            const energy = r.energy?.() ?? 0;
            const weight = r.weight?.() ?? 0;
            this.energyCell.textContent = `${energy}% · ${weight} kg`;
            this.energyCell.className = `rs2b0t-value ${energy < 20 ? 'rs2b0t-state-paused' : ''}`;
        } else {
            this.hpCell.textContent = '—';
            this.hpCell.className = 'rs2b0t-value rs2b0t-dim';
            this.energyCell.textContent = '—';
            this.energyCell.className = 'rs2b0t-value rs2b0t-dim';
        }

        const xp = (i: number) => {
            try {
                return r.stat?.(i)?.xp ?? 0;
            } catch {
                return 0;
            }
        };
        // Skill order: cooking=7, fishing=10, firemaking=11, mining=14, magic=6, ranged=4
        this.xpCell.textContent = `fm ${xp(11)} cook ${xp(7)} mine ${xp(14)} rng ${xp(4)}`;

        this.renderInv();
        this.renderChat();
    }

    private renderInv(): void {
        const a = abi();
        const items = (a?.reader?.inventory?.() ?? []) as {
            name?: string | null;
            id?: number;
            slot?: number;
            count?: number;
        }[];
        this.invList.replaceChildren();
        if (!items.length) {
            const empty = el('div', 'rs2b0t-inv-line rs2b0t-dim');
            empty.textContent = '(empty)';
            this.invList.appendChild(empty);
            return;
        }
        for (const it of items) {
            const div = el('div', 'rs2b0t-inv-line');
            const n = it.count != null && it.count > 1 ? ` ×${it.count}` : '';
            const slot = it.slot != null ? `@${it.slot}` : '';
            div.textContent = `${it.name ?? '?'}${n}${slot}`;
            this.invList.appendChild(div);
        }
    }

    private renderChat(): void {
        const a = abi();
        const r = a?.reader;
        const lines = (r?.chat?.(14) ?? []) as { type?: number; username?: string | null; text?: string }[];
        const atBottom =
            this.chatList.scrollHeight - this.chatList.scrollTop - this.chatList.clientHeight < 24;
        this.chatList.replaceChildren();
        if (!lines.length) {
            const empty = el('div', 'rs2b0t-chat-line rs2b0t-dim');
            empty.textContent = '(no messages)';
            this.chatList.appendChild(empty);
            return;
        }
        // chat ring is newest-first; show oldest→newest for natural reading
        for (const line of [...lines].reverse()) {
            const div = el('div', 'rs2b0t-chat-line');
            const t = line.type ?? 0;
            // Type colours roughly match chatback (game=0 cyan, public=2 white, private=3/6/7)
            if (t === 0) div.classList.add('rs2b0t-chat-game');
            else if (t === 1 || t === 2) div.classList.add('rs2b0t-chat-public');
            else if (t === 3 || t === 6 || t === 7) div.classList.add('rs2b0t-chat-private');
            div.textContent = line.username ? `${line.username}: ${line.text ?? ''}` : (line.text ?? '');
            this.chatList.appendChild(div);
        }
        if (atBottom) this.chatList.scrollTop = this.chatList.scrollHeight;
    }

    private renderLog(): void {
        const atBottom =
            this.logBox.scrollHeight - this.logBox.scrollTop - this.logBox.clientHeight < 40;
        this.logBox.replaceChildren();
        for (const line of LogBus.lines()) {
            const div = el('div', 'rs2b0t-log-line');
            if (line.level === 'warn') div.classList.add('rs2b0t-log-warn');
            if (line.level === 'error') div.classList.add('rs2b0t-log-error');
            div.textContent = line.msg;
            this.logBox.appendChild(div);
        }
        if (atBottom) this.logBox.scrollTop = this.logBox.scrollHeight;
    }
}

/** Mount into `#bot-panel` (rs2b0t id). Safe to call once after adapter install. */
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
