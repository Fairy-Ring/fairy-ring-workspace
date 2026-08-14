#!/usr/bin/env node
/**
 * SHIP e2e — Sheep Shearer start → complete. No setvar sheep.
 * World-source shears / wool / spin. Tele is commute only.
 *
 * Anchors from rs2b0t src/bot/api/ai/quests/defs/sheepshearer.ts (274 Lumbridge).
 * 377: shear = shears on sheepunsheered 43 / 1763 / 1765 (not The Thing 3579).
 * 377 spin = oplocu wool→spinning_wheel (no [oploc2] Make-X).
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-sheep-e2e \
 *     node tools/harness/quest-sheep-e2e-smoke.mjs
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
const { username, password } = resolveAccount(rest, 'she2e');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

/** rs2b0t Fred 3189,3273 — OSF smoke proved stand west 3188,3273. */
const FRED = { x: 3188, z: 3273, level: 0 };
/** m49_51 OBJ 0 56 8: shears 1735 — Fred table (dialog: house on the table). */
const SHEARS_FRED = { x: 3191, z: 3272, level: 0 };
/** rs2b0t shearsSpawn 3152,3306 — mill house table. */
const SHEARS_MILL = { x: 3152, z: 3305, level: 0 };
/** rs2b0t pen 3197,3266 — inside the field. */
const PEN = { x: 3197, z: 3266, level: 0 };
/** rs2b0t Falador wheel stand 2982,3315. Loc spinning_wheel 2644 @ 2981,3314. */
const WHEEL = { x: 2982, z: 3315, level: 0 };
const WHEEL_LOC = { x: 2981, z: 3314 };

const UNSHEARED = [43, 1763, 1765];
const THING_ID = 3579;
const NEED_BALLS = 20;

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
      const ballCount = () =>
        (r.inventory?.() ?? [])
          .filter(it => /ball of wool/i.test(String(it?.name ?? '')))
          .reduce((n, it) => n + (it.count | 0 || 1), 0);
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
      // 274 Fred if_close each ball — chat drops mid-give; last-of-them reopens.
      let closedIdle = 0;
      const startBalls = ballCount();
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
        const chatClosed = (r.modals?.()?.chat ?? -1) === -1;
        if (chatClosed && i > 10) {
          const balls = ballCount();
          if (startBalls > 1 && balls > 1) {
            closedIdle = 0;
          } else {
            closedIdle++;
            if (closedIdle >= (startBalls > 1 ? 20 : 8)) break;
          }
        } else {
          closedIdle = 0;
        }
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
    const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
    const w = String(want).toLowerCase();
    return inv.some(i => {
      const n = String(i?.name ?? '').toLowerCase();
      if (w === 'wool') return n === 'wool';
      if (w === 'ball of wool') return n.includes('ball of wool');
      return n.includes(w);
    });
  }, sub);
}

async function invCount(page, sub) {
  return page.evaluate(want => {
    const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
    const w = String(want).toLowerCase();
    return inv
      .filter(i => {
        const n = String(i?.name ?? '').toLowerCase();
        if (w === 'wool') return n === 'wool';
        if (w === 'ball of wool') return n.includes('ball of wool');
        return n.includes(w);
      })
      .reduce((n, i) => n + (i.count | 0 || 1), 0);
  }, sub);
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

async function dumpState(page, label) {
  const tile = await worldTile(page);
  const inv = await invNames(page);
  const chat = await recentChat(page, 16);
  const sheep = await getServerVarQuiet(page, 'sheep').catch(() => null);
  console.log(`[she2e] dump ${label}`, JSON.stringify({ tile, sheep, inv, chat }));
  return { tile, inv, chat, sheep };
}

async function commute(page, tile, label) {
  console.log(`[she2e] commute ${label}`, tile);
  if (!(await teleTo(page, tile, 2, 25_000))) fail(`tele ${label} failed`);
  await waitSceneReady(page, 15_000);
  await waitTicks(page, 4);
}

async function listSheep(page) {
  return page.evaluate(([unsheared, thing]) => {
    const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
    const want = new Set(unsheared);
    return npcs
      .filter(n => /sheep/i.test(String(n?.name ?? '')) || want.has(n.id | 0) || (n.id | 0) === thing)
      .map(n => ({
        id: n.id | 0,
        index: n.index | 0,
        name: n.name,
        d: n.distance | 0,
        x: n.tile?.x | 0,
        z: n.tile?.z | 0,
        unsheared: want.has(n.id | 0),
        thing: (n.id | 0) === thing
      }));
  }, [UNSHEARED, THING_ID]);
}

async function shearOne(page) {
  return page.evaluate(([unsheared, thing]) => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    if (!a || !r) return { ok: false, err: 'no abi' };
    const want = new Set(unsheared);
    const shears = (r.inventory?.() ?? []).find(i => /shears/i.test(String(i?.name ?? '')));
    if (!shears) return { ok: false, err: 'no shears' };
    const list = (r.npcs?.() ?? [])
      .filter(n => want.has(n.id | 0) && (n.id | 0) !== thing)
      .sort((x, y) => (x.distance | 0) - (y.distance | 0));
    const sheep = list[0];
    if (!sheep) {
      return {
        ok: false,
        err: 'no unsheared',
        seen: (r.npcs?.() ?? [])
          .filter(n => /sheep/i.test(String(n?.name ?? '')))
          .map(n => ({ id: n.id | 0, d: n.distance | 0 }))
      };
    }
    const ok = !!a.useHeldOnNpc(shears, sheep.index);
    return {
      ok,
      id: sheep.id | 0,
      index: sheep.index | 0,
      x: sheep.tile?.x | 0,
      z: sheep.tile?.z | 0,
      d: sheep.distance | 0
    };
  }, [UNSHEARED, THING_ID]);
}

