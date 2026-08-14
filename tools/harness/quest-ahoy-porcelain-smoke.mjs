#!/usr/bin/env node
/**
 * Ghosts Ahoy porcelain: crone gives cup; pour bowl tea into it.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-ahoy-cup \
 *     node tools/harness/quest-ahoy-porcelain-smoke.mjs
 *
 * Soft ahoy_questvar 3. Stand 3461,3557. Stay 3. No milk / dest.
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
const { username, password } = resolveAccount(rest, 'ahcup');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3461, z: 3557, level: 0 };
const CRONE_ID = 1695;

async function invNames(page) {
  return page.evaluate(() =>
    (globalThis.__lc377?.reader?.inventory?.() ?? []).map(x => x?.name || x?.debugname)
  );
}

async function talkNpc(page, npcName, iters = 100) {
  return page.evaluate(
    async ([name, maxI]) => {
      const h = globalThis.__lc377;
      const a = h?.actions;
      const r = h?.reader;
      if (!a || !r) return { error: 'no abi' };
      const sleep = ms => new Promise(res => setTimeout(res, ms));
      const findNpc = () =>
        (r.npcs?.() ?? []).find(x =>
          String(x?.name ?? '')
            .toLowerCase()
            .includes(String(name).toLowerCase())
        );
      const n0 = findNpc();
      let ok = n0 ? !!a.npcOp?.(n0.index, 1) : !!a.talkNpc?.(name);
      await sleep(1600);
      if (!r.dialogOpen?.()) {
        const n = findNpc();
        if (n) ok = !!a.npcOp?.(n.index, 1) || ok;
        await sleep(1200);
      }
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
        if (!open && i > 70) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, bodies: bodies.slice(0, 24) };
    },
    [npcName, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[ahcup] ${base} user=${username} (porcelain cup)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`ahcup_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar ahoy_questvar 3', 400);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele crone stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    await giveItems(page, [['bowl_nettletea', 1]]);
    if (shot) await shot('01-crone');

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /old crone|crone/i.test(x?.name || ''));
      return { hit: hit ? { id: hit.id, name: hit.name } : null };
    }, CRONE_ID);
    console.log('[ahcup] npc', JSON.stringify(seen));
    if ((seen?.hit?.id | 0) !== CRONE_ID && !/crone/i.test(String(seen?.hit?.name || ''))) {
      fail(`crone missing ${JSON.stringify(seen)}`);
    }

    const talk = await talkNpc(page, 'Old crone', 80);
    console.log('[ahcup] talk', JSON.stringify(talk));
    if (shot) await shot('02-cup');
    if (!talk?.ok) fail(`Talk-to failed ${JSON.stringify(talk)}`);
    if (talk?.noTrig) fail(talk.noTrig);
    const text = (talk.bodies || []).join(' | ');
    if (!/special cup/i.test(text)) fail(`special cup missing: ${text}`);
    let inv = await invNames(page);
    console.log('[ahcup] after give', inv);
    if (!inv.some(n => /porcelain cup/i.test(String(n || '')))) {
      fail(`chinacup_empty missing ${JSON.stringify(inv)}`);
    }

    const pour = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const inv = r?.inventory?.() ?? [];
      const tea = inv.find(i => /nettle tea/i.test(String(i?.name || i?.debugname || '')));
      const cup = inv.find(i => /porcelain cup/i.test(String(i?.name || i?.debugname || '')));
      if (!tea || !cup || !a?.useHeldOnHeld) {
        return { ok: false, err: 'no items/abi', inv: inv.map(i => i?.name) };
      }
      const ok = !!(a.useHeldOnHeld(tea, cup) || a.useHeldOnHeld(cup, tea));
      return { ok, t: tea.name, c: cup.name };
    });
    console.log('[ahcup] pour', JSON.stringify(pour));
    if (!pour?.ok) fail(`pour failed ${JSON.stringify(pour)}`);
    await waitTicks(page, 6);
    if (shot) await shot('03-pour');
    inv = await invNames(page);
    console.log('[ahcup] after pour', inv);
    if (!inv.some(n => /^cup of tea$/i.test(String(n || '')) || /nettle tea in a porcelain/i.test(String(n || '')))) {
      if (!inv.some(n => /cup of tea/i.test(String(n || '')))) fail(`chinacup_of_nettletea missing ${JSON.stringify(inv)}`);
    }
    const stage = await getServerVarQuiet(page, 'ahoy_questvar');
    if (Number(stage) !== 3) fail(`wrote ahoy_questvar=${stage}`);

    console.log(`RESULT PASS ahcup porcelain stay 3 user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
