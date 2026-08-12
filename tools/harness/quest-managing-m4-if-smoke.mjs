#!/usr/bin/env node
/**
 * Managing Miscellania M4 — product open kingdom IF (misc_both_manage).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-managing-m4-if-smoke.mjs
 *
 * Soft entry: misc_quest 100, restotal 0 (no collect branch).
 * Product: Talk Ghrim → "How is the Kingdom faring?" → open IF (main modal 19159).
 *
 * Pack IDs 19159–19268 (289 10984 occupied on 377). See deviations.md.
 *
 * @see docs/plans/2026-08-12-m4-misc-both-manage-id-claim.md
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
const { username, password } = resolveAccount(rest, 'managem4');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const GHRIM = { x: 2499, z: 3857, level: 1 };
const IF_ROOT = 19159;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[manage-m4] ${base} user=${username} (open IF; headed default)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`manage-m4_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    await cheatQuiet(page, 'setvar misc_quest 100', 500);
    await cheatQuiet(page, 'setvar misc_restotal 0', 300);
    await waitTicks(page, 2);

    console.log('[manage-m4] tele Ghrim', GHRIM);
    if (!(await teleTo(page, GHRIM, 2, 25_000))) fail('tele Ghrim failed');
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
      let ok = !!a.talkNpc?.('Advisor Ghrim') || !!a.talkNpc?.('Ghrim');
      if (!ok) {
        const n = (r.npcs?.() ?? []).find(x => /ghrim|advisor/i.test(x?.name || ''));
        if (n) ok = !!a.talkNpc?.(n.name) || !!a.npcOp?.(n.index, 1);
      }
      await new Promise(res => setTimeout(res, 1000));
      const picks = [];
      for (let i = 0; i < 40; i++) {
        const opts = getOpts();
        if (opts.length) {
          a.chooseOption?.(['kingdom faring', 'faring']);
          picks.push(opts);
        } else {
          a.continueDialog?.();
          a.dismissModalMessage?.();
        }
        await new Promise(res => setTimeout(res, 380));
        const main = r.modals?.()?.main ?? -1;
        if (main === 19159) break;
      }
      const mods = r.modals?.() ?? {};
      return { ok, picks: picks.slice(0, 8), main: mods.main ?? -1, mods };
    });
    console.log('[manage-m4] ghrim', JSON.stringify(talk).slice(0, 700));

    const main = Number(talk?.main);
    if (main !== IF_ROOT) {
      if (shot) await shot('fail-no-if');
      fail(`M4 FAIL: expected main modal ${IF_ROOT} (misc_both_manage), got ${main}`);
    }

    if (shot) await shot('pass-if-open');
    console.log(`RESULT PASS manage-m4 product open misc_both_manage main=${main}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
