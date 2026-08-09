/**
 * Minimal rs2b0t-compatible script API for the harness client (in-browser).
 *
 * Scripts import these instead of full rs2b0t — same names, thin over __lc377.
 *
 * State discipline (274 / rs2b0t QUESTS.md):
 * Prefer inventory, skill XP, tiles, dialogs, side tabs — not untransmitted varps.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

import { ScriptControl } from './ScriptControl.ts';
import { RunManager } from './RunManager.ts';

function abi(): Any {
    const a = (globalThis as Any).__lc377;
    if (!a?.reader || !a?.actions) {
        throw new Error('harness adapter not installed');
    }
    return a;
}

export const reader = {
    ingame: () => !!abi().reader.ingame(),
    sceneState: () => abi().reader.sceneState() | 0,
    worldTile: () => abi().reader.worldTile(),
    varp: (id: number) => abi().reader.varp(id) | 0,
    /** Log-only helper — do not stage solely on this (varp may not transmit). */
    tutorial: () => abi().reader.tutorial?.() ?? abi().reader.varp(281) | 0,
    modals: () => abi().reader.modals(),
    npcs: () => abi().reader.npcs() as NpcSnap[],
    locs: (opts?: { name?: string; maxDist?: number }) => abi().reader.locs(opts ?? {}) as LocSnap[],
    inventory: () => abi().reader.inventory() as InvSnap[],
    dialogOpen: () => !!abi().reader.dialogOpen(),
    chatContinueComId: () => abi().reader.chatContinueComId() | 0,
    chatOptions: () => abi().reader.chatOptions() as { comId: number; text: string }[],
    /** NPC/player chat body lines — unique per continue page */
    chatBodyText: () => String(abi().reader.chatBodyText?.() ?? ''),
    sideTabInterface: (tab: number) => abi().reader.sideTabInterface(tab) | 0,
    activeSideTab: () => abi().reader.activeSideTab() | 0,
    mapBuildBase: () => abi().reader.mapBuildBase(),
    toLocal: (x: number, z: number) => abi().reader.toLocal(x, z) as { lx: number; lz: number } | null,
    skillCount: () => (abi().reader.skillCount?.() ?? 21) | 0,
    stat: (i: number) => {
        const r = abi().reader;
        if (typeof r.stat === 'function') return r.stat(i) as StatSnap;
        return { name: `#${i}`, effective: 1, base: 1, xp: 0 };
    },
    selfAnim: () => (abi().reader.selfAnim?.() ?? -1) | 0,
    /** Exact-move / route / primary anim — true while "finish what you are doing". */
    /** exactMove / route only — sticky primaryAnim ignored (never clears for some bas). */
    playerMoving: () => {
        const r = abi().reader;
        if (typeof r.playerMoving === 'function') return !!r.playerMoving();
        if (typeof r.playerBusy === 'function') return !!r.playerBusy();
        return false;
    },
    /** @deprecated use playerMoving — sticky anim hung waitIdle */
    playerBusy: () => {
        const r = abi().reader;
        if (typeof r.playerMoving === 'function') return !!r.playerMoving();
        if (typeof r.playerBusy === 'function') return !!r.playerBusy();
        return false;
    },
    loopCycle: () => (abi().reader.loopCycle?.() ?? 0) | 0,
    energy: () => (abi().reader.energy?.() ?? 100) | 0,
    runEnabled: () => !!abi().reader.runEnabled?.(),
    /** Local player combatCycle heuristic (rs2b0t Game.inCombat). */
    inCombat: () => !!abi().reader.inCombat?.(),
    loopCycle: () => abi().reader.loopCycle?.() ?? 0,
    /**
     * Smith / skill multi-make panel products (mainModal TYPE_INV + Make iop).
     * Empty when panel closed or not a make interface.
     */
    mainSkillMultiItems: () => (abi().reader.mainSkillMultiItems?.() ?? []) as InvSnap[],
    /**
     * Recent chat lines (newest first). Game mes include engine
     * `No trigger for [opnpc1,…]` when a content trigger is missing (dev only).
     * @see attach-in-page reader.chat / Player.defaultOp
     */
    chat: (count = 16) => {
        const r = abi().reader;
        if (typeof r.chat !== 'function') return [] as ChatLine[];
        return (r.chat(count) ?? []) as ChatLine[];
    }
};

export type StatSnap = { name: string; effective: number; base: number; xp: number };
export type ChatLine = { type: number; username: string | null; text: string };

/**
 * Client-visible chat helpers for fail-fast content gaps.
 * Engine (non-production) emits `No trigger for [op…,debugname]` then
 * `Nothing interesting happens.` when OPNPC/OPLOC/… has no RuneScript.
 */
export const Chat = {
    recent(count = 16): ChatLine[] {
        return reader.chat(count);
    },
    texts(count = 16): string[] {
        return Chat.recent(count).map(c => String(c?.text ?? ''));
    },
    /** First line matching `re`, or null. */
    match(re: RegExp, count = 16): string | null {
        for (const t of Chat.texts(count)) {
            if (re.test(t)) return t;
        }
        return null;
    },
    /**
     * Engine content gap: Talk/OPLOC reached server but no RuneScript trigger.
     * Prefer this over stalling for maxMs.
     */
    noTriggerFor(count = 20): string | null {
        return Chat.match(/No trigger for/i, count);
    },
    nothingInteresting(count = 12): string | null {
        return Chat.match(/Nothing interesting happens/i, count);
    }
};

