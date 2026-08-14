#!/usr/bin/env node
/**
 * Viking post-complete turtle → Enchanted lyre(3) (1 Aug 2005).
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-vik-turtle \
 *     node tools/harness/quest-viking-lyre-turtle-smoke.mjs
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
const { username, password } = resolveAccount(rest, 'vkturt');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2625, z: 3598, level: 0 };

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[vkturt] ${base} user=${username} (turtle → lyre 3)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`vkturt_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar viking 10', 400);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele altar failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    await giveItems(page, [
      ['viking_strung_lyre', 1],
      ['raw_seaturtle', 1]
    ]);
    if (shot) await shot('01-altar');

    const use = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const inv = r?.inventory?.() ?? [];
      const fish = inv.find(i => /turtle|sea turtle/i.test(String(i?.name || i?.debugname || '')));
      const locs = r?.locs?.() ?? [];
      const loc = locs.find(l => (l.id | 0) === 4141 || /strange altar/i.test(String(l?.name || '')));
      if (!fish || !a?.useHeldOnLoc) return { ok: false, err: 'no fish/abi', inv: inv.map(i => i?.name) };
      const ok = loc ? !!a.useHeldOnLoc(fish, loc, 16) : false;
      return { ok, loc: loc ? { id: loc.id, name: loc.name } : null };
    });
    console.log('[vkturt] use', JSON.stringify(use));
    if (!use?.ok) fail(`use turtle failed ${JSON.stringify(use)}`);
    await waitTicks(page, 10);
    if (shot) await shot('02-offer');
    const inv = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.inventory?.() ?? []).map(x => x?.name || x?.debugname)
    );
    console.log('[vkturt] inv', inv);
    if (!inv.some(n => /lyre\(3\)/i.test(String(n || '')))) fail(`lyre(3) missing ${JSON.stringify(inv)}`);

    console.log(`RESULT PASS vkturt turtle=lyre(3) user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
