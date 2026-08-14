#!/usr/bin/env node
/**
 * SHIP e2e — Witch's Potion start → complete. No setvar hetty.
 * World-source onion / rats tail / eye of newt / burnt meat. Tele commute only.
 *
 * Anchors from rs2b0t src/bot/api/ai/quests/defs/hetty.ts.
 * 377: Hetty 307 @ 2968,3206; onion loc 3366 (op2=Pick); Rimmington rats are
 * rat_indoors 2682 (tail bind adfda4b9a; outdoor 47 fallback); Betty Trade;
 * burn on rimmington_poor_range 9682 only (cooking_oven bind); cauldron 2024 Drink.
 * give coins is labeled shop prep only. Do not give ingredients / setvar hetty.
 * If 9682 still notrig after Use, FAIL that mes. Do not Drink cauldron to cook.
 * Ignore stale notrig leftover in r.chat from a prior account/phase.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-hetty-e2e2 \
 *     node tools/harness/quest-hetty-e2e-smoke.mjs
 */
import {
  assertEnginePackHealth,
  boot,
  cheatQuiet,
  createShotRunDir,
  fail,
  getServerVarQuiet,
  giveItems,
  installScreenshotBridge,
  launchBrowser,
  mainlandAccount,
  parseArgs,
  resolveAccount,
  setWorldSpeed,
  teleTo,
  waitSceneReady,
  waitServerVar,
  waitTicks
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'he2e');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

/** jm2 m46_50 NPC `0 24 6: 307` → 2968,3206. Stand next to (rs2b0t 2970,3207). */
const HETTY = { x: 2970, z: 3207, level: 0 };
const HETTY_NPC_ID = 307;
/** LOC `0 23 5: 2024` → hettycauldron. Drink From after hand-in. */
const CAULDRON = { x: 2968, z: 3205, level: 0 };
const CAULDRON_LOC = { x: 2967, z: 3205 };
const CAULDRON_ID = 2024;
/** LOC `0 26 9: 9682` → rimmington_poor_range @ 2970,3209. forceapproach=east. */
const RANGE = { x: 2972, z: 3209, level: 0 };
const RANGE_ID = 9682;
/** onion 3366 field. rs2b0t 2950,3251 = m46_50 `0 6 51: 3366`. Stand next to. */
const ONION = { x: 2951, z: 3251, level: 0 };
const ONION_ID = 3366;
/** rat_indoors 2682 cluster. rs2b0t 2955,3204. */
const RATS_IN = { x: 2955, z: 3204, level: 0 };
const RAT_IN_ID = 2682;
/** Outdoor rat 47 west of onion field. m45_50 `0 43 51: 47` → 2923,3251. */
const RATS_OUT = { x: 2923, z: 3251, level: 0 };
const RAT_OUT_ID = 47;
/** Betty 583 m47_50 `0 4 59: 583` → 3012,3259. Stand next to. */
const BETTY = { x: 3011, z: 3260, level: 0 };
const BETTY_ID = 583;
/** Wydin 557 m47_50 `0 6 4: 557` → 3014,3204. */
const WYDIN = { x: 3013, z: 3204, level: 0 };
const WYDIN_ID = 557;

const SHOP_ROOT = 3824;
const SHOP_INV = 3900;
const EYE_ID = 221;
const RAW_BEEF_ID = 2132;
const COOKX_IF = 1743;
const COOKX_ONE = 13720;
const SHOP_COINS = 50;

async function talkNpc(page, spec, prefer = [], iters = 80) {
  return page.evaluate(
    async ([want, pref, maxI]) => {
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
      const npcs = r.npcs?.() ?? [];
      const n =
        (want.id != null ? npcs.find(x => (x.id | 0) === (want.id | 0)) : null) ||
        npcs.find(x =>
          String(x?.name ?? '')
            .toLowerCase()
            .includes(String(want.name ?? '').toLowerCase())
        );
      let ok = false;
      if (n) ok = !!a.npcOp?.(n.index, 1);
      if (!ok && want.name) ok = !!a.talkNpc?.(want.name);
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
      return {
        ok,
        id: n?.id ?? null,
        noTrig: noTrig ?? null,
        picks: picks.slice(0, 16),
        bodies: bodies.slice(0, 16),
        chat: chat.slice(0, 12)
      };
    },
    [spec, prefer, iters]
  );
}

