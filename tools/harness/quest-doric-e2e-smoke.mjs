#!/usr/bin/env node
/**
 * SHIP e2e — Doric's Quest start → complete. No setvar doricquest.
 * World-source bronze pickaxe + 6 Clay + 4 Copper ore + 2 Iron ore. Tele commute only.
 *
 * Anchors from rs2b0t src/bot/api/ai/quests/defs/doric.ts.
 * 377 Rimmington rocks are 97xx (`rocks_9708`…) in m46_50, not 2090-series.
 * setstat mining 15 is labeled prep (iron mine level) — not a quest skip.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-doric-e2e \
 *     node tools/harness/quest-doric-e2e-smoke.mjs
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
const { username, password } = resolveAccount(rest, 'de2e');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

/** jm2 m46_53 NPC `0 8 59: 284` → 2952,3451. Stand next to, not on. */
const DORIC = { x: 2951, z: 3451, level: 0 };
const DORIC_NPC = { x: 2952, z: 3451 };
/** m46_50 OBJ `0 19 16: 1265 1` → Bronze pickaxe on table 2963,3216. */
const PICKAXE = { x: 2962, z: 3216, level: 0 };
const PICKAXE_OBJ = { x: 2963, z: 3216 };
/**
 * Rimmington mine stands (rs2b0t). 377 LOC uses 97xx, not copperrock1 2090:
 * clay 9713 @ 2986,3239 / 9711 @ 2987,3240
 * copper 9708 @ 2978,3248 + 2977,3247
 * iron 9717 @ 2971,3237 / 2969,3240
 */
const CLAY = { x: 2986, z: 3240, level: 0 };
const COPPER = { x: 2978, z: 3247, level: 0 };
const IRON = { x: 2972, z: 3239, level: 0 };

const ROCK_IDS = {
  clay: [2108, 2109, 9711, 9713],
  copper: [2090, 2091, 9708, 9709, 9710],
  iron: [2092, 2093, 9717, 9718, 9719]
};
const NEED = { clay: 6, copper: 4, iron: 2 };
const DORIC_REWARD_COINS = 180;
const DORIC_NPC_ID = 284;

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

