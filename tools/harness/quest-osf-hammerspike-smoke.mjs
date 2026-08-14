#!/usr/bin/env node
/**
 * OSF Hammerspike after Tassie. 11→12. Name Sanfew. No dest / gang Attack.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-osf-ham \
 *     node tools/harness/quest-osf-hammerspike-smoke.mjs
 *
 * Soft onesmallfavour 11. Stand 2965,9810 S of jm2 2965,9811 (m46_153 0 21 19: 1794).
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
const { username, password } = resolveAccount(rest, 'osfhs');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2965, z: 9810, level: 0 };
const HAM_ID = 1794;

async function worldTile(page) {
  return page.evaluate(() => {
    const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
    return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[osfhs] ${base} user=${username} (Hammerspike OSF)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`osfhs_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar onesmallfavour 11', 300);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Hammerspike mine failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-mine');

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /hammerspike/i.test(x?.name || ''));
      return { hit: hit ? { id: hit.id, name: hit.name } : null };
    }, HAM_ID);
    console.log('[osfhs] npc', JSON.stringify(seen));
    if ((seen?.hit?.id | 0) !== HAM_ID) fail(`Hammerspike 1794 missing ${JSON.stringify(seen)}`);

    const talk = await page.evaluate(async () => {
      const h = globalThis.__lc377;
      const a = h?.actions;
      const r = h?.reader;
      if (!a || !r) return { error: 'no abi' };
      const sleep = ms => new Promise(res => setTimeout(res, ms));
      const findNpc = () =>
        (r.npcs?.() ?? []).find(x => /hammerspike/i.test(String(x?.name ?? '')));
      const n0 = findNpc();
      let ok = n0 ? !!a.npcOp?.(n0.index, 1) : !!a.talkNpc?.('Hammerspike');
      await sleep(1600);
      if (!r.dialogOpen?.()) {
        const n = findNpc();
        if (n) ok = !!a.npcOp?.(n.index, 1) || ok;
        await sleep(1200);
      }
      const bodies = [];
      const picks = [];
      for (let i = 0; i < 180; i++) {
        const body = r.chatBodyText?.() || '';
        if (body && (bodies.length === 0 || bodies[bodies.length - 1] !== body)) {
          bodies.push(body.slice(0, 240));
        }
        const raw = r.chatOptions?.() ?? [];
        if (raw.length) {
          const prefer = [/always been a gangster/i, /another favour/i];
          let j = -1;
          for (const re of prefer) {
            j = raw.findIndex(o => re.test(String(o?.text ?? o ?? '')));
            if (j >= 0) break;
          }
          if (j < 0) j = 0;
          const comId = raw[j]?.comId | 0;
          const label = raw[j]?.text ?? '';
          const okPick = comId ? !!a.ifButton?.(comId) : false;
          picks.push(okPick ? `ok:${label}` : `fail:${label}`);
          await sleep(800);
          continue;
        }
        a.continueDialog?.();
        await sleep(400);
        const open = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
        if (!open && bodies.length && i > 16) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => String(c?.text ?? '')) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks, bodies: bodies.slice(0, 40) };
    });
    console.log('[osfhs] talk', JSON.stringify(talk));
    if (shot) await shot('02-talk');
    if (!talk?.ok) fail(`Talk-to failed ${JSON.stringify(talk)}`);
    if (talk?.noTrig) fail(talk.noTrig);
    const text = (talk.bodies || []).join(' | ');
    if (!/sanfew|druid|tassie/i.test(text)) fail(`Sanfew/Tassie missing: ${text}`);
    if (/12346|remove this key|lamp|attack|potlid/i.test(text)) fail(`later leftover leaked: ${text}`);

    const tile = await worldTile(page);
    console.log('[osfhs] tile', tile);
    if (Math.abs((tile.x | 0) - STAND.x) > 10 || Math.abs((tile.z | 0) - STAND.z) > 10) {
      fail(`dest invented ${JSON.stringify(tile)}`);
    }
    const stage = await getServerVarQuiet(page, 'onesmallfavour');
    if (Number(stage) !== 12) fail(`onesmallfavour=${stage} (want 12)`);

    console.log(`RESULT PASS osfhs Hammerspike 11→12 stay mine user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
