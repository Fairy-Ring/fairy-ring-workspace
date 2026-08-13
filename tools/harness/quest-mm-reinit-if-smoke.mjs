#!/usr/bin/env node
/**
 * MM reinit puzzle IF — cache-native reinitialisation_puzzle (11126), not free-ID 19153.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-mm-reinit-if-smoke.mjs
 *
 * Soft: give Spare controls. Product View → main 11126.
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
  waitSceneReady,
  waitTicks
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'mmrif');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const IF_ROOT = 11126;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[mm-reinit-if] ${base} user=${username} (reinitialisation_puzzle ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`mm-reinit-if_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await giveItems(page, [['mm_reinitialisation_hint', 1]]);
    await waitTicks(page, 3);

    const open = await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a?.heldOp) return { error: 'no heldOp' };
      const before = r?.modals?.()?.main ?? -1;
      const byName =
        !!a.heldOp('Spare controls', 1) ||
        !!a.heldOp('spare controls', 1);
      await new Promise(res => setTimeout(res, 800));
      const main = r?.modals?.()?.main ?? -1;
      return { byName, before, main };
    });
    console.log('[mm-reinit-if] view', JSON.stringify(open));
    if (Number(open?.main) !== IF_ROOT) {
      if (shot) await shot('fail-no-if');
      fail(`expected main ${IF_ROOT}, got ${JSON.stringify(open)}`);
    }
    if (shot) await shot('pass-if-open');
    console.log(`RESULT PASS mm-reinit-if main=${open.main}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
