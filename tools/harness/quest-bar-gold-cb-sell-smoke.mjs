#!/usr/bin/env node
/**
 * BAR gold CB Use-on sell path. Stay 10. Never 110. No dest / Fire.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-bar-cbsell \
 *     node tools/harness/quest-bar-gold-cb-sell-smoke.mjs
 *
 * Soft quest 10 + give 4579. Stand 2824,10167.
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
const { username, password } = resolveAccount(rest, 'barcs');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2824, z: 10167, level: 0 };
const DON_ID = 1837;
const CB_ID = 4579;

async function worldTile(page) {
  return page.evaluate(() => {
    const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
    return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[barcs] ${base} user=${username} (gold CB sell)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`barcs_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar dwarfrock_quest 10', 400);
    await cheatQuiet(page, 'give dwarf_rock_cannonball_gold 1', 300);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Dondakan stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-rock');

    const use = await page.evaluate(id => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const inv = r?.inventory?.() ?? [];
      const cb = inv.find(i => (i.id | 0) === 4579 || /cannon ball/i.test(String(i?.name ?? '')));
      const npc = (r?.npcs?.() ?? []).find(x => (x.id | 0) === id || /dondakan/i.test(x?.name || ''));
      if (!cb || !a?.useHeldOnNpc) return { ok: false, err: 'no cb/abi' };
      if (!npc || npc.index == null) return { ok: false, err: 'no npc' };
      const snap = { id: cb.id, slot: cb.slot, comId: cb.comId };
      return { ok: !!a.useHeldOnNpc(snap, npc.index), item: cb.name, npc: npc.name };
    }, DON_ID);
    console.log('[barcs] use', JSON.stringify(use));
    if (!use?.ok) fail(`use CB failed ${JSON.stringify(use)}`);
    await waitTicks(page, 3);

    const talk = await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const sleep = ms => new Promise(res => setTimeout(res, ms));
      const bodies = [];
      const picks = [];
      for (let i = 0; i < 80; i++) {
        const body = r.chatBodyText?.() || '';
        if (body && (bodies.length === 0 || bodies[bodies.length - 1] !== body)) {
          bodies.push(body.slice(0, 240));
        }
        const raw = r.chatOptions?.() ?? [];
        if (raw.length) {
          const j = raw.findIndex(o => /sell|profit/i.test(String(o?.text ?? o ?? '')));
          const pick = raw[j >= 0 ? j : 0];
          const comId = pick?.comId | 0;
          const okPick = comId ? !!a.ifButton?.(comId) : false;
          picks.push(okPick ? `ok:${pick?.text}` : `fail:${pick?.text}`);
          await sleep(800);
          continue;
        }
        a.continueDialog?.();
        await sleep(400);
        const open = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
        if (!open && bodies.length && i > 8) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => String(c?.text ?? '')) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { noTrig: noTrig ?? null, picks, bodies: bodies.slice(0, 24) };
    });
    console.log('[barcs] talk', JSON.stringify(talk));
    if (shot) await shot('02-sell');
    if (talk?.noTrig) fail(talk.noTrig);
    const text = (talk.bodies || []).join(' | ');
    if (!/amazing looking cannonball|no one will buy|not much use as a projectile/i.test(text)) {
      fail(`sell path missing: ${text}`);
    }
    if (/cannon fires|did you see that|schematic|gold helmet|arzinian/i.test(text)) {
      fail(`Fire leaked: ${text}`);
    }

    const inv = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.inventory?.() ?? []).map(i => ({ id: i.id | 0, name: String(i.name || '') }))
    );
    if (!inv.some(i => (i.id | 0) === CB_ID)) fail(`CB consumed ${JSON.stringify(inv)}`);

    const tile = await worldTile(page);
    if (Math.abs((tile.x | 0) - STAND.x) > 8 || Math.abs((tile.z | 0) - STAND.z) > 8) {
      fail(`dest invented ${JSON.stringify(tile)}`);
    }
    const stage = await getServerVarQuiet(page, 'dwarfrock_quest');
    if (Number(stage) !== 10) fail(`wrote dwarfrock_quest=${stage}`);
    const fired = await getServerVarQuiet(page, 'dwarfrock_fired_gold_cannonball');
    if (Number(fired) === 1) fail('wrote fired bit 30');

    console.log(`RESULT PASS barcs gold CB sell stay 10 no dest user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
