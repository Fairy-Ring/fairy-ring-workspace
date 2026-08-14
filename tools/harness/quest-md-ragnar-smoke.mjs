#!/usr/bin/env node
/**
 * Mountain Daughter Ragnar first Talk-to (mdaughter_ragnar 1808).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-md-ragnar-smoke.mjs
 *
 * Soft: mdaughter_quest_var 0 then 1. Product: refuse stay 0 → Asleif
 * talk stay 1. Prefer 0 write. No pool / Kendal / invent 2.
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
const { username, password } = resolveAccount(rest, 'mdrag');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2764, z: 3676, level: 0 };
const RAGNAR_ID = 1808;

async function talkNpc(page, npcName, prefer = [], iters = 90) {
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
              if (/where she/.test(w)) return /where she/.test(t);
              if (/my kind/.test(w)) return /my kind/.test(t);
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
        if (!open && i > 70) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 12), bodies: bodies.slice(0, 16) };
    },
    [npcName, prefer, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[mdrag] ${base} user=${username} (Ragnar 1808)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`mdrag_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar mdaughter_quest_var 0', 300);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Ragnar stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(
        x => (x.id | 0) === id || /^ragnar$/i.test(x?.name || '')
      );
      return {
        hit: hit ? { id: hit.id, name: hit.name } : null,
        names: npcs.map(x => `${x?.name}:${x?.id}`).slice(0, 10)
      };
    }, RAGNAR_ID);
    console.log('[mdrag] npc', JSON.stringify(seen));
    if (shot) await shot('01-ragnar');
    if ((seen?.hit?.id | 0) !== RAGNAR_ID && !/^ragnar$/i.test(String(seen?.hit?.name || ''))) {
      fail(`Ragnar 1808 not next to stand: ${JSON.stringify(seen)}`);
    }

    const refuse = await talkNpc(page, 'Ragnar', [], 50);
    console.log('[mdrag] refuse', JSON.stringify(refuse));
    if (shot) await shot('02-refuse');
    if (!refuse?.ok) fail(`refuse Talk-to failed ${JSON.stringify(refuse)}`);
    if (refuse?.noTrig) fail(refuse.noTrig);
    const rText = (refuse.bodies || []).join(' | ');
    if (!/go away|outerlander/i.test(rText)) fail(`refuse missing: ${rText}`);
    const after0 = await getServerVarQuiet(page, 'mdaughter_quest_var');
    if (Number(after0) !== 0) fail(`refuse wrote mdaughter_quest_var=${after0}`);

    await cheatQuiet(page, 'setvar mdaughter_quest_var 1', 400);
    const talk = await talkNpc(page, 'Ragnar', ['where she'], 90);
    console.log('[mdrag] talk', JSON.stringify(talk));
    if (shot) await shot('03-asleif');
    if (!talk?.ok) fail(`started Talk-to failed ${JSON.stringify(talk)}`);
    if (talk?.noTrig) fail(talk.noTrig);
    const tText = (talk.bodies || []).join(' | ');
    if (!/asleif/i.test(tText)) fail(`Asleif talk missing: ${tText}`);
    if (/necklace|listen|kendal/i.test(tText)) fail(`shipped STOP tree: ${tText}`);
    await waitTicks(page, 4);
    const stage = await getServerVarQuiet(page, 'mdaughter_quest_var');
    if (Number(stage) !== 1) fail(`Ragnar wrote mdaughter_quest_var=${stage} (want stay 1)`);
    if (Number(stage) === 2) fail('invented stage 2');

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (
      !tile ||
      Math.abs((tile.x | 0) - STAND.x) > 14 ||
      Math.abs((tile.z | 0) - STAND.z) > 14
    ) {
      fail(`left pool path ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS mdrag ragnar=${RAGNAR_ID} refuse=0 stay mdaughter_quest_var=${stage} pool=${tile.x},${tile.z} user=${username}`
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
