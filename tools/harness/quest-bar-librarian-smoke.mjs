#!/usr/bin/env node
/**
 * BAR Librarian first Talk-to. Stay dwarfrock_quest 10. Never 110. No dest.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-bar-lib \
 *     node tools/harness/quest-bar-librarian-smoke.mjs
 *
 * Soft dwarfrock_quest 10. Stand 2858,10224 S of 2858,10225.
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
const { username, password } = resolveAccount(rest, 'barlib');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2858, z: 10224, level: 0 };
const LIB_ID = 2165;

async function talkNpc(page, npcName, iters = 140) {
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
      for (let i = 0; i < maxI; i++) {
        const body = r.chatBodyText?.() || '';
        if (body && (bodies.length === 0 || bodies[bodies.length - 1] !== body)) {
          bodies.push(body.slice(0, 240));
        }
        if (body && body === lastContinuedBody) {
          await sleep(300);
          const openWait = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
          if (!openWait && i > 20) break;
          continue;
        }
        a.continueDialog?.();
        lastContinuedBody = body;
        await sleep(450);
        const open = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
        if (!open && bodies.length) break;
        if (!open && i > 120) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, bodies: bodies.slice(0, 36) };
    },
    [npcName, iters]
  );
}

async function worldTile(page) {
  return page.evaluate(() => {
    const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
    return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[barlib] ${base} user=${username} (Librarian Talk-to)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`barlib_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar dwarfrock_quest 10', 400);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele library stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-lib');

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /^librarian$/i.test(x?.name || ''));
      return { hit: hit ? { id: hit.id, name: hit.name } : null };
    }, LIB_ID);
    console.log('[barlib] npc', JSON.stringify(seen));
    if ((seen?.hit?.id | 0) !== LIB_ID && !/^librarian$/i.test(String(seen?.hit?.name || ''))) {
      fail(`Librarian 2165 missing ${JSON.stringify(seen)}`);
    }

    const talk = await talkNpc(page, 'Librarian', 140);
    console.log('[barlib] talk', JSON.stringify(talk));
    if (shot) await shot('02-talk');
    if (!talk?.ok) fail(`Talk-to failed ${JSON.stringify(talk)}`);
    if (talk?.noTrig) fail(talk.noTrig);
    const text = (talk.bodies || []).join(' | ');
    if (!/impenetrable|dondakan|wemund|wrench/i.test(text)) fail(`rock/Wemund missing: ${text}`);
    if (/schematic|cannon|gold helmet|arzinian|rolad's missing/i.test(text)) fail(`later leftover leaked: ${text}`);

    const tile = await worldTile(page);
    console.log('[barlib] tile', tile);
    if (Math.abs((tile.x | 0) - 2858) > 8 || Math.abs((tile.z | 0) - 10224) > 8) {
      fail(`dest invented ${JSON.stringify(tile)}`);
    }
    const stage = await getServerVarQuiet(page, 'dwarfrock_quest');
    if (Number(stage) !== 10) fail(`wrote dwarfrock_quest=${stage}`);
    if (Number(stage) === 110) fail('wrote 110');

    console.log(`RESULT PASS barlib Librarian Talk-to stay 10 no dest user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
