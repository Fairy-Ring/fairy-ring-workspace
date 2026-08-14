#!/usr/bin/env node
/**
 * Login welcome is cache welcome_screen **15244** (was leftover inter_313).
 * 289 used id 5993 for that name — 377 5993 is MOTW banner (now inter_129).
 * Decision 013: join the row, not the integer.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-welcome-screen-smoke.mjs
 *
 * Product: login → if_openfull(inter_353 MOTW, welcome_screen) main **15244**.
 */
import {
  assertEnginePackHealth,
  boot,
  createShotRunDir,
  fail,
  installScreenshotBridge,
  launchBrowser,
  login,
  logoutSafe,
  mainlandAccount,
  parseArgs,
  resolveAccount,
  waitSceneReady
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'wels');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const WELCOME = 15244;
const MOTW = 17511;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[wels] ${base} user=${username} (welcome_screen ${WELCOME})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`wels_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    // Fresh accounts stop on player_kit (3559). mainlandAccount finishes design +
    // tutorial skip. Relog *without* tele so IF_OPENFULL is not dismissed.
    await mainlandAccount(page, username, password);
    await logoutSafe(page);
    // Inject login and poll IF_OPENFULL *during* scene 1. Rebuild to scene 2
    // unloads fullscreenInterfaceId0/1 (Client.ts rebuild).
    const injected = await page.evaluate(([u, p]) => {
      const h = globalThis.__lc377;
      if (h?.login) return !!h.login(u, p, false);
      return false;
    }, [username, password]);
    if (!injected) fail('relogin inject failed');

    const seen = await page.evaluate(async ([wantWelcome, wantMotw]) => {
      const r = globalThis.__lc377?.reader;
      const h = globalThis.__lc377;
      const hit = m => {
        const ids = [m.main, m.overlay, m.full0, m.full1].map(n => n ?? -1);
        return ids.includes(wantWelcome) || ids.includes(wantMotw);
      };
      const hits = [];
      for (let i = 0; i < 80; i++) {
        const m = r?.modals?.() ?? {};
        const scene = h?.sceneState?.() ?? -1;
        hits.push({ ...m, scene });
        if (hit(m)) return { ok: true, scene, ...m, hits: hits.slice(-8) };
        await new Promise(res => setTimeout(res, 200));
      }
      const m = r?.modals?.() ?? {};
      return { ok: false, scene: h?.sceneState?.() ?? -1, ...m, hits: hits.slice(-10) };
    }, [WELCOME, MOTW]);
    console.log('[wels] modals', JSON.stringify(seen));
    if (!seen?.ok) {
      if (shot) await shot('fail-no-welcome');
      fail(`expected welcome ${WELCOME} or MOTW ${MOTW} on full0/full1, got ${JSON.stringify(seen)}`);
    }
    if (shot) await shot('pass-welcome');
    console.log(
      `RESULT PASS welcome_screen full0=${seen.full0} full1=${seen.full1} main=${seen.main}`
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
