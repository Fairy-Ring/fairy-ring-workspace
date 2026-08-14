#!/usr/bin/env node
/**
 * Barrows mound Dig no-op: stay surface. No crypt dest. leftover 4535 closed.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-barrows-dig \
 *     node tools/harness/quest-barrows-dig-noop-smoke.mjs
 *
 * Stand ON peak 3565,3289 (terrain, not next-to). Cite barrows-mound-dig-first-slice-377.md.
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
const { username, password } = resolveAccount(rest, 'brdig');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3565, z: 3289, level: 0 };

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[brdig] ${base} user=${username} (Dig stay surface)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`brdig_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele mound failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    await giveItems(page, [['spade', 1]]);
    if (shot) await shot('01-mound');

    const tile0 = await page.evaluate(() => {
      const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
      return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
    });
    console.log('[brdig] before', tile0);

    const dig = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      return {
        ok: !!(
          a?.heldOp?.('Spade', 1) ||
          a?.heldOp?.('spade', 1)
        )
      };
    });
    console.log('[brdig] dig', JSON.stringify(dig));
    if (!dig?.ok) fail(`Dig failed ${JSON.stringify(dig)}`);
    await waitTicks(page, 12);
    if (shot) await shot('02-dig');

    let tile1 = { x: 0, z: 0, level: 0 };
    for (let i = 0; i < 8; i++) {
      tile1 = await page.evaluate(() => {
        const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
        return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
      });
      if ((tile1.x | 0) !== 0 || (tile1.z | 0) !== 0) break;
      await waitTicks(page, 2);
    }
    console.log('[brdig] after', tile1);
    if ((tile1.z | 0) > 9000) fail(`crypt dest invented/fell ${JSON.stringify(tile1)}`);
    if ((tile1.level | 0) !== 0) fail(`fell off surface ${JSON.stringify(tile1)}`);
    if ((tile1.x | 0) === 0 && (tile1.z | 0) === 0) {
      fail(`worldTile stayed 0 after Dig (before was ${JSON.stringify(tile0)})`);
    }
    if (Math.abs((tile1.x | 0) - 3565) > 2 || Math.abs((tile1.z | 0) - 3289) > 2) {
      fail(`left mound ${JSON.stringify(tile1)}`);
    }

    console.log(`RESULT PASS brdig Dig stay surface user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
