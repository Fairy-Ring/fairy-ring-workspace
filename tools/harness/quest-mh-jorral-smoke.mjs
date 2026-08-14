#!/usr/bin/env node
/**
 * Making History Jorral start (makinghistory_jorral 2932).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-mh-jorral-smoke.mjs
 *
 * Product: dusty refuse stay 0 · Yes makinghistory_prog 0→1 · Erin pointer.
 * No Lathas / key / cutscene dest.
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
const { username, password } = resolveAccount(rest, 'mhjor');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2438, z: 3347, level: 0 };
const JORRAL_ID = 2932;

async function talkNpc(page, npcName, prefer = [], iters = 120) {
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
              if (/dusty/.test(w)) return /dusty building/i.test(t);
              if (/tell me more/.test(w)) return /tell me more/i.test(t);
              if (/stand for history/.test(w)) return /stand for history/i.test(t);
              if (/trader/.test(w)) return /trader in ardougne/i.test(t);
              if (/bye/.test(w)) return /got to go/i.test(t);
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
        if (!open && i > 110) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 12), bodies: bodies.slice(0, 24) };
    },
    [npcName, prefer, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[mhjor] ${base} user=${username} (Jorral 2932)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`mhjor_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Jorral stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /jorral/i.test(x?.name || ''));
      return {
        hit: hit ? { id: hit.id, name: hit.name } : null,
        names: npcs.map(x => `${x?.name}:${x?.id}`).slice(0, 10)
      };
    }, JORRAL_ID);
    console.log('[mhjor] npc', JSON.stringify(seen));
    if (shot) await shot('01-jorral');
    if ((seen?.hit?.id | 0) !== JORRAL_ID && !/jorral/i.test(String(seen?.hit?.name || ''))) {
      fail(`Jorral 2932 not next to stand: ${JSON.stringify(seen)}`);
    }

    const refuse = await talkNpc(page, 'Jorral', ['dusty'], 80);
    console.log('[mhjor] refuse', JSON.stringify({ ok: refuse.ok, picks: refuse.picks }));
    if (shot) await shot('02-refuse');
    if (!refuse?.ok) fail(`refuse Talk-to failed ${JSON.stringify(refuse)}`);
    if (refuse?.noTrig) fail(refuse.noTrig);
    const after0 = await getServerVarQuiet(page, 'makinghistory_prog');
    if (Number(after0) !== 0) fail(`refuse wrote makinghistory_prog=${after0}`);

    const accept = await talkNpc(page, 'Jorral', ['tell me more', 'stand for history', 'trader'], 120);
    console.log('[mhjor] accept', JSON.stringify({ ok: accept.ok, picks: accept.picks }));
    if (shot) await shot('03-accept');
    if (!accept?.ok) fail(`accept Talk-to failed ${JSON.stringify(accept)}`);
    if (accept?.noTrig) fail(accept.noTrig);
    const aText = (accept.bodies || []).join(' | ');
    if (!/erin|silver trader/i.test(aText)) fail(`Erin pointer missing: ${aText}`);
    if (/lathas.*letter|enchanted key/i.test(aText)) fail(`shipped later unit: ${aText}`);
    await waitTicks(page, 4);
    const stage = await getServerVarQuiet(page, 'makinghistory_prog');
    if (Number(stage) !== 1) fail(`accept did not write makinghistory_prog=1 (got ${stage})`);

    const nag = await talkNpc(page, 'Jorral', ['bye'], 50);
    console.log('[mhjor] nag', JSON.stringify({ picks: nag.picks }));
    if (shot) await shot('04-nag');
    const afterNag = await getServerVarQuiet(page, 'makinghistory_prog');
    if (Number(afterNag) !== 1) fail(`nag wrote makinghistory_prog=${afterNag}`);

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (!tile || Math.abs((tile.x | 0) - STAND.x) > 16 || Math.abs((tile.z | 0) - STAND.z) > 16) {
      fail(`left outpost ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS mhjor jorral=${JORRAL_ID} refuse=0 accept makinghistory_prog=${stage} outpost=${tile.x},${tile.z} user=${username}`
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
