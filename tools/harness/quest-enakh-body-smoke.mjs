#!/usr/bin/env node
/**
 * Enakhra 20 kg body: hold/fuse, chisel, place statue 1→2.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-enakh-body-smoke.mjs
 *
 * Soft enakh_quest 1 + statue 1. Give 10+10 + chisel. Stay 1. Never 10.
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
const { username, password } = resolveAccount(rest, 'enkbd');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3191, z: 2925, level: 0 };
const LAZIM_ID = 3147;
const STATUE = { x: 3189, z: 2925 };

async function useOnLazim(page, kgRe) {
  return page.evaluate(reSrc => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    const inv = r?.inventory?.() ?? [];
    const re = new RegExp(reSrc, 'i');
    const block = inv.find(i => re.test(String(i?.name ?? '')));
    if (!block || !a?.useHeldOnNpc) {
      return { ok: false, err: 'no block/abi', names: inv.map(i => i?.name) };
    }
    return { ok: !!a.useHeldOnNpc(block, 'Lazim'), item: block.name };
  }, kgRe);
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[enkbd] ${base} user=${username} (20 kg body)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`enkbd_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setstat hitpoints 90', 300);
    await cheatQuiet(page, 'setvar enakh_quest 1', 400);
    await cheatQuiet(page, 'setvar enakh_statue_multivar 1', 400);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Lazim stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /^lazim$/i.test(x?.name || ''));
      return { hit: hit ? { id: hit.id, name: hit.name } : null };
    }, LAZIM_ID);
    console.log('[enkbd] npc', JSON.stringify(seen));
    if (shot) await shot('01-lazim');
    if (!seen?.hit) fail(`Lazim missing ${JSON.stringify(seen)}`);

    await giveItems(page, [
      ['enakh_sandstone_large', 2],
      ['chisel', 1]
    ]);

    for (let i = 0; i < 2; i++) {
      const use = await useOnLazim(page, String.raw`sandstone \(10kg\)`);
      console.log('[enkbd] use 10', JSON.stringify(use));
      if (!use?.ok) fail(`use 10kg failed ${JSON.stringify(use)}`);
      await waitTicks(page, 6);
    }
    if (shot) await shot('02-lump');

    const carry = await getServerVarQuiet(page, 'enakh_lazim_carrying_stone');
    if (Number(carry) !== 0) fail(`carry after 20kg fuse=${carry}`);
    const invLump = await page.evaluate(() => {
      const items = globalThis.__lc377?.reader?.inventory?.() ?? [];
      return items.map(i => i?.name).filter(Boolean);
    });
    if (!invLump.some(n => /20\s*kg/i.test(String(n)))) fail(`20kg lump missing: ${JSON.stringify(invLump)}`);

    const chisel = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const inv = r?.inventory?.() ?? [];
      const lump = inv.find(i => /20\s*kg/i.test(String(i?.name ?? '')));
      const tool = inv.find(i => /^chisel$/i.test(String(i?.name ?? '').trim()));
      if (!lump || !tool || !a?.useHeldOnHeld) {
        return { ok: false, err: 'no lump/chisel/abi', names: inv.map(i => i?.name) };
      }
      return { ok: !!a.useHeldOnHeld(tool, lump), lump: lump.name };
    });
    console.log('[enkbd] chisel', JSON.stringify(chisel));
    if (!chisel?.ok) fail(`chisel failed ${JSON.stringify(chisel)}`);
    await waitTicks(page, 6);
    if (shot) await shot('03-chisel');

    const afterChisel = await page.evaluate(() => {
      const items = globalThis.__lc377?.reader?.inventory?.() ?? [];
      return items.map(i => i?.name).filter(Boolean);
    });
    if (!afterChisel.some(n => /sandstone body/i.test(String(n)))) {
      fail(`body missing: ${JSON.stringify(afterChisel)}`);
    }

    const place = await page.evaluate(([wx, wz]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const inv = r?.inventory?.() ?? [];
      const body = inv.find(i => /sandstone body/i.test(String(i?.name ?? '')));
      const near = r?.locs?.({ maxDist: 16 }) ?? [];
      const loc =
        r?.locAt?.(wx, wz) ||
        near.find(l => (l.id | 0) === 10955 || (l.id | 0) === 10952 || /headless|flat ground/i.test(String(l?.name ?? ''))) ||
        null;
      if (!body || !a?.useHeldOnLoc) {
        return { ok: false, err: 'no body/abi', names: inv.map(i => i?.name) };
      }
      const ok = loc ? !!a.useHeldOnLoc(body, loc, 16) : false;
      return { ok, loc: loc ? { id: loc.id, name: loc.name, x: loc.x, z: loc.z } : null };
    }, [STATUE.x, STATUE.z]);
    console.log('[enkbd] place', JSON.stringify(place));
    if (!place?.ok) fail(`place body failed ${JSON.stringify(place)}`);
    await waitTicks(page, 8);
    if (shot) await shot('04-place');

    const statue = await getServerVarQuiet(page, 'enakh_statue_multivar');
    if (Number(statue) !== 2) fail(`statue_multivar=${statue} want 2`);
    const stage = await getServerVarQuiet(page, 'enakh_quest');
    if (Number(stage) !== 1) fail(`body wrote enakh_quest=${stage}`);
    if (Number(stage) >= 10) fail('wrote 10+');

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (!tile || Math.abs((tile.x | 0) - STAND.x) > 16 || Math.abs((tile.z | 0) - STAND.z) > 16) {
      fail(`left quarry ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS enkbd statue=2 carry=0 enakh_quest=${stage} never10 quarry=${tile.x},${tile.z} user=${username}`
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
