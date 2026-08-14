#!/usr/bin/env node
/**
 * Leftover runesquares_rank **16570** on experienced-room zone enter.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-games-room-rank-if-smoke.mjs
 *
 * Soft tele inside CANDIDATE RS 8×8 (local 8,18). Product [zone] → if_openoverlay.
 * Leave to a non-room zone → overlay closes. No board / Challenge.
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
const { username, password } = resolveAccount(rest, 'grrnk');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const IN = { x: 2184, z: 4946, level: 0 };
const OUT = { x: 2180, z: 4940, level: 0 };
const IF_ROOT = 16570;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[grrnk] ${base} user=${username} (runesquares_rank ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`grrnk_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    if (!(await teleTo(page, IN, 1, 25_000))) fail('tele RS experienced room failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const open = await page.evaluate(async want => {
      const r = globalThis.__lc377?.reader;
      const hits = [];
      for (let i = 0; i < 32; i++) {
        const m = r?.modals?.() ?? {};
        hits.push({ ov: m.overlay ?? -1 });
        if ((m.overlay ?? -1) === want) return { ...m, hits: hits.slice(-6) };
        await new Promise(res => setTimeout(res, 250));
      }
      return { ...(r?.modals?.() ?? {}), hits };
    }, IF_ROOT);
    console.log('[grrnk] in', JSON.stringify(open));
    if (shot) await shot(Number(open.overlay) === IF_ROOT ? 'pass-rank' : 'fail-no-rank');
    if (Number(open.overlay) !== IF_ROOT) {
      fail(`expected runesquares_rank overlay ${IF_ROOT}, got ${JSON.stringify(open)}`);
    }

    if (!(await teleTo(page, OUT, 1, 25_000))) fail('tele out of RS zone failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    const closed = await page.evaluate(async () => {
      const r = globalThis.__lc377?.reader;
      for (let i = 0; i < 24; i++) {
        const ov = r?.modals?.()?.overlay ?? -1;
        if (ov !== 16570) return { overlay: ov };
        await new Promise(res => setTimeout(res, 250));
      }
      return r?.modals?.() ?? {};
    });
    console.log('[grrnk] out', JSON.stringify(closed));
    if (shot) await shot(Number(closed.overlay) !== IF_ROOT ? 'pass-closed' : 'fail-still-open');
    if (Number(closed.overlay) === IF_ROOT) {
      fail(`overlay still ${IF_ROOT} after zone exit ${JSON.stringify(closed)}`);
    }
    console.log(`RESULT PASS grrnk overlay=${open.overlay} closed=${closed.overlay} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
