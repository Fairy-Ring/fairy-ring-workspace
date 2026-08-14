#!/usr/bin/env node
/**
 * Ghosts Ahoy mix + cook: nettles + bowl_water → nettle-water → nettle tea.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-ahoy-tea \
 *     node tools/harness/quest-ahoy-nettle-tea-smoke.mjs
 *
 * Soft ahoy_questvar 3. Stay 3. No porcelain.
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
const { username, password } = resolveAccount(rest, 'ahtea');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

// Varrock west house range scenery_2728 @ 3219,3388 (generic cooking_oven).
// Do NOT use Lumbridge cooksquestrange 114 — oplocu is stubbed (no @attempt_cook_item).
const STAND = { x: 3221, z: 3388, level: 0 };

async function invNames(page) {
  return page.evaluate(() =>
    (globalThis.__lc377?.reader?.inventory?.() ?? []).map(x => x?.name || x?.debugname)
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[ahtea] ${base} user=${username} (mix+cook nettle tea)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`ahtea_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar ahoy_questvar 3', 400);
    await cheatQuiet(page, 'setstat cooking 99', 300);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele range stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 4);
    await giveItems(page, [
      ['nettles_picked', 1],
      ['bowl_water', 1]
    ]);
    if (shot) await shot('01-inv');

    const mix = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const inv = r?.inventory?.() ?? [];
      const nettles = inv.find(i => /nettle/i.test(String(i?.name || i?.debugname || '')));
      const bowl = inv.find(i => /bowl of water/i.test(String(i?.name || i?.debugname || '')));
      if (!nettles || !bowl || !a?.useHeldOnHeld) {
        return { ok: false, err: 'no items/abi', inv: inv.map(i => i?.name) };
      }
      const ok = !!(a.useHeldOnHeld(nettles, bowl) || a.useHeldOnHeld(bowl, nettles));
      return { ok, n: nettles.name, b: bowl.name };
    });
    console.log('[ahtea] mix', JSON.stringify(mix));
    if (!mix?.ok) fail(`mix failed ${JSON.stringify(mix)}`);
    await waitTicks(page, 6);
    if (shot) await shot('02-mix');
    let inv = await invNames(page);
    console.log('[ahtea] after mix', inv);
    if (!inv.some(n => /nettle-water|nettle water/i.test(String(n || '')))) {
      fail(`bowl_nettlewater missing ${JSON.stringify(inv)}`);
    }

    const cook = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const inv = r?.inventory?.() ?? [];
      const water = inv.find(i => /nettle-water|nettle water/i.test(String(i?.name || i?.debugname || '')));
      const locs = r?.locs?.() ?? [];
      const loc = locs.find(l => (l.id | 0) === 2728 || /^range$/i.test(String(l?.name || '')));
      if (!water || !a?.useHeldOnLoc) return { ok: false, err: 'no water/abi', loc: loc || null };
      const ok = loc ? !!a.useHeldOnLoc(water, loc, 16) : !!a.useHeldOnLoc(water, 'Range', 16);
      return { ok, loc: loc ? { id: loc.id, name: loc.name, x: loc.x, z: loc.z } : null };
    });
    console.log('[ahtea] cook', JSON.stringify(cook));
    if (!cook?.ok) fail(`cook use failed ${JSON.stringify(cook)}`);
    await waitTicks(page, 12);
    if (shot) await shot('03-cook');
    inv = await invNames(page);
    console.log('[ahtea] after cook', inv);
    if (!inv.some(n => /^nettle tea$/i.test(String(n || '')) || /bowl of nettle tea/i.test(String(n || '')))) {
      if (!inv.some(n => /nettle tea/i.test(String(n || '')))) fail(`bowl_nettletea missing ${JSON.stringify(inv)}`);
    }
    const stage = await getServerVarQuiet(page, 'ahoy_questvar');
    if (Number(stage) !== 3) fail(`wrote ahoy_questvar=${stage}`);

    console.log(`RESULT PASS ahtea mix+cook stay 3 user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
