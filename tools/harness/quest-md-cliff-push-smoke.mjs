#!/usr/bin/env node
/**
 * Mountain Daughter boulder Push refuse. No dest.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-md-cliff \
 *     node tools/harness/quest-md-cliff-push-smoke.mjs
 */
import {
  assertEnginePackHealth,
  boot,
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
const { username, password } = resolveAccount(rest, 'mdclf');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2764, z: 3666, level: 0 };

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[mdclf] ${base} user=${username} (boulder Push refuse)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`mdclf_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele boulder stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-ridge');

    const push = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const locs = r?.locs?.() ?? [];
      const loc = locs.find(
        l => (l.id | 0) === 5842 || /boulder/i.test(String(l?.name || ''))
      );
      const ok = !!(
        a?.opLocAt?.(2765, 3666, 'Push') ||
        a?.opLocAt?.(2765, 3666, '') ||
        (loc && a?.opLoc?.(loc.name || 'Boulder', 'Push', 10))
      );
      return { ok, loc: loc ? { id: loc.id, name: loc.name, x: loc.x, z: loc.z } : null };
    });
    console.log('[mdclf] push', JSON.stringify(push));
    await waitTicks(page, 6);
    if (shot) await shot('02-push');
    if (!push?.ok) fail(`Push failed ${JSON.stringify(push)}`);

    const chat = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.chat?.(16) ?? []).map(c => String(c?.text ?? c ?? ''))
    );
    const text = chat.join(' | ');
    console.log('[mdclf] chat', text);
    if (!/far too heavy|no point/i.test(text)) fail(`refuse missing: ${text}`);
    if (/tie the rope|climb down|teleport/i.test(text)) fail(`dest leaked: ${text}`);

    const stage = await getServerVarQuiet(page, 'mdaughter_quest_var');
    if (Number(stage) !== 0) fail(`Push wrote mdaughter_quest_var=${stage}`);
    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (!tile || Math.abs((tile.x | 0) - STAND.x) > 8 || Math.abs((tile.z | 0) - STAND.z) > 8) {
      fail(`left ridge ${JSON.stringify(tile)}`);
    }

    console.log(`RESULT PASS mdclf push-refuse stay ridge=${tile.x},${tile.z} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