function invNameMatch(name, want) {
  const n = String(name ?? '').toLowerCase();
  const w = String(want).toLowerCase();
  if (w === 'onion') return n === 'onion';
  if (w === 'rats tail' || w === "rat's tail" || w === 'tail') {
    return n.includes('tail') && n.includes('rat');
  }
  if (w === 'eye of newt' || w === 'newt') return n.includes('eye of newt');
  if (w === 'burnt meat') return n.includes('burnt meat');
  if (w === 'cooked meat') return n.includes('cooked meat') && !n.includes('burnt');
  if (w === 'raw beef') return n.includes('raw beef');
  if (w === 'coins') return n === 'coins' || n === 'coin';
  return n.includes(w);
}

async function invCount(page, sub) {
  return page.evaluate(
    ([want]) => {
      const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
      const w = String(want).toLowerCase();
      return inv
        .filter(i => {
          const n = String(i?.name ?? '').toLowerCase();
          if (w === 'onion') return n === 'onion';
          if (w === 'rats tail' || w === "rat's tail" || w === 'tail') {
            return n.includes('tail') && n.includes('rat');
          }
          if (w === 'eye of newt' || w === 'newt') return n.includes('eye of newt');
          if (w === 'burnt meat') return n.includes('burnt meat');
          if (w === 'cooked meat') return n.includes('cooked meat') && !n.includes('burnt');
          if (w === 'raw beef') return n.includes('raw beef');
          if (w === 'coins') return n === 'coins' || n === 'coin';
          return n.includes(w);
        })
        .reduce((n, i) => n + (i.count | 0 || 1), 0);
    },
    [sub]
  );
}

async function invHas(page, sub) {
  return (await invCount(page, sub)) > 0;
}

async function invNames(page) {
  return page.evaluate(() => {
    const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
    return inv.map(i => `${i?.name ?? '?'}x${i?.count | 0 || 1}`);
  });
}

async function worldTile(page) {
  return page.evaluate(() => {
    const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
    return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
  });
}

async function recentChat(page, n = 20) {
  return page.evaluate(count => {
    const r = globalThis.__lc377?.reader;
    if (typeof r?.chat !== 'function') return [];
    return r.chat(count).map(c => String(c?.text ?? ''));
  }, n);
}

async function listNpcs(page) {
  return page.evaluate(() => {
    const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
    return npcs.slice(0, 20).map(n => ({
      id: n.id | 0,
      name: n.name,
      d: n.distance | 0,
      x: n.tile?.x | 0,
      z: n.tile?.z | 0,
      combat: !!n.inCombat
    }));
  });
}

async function listLocs(page) {
  return page.evaluate(() => {
    const locs = globalThis.__lc377?.reader?.locs?.({ maxDist: 16 }) ?? [];
    return locs.slice(0, 24).map(l => ({
      id: l.id | 0,
      name: l.name,
      ops: l.ops || [],
      x: l.x | 0,
      z: l.z | 0,
      d: l.distance | 0
    }));
  });
}

async function listGround(page) {
  return page.evaluate(() => {
    const g = globalThis.__lc377?.reader?.groundItems?.({ maxDist: 14 }) ?? [];
    return g.slice(0, 16).map(i => ({
      id: i.id | 0,
      name: i.name,
      n: i.count | 0,
      x: i.x | i.wx | 0,
      z: i.z | i.wz | 0,
      d: i.distance | 0,
      ops: i.ops || []
    }));
  });
}

