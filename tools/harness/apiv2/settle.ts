import { readSnap } from './read.ts';
import type { Evidence, Outcome, SendResult, SettleOptions } from './types.ts';

async function sleep(ms: number): Promise<void> {
    await new Promise(r => setTimeout(r, ms));
}

/** One game tick on isolation is often 100–300ms. Poll, do not assume 600. */
const POLL_MS = 50;

export async function ticks(count: number): Promise<void> {
    const start = readSnap().tick;
    const deadline = Date.now() + Math.max(1, count) * 800;
    while (Date.now() < deadline) {
        if (readSnap().tick - start >= count) return;
        await sleep(POLL_MS);
    }
}

export async function until(opts: SettleOptions): Promise<Outcome> {
    const before = opts.since ?? readSnap();
    const startTick = before.tick;
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
        if (now.tick - startTick >= opts.budgetTicks) break;
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
