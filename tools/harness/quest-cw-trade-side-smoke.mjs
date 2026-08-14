#!/usr/bin/env node
/**
 * Castle Wars ticket shop side IF — castlewars_trade_side **13293** (was inter_269).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-cw-trade-side-smoke.mjs
 *
 * Product: Lanthus Trade (op4) → main castlewars_trade 11367 + side 13293.
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
const { username, password } = resolveAccount(rest, 'cwts');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

// m38_48 0 9 17: 1526 Lanthus
const STAND = { x: 2441, z: 3088, level: 0 };
const TRADE = 11367;
const SIDE = 13293;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[cwts] ${base} user=${username} (castlewars_trade_side ${SIDE})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`cwts_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    if (!(await teleTo(page, STAND, 1, 25_000))) fail('tele Lanthus stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 4);

    const open = await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const n = (r?.npcs?.() ?? []).find(x => /lanthus|judge/i.test(x?.name || ''));
      const ok = !!(
        a?.npcOp?.(n?.index, 4) ||
        a?.npcOp?.(n?.name, 4) ||
        a?.talkNpc?.('Lanthus')
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
        if (opts.length) a.chooseOption?.(['trade', 'for trade']);
        else {
          a.continueDialog?.();
          a.dismissModalMessage?.();
        }
        const m = r?.modals?.() ?? {};
        hits.push({ main: m.main ?? -1, side: m.side ?? -1 });
        if ((m.main ?? -1) === 11367 || (m.side ?? -1) === 13293) {
          return { ok, npc: n?.name, ...m, hits: hits.slice(-6) };
        }
        await new Promise(res => setTimeout(res, 300));
      }
      const m = r?.modals?.() ?? {};
      return { ok, npc: n?.name, ...m, hits: hits.slice(-8) };
    });
    console.log('[cwts] open', JSON.stringify(open));
    const main = Number(open?.main);
    const side = Number(open?.side);
    if (main !== TRADE && side !== SIDE) {
      if (shot) await shot('fail-no-shop');
      fail(`expected trade ${TRADE} / side ${SIDE}, got ${JSON.stringify(open)}`);
    }
    if (shot) await shot('pass-shop');
    console.log(`RESULT PASS castlewars_trade_side main=${main} side=${side}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
