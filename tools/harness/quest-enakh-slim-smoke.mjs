#!/usr/bin/env node
/**
 * Enakhra slim: chisel on statue after body (2→3). No head.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-enakh-slim-smoke.mjs
 */
import {
  assertEnginePackHealth,
  boot,
  cheatQuiet,
  createShotRunDir,
  fail,
  getServerVarQuiet,
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
const { username, password } = resolveAccount(rest, 'enksl');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3191, z: 2925, level: 0 };
const STATUE = { x: 3189, z: 2925 };

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[enksl] ${base} user=${username} (slim 2→3)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`enksl_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setstat hitpoints 90', 300);
    await cheatQuiet(page, 'setvar enakh_quest 1', 400);
    await cheatQuiet(page, 'setvar enakh_statue_multivar 2', 400);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    await giveItems(page, [['chisel', 1]]);

    const use = await page.evaluate(([wx, wz]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const inv = r?.inventory?.() ?? [];
      const tool = inv.find(i => /^chisel$/i.test(String(i?.name ?? '').trim()));
      const loc =
        r?.locAt?.(wx, wz) ||
        (r?.locs?.({ maxDist: 16 }) ?? []).find(l => (l.id | 0) === 10956 || (l.id | 0) === 10952) ||
        null;
      if (!tool || !a?.useHeldOnLoc || !loc) {
        return { ok: false, err: 'no chisel/loc', loc: loc ? loc.id : null };
      }
      return { ok: !!a.useHeldOnLoc(tool, loc, 16), loc: { id: loc.id, x: loc.x, z: loc.z } };
    }, [STATUE.x, STATUE.z]);
    console.log('[enksl] chisel loc', JSON.stringify(use));
    if (shot) await shot('01-slim');
    if (!use?.ok) fail(`chisel-on-statue failed ${JSON.stringify(use)}`);
    await waitTicks(page, 8);

    const statue = await getServerVarQuiet(page, 'enakh_statue_multivar');
    if (Number(statue) !== 3) fail(`statue_multivar=${statue} want 3`);
    const stage = await getServerVarQuiet(page, 'enakh_quest');
    if (Number(stage) !== 1) fail(`slim wrote enakh_quest=${stage}`);
    if (Number(stage) >= 10) fail('wrote 10+');

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (!tile || Math.abs((tile.x | 0) - STAND.x) > 16 || Math.abs((tile.z | 0) - STAND.z) > 16) {
      fail(`left quarry ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS enksl statue=3 enakh_quest=${stage} never10 quarry=${tile.x},${tile.z} user=${username}`
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
