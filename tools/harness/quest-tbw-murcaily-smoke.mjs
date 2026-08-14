#!/usr/bin/env node
/**
 * TBW Cleanup Murcaily first Talk-to (9 Aug 2005). No dest.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-tbw-murcaily \
 *     node tools/harness/quest-tbw-murcaily-smoke.mjs
 *
 * Stand 2815,3083 W of Murcaily 2816,3083.
 */
import {
  assertEnginePackHealth,
  boot,
  createShotRunDir,
  fail,
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
const { username, password } = resolveAccount(rest, 'tbwmu');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2815, z: 3083, level: 0 };
const MURC_IDS = new Set([2528, 2529, 2530]);

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
            const j = raw.findIndex(o =>
              String(o?.text ?? o ?? '')
                .toLowerCase()
                .includes(w)
            );
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
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 12), bodies: bodies.slice(0, 36) };
    },
    [npcName, prefer, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[tbwmu] ${base} user=${username} (Murcaily first Talk-to)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`tbwmu_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Murcaily stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 8);

    const seen = await page.evaluate(ids => {
      const want = new Set(ids);
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => want.has(x.id | 0) || /murcaily/i.test(x?.name || ''));
      return { hit: hit ? { id: hit.id, name: hit.name } : null };
    }, [...MURC_IDS]);
    console.log('[tbwmu] npc', JSON.stringify(seen));
    if (shot) await shot('01-murcaily');
    if (!/murcaily/i.test(String(seen?.hit?.name || '')) && !MURC_IDS.has(seen?.hit?.id | 0)) {
      fail(`Murcaily not next to stand: ${JSON.stringify(seen)}`);
    }

    const talk = await talkNpc(page, 'Murcaily', ['what do you do here'], 120);
    console.log('[tbwmu] talk', JSON.stringify(talk));
    if (shot) await shot('02-talk');
    if (!talk?.ok) fail(`Talk-to failed ${JSON.stringify(talk)}`);
    if (talk?.noTrig) fail(talk.noTrig);
    const text = (talk.bodies || []).join(' | ');
    if (!/trufitus/i.test(text)) fail(`Trufitus greeting missing: ${text}`);
    if (!/hardwood grove/i.test(text)) fail(`grove line missing: ${text}`);

    const tile = await page.evaluate(() => {
      const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
      return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
    });
    if (Math.abs((tile.x | 0) - 2815) > 4 || Math.abs((tile.z | 0) - 3083) > 4) {
      fail(`dest invented ${JSON.stringify(tile)}`);
    }

    console.log(`RESULT PASS tbwmu Murcaily first Talk-to no dest user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
