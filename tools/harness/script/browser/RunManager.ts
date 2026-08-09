/**
 * Auto-run enabler — port of rs2b0t `src/bot/runtime/RunManager.ts`.
 *
 * Turn run **on** when energy is above a floor (default 20%), never while a
 * main modal is open (bank/shop — rs2b0t #117), except when attacked.
 *
 * Uses `__lc377` ABI directly (no import from api.ts — avoids cycle with TaskBot).
 *
 * Policy: `globalThis.__harnessRunPolicy = { runAuto?: boolean, energyMin?: number }`
 *
 * @see rs2b0t RunManager / shouldEnableRun
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const RUN_AUTO_DEFAULT = true;
const ENERGY_MIN_DEFAULT = 20;
/** Any energy while attacked — walk away from combat. */
const ENERGY_MIN_ATTACKED = 1;
const CHECK_MS = 1500;
/** Controls side tab (run orb lives here). */
const CONTROLS_TAB = 12;

export interface RunState {
    runOn: boolean;
    inCombat: boolean;
    energy: number;
    energyMin: number;
    modalOpen: boolean;
}

export interface RunPolicy {
    /** Master switch (default true). */
    runAuto?: boolean;
    /** Min energy % to enable run when not attacked (default 20). */
    energyMin?: number;
}

function abi(): Any {
    return (globalThis as Any).__lc377;
}

function policy(): Required<Pick<RunPolicy, 'runAuto' | 'energyMin'>> {
    const p = (globalThis as Any).__harnessRunPolicy as RunPolicy | undefined;
    return {
        runAuto: p?.runAuto !== false && (p?.runAuto ?? RUN_AUTO_DEFAULT),
        energyMin: Math.max(0, Math.min(100, Number(p?.energyMin ?? ENERGY_MIN_DEFAULT) | 0))
    };
}

/**
 * Pure gate — unit-testable. Under attack, regen floor is ignored.
 * @see rs2b0t shouldEnableRun
 */
export function shouldEnableRun(s: RunState): boolean {
    if (s.runOn) return false;
    // Toggling run clicks controls UI; server closes open modal (#117).
    // Wait for modal close unless attacked.
    if (s.modalOpen && !s.inCombat) return false;
    return s.energy >= (s.inCombat ? ENERGY_MIN_ATTACKED : s.energyMin);
}

class RunManagerImpl {
    private enabled = false;
    private nextCheckAt = 0;
    private lastLogAt = 0;

    /** Start auto-run (idempotent). Call from TaskBot.run / script host. */
    enable(): void {
        this.enabled = true;
    }

    disable(): void {
        this.enabled = false;
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * One tick — safe to call every frame / loop / walk step.
     * Throttled to CHECK_MS unless under attack with run off.
     */
    tick(): void {
        if (!this.enabled) return;

        const pol = policy();
        if (!pol.runAuto) return;

        const h = abi();
        const r = h?.reader;
        const a = h?.actions;
        if (!r?.ingame?.() || !a?.setRun) return;

        let runOn = false;
        try {
            runOn = !!r.runEnabled?.();
        } catch {
            return;
        }

        const combat = !!r.inCombat?.();
        const attacked = !runOn && combat;
        const now = performance.now();
        if (now < this.nextCheckAt && !attacked) return;
        this.nextCheckAt = now + CHECK_MS;

        try {
            // Controls tab not unlocked (tutorial) — can't toggle run
            if ((r.sideTabInterface?.(CONTROLS_TAB) ?? -1) === -1) return;

            const modalMain = r.modals?.()?.main ?? -1;
            const energy = (r.energy?.() ?? 0) | 0;
            const state: RunState = {
                runOn,
                inCombat: combat,
                energy,
                energyMin: pol.energyMin,
                modalOpen: modalMain !== -1
            };

            if (!shouldEnableRun(state)) return;

            const ok = !!a.setRun(true);
            if (ok && now - this.lastLogAt > 15_000) {
                this.lastLogAt = now;
                console.log(
                    `[run] auto on (energy=${state.energy}% combat=${state.inCombat})`
                );
            }
        } catch {
            /* never break scripts */
        }
    }
}

export const RunManager = new RunManagerImpl();
