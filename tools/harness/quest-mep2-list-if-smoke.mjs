#!/usr/bin/env node
/**
 * Leftover mourning_deathalter **6028** from mourning_deathalter_list Read.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-mep2-list-if-smoke.mjs
 *
 * Soft: give list. Product opheld1 → if_openmain leftover chrome.
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
const { username, password } = resolveAccount(rest, 'mep2l');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3222, z: 3218, level: 0 };
const IF_ROOT = 6028;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[mep2l] ${base} user=${username} (mourning_deathalter ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`mep2l_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await giveItems(page, [['mourning_deathalter_list', 1]]);
    if (!(await teleTo(page, STAND, 1, 25_000))) fail('tele Lumbridge stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);

    const open = await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a?.heldOp) return { error: 'no heldOp' };
      const ok =
        a.heldOp('Item list', 1) ||
        a.heldOp('list', 1) ||
        a.useHeld?.('Item list');
      const hits = [];
      for (let i = 0; i < 28; i++) {
        const m = r?.modals?.() ?? {};
        hits.push({ main: m.main ?? -1, ok });
        if ((m.main ?? -1) === 6028) return { ...m, ok, hits: hits.slice(-6) };
        await new Promise(res => setTimeout(res, 250));
      }
      return { ...(r?.modals?.() ?? {}), ok, hits };
    });
    console.log('[mep2l] open', JSON.stringify(open));
    if (shot) await shot(Number(open.main) === IF_ROOT ? 'pass-list' : 'fail-no-list');
    if (Number(open.main) !== IF_ROOT) {
      fail(`expected mourning_deathalter main ${IF_ROOT}, got ${JSON.stringify(open)}`);
    }
    console.log(`RESULT PASS mep2l main=${open.main} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
