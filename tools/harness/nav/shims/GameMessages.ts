/**
 * Thin GameMessages ring — rs2b0t events/gameMessages rebound to harness chat.
 *
 * Without EventBus producers, we snapshot chat on mark/sawSince:
 * a match counts if it appears in current chat and was not in the mark snapshot
 * (or appears more times than at mark).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export interface GameMessage {
    seq: number;
    text: string;
}

export const CANT_REACH = /^i can't reach that/i;

const CAP = 64;
let ring: GameMessage[] = [];
let lastSeq = 0;
/** mark id → chat text multiset at mark time */
const markSnaps = new Map<number, string[]>();

function abi(): Any {
    return (globalThis as Any).__lc377;
}

function chatTexts(count = 24): string[] {
    const r = abi()?.reader;
    if (typeof r?.chat !== 'function') return [];
    const lines = (r.chat(count) ?? []) as { text?: string }[];
    return lines.map(l => String(l?.text ?? '').trim()).filter(t => t.length > 0);
}

function countMatches(texts: readonly string[], pattern: RegExp): number {
    let n = 0;
    for (const t of texts) {
        if (pattern.test(t)) n++;
    }
    return n;
}

class GameMessagesImpl {
    record(text: string): void {
        const t = String(text ?? '').trim();
        if (!t) return;
        ring.push({ seq: ++lastSeq, text: t });
        if (ring.length > CAP) ring.shift();
    }

    mark(): number {
        const id = ++lastSeq;
        markSnaps.set(id, chatTexts(24));
        // prune old marks
        if (markSnaps.size > 32) {
            const keys = [...markSnaps.keys()].sort((a, b) => a - b);
            for (const k of keys.slice(0, keys.length - 16)) markSnaps.delete(k);
        }
        return id;
    }

    since(mark: number): GameMessage[] {
        const before = markSnaps.get(mark) ?? [];
        const now = chatTexts(24);
        const out: GameMessage[] = [];
        // Lines in `now` that are "new" relative to multiset before (order-insensitive bag diff)
        const bag = new Map<string, number>();
        for (const t of before) bag.set(t, (bag.get(t) ?? 0) + 1);
        for (const t of now) {
            const c = bag.get(t) ?? 0;
            if (c > 0) bag.set(t, c - 1);
            else out.push({ seq: mark + out.length + 1, text: t });
        }
        return out;
    }

    sawSince(mark: number, pattern: RegExp): boolean {
        const before = markSnaps.get(mark) ?? [];
        const now = chatTexts(24);
        // More matching lines now than at mark, or any match among bag-diff new lines
        if (countMatches(now, pattern) > countMatches(before, pattern)) return true;
        return this.since(mark).some(m => pattern.test(m.text));
    }

    reset(): void {
        ring = [];
        lastSeq = 0;
        markSnaps.clear();
    }
}

export const GameMessages = new GameMessagesImpl();