/** Hard abort — QuestBot / smoke must stop immediately (content gap). */
export class QuestHardFail extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'QuestHardFail';
    }
}

export const actions = {
    menuAction: (action: number, a: number, b: number, c: number) => !!abi().actions.menuAction(action, a, b, c),
    walkTo: (lx: number, lz: number) => !!abi().actions.walkTo(lx, lz),
    walkWorld: (wx: number, wz: number) => !!abi().actions.walkWorld(wx, wz),
    walkRel: (dx: number, dz: number) => !!abi().actions.walkRel(dx, dz),
    talkNpc: (name: string) => !!abi().actions.talkNpc(name),
    attackNpc: (name: string) => !!abi().actions.attackNpc(name),
    takeObj: (lx: number, lz: number, objId: number, op?: number) =>
        !!abi().actions.takeObj?.(lx, lz, objId, op ?? 3),
    takeGround: (name: string, maxDist?: number) =>
        !!abi().actions.takeGround?.(name, maxDist ?? 12),
    npcOp: (index: number, op: number) => !!abi().actions.npcOp?.(index, op),
    opLoc: (name: string, act?: string, maxDist?: number) => !!abi().actions.opLoc(name, act ?? '', maxDist ?? 16),
    opLocAt: (wx: number, wz: number, act?: string) => !!abi().actions.opLocAt?.(wx, wz, act ?? ''),
    ifButton: (comId: number) => !!abi().actions.ifButton(comId),
    continueDialog: () => !!abi().actions.continueDialog(),
    chooseOption: (prefs?: string[]) => !!abi().actions.chooseOption(prefs ?? []),
    advanceDialog: () => !!abi().actions.advanceDialog(),
    designAccept: () => !!abi().actions.designAccept(),
    setSideTab: (tab: number) => !!abi().actions.setSideTab(tab),
    useHeld: (name: string) => !!abi().actions.useHeld(name),
    heldOp: (name: string, op?: number) => !!abi().actions.heldOp?.(name, op ?? 1),
    useHeldOnHeld: (use: string, target: string) => !!abi().actions.useHeldOnHeld?.(use, target),
    useHeldOnLoc: (use: string, locName: string, maxDist?: number) =>
        !!abi().actions.useHeldOnLoc?.(use, locName, maxDist ?? 12),
    useHeldOnNpc: (use: string, npcName: string) => !!abi().actions.useHeldOnNpc?.(use, npcName),
    equip: (name: string) => !!abi().actions.equip?.(name),
    closeModal: () => !!abi().actions.closeModal?.(),
    setRun: (on: boolean) => !!abi().actions.setRun?.(on),
    castOnNpc: (spell: string, index: number) => !!abi().actions.castOnNpc?.(spell, index),
    /** INV_BUTTON1..5 on a make-panel product (objId, slot, comId, 1-based op). */
    invButton: (objId: number, slot: number, comId: number, op?: number) =>
        !!abi().actions.invButton?.(objId, slot, comId, op ?? 1),
    /**
     * Make-panel product by name substr → INV_BUTTON (not IF_BUTTON).
     * Optional op: exact iop label ("Make", "Make 5", …).
     */
    makeFromPanel: (label: string, op?: string) => !!abi().actions.makeFromPanel?.(label, op),
    cheat: (cmd: string) => !!abi().actions.cheat(cmd)
};

export type WorldTile = { x: number; z: number; level: number; lx?: number; lz?: number };

export type NpcSnap = {
    index: number;
    id: number;
    name: string | null;
    ops: (string | null)[];
    tile: { x: number; z: number; level: number };
    distance: number;
    inCombat?: boolean;
};

export type LocSnap = {
    typecode: number;
    id: number;
    name: string | null;
    ops: (string | null)[];
    lx: number;
    lz: number;
    x: number;
    z: number;
    distance: number;
};

export type InvSnap = {
    slot: number;
    id: number;
    count: number;
    name: string | null;
    comId: number;
    ops?: (string | null)[];
};

/** Frame-friendly waits (browser). Honour ScriptControl stop so Stop aborts delays. */
export const Execution = {
    delay(ms: number): Promise<void> {
        return new Promise(resolve => {
            const t0 = performance.now();
            const tick = () => {
                if (ScriptControl.isStopRequested() || performance.now() - t0 >= ms) {
                    resolve();
                    return;
                }
                setTimeout(tick, Math.min(50, Math.max(1, ms - (performance.now() - t0))));
            };
            setTimeout(tick, Math.min(50, ms));
        });
    },
    async delayTicks(n: number): Promise<void> {
        const start = reader.loopCycle();
        const target = start + Math.max(1, n | 0);
        await Execution.delayUntil(() => reader.loopCycle() >= target, n * 700 + 8000);
    },
    delayUntil(cond: () => boolean, timeoutMs = 6000): Promise<boolean> {
        return new Promise(resolve => {
            const t0 = performance.now();
            const tick = () => {
                if (ScriptControl.isStopRequested()) {
                    resolve(false);
                    return;
                }
                try {
                    if (cond()) {
                        resolve(true);
                        return;
                    }
                } catch {
                    /* ignore */
                }
                if (timeoutMs > 0 && performance.now() - t0 > timeoutMs) {
                    resolve(false);
                    return;
                }
                setTimeout(tick, 50);
            };
            tick();
        });
    }
};

