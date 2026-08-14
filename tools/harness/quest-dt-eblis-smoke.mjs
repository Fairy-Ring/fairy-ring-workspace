#!/usr/bin/env node
/**
 * Desert Treasure village Eblis (fd_elder_village 1923).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-dt-eblis-smoke.mjs
 *
 * Soft: deserttreasure 4 / 5 / 7. Product: leave-us no write · museum no
 * diamonds at 5 · diamonds+list Yes 7→8 · nag stay 8. Never 10 / 15.
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
const { username, password } = resolveAccount(rest, 'dtebl');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

// 3185,2982 is tent interior (o26 + dugupsoil5_light) — tele sits under the floor mesh (CLIP).
// 3185,2979 is desertwall 1415 (south face), not sand.
// 3181,2984 is west of curtain_1528 (3182,2984), sand, no o26. Open curtain then Talk-to.
const STAND = { x: 3181, z: 2984, level: 0 };
const CURTAIN = { x: 3182, z: 2984, level: 0 };
const EBLIS_ID = 1923;
const MIRRORS_ID = 1925;

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
              if (/nothing thanks/.test(w)) return /nothing/.test(t);
              if (/diamond/.test(w)) return /diamond/.test(t);
              if (/will go get|go get those/.test(w)) return /will go get|go get those/.test(t);
              if (/^yes$/.test(w.trim())) return /^yes$/.test(t.trim());
              if (/^no$/.test(w.trim())) return /^no$/.test(t.trim()) && !/repeat/.test(t);
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
        if (!open && i > 110) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 16), bodies: bodies.slice(0, 40) };
    },
    [npcName, prefer, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[dtebl] ${base} user=${username} (Eblis 1923)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`dtebl_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setstat hitpoints 90', 300);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Eblis stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const curtain = await page.evaluate(([x, z]) => {
      const a = globalThis.__lc377?.actions;
      const ok = !!a?.opLocAt?.(x, z, 'Open') || !!a?.opLoc?.('Curtain', 'Open', 8);
      return { ok };
    }, [CURTAIN.x, CURTAIN.z]);
    console.log('[dtebl] curtain', JSON.stringify(curtain));
    if (!curtain?.ok) fail(`curtain Open failed ${JSON.stringify(curtain)}`);
    await waitTicks(page, 6);

    const seen = await page.evaluate(([id, mir]) => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(
        x => (x.id | 0) === id || /^eblis$/i.test(x?.name || '')
      );
      const mirrors = npcs.some(x => (x.id | 0) === mir);
      return {
        hit: hit ? { id: hit.id, name: hit.name } : null,
        mirrors,
        names: npcs.map(x => `${x?.name}:${x?.id}`).slice(0, 12)
      };
    }, [EBLIS_ID, MIRRORS_ID]);
    console.log('[dtebl] npc', JSON.stringify(seen));
    if (shot) await shot('01-eblis');
    if ((seen?.hit?.id | 0) !== EBLIS_ID && !/^eblis$/i.test(String(seen?.hit?.name || ''))) {
      fail(`village Eblis 1923 not next to stand: ${JSON.stringify(seen)}`);
    }
    if (seen?.mirrors) fail('mirrors Eblis 1925 visible at village stage');

    await cheatQuiet(page, 'setvar deserttreasure 4', 400);
    const leave = await talkNpc(page, 'Eblis', [], 50);
    console.log('[dtebl] leave', JSON.stringify({ ok: leave.ok, noTrig: leave.noTrig, bodies: leave.bodies }));
    if (shot) await shot('02-leave');
    if (!leave?.ok) fail(`leave Talk-to failed ${JSON.stringify(leave)}`);
    if (leave?.noTrig) fail(leave.noTrig);
    const leaveText = (leave.bodies || []).join(' | ');
    if (!/fate|betrayed/i.test(leaveText)) fail(`leave-us missing: ${leaveText}`);
    const after4 = await getServerVarQuiet(page, 'deserttreasure');
    if (Number(after4) !== 4) fail(`leave wrote deserttreasure=${after4}`);

    await cheatQuiet(page, 'setvar deserttreasure 5', 400);
    const museum = await talkNpc(page, 'Eblis', ['nothing thanks'], 90);
    console.log('[dtebl] museum', JSON.stringify({ ok: museum.ok, picks: museum.picks, bodies: museum.bodies }));
    if (shot) await shot('03-museum');
    if (!museum?.ok) fail(`museum Talk-to failed ${JSON.stringify(museum)}`);
    if (museum?.noTrig) fail(museum.noTrig);
    const museumPicks = (museum.picks || []).join(' | ');
    if (/diamond/i.test(museumPicks)) fail(`diamonds option before rumor: ${museumPicks}`);
    const after5 = await getServerVarQuiet(page, 'deserttreasure');
    if (Number(after5) !== 5) fail(`museum wrote deserttreasure=${after5}`);

    await cheatQuiet(page, 'setvar deserttreasure 7', 400);
    const diamonds = await talkNpc(page, 'Eblis', ['diamond', 'yes', 'will go get'], 140);
    console.log(
      '[dtebl] diamonds',
      JSON.stringify({ ok: diamonds.ok, noTrig: diamonds.noTrig, picks: diamonds.picks, bodies: diamonds.bodies })
    );
    if (shot) await shot('04-diamonds');
    if (!diamonds?.ok) fail(`diamonds Talk-to failed ${JSON.stringify(diamonds)}`);
    if (diamonds?.noTrig) fail(diamonds.noTrig);
    const dText = (diamonds.bodies || []).join(' | ');
    if (!/diamond/i.test(dText) || !/azzanadra/i.test(dText)) fail(`diamonds talk missing: ${dText}`);
    const dPicks = (diamonds.picks || []).join(' | ');
    if (!/will go get/i.test(dPicks)) fail(`did not pick Yes-I-will-go: ${dPicks}`);
    if (!/magic log|scrying|blood rune|odd collection/i.test(dText) && !/will go get/i.test(dPicks)) {
      fail(`shopping list missing: ${dText}`);
    }
    if (/look into|gaze into the mirror/i.test(dText)) fail(`shipped mirrors: ${dText}`);
    await waitTicks(page, 6);
    const stage8 = await getServerVarQuiet(page, 'deserttreasure');
    console.log(`[dtebl] after yes deserttreasure=${stage8}`);
    if (Number(stage8) !== 8) fail(`Yes-I-will-go did not write deserttreasure=8 (got ${stage8})`);
    if (Number(stage8) >= 10) fail('wrote 10+ — mirrors overlap forbidden');
    if (Number(stage8) >= 15) fail('claimed complete');

    const nag = await talkNpc(page, 'Eblis', [], 50);
    console.log('[dtebl] nag', JSON.stringify({ ok: nag.ok, bodies: nag.bodies }));
    if (shot) await shot('05-nag');
    if (!nag?.ok) fail(`nag Talk-to failed ${JSON.stringify(nag)}`);
    const nagText = (nag.bodies || []).join(' | ');
    if (!/12 magic logs|still need/i.test(nagText)) fail(`nag list missing: ${nagText}`);
    const after8 = await getServerVarQuiet(page, 'deserttreasure');
    if (Number(after8) !== 8) fail(`nag wrote deserttreasure=${after8}`);
    if (Number(after8) >= 10) fail('nag wrote 10+');

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (
      !tile ||
      Math.abs((tile.x | 0) - STAND.x) > 16 ||
      Math.abs((tile.z | 0) - STAND.z) > 16
    ) {
      fail(`left Bandit Camp village ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS dtebl eblis=${EBLIS_ID} leave=4 museum=5 yes deserttreasure=${after8} never10 village=${tile.x},${tile.z} user=${username}`
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
