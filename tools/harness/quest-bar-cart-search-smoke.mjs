#!/usr/bin/env node
/**
 * BAR mine-cart Search. Stay dwarfrock_quest 10. Never 110. No dest.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-bar-cart \
 *     node tools/harness/quest-bar-cart-search-smoke.mjs
 *
 * Soft dwarfrock_quest 10. Stand 3016,9845 W of cart 3017,9845.
 */
import {
  assertEnginePackHealth,
  boot,
  cheatQuiet,
  createShotRunDir,
  fail,
  getServerVarQuiet,
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
const { username, password } = resolveAccount(rest, 'barcart');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3016, z: 9845, level: 0 };
const CART = { x: 3017, z: 9845 };
const CART_ID = 6045;

async function worldTile(page) {
  return page.evaluate(() => {
    const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
    return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[barcart] ${base} user=${username} (cart Search)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`barcart_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar dwarfrock_quest 10', 400);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele cart stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-cart');

    const search = await page.evaluate(([cx, cz, id]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const locs = r?.locs?.() ?? [];
      const loc = locs.find(
        l => (l.id | 0) === id || /mine cart/i.test(String(l?.name || ''))
      );
      const ok = !!(
        a?.opLocAt?.(cx, cz, 'Search') ||
        a?.opLocAt?.(cx, cz, '') ||
        (loc && a?.opLoc?.(loc.name || 'Mine cart', 'Search', 10))
      );
      return { ok, loc: loc ? { id: loc.id, name: loc.name, x: loc.x, z: loc.z } : null };
    }, [CART.x, CART.z, CART_ID]);
    console.log('[barcart] search', JSON.stringify(search));
    await waitTicks(page, 8);
    if (shot) await shot('02-search');
    if (!search?.ok) fail(`Search failed ${JSON.stringify(search)}`);

    const chat = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.chat?.(16) ?? []).map(c => String(c?.text ?? c ?? ''))
    );
    const text = chat.join(' | ');
    console.log('[barcart] chat', text);
    if (!/missing page|rolad's book/i.test(text)) fail(`page mes missing: ${text}`);
    if (/schematic|cannon|gold helmet|arzinian/i.test(text)) fail(`later leftover leaked: ${text}`);

    const inv = await page.evaluate(() => {
      const r = globalThis.__lc377?.reader;
      return (r?.inventory?.() ?? []).map(i => ({
        id: i.id | 0,
        name: String(i.name || '')
      }));
    });
    console.log('[barcart] inv', JSON.stringify(inv));
    const page2 = inv.find(
      i => (i.id | 0) === 4570 || /book page 2|page 2/i.test(i.name)
    );
    if (!page2) fail(`page2 missing ${JSON.stringify(inv)}`);

    const tile = await worldTile(page);
    console.log('[barcart] tile', tile);
    if (Math.abs((tile.x | 0) - STAND.x) > 10 || Math.abs((tile.z | 0) - STAND.z) > 10) {
      fail(`dest invented ${JSON.stringify(tile)}`);
    }
    const stage = await getServerVarQuiet(page, 'dwarfrock_quest');
    if (Number(stage) !== 10) fail(`wrote dwarfrock_quest=${stage}`);
    if (Number(stage) === 110) fail('wrote 110');

    console.log(`RESULT PASS barcart cart Search stay 10 no dest user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
