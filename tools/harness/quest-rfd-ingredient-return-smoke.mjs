#!/usr/bin/env node
/**
 * Recipe for Disaster — Another Cook's ingredient return.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-rfd-ingredient-return-smoke.mjs
 *
 * Soft: cookquest 2 + hundred_main=1 + give the four (labeled).
 * Product: missing refuse (no write) → all-four hand-in 1→2. No feast / 18436 / portal 4.
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
const { username, password } = resolveAccount(rest, 'rfding');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3208, z: 3215, level: 0 };
const COOK_ID = 278;
const HUB_IF = 18436;
const FOUR = {
  eye_of_newt: 221,
  greenmans_ale: 1909,
  rotten_tomato: 2518,
  hundred_fruit_blast: 7497
};

async function talkNpc(page, npcName, prefer = [], iters = 100) {
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
      await new Promise(res => setTimeout(res, 1600));
      if (!r.dialogOpen?.()) {
        const n = (r.npcs?.() ?? []).find(x =>
          String(x?.name ?? '')
            .toLowerCase()
            .includes(String(name).toLowerCase())
        );
        if (n) ok = !!a.npcOp?.(n.index, 1) || ok;
        await new Promise(res => setTimeout(res, 1200));
      }

      const picks = [];
      const bodies = [];
      for (let i = 0; i < maxI; i++) {
        const body = r.chatBodyText?.() || '';
        if (body && (bodies.length === 0 || bodies[bodies.length - 1] !== body)) {
          bodies.push(body.slice(0, 240));
        }
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
        await new Promise(res => setTimeout(res, 420));
        const open = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
        if (!open && i > 24 && (picks.length || bodies.length)) break;
        if (!open && i > 40) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(36).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return {
        ok,
        noTrig: noTrig ?? null,
        picks: picks.slice(0, 16),
        bodies: bodies.slice(0, 16)
      };
    },
    [npcName, prefer, iters]
  );
}

async function invFour(page) {
  return page.evaluate(ids => {
    const items = globalThis.__lc377?.reader?.inventory?.() ?? [];
    const has = name => items.some(x => (x.id | 0) === ids[name]);
    return {
      newt: has('eye_of_newt'),
      ale: has('greenmans_ale'),
      tomato: has('rotten_tomato'),
      blast: has('hundred_fruit_blast'),
      ids: items.map(x => x.id).slice(0, 16)
    };
  }, FOUR);
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[rfding] ${base} user=${username} (Cook 278 ingredient return)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`rfding_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await setStats(page, { cooking: 10 });
    for (const c of ['setvar cookquest 2', 'setvar hundred_main_quest_var 1']) {
      await cheatQuiet(page, c, 400);
    }

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Cook stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const r = globalThis.__lc377?.reader;
      const npcs = r?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /^cook$/i.test(x?.name || ''));
      return {
        hit: hit
          ? { id: hit.id, name: hit.name, x: hit.x, z: hit.z, ops: hit.ops }
          : null,
        names: npcs.map(x => `${x?.name}@${x?.x},${x?.z}`).slice(0, 8)
      };
    }, COOK_ID);
    console.log('[rfding] npc', JSON.stringify(seen));
    if (shot) await shot('01-cook');
    if ((seen?.hit?.id | 0) !== COOK_ID && !/^cook$/i.test(String(seen?.hit?.name || ''))) {
      fail(`Cook 278 not next to stand: ${JSON.stringify(seen)}`);
    }

    const missing = await talkNpc(page, 'Cook', ['okay then'], 90);
    console.log(
      '[rfding] missing',
      JSON.stringify({ ok: missing.ok, noTrig: missing.noTrig, picks: missing.picks, bodies: missing.bodies })
    );
    if (shot) await shot('02-missing');
    if (missing?.error) fail(`missing talk abi ${missing.error}`);
    if (!missing?.ok) fail(`Cook missing Talk-to failed ${JSON.stringify(missing)}`);
    if (missing?.noTrig) fail(missing.noTrig);
    const afterMiss = await getServerVarQuiet(page, 'hundred_main_quest_var');
    console.log(`[rfding] after missing hundred_main_quest_var=${afterMiss}`);
    if (Number(afterMiss) !== 1) fail(`missing wrote hundred_main_quest_var=${afterMiss} (want 1)`);

    for (const name of Object.keys(FOUR)) {
      await cheatQuiet(page, `give ${name} 1`, 500);
    }
    const pre = await invFour(page);
    console.log('[rfding] pre-handin', JSON.stringify(pre));
    if (!pre.newt || !pre.ale || !pre.tomato || !pre.blast) {
      fail(`give four failed: ${JSON.stringify(pre)}`);
    }

    const handin = await talkNpc(page, 'Cook', [], 90);
    console.log(
      '[rfding] handin',
      JSON.stringify({ ok: handin.ok, noTrig: handin.noTrig, bodies: handin.bodies })
    );
    if (shot) await shot('03-handin');
    if (!handin?.ok) fail(`hand-in Talk-to failed ${JSON.stringify(handin)}`);
    if (handin?.noTrig) fail(handin.noTrig);

    const stage = await getServerVarQuiet(page, 'hundred_main_quest_var');
    const after = await invFour(page);
    const overlay = await page.evaluate(() => {
      const m = globalThis.__lc377?.reader?.modals?.() ?? {};
      return { overlay: m.overlay ?? -1, main: m.main ?? -1 };
    });
    console.log(
      `[rfding] after handin var=${stage} inv=${JSON.stringify(after)} if=${JSON.stringify(overlay)}`
    );
    if (Number(stage) !== 2) fail(`hand-in did not write hundred_main_quest_var=2 (got ${stage})`);
    if (Number(stage) === 4) fail('wrote portal var 4 — feast not this slice');
    if (after.newt || after.ale || after.tomato || after.blast) {
      fail(`hand-in left ingredients: ${JSON.stringify(after)}`);
    }
    if (Number(overlay.main) === HUB_IF || Number(overlay.overlay) === HUB_IF) {
      fail('opened leftover recipe_for_disaster 18436 from Cook Talk-to');
    }

    const nag = await talkNpc(page, 'Cook', [], 70);
    console.log('[rfding] nag', JSON.stringify({ ok: nag.ok, bodies: nag.bodies }));
    if (shot) await shot('04-nag');
    const afterNag = await getServerVarQuiet(page, 'hundred_main_quest_var');
    if (Number(afterNag) !== 2) fail(`nag wrote hundred_main_quest_var=${afterNag} (want 2)`);

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (
      !tile ||
      Math.abs((tile.x | 0) - STAND.x) > 10 ||
      Math.abs((tile.z | 0) - STAND.z) > 10 ||
      (tile.level | 0) !== 0
    ) {
      fail(`return left Lumbridge kitchen ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS rfding cook=${COOK_ID} missing=1 handin hundred_main_quest_var=${stage} kitchen=${tile.x},${tile.z} user=${username}`
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
