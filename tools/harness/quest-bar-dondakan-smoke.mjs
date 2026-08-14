#!/usr/bin/env node
/**
 * Between a Rock… Dondakan start (dwarfrock_dondakan 1837).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-bar-dondakan-smoke.mjs
 *
 * Soft: fishingcompo 5 + mcannon 11. Product: Goodbye stay 0 · Yes
 * dwarfrock_quest 0→10 (multi hole at 1–9). Pointer stay 10 + lookingforinfo.
 * Never 110 / schematic.
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
const { username, password } = resolveAccount(rest, 'bardn');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2824, z: 10167, level: 0 };
const DONDAKAN_ID = 1837;

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
              if (/^goodbye/.test(w)) return /^goodbye/i.test(t);
              if (/cannon/.test(w)) return /cannon at a wall|firing a cannon/i.test(t);
              if (/interesting|sure/.test(w)) return /sounds interesting|^sure/i.test(t);
              if (/need me/.test(w)) return /need me to do/i.test(t);
              if (/back later/.test(w)) return /back later/i.test(t);
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
        if (!open && i > 100) break;
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
  console.log(`[bardn] ${base} user=${username} (Dondakan 1837)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`bardn_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setstat hitpoints 90', 300);
    await cheatQuiet(page, 'setvar fishingcompo 5', 400);
    await cheatQuiet(page, 'setvar mcannon 11', 400);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Dondakan stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(
        x => (x.id | 0) === id || /dondakan/i.test(x?.name || '')
      );
      return {
        hit: hit ? { id: hit.id, name: hit.name } : null,
        names: npcs.map(x => `${x?.name}:${x?.id}`).slice(0, 10)
      };
    }, DONDAKAN_ID);
    console.log('[bardn] npc', JSON.stringify(seen));
    if (shot) await shot('01-dondakan');
    if ((seen?.hit?.id | 0) !== DONDAKAN_ID && !/dondakan/i.test(String(seen?.hit?.name || ''))) {
      fail(`Dondakan 1837 not next to stand: ${JSON.stringify(seen)}`);
    }

    const leave = await talkNpc(page, 'Dondakan', ['goodbye'], 50);
    console.log('[bardn] leave', JSON.stringify({ ok: leave.ok, noTrig: leave.noTrig, picks: leave.picks }));
    if (shot) await shot('02-leave');
    if (!leave?.ok) fail(`leave Talk-to failed ${JSON.stringify(leave)}`);
    if (leave?.noTrig) fail(leave.noTrig);
    const after0 = await getServerVarQuiet(page, 'dwarfrock_quest');
    if (Number(after0) !== 0) fail(`goodbye wrote dwarfrock_quest=${after0}`);

    const accept = await talkNpc(page, 'Dondakan', ['cannon', 'interesting'], 140);
    console.log('[bardn] accept', JSON.stringify({ ok: accept.ok, picks: accept.picks, bodies: accept.bodies }));
    if (shot) await shot('03-accept');
    if (!accept?.ok) fail(`accept Talk-to failed ${JSON.stringify(accept)}`);
    if (accept?.noTrig) fail(accept.noTrig);
    const aText = (accept.bodies || []).join(' | ');
    if (!/welcome aboard|impenetrable|rune pickaxe/i.test(aText)) fail(`pitch missing: ${aText}`);
    if (/place a gear|schematic/i.test(aText)) fail(`shipped leftover join: ${aText}`);
    await waitTicks(page, 4);
    const stage = await getServerVarQuiet(page, 'dwarfrock_quest');
    if (Number(stage) !== 10) fail(`accept did not write dwarfrock_quest=10 (got ${stage})`);
    if (Number(stage) >= 110) fail('wrote noaxe 110');

    // Dondakan wanders the cannon pad — re-stand before the pointer Talk-to.
    if (!(await teleTo(page, STAND, 2, 20_000))) fail('re-tele Dondakan stand failed');
    await waitTicks(page, 4);

    const nag = await talkNpc(page, 'Dondakan', ['need me'], 90);
    console.log('[bardn] nag', JSON.stringify({ picks: nag.picks, bodies: nag.bodies }));
    if (shot) await shot('04-nag');
    const nagText = (nag.bodies || []).join(' | ');
    if (!/librarian|city/i.test(nagText)) fail(`pointer missing: ${nagText}`);
    const afterNag = await getServerVarQuiet(page, 'dwarfrock_quest');
    if (Number(afterNag) !== 10) fail(`nag wrote dwarfrock_quest=${afterNag}`);
    const info = await getServerVarQuiet(page, 'dwarfrock_lookingforinfo');
    if (Number(info) !== 1) fail(`pointer did not write lookingforinfo=1 (got ${info})`);

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (
      !tile ||
      Math.abs((tile.x | 0) - STAND.x) > 16 ||
      Math.abs((tile.z | 0) - STAND.z) > 16
    ) {
      fail(`left Dondakan mine ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS bardn dondakan=${DONDAKAN_ID} leave=0 yes dwarfrock_quest=${stage} info=${info} never110 mine=${tile.x},${tile.z} user=${username}`
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
