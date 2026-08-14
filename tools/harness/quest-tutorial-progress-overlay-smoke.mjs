#!/usr/bin/env node
/**
 * Login on Tutorial Island with mid-stage %tutorial → leftover overlay
 * tutorial_island_progress **8680** (was inter_182).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-tutorial-progress-overlay-smoke.mjs
 *
 * Soft: setvar tutorial 260 (mining start) + tele island + relog.
 * Product: login.rs2 @start_tutorial → ~set_tutorial_progress → if_openoverlay.
 */
import {
  assertEnginePackHealth,
  boot,
  cheatQuiet,
  createShotRunDir,
  fail,
  installScreenshotBridge,
  launchBrowser,
  mainlandAccount,
  parseArgs,
  relog,
  resolveAccount,
  setWorldSpeed,
  teleTo,
  waitSceneReady,
  waitTicks
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'tutov');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

// Guide-house floor (start_tutorial jump 0_48_48_22_34). On-island for login hook.
const STAND = { x: 3094, z: 3106, level: 0 };
const IF_ROOT = 8680;
const OVERLAY_VARP = 406; // tutorial_progress_overlay

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[tutov] ${base} user=${username} (tutorial_island_progress ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`tutov_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    if (!(await cheatQuiet(page, 'setvar tutorial 260', 400))) fail('setvar tutorial 260 not sent');
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele tutorial island stand failed');
    await waitSceneReady(page, 15_000);
    await relog(page, username, password);
    await waitSceneReady(page, 90_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(async ([want, varp]) => {
      const r = globalThis.__lc377?.reader;
      const hits = [];
      for (let i = 0; i < 40; i++) {
        const m = r?.modals?.() ?? {};
        const ov = m.overlay ?? -1;
        const v = typeof r?.varp === 'function' ? r.varp(varp) : null;
        hits.push({ ov, v, main: m.main ?? -1 });
        if (ov === want) return { overlay: ov, varp: v, hits: hits.slice(-6) };
        await new Promise(res => setTimeout(res, 250));
      }
      return { overlay: hits.at(-1)?.ov ?? -1, varp: hits.at(-1)?.v ?? null, hits };
    }, [IF_ROOT, OVERLAY_VARP]);
    console.log('[tutov] overlay', JSON.stringify(seen));
    if (shot) await shot(seen.overlay === IF_ROOT ? 'pass-overlay' : 'fail-no-overlay');
    if (seen.overlay !== IF_ROOT) {
      fail(`expected overlay ${IF_ROOT}, got ${JSON.stringify(seen)}`);
    }
    console.log(`RESULT PASS tutov overlay=${seen.overlay} varp406=${seen.varp} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
