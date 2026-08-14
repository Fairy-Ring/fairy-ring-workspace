#!/usr/bin/env node
/**
 * Generic complete scroll is questscroll_death cache **12140** (377 leftover
 * inter_238). 289 used id 8680 for that name — 377 8680 is Tutorial Island
 * Progress. Decision 013: join the row, not the integer.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-complete-scroll-smoke.mjs
 *
 * Soft: cookquest 1 + egg/milk/flour. Product Talk Cook → complete → main 12140.
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
const { username, password } = resolveAccount(rest, 'qscrl');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const COOK_STAND = { x: 3208, z: 3213, level: 0 };
const IF_ROOT = 12140;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[qscrl] ${base} user=${username} (questscroll_death ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`qscrl_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar cookquest 1', 400);
    await giveItems(page, [
      ['egg', 1],
      ['bucket_milk', 1],
      ['pot_flour', 1]
    ]);
    await waitTicks(page, 2);
    if (!(await teleTo(page, COOK_STAND, 1, 25_000))) fail('tele Cook stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);

    const talk = await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a || !r) return { error: 'no abi' };
      const getOpts = () => {
        try {
          return (r.chatOptions?.() ?? [])
            .map(o => (typeof o === 'string' ? o : o?.text))
            .filter(Boolean);
        } catch {
          return [];
        }
      };
      let ok = !!a.talkNpc?.('Cook');
      if (!ok) {
        const n = (r.npcs?.() ?? []).find(x => /cook/i.test(x?.name || ''));
        if (n) ok = !!a.talkNpc?.(n.name) || !!a.npcOp?.(n.index, 1);
      }
      await new Promise(res => setTimeout(res, 800));
      const mains = [];
      for (let i = 0; i < 50; i++) {
        const opts = getOpts();
        if (opts.length) {
          a.chooseOption?.(['yes', "i'll help", 'help you']);
        } else {
          a.continueDialog?.();
          a.dismissModalMessage?.();
        }
        await new Promise(res => setTimeout(res, 280));
        const main = r.modals?.()?.main ?? -1;
        mains.push(main);
        if (main === 12140) break;
      }
      return { ok, main: r.modals?.()?.main ?? -1, mains: mains.slice(-8) };
    });
    console.log('[qscrl] cook', JSON.stringify(talk));
    if (Number(talk?.main) !== IF_ROOT) {
      if (shot) await shot('fail-no-scroll');
      fail(`expected main ${IF_ROOT} questscroll_death, got ${JSON.stringify(talk)}`);
    }
    if (shot) await shot('pass-scroll');
    console.log(`RESULT PASS questscroll_death main=${talk.main}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
