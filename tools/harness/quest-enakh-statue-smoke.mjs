#!/usr/bin/env node
/**
 * Enakhra chisel 32 kg → base, place on Flat ground (statue 0→1).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-enakh-statue-smoke.mjs
 *
 * Soft enakh_quest 1. Give 32 kg + chisel. Stay 1. Never 10.
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
const { username, password } = resolveAccount(rest, 'enkst');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3191, z: 2925, level: 0 };

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[enkst] ${base} user=${username} (chisel/place base)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`enkst_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setstat hitpoints 90', 300);
    await cheatQuiet(page, 'setvar enakh_quest 1', 400);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele statue stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const given = await giveItems(page, [
      ['enakh_sandstone_huge_base+legs', 1],
      ['chisel', 1]
    ]);
    if (given?.length) console.warn('[enkst] give', given);

    const chisel = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const inv = r?.inventory?.() ?? [];
      const lump = inv.find(i => /32\s*kg/i.test(String(i?.name ?? '')));
      const tool = inv.find(i => /^chisel$/i.test(String(i?.name ?? '').trim()));
      if (!lump || !tool || !a?.useHeldOnHeld) {
        return { ok: false, err: 'no lump/chisel/abi', names: inv.map(i => i?.name) };
      }
      return { ok: !!a.useHeldOnHeld(tool, lump), lump: lump.name, tool: tool.name };
    });
    console.log('[enkst] chisel', JSON.stringify(chisel));
    if (!chisel?.ok) fail(`chisel use failed ${JSON.stringify(chisel)}`);
    await waitTicks(page, 6);
    if (shot) await shot('01-chisel');

    const afterChisel = await page.evaluate(() => {
      const items = globalThis.__lc377?.reader?.inventory?.() ?? [];
      return items.map(i => i?.name).filter(Boolean);
    });
    if (!afterChisel.some(n => /sandstone base/i.test(String(n)))) {
      fail(`base missing after chisel: ${JSON.stringify(afterChisel)}`);
    }
    if (afterChisel.some(n => /32\s*kg/i.test(String(n)))) {
      fail(`32kg still in inv: ${JSON.stringify(afterChisel)}`);
    }

    const place = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const inv = r?.inventory?.() ?? [];
      const base = inv.find(i => /sandstone base/i.test(String(i?.name ?? '')));
      const near = (r?.locs?.({ maxDist: 16 }) ?? []).map(l => ({
        id: l.id,
        name: l.name,
        x: l.x,
        z: l.z,
        ops: l.ops
      }));
      const named = (r?.locs?.({ name: 'Flat ground', maxDist: 16 }) ?? [])[0];
      const byId = (r?.locs?.({ maxDist: 16 }) ?? []).find(
        l => (l.id | 0) === 10954 || (l.id | 0) === 10952 || /flat ground/i.test(String(l?.name ?? ''))
      );
      const at = r?.locAt?.(3189, 2925) || r?.locAt?.(3190, 2925) || r?.locAt?.(3189, 2926);
      const loc = named || byId || at || null;
      if (!base || !a?.useHeldOnLoc) {
        return { ok: false, err: 'no base/abi', names: inv.map(i => i?.name), near };
      }
      const ok = loc ? !!a.useHeldOnLoc(base, loc, 16) : !!a.useHeldOnLoc(base, 'Flat ground', 16);
      return {
        ok,
        loc: loc ? { id: loc.id, name: loc.name, x: loc.x, z: loc.z, lx: loc.lx, lz: loc.lz } : null,
        near: near.slice(0, 16)
      };
    });
    console.log('[enkst] place', JSON.stringify(place));
    if (!place?.ok) fail(`place failed ${JSON.stringify(place)}`);
    await waitTicks(page, 8);
    if (shot) await shot('02-place');

    const statue = await getServerVarQuiet(page, 'enakh_statue_multivar');
    if (Number(statue) !== 1) fail(`statue_multivar=${statue} want 1`);
    const stage = await getServerVarQuiet(page, 'enakh_quest');
    if (Number(stage) !== 1) fail(`place wrote enakh_quest=${stage}`);
    if (Number(stage) >= 10) fail('wrote 10+');

    const inv = await page.evaluate(() => {
      const items = globalThis.__lc377?.reader?.inventory?.() ?? [];
      return items.map(i => i?.name).filter(Boolean);
    });
    if (inv.some(n => /sandstone base/i.test(String(n)))) {
      fail(`base still in inv: ${JSON.stringify(inv)}`);
    }

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (!tile || Math.abs((tile.x | 0) - STAND.x) > 16 || Math.abs((tile.z | 0) - STAND.z) > 16) {
      fail(`left quarry ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS enkst statue=1 enakh_quest=${stage} never10 quarry=${tile.x},${tile.z} user=${username}`
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
