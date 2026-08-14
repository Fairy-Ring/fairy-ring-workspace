#!/usr/bin/env node
/**
 * BAR Dondakan after-book Talk-to. Stay dwarfrock_quest 10. Never 110. No dest.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-bar-donbook \
 *     node tools/harness/quest-bar-dondakan-book-smoke.mjs
 *
 * Soft dwarfrock_quest 10 + give dwarf_rock_book. Stand 2824,10167.
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
const { username, password } = resolveAccount(rest, 'bardb');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2824, z: 10167, level: 0 };
const DON_ID = 1837;

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
        if (!open && i > 120) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks, bodies: bodies.slice(0, 40) };
    },
    [npcName, prefer, iters]
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
  console.log(`[bardb] ${base} user=${username} (Dondakan after-book)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`bardb_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar dwarfrock_quest 10', 400);
    await cheatQuiet(page, 'give dwarf_rock_book 1', 300);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Dondakan stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-rock');

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /dondakan/i.test(x?.name || ''));
      return { hit: hit ? { id: hit.id, name: hit.name } : null };
    }, DON_ID);
    console.log('[bardb] npc', JSON.stringify(seen));
    if ((seen?.hit?.id | 0) !== DON_ID) fail(`Dondakan 1837 missing ${JSON.stringify(seen)}`);
    if (/noaxe|110/i.test(String(seen?.hit?.name || ''))) fail(`noaxe face ${JSON.stringify(seen)}`);

    const talk = await talkNpc(page, 'Dondakan', ['back later'], 140);
    console.log('[bardb] talk', JSON.stringify(talk));
    if (shot) await shot('02-talk');
    if (!talk?.ok) fail(`Talk-to failed ${JSON.stringify(talk)}`);
    if (talk?.noTrig) fail(talk.noTrig);
    const text = (talk.bodies || []).join(' | ');
    if (!/demonic spirit|lined with gold|struck gold/i.test(text)) fail(`spirit/gold missing: ${text}`);
    if (/librarian|wemund|schematic|gold helmet|arzinian|fire you/i.test(text)) {
      fail(`later leftover leaked: ${text}`);
    }

    const tile = await worldTile(page);
    console.log('[bardb] tile', tile);
    if (Math.abs((tile.x | 0) - STAND.x) > 8 || Math.abs((tile.z | 0) - STAND.z) > 8) {
      fail(`dest invented ${JSON.stringify(tile)}`);
    }
    const stage = await getServerVarQuiet(page, 'dwarfrock_quest');
    if (Number(stage) !== 10) fail(`wrote dwarfrock_quest=${stage}`);
    if (Number(stage) === 110) fail('wrote 110');

    const seen2 = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id);
      return hit ? { id: hit.id, name: hit.name } : null;
    }, DON_ID);
    if (!seen2) fail('Dondakan vanished (110/hole)');

    console.log(`RESULT PASS bardb Dondakan after-book stay 10 no dest user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
