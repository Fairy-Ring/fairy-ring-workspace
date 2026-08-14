#!/usr/bin/env node
/**
 * BAR Dwarven lore first Read. Stay dwarfrock_quest 10. Never 110. No dest.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-bar-book \
 *     node tools/harness/quest-bar-book-read-smoke.mjs
 *
 * Soft dwarfrock_quest 10 + give dwarf_rock_book. Stand 3022,3451.
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
const { username, password } = resolveAccount(rest, 'barbk');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3022, z: 3451, level: 0 };

async function worldTile(page) {
  return page.evaluate(() => {
    const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
    return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[barbk] ${base} user=${username} (Dwarven lore Read)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`barbk_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar dwarfrock_quest 10', 400);
    await cheatQuiet(page, 'give dwarf_rock_book 1', 300);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-inv');

    const inv = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.inventory?.() ?? []).map(i => ({
        id: i.id | 0,
        name: String(i.name || '')
      }))
    );
    console.log('[barbk] inv', JSON.stringify(inv));
    if (!inv.some(i => (i.id | 0) === 4568 || /dwarven lore/i.test(i.name))) {
      fail(`no Dwarven lore ${JSON.stringify(inv)}`);
    }

    const read = await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a?.heldOp) return { error: 'no heldOp' };
      const ok =
        a.heldOp('Dwarven lore', 1) ||
        a.heldOp('dwarven lore', 1) ||
        a.useHeld?.('Dwarven lore');
      await new Promise(res => setTimeout(res, 800));
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => String(c?.text ?? c ?? '')) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(t));
      return { ok, noTrig: noTrig ?? null, chat };
    });
    console.log('[barbk] read', JSON.stringify(read));
    if (shot) await shot('02-read');
    if (!read?.ok) fail(`Read failed ${JSON.stringify(read)}`);
    if (read?.noTrig) fail(read.noTrig);
    const text = (read.chat || []).join(' | ');
    if (!/interesting read|enough info for dondakan/i.test(text)) fail(`after-read mes missing: ${text}`);
    if (/schematic|cannon|gold helmet|arzinian|alvis/i.test(text)) fail(`later leftover leaked: ${text}`);

    const tile = await worldTile(page);
    console.log('[barbk] tile', tile);
    if (Math.abs((tile.x | 0) - STAND.x) > 8 || Math.abs((tile.z | 0) - STAND.z) > 8) {
      fail(`dest invented ${JSON.stringify(tile)}`);
    }
    const stage = await getServerVarQuiet(page, 'dwarfrock_quest');
    if (Number(stage) !== 10) fail(`wrote dwarfrock_quest=${stage}`);
    if (Number(stage) === 110) fail('wrote 110');

    console.log(`RESULT PASS barbk lore Read stay 10 no dest user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