async function dumpState(page, label) {
  const tile = await worldTile(page);
  const inv = await invNames(page);
  const chat = await recentChat(page, 16);
  const hetty = await getServerVarQuiet(page, 'hetty').catch(() => null);
  const npcs = await listNpcs(page);
  const locs = await listLocs(page);
  const ground = await listGround(page);
  console.log(
    `[he2e] dump ${label}`,
    JSON.stringify({ tile, hetty, inv, chat, npcs, locs, ground })
  );
  return { tile, inv, chat, hetty, npcs, locs, ground };
}

async function commute(page, tile, label) {
  console.log(`[he2e] commute ${label}`, tile);
  if (!(await teleTo(page, tile, 2, 25_000))) fail(`tele ${label} failed`);
  await waitSceneReady(page, 15_000);
  await waitTicks(page, 4);
}

async function dismiss(page) {
  await page.evaluate(() => {
    const a = globalThis.__lc377?.actions;
    a?.continueDialog?.();
    a?.dismissModalMessage?.();
    a?.closeModal?.();
  });
}

async function pickOnion(page) {
  return page.evaluate(wantId => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    if (!a || !r) return { ok: false, err: 'no abi' };
    const list = r.locs?.({ maxDist: 16 }) ?? [];
    const hit = list
      .filter(
        l =>
          (l.id | 0) === (wantId | 0) &&
          (l.ops || []).some(o => /pick/i.test(String(o ?? '')))
      )
      .sort((x, y) => (x.distance | 0) - (y.distance | 0))[0];
    if (!hit) {
      return {
        ok: false,
        err: 'no onion loc',
        seen: list.map(l => `${l.name}#${l.id}@${l.x},${l.z} ops=${(l.ops || []).join('/')}`)
      };
    }
    const ok = !!(a.opLocAt?.(hit.x, hit.z, 'Pick') || a.opLoc?.(hit, 'Pick', 16));
    return {
      ok,
      id: hit.id | 0,
      name: hit.name,
      x: hit.x | 0,
      z: hit.z | 0,
      d: hit.distance | 0,
      ops: hit.ops || []
    };
  }, ONION_ID);
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

async function attackRat(page, ids) {
  return page.evaluate(wantIds => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    if (!a || !r) return { ok: false, err: 'no abi' };
    const want = new Set(wantIds);
    const npcs = r.npcs?.() ?? [];
    const rats = npcs
      .filter(n => want.has(n.id | 0) && !n.inCombat)
      .sort((x, y) => (x.distance | 0) - (y.distance | 0));
    const n = rats[0] || npcs.find(x => want.has(x.id | 0));
    if (!n) {
      return {
        ok: false,
        err: 'no rat',
        seen: npcs.slice(0, 12).map(x => `${x.name}#${x.id}@${x.tile?.x},${x.tile?.z}`)
      };
    }
    const named = !!a.attackNpc?.(n.name);
    const op = !!a.npcOp?.(n.index, 2);
    return { ok: named || op, named, op, id: n.id | 0, index: n.index, d: n.distance | 0 };
  }, ids);
}

async function openTrade(page, npcId, npcName) {
  return page.evaluate(
    async ([id, name, shopRoot]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a || !r) return { error: 'no abi' };
      const n =
        (r.npcs?.() ?? []).find(x => (x.id | 0) === (id | 0)) ||
        (r.npcs?.() ?? []).find(x =>
          String(x?.name ?? '')
            .toLowerCase()
            .includes(String(name).toLowerCase())
        );
      if (!n) {
        return {
          error: 'no npc',
          names: (r.npcs?.() ?? []).map(x => `${x.name}#${x.id}`).slice(0, 12)
        };
      }
      const ok = !!a.npcOp?.(n.index, 3);
      const hits = [];
      for (let i = 0; i < 24; i++) {
        const m = r.modals?.() ?? {};
        hits.push(m.main ?? -1);
        if ((m.main ?? -1) === shopRoot) {
          return { ok, id: n.id | 0, name: n.name, main: m.main };
        }
        await new Promise(res => setTimeout(res, 250));
      }
      const m = r.modals?.() ?? {};
      return { ok, id: n.id | 0, name: n.name, main: m.main ?? -1, hits };
    },
    [npcId, npcName, SHOP_ROOT]
  );
}