export const Game = {
    ingame: () => reader.ingame(),
    /** 0 / 1 building / **2 = scene ready**. */
    sceneState: () => reader.sceneState(),
    /**
     * Logged in **and** scene built. Prefer over bare `ingame()` before talk/walk/seed.
     * After tele, sceneState often dips to 1 while maps load — wait for 2.
     */
    sceneReady: () => reader.ingame() && reader.sceneState() === 2,
    tile: (): WorldTile | null => reader.worldTile(),
    energy: () => reader.energy(),
    runEnabled: () => reader.runEnabled(),
    animating: () => reader.selfAnim() !== -1,
    /** exactMove / routeLength only — not sticky primaryAnim. */
    busy: () => reader.playerMoving(),
    idle: () => !reader.playerMoving(),
    inCombat: () => !!abi().reader.inCombat?.(),
    /** Wait until sceneState===2 (post-login / post-tele / post-reload). */
    async waitSceneReady(timeoutMs = 90_000, log?: (m: string) => void): Promise<boolean> {
        if (Game.sceneReady()) return true;
        log?.(`wait sceneState=2 (now ${Game.sceneState()})`);
        const ok = await Execution.delayUntil(() => Game.sceneReady(), timeoutMs);
        if (!ok) log?.(`scene still ${Game.sceneState()} after ${timeoutMs}ms`);
        return ok;
    },
    /**
     * Wait until not **moving** (exact-move + route). Sticky primaryAnim is ignored —
     * some bas ready anims never go to -1 and hung the old waitIdle forever.
     * Optional short anim grace: if still animating after move clear, wait up to
     * `animGraceMs` then proceed anyway.
     */
    async waitIdle(
        timeoutMs = 12_000,
        log?: (m: string) => void,
        opts?: { animGraceMs?: number }
    ): Promise<boolean> {
        const animGraceMs = opts?.animGraceMs ?? 600;
        if (Game.idle()) {
            // Brief grace for post-forcemove anim if any
            if (Game.animating() && animGraceMs > 0) {
                await Execution.delayUntil(() => !Game.animating(), animGraceMs);
            }
            await Execution.delayTicks(1);
            return true;
        }
        log?.(`wait idle moving (anim=${reader.selfAnim()})`);
        const ok = await Execution.delayUntil(() => Game.idle(), timeoutMs);
        if (!ok) {
            log?.(
                `still moving after ${timeoutMs}ms anim=${reader.selfAnim()} — proceeding (soft)`
            );
            // Soft success: don't block the whole quest on sticky state
            await Execution.delayTicks(1);
            return true;
        }
        if (Game.animating() && animGraceMs > 0) {
            await Execution.delayUntil(() => !Game.animating(), animGraceMs);
        }
        await Execution.delayTicks(1);
        return true;
    },
    openTab(tab: number): boolean {
        return actions.setSideTab(tab);
    },
    async openSideTab(tab: number): Promise<boolean> {
        if (reader.activeSideTab() === tab) return true;
        if (!actions.setSideTab(tab)) return false;
        await Execution.delayTicks(1);
        return true;
    },
    async castOnNpc(spell: string, npc: Npc): Promise<boolean> {
        return actions.castOnNpc(spell, npc.index);
    }
};

