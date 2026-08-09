/**
 * Register in-browser script runner on harness ABI.
 * Called from harness client-entry after adapter install.
 *
 * API shape is a thin stand-in for rs2b0t ScriptRunner (start/stop/list/running)
 * so HarnessPanel and a future full BotPanel share the same host surface.
 */
import TutorialBot from './tutorial/TutorialBot.ts';
import PathABCBot from './path-abc/PathABCBot.ts';
import QuestBot from './quest/QuestBot.ts';
import { tbwtQuest } from './quest/defs/tbwt.ts';
import { horrorQuest } from './quest/defs/horror.ts';
import { morttonQuest } from './quest/defs/mortton.ts';
import { LogBus } from '../logBus.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export function registerScriptHost(): void {
    const g = globalThis as Any;
    if (!g.__lc377) {
        console.warn('[script-host] adapter missing — register after install()');
        return;
    }

    const scripts: Record<string, () => { run: (ms?: number) => Promise<string>; done?: () => boolean; stop: () => void }> = {
        /** Path A only — full tutorial island. */
        tutorial: () => {
            const bot = new TutorialBot();
            return {
                run: (ms?: number) => bot.run(ms),
                done: () => bot.done(),
                stop: () => bot.stop()
            };
        },
        /**
         * Content roadmap step 1: A tutorial → B Lumbridge → C goblin kill.
         * Prefer this over cheat-based path-abc probes.
         */
        'path-abc': () => {
            const bot = new PathABCBot();
            return {
                run: (ms?: number) => bot.run(ms),
                done: () => bot.done(),
                stop: () => bot.stop()
            };
        },
        /**
         * Quest e2e — Tai Bwo Wannai Trio (template: quest/* + defs/tbwt).
         * @see docs/plans/2026-08-04-harness-quest-template.md
         */
        'quest-tbwt': () => {
            const bot = new QuestBot(tbwtQuest);
            return {
                run: (ms?: number) => bot.run(ms),
                done: () => bot.done(),
                stop: () => bot.stop()
            };
        },
        /**
         * Quest e2e — Horror from the Deep (start-gate: Talk Larrissa).
         * @see docs/research/port-quest-horror-274-to-377.md
         */
        'quest-horror': () => {
            const bot = new QuestBot(horrorQuest);
            return {
                run: (ms?: number) => bot.run(ms),
                done: () => bot.done(),
                stop: () => bot.stop()
            };
        },
        /**
         * Quest e2e — Shades of Mort'ton (start diary host-prep → mid temple).
         * @see docs/research/port-quest-mortton-274-to-377.md
         */
        'quest-mortton': () => {
            const bot = new QuestBot(morttonQuest);
            return {
                run: (ms?: number) => bot.run(ms),
                done: () => bot.done(),
                stop: () => bot.stop()
            };
        }
    };

    let running: { stop: () => void } | null = null;
    let currentName: string | null = null;

    g.__lc377.scripts = {
        list: () => Object.keys(scripts),
        /** Currently running script name, or null. */
        current: () => currentName,
        /** Whether a script is mid-run (rs2b0t-ish active gate). */
        running: () => running !== null,
        /**
         * Start a named script. Returns when finished or timeout.
         * @param name e.g. 'tutorial'
         * @param maxMs default 25 minutes
         */
        async start(name: string, maxMs = 25 * 60_000): Promise<string> {
            const factory = scripts[name];
            if (!factory) throw new Error(`unknown script: ${name} (have: ${Object.keys(scripts).join(',')})`);
            if (running) running.stop();
            const handle = factory();
            running = handle;
            currentName = name;
            console.info(`[script-host] start ${name}`);
            LogBus.add('info', `[script-host] start ${name}`);
            try {
                const result = await handle.run(maxMs);
                console.info(`[script-host] ${name} → ${result}`);
                LogBus.add('info', `[script-host] ${name} → ${result}`);
                return result;
            } finally {
                if (running === handle) {
                    running = null;
                    currentName = null;
                }
            }
        },
        stop() {
            if (running) {
                LogBus.add('info', '[script-host] stop');
                // Do not null `running` here — walkTo / execute may still be in flight.
                // run()'s finally clears the handle when the bot loop exits.
                running.stop();
            } else {
                LogBus.add('info', '[script-host] stop (idle)');
            }
        }
    };

    console.info('[script-host] registered scripts:', Object.keys(scripts).join(', '));
    LogBus.add('info', `scripts: ${Object.keys(scripts).join(', ')}`);
}
