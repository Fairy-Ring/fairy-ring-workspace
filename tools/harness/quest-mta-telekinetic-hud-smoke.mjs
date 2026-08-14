#!/usr/bin/env node
/**
 * Leftover pizazz_telekinetic **15962** from hall Telekinetic Teleport Enter.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-mta-telekinetic-hud-smoke.mjs
 *
 * Product: oploc1 telekinetic_teleport → room + if_openoverlay.
 * Stand south of portal **3363,3315** L0.
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
const { username, password } = resolveAccount(rest, 'mtatk');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3363, z: 3314, level: 0 };
const PORTAL = { x: 3363, z: 3315 };
const IF_ROOT = 15962;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[mtatk] ${base} user=${username} (pizazz_telekinetic ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`mtatk_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    if (!(await teleTo(page, STAND, 1, 25_000))) fail('tele telekinetic portal stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    await page.evaluate(async () => {
      const h = globalThis.__lc377;
      for (let i = 0; i < 40; i++) {
        if (!h?.reader?.busy?.() && !h?.reader?.moving?.()) break;
        await new Promise(r => setTimeout(r, 200));
      }
    });

    const clicked = await page.evaluate(([wx, wz]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a) return { error: 'no abi' };
      const ok =
        !!a.opLocAt?.(wx, wz, 'Enter') ||
        !!a.opLoc?.('Telekinetic Teleport', 'Enter', 12) ||
        !!a.opLoc?.('Telekinetic', 'Enter', 12);
      const locs = (r?.locs?.() ?? []).slice(0, 14).map(x => x?.name);
      return { ok, locs };
    }, [PORTAL.x, PORTAL.z]);
    console.log('[mtatk] Enter', clicked);
    if (!clicked?.ok) {
      if (shot) await shot('fail-no-enter');
      fail(`Telekinetic Enter failed ${JSON.stringify(clicked)}`);
    }

    const open = await page.evaluate(async () => {
      const r = globalThis.__lc377?.reader;
      const hits = [];
      for (let i = 0; i < 36; i++) {
        const m = r?.modals?.() ?? {};
        const t = globalThis.__lc377?.worldTile?.();
        hits.push({ overlay: m.overlay ?? -1, tile: t });
        if ((m.overlay ?? -1) === 15962) return { ...m, tile: t, hits: hits.slice(-6) };
        await new Promise(res => setTimeout(res, 250));
      }
      return { ...(r?.modals?.() ?? {}), tile: globalThis.__lc377?.worldTile?.(), hits };
    });
    console.log('[mtatk] open', JSON.stringify(open));
    if (shot) await shot(Number(open.overlay) === IF_ROOT ? 'pass-hud' : 'fail-no-hud');
    if (Number(open.overlay) !== IF_ROOT) {
      fail(`expected pizazz_telekinetic overlay ${IF_ROOT}, got ${JSON.stringify(open)}`);
    }
    console.log(`RESULT PASS mtatk overlay=${open.overlay} tile=${JSON.stringify(open.tile)} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