export const ChatDialog = {
    /**
     * Chat blocked: chatModalId **or** tutComMessage (Java modalMessage —
     * parchment "Click to continue" for sticky-tutorial game mes).
     */
    isOpen: () => reader.dialogOpen(),
    /** Sticky mes text if any (e.g. "You retrieve a bar of bronze."). */
    modalMessage: () => (abi().reader.modalMessage?.() as string | null) ?? null,
    canContinue: () => {
        // modalMessage is always "clickable" (dismiss = clear field)
        if (ChatDialog.modalMessage()) return true;
        return reader.chatContinueComId() !== -1;
    },
    options: () => reader.chatOptions().map(o => o.text),
    /** Visible NPC/player dialogue lines (makes continue pages unique). */
    bodyText: () => reader.chatBodyText(),
    /**
     * True when main modal has skill multi-make inv products (smithing columns).
     * rs2b0t: `reader.mainSkillMultiItems().length > 0` — not mere mainModalId.
     */
    isMainMakePanel: () => reader.mainSkillMultiItems().length > 0,
    /** Product display names currently on the make panel (debug / stage logs). */
    mainMakeProducts: () => reader.mainSkillMultiItems().map(i => i.name ?? ''),
    /**
     * Click Make (or named op) on a product matching `label` substr.
     * Fires INV_BUTTON via adapter; waits for main modal change (panel close).
     */
    async makeFromPanel(label: string, op?: string): Promise<boolean> {
        const items = reader.mainSkillMultiItems();
        const wanted = label.toLowerCase();
        const item = items.find(i => i.name?.toLowerCase().includes(wanted));
        if (!item) return false;

        const ops = item.ops ?? [];
        const opWanted = op?.toLowerCase();
        let opIndex = opWanted
            ? ops.findIndex(o => o?.toLowerCase() === opWanted)
            : ops.findIndex(o => o != null);
        if (opIndex === -1) return false;

        const before = reader.modals().main;
        // Prefer explicit invButton (rs2b0t ActionRouter.driver.invButton)
        const fired =
            actions.invButton(item.id, item.slot, item.comId, opIndex + 1) ||
            actions.makeFromPanel(label, op);
        if (!fired) return false;

        const closed = await Execution.delayUntil(() => reader.modals().main !== before, 5000);
        if (!closed) {
            // Panel may stay open while anim starts; still count as sent
            await Execution.delayTicks(1);
        }
        return true;
    },
    /**
     * Unique id for the current chat page.
     * Continue pages used to all be `1||` (structure only) — include **body text**.
     */
    fingerprint(): string {
        if (!ChatDialog.isOpen()) return 'closed';
        const modal = ChatDialog.modalMessage() ?? '';
        const body = ChatDialog.bodyText();
        const cont = ChatDialog.canContinue() ? '1' : '0';
        const opts = ChatDialog.options().join('\u001f');
        // body first — successive NPC lines differ only here
        return `${cont}|${modal}|${body}|${opts}`;
    },
    /**
     * After a click: wait 1 tick min, then until fingerprint ≠ before (or closed).
     * Continue spam is fine when pages are unique; multi waits until options leave.
     */
    async settleAfterAction(beforeFp: string, minTicks = 1, maxTicks = 20): Promise<boolean> {
        await Execution.delayTicks(minTicks);
        for (let i = 0; i < maxTicks - minTicks; i++) {
            if (!ChatDialog.isOpen()) return true;
            const now = ChatDialog.fingerprint();
            if (now !== beforeFp) return true;
            await Execution.delayTicks(1);
        }
        return !ChatDialog.isOpen() || ChatDialog.fingerprint() !== beforeFp;
    },
    /** Spacebar-like: continue then wait for next unique page (1t floor). */
    async continue(): Promise<boolean> {
        const before = ChatDialog.fingerprint();
        if (!actions.continueDialog()) return false;
        await ChatDialog.settleAfterAction(before, 1, 16);
        return true;
    },
    async chooseOption(label: string): Promise<boolean> {
        const before = ChatDialog.fingerprint();
        const ok = actions.chooseOption([label]);
        // Multi: slightly longer — wait for options to leave / next chat
        await ChatDialog.settleAfterAction(before, 1, 24);
        return ok;
    },
    async advance(): Promise<boolean> {
        const before = ChatDialog.fingerprint();
        if (actions.continueDialog()) {
            await ChatDialog.settleAfterAction(before, 1, 16);
            return true;
        }
        if (ChatDialog.options().length) {
            const ok = actions.advanceDialog();
            await ChatDialog.settleAfterAction(before, 1, 24);
            return ok;
        }
        return false;
    }
};

/**
 * True when chat modal is open **and** has a Continue or choice (clickable).
 * Prefer for "can AdvanceDialog do work this tick?"
 */
export function interactiveDialog(): boolean {
    return ChatDialog.isOpen() && (ChatDialog.canContinue() || ChatDialog.options().length > 0);
}

/**
 * True when it is safe to walk / Talk-to / use-with.
 * Matches rs2b0t tutorial stages: `!ChatDialog.isOpen()` — not "no clickable button".
 * Open chat without detected Continue still blocks actions (smelt → hammer talk bug).
 */
export function noDialog(): boolean {
    return !ChatDialog.isOpen();
}

/**
 * Click through open chat until closed or max steps.
 * Prefer leaving multi-page NPC chains to AdvanceDialog (one click/tick) so
 * content p_delay / inv_add / objbox run in order — bulk-clear can skip gifts.
 */
export async function clearDialogs(maxSteps = 12): Promise<boolean> {
    for (let i = 0; i < maxSteps; i++) {
        if (!ChatDialog.isOpen()) return true;
        // modalMessage first (tutComMessage)
        if (!(await ChatDialog.advance())) {
            await Execution.delayTicks(1);
        }
    }
    return !ChatDialog.isOpen();
}

export const Bank = {
    isOpen: () => !!abi().reader.bankOpen?.(),
    async close(): Promise<boolean> {
        if (!Bank.isOpen()) return true;
        actions.closeModal();
        return Execution.delayUntil(() => !Bank.isOpen(), 3000);
    }
};

export const Equipment = {
    items: () => (abi().reader.equipment?.() ?? []).map((s: InvSnap) => new InvItem(s)),
    contains(name: string): boolean {
        const w = name.toLowerCase();
        return Equipment.items().some(i => i.name?.toLowerCase() === w || (i.name && i.name.toLowerCase().includes(w)));
    },
    async equip(name: string): Promise<boolean> {
        if (Equipment.contains(name)) return true;
        if (Bank.isOpen()) await Bank.close();
        const ok = actions.equip(name);
        if (!ok) return false;
        return Execution.delayUntil(() => Equipment.contains(name), 3000);
    }
};

