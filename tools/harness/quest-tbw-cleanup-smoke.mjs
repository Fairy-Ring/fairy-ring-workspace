#!/usr/bin/env node
/**
 * Tai Bwo Wannai Cleanup first mid-gate.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-tbw-cleanup-smoke.mjs
 *
 * Product: login/mapzone opens leftover tai_bwo_favour overlay 14206,
 * shows Gabooty (chat_gabooty=1), Trade-Co-op → shop_template 3824
 * with leftover tai_bwo_wannai_cooperative stock.
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
const { username, password } = resolveAccount(rest, 'tbwcu');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

// Gabooty multi 2519 at 0, 2794, 3065 — stand west, not on the NPC.
const GABOOTY = { x: 2793, z: 3065, level: 0 };
const FAVOUR_OVERLAY = 14206;
const SHOP_ROOT = 3824;
const SHOP_INV = 3900;
const SHIRT_CREAM = 6341; // tbw_villager_shirt_cream

async function snapShop(page) {
  return page.evaluate(invComId => {
    const r = globalThis.__lc377?.reader;
    const c = globalThis.__lc377Client;
    const m = r?.modals?.() ?? {};
    const main = m.main ?? c?.mainModalId ?? -1;
    const overlay = m.overlay ?? -1;
    const items = typeof r?.ifInv === 'function' ? r.ifInv(invComId) : [];
    const npcs = (r?.npcs?.() ?? []).map(x => x?.name).filter(Boolean).slice(0, 16);
    return { main, overlay, items, npcs };
  }, SHOP_INV);
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[tbwcu] ${base} user=${username} (Gabooty Trade-Co-op + Favour overlay)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`tbwcu_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    if (!(await teleTo(page, GABOOTY, 2, 25_000))) fail('tele Gabooty stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const before = await snapShop(page);
    console.log('[tbwcu] after-tele', JSON.stringify({ overlay: before.overlay, npcs: before.npcs }));
    if (shot) await shot('after-tele');
    if (Number(before.overlay) !== FAVOUR_OVERLAY) {
      fail(`expected tai_bwo_favour overlay ${FAVOUR_OVERLAY}, got ${JSON.stringify(before)}`);
    }
    if (!before.npcs.some(n => /gabooty/i.test(n))) {
      fail(`Gabooty not visible (chat_gabooty default 0?). npcs=${JSON.stringify(before.npcs)}`);
    }

    const traded = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a || !r) return { error: 'no abi' };
      const n = (r.npcs?.() ?? []).find(x => /gabooty/i.test(x?.name || ''));
      if (!n) return { error: 'no Gabooty', names: (r.npcs?.() ?? []).map(x => x?.name).slice(0, 12) };
      const ok = !!a.npcOp?.(n.index, 3);
      return { ok, index: n.index, name: n.name };
    });
    console.log('[tbwcu] Trade-Co-op', traded);
    if (!traded?.ok) {
      if (shot) await shot('fail-no-trade');
      fail(`Gabooty Trade-Co-op failed ${JSON.stringify(traded)}`);
    }
    await waitTicks(page, 6);

    const shop = await snapShop(page);
    console.log('[tbwcu] shop', JSON.stringify({ main: shop.main, overlay: shop.overlay, n: shop.items.length, ids: shop.items.slice(0, 8) }));
    if (shot) await shot('after-trade');
    if (Number(shop.main) !== SHOP_ROOT) {
      fail(`shop IF not open main=${shop.main} want ${SHOP_ROOT}`);
    }
    const hasShirt = shop.items.some(i => i.id === SHIRT_CREAM);
    if (!hasShirt) {
      fail(`shop stock missing tbw_villager_shirt_cream ${SHIRT_CREAM}; ids=${shop.items.map(i => i.id).join(',')}`);
    }
    console.log(`RESULT PASS tbwcu overlay=${shop.overlay} shop=${shop.main} stock=${shop.items.length} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
