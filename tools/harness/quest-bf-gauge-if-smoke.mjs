#!/usr/bin/env node
/**
 * Leftover blast_furnace_temp_gauge **14594** from Temperature gauge Read.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-bf-gauge-if-smoke.mjs
 *
 * Product: oploc1 blast_furnace_gauge → if_openmain leftover chrome.
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
const { username, password } = resolveAccount(rest, 'bfgge');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

// Gauge 1945,4961 forceapproach=south — stand south, not on loc.
const STAND = { x: 1945, z: 4960, level: 0 };
const GAUGE = { x: 1945, z: 4961 };
const IF_ROOT = 14594;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[bfgge] ${base} user=${username} (blast_furnace_temp_gauge ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`bfgge_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    if (!(await teleTo(page, STAND, 1, 25_000))) fail('tele BF gauge stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 4);

    const clicked = await page.evaluate(([wx, wz]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a) return { error: 'no abi' };
      const ok =
        !!a.opLocAt?.(wx, wz, 'Read') ||
        !!a.opLoc?.('Temperature gauge', 'Read', 12) ||
        !!a.opLoc?.('gauge', 'Read', 12);
      const locs = (r?.locs?.() ?? []).slice(0, 12).map(x => x?.name);
      return { ok, locs };
    }, [GAUGE.x, GAUGE.z]);
    console.log('[bfgge] Read', clicked);
    if (!clicked?.ok) {
      if (shot) await shot('fail-no-read');
      fail(`gauge Read failed ${JSON.stringify(clicked)}`);
    }

    const open = await page.evaluate(async () => {
      const r = globalThis.__lc377?.reader;
      const hits = [];
      for (let i = 0; i < 28; i++) {
        const m = r?.modals?.() ?? {};
        hits.push({ main: m.main ?? -1, overlay: m.overlay ?? -1 });
        if ((m.main ?? -1) === 14594) return { ...m, hits: hits.slice(-6) };
        await new Promise(res => setTimeout(res, 250));
      }
      return { ...(r?.modals?.() ?? {}), hits };
    });
    console.log('[bfgge] open', JSON.stringify(open));
    if (shot) await shot(Number(open.main) === IF_ROOT ? 'pass-gauge' : 'fail-no-gauge');
    if (Number(open.main) !== IF_ROOT) {
      fail(`expected blast_furnace_temp_gauge main ${IF_ROOT}, got ${JSON.stringify(open)}`);
    }
    console.log(`RESULT PASS bfgge main=${open.main} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