export class InvItem {
    constructor(readonly snap: InvSnap) {}
    get name() {
        return this.snap.name;
    }
    get id() {
        return this.snap.id;
    }
    get slot() {
        return this.snap.slot;
    }
    get count() {
        return this.snap.count;
    }
    actions(): string[] {
        return (this.snap.ops ?? []).filter((o): o is string => !!o);
    }
    async useOn(target: InvItem | Loc | Npc): Promise<boolean> {
        if (target instanceof InvItem) {
            return actions.useHeldOnHeld(this.snap as Any, target.snap as Any);
        }
        if (target instanceof Npc) {
            // Pass inv snap so id/slot win over display-name collisions
            return actions.useHeldOnNpc(this.snap as Any, target.snap.name ?? '');
        }
        // Loc: pass inv + loc snaps (id/slot/comId + typecode/lx/lz) — no name re-query
        return actions.useHeldOnLoc(this.snap as Any, target.snap as Any, 15);
    }
    async interact(action: string): Promise<boolean> {
        const want = action.toLowerCase();
        const ops = this.snap.ops ?? [];
        const idx = ops.findIndex(o => o && o.toLowerCase() === want);
        if (idx >= 0) return actions.heldOp(this.snap.name ?? '', idx + 1);
        if (/wield|wear|equip/i.test(action)) return actions.equip(this.snap.name ?? '');
        return actions.useHeld(this.snap.name ?? '');
    }
}

export const Inventory = {
    items: () => reader.inventory().map(s => new InvItem(s)),
    /** Exact name match (case-insensitive), same as rs2b0t Inventory.first. */
    first(name: string): InvItem | null {
        const w = name.toLowerCase();
        return Inventory.items().find(i => i.name?.toLowerCase() === w) ?? null;
    },
    /**
     * Substring match when exact is too brittle — **opt-in only**.
     * Do not use for stage gates (e.g. "Bronze bar" must not use includes).
     */
    firstIncludes(name: string): InvItem | null {
        const w = name.toLowerCase();
        return Inventory.items().find(i => i.name && i.name.toLowerCase().includes(w)) ?? null;
    },
    /** Exact only — rs2b0t parity (`Inventory.contains` → `first !== null`). */
    contains(name: string): boolean {
        return Inventory.first(name) !== null;
    },
    count(name: string): number {
        const w = name.toLowerCase();
        return reader
            .inventory()
            .filter(i => i.name && i.name.toLowerCase() === w)
            .reduce((s, i) => s + i.count, 0);
    },
    /** Debug: `name#id@slot` list for logs / stalls. */
    debugList(): string {
        return Inventory.items()
            .map(i => `${i.name ?? '?'}#${i.id}@${i.slot}`)
            .join(',');
    },
    async interact(name: string, _action = 'Use'): Promise<boolean> {
        return actions.useHeld(name);
    }
};

export const Skills = {
    index(name: string): number {
        const w = name.toLowerCase();
        for (let i = 0; i < reader.skillCount(); i++) {
            if (reader.stat(i).name === w) return i;
        }
        return -1;
    },
    level(name: string): number {
        const i = Skills.index(name);
        return i === -1 ? 0 : reader.stat(i).base;
    },
    effective(name: string): number {
        const i = Skills.index(name);
        return i === -1 ? 0 : reader.stat(i).effective;
    },
    xp(name: string): number {
        const i = Skills.index(name);
        return i === -1 ? 0 : reader.stat(i).xp;
    }
};

export class Npc {
    constructor(readonly snap: NpcSnap) {}
    get name() {
        return this.snap.name;
    }
    get index() {
        return this.snap.index;
    }
    get inCombat() {
        return !!this.snap.inCombat;
    }
    tile() {
        return this.snap.tile;
    }
    distance() {
        return this.snap.distance;
    }
    actions() {
        return this.snap.ops.filter((o): o is string => !!o);
    }
    async interact(action: string): Promise<boolean> {
        const want = action.toLowerCase();
        const ops = this.snap.ops;
        const idx = ops.findIndex(o => o && (o.toLowerCase() === want || o.toLowerCase().includes(want)));
        if (idx >= 0 && actions.npcOp) {
            return actions.npcOp(this.snap.index, idx + 1);
        }
        if (want.includes('attack')) return actions.attackNpc(this.snap.name ?? '');
        return actions.talkNpc(this.snap.name ?? '');
    }
}

/** OP_LOC1..5 — must match attach-in-page / MiniMenuAction 377. */
const OP_LOC_CODES = [625, 721, 743, 357, 1071];

export class Loc {
    constructor(readonly snap: LocSnap) {}
    get name() {
        return this.snap.name;
    }
    get id() {
        return this.snap.id;
    }
    get typecode() {
        return this.snap.typecode;
    }
    tile() {
        return { x: this.snap.x, z: this.snap.z, level: 0 };
    }
    distance() {
        return this.snap.distance;
    }
    actions() {
        return this.snap.ops.filter((o): o is string => !!o);
    }
    /**
     * Interact with **this** loc instance (typecode + local tile).
     * Do **not** re-query by display name — many doors share name "Door" and name-based
     * opLoc picks the nearest, which swaps chef door-in (3079,3084) with door-out (3072,3090).
     */
    async interact(action: string): Promise<boolean> {
        const want = action.toLowerCase();
        const ops = this.snap.ops;
        let opIndex = 0;
        if (want) {
            const idx = ops.findIndex(o => o && (o.toLowerCase() === want || o.toLowerCase().includes(want)));
            if (idx >= 0) opIndex = idx;
        }
        const code = OP_LOC_CODES[opIndex];
        if (code == null) return false;
        // Exact scene loc (same as a real menu click on this object)
        if (this.snap.typecode != null && this.snap.lx != null && this.snap.lz != null) {
            return actions.menuAction(code, this.snap.typecode, this.snap.lx, this.snap.lz);
        }
        // Fallback: world-tile lookup (still not name-nearest)
        return actions.opLocAt(this.snap.x, this.snap.z, action);
    }
}

