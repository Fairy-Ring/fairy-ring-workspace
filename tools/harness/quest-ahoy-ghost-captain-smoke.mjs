#!/usr/bin/env node
/**
 * Ghosts Ahoy Ghost captain_1 Talk-to. Woo then 25-token ask. No dest.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-ahoy-captain \
 *     node tools/harness/quest-ahoy-ghost-captain-smoke.mjs
 *
 * Soft ahoy_questvar 3. Stand 3702,3487 W of 3703,3487.
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
const { username, password } = resolveAccount(rest, 'ahcap');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3702, z: 3487, level: 0 };
const CAP_ID = 1704;

async function talkNpc(page, npcName, iters = 80) {
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
        if (!open && i > 60) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, bodies: bodies.slice(0, 20) };
    },
    [npcName, iters]
  );
}

async function worldTile(page) {
  return page.evaluate(() => {
    const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
    return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[ahcap] ${base} user=${username} (Ghost captain Talk-to)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`ahcap_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar ahoy_questvar 3', 400);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele captain stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-captain');

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /ghost captain/i.test(x?.name || ''));
      return { hit: hit ? { id: hit.id, name: hit.name } : null };
    }, CAP_ID);
    console.log('[ahcap] npc', JSON.stringify(seen));
    if ((seen?.hit?.id | 0) !== CAP_ID && !/ghost captain/i.test(String(seen?.hit?.name || ''))) {
      fail(`captain 1704 missing ${JSON.stringify(seen)}`);
    }

    const woo = await talkNpc(page, 'Ghost Captain', 60);
    console.log('[ahcap] woo', JSON.stringify(woo));
    if (shot) await shot('02-woo');
    if (!woo?.ok) fail(`Woo Talk-to failed ${JSON.stringify(woo)}`);
    if (woo?.noTrig) fail(woo.noTrig);
    const wooText = (woo.bodies || []).join(' | ');
    if (!/wooo/i.test(wooText)) fail(`Woo missing: ${wooText}`);

    await giveItems(page, [['amulet_of_ghostspeak', 1]]);
    const worn = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      return {
        ok: !!(
          a?.equip?.('Ghostspeak amulet') ||
          a?.equip?.('ghostspeak amulet') ||
          a?.heldOp?.('Ghostspeak amulet', 2) ||
          a?.heldOp?.('ghostspeak amulet', 2)
        )
      };
    });
    console.log('[ahcap] wear', JSON.stringify(worn));
    await waitTicks(page, 4);

    const ask = await talkNpc(page, 'Ghost Captain', 80);
    console.log('[ahcap] ask', JSON.stringify(ask));
    if (shot) await shot('03-ask');
    if (!ask?.ok) fail(`ghostspeak Talk-to failed ${JSON.stringify(ask)}`);
    if (ask?.noTrig) fail(ask.noTrig);
    const askText = (ask.bodies || []).join(' | ');
    if (!/25/i.test(askText) || !/dragontooth/i.test(askText)) {
      fail(`25-token Dragontooth ask missing: ${askText}`);
    }

    const tile = await worldTile(page);
    console.log('[ahcap] tile', tile);
    if (Math.abs((tile.x | 0) - 3702) > 6 || Math.abs((tile.z | 0) - 3487) > 6) {
      fail(`dest invented ${JSON.stringify(tile)}`);
    }
    const stage = await getServerVarQuiet(page, 'ahoy_questvar');
    if (Number(stage) !== 3) fail(`wrote ahoy_questvar=${stage}`);

    console.log(`RESULT PASS ahcap captain Talk-to no dest user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
