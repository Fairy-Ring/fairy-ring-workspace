#!/usr/bin/env node
/**
 * Yrsa shoe catalogue IF — cache-native shoestore (9947), not free-ID 19049.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-viking-shoestore-smoke.mjs
 *
 * Soft: viking 10 + coins. Product Talk → change shoes → main 9947.
 */
import {
  assertEnginePackHealth,
  boot,
  cheatQuiet,
  createShotRunDir,
  fail,
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
const { username, password } = resolveAccount(rest, 'vikshoe');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2625, z: 3674, level: 0 };
const IF_ROOT = 9947;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[vik-shoe] ${base} user=${username} (shoestore ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`vik-shoe_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar viking 10', 400);
    await giveItems(page, [['coins', 500]]);
    await waitTicks(page, 2);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Yrsa stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 2);

    const talk = await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      let ok = !!a?.talkNpc?.('Yrsa') || !!a?.talkNpc?.('clothing');
      if (!ok) {
        const n = (r?.npcs?.() ?? []).find(x => /yrsa/i.test(x?.name || ''));
        if (n) ok = !!a.talkNpc?.(n.name) || !!a.npcOp?.(n.index, 1);
      }
      const mains = [];
      const picks = [];
      for (let i = 0; i < 40; i++) {
        const opts = (r?.chatOptions?.() ?? [])
          .map(o => (typeof o === 'string' ? o : o?.text))
          .filter(Boolean);
        if (opts.length) {
          a.chooseOption?.(['change my shoes', 'shoes', 'makeover']);
          picks.push(opts);
        } else {
          a.continueDialog?.();
          a.dismissModalMessage?.();
        }
        mains.push(r?.modals?.()?.main ?? -1);
        if (mains[mains.length - 1] === 9947) break;
        await new Promise(res => setTimeout(res, 220));
      }
      return {
        ok,
        mainSeen: mains.includes(9947) ? 9947 : mains.at(-1),
        mains: mains.filter(m => m > 0).slice(0, 8),
        picks: picks.slice(0, 6)
      };
    });
    console.log('[vik-shoe] yrsa', JSON.stringify(talk).slice(0, 800));
    if (shot) await shot(talk.mainSeen === IF_ROOT ? 'shoe-open' : 'shoe-no-if');
    if (talk.mainSeen !== IF_ROOT) {
      fail(`expected main ${IF_ROOT} (shoestore), got ${talk.mainSeen}`);
    }
    console.log(`RESULT PASS vik-shoe product open shoestore ${IF_ROOT} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