async function buyShop(page, objId, nameSub) {
  return page.evaluate(
    ([id, name, invCom]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const items = typeof r?.ifInv === 'function' ? r.ifInv(invCom) : [];
      const hit =
        items.find(i => (i.id | 0) === (id | 0)) ||
        items.find(i =>
          String(i?.name ?? '')
            .toLowerCase()
            .includes(String(name).toLowerCase())
        );
      if (!hit) {
        return {
          ok: false,
          err: 'not in shop',
          items: items.map(i => `${i.name}#${i.id}x${i.count}`)
        };
      }
      const ok = !!a?.invButton?.(hit.id | 0, hit.slot | 0, invCom, 2);
      return { ok, id: hit.id | 0, name: hit.name, slot: hit.slot | 0, count: hit.count | 0 };
    },
    [objId, nameSub, SHOP_INV]
  );
}

async function useOnLocId(page, itemSub, locIds) {
  return page.evaluate(
    ([item, ids]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a || !r) return { ok: false, err: 'no abi' };
      const want = new Set(ids);
      const list = r.locs?.({ maxDist: 16 }) ?? [];
      const loc = list
        .filter(l => want.has(l.id | 0))
        .sort((x, y) => (x.distance | 0) - (y.distance | 0))[0];
      if (!loc || loc.typecode == null) {
        return {
          ok: false,
          err: 'no loc',
          seen: list.map(l => `${l.name}#${l.id}@${l.x},${l.z}`)
        };
      }
      const inv = r.inventory?.() ?? [];
      const w = String(item).toLowerCase();
      const held = inv.find(i => {
        const n = String(i?.name ?? '').toLowerCase();
        if (w === 'raw beef') return n.includes('raw beef');
        if (w === 'cooked meat') return n.includes('cooked meat') && !n.includes('burnt');
        if (w === 'burnt meat') return n.includes('burnt meat');
        return n.includes(w);
      });
      if (!held) return { ok: false, err: 'no item', inv: inv.map(i => i.name) };
      const ok = !!a.useHeldOnLoc?.(held, loc, 16);
      return {
        ok,
        item: held.name,
        locId: loc.id | 0,
        locName: loc.name,
        x: loc.x | 0,
        z: loc.z | 0,
        d: loc.distance | 0
      };
    },
    [itemSub, locIds]
  );
}

async function clickCookOne(page) {
  return page.evaluate(com => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    const chat = r?.modals?.()?.chat ?? -1;
    if (chat !== 1743) return { ok: false, chat };
    return { ok: !!a?.ifButton?.(com), chat };
  }, COOKX_ONE);
}

async function drinkCauldron(page) {
  return page.evaluate(
    ([wx, wz, wantId]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const list = r?.locs?.({ maxDist: 12 }) ?? [];
      const hit =
        list.find(l => (l.id | 0) === (wantId | 0)) ||
        list.find(l => (l.x | 0) === (wx | 0) && (l.z | 0) === (wz | 0));
      if (!hit) {
        return { ok: false, err: 'no cauldron', seen: list.map(l => `${l.name}#${l.id}@${l.x},${l.z}`) };
      }
      const ok = !!(
        a.opLocAt?.(hit.x, hit.z, 'Drink') ||
        a.opLoc?.(hit, 'Drink', 12)
      );
      return { ok, id: hit.id | 0, name: hit.name, x: hit.x | 0, z: hit.z | 0, ops: hit.ops || [] };
    },
    [CAULDRON_LOC.x, CAULDRON_LOC.z, CAULDRON_ID]
  );
}

