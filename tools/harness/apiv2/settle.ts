import { readSnap } from './read.ts';
import type { Evidence, Outcome, SendResult, SettleOptions } from './types.ts';

async function sleep(ms: number): Promise<void> {
    await new Promise(r => setTimeout(r, ms));
}

/**
 * Isolation default is 300ms (WORLD_SPEED_MS). loopCycle is a client frame
 * counter — do not use it as a tick clock (PR 604 budgets are server ticks).
 */
function tickMs(): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const n = Number((globalThis as any).__lc377?.worldSpeedMs);
    return Number.isFinite(n) && n >= 50 ? n : 300;
}

export async function ticks(count: number): Promise<void> {
    await sleep(Math.max(1, count) * tickMs());
}

export async function until(opts: SettleOptions): Promise<Outcome> {
    const before = opts.since ?? readSnap();
    for (let i = 0; i < opts.budgetTicks; i++) {
        await ticks(1);
        const now = readSnap();
        if (!now.attached || !now.ingame) {
            return { kind: 'expired', now, before, tick: now.tick };
        }
        for (const [arm, pred] of Object.entries(opts.arms)) {
            if (pred(now, before)) {
                return { kind: 'matched', arm, now, before, tick: now.tick };
            }
        }
    }
    const now = readSnap();
    return { kind: 'expired', now, before, tick: now.tick };
}

export async function perform(
    send: () => SendResult,
    opts: SettleOptions
): Promise<Outcome> {
    const before = readSnap();
    const sent = send();
    if (!sent.sent) {
        return { kind: 'refused', reason: sent.reason, tick: sent.tick };
    }
    return until({ ...opts, since: before });
}