type Pred<T> = (e: T) => boolean;

class EntityQuery<T extends { name: string | null; distance(): number; actions(): string[]; tile(): WorldTile; id?: number }> {
    private filters: Pred<T>[] = [];
    constructor(private supplier: () => T[]) {}
    name(...names: string[]): this {
        const w = names.map(n => n.toLowerCase());
        this.filters.push(e => e.name !== null && w.includes(e.name.toLowerCase()));
        return this;
    }
    action(action: string): this {
        const w = action.toLowerCase();
        this.filters.push(e => e.actions().some(a => a.toLowerCase() === w || a.toLowerCase().includes(w)));
        return this;
    }
    within(dist: number): this {
        this.filters.push(e => e.distance() <= dist);
        return this;
    }
    inside(box: { minX: number; maxX: number; minZ: number; maxZ: number }): this {
        this.filters.push(e => {
            const t = e.tile();
            return t.x >= box.minX && t.x <= box.maxX && t.z >= box.minZ && t.z <= box.maxZ;
        });
        return this;
    }
    where(pred: Pred<T>): this {
        this.filters.push(pred);
        return this;
    }
    private run(): T[] {
        return this.supplier().filter(e => this.filters.every(f => f(e)));
    }
    exists(): boolean {
        return this.run().length > 0;
    }
    nearest(): T | null {
        const all = this.run().sort((a, b) => a.distance() - b.distance());
        return all[0] ?? null;
    }
    first(): T | null {
        return this.run()[0] ?? null;
    }
    all(): T[] {
        return this.run();
    }
    results(): T[] {
        return this.run();
    }
}

export const Npcs = {
    query: () => new EntityQuery(() => reader.npcs().map(s => new Npc(s)))
};

/** Ground stack snapshot (attach reader.groundItems). */
export type GroundSnap = {
    id: number;
    name: string | null;
    count: number;
    ops: (string | null)[];
    tile: WorldTile;
    lx: number;
    lz: number;
    distance: number;
};

export class GroundItem {
    constructor(readonly snap: GroundSnap) {}
    get name() {
        return this.snap.name;
    }
    get id() {
        return this.snap.id;
    }
    get count() {
        return this.snap.count;
    }
    distance() {
        return this.snap.distance;
    }
    tile() {
        return this.snap.tile;
    }
    actions() {
        return (this.snap.ops ?? []).filter((o): o is string => !!o);
    }
    async interact(action = 'Take'): Promise<boolean> {
        const want = action.toLowerCase();
        const ops = this.snap.ops ?? [];
        let op = 3; // default Take → OP_OBJ3
        for (let i = 0; i < ops.length; i++) {
            if (ops[i] && String(ops[i]).toLowerCase().includes(want)) {
                op = i + 1;
                break;
            }
        }
        return actions.takeObj(this.snap.lx, this.snap.lz, this.snap.id, op);
    }
}

export const GroundItems = {
    all: (maxDist = 24): GroundItem[] => {
        const list = (abi().reader.groundItems?.({ maxDist }) ?? []) as GroundSnap[];
        return list.map(s => new GroundItem(s));
    },
    nearest: (nameSubstr: string, maxDist = 16): GroundItem | null => {
        const want = nameSubstr.toLowerCase();
        const list = GroundItems.all(maxDist);
        return (
            list.find(g => g.name && g.name.toLowerCase() === want) ??
            list.find(g => g.name && g.name.toLowerCase().includes(want)) ??
            null
        );
    }
};

export const Locs = {
    /**
     * Default scan radius **15** (scene tiles). Do not widen to 40 — many locs share
     * display names ("Door") and a large radius causes wrong nearest picks on compact
     * buildings (chef door-in vs door-out are only ~8 tiles apart).
     */
    query: () =>
        new EntityQuery(() =>
            reader.locs({ maxDist: 15 }).map(s => {
                const loc = new Loc(s);
                return loc as Loc & {
                    name: string | null;
                    id: number;
                    distance(): number;
                    actions(): string[];
                    tile(): WorldTile;
                };
            })
        )
};

export interface Task {
    validate(): boolean | Promise<boolean>;
    execute(): void | Promise<void>;
}

/**
 * Shot policy from Node host (`run.mjs` → `globalThis.__harnessShotPolicy`).
 * Playwright page.screenshot freezes/composites the WebGL canvas and **artifacts**
 * the live view — keep auto shots rare/off during play.
 */
function shotPolicy(): { autoStall: boolean; maxStallShots: number } {
    const p = (globalThis as Any).__harnessShotPolicy;
    return {
        // Default OFF: SHOT_INTERVAL_MS=0 must not still spam stall-* PNGs
        autoStall: p?.autoStall === true,
        maxStallShots: Math.max(0, Number(p?.maxStallShots ?? 1) | 0)
    };
}

/**
 * Request a Playwright screenshot from the Node host (run.mjs bridge).
 * No-op if bridge missing (manual browser play). Returns path or null.
 */
export async function harnessShot(label: string): Promise<string | null> {
    const fn = (globalThis as Any).__harnessShot;
    if (typeof fn !== 'function') return null;
    try {
        return (await fn(String(label || 'shot'))) as string | null;
    } catch {
        return null;
    }
}

