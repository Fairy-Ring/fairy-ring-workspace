#!/usr/bin/env node
/**
 * Cabin Fever east-dock Teach (fever_port_ship_teach 3157).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-cf-east-dock-smoke.mjs
 *
 * Soft fever_quest 1. Product: Ye came · grab stay 1 · Let's go no dest.
 * Never 1→2. Do not rewrite inn.
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
const { username, password } = resolveAccount(rest, 'cfeast');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3712, z: 3496, level: 1 };
const TEACH_ID = 3157;

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
              if (/grab/.test(w)) return /grab something/i.test(t);
              if (/let.s go|lets go/.test(w)) return /let.s go cap/i.test(t);
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
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 8), bodies: bodies.slice(0, 16) };
    },
    [npcName, prefer, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[cfeast] ${base} user=${username} (port Teach 3157)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`cfeast_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setstat hitpoints 90', 300);
    await cheatQuiet(page, 'setvar fever_quest 1', 400);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele east-dock stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /bill teach/i.test(x?.name || ''));
      return {
        hit: hit ? { id: hit.id, name: hit.name } : null,
        names: npcs.map(x => `${x?.name}:${x?.id}`).slice(0, 10)
      };
    }, TEACH_ID);
    console.log('[cfeast] npc', JSON.stringify(seen));
    if (shot) await shot('01-teach');
    if ((seen?.hit?.id | 0) !== TEACH_ID && !/teach/i.test(String(seen?.hit?.name || ''))) {
      fail(`port Teach 3157 not next to stand: ${JSON.stringify(seen)}`);
    }

    const grab = await talkNpc(page, 'Bill Teach', ['grab'], 70);
    console.log('[cfeast] grab', JSON.stringify(grab));
    if (shot) await shot('02-grab');
    if (!grab?.ok) fail(`grab Talk-to failed ${JSON.stringify(grab)}`);
    if (grab?.noTrig) fail(grab.noTrig);
    const gText = (grab.bodies || []).join(' | ');
    if (!/ye came/i.test(gText)) fail(`Ye came missing: ${gText}`);
    if (/m28_75|they've found us/i.test(gText)) fail(`shipped battle: ${gText}`);
    const afterGrab = await getServerVarQuiet(page, 'fever_quest');
    if (Number(afterGrab) !== 1) fail(`grab wrote fever_quest=${afterGrab}`);

    const go = await talkNpc(page, 'Bill Teach', ['lets go'], 70);
    console.log('[cfeast] go', JSON.stringify(go));
    if (shot) await shot('03-letsgo');
    const afterGo = await getServerVarQuiet(page, 'fever_quest');
    if (Number(afterGo) !== 1) fail(`Let's go wrote fever_quest=${afterGo}`);
    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (!tile || (tile.level | 0) !== 1) fail(`left deck ${JSON.stringify(tile)}`);
    if (Math.abs((tile.x | 0) - STAND.x) > 20 || Math.abs((tile.z | 0) - STAND.z) > 20) {
      fail(`sailed away ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS cfeast teach=${TEACH_ID} fever_quest=${afterGo} never2 deck=${tile.x},${tile.z},L${tile.level} user=${username}`
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
