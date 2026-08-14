#!/usr/bin/env node
/**
 * SHIP e2e — Restless Ghost start → complete. No setvar prieststart.
 * World-source Ghostspeak (Urhney) + Skull (Wizard Tower basement). Tele commute only.
 *
 * Anchors from rs2b0t src/bot/api/ai/quests/defs/restlessghost.ts (274 Lumbridge).
 * 377 scripts are the 2005-cited path (quest rework is 22 May 2006 — after 377).
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-ghost-e2e \
 *     node tools/harness/quest-ghost-e2e-smoke.mjs
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
const { username, password } = resolveAccount(rest, 'ghe2e');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

/** rs2b0t Aereck 3244,3206 — stand next to, not on. */
const AERECK = { x: 3243, z: 3206, level: 0 };
/** jm2 m50_49 `0 35 17: 458` → 3235,3153. rs2b0t shack 3235,3154. */
const URHNEY = { x: 3235, z: 3154, level: 0 };
/** rs2b0t coffin stand 3250,3193. Loc shutghostcoffin 2145 @ 3249,3192. */
const COFFIN = { x: 3250, z: 3193, level: 0 };
const COFFIN_LOC = { x: 3249, z: 3192 };
const SHUT_COFFIN_ID = 2145;
const OPEN_COFFIN_ID = 2146;
/** jm2 m48_149 `0 48 31: 553 1` → Skull 3120,9567. Skeleton add 0_48_149_48_29 → 3120,9565. */
const SKULL = { x: 3119, z: 9567, level: 0 };
const SKULL_OBJ = { x: 3120, z: 9567 };
const SKELETON_ID = 459;

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
    const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
    const w = String(want).toLowerCase();
    return inv.some(i => String(i?.name ?? '').toLowerCase().includes(w));
  }, sub);
}

async function wornHas(page, sub) {
  return page.evaluate(want => {
    const worn = globalThis.__lc377?.reader?.equipment?.() ?? [];
    const w = String(want).toLowerCase();
    return worn.some(i => String(i?.name ?? '').toLowerCase().includes(w));
  }, sub);
}

async function invNames(page) {
  return page.evaluate(() => {
    const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
    return inv.map(i => `${i?.name ?? '?'}x${i?.count | 0 || 1}`);
  });
}

