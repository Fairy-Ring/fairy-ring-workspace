#!/usr/bin/env node
/**
 * Ghosts Ahoy Necrovarus refuse (after licensed Velorina).
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-ahoy-necro \
 *     node tools/harness/quest-ahoy-necrovarus-smoke.mjs
 *
 * Product: Woo stay 1 · first Talk-to incinerate 1→2 · re-talk head nag stay 2.
 * Soft setvar ahoy_questvar 1. No dest / ectophial / Velorina return / crone.
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
const { username, password } = resolveAccount(rest, 'ahnec');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3660, z: 3515, level: 0 };
const NEC_ID = 1684;

async function talkNpc(page, npcName, prefer = [], iters = 80) {
  return page.evaluate(
    async ([name, pref, maxI]) => {
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
      const picks = [];
      const bodies = [];
      let lastPickAt = -99;
      let lastContinuedBody = '';
      for (let i = 0; i < maxI; i++) {
        const body = r.chatBodyText?.() || '';
        if (body && (bodies.length === 0 || bodies[bodies.length - 1] !== body)) {
          bodies.push(body.slice(0, 240));
        }
        const raw = r.chatOptions?.() ?? [];
        if (raw.length) {
          let pick = 0;
          for (const p of pref) {
            const w = String(p).toLowerCase();
            const j = raw.findIndex(o => {
              const t = String(o?.text ?? o ?? '').toLowerCase();
              return t.includes(w);
            });
            if (j >= 0) {
              pick = j;
              break;
            }
          }
          const comId = raw[pick]?.comId | 0;
          const label = raw[pick]?.text ?? '';
          const okPick = comId ? !!a.ifButton?.(comId) : false;
          picks.push(okPick ? `ok:${label}` : `fail:${label}`);
          lastPickAt = i;
          lastContinuedBody = '';
          await sleep(800);
          continue;
        }
        if (body && body === lastContinuedBody) {
          await sleep(300);
          const openWait = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
          if (!openWait && i > lastPickAt + 16) break;
          continue;
        }
        a.continueDialog?.();
        lastContinuedBody = body;
        await sleep(450);
        const open = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
        if (!open && i > lastPickAt + 16 && (picks.length || bodies.length)) break;
        if (!open && i > 80) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 12), bodies: bodies.slice(0, 28) };
    },
    [npcName, prefer, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[ahnec] ${base} user=${username} (Necrovarus 1684)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`ahnec_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setstat hitpoints 90', 300);
    await cheatQuiet(page, 'setvar ahoy_questvar 1', 400);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Necrovarus stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /necrovarus/i.test(x?.name || ''));
      return {
        hit: hit ? { id: hit.id, name: hit.name } : null,
        names: npcs.map(x => `${x?.name}:${x?.id}`).slice(0, 10)
      };
    }, NEC_ID);
    console.log('[ahnec] npc', JSON.stringify(seen));
    if (shot) await shot('01-necro');
    if ((seen?.hit?.id | 0) !== NEC_ID && !/necrovarus/i.test(String(seen?.hit?.name || ''))) {
      fail(`Necrovarus 1684 not next to stand: ${JSON.stringify(seen)}`);
    }

    const woo = await talkNpc(page, 'Necrovarus', [], 40);
    console.log('[ahnec] woo', JSON.stringify(woo));
    if (shot) await shot('02-woo');
    if (!woo?.ok) fail(`Woo Talk-to failed ${JSON.stringify(woo)}`);
    const wooText = (woo.bodies || []).join(' | ');
    if (!/woooo/i.test(wooText)) fail(`ghostspeak-fail missing: ${wooText}`);
    const afterWoo = await getServerVarQuiet(page, 'ahoy_questvar');
    if (Number(afterWoo) !== 1) fail(`Woo wrote ahoy_questvar=${afterWoo}`);

    await giveItems(page, [['amulet_of_ghostspeak', 1]]);
    const worn = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      return {
        ok: !!(
          a?.equip?.('Ghostspeak amulet') ||
          a?.equip?.('ghostspeak') ||
          a?.heldOp?.('Ghostspeak amulet', 2) ||
          a?.heldOp?.('ghostspeak', 2)
        )
      };
    });
    console.log('[ahnec] wear', JSON.stringify(worn));
    await waitTicks(page, 4);

    const first = await talkNpc(page, 'Necrovarus', [], 60);
    console.log('[ahnec] first', JSON.stringify({ ok: first.ok, bodies: first.bodies }));
    if (shot) await shot('03-first');
    if (!first?.ok) fail(`first Talk-to failed ${JSON.stringify(first)}`);
    if (first?.noTrig) fail(first.noTrig);
    const fText = (first.bodies || []).join(' | ');
    if (!/silence|incinerate|get out of my sight/i.test(fText)) fail(`refuse missing: ${fText}`);
    if (/old crone|nettle|ectophial|another way/i.test(fText)) fail(`shipped later unit: ${fText}`);
    await waitTicks(page, 4);
    const afterFirst = await getServerVarQuiet(page, 'ahoy_questvar');
    if (Number(afterFirst) !== 2) fail(`first did not write ahoy_questvar=2 (got ${afterFirst})`);

    const again = await talkNpc(page, 'Necrovarus', [], 50);
    console.log('[ahnec] again', JSON.stringify({ bodies: again.bodies }));
    if (shot) await shot('04-again');
    if (!again?.ok) fail(`re-talk failed ${JSON.stringify(again)}`);
    const aText = (again.bodies || []).join(' | ');
    if (!/remove your head/i.test(aText)) fail(`re-talk nag missing: ${aText}`);
    const afterAgain = await getServerVarQuiet(page, 'ahoy_questvar');
    if (Number(afterAgain) !== 2) fail(`re-talk wrote ahoy_questvar=${afterAgain}`);

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (!tile || Math.abs((tile.x | 0) - STAND.x) > 16 || Math.abs((tile.z | 0) - STAND.z) > 16) {
      fail(`left temple ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS ahnec necro=${NEC_ID} woo=1 refuse ahoy_questvar=${afterFirst} port=${tile.x},${tile.z} user=${username}`
    );
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
