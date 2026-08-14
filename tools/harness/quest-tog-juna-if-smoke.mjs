#!/usr/bin/env node
/**
 * ToG first leftover mid-gate: map-only Juna loc **6657** @ **3252,9516 L2**.
 * Then leftover tunnel Enter pair (not HUD).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-tog-juna-if-smoke.mjs
 *
 * Do not open water_collected 3279. Talk-to stays silent.
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
const { username, password } = resolveAccount(rest, 'togju');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const JUNA_STAND = { x: 3252, z: 9515, level: 2 };
const JUNA = { x: 3252, z: 9516 };
const HUD = 3279;
const CAVE_UP_STAND = { x: 3218, z: 9532, level: 2 };
const CAVE_UP = { x: 3218, z: 9533 };
const CAVE_DOWN_NEAR = { x: 3225, z: 9538, level: 0 };

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[togju] ${base} user=${username} (Juna 6657 + cave pair)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`togju_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    if (!(await teleTo(page, JUNA_STAND, 2, 25_000))) fail('tele Juna stand L2 failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const juna = await page.evaluate(([wx, wz]) => {
      const r = globalThis.__lc377?.reader;
      const m = r?.modals?.() ?? {};
      const locs = (r?.locs?.({ maxDist: 8 }) ?? []).map(x => ({
        id: x?.id,
        name: x?.name,
        op: x?.ops,
        x: x?.x,
        z: x?.z
      }));
      const hit = locs.find(x => (x.x | 0) === wx && (x.z | 0) === wz);
      return {
        overlay: m.overlay ?? -1,
        main: m.main ?? -1,
        hit,
        names: locs.filter(x => x.name).slice(0, 12)
      };
    }, [JUNA.x, JUNA.z]);
    console.log('[togju] juna', JSON.stringify(juna));
    if (shot) await shot('01-juna');
    const junaOk =
      (juna?.hit?.id | 0) === 6657 ||
      String(juna?.hit?.name || '').toLowerCase() === 'juna' ||
      (juna?.names || []).some(x => String(x?.name || '').toLowerCase() === 'juna');
    if (!junaOk) fail(`Juna loc 6657 not at ${JUNA.x},${JUNA.z}: ${JSON.stringify(juna)}`);
    if (Number(juna.overlay) === HUD) {
      fail(`water_collected ${HUD} opened on Juna presence — false join`);
    }

    if (!(await teleTo(page, CAVE_UP_STAND, 2, 25_000))) fail('tele cave-up stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 4);
    const entered = await page.evaluate(([wx, wz]) => {
      const a = globalThis.__lc377?.actions;
      return !!(
        a?.opLocAt?.(wx, wz, 'Enter') ||
        a?.opLoc?.('Tunnel', 'Enter', 12) ||
        a?.opLocAt?.(wx, wz, '')
      );
    }, [CAVE_UP.x, CAVE_UP.z]);
    console.log('[togju] cave Enter', entered);
    if (!entered) {
      if (shot) await shot('fail-no-enter');
      fail('tog_cave_up Enter failed');
    }
    await waitTicks(page, 8);
    const dest = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    console.log('[togju] dest', JSON.stringify(dest));
    if (shot) await shot('02-cave-down');
    const near =
      dest &&
      dest.level === CAVE_DOWN_NEAR.level &&
      Math.abs((dest.x | 0) - CAVE_DOWN_NEAR.x) <= 3 &&
      Math.abs((dest.z | 0) - CAVE_DOWN_NEAR.z) <= 3;
    if (!near) fail(`cave dest not next to down mouth ${JSON.stringify(dest)}`);
    const after = await page.evaluate(() => {
      const m = globalThis.__lc377?.reader?.modals?.() ?? {};
      return m.overlay ?? -1;
    });
    if (Number(after) === HUD) fail(`water_collected opened after cave Enter`);
    console.log(`RESULT PASS togju juna=6657 caveDest=${dest.x},${dest.z},L${dest.level} overlay=${after} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
