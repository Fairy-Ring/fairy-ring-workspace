#!/usr/bin/env node
/**
 * Ranging Guild ticket shop — tickets_shop **11942** (was leftover inter_232).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-tickets-shop-smoke.mjs
 *
 * Product: Ticket Merchant Trade → main 11942. Stand west of spawn 2659,3429.
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
const { username, password } = resolveAccount(rest, 'tkt');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

// m41_53 NPC 694 @ 0 35 37 → 2659,3429 (also 0 35 39 → 2659,3431)
const NPC = { x: 2659, z: 3429, level: 0 };
const STAND = { x: 2658, z: 3429, level: 0 };
const IF_ROOT = 11942;

async function waitIdleNear(page, tile, dist = 1, iters = 50) {
  await page.evaluate(
    async ([wx, wz, d, n]) => {
      const h = globalThis.__lc377;
      for (let i = 0; i < n; i++) {
        const t = h?.worldTile?.();
        const busy = h?.reader?.busy?.() || h?.reader?.moving?.();
        if (t && Math.max(Math.abs(t.x - wx), Math.abs(t.z - wz)) <= d && !busy) break;
        await new Promise(r => setTimeout(r, 200));
      }
    },
    [tile.x, tile.z, dist, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[tkt] ${base} user=${username} (tickets_shop ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`tkt_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    if (!(await teleTo(page, STAND, 1, 25_000))) fail('tele ticket merchant stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 4);
    await waitIdleNear(page, STAND, 1, 40);

    const open = await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const n = (r?.npcs?.() ?? []).find(x => /ticket merchant|ticket/i.test(x?.name || ''));
      const ok = !!(
        a?.npcOp?.(n?.index, 1) ||
        a?.npcOp?.(n?.name, 1) ||
        a?.talkNpc?.('Ticket Merchant')
      );
      const hits = [];
      for (let i = 0; i < 30; i++) {
        const opts = (() => {
          try {
            return (r.chatOptions?.() ?? []).map(o => (typeof o === 'string' ? o : o?.text)).filter(Boolean);
          } catch {
            return [];
          }
        })();
        if (opts.length) a.chooseOption?.(['trade', 'exchange']);
        else {
          a.continueDialog?.();
          a.dismissModalMessage?.();
        }
        const m = r?.modals?.() ?? {};
        hits.push({ main: m.main ?? -1, side: m.side ?? -1 });
        if ((m.main ?? -1) === 11942) {
          return { ok, npc: n?.name, ...m, hits: hits.slice(-6) };
        }
        await new Promise(res => setTimeout(res, 300));
      }
      const m = r?.modals?.() ?? {};
      return { ok, npc: n?.name, ...m, hits: hits.slice(-8) };
    });
    console.log('[tkt] open', JSON.stringify(open));
    const main = Number(open?.main);
    if (main !== IF_ROOT) {
      if (shot) await shot('fail-no-shop');
      fail(`expected tickets_shop ${IF_ROOT}, got ${JSON.stringify(open)}`);
    }
    if (shot) await shot('pass-shop');
    console.log(`RESULT PASS tickets_shop main=${main}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