async function kitHeld(page) {
  return {
    onion: await invCount(page, 'onion'),
    tail: await invCount(page, 'rats tail'),
    newt: await invCount(page, 'eye of newt'),
    burnt: await invCount(page, 'burnt meat')
  };
}

async function gatherTail(page, stand, ids, label, attempts) {
  await commute(page, stand, label);
  for (let i = 0; i < attempts && !(await invHas(page, 'rats tail')); i++) {
    const ground = await listGround(page);
    const tailG = ground.find(
      g => /tail/i.test(String(g.name ?? '')) && /rat/i.test(String(g.name ?? ''))
    );
    if (tailG) {
      const take = await takeNamed(page, tailG.name || "Rat's tail", 14);
      console.log('[he2e] take tail', i, take, JSON.stringify(tailG));
      await waitTicks(page, 3);
      await dismiss(page);
      continue;
    }
    const atk = await attackRat(page, ids);
    if (i === 0 || i % 5 === 0 || !atk?.ok) {
      console.log('[he2e] attack rat', label, i, JSON.stringify(atk));
    }
    await waitTicks(page, 8);
    await dismiss(page);
    const chat = await recentChat(page, 12);
    const noTrig = chat.find(t => /No trigger for/i.test(t));
    if (noTrig) {
      console.log('[he2e] rat notrig', label, noTrig);
    }
    const here = await worldTile(page);
    if (Math.abs((here.x | 0) - stand.x) > 10 || Math.abs((here.z | 0) - stand.z) > 10) {
      await commute(page, stand, `${label} return`);
    }
  }
  return invHas(page, 'rats tail');
}

function freshLines(chat, seen) {
  const out = [];
  for (const t of chat) {
    const s = String(t ?? '');
    if (!seen.has(s)) out.push(s);
  }
  return out;
}

