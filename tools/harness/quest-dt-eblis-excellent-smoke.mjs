#!/usr/bin/env node
/**
 * Desert Treasure village Eblis Excellent (full list 8→10).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-dt-eblis-excellent-smoke.mjs
 *
 * Soft deserttreasure 8 + all fd_* full. Talk-to Excellent writes 10.
 * Re-talk East nag stays 10. Never 15. No dest.
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
const { username, password } = resolveAccount(rest, 'dtexc');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3181, z: 2984, level: 0 };
const CURTAIN = { x: 3182, z: 2984, level: 0 };
const EBLIS_ID = 1923;

async function talkNpc(page, npcName, iters = 80) {
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
      const n0 = findNpc();
      let ok = n0 ? !!a.npcOp?.(n0.index, 1) : !!a.talkNpc?.(name);
      await sleep(1600);
      if (!r.dialogOpen?.()) {
        const n = findNpc();
        if (n) ok = !!a.npcOp?.(n.index, 1) || ok;
        await sleep(1200);
      }
      const bodies = [];
      let lastContinuedBody = '';
      let lastTalk = 0;
      for (let i = 0; i < maxI; i++) {
        const body = r.chatBodyText?.() || '';
        if (body && (bodies.length === 0 || bodies[bodies.length - 1] !== body)) {
          bodies.push(body.slice(0, 240));
          lastTalk = i;
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
          if (!openWait && i > lastTalk + 16) break;
          continue;
        }
        a.continueDialog?.();
        lastContinuedBody = body;
        await sleep(450);
        const open = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
        if (!open && i > lastTalk + 16 && bodies.length) break;
        if (!open && i > 70) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, bodies: bodies.slice(0, 16) };
    },
    [npcName, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[dtexc] ${base} user=${username} (Eblis Excellent)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`dtexc_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setstat hitpoints 90', 300);
    await cheatQuiet(page, 'setvar deserttreasure 8', 400);
    await cheatQuiet(page, 'setvar fd_magiclog 12', 250);
    await cheatQuiet(page, 'setvar fd_steelbar 6', 250);
    await cheatQuiet(page, 'setvar fd_glass 6', 250);
    await cheatQuiet(page, 'setvar fd_bones 1', 250);
    await cheatQuiet(page, 'setvar fd_ash 1', 250);
    await cheatQuiet(page, 'setvar fd_charcoal 1', 250);
    await cheatQuiet(page, 'setvar fd_bloodrune 1', 250);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Eblis stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const curtain = await page.evaluate(([x, z]) => {
      const a = globalThis.__lc377?.actions;
      const ok = !!a?.opLocAt?.(x, z, 'Open') || !!a?.opLoc?.('Curtain', 'Open', 8);
      return { ok };
    }, [CURTAIN.x, CURTAIN.z]);
    console.log('[dtexc] curtain', JSON.stringify(curtain));
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /^eblis$/i.test(x?.name || ''));
      return { hit: hit ? { id: hit.id, name: hit.name } : null };
    }, EBLIS_ID);
    console.log('[dtexc] npc', JSON.stringify(seen));
    if (shot) await shot('01-eblis');
    if (!seen?.hit) fail(`village Eblis missing ${JSON.stringify(seen)}`);

    const before = await getServerVarQuiet(page, 'deserttreasure');
    if (Number(before) !== 8) fail(`pre-talk deserttreasure=${before}`);

    const exc = await talkNpc(page, 'Eblis', 80);
    console.log('[dtexc] excellent', JSON.stringify({ ok: exc.ok, bodies: exc.bodies }));
    if (shot) await shot('02-excellent');
    if (!exc?.ok) fail(`Excellent Talk-to failed ${JSON.stringify(exc)}`);
    if (exc?.noTrig) fail(exc.noTrig);
    const eText = (exc.bodies || []).join(' | ').replace(/\s+/g, ' ');
    if (!/excellent/i.test(eText)) fail(`Excellent missing: ${eText}`);
    if (!/east of here/i.test(eText)) fail(`East missing: ${eText}`);
    const stage = await getServerVarQuiet(page, 'deserttreasure');
    if (Number(stage) !== 10) fail(`Excellent did not write 10 (got ${stage})`);
    if (Number(stage) >= 15) fail('wrote 15');

    const east = await talkNpc(page, 'Eblis', 50);
    console.log('[dtexc] east', JSON.stringify({ bodies: east.bodies }));
    if (shot) await shot('03-east');
    if (east?.noTrig) fail(east.noTrig);
    const eastText = (east.bodies || []).join(' | ').replace(/\s+/g, ' ');
    if (!/east of here/i.test(eastText)) fail(`East nag missing: ${eastText}`);
    const after = await getServerVarQuiet(page, 'deserttreasure');
    if (Number(after) !== 10) fail(`east nag wrote deserttreasure=${after}`);
    if (Number(after) >= 15) fail('wrote 15 on nag');

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (!tile || Math.abs((tile.x | 0) - STAND.x) > 16 || Math.abs((tile.z | 0) - STAND.z) > 16) {
      fail(`left Bandit Camp ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS dtexc eblis=${EBLIS_ID} deserttreasure=${after} never15 village=${tile.x},${tile.z} user=${username}`
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
