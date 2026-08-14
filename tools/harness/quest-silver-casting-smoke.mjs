#!/usr/bin/env node
/**
 * Silver bar on Al-Kharid furnace → silver_casting **13782** (was leftover inter_282).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-silver-casting-smoke.mjs
 *
 * Soft: give silver_bar + holy_symbol_mould. Product oplocu furnace.
 */
import {
  assertEnginePackHealth,
  boot,
  createShotRunDir,
  fail,
  giveItems,
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
const { username, password } = resolveAccount(rest, 'slv');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const LOC = { x: 3272, z: 3185, level: 0 };
const STAND = { x: 3275, z: 3186, level: 0 };
const IF_ROOT = 13782;

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
  console.log(`[slv] ${base} user=${username} (silver_casting ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`slv_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await giveItems(page, [
      ['silver_bar', 1],
      ['holy_symbol_mould', 1]
    ]);
    await waitTicks(page, 2);
    if (!(await teleTo(page, STAND, 1, 25_000))) fail('tele Al-Kharid furnace stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 4);
    await waitIdleNear(page, STAND, 1, 40);

    const open = await page.evaluate(async ([lx, lz]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const snap = typeof r?.locAt === 'function' ? r.locAt(lx, lz) : null;
      const tryUse = () =>
        !!(
          (snap && a?.useHeldOnLoc?.('Silver bar', snap, 16)) ||
          a?.useHeldOnLoc?.('Silver bar', 'Furnace', 8)
        );
      tryUse();
      const hits = [];
      for (let i = 0; i < 36; i++) {
        if (i === 10 || i === 20) tryUse();
        a.continueDialog?.();
        a.dismissModalMessage?.();
        const m = r?.modals?.() ?? {};
        hits.push({ main: m.main ?? -1, tile: r?.worldTile?.() ?? null });
        if ((m.main ?? -1) === 13782) {
          return { snap, ...m, hits: hits.slice(-6) };
        }
        await new Promise(res => setTimeout(res, 300));
      }
      const m = r?.modals?.() ?? {};
      return { snap, ...m, hits: hits.slice(-8) };
    }, [LOC.x, LOC.z]);
    console.log('[slv] open', JSON.stringify(open));
    if (Number(open?.main) !== IF_ROOT) {
      if (shot) await shot('fail-no-silver');
      fail(`expected silver_casting ${IF_ROOT}, got ${JSON.stringify(open)}`);
    }
    if (shot) await shot('pass-silver');
    console.log(`RESULT PASS silver_casting main=${open.main}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
