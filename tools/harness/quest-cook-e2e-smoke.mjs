#!/usr/bin/env node
/**
 * SHIP e2e — Cook's Assistant start → complete. No setvar cookquest.
 * World-source egg / bucket / milk / pot / grain / mill. Tele is commute only.
 *
 * Anchors from rs2b0t src/bot/api/ai/quests/defs/cooksassistant.ts (274 Lumbridge).
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-cook-e2e \
 *     node tools/harness/quest-cook-e2e-smoke.mjs
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
const { username, password } = resolveAccount(rest, 'cke2e');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

/** rs2b0t Cook stop 3209,3215 — stand next to, not on. RfD smoke proved 3208,3215. */
const COOK = { x: 3208, z: 3215, level: 0 };
const EGG_PEN = { x: 3227, z: 3300, level: 0 };
const FARM_BUCKET = { x: 3225, z: 3294, level: 0 };
/** NPC cow field 3255,3288 is *not* milkable (mes: only dairy cows). Loc `fat_cow` 8689. */
const DAIRY_A = { x: 3253, z: 3275, level: 0 };
const DAIRY_B = { x: 3255, z: 3272, level: 0 };
const POT_SPAWN = { x: 3208, z: 3213, level: 0 };
const WHEAT = { x: 3158, z: 3300, level: 0 };
const MILL_BASE = { x: 3166, z: 3304, level: 0 };
const MILL_LADDER = { x: 3148, z: 3306, level: 0 };
const MILL_HOPPER_STAND = { x: 3166, z: 3308, level: 2 };
const HOPPER_TILE = { x: 3166, z: 3307 };
const HOPPER_CTRL = { x: 3166, z: 3305 };

async function talkNpc(page, npcName, prefer = [], iters = 80) {
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
          String(x?.name ?? '').toLowerCase().includes(String(name).toLowerCase())
        );
        if (n) ok = !!a.npcOp?.(n.index, 1);
      }
      await new Promise(res => setTimeout(res, 1200));
      const picks = [];
      const bodies = [];
      for (let i = 0; i < maxI; i++) {
        const body = r.chatBodyText?.() || '';
        if (body && (bodies.length === 0 || bodies[bodies.length - 1] !== body)) {
          bodies.push(body.slice(0, 200));
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
        await new Promise(res => setTimeout(res, 380));
        if ((r.modals?.()?.chat ?? -1) === -1 && i > 10) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(24).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 16), bodies: bodies.slice(0, 16), chat: chat.slice(0, 12) };
    },
    [npcName, prefer, iters]
  );
}

async function invHas(page, sub) {
  return page.evaluate(want => {
    const r = globalThis.__lc377?.reader;
    const inv = r?.inventory?.() ?? [];
    const w = String(want).toLowerCase();
    return inv.some(i => String(i?.name ?? '').toLowerCase().includes(w));
  }, sub);
}

async function invNames(page) {
  return page.evaluate(() => {
    const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
    return inv.map(i => String(i?.name ?? '?'));
  });
}

async function takeNamed(page, name, dist = 12) {
  return page.evaluate(
    ([n, d]) => {
      const a = globalThis.__lc377?.actions;
      return !!(a?.takeGround?.(n, d) || a?.takeGround?.(n.toLowerCase(), d));
    },
    [name, dist]
  );
}

async function opNamed(page, locName, action) {
  return page.evaluate(
    ([n, act]) => {
      const a = globalThis.__lc377?.actions;
      return !!(a?.opLoc?.(n, act, 16) || a?.opLoc?.(n, '', 16));
    },
    [locName, action]
  );
}

/** 377 `wheat_tall` 5583 is display Wheat / op2=Pick but has no `[oploc2]`. Prefer 313 / 5584 / 5585. */
async function pickWheat(page) {
  return page.evaluate(() => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    const list = r?.locs?.({ name: 'Wheat', maxDist: 16 }) ?? [];
    const skip = new Set([5583]);
    const hit = list.find(l => !skip.has(l.id | 0) && (l.ops || []).some(o => /pick/i.test(String(o ?? ''))));
    if (!hit) return { ok: false, err: 'no scripted wheat', seen: list.map(l => l.id) };
    const idx = (hit.ops || []).findIndex(o => /pick/i.test(String(o ?? '')));
    const ok = !!a?.opLocAt?.(hit.x, hit.z, 'Pick');
    return { ok, id: hit.id | 0, x: hit.x | 0, z: hit.z | 0, opIdx: idx };
  });
}

async function useOnNpc(page, item, npc) {
  return page.evaluate(
    ([it, np]) => {
      const a = globalThis.__lc377?.actions;
      return !!(a?.useHeldOnNpc?.(it, np) || a?.useHeldOnNpc?.(it.toLowerCase(), np));
    },
    [item, npc]
  );
}

