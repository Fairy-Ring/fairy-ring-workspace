#!/usr/bin/env node
/**
 * Making History Jorral skim of Droalak scroll.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-mh-scroll \
 *     node tools/harness/quest-mh-jorral-scroll-smoke.mjs
 *
 * Soft prog=1 ghost_prog=3 + give scroll. No letter / last-person wrap.
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
const { username, password } = resolveAccount(rest, 'mhscr');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2438, z: 3347, level: 0 };
const JORRAL_ID = 2932;

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
            const j = raw.findIndex(o => String(o?.text ?? o ?? '').toLowerCase().includes(w));
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
          if (!openWait && i > lastPickAt + 20) break;
          continue;
        }
        a.continueDialog?.();
        lastContinuedBody = body;
        await sleep(450);
        const open = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
        if (!open && i > lastPickAt + 20 && (picks.length || bodies.length)) break;
        if (!open && i > 70) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 8), bodies: bodies.slice(0, 20) };
    },
    [npcName, prefer, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[mhscr] ${base} user=${username} (Jorral scroll skim)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`mhscr_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar makinghistory_prog 1', 400);
    await cheatQuiet(page, 'setvar makinghistory_ghost_prog 3', 400);
    await giveItems(page, [['makinghistory_scroll1', 1]]);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Jorral failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-jorral');

    const talk = await talkNpc(page, 'Jorral', [], 80);
    console.log('[mhscr] talk', JSON.stringify(talk));
    if (shot) await shot('02-skim');
    if (!talk?.ok) fail(`Talk-to failed ${JSON.stringify(talk)}`);
    if (talk?.noTrig) fail(talk.noTrig);
    const text = (talk.bodies || []).join(' | ');
    if (!/very interesting|great battle/i.test(text)) fail(`skim missing: ${text}`);
    if (/it all makes sense|letter|king lathas/i.test(text)) fail(`last-person leaked: ${text}`);
    await waitTicks(page, 4);
    const prog = await getServerVarQuiet(page, 'makinghistory_prog');
    if (Number(prog) !== 1) fail(`wrote makinghistory_prog=${prog}`);
    const ghost = await getServerVarQuiet(page, 'makinghistory_ghost_prog');
    if (Number(ghost) !== 3) fail(`wrote ghost_prog=${ghost}`);
    const inv = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.inventory?.() ?? []).map(x => x?.name || x?.debugname)
    );
    if (!inv.some(n => /scroll/i.test(String(n || '')))) fail(`scroll consumed ${JSON.stringify(inv)}`);

    console.log(`RESULT PASS mhscr jorral=${JORRAL_ID} skim stay prog=1 ghost=3 user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
