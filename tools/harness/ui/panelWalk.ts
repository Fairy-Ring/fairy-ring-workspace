/**
 * Panel-driven WalkTo — uses harness Traversal/nav walkTo + ScriptControl stop.
 * Independent of path-abc/tutorial scripts (Stop still aborts via ScriptControl).
 */
import { LogBus } from '../script/logBus.ts';
import { ScriptControl } from '../script/browser/ScriptControl.ts';
import type { WalkDestination } from './walkDestinations.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export type PanelWalkStatus = {
    active: boolean;
    label: string;
    dest: { x: number; z: number; level: number } | null;
};

let active = false;
let label = '';
let dest: { x: number; z: number; level: number } | null = null;

export function getPanelWalkStatus(): PanelWalkStatus {
    return { active, label, dest };
}

export function isPanelWalkActive(): boolean {
    return active;
}

/** Fire-and-forget walk; returns when arrived / failed / stopped. */
export async function panelWalkTo(
    tile: { x: number; z: number; level?: number },
    opts?: { label?: string; radius?: number; timeoutMs?: number }
): Promise<boolean> {
    const nav = (globalThis as Any).__lc377Nav;
    if (!nav?.walkTo) {
        LogBus.add('error', 'WalkTo: nav not ready');
        return false;
    }
    if (active) {
        LogBus.add('warn', 'WalkTo: already walking — stop first');
        return false;
    }

    // If a script is running, stop it so we own ScriptControl cleanly
    const scripts = (globalThis as Any).__lc377?.scripts;
    if (scripts?.running?.()) {
        LogBus.add('info', 'WalkTo: stopping script first');
        scripts.stop();
        await new Promise(r => setTimeout(r, 100));
    }

    ScriptControl.clearStop();
    active = true;
    dest = { x: tile.x, z: tile.z, level: tile.level ?? 0 };
    label = opts?.label ?? `${dest.x},${dest.z},${dest.level}`;
    LogBus.add('info', `WalkTo → ${label}`);

    try {
        const ok = await nav.walkTo(dest, {
            radius: opts?.radius ?? 3,
            timeoutMs: opts?.timeoutMs ?? 300_000,
            log: (m: string) => {
                if (/^(path ok|door |fail|timeout|arrived|closest|interrupted|stuck|deviated|walkTo)/i.test(m)) {
                    LogBus.add('info', `[walk] ${m}`);
                }
            }
        });
        if (ScriptControl.isStopRequested()) {
            LogBus.add('info', `WalkTo stopped before ${label}`);
            return false;
        }
        LogBus.add('info', ok ? `WalkTo arrived ${label}` : `WalkTo short/fail ${label}`);
        return ok;
    } catch (e) {
        LogBus.add('error', `WalkTo error: ${e}`);
        return false;
    } finally {
        active = false;
        dest = null;
        label = '';
    }
}

export async function panelWalkDestination(d: WalkDestination, radius = 3): Promise<boolean> {
    return panelWalkTo({ x: d.x, z: d.z, level: d.level }, { label: d.name, radius });
}

export function panelWalkStop(): void {
    if (!active && !(globalThis as Any).__lc377?.scripts?.running?.()) {
        ScriptControl.requestStop();
        try {
            (globalThis as Any).__lc377?.actions?.abortMovement?.();
        } catch {
            /* ignore */
        }
        LogBus.add('info', 'WalkTo stop (idle)');
        return;
    }
    ScriptControl.requestStop();
    try {
        (globalThis as Any).__lc377?.actions?.abortMovement?.();
    } catch {
        /* ignore */
    }
    const nav = (globalThis as Any).__lc377Nav;
    try {
        nav?.PathPublish?.clear?.();
        nav?.PathCameraFollow?.release?.();
    } catch {
        /* ignore */
    }
    LogBus.add('info', 'WalkTo stop requested');
}