async function useOnLoc(page, item, loc) {
  return page.evaluate(
    ([it, l]) => {
      const a = globalThis.__lc377?.actions;
      return !!(a?.useHeldOnLoc?.(it, l, 16) || a?.useHeldOnLoc?.(it.toLowerCase(), l, 16));
    },
    [item, loc]
  );
}

async function useOnLocExact(page, item, nameExact, wx, wz) {
  return page.evaluate(
    ([it, name, x, z]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const list = r?.locs?.({ maxDist: 16 }) ?? [];
      const loc = list.find(
        l => String(l.name ?? '') === name && (l.x | 0) === (x | 0) && (l.z | 0) === (z | 0)
      ) || list.find(l => String(l.name ?? '') === name);
      if (!loc) return { ok: false, err: 'loc missing', names: list.map(l => l.name) };
      const ok = !!a?.useHeldOnLoc?.(it, loc, 16);
      return { ok, id: loc.id | 0, name: loc.name, x: loc.x | 0, z: loc.z | 0 };
    },
    [item, nameExact, wx, wz]
  );
}

async function opLocExact(page, nameExact, action, wx, wz) {
  return page.evaluate(
    ([name, act, x, z]) => {
      const a = globalThis.__lc377?.actions;
      return !!a?.opLocAt?.(x, z, act);
    },
    [nameExact, action, wx, wz]
  );
}

async function worldTile(page) {
  return page.evaluate(() => {
    const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
    return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
  });
}