function invNameMatch(name, want) {
  const n = String(name ?? '').toLowerCase();
  const w = String(want).toLowerCase();
  if (w === 'clay') return n === 'clay';
  if (w === 'copper' || w === 'copper ore') return n.includes('copper ore');
  if (w === 'iron' || w === 'iron ore') return n.includes('iron ore');
  if (w === 'coins') return n === 'coins' || n === 'coin';
  if (w === 'pickaxe' || w === 'bronze pickaxe') {
    return n.includes('pickaxe') && !n.includes('broken');
  }
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
          if (w === 'clay') return n === 'clay';
          if (w === 'copper' || w === 'copper ore') return n.includes('copper ore');
          if (w === 'iron' || w === 'iron ore') return n.includes('iron ore');
          if (w === 'coins') return n === 'coins' || n === 'coin';
          if (w === 'pickaxe' || w === 'bronze pickaxe') {
            return n.includes('pickaxe') && !n.includes('broken');
          }
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

async function takeNamed(page, name, dist = 12) {
  return page.evaluate(
    ([n, d]) => {
      const a = globalThis.__lc377?.actions;
      return !!(a?.takeGround?.(n, d) || a?.takeGround?.(n.toLowerCase(), d));
    },
    [name, dist]
  );
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
    return npcs.slice(0, 16).map(n => ({
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

async function miningLevel(page) {
  return page.evaluate(() => {
    const r = globalThis.__lc377?.reader;
    const st = r?.stat?.(14);
    return {
      level: st?.level | 0 || st?.base | 0,
      xp: st?.xp | 0
    };
  });
}

async function dumpState(page, label) {
  const tile = await worldTile(page);
  const inv = await invNames(page);
  const chat = await recentChat(page, 16);
  const doricquest = await getServerVarQuiet(page, 'doricquest').catch(() => null);
  const npcs = await listNpcs(page);
  const locs = await listLocs(page);
  const ground = await listGround(page);
  const mining = await miningLevel(page);
  console.log(
    `[de2e] dump ${label}`,
    JSON.stringify({ tile, doricquest, mining, inv, chat, npcs, locs, ground })
  );
  return { tile, inv, chat, doricquest, npcs, locs, ground, mining };
}

async function commute(page, tile, label) {
  console.log(`[de2e] commute ${label}`, tile);
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

async function wieldPickaxe(page) {
  return page.evaluate(() => {
    const a = globalThis.__lc377?.actions;
    return {
      ok: !!(
        a?.equip?.('Bronze pickaxe') ||
        a?.equip?.('bronze pickaxe') ||
        a?.heldOp?.('Bronze pickaxe', 2) ||
        a?.heldOp?.('bronze pickaxe', 2)
      )
    };
  });
}

async function mineOnce(page, ids) {
  return page.evaluate(wantIds => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    if (!a || !r) return { ok: false, err: 'no abi' };
    const want = new Set(wantIds);
    const list = r.locs?.({ maxDist: 16 }) ?? [];
    const rocks = list
      .filter(
        l =>
          want.has(l.id | 0) &&
          (l.ops || []).some(o => /mine/i.test(String(o ?? '')))
      )
      .sort((x, y) => (x.distance | 0) - (y.distance | 0));
    const rock = rocks[0];
    if (!rock) {
      return {
        ok: false,
        err: 'no rock',
        seen: list
          .filter(l => /rock/i.test(String(l?.name ?? '')))
          .map(l => `${l.name}#${l.id}@${l.x},${l.z} ops=${(l.ops || []).join('/')}`)
      };
    }
    const ok = !!(a.opLocAt?.(rock.x, rock.z, 'Mine') || a.opLoc?.(rock, 'Mine', 16));
    return {
      ok,
      id: rock.id | 0,
      name: rock.name,
      x: rock.x | 0,
      z: rock.z | 0,
      d: rock.distance | 0,
      ops: rock.ops || []
    };
  }, ids);
}

async function materialsHeld(page) {
  return {
    clay: await invCount(page, 'clay'),
    copper: await invCount(page, 'copper ore'),
    iron: await invCount(page, 'iron ore')
  };
}

async function mineUntil(page, kind, stand, need) {
  const ids = ROCK_IDS[kind];
  let have = await invCount(page, kind === 'clay' ? 'clay' : `${kind} ore`);
  for (let i = 0; i < 90 && have < need; i++) {
    const combat = (await listNpcs(page)).filter(n => n.combat);
    if (combat.length) {
      console.log(`[de2e] ${kind} combat — re-tele stand`, JSON.stringify(combat));
      await commute(page, stand, `${kind} flee`);
    }
    const hit = await mineOnce(page, ids);
    if (i === 0 || i % 5 === 0 || !hit?.ok) {
      console.log(`[de2e] mine ${kind}`, i, 'have', have, '/', need, JSON.stringify(hit));
    }
    await waitTicks(page, 14);
    await dismiss(page);
    const chat = await recentChat(page, 12);
    const noTrig = chat.find(t => /No trigger for/i.test(t));
    if (noTrig) {
      await dumpState(page, `${kind}-notrig`);
      fail(noTrig);
    }
    const needLvl = chat.find(t => /need a mining level/i.test(t));
    if (needLvl) {
      await dumpState(page, `${kind}-level`);
      fail(`mining level gate: ${needLvl}`);
    }
    const noPick = chat.find(t => /need a pickaxe/i.test(t));
    if (noPick) {
      await dumpState(page, `${kind}-nopick`);
      fail(`no pickaxe: ${noPick}`);
    }
    have = await invCount(page, kind === 'clay' ? 'clay' : `${kind} ore`);
    if (!hit?.ok && hit?.err === 'no rock') {
      await waitTicks(page, 16);
      const here = await worldTile(page);
      if (Math.abs((here.x | 0) - stand.x) > 8 || Math.abs((here.z | 0) - stand.z) > 8) {
        await commute(page, stand, `${kind} return`);
      }
    }
  }
  return have;
}

async function settleHandin(page) {
  for (let i = 0; i < 50; i++) {
    const now = Number(await getServerVarQuiet(page, 'doricquest'));
    const coins = await invCount(page, 'coins');
    if (now === 100 && coins >= DORIC_REWARD_COINS) return { now, coins };
    await dismiss(page);
    await waitTicks(page, 2);
    if (i % 8 === 0) {
      console.log('[de2e] handin settle', i, 'doricquest', now, 'coins', coins, 'inv', await invNames(page));
    }
  }
  return {
    now: Number(await getServerVarQuiet(page, 'doricquest')),
    coins: await invCount(page, 'coins')
  };
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[de2e] ${base} user=${username} Doric's Quest SHIP e2e`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`de2e_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'energy', 200).catch(() => {});
    // Prep only: iron rocks require mining 15. Not a quest skip. Do not setvar doricquest.
    const setstatFail = await setStats(page, { mining: 15 });
    console.log('[de2e] setstat mining 15', setstatFail.length ? setstatFail : 'ok', await miningLevel(page));

    console.log('PHASE start');
    const before = await getServerVarQuiet(page, 'doricquest');
    console.log('[de2e] doricquest start', before);
    if (Number(before) !== 0) fail(`doricquest=${before} want 0 (do not soft-start this e2e)`);

    console.log('PHASE doric-start');
    await commute(page, DORIC, 'doric');
    if (shot) await shot('01-doric');
    const start = await talkNpc(
      page,
      'Doric',
      ['wanted to use your anvils', 'yes, i will get you materials', 'will get you materials'],
      100
    );
    console.log('[de2e] start talk', JSON.stringify(start));
    if (!start?.ok) {
      await dumpState(page, 'doric-talk-fail');
      fail(`Talk Doric failed ${JSON.stringify(start)}`);
    }
    if (start?.noTrig) fail(start.noTrig);
    const started = await getServerVarQuiet(page, 'doricquest');
    if (Number(started) !== 10) {
      await dumpState(page, 'doric-no-write');
      fail(`doricquest=${started} after start (want 10)`);
    }
    if (shot) await shot('02-started');
    console.log('PHASE started', started);

    console.log('PHASE pickaxe');
    if (!(await invHas(page, 'bronze pickaxe'))) {
      await commute(page, PICKAXE, 'rimmington pickaxe');
      if (shot) await shot('03-pickaxe-tile');
      for (let i = 0; i < 10 && !(await invHas(page, 'bronze pickaxe')); i++) {
        const ground = await listGround(page);
        const take = await takeNamed(page, 'Bronze pickaxe', 14);
        console.log('[de2e] take pickaxe', i, take, 'ground', JSON.stringify(ground));
        await waitTicks(page, 3);
        await dismiss(page);
      }
    }
    if (!(await invHas(page, 'bronze pickaxe'))) {
      await dumpState(page, 'no-pickaxe');
      fail(
        `no Bronze pickaxe at ${JSON.stringify(PICKAXE_OBJ)} inv=${JSON.stringify(await invNames(page))} ground=${JSON.stringify(await listGround(page))}`
      );
    }
    const wear = await wieldPickaxe(page);
    console.log('[de2e] wield pickaxe', JSON.stringify(wear));
    await waitTicks(page, 3);
    if (shot) await shot('04-pickaxe');

    console.log('PHASE clay');
    await commute(page, CLAY, 'clay');
    if (shot) await shot('05-clay');
    const clay = await mineUntil(page, 'clay', CLAY, NEED.clay);
    console.log('[de2e] clay', clay, JSON.stringify(await invNames(page)));
    if (clay < NEED.clay) {
      await dumpState(page, 'short-clay');
      fail(`clay=${clay} want ${NEED.clay} inv=${JSON.stringify(await invNames(page))}`);
    }

    console.log('PHASE copper');
    await commute(page, COPPER, 'copper');
    if (shot) await shot('06-copper');
    const copper = await mineUntil(page, 'copper', COPPER, NEED.copper);
    console.log('[de2e] copper', copper, JSON.stringify(await invNames(page)));
    if (copper < NEED.copper) {
      await dumpState(page, 'short-copper');
      fail(`copper ore=${copper} want ${NEED.copper} inv=${JSON.stringify(await invNames(page))}`);
    }

    console.log('PHASE iron');
    await commute(page, IRON, 'iron');
    if (shot) await shot('07-iron');
    const iron = await mineUntil(page, 'iron', IRON, NEED.iron);
    console.log('[de2e] iron', iron, JSON.stringify(await invNames(page)));
    if (iron < NEED.iron) {
      await dumpState(page, 'short-iron');
      fail(`iron ore=${iron} want ${NEED.iron} inv=${JSON.stringify(await invNames(page))}`);
    }

    const kit = await materialsHeld(page);
    console.log('[de2e] kit', kit, JSON.stringify(await invNames(page)));
    if (kit.clay < NEED.clay || kit.copper < NEED.copper || kit.iron < NEED.iron) {
      fail(`materials short before hand-in ${JSON.stringify(kit)}`);
    }

    console.log('PHASE handin');
    await commute(page, DORIC, 'doric return');
    if (shot) await shot('08-handin');
    const fin = await talkNpc(page, 'Doric', [], 120);
    console.log('[de2e] finish talk', JSON.stringify(fin));
    if (fin?.noTrig) fail(fin.noTrig);
    const settled = await settleHandin(page);
    await waitTicks(page, 4);
    if (shot) await shot('09-complete');
    const done = await getServerVarQuiet(page, 'doricquest');
    const end = await worldTile(page);
    const endInv = await invNames(page);
    const endChat = await recentChat(page, 20);
    const coins = await invCount(page, 'coins');
    console.log('[de2e] after handin doricquest', done, 'tile', end, 'coins', coins, 'inv', endInv);

    if (Math.abs((end.x | 0) - DORIC.x) > 12 || Math.abs((end.z | 0) - DORIC.z) > 12) {
      fail(`dest invented ${JSON.stringify(end)}`);
    }
    if (Number(done) !== 100) {
      await dumpState(page, 'not-complete');
      fail(
        `doricquest=${done} after hand-in (want 100) coins=${coins} settle=${JSON.stringify(settled)} ` +
          `inv=${JSON.stringify(endInv)} chat=${JSON.stringify(endChat)} bodies=${JSON.stringify(fin?.bodies)}`
      );
    }

    console.log(
      `RESULT PASS de2e Doric's Quest 0→10→100 no dest user=${username} coins=${coins}`
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
