#!/usr/bin/env node
/**
 * Ghosts Ahoy nettle Pick: bare-hand sting then gloves yield Nettles.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-ahoy-nettles \
 *     node tools/harness/quest-ahoy-nettle-pick-smoke.mjs
 *
 * Soft ahoy_questvar 3. Stand next to swamp nettles 3525,3511. Stay 3.
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
const { username, password } = resolveAccount(rest, 'ahnet');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3524, z: 3511, level: 0 };

async function pick(page) {
  return page.evaluate(() => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    const locs = r?.locs?.() ?? [];
    const loc = locs.find(l => /nettle/i.test(String(l?.name || '')));
    const ok = !!(
      a?.opLocAt?.(3525, 3511, 'Pick') ||
      a?.opLocAt?.(3525, 3511, '') ||
      (loc && a?.opLoc?.(loc.name || 'Nettles', 'Pick', 10))
    );
    return { ok, loc: loc ? { id: loc.id, name: loc.name, x: loc.x, z: loc.z } : null };
  });
}

async function invNames(page) {
  return page.evaluate(() =>
    (globalThis.__lc377?.reader?.inventory?.() ?? []).map(x => x?.name || x?.debugname)
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[ahnet] ${base} user=${username} (Pick nettles)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`ahnet_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar ahoy_questvar 3', 400);
    await cheatQuiet(page, 'setstat hitpoints 90', 300);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele swamp stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-swamp');

    const bare = await pick(page);
    console.log('[ahnet] bare', JSON.stringify(bare));
    await waitTicks(page, 8);
    if (shot) await shot('02-bare');
    if (!bare?.ok) fail(`bare Pick failed ${JSON.stringify(bare)}`);
    const invBare = await invNames(page);
    if (invBare.some(n => /nettle/i.test(String(n || '')))) fail(`bare-hand granted nettles ${JSON.stringify(invBare)}`);
    const hp = await getServerVarQuiet(page, 'hitpoints');
    console.log('[ahnet] hp after sting', hp);

    await giveItems(page, [['leather_gloves', 1]]);
    const worn = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      return {
        ok: !!(
          a?.equip?.('Leather gloves') ||
          a?.equip?.('leather gloves') ||
          a?.heldOp?.('Leather gloves', 2) ||
          a?.heldOp?.('leather gloves', 2)
        )
      };
    });
    console.log('[ahnet] wear', JSON.stringify(worn));
    await waitTicks(page, 4);

    const gloved = await pick(page);
    console.log('[ahnet] gloved', JSON.stringify(gloved));
    await waitTicks(page, 6);
    if (shot) await shot('03-pick');
    if (!gloved?.ok) fail(`gloved Pick failed ${JSON.stringify(gloved)}`);
    const inv = await invNames(page);
    if (!inv.some(n => /^nettles$/i.test(String(n || '')) || /handful of nettles/i.test(String(n || '')))) {
      if (!inv.some(n => /nettle/i.test(String(n || '')))) fail(`nettles_picked missing ${JSON.stringify(inv)}`);
    }
    const stage = await getServerVarQuiet(page, 'ahoy_questvar');
    if (Number(stage) !== 3) fail(`wrote ahoy_questvar=${stage}`);

    console.log(`RESULT PASS ahnet pick stay 3 user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
