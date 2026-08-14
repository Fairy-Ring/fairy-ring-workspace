#!/usr/bin/env node
/**
 * Desert Treasure Bandit bartender (fourdiamonds_bartender 1921).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-dt-bartender-smoke.mjs
 *
 * Soft: deserttreasure=5 + coins. Product: buy 5→6 + brew → diamonds rumor 6→7.
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
const { username, password } = resolveAccount(rest, 'dtbar');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3160, z: 2979, level: 0 };
const BART_ID = 1921;
const BREW = 4627;

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
      let ok = !!a.talkNpc?.(name);
      if (!ok) {
        const n = findNpc();
        if (n) ok = !!a.npcOp?.(n.index, 1);
      }
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
              if (/don'?t buy|nothing thanks/.test(w)) return /don'?t|nothing/.test(t);
              if (/buy a beer|buy a drink/.test(w)) return /buy a (beer|drink)/.test(t);
              if (/four diamond/.test(w)) return /diamond/.test(t);
              if (/treasure/.test(w)) return /treasure/.test(t) && !/diamond/.test(t);
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
  console.log(`[dtbar] ${base} user=${username} (Bartender 1921)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`dtbar_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar deserttreasure 5', 400);
    await cheatQuiet(page, 'give coins 2000', 500);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele bartender stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(
        x => (x.id | 0) === id || /^bartender$/i.test(x?.name || '')
      );
      return {
        hit: hit ? { id: hit.id, name: hit.name } : null,
        names: npcs.map(x => x?.name).slice(0, 10)
      };
    }, BART_ID);
    console.log('[dtbar] npc', JSON.stringify(seen));
    if (shot) await shot('01-bart');
    if ((seen?.hit?.id | 0) !== BART_ID && !/^bartender$/i.test(String(seen?.hit?.name || ''))) {
      fail(`Bartender 1921 not next to stand: ${JSON.stringify(seen)}`);
    }

    const buy = await talkNpc(page, 'Bartender', ['buy a drink', 'buy a beer'], 80);
    console.log('[dtbar] buy', JSON.stringify({ ok: buy.ok, noTrig: buy.noTrig, picks: buy.picks, bodies: buy.bodies }));
    if (shot) await shot('02-buy');
    if (!buy?.ok) fail(`buy Talk-to failed ${JSON.stringify(buy)}`);
    if (buy?.noTrig) fail(buy.noTrig);
    await waitTicks(page, 6);
    const stage6 = await getServerVarQuiet(page, 'deserttreasure');
    const inv = await page.evaluate(id => {
      const items = globalThis.__lc377?.reader?.inventory?.() ?? [];
      return {
        brew: items.some(x => (x.id | 0) === id || /bandit/i.test(x?.name || '')),
        ids: items.map(x => x.id).slice(0, 12)
      };
    }, BREW);
    console.log(`[dtbar] after buy deserttreasure=${stage6} inv=${JSON.stringify(inv)}`);
    if (Number(stage6) !== 6) fail(`buy did not write deserttreasure=6 (got ${stage6})`);
    if (!inv.brew) fail(`buy did not grant brew ${BREW}: ${JSON.stringify(inv)}`);
    if (Number(stage6) >= 15) fail('claimed complete');

    const rumor = await talkNpc(page, 'Bartender', ['four diamond'], 90);
    console.log(
      '[dtbar] rumor',
      JSON.stringify({ ok: rumor.ok, noTrig: rumor.noTrig, picks: rumor.picks, bodies: rumor.bodies })
    );
    if (shot) await shot('03-rumor');
    if (!rumor?.ok) fail(`rumor Talk-to failed ${JSON.stringify(rumor)}`);
    await waitTicks(page, 6);
    const stage7 = await getServerVarQuiet(page, 'deserttreasure');
    console.log(`[dtbar] after rumor deserttreasure=${stage7}`);
    if (Number(stage7) !== 7) fail(`diamonds rumor did not write deserttreasure=7 (got ${stage7})`);
    if (Number(stage7) >= 15) fail('claimed complete');
    const text = (rumor.bodies || []).join(' | ');
    if (!/azzanadra|elder/i.test(text)) fail(`diamonds rumor missing Azzanadra/elder: ${text}`);

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (
      !tile ||
      Math.abs((tile.x | 0) - STAND.x) > 14 ||
      Math.abs((tile.z | 0) - STAND.z) > 14
    ) {
      fail(`left Bandit Camp ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS dtbar bart=${BART_ID} buy=6 rumor deserttreasure=${stage7} brew=${BREW} camp=${tile.x},${tile.z} user=${username}`
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