/**
 * Task host paced on **client game ticks** (`Client.loopCycle`), not wall-clock.
 *
 * Decision 007: no rs2b0t `loopDelay = 600` thrash. Between cycles wait for
 * `reader.loopCycle()` via {@link Execution.delayTicks}.
 */
export abstract class TaskBot {
    /** Game ticks after a task **execute** (default 1 = next Client.loopCycle). */
    loopTicks = 1;
    /** Game ticks when no task validated. */
    idleTicks = 1;

    private tasks: Task[] = [];
    private stopped = false;
    /** Stall detection: same stage name + tile → optional auto screenshot */
    private stallKey = '';
    private stallCount = 0;
    private stallShotsTaken = 0;

    log(msg: string): void {
        console.log(`[script] ${msg}`);
        // Panel / LogBus (rs2b0t ScriptContext.addLog stand-in) — set on global by client-entry
        try {
            (globalThis as Any).__harnessLogBus?.add?.('info', msg);
        } catch {
            /* ignore */
        }
    }

    /** Shot helper for stages: this.bot.shot('chef-door') */
    async shot(label: string): Promise<string | null> {
        const p = await harnessShot(label);
        if (p) this.log(`shot ${label} → ${p}`);
        return p;
    }

    protected add(...tasks: Task[]): void {
        this.tasks.push(...tasks);
    }

    abstract onStart(): void | Promise<void>;

    stop(): void {
        this.stopped = true;
        ScriptControl.requestStop();
        // Halt client movement + nav paint/camera (cooperative + immediate)
        try {
            abi()?.actions?.abortMovement?.();
        } catch {
            /* ignore */
        }
        try {
            const nav = (globalThis as Any).__lc377Nav;
            nav?.PathPublish?.clear?.();
            nav?.PathCameraFollow?.release?.();
        } catch {
            /* ignore */
        }
    }

    async run(maxMs = 30 * 60_000): Promise<'ok' | 'timeout' | 'stopped' | 'done'> {
        this.stopped = false;
        ScriptControl.clearStop();
        // rs2b0t RunManager.enable() at bot start — energy floor + combat override
        RunManager.enable();
        RunManager.tick();
        await this.onStart();
        const t0 = performance.now();
        let lastSceneWaitLog = 0;
        while (!this.stopped && !ScriptControl.isStopRequested() && performance.now() - t0 < maxMs) {
            RunManager.tick();
            if (typeof (this as Any).done === 'function' && (this as Any).done()) {
                this.log('done() true — stopping');
                await harnessShot('done');
                return 'done';
            }
            if (!reader.ingame()) {
                this.log('not ingame — stopping');
                await harnessShot('not-ingame');
                return 'stopped';
            }
            // sceneState 0/1 = maps rebuilding (login, tele, reload). Do NOT run tasks —
            // menuAction/walk soft-fail and thrash OP packets (rs2b0t "logged in" debt).
            if (!Game.sceneReady()) {
                const now = performance.now();
                if (now - lastSceneWaitLog > 3000) {
                    lastSceneWaitLog = now;
                    this.log(`wait sceneState=2 (now ${reader.sceneState()}) — pause world tasks`);
                }
                await Execution.delayTicks(Math.max(1, this.idleTicks | 0));
                continue;
            }
            let ran = false;
            let ranName = '';
            for (const t of this.tasks) {
                if (this.stopped || ScriptControl.isStopRequested()) break;
                let ok = false;
                try {
                    ok = !!(await t.validate());
                } catch (e) {
                    this.log(`validate error: ${e}`);
                }
                if (ok) {
                    ranName = (t as Any).constructor?.name ?? 'Task';
                    try {
                        await t.execute();
                    } catch (e) {
                        this.log(`execute error: ${e}`);
                        await harnessShot(`error-${ranName}`);
                    }
                    ran = true;
                    break;
                }
            }
            // Optional stall shots (OFF unless host sets __harnessShotPolicy.autoStall).
            // page.screenshot artifacts the game canvas — never spam while stuck.
            const tile = reader.worldTile();
            const key = `${ranName}|${tile?.x ?? '?'},${tile?.z ?? '?'}`;
            if (ran && key === this.stallKey) {
                this.stallCount++;
            } else {
                this.stallKey = key;
                this.stallCount = ran ? 1 : 0;
                this.stallShotsTaken = 0;
            }
            const pol = shotPolicy();
            if (
                pol.autoStall &&
                this.stallCount === 8 &&
                this.stallShotsTaken < pol.maxStallShots
            ) {
                this.stallShotsTaken++;
                await harnessShot(`stall-${ranName || 'idle'}-${this.stallCount}`);
            }
            // Pace on Client.loopCycle — not wall-clock loopDelay
            const ticks = ran ? Math.max(1, this.loopTicks | 0) : Math.max(1, this.idleTicks | 0);
            await Execution.delayTicks(ticks);
            if (this.stopped || ScriptControl.isStopRequested()) {
                break;
            }
            if (!reader.ingame()) {
                this.log('not ingame — stopping');
                await harnessShot('not-ingame');
                return 'stopped';
            }
        }
        const wasStop = this.stopped || ScriptControl.isStopRequested();
        await harnessShot(wasStop ? 'stopped' : 'timeout');
        return wasStop ? 'stopped' : 'timeout';
    }
}

