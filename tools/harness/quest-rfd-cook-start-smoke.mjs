#!/usr/bin/env node
/**
 * Recipe for Disaster — Another Cook's start (cook 278 after Assistant).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-rfd-cook-start-smoke.mjs
 *
 * Soft: setvar cookquest 2 + setstat cooking 10.
 * Product: Talk-to refuse (no write) → accept hundred_main_quest_var=1 + 100 coins.
 * Do not open leftover 18436. Do not rewrite Assistant.
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
  setStats,
  setWorldSpeed,
  teleTo,
  waitSceneReady,
  waitTicks
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'rfdck');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3208, z: 3215, level: 0 };
const COOK_ID = 278;
const HUB_IF = 18436;
const COINS = 995;

async function talkNpc(page, npcName, prefer = [], iters = 120) {
  return page.evaluate(
    async ([name, pref, maxI]) => {
      const h = globalThis.__lc377;
      const a = h?.actions;
      const r = h?.reader;
      if (!a || !r) return { error: 'no abi' };

      const getOpts = () => {
        try {
          return (r.chatOptions?.() ?? [])
            .map(o => (typeof o === 'string' ? o : o?.text))
            .filter(Boolean);
        } catch {
          return [];
        }
      };

      let ok = !!a.talkNpc?.(name);
      if (!ok) {
        const n = (r.npcs?.() ?? []).find(x =>
          String(x?.name ?? '')
            .toLowerCase()
            .includes(String(name).toLowerCase())
        );
        if (n) ok = !!a.npcOp?.(n.index, 1);
      }
      await new Promise(res => setTimeout(res, 1200));

      const picks = [];
      for (let i = 0; i < maxI; i++) {
        const opts = getOpts();
        if (opts.length) {
          const low = opts.map(o => String(o).toLowerCase());
          let pick = 0;
          for (const p of pref) {
            const j = low.findIndex(o => o.includes(String(p).toLowerCase()));
            if (j >= 0) {
              pick = j;
              break;
            }
          }
          picks.push(opts[pick]);
          a.chooseOption?.([opts[pick]]);
        } else {
          a.continueDialog?.();
          a.dismissModalMessage?.();
        }
        await new Promise(res => setTimeout(res, 380));
        if ((r.modals?.()?.chat ?? -1) === -1 && i > 8) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(36).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 16), chat: chat.slice(0, 16) };
    },
    [npcName, prefer, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[rfdck] ${base} user=${username} (Cook 278 Another Cook's)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`rfdck_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await setStats(page, { cooking: 10 });
    for (const c of ['setvar cookquest 2', 'setvar 100intro 0']) {
      await cheatQuiet(page, c, 400);
    }

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Cook stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const r = globalThis.__lc377?.reader;
      const npcs = r?.npcs?.() ?? [];
      const hit = npcs.find(
        x => (x.id | 0) === id || /^cook$/i.test(x?.name || '')
      );
      return {
        hit: hit
          ? { id: hit.id, name: hit.name, x: hit.x, z: hit.z, ops: hit.ops }
          : null,
        names: npcs.map(x => `${x?.name}@${x?.x},${x?.z}`).slice(0, 12)
      };
    }, COOK_ID);
    console.log('[rfdck] npc', JSON.stringify(seen));
    if (shot) await shot('01-cook');
    const ok = (seen?.hit?.id | 0) === COOK_ID || /^cook$/i.test(String(seen?.hit?.name || ''));
    if (!ok) fail(`Cook 278 not next to stand: ${JSON.stringify(seen)}`);

    const refuse = await talkNpc(
      page,
      'Cook',
      ['any other quests', "no thanks, i don't want"],
      80
    );
    console.log('[rfdck] refuse', JSON.stringify({ ok: refuse.ok, noTrig: refuse.noTrig, picks: refuse.picks }));
    if (shot) await shot('02-refuse');
    if (refuse?.error) fail(`refuse talk abi ${refuse.error}`);
    if (!refuse?.ok) fail(`Cook Talk-to failed ${JSON.stringify(refuse)}`);
    if (refuse?.noTrig) fail(refuse.noTrig);
    const afterRefuse = await getServerVarQuiet(page, 'hundred_main_quest_var');
    console.log(`[rfdck] after refuse hundred_main_quest_var=${afterRefuse}`);
    if (Number(afterRefuse) !== 0) fail(`refuse wrote hundred_main_quest_var=${afterRefuse} (want 0)`);

    const accept = await talkNpc(
      page,
      'Cook',
      ['any other quests', 'what seems to be the problem', 'yes'],
      140
    );
    console.log('[rfdck] accept', JSON.stringify({ ok: accept.ok, noTrig: accept.noTrig, picks: accept.picks }));
    if (shot) await shot('03-accept');
    if (!accept?.ok) fail(`Cook accept Talk-to failed ${JSON.stringify(accept)}`);
    if (accept?.noTrig) fail(accept.noTrig);

    const stage = await getServerVarQuiet(page, 'hundred_main_quest_var');
    const coins = await page.evaluate(id => {
      const items = globalThis.__lc377?.reader?.inventory?.() ?? [];
      const hit = items.find(x => (x.id | 0) === id || /coins/i.test(x?.name || ''));
      return { n: hit?.num ?? hit?.count ?? 0, ids: items.map(x => x.id).slice(0, 8) };
    }, COINS);
    const overlay = await page.evaluate(() => {
      const m = globalThis.__lc377?.reader?.modals?.() ?? {};
      return { overlay: m.overlay ?? -1, main: m.main ?? -1 };
    });
    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    console.log(
      `[rfdck] after accept var=${stage} coins=${JSON.stringify(coins)} if=${JSON.stringify(overlay)} tile=${JSON.stringify(tile)}`
    );
    if (Number(stage) !== 1) fail(`accept did not write hundred_main_quest_var=1 (got ${stage})`);
    if (Number(stage) === 4) fail('wrote portal var 4 — feast not this slice');
    if ((coins.n | 0) < 100) fail(`accept did not grant 100 coins: ${JSON.stringify(coins)}`);
    if (Number(overlay.main) === HUB_IF || Number(overlay.overlay) === HUB_IF) {
      fail('opened leftover recipe_for_disaster 18436 from Cook Talk-to');
    }
    if (
      !tile ||
      Math.abs((tile.x | 0) - STAND.x) > 10 ||
      Math.abs((tile.z | 0) - STAND.z) > 10 ||
      (tile.level | 0) !== 0
    ) {
      fail(`accept left Lumbridge kitchen ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS rfdck cook=${COOK_ID} refuse=0 accept hundred_main_quest_var=${stage} coins=${coins.n} kitchen=${tile.x},${tile.z} user=${username}`
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
