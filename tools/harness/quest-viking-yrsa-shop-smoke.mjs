#!/usr/bin/env node
/**
 * Viking clothing shop — product Trade after Fremennik complete.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-viking-yrsa-shop-smoke.mjs
 *
 * Soft: viking 10. Product: npcOp Trade (op3) → shop_template 3824
 * with viking_clothes_shop stock (viking_top_blue = 3775).
 *
 * Inv stock already in scripts/_unpack/727/all.inv; this proves NPC
 * owned_shop + ~openshop_activenpc (274 params on 377 unpack names).
 */
import {
  assertEnginePackHealth,
  boot,
  cheatQuiet,
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
const { username, password } = resolveAccount(rest, 'vikshop');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const YRSA = { x: 2625, z: 3674, level: 0 }; // stand south of spawn 0_41_57_1_27
const SHOP_ROOT = 3824; // shop_template
const SHOP_INV = 3900; // shop_template:inv (do not BFS — first TYPE_INV can be empty)
const VIKING_TOP_BLUE = 3775;

async function snapShop(page) {
  return page.evaluate(invComId => {
    const r = globalThis.__lc377?.reader;
    const c = globalThis.__lc377Client;
    const main = r?.modals?.()?.main ?? c?.mainModalId ?? -1;
    const items = typeof r?.ifInv === 'function' ? r.ifInv(invComId) : [];
    const chat = (() => {
      try {
        return (r?.chat?.(12) ?? []).map(l => (typeof l === 'string' ? l : l?.text));
      } catch {
        return [];
      }
    })();
    return { main, items, chat };
  }, SHOP_INV);
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[vik-shop] ${base} user=${username} (Yrsa Trade; headed default)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`vik-shop_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar viking 10', 400);
    await waitTicks(page, 2);

    if (!(await teleTo(page, YRSA, 2, 25_000))) fail('tele Yrsa failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 4);

    const traded = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a || !r) return { error: 'no abi' };
      const n = (r.npcs?.() ?? []).find(x => /yrsa/i.test(x?.name || ''));
      if (!n) return { error: 'no Yrsa', names: (r.npcs?.() ?? []).map(x => x?.name).slice(0, 12) };
      const ok = !!a.npcOp?.(n.index, 3);
      return { ok, index: n.index, name: n.name };
    });
    console.log('[vik-shop] Trade', traded);
    if (!traded?.ok) {
      if (shot) await shot('fail-no-trade');
      fail(`Yrsa Trade failed ${JSON.stringify(traded)}`);
    }
    await waitTicks(page, 6);

    const shop = await snapShop(page);
    console.log('[vik-shop] shop', JSON.stringify({ main: shop.main, n: shop.items.length, ids: shop.items.slice(0, 8) }));
    if (shot) await shot('after-trade');
    if (Number(shop.main) !== SHOP_ROOT) {
      fail(`shop IF not open main=${shop.main} want ${SHOP_ROOT} chat=${JSON.stringify(shop.chat)}`);
    }
    const hasBlue = shop.items.some(i => i.id === VIKING_TOP_BLUE);
    if (!hasBlue) {
      fail(`shop stock missing viking_top_blue ${VIKING_TOP_BLUE}; ids=${shop.items.map(i => i.id).join(',')}`);
    }
    console.log(`RESULT PASS vik-shop Yrsa Trade shop=${shop.main} stock=${shop.items.length} hasBlue=true (SOFT viking 10)`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
