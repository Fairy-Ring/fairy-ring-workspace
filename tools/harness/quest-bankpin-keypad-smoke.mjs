#!/usr/bin/env node
/**
 * Banker PIN settings → Set a PIN → bankpin keypad **7424** (was leftover inter_169).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-bankpin-keypad-smoke.mjs
 *
 * PIN is 19 Sep 2005 — not a 289 name hunt.
 *
 * Do not tele onto the booth. Al-Kharid bankers sit behind the counter
 * (3267,3166); booths are 3268,3164–3169. Lobby stand is one tile east.
 */
import {
  assertEnginePackHealth,
  boot,
  createShotRunDir,
  fail,
  installScreenshotBridge,
  launchBrowser,
  mainlandAccount,
  parseArgs,
  resolveAccount,
  setWorldSpeed,
  teleTo,
  waitSceneReady,
  waitTicks
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'pin');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const BOOTH = { x: 3268, z: 3166, level: 0 }; // open 2213; 3268,3164 is also a booth — do not stand on it
const STAND = { x: 3269, z: 3166, level: 0 }; // lobby east of booth; bankers at 3267,*
const SETTINGS = 14924;
const KEYPAD = 7424;
const SET_PIN = 15075; // bankpin_settings:com_147

async function waitIdleNear(page, tile, dist = 1, iters = 50) {
  await page.evaluate(
    async ([wx, wz, d, n]) => {
      const h = globalThis.__lc377;
      for (let i = 0; i < n; i++) {
        const t = h?.worldTile?.();
        const busy = h?.reader?.busy?.() || h?.reader?.moving?.();
        if (t && Math.max(Math.abs(t.x - wx), Math.abs(t.z - wz)) <= d && !busy) break;
        await new Promise(r => setTimeout(r, 200));
      }
    },
    [tile.x, tile.z, dist, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[pin] ${base} user=${username} (bankpin ${KEYPAD})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`pin_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    if (!(await teleTo(page, STAND, 1, 25_000))) fail('tele Al-Kharid bank lobby failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 4);
    await waitIdleNear(page, STAND, 1, 40);

    const settings = await page.evaluate(async ([bx, bz]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const n = (r?.npcs?.() ?? []).find(x => /banker/i.test(x?.name || ''));
      const hits = [];
      for (let i = 0; i < 48; i++) {
        if (i === 0 || i === 12 || i === 24) {
          // Booth Use → talk_to_banker. Cannot stand next to the teller (counter).
          a?.opLocAt?.(bx, bz, 'Use') ||
            a?.opLocAt?.(bx, bz, '') ||
            a?.npcOp?.(n?.index, 1) ||
            a?.talkNpc?.('Banker');
        }
        const busy = !!(r?.busy?.() || r?.moving?.());
        const tile = r?.worldTile?.() ?? globalThis.__lc377?.worldTile?.() ?? null;
        const opts = (() => {
          try {
            return (r.chatOptions?.() ?? []).map(o => (typeof o === 'string' ? o : o?.text)).filter(Boolean);
          } catch {
            return [];
          }
        })();
        if (opts.length) a.chooseOption?.(['pin', 'PIN', 'check my PIN']);
        else if (!busy) {
          a.continueDialog?.();
          a.dismissModalMessage?.();
        }
        const m = r?.modals?.() ?? {};
        hits.push({ main: m.main ?? -1, opts: opts.slice(0, 3), busy, tile });
        if ((m.main ?? -1) === 14924) return { npc: n?.name, ...m, hits: hits.slice(-6) };
        await new Promise(res => setTimeout(res, 300));
      }
      return { npc: n?.name, ...(r?.modals?.() ?? {}), hits };
    }, [BOOTH.x, BOOTH.z]);
    console.log('[pin] settings', JSON.stringify(settings));
    if (Number(settings?.main) !== SETTINGS) {
      if (shot) await shot('fail-no-settings');
      fail(`expected bankpin_settings ${SETTINGS}, got ${JSON.stringify(settings)}`);
    }
    await waitTicks(page, 3);
    if (shot) await shot('settings');

    const keypad = await page.evaluate(async btn => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      a?.ifButton?.(btn);
      const hits = [];
      for (let i = 0; i < 24; i++) {
        if (i === 8) a?.ifButton?.(btn);
        const m = r?.modals?.() ?? {};
        hits.push(m.main ?? -1);
        if ((m.main ?? -1) === 7424) return { ...m, hits };
        await new Promise(res => setTimeout(res, 250));
      }
      return { ...(r?.modals?.() ?? {}), hits };
    }, SET_PIN);
    console.log('[pin] keypad', JSON.stringify(keypad));
    if (Number(keypad?.main) !== KEYPAD) {
      if (shot) await shot('fail-no-keypad');
      fail(`expected bankpin ${KEYPAD}, got ${JSON.stringify(keypad)}`);
    }
    await waitTicks(page, 4);
    if (shot) await shot('pass-keypad');
    console.log(`RESULT PASS bankpin keypad main=${keypad.main}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
