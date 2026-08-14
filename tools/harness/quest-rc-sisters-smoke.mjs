#!/usr/bin/env node
/**
 * Ratcatchers sisters stage-0 refuse (vc_phingspet 2947 / vc_grimesquit 2946).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-rc-sisters-smoke.mjs
 *
 * Product: What's you want? both Talk-to. 0 write. No 2024 'Ello. No inter_322.
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
const { username, password } = resolveAccount(rest, 'rcsist');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3244, z: 9868, level: 0 };
const PHINGSPET_ID = 2947;
const GRIMESQUIT_ID = 2946;

async function talkNpc(page, npcName, iters = 60) {
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
      let lastPickAt = -99;
      for (let i = 0; i < maxI; i++) {
        const body = r.chatBodyText?.() || '';
        if (body && (bodies.length === 0 || bodies[bodies.length - 1] !== body)) {
          bodies.push(body.slice(0, 240));
        }
        const raw = r.chatOptions?.() ?? [];
        if (raw.length) {
          return { ok, extraOptions: raw.map(o => o?.text), bodies };
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
        if (!open && i > 16 && bodies.length) break;
        if (!open && i > 40) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, bodies: bodies.slice(0, 12) };
    },
    [npcName, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[rcsist] ${base} user=${username} (sisters)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`rcsist_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setstat hitpoints 40', 300);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Phingspet stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(([p, g]) => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const ph = npcs.find(x => (x.id | 0) === p || /phingspet/i.test(x?.name || ''));
      const gr = npcs.find(x => (x.id | 0) === g || /grimesquit/i.test(x?.name || ''));
      return {
        ph: ph ? { id: ph.id, name: ph.name } : null,
        gr: gr ? { id: gr.id, name: gr.name } : null,
        names: npcs.map(x => `${x?.name}:${x?.id}`).slice(0, 10)
      };
    }, [PHINGSPET_ID, GRIMESQUIT_ID]);
    console.log('[rcsist] npc', JSON.stringify(seen));
    if (shot) await shot('01-sisters');
    if (!seen?.ph) fail(`Phingspet 2947 not next to stand: ${JSON.stringify(seen)}`);
    if (!seen?.gr) fail(`Grimesquit 2946 not next to stand: ${JSON.stringify(seen)}`);

    const ph = await talkNpc(page, 'Phingspet', 50);
    console.log('[rcsist] phingspet', JSON.stringify(ph));
    if (shot) await shot('02-phingspet');
    if (!ph?.ok) fail(`Phingspet Talk-to failed ${JSON.stringify(ph)}`);
    if (ph?.noTrig) fail(ph.noTrig);
    const phText = (ph.bodies || []).join(' | ');
    if (!/what.s you want/i.test(phText)) fail(`Historical first line missing: ${phText}`);
    if (/ello ello|who are you/i.test(phText)) fail(`shipped 2024 rewrite: ${phText}`);
    if (ph?.extraOptions) fail(`unexpected options ${JSON.stringify(ph.extraOptions)}`);
    const afterP = await getServerVarQuiet(page, 'ratcatch_var');
    if (Number(afterP) !== 0) fail(`Phingspet wrote ratcatch_var=${afterP}`);

    const gr = await talkNpc(page, 'Grimesquit', 50);
    console.log('[rcsist] grimesquit', JSON.stringify(gr));
    if (shot) await shot('03-grimesquit');
    if (!gr?.ok) fail(`Grimesquit Talk-to failed ${JSON.stringify(gr)}`);
    if (gr?.noTrig) fail(gr.noTrig);
    const grText = (gr.bodies || []).join(' | ');
    if (!/what.s you want/i.test(grText)) fail(`Grimesquit first line missing: ${grText}`);
    const afterG = await getServerVarQuiet(page, 'ratcatch_var');
    if (Number(afterG) !== 0) fail(`Grimesquit wrote ratcatch_var=${afterG}`);

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (
      !tile ||
      Math.abs((tile.x | 0) - STAND.x) > 16 ||
      Math.abs((tile.z | 0) - STAND.z) > 16
    ) {
      fail(`left sewers ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS rcsist phingspet=${PHINGSPET_ID} grimesquit=${GRIMESQUIT_ID} ratcatch_var=0 sewer=${tile.x},${tile.z} user=${username}`
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
