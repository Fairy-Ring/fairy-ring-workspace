#!/usr/bin/env node
/**
 * OSF Rantz after Tindel. 19→20. Name little guy / come-down-place. Keep Chompy. No dest / comfy.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-osf-rantz \
 *     node tools/harness/quest-osf-rantz-smoke.mjs
 *
 * Soft onesmallfavour 19. Stand 2629,2981 W of jm2 2630,2981 (m41_46 0 6 37: 1010).
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
const { username, password } = resolveAccount(rest, 'osfrz');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2629, z: 2981, level: 0 };
const RANTZ_ID = 1010;

async function worldTile(page) {
  return page.evaluate(() => {
    const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
    return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[osfrz] ${base} user=${username} (Rantz OSF)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`osfrz_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar onesmallfavour 19', 300);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Rantz failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-camp');

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /^rantz$/i.test(x?.name || ''));
      return { hit: hit ? { id: hit.id, name: hit.name } : null };
    }, RANTZ_ID);
    console.log('[osfrz] npc', JSON.stringify(seen));
    if ((seen?.hit?.id | 0) !== RANTZ_ID) fail(`Rantz 1010 missing ${JSON.stringify(seen)}`);

    const talk = await page.evaluate(async () => {
      const h = globalThis.__lc377;
      const a = h?.actions;
      const r = h?.reader;
      if (!a || !r) return { error: 'no abi' };
      const sleep = ms => new Promise(res => setTimeout(res, ms));
      const findNpc = () =>
        (r.npcs?.() ?? []).find(x => /^rantz$/i.test(String(x?.name ?? '')));
      const n0 = findNpc();
      let ok = n0 ? !!a.npcOp?.(n0.index, 1) : !!a.talkNpc?.('Rantz');
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
          const prefer = [/talk to you about a mattress/i, /see what i can do/i];
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
      const inv = (r.inventory?.() ?? []).map(i => ({
        id: i?.id | 0,
        name: String(i?.name ?? '')
      }));
      return { ok, noTrig: noTrig ?? null, picks, bodies: bodies.slice(0, 40), inv };
    });
    console.log('[osfrz] talk', JSON.stringify(talk));
    if (shot) await shot('02-talk');
    if (!talk?.ok) fail(`Talk-to failed ${JSON.stringify(talk)}`);
    if (talk?.noTrig) fail(talk.noTrig);
    const text = (talk.bodies || []).join(' | ');
    if (!/little guy|come-down-place|flapper/i.test(text)) fail(`little guy missing: ${text}`);
    if (/12346|remove this key|lamp|comfy|gnormadium|animate rock|slagilith/i.test(text)) {
      fail(`later leftover leaked: ${text}`);
    }
    const inv = talk.inv || [];
    if (inv.some(i => i.id === 4426 || /comfy mattress/i.test(i.name))) {
      fail(`comfy 4426 invented ${JSON.stringify(inv)}`);
    }
    if (inv.some(i => i.id === 4427 || /iron oxide/i.test(i.name))) {
      fail(`oxide 4427 invented ${JSON.stringify(inv)}`);
    }

    const tile = await worldTile(page);
    console.log('[osfrz] tile', tile);
    if (Math.abs((tile.x | 0) - STAND.x) > 10 || Math.abs((tile.z | 0) - STAND.z) > 10) {
      fail(`dest invented ${JSON.stringify(tile)}`);
    }
    const stage = await getServerVarQuiet(page, 'onesmallfavour');
    if (Number(stage) !== 20) fail(`onesmallfavour=${stage} (want 20)`);

    console.log(`RESULT PASS osfrz Rantz 19→20 stay camp user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