async function spinOne(page) {
  return page.evaluate(([wx, wz]) => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    if (!a || !r) return { ok: false, err: 'no abi' };
    const wool = (r.inventory?.() ?? []).find(i => String(i?.name ?? '').toLowerCase() === 'wool');
    if (!wool) return { ok: false, err: 'no wool' };
    const list = r.locs?.({ name: 'Spinning wheel', maxDist: 16 }) ?? [];
    const wheel =
      list.find(l => (l.x | 0) === wx && (l.z | 0) === wz) ||
      list.find(l => (l.id | 0) === 2644) ||
      list[0];
    if (!wheel) {
      return {
        ok: false,
        err: 'no wheel',
        names: (r.locs?.({ maxDist: 16 }) ?? []).map(l => `${l.name}#${l.id}@${l.x},${l.z} ops=${(l.ops || []).join('/')}`)
      };
    }
    const ok = !!a.useHeldOnLoc(wool, wheel, 16);
    return {
      ok,
      id: wheel.id | 0,
      name: wheel.name,
      x: wheel.x | 0,
      z: wheel.z | 0,
      ops: wheel.ops || []
    };
  }, [WHEEL_LOC.x, WHEEL_LOC.z]);
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[she2e] ${base} user=${username} Sheep Shearer SHIP e2e`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`she2e_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'energy', 200).catch(() => {});

    console.log('PHASE start');
    const before = await getServerVarQuiet(page, 'sheep');
    console.log('[she2e] sheep start', before);
    if (Number(before) !== 0) fail(`sheep=${before} want 0 (do not soft-start this e2e)`);

    await commute(page, FRED, 'fred');
    if (shot) await shot('01-fred');
    const start = await talkNpc(
      page,
      'Fred',
      ["i'm looking for a quest.", 'yes okay. i can do that.', 'of course', "i'm something of an expert"],
      100
    );
    console.log('[she2e] start talk', JSON.stringify(start));
    if (!start?.ok) fail(`Talk Fred failed ${JSON.stringify(start)}`);
    if (start?.noTrig) fail(start.noTrig);
    const started = await getServerVarQuiet(page, 'sheep');
    if (Number(started) !== 1) fail(`sheep=${started} after start (want 1)`);
    if (shot) await shot('02-started');
    console.log('PHASE started', started);

    console.log('PHASE shears');
    if (!(await invHas(page, 'shears'))) {
      await commute(page, SHEARS_FRED, 'fred table shears');
      let shears = await invHas(page, 'shears');
      for (let i = 0; i < 6 && !shears; i++) {
        const take = await takeNamed(page, 'Shears', 10);
        console.log('[she2e] take shears fred table', i, take);
        await waitTicks(page, 3);
        shears = await invHas(page, 'shears');
      }
    }
    if (!(await invHas(page, 'shears'))) {
      await commute(page, SHEARS_MILL, 'mill shears');
      for (let i = 0; i < 6 && !(await invHas(page, 'shears')); i++) {
        const take = await takeNamed(page, 'Shears', 12);
        console.log('[she2e] take shears mill', i, take);
        await waitTicks(page, 3);
      }
    }
    if (shot) await shot('03-shears');
    if (!(await invHas(page, 'shears'))) {
      await dumpState(page, 'no-shears');
      fail(`no Shears at Fred table ${JSON.stringify(SHEARS_FRED)} or mill ${JSON.stringify(SHEARS_MILL)} inv=${JSON.stringify(await invNames(page))}`);
    }

    console.log('PHASE shear');
    await commute(page, PEN, 'pen');
    let wool = await invCount(page, 'wool');
    let balls = await invCount(page, 'ball of wool');
    for (let i = 0; i < 90 && wool + balls < NEED_BALLS; i++) {
      const seen = await listSheep(page);
      const hit = await shearOne(page);
      if (i === 0 || i % 5 === 0 || !hit?.ok) {
        console.log('[she2e] shear', i, 'wool', wool, 'balls', balls, JSON.stringify(hit), 'flock', JSON.stringify(seen));
      }
      await waitTicks(page, 6);
      await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
      });
      wool = await invCount(page, 'wool');
      balls = await invCount(page, 'ball of wool');
      if (!hit?.ok && hit?.err === 'no unsheared') {
        await commute(page, PEN, 'pen wait wool');
        await waitTicks(page, 16);
      }
    }
    if (shot) await shot('04-wool');
    wool = await invCount(page, 'wool');
    balls = await invCount(page, 'ball of wool');
    console.log('[she2e] after shear wool', wool, 'balls', balls, JSON.stringify(await invNames(page)));
    if (wool + balls < NEED_BALLS) {
      await dumpState(page, 'short-wool');
      fail(`wool+balls=${wool + balls} want ${NEED_BALLS} inv=${JSON.stringify(await invNames(page))} flock=${JSON.stringify(await listSheep(page))}`);
    }

    if (wool > 0) {
      console.log('PHASE spin');
      await commute(page, WHEEL, 'falador wheel');
      if (shot) await shot('05-wheel');
      for (let i = 0; i < 40 && (await invCount(page, 'wool')) > 0; i++) {
        const spin = await spinOne(page);
        if (i === 0 || i % 4 === 0 || !spin?.ok) {
          console.log('[she2e] spin', i, JSON.stringify(spin), 'wool', await invCount(page, 'wool'), 'balls', await invCount(page, 'ball of wool'));
        }
        await waitTicks(page, 8);
        await page.evaluate(() => {
          const a = globalThis.__lc377?.actions;
          a?.continueDialog?.();
          a?.dismissModalMessage?.();
        });
        const chat = await recentChat(page, 8);
        const noTrig = chat.find(t => /No trigger for/i.test(t));
        if (noTrig) {
          await dumpState(page, 'spin-notrig');
          fail(noTrig);
        }
        if (!spin?.ok && spin?.err === 'no wheel') {
          await dumpState(page, 'no-wheel');
          fail(`no Spinning wheel at ${JSON.stringify(WHEEL)} ${JSON.stringify(spin)}`);
        }
      }
    }
    balls = await invCount(page, 'ball of wool');
    wool = await invCount(page, 'wool');
    if (shot) await shot('06-balls');
    console.log('[she2e] after spin wool', wool, 'balls', balls, JSON.stringify(await invNames(page)));
    if (balls < NEED_BALLS) {
      await dumpState(page, 'short-balls');
      fail(`ball of wool=${balls} want ${NEED_BALLS} leftover wool=${wool} inv=${JSON.stringify(await invNames(page))}`);
    }

    console.log('PHASE handin');
    await commute(page, FRED, 'fred return');
    const fin = await talkNpc(page, 'Fred', ["i'm back", 'i have some'], 160);
    console.log('[she2e] finish talk', JSON.stringify(fin));
    if (fin?.noTrig) fail(fin.noTrig);
    // Keep continuing last-of-them / quest-complete if talkNpc left mid-give.
    for (let i = 0; i < 40; i++) {
      const sheepNow = Number(await getServerVarQuiet(page, 'sheep'));
      if (sheepNow === 22) break;
      await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
      });
      await waitTicks(page, 2);
      if (i % 8 === 0) {
        console.log(
          '[she2e] handin settle',
          i,
          'sheep',
          sheepNow,
          'balls',
          await invCount(page, 'ball of wool')
        );
      }
    }
    await waitTicks(page, 4);
    if (shot) await shot('07-handin');
    const done = await getServerVarQuiet(page, 'sheep');
    const end = await worldTile(page);
    const endInv = await invNames(page);
    const endChat = await recentChat(page, 20);
    console.log('[she2e] after handin sheep', done, 'tile', end, 'inv', endInv);

    if (Math.abs((end.x | 0) - FRED.x) > 12 || Math.abs((end.z | 0) - FRED.z) > 12) {
      fail(`dest invented ${JSON.stringify(end)}`);
    }
    if (Number(done) !== 22) {
      await dumpState(page, 'not-complete');
      fail(
        `sheep=${done} after hand-in (want 22) balls=${await invCount(page, 'ball of wool')} ` +
          `inv=${JSON.stringify(endInv)} chat=${JSON.stringify(endChat)} bodies=${JSON.stringify(fin?.bodies)}`
      );
    }

    console.log(`RESULT PASS she2e Sheep Shearer 0→1→22 no dest user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
