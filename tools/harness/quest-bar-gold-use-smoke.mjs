#!/usr/bin/env node
/**
 * BAR gold ore Use-on Dondakan. Stay dwarfrock_quest 10. Never 110. No dest.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-bar-gold \
 *     node tools/harness/quest-bar-gold-use-smoke.mjs
 *
 * Soft dwarfrock_quest 10 + give book + gold_ore. Stand 2824,10167.
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
const { username, password } = resolveAccount(rest, 'bargd');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2824, z: 10167, level: 0 };
const DON_ID = 1837;

async function drainDialog(page, iters = 80) {
  return page.evaluate(async maxI => {
    const h = globalThis.__lc377;
    const a = h?.actions;
    const r = h?.reader;
    if (!a || !r) return { error: 'no abi' };
    const sleep = ms => new Promise(res => setTimeout(res, ms));
    const bodies = [];
    let lastContinuedBody = '';
    for (let i = 0; i < maxI; i++) {
      const body = r.chatBodyText?.() || '';
      if (body && (bodies.length === 0 || bodies[bodies.length - 1] !== body)) {
        bodies.push(body.slice(0, 240));
      }
      if (body && body === lastContinuedBody) {
        await sleep(300);
        const openWait = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
        if (!openWait && i > 16) break;
        continue;
      }
      a.continueDialog?.();
      lastContinuedBody = body;
      await sleep(450);
      const open = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
      if (!open && bodies.length) break;
      if (!open && i > 60) break;
    }
    const chat = typeof r.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
    const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
    return { noTrig: noTrig ?? null, bodies: bodies.slice(0, 24), chat };
  }, iters);
}

async function worldTile(page) {
  return page.evaluate(() => {
    const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
    return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[bargd] ${base} user=${username} (gold Use-on Dondakan)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`bargd_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar dwarfrock_quest 10', 400);
    await cheatQuiet(page, 'give dwarf_rock_book 1', 300);
    await cheatQuiet(page, 'give gold_ore 1', 300);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Dondakan stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-rock');

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /dondakan/i.test(x?.name || ''));
      return { hit: hit ? { id: hit.id, name: hit.name } : null };
    }, DON_ID);
    console.log('[bargd] npc', JSON.stringify(seen));
    if ((seen?.hit?.id | 0) !== DON_ID) fail(`Dondakan 1837 missing ${JSON.stringify(seen)}`);

    const use = await page.evaluate(id => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const inv = r?.inventory?.() ?? [];
      const ore = inv.find(i => (i.id | 0) === 444 || /^gold ore$/i.test(String(i?.name ?? '')));
      const npc = (r?.npcs?.() ?? []).find(x => (x.id | 0) === id || /dondakan/i.test(x?.name || ''));
      if (!ore || !a?.useHeldOnNpc) return { ok: false, err: 'no ore/abi', names: inv.map(i => i?.name) };
      if (!npc || npc.index == null) return { ok: false, err: 'no npc', npc };
      const snap = { id: ore.id, slot: ore.slot, comId: ore.comId };
      const ok =
        !!a.useHeldOnNpc(snap, npc.index) ||
        !!a.useHeldOnNpc(snap, 'Dondakan the Dwarf') ||
        !!a.useHeldOnNpc(snap, 'Dondakan');
      return { ok, item: ore.name, npc: { id: npc.id, index: npc.index, name: npc.name } };
    }, DON_ID);
    console.log('[bargd] use', JSON.stringify(use));
    if (!use?.ok) fail(`use gold ore failed ${JSON.stringify(use)}`);
    await waitTicks(page, 4);
    const talk = await drainDialog(page, 80);
    console.log('[bargd] talk', JSON.stringify(talk));
    if (shot) await shot('02-use');
    if (talk?.noTrig) fail(talk.noTrig);
    const text = [...(talk.bodies || []), ...(talk.chat || [])].join(' | ');
    if (!/golden cannonball|pointless waste|gold inside the rock/i.test(text)) {
      fail(`gold show missing: ${text}`);
    }
    if (/schematic|gold helmet|arzinian|fire you|librarian/i.test(text)) fail(`later leftover leaked: ${text}`);

    const inv = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.inventory?.() ?? []).map(i => ({
        id: i.id | 0,
        name: String(i.name || '')
      }))
    );
    if (!inv.some(i => (i.id | 0) === 444 || /^gold ore$/i.test(i.name))) {
      fail(`gold ore consumed ${JSON.stringify(inv)}`);
    }
    if (inv.some(i => (i.id | 0) === 4579 || /cannon ball/i.test(i.name))) {
      fail(`gold CB invented ${JSON.stringify(inv)}`);
    }

    const tile = await worldTile(page);
    console.log('[bargd] tile', tile);
    if (Math.abs((tile.x | 0) - STAND.x) > 8 || Math.abs((tile.z | 0) - STAND.z) > 8) {
      fail(`dest invented ${JSON.stringify(tile)}`);
    }
    const stage = await getServerVarQuiet(page, 'dwarfrock_quest');
    if (Number(stage) !== 10) fail(`wrote dwarfrock_quest=${stage}`);
    if (Number(stage) === 110) fail('wrote 110');

    console.log(`RESULT PASS bargd gold Use-on stay 10 no dest user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
