#!/usr/bin/env node
/**
 * Viking Play decrement: Enchanted lyre(2) → (1) + Rellekka dest.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-vik-play \
 *     node tools/harness/quest-viking-lyre-play-smoke.mjs
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
const { username, password } = resolveAccount(rest, 'vkply');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3220, z: 3220, level: 0 };

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[vkply] ${base} user=${username} (Play lyre 2→1)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`vkply_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await giveItems(page, [['magic_strung_lyre_2', 1]]);
    if (shot) await shot('01-inv');

    const play = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      return {
        ok: !!(
          a?.heldOp?.('Enchanted lyre(2)', 1) ||
          a?.heldOp?.('lyre(2)', 1) ||
          a?.heldOp?.('Enchanted lyre', 1)
        )
      };
    });
    console.log('[vkply] play', JSON.stringify(play));
    if (!play?.ok) fail(`Play failed ${JSON.stringify(play)}`);
    await waitTicks(page, 16);
    if (shot) await shot('02-play');

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    console.log('[vkply] tile', tile);
    if (!tile || Math.abs((tile.x | 0) - 2662) > 24 || Math.abs((tile.z | 0) - 3644) > 24) {
      fail(`not Rellekka ${JSON.stringify(tile)}`);
    }
    const inv = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.inventory?.() ?? []).map(x => x?.name || x?.debugname)
    );
    console.log('[vkply] inv', inv);
    if (!inv.some(n => /lyre\(1\)/i.test(String(n || '')))) fail(`lyre(1) missing ${JSON.stringify(inv)}`);

    console.log(`RESULT PASS vkply play 2→1 rellekka=${tile.x},${tile.z} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