async function commute(page, tile, label) {
  console.log(`[cke2e] commute ${label}`, tile);
  if (!(await teleTo(page, tile, 2, 25_000))) fail(`tele ${label} failed`);
  await waitSceneReady(page, 15_000);
  await waitTicks(page, 4);
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[cke2e] ${base} user=${username} Cook's Assistant SHIP e2e`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`cke2e_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'energy', 200).catch(() => {});

    const before = await getServerVarQuiet(page, 'cookquest');
    console.log('[cke2e] cookquest start', before);
    if (Number(before) !== 0) fail(`cookquest=${before} want 0 (do not soft-start this e2e)`);

    await commute(page, COOK, 'cook');
    if (shot) await shot('01-cook');
    const start = await talkNpc(page, 'Cook', ["what's wrong", "yes, i'll help", 'yes']);
    console.log('[cke2e] start talk', JSON.stringify(start));
    if (!start?.ok) fail(`Talk Cook failed ${JSON.stringify(start)}`);
    if (start?.noTrig) fail(start.noTrig);
    const started = await getServerVarQuiet(page, 'cookquest');
    if (Number(started) !== 1) fail(`cookquest=${started} after start (want 1)`);
    if (shot) await shot('02-started');

    await commute(page, EGG_PEN, 'egg pen');
    let egg = await invHas(page, 'egg');
    for (let i = 0; i < 8 && !egg; i++) {
      const take = await takeNamed(page, 'Egg', 14);
      console.log('[cke2e] take egg', i, take);
      await waitTicks(page, 3);
      egg = await invHas(page, 'egg');
    }
    if (shot) await shot('03-egg');
    if (!egg) fail(`no Egg at ${JSON.stringify(EGG_PEN)} inv=${JSON.stringify(await invNames(page))}`);

    await commute(page, FARM_BUCKET, 'farm bucket');
    let bucket = await invHas(page, 'bucket');
    for (let i = 0; i < 6 && !bucket; i++) {
      const take = await takeNamed(page, 'Bucket', 12);
      console.log('[cke2e] take bucket', i, take);
      await waitTicks(page, 3);
      bucket = await invHas(page, 'bucket') && !(await invHas(page, 'bucket of milk'));
      if (await invHas(page, 'bucket')) break;
    }
    if (!(await invHas(page, 'bucket')) && !(await invHas(page, 'bucket of milk'))) {
      fail(`no Bucket at ${JSON.stringify(FARM_BUCKET)} inv=${JSON.stringify(await invNames(page))}`);
    }

    if (!(await invHas(page, 'bucket of milk'))) {
      // 377 dairy is loc fat_cow (Dairy Cow / Milk), not wandering Cow NPCs.
      await commute(page, DAIRY_A, 'dairy cow');
      let milk = false;
      for (const stand of [DAIRY_A, DAIRY_B]) {
        if (milk) break;
        await commute(page, stand, 'dairy stand');
        for (let i = 0; i < 6 && !milk; i++) {
          const milkOp =
            (await opNamed(page, 'Dairy Cow', 'Milk')) ||
            (await opNamed(page, 'Dairy cow', 'Milk')) ||
            (await useOnLoc(page, 'Bucket', 'Dairy Cow'));
          console.log('[cke2e] milk dairy', stand, i, milkOp);
          await waitTicks(page, 5);
          milk = await invHas(page, 'bucket of milk');
        }
      }
      if (shot) await shot('04-milk');
      if (!milk) fail(`no Bucket of milk after Dairy Cow Milk inv=${JSON.stringify(await invNames(page))}`);
    }

    await commute(page, POT_SPAWN, 'kitchen pot');
    let pot = await invHas(page, 'pot of flour') || (await invHas(page, 'pot'));
    for (let i = 0; i < 6 && !(await invHas(page, 'pot')) && !(await invHas(page, 'pot of flour')); i++) {
      const take = await takeNamed(page, 'Pot', 10);
      console.log('[cke2e] take pot', i, take);
      await waitTicks(page, 3);
    }
    pot = await invHas(page, 'pot of flour') || (await invHas(page, 'pot'));
    if (!pot) fail(`no Pot at ${JSON.stringify(POT_SPAWN)} inv=${JSON.stringify(await invNames(page))}`);

    if (!(await invHas(page, 'pot of flour'))) {
      await commute(page, WHEAT, 'wheat');
      let grain = await invHas(page, 'grain');
      for (let i = 0; i < 8 && !grain; i++) {
        const pick = await pickWheat(page);
        console.log('[cke2e] pick wheat', i, JSON.stringify(pick));
        await waitTicks(page, 10);
        grain = await invHas(page, 'grain');
      }
      if (!grain) fail(`no Grain after Wheat Pick inv=${JSON.stringify(await invNames(page))}`);

      await commute(page, MILL_LADDER, 'mill ladder');
      let tile = await worldTile(page);
      if ((tile.level | 0) !== 2) {
        const climb = await opNamed(page, 'Ladder', 'Climb-up');
        console.log('[cke2e] mill climb L0', climb);
        await waitTicks(page, 8);
        tile = await worldTile(page);
        if ((tile.level | 0) === 1) {
          const mid = (await opNamed(page, 'Ladder', 'Climb-up')) || (await opNamed(page, 'Ladder', 'Climb'));
          console.log('[cke2e] mill climb L1', mid);
          await waitTicks(page, 8);
          tile = await worldTile(page);
        }
      }
      if ((tile.level | 0) !== 2) {
        console.log('[cke2e] mill ladder residual — commute hopper stand', tile);
        await commute(page, MILL_HOPPER_STAND, 'hopper stand');
      } else {
        await commute(page, MILL_HOPPER_STAND, 'hopper stand');
      }
      tile = await worldTile(page);
      if ((tile.level | 0) !== 2) fail(`not on mill L2 ${JSON.stringify(tile)}`);

      let filled = false;
      for (let i = 0; i < 5 && !filled; i++) {
        const fill = await useOnLocExact(page, 'Grain', 'Hopper', HOPPER_TILE.x, HOPPER_TILE.z);
        console.log('[cke2e] hopper fill', i, JSON.stringify(fill));
        await waitTicks(page, 8);
        filled = !(await invHas(page, 'grain'));
      }
      if (!filled) fail(`grain still in inv after Hopper use ${JSON.stringify(await invNames(page))}`);

      const grind = await opLocExact(page, 'Hopper controls', 'Operate', HOPPER_CTRL.x, HOPPER_CTRL.z);
      console.log('[cke2e] hopper operate', grind);
      await waitTicks(page, 16);
      await commute(page, MILL_BASE, 'mill bin');
      let empty = false;
      for (let i = 0; i < 5 && !empty; i++) {
        const op = (await opNamed(page, 'Flour bin', 'Empty')) || (await opLocExact(page, 'Flour bin', 'Empty', 3166, 3306));
        console.log('[cke2e] flour bin', i, op);
        await waitTicks(page, 6);
        empty = await invHas(page, 'pot of flour');
      }
      if (shot) await shot('05-flour');
      if (!(await invHas(page, 'pot of flour'))) {
        fail(`no Pot of flour after mill inv=${JSON.stringify(await invNames(page))}`);
      }
    }

    const kit = await invNames(page);
    console.log('[cke2e] kit', kit);
    if (!(await invHas(page, 'egg'))) fail('lost Egg');
    if (!(await invHas(page, 'bucket of milk'))) fail('lost milk');
    if (!(await invHas(page, 'pot of flour'))) fail('lost flour');

    await commute(page, COOK, 'cook return');
    const fin = await talkNpc(page, 'Cook', [], 100);
    console.log('[cke2e] finish talk', JSON.stringify(fin));
    if (fin?.noTrig) fail(fin.noTrig);
    if (shot) await shot('06-complete');
    const done = await getServerVarQuiet(page, 'cookquest');
    if (Number(done) !== 2) fail(`cookquest=${done} after hand-in (want 2)`);

    const end = await worldTile(page);
    if (Math.abs((end.x | 0) - COOK.x) > 12 || Math.abs((end.z | 0) - COOK.z) > 12) {
      fail(`dest invented ${JSON.stringify(end)}`);
    }

    console.log(`RESULT PASS cke2e Cook's Assistant 0→1→2 no dest user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
