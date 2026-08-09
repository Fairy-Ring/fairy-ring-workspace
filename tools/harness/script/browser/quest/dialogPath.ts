/**
 * Pick a multi-choice dialog option from a **script-ordered path**.
 *
 * When porting quests we already know the multi tree (see `.rs2` `@multiN(...)`).
 * Prefer that path — do **not** default to the last option (usually decline).
 *
 * @param opts live option strings from the client
 * @param path ordered substrings from content, e.g. `["With what?", "Okay, I'll help!"]`
 * @returns index into `opts`
 */
const DECLINE_RE =
    /sorry|passing through|no thanks|no,?\s*thank|not interested|i'?m fine|just looking|no way/i;

const PROGRESS_FALLBACK = [
    "i'll help",
    'i will help',
    'okay',
    'yes',
    'with what',
    'how can i help',
    'tell me',
    'continue',
    'ok'
];

export function isDeclineOption(text: string): boolean {
    return DECLINE_RE.test(text);
}

export function pickDialogOption(opts: string[], path?: string[] | null): number {
    if (!opts.length) return 0;
    const low = opts.map(o => o.toLowerCase());

    // 1) Script path — first path entry that matches a **currently visible** option
    if (path?.length) {
        for (const p of path) {
            const w = p.toLowerCase().trim();
            if (!w) continue;
            const i = low.findIndex(o => o.includes(w) || w.includes(o));
            if (i >= 0) return i;
        }
    }

    // 2) Generic progress phrases (not decline)
    for (const m of PROGRESS_FALLBACK) {
        const i = low.findIndex(o => o.includes(m) && !isDeclineOption(o));
        if (i >= 0) return i;
    }

    // 3) First non-decline option (quest multis put progress first, decline last)
    const firstOk = low.findIndex(o => !isDeclineOption(o));
    if (firstOk >= 0) return firstOk;

    return 0;
}