async function wornNames(page) {
  return page.evaluate(() => {
    const worn = globalThis.__lc377?.reader?.equipment?.() ?? [];
    return worn.map(i => String(i?.name ?? '?')).filter(Boolean);
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
    const locs = globalThis.__lc377?.reader?.locs?.({ maxDist: 14 }) ?? [];
    return locs.slice(0, 20).map(l => ({
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
  const worn = await wornNames(page);
  const chat = await recentChat(page, 16);
  const priest = await getServerVarQuiet(page, 'prieststart').catch(() => null);
  const npcs = await listNpcs(page);
  const locs = await listLocs(page);
  const ground = await listGround(page);
  console.log(
    `[ghe2e] dump ${label}`,
    JSON.stringify({ tile, priest, inv, worn, chat, npcs, locs, ground })
  );
  return { tile, inv, worn, chat, priest, npcs, locs, ground };
}

async function commute(page, tile, label) {
  console.log(`[ghe2e] commute ${label}`, tile);
  if (!(await teleTo(page, tile, 2, 25_000))) fail(`tele ${label} failed`);
  await waitSceneReady(page, 15_000);
  await waitTicks(page, 4);
}

async function dismiss(page) {
  await page.evaluate(() => {
    const a = globalThis.__lc377?.actions;
    a?.continueDialog?.();
    a?.dismissModalMessage?.();
  });
}

async function equipGhostspeak(page) {
  return page.evaluate(() => {
    const a = globalThis.__lc377?.actions;
    return {
      ok: !!(
        a?.equip?.('Ghostspeak amulet') ||
        a?.equip?.('ghostspeak') ||
        a?.heldOp?.('Ghostspeak amulet', 2) ||
        a?.heldOp?.('ghostspeak', 2)
      )
    };
  });
}

async function coffinSnap(page) {
  return page.evaluate(([shutId, openId, lx, lz]) => {
    const r = globalThis.__lc377?.reader;
    const list = r?.locs?.({ maxDist: 14 }) ?? [];
    const coffins = list.filter(l => /coffin/i.test(String(l?.name ?? '')));
    const at =
      coffins.find(l => (l.x | 0) === lx && (l.z | 0) === lz) ||
      coffins.find(l => (l.id | 0) === shutId || (l.id | 0) === openId) ||
      coffins[0] ||
      null;
    if (!at) {
      return {
        ok: false,
        err: 'no coffin',
        seen: list.map(l => `${l.name}#${l.id}@${l.x},${l.z} ops=${(l.ops || []).join('/')}`)
      };
    }
    const ops = at.ops || [];
    const openable = (at.id | 0) === shutId || ops.some(o => /open/i.test(String(o ?? '')));
    const opened = (at.id | 0) === openId || ops.some(o => /close/i.test(String(o ?? '')));
    return {
      ok: true,
      id: at.id | 0,
      name: at.name,
      x: at.x | 0,
      z: at.z | 0,
      ops,
      typecode: at.typecode | 0,
      lx: at.lx | 0,
      lz: at.lz | 0,
      openable,
      opened
    };
  }, [SHUT_COFFIN_ID, OPEN_COFFIN_ID, COFFIN_LOC.x, COFFIN_LOC.z]);
}

async function openCoffin(page) {
  const snap = await coffinSnap(page);
  if (!snap?.ok) return snap;
  if (snap.opened) return { ...snap, already: true };
  const clicked = await page.evaluate(s => {
    const a = globalThis.__lc377?.actions;
    return !!(
      a?.opLocAt?.(s.x, s.z, 'Open') ||
      a?.opLoc?.('Coffin', 'Open', 14) ||
      a?.opLocAt?.(s.x, s.z, '')
    );
  }, snap);
  return { ...snap, clicked };
}

async function useSkullOnOpenCoffin(page) {
  return page.evaluate(([openId, lx, lz]) => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    if (!a || !r) return { ok: false, err: 'no abi' };
    const skull = (r.inventory?.() ?? []).find(i => /skull/i.test(String(i?.name ?? '')));
    if (!skull) return { ok: false, err: 'no skull', inv: (r.inventory?.() ?? []).map(i => i?.name) };
    const list = r.locs?.({ maxDist: 14 }) ?? [];
    const coffins = list.filter(l => /coffin/i.test(String(l?.name ?? '')));
    const open =
      coffins.find(l => (l.id | 0) === openId) ||
      coffins.find(l => (l.ops || []).some(o => /close/i.test(String(o ?? '')))) ||
      coffins.find(l => (l.x | 0) === lx && (l.z | 0) === lz);
    if (!open) {
      return {
        ok: false,
        err: 'no open coffin',
        seen: list.map(l => `${l.name}#${l.id}@${l.x},${l.z} ops=${(l.ops || []).join('/')}`)
      };
    }
    if ((open.id | 0) === 2145) {
      return { ok: false, err: 'coffin still shut', id: open.id | 0, x: open.x | 0, z: open.z | 0 };
    }
    const ok = !!a.useHeldOnLoc(skull, open, 16);
    return {
      ok,
      id: open.id | 0,
      name: open.name,
      x: open.x | 0,
      z: open.z | 0,
      ops: open.ops || []
    };
  }, [OPEN_COFFIN_ID, COFFIN_LOC.x, COFFIN_LOC.z]);
}

function wooPath(talk) {
  const picks = (talk?.picks || []).map(p => String(p));
  const bodies = (talk?.bodies || []).map(b => String(b));
  const chat = (talk?.chat || []).map(c => String(c));
  if (picks.some(p => /speak ghost|that'?s interesting|treasure/i.test(p))) return 'Wooooo options';
  if (bodies.some(b => /wooo\s*wooo|woooo!/i.test(b))) return 'Wooooo body';
  if (chat.some(c => /wooo\s*wooo/i.test(c))) return 'Wooooo chat';
  return null;
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[ghe2e] ${base} user=${username} Restless Ghost SHIP e2e`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`ghe2e_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'energy', 200).catch(() => {});

    console.log('PHASE start');
    const before = await getServerVarQuiet(page, 'prieststart');
    console.log('[ghe2e] prieststart start', before);
    if (Number(before) !== 0) fail(`prieststart=${before} want 0 (do not soft-start this e2e)`);

    console.log('PHASE aereck');
    await commute(page, AERECK, 'aereck');
    if (shot) await shot('01-aereck');
    const start = await talkNpc(page, 'Father Aereck', ["i'm looking for a quest", 'looking for a quest'], 100);
    console.log('[ghe2e] aereck talk', JSON.stringify(start));
    if (!start?.ok) {
      await dumpState(page, 'aereck-talk-fail');
      fail(`Talk Father Aereck failed ${JSON.stringify(start)}`);
    }
    if (start?.noTrig) fail(start.noTrig);
    const started = await getServerVarQuiet(page, 'prieststart');
    if (Number(started) !== 1) {
      await dumpState(page, 'aereck-no-write');
      fail(`prieststart=${started} after Aereck (want 1)`);
    }
    if (shot) await shot('02-started');
    console.log('PHASE started', started);

    console.log('PHASE urhney');
    await commute(page, URHNEY, 'urhney');
    if (shot) await shot('03-urhney');
    const urh = await talkNpc(
      page,
      'Father Urhney',
      ['father aereck sent me', "he's got a ghost haunting", 'ghost haunting'],
      120
    );
    console.log('[ghe2e] urhney talk', JSON.stringify(urh));
    if (!urh?.ok) {
      await dumpState(page, 'urhney-talk-fail');
      fail(`Talk Father Urhney failed ${JSON.stringify(urh)}`);
    }
    if (urh?.noTrig) fail(urh.noTrig);
    const spoken = await getServerVarQuiet(page, 'prieststart');
    const hasAmulet = (await invHas(page, 'ghostspeak')) || (await wornHas(page, 'ghostspeak'));
    if (Number(spoken) !== 2 || !hasAmulet) {
      await dumpState(page, 'urhney-no-write');
      fail(`prieststart=${spoken} after Urhney (want 2 + Ghostspeak) inv=${JSON.stringify(await invNames(page))}`);
    }
    if (shot) await shot('04-amulet');
    console.log('PHASE spoken-urhney', spoken);

    console.log('PHASE equip');
    if (!(await wornHas(page, 'ghostspeak'))) {
      const wear = await equipGhostspeak(page);
      console.log('[ghe2e] wear ghostspeak', JSON.stringify(wear));
      await waitTicks(page, 4);
    }
    if (!(await wornHas(page, 'ghostspeak'))) {
      await dumpState(page, 'no-worn-ghostspeak');
      fail(`Ghostspeak not worn inv=${JSON.stringify(await invNames(page))} worn=${JSON.stringify(await wornNames(page))}`);
    }

    console.log('PHASE ghost');
    await commute(page, COFFIN, 'coffin');
    if (shot) await shot('05-coffin');
    let opened = false;
    for (let i = 0; i < 6 && !opened; i++) {
      const op = await openCoffin(page);
      console.log('[ghe2e] open coffin', i, JSON.stringify(op));
      await waitTicks(page, 6);
      await dismiss(page);
      const snap = await coffinSnap(page);
      opened = !!snap?.opened;
      if (snap?.already) opened = true;
    }
    if (!opened) {
      await dumpState(page, 'coffin-shut');
      fail(`coffin not open at ${JSON.stringify(COFFIN_LOC)} ${JSON.stringify(await coffinSnap(page))}`);
    }
    let ghost = (await listNpcs(page)).find(n => /restless ghost/i.test(String(n?.name ?? '')) || (n.id | 0) === 457);
    for (let i = 0; i < 6 && !ghost; i++) {
      console.log('[ghe2e] wait ghost', i, JSON.stringify(await listNpcs(page)));
      await waitTicks(page, 4);
      ghost = (await listNpcs(page)).find(n => /restless ghost/i.test(String(n?.name ?? '')) || (n.id | 0) === 457);
    }
    if (!ghost) {
      await dumpState(page, 'no-ghost');
      fail(`no Restless ghost after Open shutghostcoffin npcs=${JSON.stringify(await listNpcs(page))}`);
    }
    const ghostTalk = await talkNpc(page, 'Restless ghost', ['yep, now tell me what the problem is', 'yep, now tell me'], 120);
    console.log('[ghe2e] ghost talk', JSON.stringify(ghostTalk));
    if (ghostTalk?.noTrig) fail(ghostTalk.noTrig);
    const woo = wooPath(ghostTalk);
    if (woo) {
      await dumpState(page, 'woooo');
      fail(`${woo} — Ghostspeak worn check failed ${JSON.stringify(ghostTalk)}`);
    }
    if (!ghostTalk?.ok) {
      await dumpState(page, 'ghost-talk-fail');
      fail(`Talk Restless ghost failed ${JSON.stringify(ghostTalk)}`);
    }
    const spokenGhost = await getServerVarQuiet(page, 'prieststart');
    if (Number(spokenGhost) !== 3) {
      await dumpState(page, 'ghost-no-write');
      fail(`prieststart=${spokenGhost} after ghost (want 3) bodies=${JSON.stringify(ghostTalk?.bodies)}`);
    }
    if (shot) await shot('06-spoken-ghost');
    console.log('PHASE spoken-ghost', spokenGhost);

    console.log('PHASE skull');
    await commute(page, SKULL, 'skull basement');
    if (shot) await shot('07-skull-tile');
    let haveSkull = await invHas(page, 'skull');
    for (let i = 0; i < 10 && !haveSkull; i++) {
      const ground = await listGround(page);
      const take = await takeNamed(page, 'Skull', 14);
      console.log('[ghe2e] take skull', i, take, 'ground', JSON.stringify(ground));
      await waitTicks(page, 3);
      await dismiss(page);
      haveSkull = await invHas(page, 'skull');
      const chat = await recentChat(page, 12);
      const refuse = chat.find(t => /looks scary|already have the Ghost/i.test(t));
      if (refuse && !haveSkull) {
        await dumpState(page, 'skull-refuse');
        fail(`skull take refused: ${refuse}`);
      }
      if (haveSkull) break;
    }
    const gotSkull = await getServerVarQuiet(page, 'prieststart');
    const skel = (await listNpcs(page)).filter(n => /skeleton/i.test(String(n?.name ?? '')) || (n.id | 0) === SKELETON_ID);
    console.log('[ghe2e] after take prieststart', gotSkull, 'skel', JSON.stringify(skel), 'inv', await invNames(page));
    if (!haveSkull) {
      await dumpState(page, 'no-skull');
      fail(`no Skull at ${JSON.stringify(SKULL_OBJ)} inv=${JSON.stringify(await invNames(page))} ground=${JSON.stringify(await listGround(page))}`);
    }
    if (Number(gotSkull) !== 4) {
      await dumpState(page, 'skull-no-write');
      fail(`prieststart=${gotSkull} after Skull take (want 4)`);
    }
    if (shot) await shot('08-skull');
    console.log('PHASE obtained-skull', gotSkull, 'flee skeleton');

    console.log('PHASE return');
    await commute(page, COFFIN, 'coffin return');
    opened = false;
    for (let i = 0; i < 6 && !opened; i++) {
      const op = await openCoffin(page);
      console.log('[ghe2e] reopen coffin', i, JSON.stringify(op));
      await waitTicks(page, 6);
      await dismiss(page);
      const snap = await coffinSnap(page);
      opened = !!snap?.opened;
    }
    if (!opened) {
      await dumpState(page, 'return-coffin-shut');
      fail(`return coffin not open ${JSON.stringify(await coffinSnap(page))}`);
    }
    let used = false;
    for (let i = 0; i < 6 && (await invHas(page, 'skull')); i++) {
      const use = await useSkullOnOpenCoffin(page);
      console.log('[ghe2e] skull on open coffin', i, JSON.stringify(use));
      if (use?.err === 'coffin still shut') {
        await dumpState(page, 'use-on-shut');
        fail(`used Skull on shutghostcoffin (want restless_ghost_altar 2146) ${JSON.stringify(use)}`);
      }
      await waitTicks(page, 6);
      await dismiss(page);
      const chat = await recentChat(page, 16);
      const noTrig = chat.find(t => /No trigger for/i.test(t));
      if (noTrig) {
        await dumpState(page, 'use-notrig');
        fail(noTrig);
      }
      const openFirst = chat.find(t => /open it first/i.test(t));
      if (openFirst) {
        await dumpState(page, 'open-it-first');
        fail(`Skull on shut coffin: ${openFirst}`);
      }
      used = use?.ok || !(await invHas(page, 'skull'));
    }
    for (let i = 0; i < 40; i++) {
      const now = Number(await getServerVarQuiet(page, 'prieststart'));
      if (now === 5) break;
      await dismiss(page);
      await waitTicks(page, 2);
      if (i % 8 === 0) {
        console.log('[ghe2e] complete settle', i, 'prieststart', now, 'inv', await invNames(page));
      }
    }
    await waitTicks(page, 4);
    if (shot) await shot('09-complete');
    const done = await getServerVarQuiet(page, 'prieststart');
    const end = await worldTile(page);
    const endInv = await invNames(page);
    const endChat = await recentChat(page, 20);
    console.log('[ghe2e] after return prieststart', done, 'tile', end, 'inv', endInv);

    if (Math.abs((end.x | 0) - COFFIN.x) > 12 || Math.abs((end.z | 0) - COFFIN.z) > 12) {
      fail(`dest invented ${JSON.stringify(end)}`);
    }
    if (Number(done) !== 5) {
      await dumpState(page, 'not-complete');
      fail(
        `prieststart=${done} after skull-in-coffin (want 5) used=${used} ` +
          `inv=${JSON.stringify(endInv)} chat=${JSON.stringify(endChat)}`
      );
    }

    console.log(`RESULT PASS ghe2e Restless Ghost 0→1→2→3→4→5 no dest user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
