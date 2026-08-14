#!/usr/bin/env node
/**
 * BAR furnace gold CB. Stay dwarfrock_quest 10. Never 110. No dest / Fire.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-bar-goldcb \
 *     node tools/harness/quest-bar-gold-cb-smoke.mjs
 *
 * Soft quest 10 + bit 9 + gold_bar + ammo_mould + smithing 35.
 * Stand 3275,3186 E of Al-Kharid furnace 3272,3185.
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
const { username, password } = resolveAccount(rest, 'bargcb');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3275, z: 3186, level: 0 };
const CB_ID = 4579;

async function worldTile(page) {
  return page.evaluate(() => {
    const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
    return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[bargcb] ${base} user=${username} (furnace gold CB)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`bargcb_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar dwarfrock_quest 10', 400);
    await cheatQuiet(page, 'setvar dwarfrock_gold_cannonball 1', 300);
    await cheatQuiet(page, 'setstat smithing 35', 200);
    await cheatQuiet(page, 'give gold_bar 1', 300);
    await cheatQuiet(page, 'give ammo_mould 1', 300);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele furnace stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-furnace');

    const use = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const inv = r?.inventory?.() ?? [];
      const bar = inv.find(i => (i.id | 0) === 2357 || /^gold bar$/i.test(String(i?.name ?? '')));
      if (!bar || !a?.useHeldOnLoc) return { ok: false, err: 'no bar/abi', names: inv.map(i => i?.name) };
      const snap = { id: bar.id, slot: bar.slot, comId: bar.comId };
      const loc = typeof r?.locAt === 'function' ? r.locAt(3272, 3185) : null;
      const ok = loc
        ? !!a.useHeldOnLoc(snap, loc) || !!a.useHeldOnLoc('Gold bar', loc)
        : !!a.useHeldOnLoc(snap, 'Furnace', 16);
      return {
        ok,
        item: bar.name,
        loc: loc ? { id: loc.id, name: loc.name, typecode: loc.typecode, lx: loc.lx, lz: loc.lz } : null
      };
    });
    console.log('[bargcb] use', JSON.stringify(use));
    if (!use?.ok) fail(`use gold bar failed ${JSON.stringify(use)}`);
    await waitTicks(page, 3);

    const pick = await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const sleep = ms => new Promise(res => setTimeout(res, ms));
      const picks = [];
      for (let i = 0; i < 40; i++) {
        const raw = r.chatOptions?.() ?? [];
        if (raw.length) {
          const j = raw.findIndex(o => /^yes\b/i.test(String(o?.text ?? o ?? '')));
          const comId = raw[j >= 0 ? j : 0]?.comId | 0;
          const label = raw[j >= 0 ? j : 0]?.text ?? '';
          const okPick = comId ? !!a.ifButton?.(comId) : false;
          picks.push(okPick ? `ok:${label}` : `fail:${label}`);
          await sleep(800);
          continue;
        }
        a.continueDialog?.();
        await sleep(350);
        const open = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
        if (!open && i > 8 && picks.length) break;
      }
      return { picks };
    });
    console.log('[bargcb] pick', JSON.stringify(pick));
    await waitTicks(page, 8);
    if (shot) await shot('02-make');

    const chat = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.chat?.(16) ?? []).map(c => String(c?.text ?? c ?? ''))
    );
    const text = chat.join(' | ');
    console.log('[bargcb] chat', text);
    if (!/golden cannonball|heat the gold bar/i.test(text)) fail(`make mes missing: ${text}`);
    if (/fire you|schematic|gold helmet|arzinian/i.test(text)) fail(`later leftover leaked: ${text}`);

    const inv = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.inventory?.() ?? []).map(i => ({
        id: i.id | 0,
        name: String(i.name || '')
      }))
    );
    console.log('[bargcb] inv', JSON.stringify(inv));
    if (!inv.some(i => (i.id | 0) === CB_ID || /cannon ball/i.test(i.name))) {
      fail(`gold CB 4579 missing ${JSON.stringify(inv)}`);
    }
    if (inv.some(i => (i.id | 0) === 2 && /cannonball/i.test(i.name))) {
      fail(`steel mcannonball leaked ${JSON.stringify(inv)}`);
    }

    const tile = await worldTile(page);
    console.log('[bargcb] tile', tile);
    if (Math.abs((tile.x | 0) - STAND.x) > 10 || Math.abs((tile.z | 0) - STAND.z) > 10) {
      fail(`dest invented ${JSON.stringify(tile)}`);
    }
    const stage = await getServerVarQuiet(page, 'dwarfrock_quest');
    if (Number(stage) !== 10) fail(`wrote dwarfrock_quest=${stage}`);
    if (Number(stage) === 110) fail('wrote 110');
    const fired = await getServerVarQuiet(page, 'dwarfrock_fired_gold_cannonball');
    if (Number(fired) === 1) fail('wrote fired bit 30');

    console.log(`RESULT PASS bargcb furnace gold CB stay 10 no dest user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
