#!/usr/bin/env node
/**
 * Enakhra 32 kg sandstone hand-in (opnpcu enakh_lazim).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-enakh-sandstone-smoke.mjs
 *
 * Soft enakh_quest 1. Give 10+10+10+2 kg. Use on Lazim. 32 kg lump. Stay 1.
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
const { username, password } = resolveAccount(rest, 'enksd');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3191, z: 2925, level: 0 };
const LAZIM_ID = 3147;

async function useSandstone(page, kgRe) {
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
  console.log(`[enksd] ${base} user=${username} (Lazim sandstone)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`enksd_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setstat hitpoints 90', 300);
    await cheatQuiet(page, 'setvar enakh_quest 1', 400);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Lazim stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /^lazim$/i.test(x?.name || ''));
      return { hit: hit ? { id: hit.id, name: hit.name } : null };
    }, LAZIM_ID);
    console.log('[enksd] npc', JSON.stringify(seen));
    if (shot) await shot('01-lazim');
    if (!seen?.hit) fail(`Lazim missing ${JSON.stringify(seen)}`);

    await giveItems(page, [
      ['enakh_sandstone_large', 3],
      ['enakh_sandstone_small', 1]
    ]);

    for (let i = 0; i < 3; i++) {
      const use = await useSandstone(page, String.raw`sandstone \(10kg\)`);
      console.log('[enksd] use 10', JSON.stringify(use));
      if (!use?.ok) fail(`use 10kg failed ${JSON.stringify(use)}`);
      await waitTicks(page, 6);
    }
    if (shot) await shot('02-partial');
    const midCarry = await getServerVarQuiet(page, 'enakh_lazim_carrying_stone');
    if (Number(midCarry) !== 30) fail(`carry after 30kg=${midCarry}`);
    const midStage = await getServerVarQuiet(page, 'enakh_quest');
    if (Number(midStage) !== 1) fail(`partial wrote enakh_quest=${midStage}`);

    const use2 = await useSandstone(page, String.raw`sandstone \(2kg\)`);
    console.log('[enksd] use 2', JSON.stringify(use2));
    if (!use2?.ok) fail(`use 2kg failed ${JSON.stringify(use2)}`);
    await waitTicks(page, 8);
    if (shot) await shot('03-lump');

    const carry = await getServerVarQuiet(page, 'enakh_lazim_carrying_stone');
    if (Number(carry) !== 0) fail(`carry after fuse=${carry}`);
    const stage = await getServerVarQuiet(page, 'enakh_quest');
    if (Number(stage) !== 1) fail(`fuse wrote enakh_quest=${stage}`);
    if (Number(stage) >= 10) fail('wrote 10+');

    const inv = await page.evaluate(() => {
      const items = globalThis.__lc377?.reader?.inventory?.() ?? [];
      return items.map(i => i?.name).filter(Boolean);
    });
    if (!inv.some(n => /32\s*kg/i.test(String(n)))) fail(`32kg lump missing: ${JSON.stringify(inv)}`);

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (!tile || Math.abs((tile.x | 0) - STAND.x) > 16 || Math.abs((tile.z | 0) - STAND.z) > 16) {
      fail(`left quarry ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS enksd lazim=${LAZIM_ID} carry=0 lump32 enakh_quest=${stage} quarry=${tile.x},${tile.z} user=${username}`
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
