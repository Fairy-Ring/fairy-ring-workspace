#!/usr/bin/env node
/**
 * Viking Brundt complete — residual after Sigmund 7→8.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-viking-brundt-complete-smoke.mjs
 *
 * Soft: viking 8 (7 votes), bits 0 (no merchant intercept).
 * Product: Talk Brundt → viking_quest_complete → viking=10.
 *
 * @see docs/plans/2026-08-13-viking-brundt-complete.md
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
  waitTicks,
  wipeInvAndWorn
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'vikbr');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const BRUNDT = { x: 2659, z: 3669, level: 0 };
const STAND = { x: 2658, z: 3669, level: 0 };
/** Generic quest-complete scroll (`if_openmain(questscroll_death)` — cache 12140, not 289 id 8680). */
const QUEST_SCROLL = 12140;

async function talkNpc(page, npcName, prefer = [], iters = 72) {
  return page.evaluate(
    async ([name, pref, maxI]) => {
      const h = globalThis.__lc377;
      const a = h?.actions;
      const r = h?.reader;
      if (!a || !r) return { error: 'no abi' };
      const getOpts = () => {
        try {
          return (r.chatOptions?.() ?? [])
            .map(o => (typeof o === 'string' ? o : o?.text))
            .filter(Boolean);
        } catch {
          return [];
        }
      };
      let ok = !!a.talkNpc?.(name);
      if (!ok) {
        const n = (r.npcs?.() ?? []).find(x =>
          String(x?.name ?? '')
            .toLowerCase()
            .includes(String(name).toLowerCase())
        );
        if (n) ok = !!a.npcOp?.(n.index, 1);
      }
      await new Promise(res => setTimeout(res, 1200));
      const picks = [];
      for (let i = 0; i < maxI; i++) {
        const opts = getOpts();
        if (opts.length) {
          const low = opts.map(o => String(o).toLowerCase());
          let pick = 0;
          for (const p of pref) {
            const j = low.findIndex(o => o.includes(String(p).toLowerCase()));
            if (j >= 0) {
              pick = j;
              break;
            }
          }
          picks.push(opts[pick]);
          a.chooseOption?.([opts[pick]]);
        } else {
          a.continueDialog?.();
          a.dismissModalMessage?.();
          // Do not closeModal — that dismisses questscroll_death.
        }
        await new Promise(res => setTimeout(res, 320));
        if ((r.modals?.()?.chat ?? -1) === -1 && i > 10) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(24).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 16), chat: chat.slice(0, 16) };
    },
    [npcName, prefer, iters]
  );
}

async function continueThrash(page, iters = 20, ms = 260) {
  await page.evaluate(
    async ([n, d]) => {
      const a = globalThis.__lc377?.actions;
      for (let i = 0; i < n; i++) {
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
        await new Promise(r => setTimeout(r, d));
      }
    },
    [iters, ms]
  );
}

async function chatTail(page, n = 20) {
  return page.evaluate(k => {
    try {
      return (globalThis.__lc377?.reader?.chat?.(k) ?? [])
        .map(c => String(c?.text ?? c ?? ''))
        .filter(Boolean)
        .slice(-k);
    } catch {
      return [];
    }
  }, n);
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[vik-brundt] ${base} user=${username} (complete 8→10; headed default)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`vik-brundt_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'reload', 800);
    await wipeInvAndWorn(page, 'vik-brundt prep');
    await cheatQuiet(page, 'setvar viking_bits 0', 300);
    await cheatQuiet(page, 'setvar viking 8', 400);
    await waitTicks(page, 2);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Brundt failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);
    const from = Number(await getServerVarQuiet(page, 'viking'));
    if (from !== 8) fail(`prep viking=${from} want 8`);

    const talk = await talkNpc(page, 'Brundt', ['becoming a fremennik', 'hello'], 80);
    console.log('[vik-brundt] talk', JSON.stringify(talk));
    if (talk?.noTrig) fail(talk.noTrig);
    await continueThrash(page, 20, 260);

    let scrollMain = -1;
    for (let i = 0; i < 24 && scrollMain !== QUEST_SCROLL; i++) {
      await continueThrash(page, 4, 200);
      await waitTicks(page, 2);
      const mods = await page.evaluate(() => globalThis.__lc377?.reader?.modals?.() ?? {});
      scrollMain = Number(mods.main ?? -1);
      console.log(`[vik-brundt] modal wait ${i} main=${scrollMain}`);
      if (scrollMain === QUEST_SCROLL) break;
    }
    if (scrollMain === QUEST_SCROLL && shot) await shot('quest-scroll');
    if (scrollMain !== QUEST_SCROLL) {
      console.warn(`[vik-brundt] no questscroll_death (main=${scrollMain}) — first run closed it with closeModal`);
    }

    let stage = Number(await getServerVarQuiet(page, 'viking')) || from;
    for (let i = 0; i < 10 && stage < 10; i++) {
      await continueThrash(page, 6, 220);
      await waitTicks(page, 2);
      stage = Number(await getServerVarQuiet(page, 'viking')) || stage;
    }
    const chat = await chatTail(page, 20);
    const modsEnd = await page.evaluate(() => globalThis.__lc377?.reader?.modals?.() ?? {});
    console.log(
      `[vik-brundt] end viking=${stage} (from ${from}) scrollSeen=${scrollMain === QUEST_SCROLL} ` +
        `main=${modsEnd.main}`,
      chat.slice(-12)
    );
    if (shot) await shot(stage >= 10 && scrollMain === QUEST_SCROLL ? 'pass' : 'fail');
    if (stage < 10) fail(`BRUNDT FAIL viking=${from}→${stage} chat=${JSON.stringify(chat.slice(-12))}`);
    if (scrollMain !== QUEST_SCROLL) {
      fail(
        `SCROLL FAIL viking=${stage} but main=${scrollMain} want questscroll_death=${QUEST_SCROLL} ` +
          `(do not closeModal during complete)`
      );
    }
    console.log(
      `RESULT PASS vik-brundt viking=${from}→${stage} scroll=${QUEST_SCROLL} ` +
        `(SOFT 8=7 votes; product Talk Brundt + questscroll_death 12140)`
    );
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
