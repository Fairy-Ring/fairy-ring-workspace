#!/usr/bin/env node
/**
 * Questlist hundred_main → leftover recipe_for_disaster **18436**.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-rfd-if-smoke.mjs
 *
 * Product: quest tab + ifButton questlist:hundred_main (18306) → if_openmain.
 * Leftover 8 guest names only — do not invent journal fills.
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
const { username, password } = resolveAccount(rest, 'rfdi');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3222, z: 3218, level: 0 };
const IF_ROOT = 18436;
const QUEST_TAB = 2;
const HUNDRED_MAIN = 18306;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[rfdi] ${base} user=${username} (recipe_for_disaster ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`rfdi_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    if (!(await teleTo(page, STAND, 1, 25_000))) fail('tele Lumbridge stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);

    const open = await page.evaluate(async ([tab, com, want]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a?.ifButton) return { error: 'no ifButton' };
      a.setSideTab?.(tab);
      await new Promise(res => setTimeout(res, 400));
      const ok = !!a.ifButton(com);
      const hits = [];
      for (let i = 0; i < 28; i++) {
        const m = r?.modals?.() ?? {};
        hits.push({ main: m.main ?? -1, chat: m.chat ?? -1, ok });
        if ((m.main ?? -1) === want) return { ...m, ok, hits: hits.slice(-6) };
        await new Promise(res => setTimeout(res, 250));
      }
      return { ...(r?.modals?.() ?? {}), ok, hits };
    }, [QUEST_TAB, HUNDRED_MAIN, IF_ROOT]);
    console.log('[rfdi] open', JSON.stringify(open));
    if (Number(open?.main) !== IF_ROOT) {
      if (shot) await shot('fail-no-rfd');
      fail(`expected recipe_for_disaster main ${IF_ROOT}, got ${JSON.stringify(open)}`);
    }
    await waitTicks(page, 4);
    if (shot) await shot('pass-rfd');
    console.log(`RESULT PASS rfdi recipe_for_disaster main=${open.main} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
