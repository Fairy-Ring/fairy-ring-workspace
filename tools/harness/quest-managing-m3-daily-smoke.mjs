#!/usr/bin/env node
/**
 * Managing Miscellania M3 soft mid — product daily tick + resource collect.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-managing-m3-daily-smoke.mjs
 *
 * Soft entry (labeled):
 *   misc_quest 100, coffers 500k, mine workers 10, approval 96,
 *   misc_last_update far in the past (one+ day) so mapzone daily_update can run
 * Product under test:
 *   Tele 0_39_60 → ~manage_misc_daily_update writes coffers↓ restotal↑
 *   Talk Ghrim → How is the Kingdom faring? → Yes collect → cert_coal + restotal 0
 *
 * No IF / open manage still stub mes.
 *
 * @see docs/research/port-mg-managing-misc-289-to-377.md § M3
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
const { username, password } = resolveAccount(rest, 'managem3');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

/** Free L0 floor on island (mapzone 0_39_60) */
const ISLAND = { x: 2524, z: 3851, level: 0 };
/** Advisor Ghrim L1 throne stand */
const GHRIM = { x: 2499, z: 3857, level: 1 };

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[manage-m3] ${base} user=${username} (daily + collect; headed default)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`manage-m3_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    console.log('[manage-m3] soft Throne complete + kingdom economy seeds');
    await cheatQuiet(page, 'setvar misc_quest 100', 500);
    await cheatQuiet(page, 'setvar misc_coffers 500000', 500);
    await cheatQuiet(page, 'setvar misc_points_mine 10', 400);
    await cheatQuiet(page, 'setvar misc_points_wood 0', 300);
    await cheatQuiet(page, 'setvar misc_points_herb 0', 300);
    await cheatQuiet(page, 'setvar misc_points_fish 0', 300);
    await cheatQuiet(page, 'setvar misc_approval 96', 400);
    await cheatQuiet(page, 'setvar misc_restotal 0', 300);
    // Force last-update into the past so while-loop runs (≥1 day). Soft entry only.
    await cheatQuiet(page, 'setvar misc_last_update 1', 400);
    await waitTicks(page, 2);

    const c0 = await getServerVarQuiet(page, 'misc_coffers');
    const r0 = await getServerVarQuiet(page, 'misc_restotal');
    console.log(`[manage-m3] pre-daily coffers=${c0} restotal=${r0}`);
    if (Number(c0) !== 500000) {
      fail(`soft setvar misc_coffers 500000 failed (got ${c0})`);
    }

    console.log('[manage-m3] tele island for product daily_update', ISLAND);
    if (!(await teleTo(page, ISLAND, 2, 25_000))) fail('tele island failed');
    await waitSceneReady(page, 20_000);
    await waitTicks(page, 6);

    const c1 = await getServerVarQuiet(page, 'misc_coffers');
    const r1 = await getServerVarQuiet(page, 'misc_restotal');
    const v1 = await getServerVarQuiet(page, 'misc_last_update');
    console.log(`[manage-m3] post-daily coffers=${c1} restotal=${r1} misc_last_update=${v1}`);
    if (shot) await shot('post-daily');

    if (Number(c1) >= Number(c0)) {
      if (shot) await shot('fail-coffers');
      fail(`M3 FAIL: daily did not drain coffers (${c0} → ${c1})`);
    }
    if (Number(r1) <= 0) {
      if (shot) await shot('fail-restotal');
      fail(`M3 FAIL: daily did not accrue misc_restotal (got ${r1})`);
    }

    console.log('[manage-m3] tele Ghrim for product collect', GHRIM);
    if (!(await teleTo(page, GHRIM, 2, 25_000))) fail('tele Ghrim failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);

    // Talk → "How is the Kingdom faring?" → "Yes" (chooseOption / continueDialog thrash)
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
      let ok = !!a.talkNpc?.('Advisor Ghrim') || !!a.talkNpc?.('Ghrim');
      if (!ok) {
        const n = (r.npcs?.() ?? []).find(x => /ghrim|advisor/i.test(x?.name || ''));
        if (n) ok = !!a.talkNpc?.(n.name) || !!a.npcOp?.(n.index, 1);
      }
      await new Promise(res => setTimeout(res, 1000));
      const picks = [];
      const prefer = ['kingdom faring', 'faring', 'yes', 'yes, please'];
      for (let i = 0; i < 48; i++) {
        const opts = getOpts();
        if (opts.length) {
          if (typeof a.chooseOption === 'function') {
            a.chooseOption(prefer);
            picks.push(opts);
          } else {
            a.chatOption?.(opts[0]);
            picks.push(opts);
          }
        } else {
          a.continueDialog?.();
          a.dismissModalMessage?.();
        }
        await new Promise(res => setTimeout(res, 400));
        // restotal clear means collect ran
        // (read later from host)
      }
      const inv = (r.inventory?.() ?? []).map(i => ({
        name: i?.name,
        qty: i?.qty ?? i?.count
      }));
      return { ok, picks: picks.slice(0, 12), inv: inv.filter(x => x.name) };
    });
    console.log('[manage-m3] ghrim talk', JSON.stringify(talk).slice(0, 800));

    await waitTicks(page, 4);
    const r2 = await getServerVarQuiet(page, 'misc_restotal');
    const invCoal = await page.evaluate(() => {
      const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
      return inv
        .filter(i => /coal/i.test(String(i?.name || '')))
        .map(i => ({ name: i.name, qty: i.qty ?? i.count }));
    });
    console.log(`[manage-m3] post-collect restotal=${r2} coal=${JSON.stringify(invCoal)}`);

    if (Number(r2) !== 0) {
      if (shot) await shot('fail-collect-restotal');
      fail(`M3 FAIL: collect did not clear misc_restotal (got ${r2})`);
    }
    if (!invCoal.length) {
      if (shot) await shot('fail-no-coal');
      fail(`M3 FAIL: no coal (noted) after collect — resource_generation residual`);
    }

    if (shot) await shot('pass-collect');
    console.log(
      `RESULT PASS manage-m3 product daily coffers ${c0}→${c1} restotal ${r0}→${r1}→0 + coal collect`
    );
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
