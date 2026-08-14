#!/usr/bin/env node
/**
 * Making History Dron / Blanin quiz (after licensed Jorral).
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-mh-dron \
 *     node tools/harness/quest-mh-dron-smoke.mjs
 *
 * Product: bounce warr_prog 0→1 · Blanin briefing stay 1 · quiz 1→2.
 * Soft setvar makinghistory_prog 1. No Jorral receive / Erin / obj.
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
const { username, password } = resolveAccount(rest, 'mhdro');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const DRON_STAND = { x: 2659, z: 3700, level: 0 };
const BLA_STAND = { x: 2674, z: 3671, level: 0 };
const DRON_ID = 2939;
const BLA_ID = 2940;

async function talkNpc(page, npcName, prefer = [], iters = 200) {
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
          bodies.push(body.slice(0, 280));
        }
        const raw = r.chatOptions?.() ?? [];
        if (raw.length) {
          let pick = 0;
          for (const p of pref) {
            const w = String(p).toLowerCase();
            const j = raw.findIndex(o => {
              const t = String(o?.text ?? o ?? '').toLowerCase().trim();
              if (w === '8') return t === '8';
              if (w === '36') return t === '36';
              if (w === '12') return /^12\b/.test(t);
              if (/mace/.test(w)) return /iron mace/i.test(t);
              if (/famous/.test(w)) return /famous warrior/i.test(t);
              if (/important/.test(w)) return /important answers/i.test(t);
              if (/fifth/.test(w)) return /fifth and fourth/i.test(t);
              if (/north east/.test(w)) return /north east/i.test(t);
              if (/blanin/.test(w)) return /^blanin/i.test(t);
              if (/fluffy/.test(w)) return /fluffy/i.test(t);
              if (/bunnies/.test(w)) return /bunnies/i.test(t);
              if (/breakfast/.test(w)) return /breakfast/i.test(t);
              if (/lunch/.test(w)) return /^lunch/i.test(t);
              if (w === 'red') return /^red$/i.test(t);
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
          a.continueDialog?.();
          await sleep(400);
          const openWait = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
          if (!openWait && i > lastPickAt + 40) break;
          continue;
        }
        a.continueDialog?.();
        lastContinuedBody = body;
        await sleep(500);
        const open = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
        if (!open && i > lastPickAt + 40 && (picks.length || bodies.length)) break;
        if (!open && i > 200) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 20), bodies: bodies.slice(0, 80) };
    },
    [npcName, prefer, iters]
  );
}

async function seeNpc(page, id, nameRe) {
  return page.evaluate(
    ([wantId, reSrc]) => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const re = new RegExp(reSrc, 'i');
      const hit = npcs.find(x => (x.id | 0) === wantId || re.test(x?.name || ''));
      return {
        hit: hit ? { id: hit.id, name: hit.name } : null,
        names: npcs.map(x => `${x?.name}:${x?.id}`).slice(0, 10)
      };
    },
    [id, nameRe]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[mhdn] ${base} user=${username} (Dron 2939 / Blanin 2940)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`mhdn_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setstat hitpoints 90', 300);
    await cheatQuiet(page, 'setvar makinghistory_prog 1', 400);

    if (!(await teleTo(page, DRON_STAND, 2, 25_000))) fail('tele Dron stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    const seenD = await seeNpc(page, DRON_ID, 'dron');
    console.log('[mhdn] dron', JSON.stringify(seenD));
    if (shot) await shot('01-dron');
    if ((seenD?.hit?.id | 0) !== DRON_ID && !/dron/i.test(String(seenD?.hit?.name || ''))) {
      fail(`Dron not next to stand: ${JSON.stringify(seenD)}`);
    }

    const bounce = await talkNpc(page, 'Dron', [], 50);
    console.log('[mhdn] bounce', JSON.stringify({ bodies: bounce.bodies }));
    if (shot) await shot('02-bounce');
    if (!bounce?.ok) fail(`bounce failed ${JSON.stringify(bounce)}`);
    if (bounce?.noTrig) fail(bounce.noTrig);
    const bText = (bounce.bodies || []).join(' | ');
    if (!/blanin/i.test(bText)) fail(`bounce missing Blanin: ${bText}`);
    await waitTicks(page, 4);
    const afterBounce = await getServerVarQuiet(page, 'makinghistory_warr_prog');
    if (Number(afterBounce) !== 1) fail(`bounce did not write warr_prog=1 (got ${afterBounce})`);

    if (!(await teleTo(page, BLA_STAND, 2, 25_000))) fail('tele Blanin stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    const seenB = await seeNpc(page, BLA_ID, 'blanin');
    console.log('[mhdn] blanin', JSON.stringify(seenB));
    if (shot) await shot('03-blanin');
    if ((seenB?.hit?.id | 0) !== BLA_ID && !/blanin/i.test(String(seenB?.hit?.name || ''))) {
      fail(`Blanin not next to stand: ${JSON.stringify(seenB)}`);
    }

    const brief = await talkNpc(page, 'Blanin', [], 80);
    console.log('[mhdn] brief', JSON.stringify({ bodies: brief.bodies }));
    if (shot) await shot('04-brief');
    if (!brief?.ok) fail(`Blanin failed ${JSON.stringify(brief)}`);
    if (brief?.noTrig) fail(brief.noTrig);
    const brText = (brief.bodies || []).join(' | ');
    if (!/iron mace|fluffy/i.test(brText)) fail(`briefing missing facts: ${brText}`);
    const afterBrief = await getServerVarQuiet(page, 'makinghistory_warr_prog');
    if (Number(afterBrief) !== 1) fail(`Blanin wrote warr_prog=${afterBrief}`);

    if (!(await teleTo(page, DRON_STAND, 2, 25_000))) fail('tele Dron return failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const quiz = await talkNpc(
      page,
      'Dron',
      [
        'important',
        'famous',
        'iron mace',
        'breakfast',
        'lunch',
        'bunnies',
        'red',
        '36',
        '8',
        'fifth',
        'north east',
        'blanin',
        'fluffy',
        '12'
      ],
      280
    );
    console.log('[mhdn] quiz', JSON.stringify({ picks: quiz.picks, nBodies: (quiz.bodies || []).length }));
    if (shot) await shot('05-quiz');
    if (!quiz?.ok) fail(`quiz failed ${JSON.stringify(quiz)}`);
    if (quiz?.noTrig) fail(quiz.noTrig);
    const drained = await page.evaluate(async () => {
      const h = globalThis.__lc377;
      const a = h?.actions;
      const r = h?.reader;
      const sleep = ms => new Promise(res => setTimeout(res, ms));
      const extra = [];
      for (let i = 0; i < 80; i++) {
        const body = r?.chatBodyText?.() || '';
        if (body && (extra.length === 0 || extra[extra.length - 1] !== body)) extra.push(body.slice(0, 240));
        const open = !!r?.dialogOpen?.() || (r?.modals?.()?.chat ?? -1) !== -1;
        if (!open && i > 8) break;
        a?.continueDialog?.();
        await sleep(400);
      }
      return extra;
    });
    console.log('[mhdn] drain', JSON.stringify(drained));
    const qText = [...(quiz.bodies || []), ...drained].join(' | ');
    if (!/very well|guthix|be gone/i.test(qText)) fail(`oral wrap missing: ${qText.slice(-400)}`);
    if (/very interesting|great battle/i.test(qText)) fail(`Jorral receive leaked: ${qText}`);
    await waitTicks(page, 4);
    const afterQuiz = await getServerVarQuiet(page, 'makinghistory_warr_prog');
    if (Number(afterQuiz) !== 2) fail(`quiz did not write warr_prog=2 (got ${afterQuiz})`);
    const prog = await getServerVarQuiet(page, 'makinghistory_prog');
    if (Number(prog) !== 1) fail(`wrote makinghistory_prog=${prog}`);

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (!tile || Math.abs((tile.x | 0) - DRON_STAND.x) > 20 || Math.abs((tile.z | 0) - DRON_STAND.z) > 20) {
      fail(`left Rellekka ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS mhdn dron=${DRON_ID} warr_prog=${afterQuiz} port=${tile.x},${tile.z} user=${username}`
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
