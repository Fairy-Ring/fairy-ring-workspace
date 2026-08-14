#!/usr/bin/env node
/**
 * RfD feast door Open refuse. Dest UNKNOWN. No portal 4.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-rfd-door \
 *     node tools/harness/quest-rfd-feast-door-smoke.mjs
 *
 * Soft hundred_main_quest_var 1. Stand 3207,3216 S of 3207,3217.
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
const { username, password } = resolveAccount(rest, 'rfddr');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3207, z: 3216, level: 0 };

async function worldTile(page) {
  return page.evaluate(() => {
    const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
    return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[rfddr] ${base} user=${username} (RfD feast door)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`rfddr_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar hundred_main_quest_var 1', 400);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele kitchen door failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-door');

    const open = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const loc = typeof r?.locAt === 'function' ? r.locAt(3207, 3217) : null;
      const ok = loc
        ? !!a?.opLocAt?.(3207, 3217, 'Open') || !!a?.opLocAt?.(3207, 3217, '')
        : !!a?.opLocAt?.(3207, 3217, 'Open');
      return { ok, loc: loc ? { id: loc.id, name: loc.name } : null };
    });
    console.log('[rfddr] open', JSON.stringify(open));
    await waitTicks(page, 6);
    if (shot) await shot('02-open');
    if (!open?.ok) fail(`Open failed ${JSON.stringify(open)}`);

    const chat = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.chat?.(16) ?? []).map(c => String(c?.text ?? c ?? ''))
    );
    const text = chat.join(' | ');
    console.log('[rfddr] chat', text);
    if (/culinaromancer|banquet|inspect|portal/i.test(text)) fail(`feast leaked: ${text}`);

    const tile = await worldTile(page);
    console.log('[rfddr] tile', tile);
    if (Math.abs((tile.x | 0) - 1861) < 20 && Math.abs((tile.z | 0) - 5316) < 20) {
      fail(`dest invented to feast ${JSON.stringify(tile)}`);
    }
    if (Math.abs((tile.x | 0) - STAND.x) > 8 || Math.abs((tile.z | 0) - STAND.z) > 8) {
      fail(`left kitchen ${JSON.stringify(tile)}`);
    }
    const stage = await getServerVarQuiet(page, 'hundred_main_quest_var');
    if (Number(stage) !== 1) fail(`wrote hundred_main_quest_var=${stage}`);
    if (Number(stage) === 4) fail('wrote portal 4');

    console.log(`RESULT PASS rfddr feast door refuse stay kitchen user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
