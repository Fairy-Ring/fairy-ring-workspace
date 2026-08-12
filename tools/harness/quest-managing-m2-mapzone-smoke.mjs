#!/usr/bin/env node
/**
 * Managing Miscellania M2 — product mapzone first-visit seed.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-managing-m2-mapzone-smoke.mjs
 *
 * Soft entry: none (fresh account preferred). Do **not** setvar misc_approval.
 * Product under test:
 *   Enter mapsquare 0_39_60 → if %misc_last_update = 0: set clock + misc_approval = 32 (25%)
 *
 * Soft ≠ full daily coffer math (M3). TEMP mes must stay stripped.
 *
 * @see docs/research/port-mg-managing-misc-289-to-377.md § M2
 * @see docs/plans/2026-08-10-next-soft-managing-m1.md
 */
import {
  assertEnginePackHealth,
  boot,
  cheatQuiet,
  createShotRunDir,
  fail,
  getServerVarQuiet,
  installScreenshotBridge,
  launchBrowser,
  mainlandAccount,
  parseArgs,
  resolveAccount,
  setWorldSpeed,
  teleTo,
  waitSceneReady,
  waitServerVar,
  waitTicks
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'managem2');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

/** Free floor near Gunnhild / heather (not wall) — local 28,11 m39_60 */
const MISC_STAND = { x: 2524, z: 3851, level: 0 };

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[manage-m2] ${base} user=${username} (mapzone seed; headed default)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`manage-m2_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    // Baseline off-island: misc_last_update should be 0, approval not yet 32 from mapzone
    const v0 = await getServerVarQuiet(page, 'misc_last_update');
    const a0 = await getServerVarQuiet(page, 'misc_approval');
    console.log(`[manage-m2] pre-tele misc_last_update=${v0} misc_approval=${a0}`);

    if (Number(v0) !== 0) {
      // Soft clear only so product seed can run (labeled — not product under test)
      console.log('[manage-m2] soft clear misc_last_update=0 so first-visit path can fire');
      await cheatQuiet(page, 'setvar misc_last_update 0', 600);
      await waitTicks(page, 2);
    }

    console.log('[manage-m2] tele Miscellania stand', MISC_STAND);
    if (!(await teleTo(page, MISC_STAND, 2, 25_000))) fail('tele Miscellania stand failed');
    await waitSceneReady(page, 20_000);
    // mapzone + daily stub: a few ticks for scripts
    await waitTicks(page, 5);

    const v1 = await waitServerVar(page, 'misc_last_update', {
      from: 0,
      attempts: 10,
      ticksBetween: 2
    });
    const a1 = await getServerVarQuiet(page, 'misc_approval');
    console.log(`[manage-m2] post-tele misc_last_update=${v1} misc_approval=${a1}`);
    if (shot) await shot('post-tele-island');

    if (v1 == null || Number(v1) === 0) {
      if (shot) await shot('fail-varp360');
      fail(`M2 FAIL: product did not set misc_last_update (still ${v1}). Mapzone residual.`);
    }
    if (Number(a1) !== 32) {
      if (shot) await shot('fail-approval');
      fail(
        `M2 FAIL: product misc_approval expected 32 (25%) after first visit, got ${a1}. Mapzone seed residual.`
      );
    }

    if (shot) await shot('pass-mapzone-seed');
    console.log(
      `RESULT PASS manage-m2 product mapzone seed misc_last_update=${v1} misc_approval=${a1} (first visit 25%)`
    );
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
