#!/usr/bin/env node
/**
 * Making History Droalak / Melina / scroll (after licensed Jorral).
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-mh-droalak \
 *     node tools/harness/quest-mh-droalak-smoke.mjs
 *
 * Product: Woo stay 0 · first Talk-to ghost_prog 0→1 · Melina strung
 * amulet fade 1→2 · Droalak scroll 2→3. Soft setvar makinghistory_prog 1.
 * No Jorral receive / Erin / Dron / droalak_pres.
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
const { username, password } = resolveAccount(rest, 'mhdro');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const DRO_STAND = { x: 3658, z: 3469, level: 0 };
const MEL_STAND = { x: 3674, z: 3483, level: 0 };
const DRO_ID = 2938;
const MEL_ID = 2935;

async function talkNpc(page, npcName, prefer = [], iters = 140) {
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
        if (!open && i > 120) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 12), bodies: bodies.slice(0, 28) };
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

async function wearGhostspeak(page) {
  return page.evaluate(() => {
    const a = globalThis.__lc377?.actions;
    return {
      ok: !!(
        a?.equip?.('Ghostspeak amulet') ||
        a?.equip?.('ghostspeak') ||
        a?.heldOp?.('Ghostspeak amulet', 2) ||
        a?.heldOp?.('ghostspeak', 2)
      )
    };
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[mhdro] ${base} user=${username} (Droalak 2938 / Melina 2935)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`mhdro_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setstat hitpoints 90', 300);
    await cheatQuiet(page, 'setvar makinghistory_prog 1', 400);

    if (!(await teleTo(page, DRO_STAND, 2, 25_000))) fail('tele Droalak stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seenDro = await seeNpc(page, DRO_ID, 'droalak');
    console.log('[mhdro] dro', JSON.stringify(seenDro));
    if (shot) await shot('01-droalak');
    if ((seenDro?.hit?.id | 0) !== DRO_ID && !/droalak/i.test(String(seenDro?.hit?.name || ''))) {
      fail(`Droalak not next to stand: ${JSON.stringify(seenDro)}`);
    }

    const woo = await talkNpc(page, 'Droalak', [], 40);
    console.log('[mhdro] woo', JSON.stringify(woo));
    if (shot) await shot('02-woo');
    if (!woo?.ok) fail(`Woo Talk-to failed ${JSON.stringify(woo)}`);
    const wooText = (woo.bodies || []).join(' | ');
    if (!/wooo/i.test(wooText)) fail(`ghostspeak-fail missing: ${wooText}`);
    const afterWoo = await getServerVarQuiet(page, 'makinghistory_ghost_prog');
    if (Number(afterWoo) !== 0) fail(`Woo wrote ghost_prog=${afterWoo}`);

    await giveItems(page, [['amulet_of_ghostspeak', 1]]);
    const worn = await wearGhostspeak(page);
    console.log('[mhdro] wear', JSON.stringify(worn));
    await waitTicks(page, 4);

    const first = await talkNpc(page, 'Droalak', [], 80);
    console.log('[mhdro] first', JSON.stringify({ ok: first.ok, bodies: first.bodies }));
    if (shot) await shot('03-first');
    if (!first?.ok) fail(`first Talk-to failed ${JSON.stringify(first)}`);
    if (first?.noTrig) fail(first.noTrig);
    const fText = (first.bodies || []).join(' | ');
    if (!/melina|strung sapphire/i.test(fText)) fail(`Melina brief missing: ${fText}`);
    if (/jorral.*scroll|erin|dron/i.test(fText)) fail(`shipped later unit: ${fText}`);
    await waitTicks(page, 4);
    const afterFirst = await getServerVarQuiet(page, 'makinghistory_ghost_prog');
    if (Number(afterFirst) !== 1) fail(`first did not write ghost_prog=1 (got ${afterFirst})`);
    const progStay = await getServerVarQuiet(page, 'makinghistory_prog');
    if (Number(progStay) !== 1) fail(`first wrote makinghistory_prog=${progStay}`);

    await giveItems(page, [['strung_sapphire_amulet', 1]]);
    if (!(await teleTo(page, MEL_STAND, 2, 25_000))) fail('tele Melina stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seenMel = await seeNpc(page, MEL_ID, 'melina');
    console.log('[mhdro] mel', JSON.stringify(seenMel));
    if (shot) await shot('04-melina');
    if ((seenMel?.hit?.id | 0) !== MEL_ID && !/melina/i.test(String(seenMel?.hit?.name || ''))) {
      fail(`Melina not next to stand: ${JSON.stringify(seenMel)}`);
    }

    const give = await talkNpc(page, 'Melina', [], 80);
    console.log('[mhdro] give', JSON.stringify({ ok: give.ok, bodies: give.bodies }));
    if (shot) await shot('05-give');
    if (!give?.ok) fail(`Melina Talk-to failed ${JSON.stringify(give)}`);
    if (give?.noTrig) fail(give.noTrig);
    const gText = (give.bodies || []).join(' | ');
    if (!/forgive|fare well/i.test(gText)) fail(`Melina accept missing: ${gText}`);
    await waitTicks(page, 6);
    const afterMel = await getServerVarQuiet(page, 'makinghistory_ghost_prog');
    if (Number(afterMel) !== 2) fail(`Melina did not write ghost_prog=2 (got ${afterMel})`);
    const faded = await getServerVarQuiet(page, 'makinghistory_melina_pres');
    if (Number(faded) !== 1) fail(`Melina did not fade melina_pres=${faded}`);
    const invAfter = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.inventory?.() ?? []).map(x => x?.name || x?.debugname)
    );
    if (invAfter.some(n => /sapphire amulet/i.test(String(n || '')))) {
      fail(`sapphire still in inv ${JSON.stringify(invAfter)}`);
    }

    if (!(await teleTo(page, DRO_STAND, 2, 25_000))) fail('tele Droalak return failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const scrollTalk = await talkNpc(page, 'Droalak', [], 80);
    console.log('[mhdro] scroll', JSON.stringify({ ok: scrollTalk.ok, bodies: scrollTalk.bodies }));
    if (shot) await shot('06-scroll');
    if (!scrollTalk?.ok) fail(`scroll Talk-to failed ${JSON.stringify(scrollTalk)}`);
    if (scrollTalk?.noTrig) fail(scrollTalk.noTrig);
    const sText = (scrollTalk.bodies || []).join(' | ');
    if (!/rest in peace|scroll/i.test(sText)) fail(`scroll grant missing: ${sText}`);
    if (/very interesting|great battle/i.test(sText)) fail(`Jorral receive leaked: ${sText}`);
    await waitTicks(page, 4);
    const afterScroll = await getServerVarQuiet(page, 'makinghistory_ghost_prog');
    if (Number(afterScroll) !== 3) fail(`scroll did not write ghost_prog=3 (got ${afterScroll})`);
    const droPres = await getServerVarQuiet(page, 'makinghistory_droalak_pres');
    if (Number(droPres) !== 0) fail(`wrote droalak_pres=${droPres}`);
    const inv = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.inventory?.() ?? []).map(x => x?.name || x?.debugname)
    );
    if (!inv.some(n => /scroll/i.test(String(n || '')))) fail(`scroll missing ${JSON.stringify(inv)}`);

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (!tile || Math.abs((tile.x | 0) - DRO_STAND.x) > 20 || Math.abs((tile.z | 0) - DRO_STAND.z) > 20) {
      fail(`left Phasmatys ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS mhdro droalak=${DRO_ID} ghost_prog=${afterScroll} scroll=yes port=${tile.x},${tile.z} user=${username}`
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
