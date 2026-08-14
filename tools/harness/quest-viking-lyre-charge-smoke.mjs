#!/usr/bin/env node
/**
 * Viking post-complete lyre charges (1 Aug 2005): shark → lyre(2).
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-vik-lyre \
 *     node tools/harness/quest-viking-lyre-charge-smoke.mjs
 *
 * Soft viking=10 + strung lyre + shark on Fossegrimen altar.
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
const { username, password } = resolveAccount(rest, 'vklyr');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2625, z: 3598, level: 0 };
const ALTAR = { x: 2626, z: 3598 };

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[vklyr] ${base} user=${username} (shark → lyre 2)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`vklyr_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar viking 10', 400);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele altar stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    await giveItems(page, [
      ['viking_strung_lyre', 1],
      ['raw_shark', 1]
    ]);
    if (shot) await shot('01-altar');

    const use = await page.evaluate(([ax, az]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const inv = r?.inventory?.() ?? [];
      const shark = inv.find(i => /shark/i.test(String(i?.name || i?.debugname || '')));
      const locs = r?.locs?.() ?? [];
      const loc = locs.find(
        l =>
          (l.id | 0) === 4141 ||
          /strange altar|fossegrimen|shrine/i.test(String(l?.name || ''))
      );
      if (!shark || !a?.useHeldOnLoc) {
        return { ok: false, err: 'no shark/abi', inv: inv.map(i => i?.name) };
      }
      const ok = loc
        ? !!a.useHeldOnLoc(shark, loc, 16)
        : !!a.useHeldOnLoc(shark, { x: ax, z: az }, 16);
      return { ok, loc: loc ? { id: loc.id, name: loc.name } : null };
    }, [ALTAR.x, ALTAR.z]);
    console.log('[vklyr] use', JSON.stringify(use));
    if (!use?.ok) fail(`use shark failed ${JSON.stringify(use)}`);
    await waitTicks(page, 10);
    if (shot) await shot('02-offer');

    const inv = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.inventory?.() ?? []).map(x => x?.name || x?.debugname)
    );
    console.log('[vklyr] inv', inv);
    if (!inv.some(n => /lyre\(2\)|lyre \(2\)/i.test(String(n || '')))) {
      fail(`lyre(2) missing ${JSON.stringify(inv)}`);
    }
    if (inv.some(n => /lyre\(1\)|enchanted lyre$/i.test(String(n || '')) && !/\(2\)/.test(String(inv)))) {
      /* allow (2) only */
    }

    console.log(`RESULT PASS vklyr shark=lyre(2) user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
