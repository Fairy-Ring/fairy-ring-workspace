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

const MAX = 400;
const lines: LogLine[] = [];
const listeners = new Set<() => void>();

export const LogBus = {
    lines(): readonly LogLine[] {
        return lines;
    },

    add(level: LogLevel, msg: string): void {
        lines.push({ level, msg: String(msg), t: performance.now() });
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
