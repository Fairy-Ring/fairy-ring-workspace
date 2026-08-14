#!/usr/bin/env node
/**
 * Enakhra's Lament Lazim start (enakh_lazim 3147).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-enakh-lazim-start-smoke.mjs
 *
 * Product: refuse (no write) → Of course! enakh_quest 0→1. Never 10.
 * Re-talk stay 1. No sandstone take / Camulet.
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
const { username, password } = resolveAccount(rest, 'enklz');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3190, z: 2926, level: 0 };
const LAZIM_ID = 3147;

async function talkNpc(page, npcName, prefer = [], iters = 100) {
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
              if (/lot of work/.test(w)) return /lot of work/.test(t);
              if (/of course/.test(w)) return /of course/.test(t);
              if (/get on with/.test(w)) return /get on with/.test(t);
              if (/weigh/.test(w)) return /weigh/.test(t);
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
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 12), bodies: bodies.slice(0, 20) };
    },
    [npcName, prefer, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[enklz] ${base} user=${username} (Lazim 3147)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`enklz_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Lazim stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(
        x => (x.id | 0) === id || /^lazim$/i.test(x?.name || '')
      );
      return {
        hit: hit ? { id: hit.id, name: hit.name } : null,
        names: npcs.map(x => `${x?.name}:${x?.id}`).slice(0, 10)
      };
    }, LAZIM_ID);
    console.log('[enklz] npc', JSON.stringify(seen));
    if (shot) await shot('01-lazim');
    if ((seen?.hit?.id | 0) !== LAZIM_ID && !/^lazim$/i.test(String(seen?.hit?.name || ''))) {
      fail(`Lazim 3147 not next to stand: ${JSON.stringify(seen)}`);
    }

    const refuse = await talkNpc(page, 'Lazim', ['lot of work'], 80);
    console.log('[enklz] refuse', JSON.stringify(refuse));
    if (shot) await shot('02-refuse');
    if (!refuse?.ok) fail(`refuse Talk-to failed ${JSON.stringify(refuse)}`);
    if (refuse?.noTrig) fail(refuse.noTrig);
    const after0 = await getServerVarQuiet(page, 'enakh_quest');
    if (Number(after0) !== 0) fail(`refuse wrote enakh_quest=${after0}`);

    const accept = await talkNpc(page, 'Lazim', ['of course', 'get on with'], 100);
    console.log('[enklz] accept', JSON.stringify(accept));
    if (shot) await shot('03-accept');
    if (!accept?.ok) fail(`accept Talk-to failed ${JSON.stringify(accept)}`);
    if (accept?.noTrig) fail(accept.noTrig);
    const aText = (accept.bodies || []).join(' | ');
    if (!/32|thirty two|sandstone/i.test(aText)) fail(`32kg briefing missing: ${aText}`);
    if (/camulet|i have some sandstone for you/i.test(aText)) fail(`shipped STOP tree: ${aText}`);
    await waitTicks(page, 4);
    const stage = await getServerVarQuiet(page, 'enakh_quest');
    if (Number(stage) !== 1) fail(`accept did not write enakh_quest=1 (got ${stage})`);
    if (Number(stage) >= 10) fail('wrote boneguard decade');

    const nag = await talkNpc(page, 'Lazim', ['get on with'], 70);
    console.log('[enklz] nag', JSON.stringify({ picks: nag.picks, bodies: nag.bodies }));
    if (shot) await shot('04-nag');
    const afterNag = await getServerVarQuiet(page, 'enakh_quest');
    if (Number(afterNag) !== 1) fail(`nag wrote enakh_quest=${afterNag}`);

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (
      !tile ||
      Math.abs((tile.x | 0) - STAND.x) > 14 ||
      Math.abs((tile.z | 0) - STAND.z) > 14
    ) {
      fail(`left quarry ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS enklz lazim=${LAZIM_ID} refuse=0 accept enakh_quest=${stage} never10 quarry=${tile.x},${tile.z} user=${username}`
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
