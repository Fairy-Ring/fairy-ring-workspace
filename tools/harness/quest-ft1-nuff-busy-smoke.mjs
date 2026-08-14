#!/usr/bin/env node
/**
 * Fairy Tale I — Fairy Nuff clinic busy refuse (fairy_nuff 3303).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-ft1-nuff-busy-smoke.mjs
 *
 * Soft: setvar fairy_farmers_quest 6 + tele Zanaris clinic (no Lost City commute).
 * Product: Talk-to busy names Godfather. 0 write. Never 10. No leftover 18164.
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
const { username, password } = resolveAccount(rest, 'ft1nu');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2390, z: 4468, level: 0 };
const NUFF_ID = 3303;
const SYMPTOMS_IF = 18164;

async function talkNpc(page, npcName, iters = 70) {
  return page.evaluate(
    async ([name, maxI]) => {
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
      const bodies = [];
      let lastContinuedBody = '';
      for (let i = 0; i < maxI; i++) {
        const body = r.chatBodyText?.() || '';
        if (body && (bodies.length === 0 || bodies[bodies.length - 1] !== body)) {
          bodies.push(body.slice(0, 240));
        }
        const raw = r.chatOptions?.() ?? [];
        if (raw.length) {
          const comId = raw[0]?.comId | 0;
          if (comId) a.ifButton?.(comId);
          await sleep(800);
          continue;
        }
        if (body && body === lastContinuedBody) {
          await sleep(300);
          const openWait = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
          if (!openWait && i > 16) break;
          continue;
        }
        a.continueDialog?.();
        lastContinuedBody = body;
        await sleep(450);
        const open = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
        if (!open && i > 16 && bodies.length) break;
        if (!open && i > 50) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      const overlay = r.modals?.() ?? {};
      return {
        ok,
        noTrig: noTrig ?? null,
        bodies: bodies.slice(0, 12),
        overlay: overlay.overlay ?? overlay.main ?? -1
      };
    },
    [npcName, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[ft1nu] ${base} user=${username} (Fairy Nuff 3303)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`ft1nu_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar fairy_farmers_quest 6', 400);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Nuff stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(
        x => (x.id | 0) === id || /fairy nuff/i.test(x?.name || '')
      );
      return {
        hit: hit ? { id: hit.id, name: hit.name } : null,
        names: npcs.map(x => x?.name).slice(0, 10)
      };
    }, NUFF_ID);
    console.log('[ft1nu] npc', JSON.stringify(seen));
    if (shot) await shot('01-nuff');
    if ((seen?.hit?.id | 0) !== NUFF_ID && !/fairy nuff/i.test(String(seen?.hit?.name || ''))) {
      fail(`Fairy Nuff 3303 not next to stand: ${JSON.stringify(seen)}`);
    }

    const talk = await talkNpc(page, 'Fairy Nuff', 70);
    console.log('[ft1nu] talk', JSON.stringify(talk));
    if (shot) await shot('02-busy');
    if (!talk?.ok) fail(`Nuff Talk-to failed ${JSON.stringify(talk)}`);
    if (talk?.noTrig) fail(talk.noTrig);
    const text = (talk.bodies || []).join(' | ');
    if (!/busy/i.test(text) || !/godfather/i.test(text)) {
      fail(`busy refuse missing: ${text}`);
    }
    if (/take the list|tanglefoot|mighty (healer|adventurer)/i.test(text)) {
      fail(`shipped STOP Nuff tree: ${text}`);
    }
    if (Number(talk.overlay) === SYMPTOMS_IF) {
      fail('opened leftover fairy_queen_symptoms from Nuff Talk-to');
    }

    await waitTicks(page, 4);
    const stage = await getServerVarQuiet(page, 'fairy_farmers_quest');
    const nuffCheck = await getServerVarQuiet(page, 'fairy_nuff_check').catch(() => 0);
    const queenCheck = await getServerVarQuiet(page, 'fairy_queen_check').catch(() => 0);
    const gfCheck = await getServerVarQuiet(page, 'fairy_godfather_check').catch(() => 0);
    console.log(
      `[ft1nu] after talk fairy_farmers_quest=${stage} nuff_check=${nuffCheck} queen=${queenCheck} godfather=${gfCheck}`
    );
    if (Number(stage) !== 6) fail(`Nuff wrote fairy_farmers_quest=${stage} (want stay 6)`);
    if (Number(stage) >= 10) fail('wrote decade room (10+) — Zanaris wall/guard must stay closed');
    if (Number(nuffCheck) !== 0) fail(`flipped fairy_nuff_check=${nuffCheck}`);
    if (Number(queenCheck) !== 0) fail(`flipped fairy_queen_check=${queenCheck}`);
    if (Number(gfCheck) !== 0) fail(`flipped fairy_godfather_check=${gfCheck}`);

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (
      !tile ||
      Math.abs((tile.x | 0) - STAND.x) > 14 ||
      Math.abs((tile.z | 0) - STAND.z) > 14 ||
      (tile.level | 0) !== 0
    ) {
      fail(`left Zanaris clinic ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS ft1nu nuff=${NUFF_ID} busy stay fairy_farmers_quest=${stage} never10 clinic=${tile.x},${tile.z} user=${username}`
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
