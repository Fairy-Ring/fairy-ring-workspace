#!/usr/bin/env node
/**
 * Leftover magic_training_arena_shop **15944** from Rewards Guardian Trade-with.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-mta-shop-if-smoke.mjs
 *
 * Product: opnpc4 → if_openmain leftover shop + packed 347 stock.
 * Stand south of Rewards **3362,3318** L1 — not on the size-2 NPC.
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
const { username, password } = resolveAccount(rest, 'mtash');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

// Size-2 Rewards Guardian sits on 3362,3318. 3362,3317 is on the NPC (distance 0).
const STAND = { x: 3362, z: 3316, level: 1 };
const IF_ROOT = 15944;
const SHOP_INV = 15948; // magic_training_arena_shop:com_3
const WAND_BEG = 6908;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[mtash] ${base} user=${username} (magic_training_arena_shop ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`mtash_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    if (!(await teleTo(page, STAND, 1, 25_000))) fail('tele Rewards Guardian stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 8);
    await page.evaluate(async () => {
      const h = globalThis.__lc377;
      for (let i = 0; i < 40; i++) {
        if (!h?.reader?.busy?.() && !h?.reader?.moving?.()) break;
        await new Promise(r => setTimeout(r, 200));
      }
    });

    const traded = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a || !r) return { error: 'no abi' };
      const n = (r.npcs?.() ?? []).find(x => /rewards guardian/i.test(x?.name || ''));
      if (!n) return { error: 'no Rewards Guardian', names: (r.npcs?.() ?? []).map(x => x?.name).slice(0, 16) };
      const ok = !!a.npcOp?.(n.index, 4);
      return { ok, index: n.index, name: n.name, tile: n };
    });
    console.log('[mtash] Trade-with', traded);
    if (!traded?.ok) {
      if (shot) await shot('fail-no-trade');
      fail(`Rewards Trade-with failed ${JSON.stringify(traded)}`);
    }
    const open = await page.evaluate(async invComId => {
      const r = globalThis.__lc377?.reader;
      const c = globalThis.__lc377Client;
      const hits = [];
      for (let i = 0; i < 32; i++) {
        const m = r?.modals?.() ?? {};
        const main = m.main ?? c?.mainModalId ?? -1;
        const items = typeof r?.ifInv === 'function' ? r.ifInv(invComId) : [];
        hits.push({ main, n: items.length });
        if (main === 15944) return { main, overlay: m.overlay ?? -1, items, hits: hits.slice(-6) };
        await new Promise(res => setTimeout(res, 250));
      }
      const m = r?.modals?.() ?? {};
      return { main: m.main ?? -1, overlay: m.overlay ?? -1, items: typeof r?.ifInv === 'function' ? r.ifInv(invComId) : [], hits };
    }, SHOP_INV);
    console.log('[mtash] open', JSON.stringify({ main: open.main, n: open.items.length, ids: open.items.slice(0, 8) }));
    if (shot) await shot(Number(open.main) === IF_ROOT ? 'pass-shop' : 'fail-no-shop');
    if (Number(open.main) !== IF_ROOT) {
      fail(`expected magic_training_arena_shop main ${IF_ROOT}, got ${JSON.stringify(open)}`);
    }
    if (!open.items.some(i => i.id === WAND_BEG)) {
      fail(`shop missing beginner wand ${WAND_BEG}; ids=${open.items.map(i => i.id).join(',')}`);
    }
    console.log(`RESULT PASS mtash main=${open.main} stock=${open.items.length} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