async function cookOn(page, stand, locIds, label) {
  await commute(page, stand, label);
  const seen = new Set(await recentChat(page, 24));
  for (let i = 0; i < 16; i++) {
    if (await invHas(page, 'burnt meat')) return { ok: true, how: 'burnt' };
    const haveCooked = await invHas(page, 'cooked meat');
    const haveRaw = await invHas(page, 'raw beef');
    if (!haveCooked && !haveRaw) return { ok: false, err: 'no meat' };
    const item = haveCooked ? 'cooked meat' : 'raw beef';
    const use = await useOnLocId(page, item, locIds);
    console.log('[he2e] cook', label, i, item, JSON.stringify(use));
    await waitTicks(page, 4);
    const cookx = await clickCookOne(page);
    if (cookx?.ok) {
      console.log('[he2e] cookx 1', cookx);
      await waitTicks(page, 6);
    }
    await dismiss(page);
    const chat = await recentChat(page, 14);
    const fresh = freshLines(chat, seen);
    for (const t of fresh) seen.add(t);
    const noTrig = fresh.find(t => /No trigger for/i.test(t));
    if (noTrig) return { ok: false, err: noTrig, use, chat: fresh };
    if (/can'?t cook that/i.test(fresh.join(' '))) {
      return { ok: false, err: fresh.find(t => /can'?t cook/i.test(t)), use, chat: fresh };
    }
    if (await invHas(page, 'burnt meat')) return { ok: true, how: 'burnt', use };
  }
  return { ok: await invHas(page, 'burnt meat'), err: 'no burnt after loop' };
}

async function resultFail(page, msg) {
  await dumpState(page, 'fail').catch(() => {});
  console.log(`RESULT FAIL he2e Witch's Potion user=${username} ${msg}`);
  fail(msg);
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[he2e] ${base} user=${username} Witch's Potion SHIP e2e`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`he2e_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, '~energy', 500).catch(() => {});

    console.log('PHASE start');
    const before = await getServerVarQuiet(page, 'hetty');
    console.log('[he2e] hetty start', before);
    if (Number(before) !== 0) fail(`hetty=${before} want 0 (do not soft-start this e2e)`);

    console.log('PHASE hetty-start');
    await commute(page, HETTY, 'hetty');
    if (shot) await shot('01-hetty');
    const start = await talkNpc(
      page,
      { name: 'Hetty', id: HETTY_NPC_ID },
      ['i am in search of a quest', 'yes help me become one with my darker side', 'darker side'],
      100
    );
    console.log('[he2e] start talk', JSON.stringify(start));
    if (!start?.ok) await resultFail(page, `Talk Hetty failed ${JSON.stringify(start)}`);
    if (start?.noTrig) await resultFail(page, start.noTrig);
    const started = await waitServerVar(page, 'hetty', {
      pred: v => Number(v) === 1,
      attempts: 16,
      ticksBetween: 2
    });
    if (Number(started) !== 1) {
      await resultFail(page, `hetty=${started} after start (want 1)`);
    }
    if (shot) await shot('02-started');
    console.log('PHASE started', started);

    console.log('PHASE onion');
    await commute(page, ONION, 'onion field');
    if (shot) await shot('03-onion');
    for (let i = 0; i < 8 && !(await invHas(page, 'onion')); i++) {
      const pick = await pickOnion(page);
      console.log('[he2e] pick onion', i, JSON.stringify(pick));
      await waitTicks(page, 4);
      await dismiss(page);
      const chat = await recentChat(page, 10);
      const noTrig = chat.find(t => /No trigger for/i.test(t));
      if (noTrig) await resultFail(page, noTrig);
    }
    if (!(await invHas(page, 'onion'))) {
      await resultFail(
        page,
        `no Onion at loc ${ONION_ID} inv=${JSON.stringify(await invNames(page))}`
      );
    }

    console.log('PHASE rats-tail');
    let tail = await gatherTail(page, RATS_IN, [RAT_IN_ID], 'rat_indoors', 24);
    if (!tail) {
      console.log('[he2e] rat_indoors 2682 no tail — commute outdoor rat 47');
      await dumpState(page, 'no-tail-indoors');
      tail = await gatherTail(page, RATS_OUT, [RAT_OUT_ID], 'rat-47', 30);
    }
    if (shot) await shot('04-tail');
    if (!tail) {
      await resultFail(
        page,
        `no Rat's tail after rat_indoors ${RAT_IN_ID} @ ${RATS_IN.x},${RATS_IN.z} and rat ${RAT_OUT_ID} @ ${RATS_OUT.x},${RATS_OUT.z}`
      );
    }

    console.log('PHASE coins-prep');
    // Labeled shop prep only. Do not give eye / beef / tail / onion.
    const coinFail = await giveItems(page, [['coins', SHOP_COINS]]);
    console.log('[he2e] give coins', SHOP_COINS, coinFail.length ? coinFail : 'ok', 'held', await invCount(page, 'coins'));
    if (!(await invHas(page, 'coins'))) {
      await resultFail(page, `give coins failed ${JSON.stringify(coinFail)}`);
    }

    console.log('PHASE eye-of-newt');
    await commute(page, BETTY, 'betty');
    if (shot) await shot('05-betty');
    const bettyOpen = await openTrade(page, BETTY_ID, 'Betty');
    console.log('[he2e] betty trade', JSON.stringify(bettyOpen));
    if (Number(bettyOpen?.main) !== SHOP_ROOT) {
      await resultFail(page, `Betty shop not open ${JSON.stringify(bettyOpen)}`);
    }
    const buyEye = await buyShop(page, EYE_ID, 'eye of newt');
    console.log('[he2e] buy eye', JSON.stringify(buyEye));
    await waitTicks(page, 3);
    await dismiss(page);
    if (!(await invHas(page, 'eye of newt'))) {
      await resultFail(page, `no Eye of newt after Betty buy ${JSON.stringify(buyEye)}`);
    }

    console.log('PHASE raw-beef');
    await commute(page, WYDIN, 'wydin');
    if (shot) await shot('06-wydin');
    const wydinOpen = await openTrade(page, WYDIN_ID, 'Wydin');
    console.log('[he2e] wydin trade', JSON.stringify(wydinOpen));
    if (Number(wydinOpen?.main) !== SHOP_ROOT) {
      await resultFail(page, `Wydin shop not open ${JSON.stringify(wydinOpen)}`);
    }
    const buyBeef = await buyShop(page, RAW_BEEF_ID, 'raw beef');
    console.log('[he2e] buy beef', JSON.stringify(buyBeef));
    await waitTicks(page, 3);
    await dismiss(page);
    if (!(await invHas(page, 'raw beef'))) {
      await resultFail(page, `no Raw beef after Wydin buy ${JSON.stringify(buyBeef)}`);
    }

    console.log('PHASE burnt-meat');
    if (shot) await shot('07-range');
    const cooked = await cookOn(page, RANGE, [RANGE_ID], 'rimmington range 9682');
    console.log('[he2e] rimmington range', JSON.stringify(cooked));
    if (shot) await shot('08-burnt');
    if (!cooked?.ok || !(await invHas(page, 'burnt meat'))) {
      const mes = String(cooked?.err ?? '');
      if (/No trigger for/i.test(mes)) {
        await resultFail(page, mes);
      }
      await resultFail(
        page,
        `no Burnt meat after range 9682 @ 2970,3209: ${JSON.stringify(cooked)} inv=${JSON.stringify(await invNames(page))}`
      );
    }

    const kit = await kitHeld(page);
    console.log('[he2e] kit', kit, JSON.stringify(await invNames(page)));
    if (kit.onion < 1 || kit.tail < 1 || kit.newt < 1 || kit.burnt < 1) {
      await resultFail(page, `ingredients short before hand-in ${JSON.stringify(kit)}`);
    }

    console.log('PHASE handin');
    await commute(page, HETTY, 'hetty return');
    if (shot) await shot('09-handin');
    const fin = await talkNpc(page, { name: 'Hetty', id: HETTY_NPC_ID }, [], 120);
    console.log('[he2e] handin talk', JSON.stringify(fin));
    if (fin?.noTrig) await resultFail(page, fin.noTrig);
    const given = await waitServerVar(page, 'hetty', {
      pred: v => Number(v) === 2,
      attempts: 20,
      ticksBetween: 2
    });
    if (Number(given) !== 2) {
      await resultFail(page, `hetty=${given} after hand-in (want 2) bodies=${JSON.stringify(fin?.bodies)}`);
    }
    console.log('PHASE objects-given', given);

    console.log('PHASE drink');
    await commute(page, CAULDRON, 'cauldron');
    if (shot) await shot('10-cauldron');
    const drink = await drinkCauldron(page);
    console.log('[he2e] drink', JSON.stringify(drink));
    if (!drink?.ok) await resultFail(page, `Drink cauldron failed ${JSON.stringify(drink)}`);
    for (let i = 0; i < 20; i++) {
      await dismiss(page);
      await waitTicks(page, 2);
    }
    const done = await waitServerVar(page, 'hetty', {
      pred: v => Number(v) === 3,
      attempts: 16,
      ticksBetween: 2
    });
    if (shot) await shot('11-complete');
    const end = await worldTile(page);
    const endInv = await invNames(page);
    const endChat = await recentChat(page, 20);
    console.log('[he2e] after drink hetty', done, 'tile', end, 'inv', endInv);

    if (Math.abs((end.x | 0) - HETTY.x) > 14 || Math.abs((end.z | 0) - HETTY.z) > 14) {
      await resultFail(page, `dest invented ${JSON.stringify(end)}`);
    }
    if (Number(done) !== 3) {
      await resultFail(
        page,
        `hetty=${done} after drink (want 3) drink=${JSON.stringify(drink)} ` +
          `inv=${JSON.stringify(endInv)} chat=${JSON.stringify(endChat)}`
      );
    }

    console.log(`RESULT PASS he2e Witch's Potion 0→1→2→3 no dest user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