export { ScriptControl } from './ScriptControl.ts';

export abstract class StageTask implements Task {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(protected bot: any) {}
    abstract validate(): boolean;
    abstract execute(): Promise<void>;
}

/**
 * Adjacent-only scene tryMove (Chebyshev ≤ 3). Never used as a far-walk fallback —
 * that thrash (re-click short steps after pack walk failed) is what broke path-abc.
 */
async function walkAdjacent(tile: { x: number; z: number }): Promise<boolean> {
    const me = Game.tile();
    if (!me) return false;
    const local = reader.toLocal(tile.x, tile.z);
    if (local && actions.walkTo(local.lx, local.lz)) {
        await Execution.delayTicks(2);
        return true;
    }
    if (actions.walkWorld(tile.x, tile.z)) {
        await Execution.delayTicks(2);
        return true;
    }
    await Execution.delayTicks(1);
    return false;
}

function navWalkLog(m: string): void {
    // Corridor / repath chatter is useful while proving the walker
    if (
        /^(path ok|door |fail|timeout|unavailable|arrived|closest|deviated|stuck|stall|client walk|giving up|repath)/i.test(
            m
        )
    ) {
        console.log(`[script] ${m}`);
    }
}

/** Set by client-entry after nav module loads. */
type NavApi = {
    walkTo: (
        dest: { x: number; z: number; level?: number },
        opts?: { radius?: number; timeoutMs?: number; log?: (m: string) => void }
    ) => Promise<boolean>;
    ensureNav?: () => Promise<unknown>;
};

function harnessNav(): NavApi | null {
    return ((globalThis as Any).__lc377Nav as NavApi | undefined) ?? null;
}

/**
 * Walk toward a world tile (rs2b0t Traversal.walkTo semantics).
 * - **Near (Chebyshev ≤ 3):** one scene tryMove
 * - **Farther:** classic pack walker only — **no** short-step thrash fallback
 */
export async function walkToward(tile: { x: number; z: number; level?: number }): Promise<boolean> {
    const me = Game.tile();
    if (!me) return false;
    const d = Math.max(Math.abs(me.x - tile.x), Math.abs(me.z - tile.z));
    if (d <= 3) {
        return walkAdjacent(tile);
    }
    const nav = harnessNav();
    if (!nav?.walkTo) {
        console.warn('[walkToward] nav not ready — refusing thrash fallback for far walk');
        return false;
    }
    try {
        return await nav.walkTo(tile, {
            radius: 2,
            timeoutMs: 180_000,
            log: navWalkLog
        });
    } catch (e) {
        console.warn('[walkToward] nav walkTo error', e);
        return false;
    }
}

/**
 * World walker (rs2b0t Traversal.walkTo) — same pack as walkToward; extra opts.
 */
export const Traversal = {
    async walkTo(
        dest: { x: number; z: number; level?: number },
        opts?: { radius?: number; timeoutMs?: number; log?: (m: string) => void }
    ): Promise<boolean> {
        const nav = harnessNav();
        if (!nav?.walkTo) {
            console.warn('[Traversal] nav not ready');
            return false;
        }
        // Long walks block TaskBot — tick autorun before entering walker
        RunManager.enable();
        RunManager.tick();
        try {
            return await nav.walkTo(dest, {
                radius: opts?.radius ?? 2,
                timeoutMs: opts?.timeoutMs ?? 180_000,
                log: opts?.log ?? navWalkLog
            });
        } catch (e) {
            console.warn('[Traversal] nav walkTo error', e);
            return false;
        }
    }
};

export { RunManager, shouldEnableRun } from './RunManager.ts';
export type { RunState, RunPolicy } from './RunManager.ts';

/** Wait until within Chebyshev distance of a world tile (action outcome). */
export async function arriveNear(tile: { x: number; z: number }, dist = 2, timeoutMs = 8000): Promise<boolean> {
    return Execution.delayUntil(() => {
        const t = Game.tile();
        return t !== null && Math.max(Math.abs(t.x - tile.x), Math.abs(t.z - tile.z)) <= dist;
    }, timeoutMs);
}

export function doorAt(tile: { x: number; z: number }, pad = 2) {
    return Locs.query()
        .name('Door')
        .action('Open')
        .inside({ minX: tile.x - pad, maxX: tile.x + pad, minZ: tile.z - pad, maxZ: tile.z + pad });
}

export const ActionRouter = {
    driver: {
        walk(lx: number, lz: number) {
            return actions.walkTo(lx, lz);
        },
        interactNpc(index: number, op: number) {
            return actions.npcOp(index, op);
        },
        interactLoc(lx: number, lz: number, typecode: number, op: number) {
            const codes = [625, 721, 743, 357, 1071];
            return actions.menuAction(codes[op - 1] ?? 625, typecode, lx, lz);
        },
        heldOp(id: number, slot: number, comId: number, op: number) {
            const codes = [694, 962, 795, 681, 100];
            return actions.menuAction(codes[op - 1] ?? 694, id, slot, comId);
        },
        /** INV_BUTTON1..5 — smith column Make / Make 5 / Make 10 (1-based op). */
        invButton(objId: number, slot: number, comId: number, op: number) {
            return actions.invButton(objId, slot, comId, op);
        }
    }
};
