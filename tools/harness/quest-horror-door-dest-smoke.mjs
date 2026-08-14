#!/usr/bin/env node
/**
 * Horror lighthouse doorway Walk-through dest (existing product, unsmoked).
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-hftd-door \
 *     node tools/harness/quest-horror-door-dest-smoke.mjs
 *
 * Soft horrorquest 2 (entered). Stand 2509,3635 S of door. Expect 2445,4596.
 * Cite horror-lighthouse-door-next-377.md. Do not invent dest.
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
  waitTicks
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'hfdoor');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2509, z: 3635, level: 0 };

async function worldTile(page) {
  return page.evaluate(() => {
    const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
    return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[hfdoor] ${base} user=${username} (Walk-through dest)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`hfdoor_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar horrorquest 2', 400);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele door stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-door');

    const walk = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const locs = r?.locs?.() ?? [];
      const loc = locs.find(l => (l.id | 0) === 4577 || /doorway/i.test(String(l?.name || '')));
      const ok = !!(
        a?.opLocAt?.(2509, 3636, 'Walk-through') ||
        a?.opLocAt?.(2509, 3636, '') ||
        (loc && a?.opLoc?.(loc.name || 'Doorway', 'Walk-through', 10))
      );
      return { ok, loc: loc ? { id: loc.id, name: loc.name, x: loc.x, z: loc.z } : null };
    });
    console.log('[hfdoor] walk', JSON.stringify(walk));
    if (!walk?.ok) fail(`Walk-through failed ${JSON.stringify(walk)}`);
    await waitTicks(page, 12);
    if (shot) await shot('02-inside');

    let tile = await worldTile(page);
    for (let i = 0; i < 8 && (tile.x | 0) === 0; i++) {
      await waitTicks(page, 2);
      tile = await worldTile(page);
    }
    console.log('[hfdoor] tile', tile);
    if (Math.abs((tile.x | 0) - 2445) > 2 || Math.abs((tile.z | 0) - 4596) > 2) {
      fail(`dest not interior 2445,4596 ${JSON.stringify(tile)}`);
    }
    const stage = await getServerVarQuiet(page, 'horrorquest');
    console.log('[hfdoor] horrorquest', stage);

    console.log(`RESULT PASS hfdoor Walk-through dest 2445,4596 user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
