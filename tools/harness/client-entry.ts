/**
 * Harness client entry — separate from pure Client-TS.
 *
 * Bundled to `harness-client.js` (not `client.js`). Game class is **pure Client-TS
 * with inject hooks** (`tools/harness/.generated/Client.ts` via `inject-client.mjs`)
 * plus reader/actions adapter. Pure `vendor/client-ts` stays Java 1:1 on disk.
 *
 * Build: `bun tools/harness/build-client.mjs` (runs inject first)
 */
import { Client } from './.generated/Client.ts';
import IfType from '../../vendor/client-ts/src/config/IfType.ts';
import LocType from '../../vendor/client-ts/src/config/LocType.ts';
import NpcType from '../../vendor/client-ts/src/config/NpcType.ts';
import ObjType from '../../vendor/client-ts/src/config/ObjType.ts';
import VarBitType from '../../vendor/client-ts/src/config/VarBitType.ts';

import { install } from './attach-in-page.js';
import { registerScriptHost } from './script/browser/register.ts';
import { LogBus } from './script/logBus.ts';
import { mountHarnessPanel } from './ui/panel.ts';

export type HarnessHooks = {
    ifGet: (id: number) => unknown;
    locList: (id: number) => { name?: string | null; op?: (string | null)[] | null };
    objList: (id: number) => { name?: string | null };
    /** NpcType.list — multi-npc resolve needs concrete forms (Tiadeche shore, …). */
    npcList: (id: number) => {
        name?: string | null;
        op?: (string | null)[] | null;
        multinpc?: Int32Array | null;
        multivar?: number;
        multivarbit?: number;
        id?: number;
    } | null;
    /** VarBitType.list[id] for multivarbit multi-npc. */
    varbitList: (id: number) => { basevar: number; startbit: number; endbit: number } | null;
};

/** Type registries for the external adapter (same role as in-bundle imports in rs2b0t). */
export function createHooks(): HarnessHooks {
    return {
        ifGet: (id: number) => IfType.get(id),
        locList: (id: number) => LocType.list(id),
        objList: (id: number) => ObjType.list(id),
        npcList: (id: number) => NpcType.list(id),
        varbitList: (id: number) => {
            const v = VarBitType.list[id];
            return v
                ? { basevar: v.basevar | 0, startbit: v.startbit | 0, endbit: v.endbit | 0 }
                : null;
        }
    };
}

/**
 * Construct harness Client (injected pure) + adapter + script host + side panel.
 * Pure on-disk Client-TS is never edited; hooks are build-time only.
 */
export function startHarnessClient(nodeid = 37, lowmem = false, members = true): Client {
    // Expose log bus before scripts so TaskBot.log can prefer sync path
    (globalThis as unknown as { __harnessLogBus: typeof LogBus }).__harnessLogBus = LogBus;

    const client = new Client(nodeid, lowmem, members);
    // Exposed for harness tools that temporarily rebind Pix2D (e.g. map basemap bake).
    (globalThis as unknown as { __lc377Client: Client }).__lc377Client = client;
    const hooks = createHooks();
    install(client, hooks);
    registerScriptHost();

    // DOM panel (rs2b0t #bot-panel) — after adapter so status can read __lc377
    if (typeof document !== 'undefined') {
        try {
            mountHarnessPanel('#bot-panel');
        } catch (e) {
            console.warn('[harness] panel mount failed', e);
        }
    }

    // Nav pack + path paint. Global for walkToward; fork onAfterWorldRender → tile quads.
    void import('./nav/browser/index.ts')
        .then(async nav => {
            (globalThis as unknown as { __lc377Nav: typeof nav }).__lc377Nav = nav;
            // Preferred operator defaults (rs2b0t UI defaults are OFF):
            // pack path + client trail ON; path camera follow ON; scene-expand OFF.
            const paintOff =
                typeof location !== 'undefined' &&
                (location.search.includes('NAV_PAINT=0') || location.search.includes('navPaint=0'));
            if (!paintOff) {
                nav.setNavPaintEnabled(true);
                nav.setNavPaintDefaults({
                    showPath: true,
                    hopLabels: true,
                    clientTrail: true,
                    sceneExpand: false
                });
                // Optional hop-label DOM only if ?PATH_PAINT_DOM=1 (tiles = scene quads)
                nav.startPathPaintLoop();
            }
            const camOff =
                typeof location !== 'undefined' &&
                (location.search.includes('NAV_CAMERA=0') || location.search.includes('navCamera=0'));
            nav.setNavCameraFollow(!camOff);
            await nav.ensureNav();
            console.info(
                `[harness] __lc377Nav ready (fork + pack; tile paint; cameraFollow=${!camOff})`
            );
        })
        .catch(e => console.warn('[harness] nav init:', e));

    // HARNESS ADDON: scene tile-quad paint + camera ease tick while Pix2D = areaGame
    void import('./nav/browser/pathScenePaint.ts')
        .then(async ({ paintNavPathInGame }) => {
            const { PathCameraFollow } = await import('./nav/browser/cameraFollow.ts');
            const prev = client.onAfterWorldRender.bind(client);
            client.onAfterWorldRender = () => {
                prev();
                try {
                    const patch = (globalThis as unknown as {
                        __lc377?: { applyOutpostCollisionLivePatch?: () => void };
                    }).__lc377?.applyOutpostCollisionLivePatch;
                    patch?.();
                } catch {
                    /* ignore */
                }
                try {
                    paintNavPathInGame(client);
                } catch (e) {
                    console.error('[harness] path scene paint', e);
                }
                try {
                    // Backup frame tick if rAF is throttled (visible during world draw).
                    PathCameraFollow.onFrame();
                } catch {
                    /* ignore */
                }
            };
        })
        .catch(e => console.warn('[harness] pathScenePaint load', e));

    return client;
}

// Browser module entry: auto-boot when loaded from harness.html
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
        startHarnessClient(37, false, true);
    } catch (e) {
        console.error('[harness-client] failed to start', e);
        const pre = document.createElement('pre');
        pre.style.color = 'yellow';
        pre.style.whiteSpace = 'pre-wrap';
        pre.textContent = String(e && (e as Error).stack ? (e as Error).stack : e);
        document.body.appendChild(pre);
    }
}

export { Client };
