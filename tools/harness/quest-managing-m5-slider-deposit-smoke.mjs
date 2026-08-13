#!/usr/bin/env node
/**
 * Managing M5 — product labour slider + coffer deposit (IF already M4).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-managing-m5-slider-deposit-smoke.mjs
 *
 * Soft: misc_quest 100, coffers 0, points 0, give coins 50k.
 * Product: open IF → ifButton mine+ (com_11=10996) → deposit (com_88=11073) + count 10000.
 *
 * @see vendor/content/.../managing_miscellania_ui.rs2
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
const { username, password } = resolveAccount(rest, 'managem5');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const GHRIM = { x: 2499, z: 3857, level: 1 };
const IF_ROOT = 10984;
const COM_MINE_UP = 10996; // misc_both_manage:com_11
const COM_DEPOSIT = 11073; // misc_both_manage:com_88

async function openKingdomIf(page) {
  return page.evaluate(async () => {
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
    for (let i = 0; i < 40; i++) {
      const opts = getOpts();
      if (opts.length) {
        a.chooseOption?.(['kingdom faring', 'faring']);
      } else {
        a.continueDialog?.();
        a.dismissModalMessage?.();
      }
      await new Promise(res => setTimeout(res, 380));
      const main = r.modals?.()?.main ?? -1;
      if (main === 10984) break;
    }
    const mods = r.modals?.() ?? {};
    return { ok, main: mods.main ?? -1 };
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[manage-m5] ${base} user=${username} (slider+deposit; headed default)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`manage-m5_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    await cheatQuiet(page, 'setvar misc_quest 100', 400);
    await cheatQuiet(page, 'setvar misc_coffers 0', 300);
    await cheatQuiet(page, 'setvar misc_points_mine 0', 200);
    await cheatQuiet(page, 'setvar misc_points_wood 0', 200);
    await cheatQuiet(page, 'setvar misc_points_herb 0', 200);
    await cheatQuiet(page, 'setvar misc_points_fish 0', 200);
    await cheatQuiet(page, 'setvar misc_restotal 0', 200);
    await giveItems(page, [['coins', 50000]]);
    await waitTicks(page, 2);

    if (!(await teleTo(page, GHRIM, 2, 25_000))) fail('tele Ghrim failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);

    const opened = await openKingdomIf(page);
    console.log('[manage-m5] open IF', opened);
    if (Number(opened?.main) !== IF_ROOT) {
      if (shot) await shot('fail-no-if');
      fail(`M5 FAIL: IF not open main=${opened?.main} want ${IF_ROOT}`);
    }
    if (shot) await shot('if-open');

    // Do not ::getvar while the IF is open — misc_points_* are varbits on
    // protect basevar misc_varbit_3; authentic getvar closeModal's the UI.
    const mine0 = 0;
    console.log(`[manage-m5] mine before click ${mine0} (setvar; no getvar while IF open)`);
    for (let i = 0; i < 3; i++) {
      const click = await page.evaluate(id => {
        const a = globalThis.__lc377?.actions;
        const r = globalThis.__lc377?.reader;
        const main = r?.modals?.()?.main ?? -1;
        return { ok: !!a?.ifButton?.(id), main };
      }, COM_MINE_UP);
      console.log(`[manage-m5] mine+ click ${i + 1}`, click);
      if (Number(click?.main) !== IF_ROOT) {
        if (shot) await shot('fail-if-closed-mid-slider');
        fail(`M5 slider FAIL: IF closed before click ${i + 1} main=${click?.main}`);
      }
      await waitTicks(page, 3);
    }
    if (shot) await shot('after-slider');

    const mine1 = Number(await getServerVarQuiet(page, 'misc_points_mine'));
    console.log(`[manage-m5] mine after +3 clicks ${mine1} (getvar closes IF)`);
    if (!(mine1 >= mine0 + 3)) {
      fail(`M5 slider FAIL: misc_points_mine ${mine0}→${mine1} want +3`);
    }

    const reopened = await openKingdomIf(page);
    console.log('[manage-m5] reopen IF for deposit', reopened);
    if (Number(reopened?.main) !== IF_ROOT) {
      if (shot) await shot('fail-no-if-reopen');
      fail(`M5 FAIL: IF not reopened main=${reopened?.main} want ${IF_ROOT}`);
    }

    const coff0 = 0;
    await page.evaluate(id => globalThis.__lc377?.actions?.ifButton?.(id), COM_DEPOSIT);
    await waitTicks(page, 3);
    const sent = await page.evaluate(n => {
      const a = globalThis.__lc377?.actions;
      if (typeof a?.resumeCountDialog !== 'function') return { error: 'no resumeCountDialog' };
      return { ok: !!a.resumeCountDialog(n) };
    }, 10000);
    console.log('[manage-m5] deposit resume', sent);
    await waitTicks(page, 6);
    await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      a?.continueDialog?.();
      a?.dismissModalMessage?.();
    });
    const coff1 = Number(await getServerVarQuiet(page, 'misc_coffers'));
    console.log(`[manage-m5] coffers ${coff0}→${coff1}`);
    if (shot) await shot('after-deposit');
    if (!(coff1 >= coff0 + 10000)) {
      fail(`M5 deposit FAIL: misc_coffers ${coff0}→${coff1} want +10000`);
    }

    console.log(
      `RESULT PASS manage-m5 slider mine=${mine1} deposit coffers=${coff1} (SOFT quest 100 + coins)`
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
