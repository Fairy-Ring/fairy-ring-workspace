#!/usr/bin/env node
/**
 * Garden of Tranquillity Ellamaria start (queen_ellamaria 2581).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-garden-ellamaria-smoke.mjs
 *
 * Product: No stay 0 · Yes garden_quest 0→1 + garden_list. No farmer / trolley.
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
const { username, password } = resolveAccount(rest, 'grelm');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3227, z: 3477, level: 0 };
const ELL_ID = 2581;

async function talkNpc(page, npcName, prefer = [], iters = 140) {
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
              if (/^no\.?$/.test(w.trim())) return /^no\.?$/i.test(t.trim());
              if (/^yes\.?$/.test(w.trim())) return /^yes\.?$/i.test(t.trim());
              if (/water/.test(w)) return /watering/i.test(t);
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
        if (!open && i > 120) break;
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
  console.log(`[grelm] ${base} user=${username} (Ellamaria 2581)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`grelm_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Ellamaria stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /ellamaria/i.test(x?.name || ''));
      return {
        hit: hit ? { id: hit.id, name: hit.name } : null,
        names: npcs.map(x => `${x?.name}:${x?.id}`).slice(0, 10)
      };
    }, ELL_ID);
    console.log('[grelm] npc', JSON.stringify(seen));
    if (shot) await shot('01-ellamaria');
    if ((seen?.hit?.id | 0) !== ELL_ID && !/ellamaria/i.test(String(seen?.hit?.name || ''))) {
      fail(`Ellamaria 2581 not next to stand: ${JSON.stringify(seen)}`);
    }

    const refuse = await talkNpc(page, 'Ellamaria', ['no'], 120);
    console.log('[grelm] refuse', JSON.stringify({ ok: refuse.ok, picks: refuse.picks }));
    if (shot) await shot('02-refuse');
    if (!refuse?.ok) fail(`refuse Talk-to failed ${JSON.stringify(refuse)}`);
    if (refuse?.noTrig) fail(refuse.noTrig);
    const after0 = await getServerVarQuiet(page, 'garden_quest');
    if (Number(after0) !== 0) fail(`No wrote garden_quest=${after0}`);

    const accept = await talkNpc(page, 'Ellamaria', ['yes'], 140);
    console.log('[grelm] accept', JSON.stringify({ ok: accept.ok, picks: accept.picks }));
    if (shot) await shot('03-accept');
    if (!accept?.ok) fail(`accept Talk-to failed ${JSON.stringify(accept)}`);
    if (accept?.noTrig) fail(accept.noTrig);
    const aText = (accept.bodies || []).join(' | ');
    if (!/wise old man|draynor|list/i.test(aText)) fail(`list briefing missing: ${aText}`);
    if (/elstan|trolley|statue of saradomin/i.test(aText)) fail(`shipped later unit: ${aText}`);
    await waitTicks(page, 4);
    const stage = await getServerVarQuiet(page, 'garden_quest');
    if (Number(stage) !== 1) fail(`accept did not write garden_quest=1 (got ${stage})`);

    const inv = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.inventory?.() ?? []).map(x => x?.name || x?.debugname)
    );
    if (!inv.some(n => /list/i.test(String(n || '')))) fail(`garden_list missing ${JSON.stringify(inv)}`);

    const nag = await talkNpc(page, 'Ellamaria', ['water'], 50);
    console.log('[grelm] nag', JSON.stringify({ picks: nag.picks }));
    if (shot) await shot('04-nag');
    const afterNag = await getServerVarQuiet(page, 'garden_quest');
    if (Number(afterNag) !== 1) fail(`nag wrote garden_quest=${afterNag}`);

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (!tile || Math.abs((tile.x | 0) - STAND.x) > 16 || Math.abs((tile.z | 0) - STAND.z) > 16) {
      fail(`left palace garden ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS grelm ellamaria=${ELL_ID} refuse=0 accept garden_quest=${stage} list garden=${tile.x},${tile.z} user=${username}`
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
