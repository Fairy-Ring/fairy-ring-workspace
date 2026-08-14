#!/usr/bin/env node
/**
 * Lumbridge farm dairy_churn **10093** @ 3190,3275 → leftover churn **15336**.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-churn-if-smoke.mjs
 *
 * Soft: bucket_milk + cooking 50. Product oploc1 Churn → if_openchat.
 * Stand south of the loc (forceapproach=south).
 */
import {
  assertEnginePackHealth,
  boot,
  cheatQuiet,
  createShotRunDir,
  fail,
  giveItems,
  installScreenshotBridge,
  launchBrowser,
  mainlandAccount,
  parseArgs,
  resolveAccount,
  setStats,
  setWorldSpeed,
  teleTo,
  waitSceneReady,
  waitTicks
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'chrn');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const LOC = { x: 3190, z: 3275, level: 0 };
const STAND = { x: 3190, z: 3274, level: 0 };
const IF_ROOT = 15336;

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
  console.log(`[chrn] ${base} user=${username} (churn ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`chrn_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await setStats(page, { cooking: 50 }).catch(() => cheatQuiet(page, 'setstat cooking 50', 300));
    await giveItems(page, [['bucket_milk', 1]]);
    if (!(await teleTo(page, STAND, 1, 25_000))) fail('tele Lumbridge churn stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 4);
    await waitIdleNear(page, STAND, 1, 40);

    const open = await page.evaluate(async ([lx, lz]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const hits = [];
      for (let i = 0; i < 36; i++) {
        if (i === 0 || i === 8) {
          a?.opLocAt?.(lx, lz, 'Churn') || a?.opLocAt?.(lx, lz, '') || a?.opLoc?.('churn', 'Churn', 4);
        }
        const m = r?.modals?.() ?? {};
        hits.push({ chat: m.chat ?? -1, main: m.main ?? -1 });
        if ((m.chat ?? -1) === 15336) return { ...m, hits: hits.slice(-8) };
        await new Promise(res => setTimeout(res, 300));
      }
      return { ...(r?.modals?.() ?? {}), hits };
    }, [LOC.x, LOC.z]);
    console.log('[chrn] open', JSON.stringify(open));
    if (Number(open?.chat) !== IF_ROOT) {
      if (shot) await shot('fail-no-churn');
      fail(`expected churn chat ${IF_ROOT}, got ${JSON.stringify(open)}`);
    }
    await waitTicks(page, 4);
    if (shot) await shot('pass-churn');
    console.log(`RESULT PASS chrn churn chat=${open.chat} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
