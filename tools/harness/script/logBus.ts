/**
 * Script log bus — thin stand-in for rs2b0t ScriptContext.addLog / onLog.
 * Panel and console both subscribe; full ScriptRunner can replace this later.
 */
export type LogLevel = 'info' | 'warn' | 'error';

export type LogLine = {
    level: LogLevel;
    msg: string;
    t: number;
};

const MAX = 800;
const lines: LogLine[] = [];
const listeners = new Set<() => void>();

export const LogBus = {
    lines(): readonly LogLine[] {
        return lines;
    },

    add(level: LogLevel, msg: string): void {
        const m = String(msg);
        // Collapse consecutive identical lines (live heartbeat spam)
        const last = lines[lines.length - 1];
        if (last && last.level === level && last.msg === m) {
            last.t = performance.now();
            for (const cb of listeners) {
                try {
                    cb();
                } catch {
                    /* ignore */
                }
            }
            return;
        }
        lines.push({ level, msg: m, t: performance.now() });
        if (lines.length > MAX) lines.splice(0, lines.length - MAX);
        for (const cb of listeners) {
            try {
                cb();
            } catch {
                /* ignore */
            }
        }
    },

    clear(): void {
        lines.length = 0;
        for (const cb of listeners) {
            try {
                cb();
            } catch {
                /* ignore */
            }
        }
    },

    onChange(cb: () => void): () => void {
        listeners.add(cb);
        return () => listeners.delete(cb);
    }
};
