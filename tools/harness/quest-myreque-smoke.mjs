#!/usr/bin/env node
/**
 * In Search of the Myreque — start + mid smoke through hideout / ambush.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-myreque-smoke.mjs   # headed default
 *   MYREQUE_MID_ONLY=1 …  # soft stage 5 → product Cyreg…Veliaf
 *   MYREQUE_FROM=65 …     # soft stage 65 + bits → product weapons+cutscene ≥80
 *   MYREQUE_FROM=65 MYREQUE_TO=85 …  # cutscene then product hellhound kill ≥85
 *   MYREQUE_FROM=80 …     # soft ambush + product hellhound kill ≥85
 *   MYREQUE_FROM=85 …     # soft saved_myreque + product Veliaf exit dialogue ≥90
 *   MYREQUE_FROM=90 …     # soft exit-told + product false wall ≥95 + ladder ≥97
 *   MYREQUE_FROM=97 …     # soft found_exit + product Stranger complete ≥105
 *   MYREQUE_FROM=80 MYREQUE_TO=90 …  # hellhound then Veliaf exit
 *   HEADLESS=1 …          # CI/agent only
 *
 * Soft: druidspirit 110; mid-only softs stage 5; steel weapons; pouch×5 + planks×3 + coins;
 *       FROM=65 also softs routequest_myreque_bits=31 (all 5 intros).
 *       FROM=80 softs stage 80 + combat floor + adamant kit; product death → 85.
 *       FROM=85 softs stage 85; product Veliaf multi “How do I get out of here?” → 90.
 *       FROM=90 softs stage 90; product false wall →95, ladder →97.
 *       FROM=97 softs stage 97; product Canifis Stranger dialogue → complete 105.
 * Product: Vanstrom ≥5 … door ≥60; Veliaf ≥65; cutscene ≥80; hellhound ≥85; exit ≥90; wall/ladder ≥97; complete ≥105.
 *
 * @see docs/research/port-quest-routequest-289-to-377.md
 * @see docs/plans/2026-08-08-myreque-hellhound-85.md
 * @see docs/plans/2026-08-08-myreque-cutscene-80.md
 * @see docs/plans/2026-08-07-lane-a-hollow-idris.md
 */
import {
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
  setStats,
  setWorldSpeed,
  teleTo,
  waitSceneReady
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'myr');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';
const midOnly = process.env.MYREQUE_MID_ONLY === '1' || process.env.MYREQUE_MID_ONLY === 'true';
/** Soft-seed stage and jump to a mid gate (e.g. 65 = Veliaf weapons+cutscene only). */
const fromStage = Number(process.env.MYREQUE_FROM || 0) || 0;
/** Target stage for staged mids (defaults: 97→105, 90→97, 85→90, 80→85, 65→80). */
const toStage =
  Number(
    process.env.MYREQUE_TO ||
      (fromStage >= 97
        ? 105
        : fromStage >= 90
          ? 97
          : fromStage >= 85
            ? 90
            : fromStage >= 80
              ? 85
              : fromStage >= 65
                ? 80
                : 65)
  ) || 65;

/** Veliaf Hurtz — hideout underground ~3506,9838 */
const VELIAF = { x: 3506, z: 9838, level: 0 };
/** m54_153 loc 5052 @ 0 24 45 → false wall; loc 5054 @ 0 21 54 → ladder */
const FALSE_WALL = { x: 54 * 64 + 24, z: 153 * 64 + 45, level: 0 }; // 3480,9837
const BASEMENT_LADDER = { x: 54 * 64 + 21, z: 153 * 64 + 54, level: 0 }; // 3477,9846

/** Skeleton Hellhound vislevel 97; 289 combat ATK70 STR110 DEF100 HP55 — adamant host kit. */
const HELLHOUND_STATS = {
  attack: 80,
  strength: 80,
  defence: 70,
  hitpoints: 85,
  agility: 25
};

/**
 * Vanstrom multi (sitting) — Canifis Hair of the Dog.
 * Map: m54_54.jm2 NPC `0 47 21: 2020` (multi_vanstrom_stranger_entity)
 * → world **3503,3477** L0. multivar thsfm_vanstrom_hide bit0 → sitting.
 * mid1 FAIL used m43_52 LOC `1577` (stone_arched_doortop) — same number as npc pack id, not spawn.
 */
const VANSTROM = { x: 54 * 64 + 47, z: 54 * 64 + 21, level: 0 }; // 3503,3477
/** Cyreg Paddlehorn — n55_51 id 1567 → 3522,3284 L0 */
const CYREG = { x: 3522, z: 3284, level: 0 };

async function talkNpc(page, npcName, prefer = [], iters = 72) {
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
        if ((r.modals?.()?.chat ?? -1) === -1 && i > 10) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(24).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 20), chat: chat.slice(0, 14) };
    },
    [npcName, prefer, iters]
  );
}

async function continueThrash(page, iters = 16, ms = 280) {
  await page.evaluate(
    async ([n, d]) => {
      const a = globalThis.__lc377?.actions;
      for (let i = 0; i < n; i++) {
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
        await new Promise(r => setTimeout(r, d));
      }
    },
    [iters, ms]
  );
}

/** Hideout ambush: hellhound spawn 0_54_153_50_42 → world 3506,9834; stalagmite 36,32 → 3492,9824. */
const HELLHOUND_SPAWN = { x: 54 * 64 + 50, z: 153 * 64 + 42, level: 0 }; // 3506,9834
const STALAGMITE = { x: 54 * 64 + 36, z: 153 * 64 + 32, level: 0 }; // 3492,9824

async function prepHellhoundCombat(page) {
  console.log('[myreque] prep hellhound combat', JSON.stringify(HELLHOUND_STATS));
  await setStats(page, HELLHOUND_STATS);
  await giveItems(page, [
    ['adamant_scimitar', 1],
    ['adamant_platebody', 1],
    ['adamant_platelegs', 1],
    ['adamant_kiteshield', 1],
    ['lobster', 20]
  ]).catch(() => {});
  await page.evaluate(async () => {
    const a = globalThis.__lc377?.actions;
    for (const n of [
      'Adamant scimitar',
      'Adamant platebody',
      'Adamant platelegs',
      'Adamant kiteshield'
    ]) {
      a?.equip?.(n);
      await new Promise(r => setTimeout(r, 350));
    }
  });
}

/**
 * Product false wall (stage ≥90) → discovered_wall 95; ladder → found_exit 97 + Canifis tele.
 * Map: m54_153 `0 24 45: 5052`, `0 21 54: 5054`.
 */
async function productWallAndLadder(page) {
  console.log('[myreque] product false wall', FALSE_WALL);
  if (!(await teleTo(page, FALSE_WALL, 2, 25_000))) fail('tele false wall failed');
  await waitSceneReady(page, 15_000);
  const wallOp = await page.evaluate(async ([wx, wz]) => {
    const a = globalThis.__lc377?.actions;
    const ok =
      a?.opLocAt?.(wx, wz, '') ||
      a?.opLoc?.('wall', 'search') ||
      a?.opLoc?.('wall', '') ||
      a?.opLoc?.('false', '');
    await new Promise(r => setTimeout(r, 900));
    a?.continueDialog?.();
    a?.dismissModalMessage?.();
    return !!ok;
  }, [FALSE_WALL.x, FALSE_WALL.z]);
  console.log('[myreque] false wall op', wallOp);
  await continueThrash(page, 6, 280);
  let stage = await getServerVarQuiet(page, 'routequest');
  console.log(`[myreque] after wall routequest=${stage}`);
  if (Number(stage) < 95) {
    // retry once
    await page.evaluate(async ([wx, wz]) => {
      const a = globalThis.__lc377?.actions;
      a?.opLocAt?.(wx, wz, '');
      await new Promise(r => setTimeout(r, 1000));
      a?.continueDialog?.();
    }, [FALSE_WALL.x, FALSE_WALL.z]);
    await continueThrash(page, 4, 280);
    stage = await getServerVarQuiet(page, 'routequest');
  }
  if (Number(stage) < 95) fail(`wall-gate FAIL: routequest=${stage} want≥95`);

  console.log('[myreque] product basement ladder', BASEMENT_LADDER);
  if (!(await teleTo(page, BASEMENT_LADDER, 2, 25_000))) fail('tele ladder failed');
  await waitSceneReady(page, 15_000);
  const ladderOp = await page.evaluate(async ([wx, wz]) => {
    const a = globalThis.__lc377?.actions;
    const ok =
      a?.opLocAt?.(wx, wz, '') ||
      a?.opLoc?.('ladder', 'climb') ||
      a?.opLoc?.('ladder', '');
    await new Promise(r => setTimeout(r, 900));
    a?.continueDialog?.();
    a?.dismissModalMessage?.();
    return !!ok;
  }, [BASEMENT_LADDER.x, BASEMENT_LADDER.z]);
  console.log('[myreque] ladder op', ladderOp);
  await page.waitForTimeout(1200);
  stage = await getServerVarQuiet(page, 'routequest');
  console.log(`[myreque] after ladder routequest=${stage}`);
  if (Number(stage) < 97) {
    await page.evaluate(async ([wx, wz]) => {
      globalThis.__lc377?.actions?.opLocAt?.(wx, wz, '');
      await new Promise(r => setTimeout(r, 1000));
    }, [BASEMENT_LADDER.x, BASEMENT_LADDER.z]);
    await page.waitForTimeout(800);
    stage = await getServerVarQuiet(page, 'routequest');
  }
  return Number(stage);
}

/**
 * Product Veliaf at saved_myreque (85): post-kill chat → multi → "How do I get out of here?" → 90.
 * Stage write is exact-equality on 85 for the open multi; only sets if < told_exit_route.
 */
async function talkVeliafExitRoute(page) {
  console.log('[myreque] product Veliaf exit-route dialogue', VELIAF);
  if (!(await teleTo(page, VELIAF, 3, 30_000))) fail('tele Veliaf exit failed');
  await waitSceneReady(page, 20_000);
  const talk = await talkNpc(
    page,
    'Veliaf',
    [
      'how do i get out',
      'get out of here',
      'out of here',
      'yes, i think i understand',
      'understand',
      'hello',
      'ok, thanks',
      'thanks'
    ],
    90
  );
  console.log('[myreque] talk Veliaf exit', JSON.stringify(talk));
  if (talk?.noTrig) fail(talk.noTrig);
  // Multi may need a second pick if first talk only advanced intro lines
  let stage = await getServerVarQuiet(page, 'routequest');
  if (Number(stage) < 90) {
    const talk2 = await talkNpc(
      page,
      'Veliaf',
      ['how do i get out', 'get out of here', 'out of here', 'ok, thanks'],
      48
    );
    console.log('[myreque] talk Veliaf exit retry', JSON.stringify(talk2));
    stage = await getServerVarQuiet(page, 'routequest');
  }
  return Number(stage);
}

/**
 * Ensure skeleton hellhound is on scene and aggressive, then fight until despawn / stage ≥85.
 * Product: [ai_queue3,skeleton_hellhound] → queue skeleton_hellhound_defeat → routequest 85.
 */
async function fightSkeletonHellhound(page, { timeoutMs = 180_000 } = {}) {
  // If not already present (soft FROM=80), squeeze stalagmite to re-summon at ambush stage.
  let has = await page.evaluate(() =>
    (globalThis.__lc377?.reader?.npcs?.() ?? []).some(n =>
      /skeleton hellhound/i.test(String(n?.name ?? ''))
    )
  );
  if (!has) {
    console.log('[myreque] no hellhound on scene — tele stalagmite + squeeze for spawn');
    if (!(await teleTo(page, STALAGMITE, 2, 25_000))) {
      console.warn('[myreque] tele stalagmite failed; try spawn tile');
      if (!(await teleTo(page, HELLHOUND_SPAWN, 2, 25_000))) fail('tele hellhound area failed');
    }
    await waitSceneReady(page, 15_000);
    const squeezed = await page.evaluate(async ([sx, sz]) => {
      const a = globalThis.__lc377?.actions;
      // [oploc2,route_stalagmite_cave_entrace] — squeeze / enter
      let ok =
        a?.opLoc?.('stalagmite', 'squeeze') ||
        a?.opLoc?.('stalagmite', '') ||
        a?.opLoc?.('cave', '') ||
        a?.opLocAt?.(sx, sz, 'squeeze') ||
        a?.opLocAt?.(sx, sz, '');
      await new Promise(res => setTimeout(res, 800));
      a?.continueDialog?.();
      a?.dismissModalMessage?.();
      return !!ok;
    }, [STALAGMITE.x, STALAGMITE.z]).catch(() => false);
    console.log('[myreque] stalagmite squeeze', squeezed);
    await continueThrash(page, 6, 300);
    // Wait for summon puff + npc_add
    const tSpawn = Date.now();
    while (Date.now() - tSpawn < 20_000) {
      has = await page.evaluate(() =>
        (globalThis.__lc377?.reader?.npcs?.() ?? []).some(n =>
          /skeleton hellhound/i.test(String(n?.name ?? ''))
        )
      );
      if (has) break;
      await page.waitForTimeout(500);
    }
  }

  if (!has) {
    // Last resort: stand on spawn tile and re-try scene read after short wait
    await teleTo(page, HELLHOUND_SPAWN, 1, 20_000);
    await page.waitForTimeout(1500);
    has = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.npcs?.() ?? []).some(n =>
        /skeleton hellhound/i.test(String(n?.name ?? ''))
      )
    );
  }
  if (!has) fail('hellhound never appeared on scene (need stage 80 + spawn)');

  console.log('[myreque] attack Skeleton Hellhound');
  await page.evaluate(() => {
    const a = globalThis.__lc377?.actions;
    a?.attackNpc?.('Skeleton Hellhound') || a?.npcOpName?.('Skeleton Hellhound', 2);
  });

  const t0 = Date.now();
  let stage = await getServerVarQuiet(page, 'routequest');
  let f = 0;
  while (Date.now() - t0 < timeoutMs && Number(stage) < 85) {
    f++;
    await page.waitForTimeout(400);
    const still = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.npcs?.() ?? []).some(n =>
        /skeleton hellhound/i.test(String(n?.name ?? ''))
      )
    );
    if (still && f % 5 === 0) {
      await page.evaluate(() => globalThis.__lc377?.actions?.attackNpc?.('Skeleton Hellhound'));
    }
    if (still && f % 4 === 2) {
      await page.evaluate(() => globalThis.__lc377?.actions?.eatIfNeeded?.('Lobster', 12));
    }
    if (!still && f > 5) {
      // death queue may lag a tick
      await page.waitForTimeout(800);
      stage = await getServerVarQuiet(page, 'routequest');
      if (Number(stage) >= 85) break;
    }
    if (f % 25 === 0) {
      stage = await getServerVarQuiet(page, 'routequest');
      const hp = await page.evaluate(() => globalThis.__lc377?.reader?.hitpoints?.());
      console.log(
        `[myreque] hellhound fight f=${f} still=${still} routequest=${stage} hp=${JSON.stringify(hp)}`
      );
    }
    stage = await getServerVarQuiet(page, 'routequest');
  }
  console.log(
    `[myreque] after hellhound routequest=${stage} elapsed=${Date.now() - t0}ms f=${f}`
  );
  return Number(stage);
}

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  page.on('console', msg => {
    const t = msg.text();
    if (/routequest|vanstrom|myreque|trigger|error|script/i.test(t)) {
      console.log(`[browser.${msg.type()}] ${t.slice(0, 260)}`);
    }
  });

  console.log(
    `[myreque] ${base} user=${username} midOnly=${midOnly} from=${fromStage || 'start'} (headed default)`
  );
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`myreque_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }

  await mainlandAccount(page, username, password);
  await waitSceneReady(page, 45_000);
  await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

  // Vanstrom gate: %druidspirit < ^druid_complete (4) blocks start — SOFT
  console.log('[myreque] SOFT setvar druidspirit 110 (NS complete labeled soft)');
  await cheatQuiet(page, 'setvar druidspirit 110', 500);

  let stage = 0;

  // --- Fast mid: Stranger complete (soft ≥97 → product queue complete ≥105) ---
  if (fromStage >= 97) {
    console.log(`[myreque] SOFT routequest ${fromStage} (found exit) → product Stranger complete ≥105`);
    await cheatQuiet(page, `setvar routequest ${fromStage}`, 500);
    // multi shows sitting Vanstrom until talk flips type when stage ≥ ambush
    await cheatQuiet(page, 'setvar routequestmulti 0', 400);
    stage = await getServerVarQuiet(page, 'routequest');
    if (Number(stage) < 97) fail(`soft FROM found-exit failed got ${stage}`);
    console.log('[myreque] product Stranger/Vanstrom Canifis', VANSTROM);
    if (!(await teleTo(page, VANSTROM, 3, 30_000))) fail('tele Canifis Vanstrom failed');
    await waitSceneReady(page, 20_000);
    const talkSt = await talkNpc(
      page,
      'Stranger',
      [
        'vanstrom',
        'murderer',
        'score to settle',
        'definitely',
        'sorry',
        'someone else',
        'hello',
        'ok, thanks'
      ],
      72
    );
    console.log('[myreque] talk Stranger', JSON.stringify(talkSt));
    // Sitting multi name is still Vanstrom until changetype
    if (!talkSt?.ok || talkSt?.noTrig) {
      const talkVa = await talkNpc(
        page,
        'Vanstrom',
        [
          'vanstrom',
          'murderer',
          'score to settle',
          'definitely',
          'sorry',
          'someone else',
          'hello',
          'ok, thanks'
        ],
        72
      );
      console.log('[myreque] talk Vanstrom→stranger', JSON.stringify(talkVa));
      if (talkVa?.noTrig) fail(talkVa.noTrig);
    }
    const t0 = Date.now();
    while (Date.now() - t0 < 30_000) {
      stage = await getServerVarQuiet(page, 'routequest');
      if (Number(stage) >= 105) break;
      await continueThrash(page, 4, 280);
      await page.waitForTimeout(400);
    }
    stage = await getServerVarQuiet(page, 'routequest');
    if (shot) await shot('after-complete');
    if (!(Number(stage) >= 105)) {
      fail(`complete-gate FAIL: routequest=${stage} want≥105`);
    }
    console.log(
      `RESULT: PASS (Myreque complete routequest=${stage} ≥105; product Stranger; SOFT stage${fromStage})`
    );
    process.exit(0);
  }

  // --- Fast mid: false wall + ladder (soft ≥90 → product ≥95/97; optional complete) ---
  if (fromStage >= 90) {
    console.log(
      `[myreque] SOFT routequest ${fromStage} (exit told) → product wall+ladder ≥97 to=${toStage}`
    );
    await cheatQuiet(page, `setvar routequest ${fromStage}`, 500);
    stage = await getServerVarQuiet(page, 'routequest');
    if (Number(stage) < 90) fail(`soft FROM exit-told failed got ${stage}`);
    stage = await productWallAndLadder(page);
    if (shot) await shot('after-ladder');
    if (!(Number(stage) >= 97)) {
      fail(`ladder-gate FAIL: routequest=${stage} want≥97 (found_exit)`);
    }
    if (toStage >= 105) {
      await cheatQuiet(page, 'setvar routequestmulti 0', 400);
      if (!(await teleTo(page, VANSTROM, 3, 30_000))) fail('tele Canifis Vanstrom failed');
      await waitSceneReady(page, 20_000);
      await talkNpc(
        page,
        'Vanstrom',
        ['vanstrom', 'murderer', 'definitely', 'sorry', 'someone else', 'hello'],
        72
      );
      await talkNpc(
        page,
        'Stranger',
        ['vanstrom', 'murderer', 'definitely', 'sorry', 'someone else', 'hello'],
        48
      );
      const t0 = Date.now();
      while (Date.now() - t0 < 30_000) {
        stage = await getServerVarQuiet(page, 'routequest');
        if (Number(stage) >= 105) break;
        await continueThrash(page, 4, 280);
        await page.waitForTimeout(400);
      }
      stage = await getServerVarQuiet(page, 'routequest');
      if (shot) await shot('after-complete');
      if (!(Number(stage) >= 105)) fail(`complete-gate FAIL: routequest=${stage} want≥105`);
      console.log(
        `RESULT: PASS (Myreque wall+ladder+complete routequest=${stage} ≥105; product; SOFT stage${fromStage})`
      );
      process.exit(0);
    }
    console.log(
      `RESULT: PASS (Myreque wall+ladder routequest=${stage} ≥97; product locs; SOFT stage${fromStage})`
    );
    process.exit(0);
  }

  // --- Fast mid: Veliaf exit route only (soft 85 → product multi ≥90; optional wall+ladder) ---
  if (fromStage >= 85) {
    console.log(
      `[myreque] SOFT routequest ${fromStage} (saved) → product Veliaf exit ≥90 to=${toStage}`
    );
    await cheatQuiet(page, `setvar routequest ${fromStage}`, 500);
    stage = await getServerVarQuiet(page, 'routequest');
    if (Number(stage) < 85) fail(`soft FROM saved failed got ${stage}`);
    // Product path uses exact stage 85 for the open multi; clamp soft if higher
    if (Number(stage) !== 85) {
      console.log('[myreque] SOFT clamp routequest 85 (Veliaf multi is exact equality)');
      await cheatQuiet(page, 'setvar routequest 85', 500);
    }
    stage = await talkVeliafExitRoute(page);
    if (shot) await shot('after-exit-route');
    if (!(Number(stage) >= 90)) {
      fail(`exit-route-gate FAIL: routequest=${stage} want≥90 (told_exit_route)`);
    }
    if (toStage >= 95) {
      stage = await productWallAndLadder(page);
      if (shot) await shot('after-ladder');
      if (!(Number(stage) >= 97)) {
        fail(`ladder-gate FAIL: routequest=${stage} want≥97 after exit`);
      }
      console.log(
        `RESULT: PASS (Myreque exit+wall+ladder routequest=${stage} ≥97; product; SOFT stage${fromStage})`
      );
      process.exit(0);
    }
    console.log(
      `RESULT: PASS (Myreque exit-route routequest=${stage} ≥90; product Veliaf multi; SOFT stage${fromStage})`
    );
    process.exit(0);
  }

  // --- Fast mid: hellhound kill (soft ambush 80 → product death ≥85; optional Veliaf exit) ---
  if (fromStage >= 80) {
    console.log(
      `[myreque] SOFT routequest ${fromStage} (ambush) → product hellhound ≥85 to=${toStage}`
    );
    await cheatQuiet(page, `setvar routequest ${fromStage}`, 500);
    stage = await getServerVarQuiet(page, 'routequest');
    if (Number(stage) < 80) fail(`soft FROM ambush failed got ${stage}`);
    await prepHellhoundCombat(page);
    // Tele near spawn first; fight helper re-summons via stalagmite if missing
    if (!(await teleTo(page, HELLHOUND_SPAWN, 3, 30_000))) fail('tele hideout spawn failed');
    await waitSceneReady(page, 20_000);
    stage = await fightSkeletonHellhound(page);
    if (shot) await shot('after-hellhound');
    if (!(Number(stage) >= 85)) {
      fail(`hellhound-gate FAIL: routequest=${stage} want≥85 (saved_myreque)`);
    }
    if (toStage >= 90) {
      stage = await talkVeliafExitRoute(page);
      if (shot) await shot('after-exit-route');
      if (!(Number(stage) >= 90)) {
        fail(`exit-route-gate FAIL: routequest=${stage} want≥90 after hellhound`);
      }
      console.log(
        `RESULT: PASS (Myreque hellhound+exit routequest=${stage} ≥90; product kill+Veliaf; SOFT stage${fromStage}+combat)`
      );
      process.exit(0);
    }
    console.log(
      `RESULT: PASS (Myreque hellhound routequest=${stage} ≥85; product kill; SOFT stage${fromStage}+combat prep)`
    );
    process.exit(0);
  }

  // --- Fast mid: soft stage + member bits, product weapons handoff + cutscene → ≥80 (+ optional hellhound) ---
  if (fromStage >= 65) {
    console.log(`[myreque] SOFT routequest ${fromStage} + myreque_bits 31 (all intros) to=${toStage}`);
    await cheatQuiet(page, `setvar routequest ${fromStage}`, 500);
    await cheatQuiet(page, 'setvar routequest_myreque_bits 31', 400);
    stage = await getServerVarQuiet(page, 'routequest');
    if (Number(stage) < 65) fail(`soft FROM stage failed got ${stage}`);

    await giveItems(page, [
      ['steel_longsword', 1],
      ['steel_sword', 2],
      ['steel_dagger', 1],
      ['steel_mace', 1],
      ['steel_warhammer', 1]
    ]).catch(() => {});

    console.log('[myreque] product weapons+cutscene at Veliaf', VELIAF);
    if (!(await teleTo(page, VELIAF, 4, 30_000))) fail('tele Veliaf failed');
    await waitSceneReady(page, 20_000);

    // Prefer weapons path options; thrash cutscene continues
    const talkVe = await talkNpc(
      page,
      'Veliaf',
      [
        'weapons',
        "you've introduced",
        'look at those weapons',
        'hello',
        'ok, thanks',
        'thanks',
        'continue'
      ],
      120
    );
    console.log('[myreque] talk Veliaf cutscene', JSON.stringify(talkVe));
    if (talkVe?.noTrig) fail(talkVe.noTrig);

    // Cutscene is long (many p_delay + chatnpc_specific)
    const t0 = Date.now();
    const waitMs = 120_000;
    stage = await getServerVarQuiet(page, 'routequest');
    while (Date.now() - t0 < waitMs && Number(stage) < 80) {
      await continueThrash(page, 8, 280);
      await page.evaluate(async () => {
        const a = globalThis.__lc377?.actions;
        try {
          a?.continueDialog?.();
          a?.chatContinue?.();
          a?.dismissModalMessage?.();
        } catch {
          /* ignore */
        }
        await new Promise(r => setTimeout(r, 200));
      }).catch(() => {});
      stage = await getServerVarQuiet(page, 'routequest');
    }
    console.log(
      `[myreque] after cutscene routequest=${stage} elapsed=${Date.now() - t0}ms`
    );
    if (shot) await shot('after-cutscene');
    if (!(Number(stage) >= 80)) {
      fail(
        `cutscene-gate FAIL: routequest=${stage} want≥80 (ambush). talk=${JSON.stringify(talkVe)}`
      );
    }

    if (toStage >= 85) {
      await prepHellhoundCombat(page);
      stage = await fightSkeletonHellhound(page);
      if (shot) await shot('after-hellhound');
      if (!(Number(stage) >= 85)) {
        fail(`hellhound-gate FAIL: routequest=${stage} want≥85 after cutscene`);
      }
      console.log(
        `RESULT: PASS (Myreque ambush+hellhound routequest=${stage} ≥85; product cutscene+kill; SOFT stage${fromStage}+bits31+weapons+combat)`
      );
      process.exit(0);
    }

    console.log(
      `RESULT: PASS (Myreque cutscene routequest=${stage} ≥80; product weapons+cutscene; SOFT stage${fromStage}+bits31+weapons seed)`
    );
    process.exit(0);
  }

  if (!midOnly) {
    await cheatQuiet(page, 'setvar routequest 0', 400);
    // Fresh routequestmulti → thsfm_vanstrom_hide=0 → multi shows sitting Vanstrom
    await cheatQuiet(page, 'setvar routequestmulti 0', 400);

    console.log('[myreque] tele Vanstrom (map multi 2020 @ Canifis)', VANSTROM);
    if (!(await teleTo(page, VANSTROM, 3, 25_000))) fail('tele Vanstrom failed');
    await waitSceneReady(page, 20_000);
    const scene = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.npcs?.() ?? []).map(n => ({
        name: n?.name,
        x: n?.tile?.x ?? n?.x,
        z: n?.tile?.z ?? n?.z
      }))
    );
    console.log('[myreque] scene npcs', JSON.stringify((scene || []).slice(0, 16)));
    const hasVan = (scene || []).some(n => /vanstrom|klause/i.test(String(n?.name ?? '')));
    if (!hasVan) {
      fail(
        `Vanstrom not on map multi spawn (m54_54 0 47 21 → 3503,3477). scene=${JSON.stringify(scene?.slice?.(0, 12))}. Do not npcadd — fix map/product.`
      );
    }
    if (shot) await shot('at-vanstrom');

    // Prefer order = first match wins. Progress path (vanstrom_sitting_dialogue):
    // multi4 → "Why do they need help?" → multi5 w/ offer → "Perhaps I could help"
    // → multi5 w/ accept → "Yes, I'll do it!" → routequest=5. Do NOT prefer "What friends"
    // first (loops multi4 forever — mid3 thrash).
    const prefer = [
      "yes, i'll do it",
      'yes, i will do it',
      'perhaps i could help',
      'why do they need help',
      'are they in trouble',
      'what would i have to do',
      'what weapons',
      'where do i need',
      'what friends', // last resort only
      'ok, thanks'
    ];
    let talk = await talkNpc(page, 'Vanstrom Klause', prefer, 96);
    console.log('[myreque] talk1', JSON.stringify(talk));
    if (!talk?.ok) {
      talk = await talkNpc(page, 'Vanstrom', prefer, 96);
      console.log('[myreque] talk1b', JSON.stringify(talk));
    }
    if (!talk?.ok) fail(`talk Vanstrom failed — NPC present but no op: ${JSON.stringify(talk)}`);
    if (talk?.noTrig) fail(talk.noTrig);
    await continueThrash(page, 20, 300);

    stage = await getServerVarQuiet(page, 'routequest');
    if (!(Number(stage) >= 5)) {
      const talk2 = await talkNpc(page, 'Vanstrom Klause', prefer, 72);
      console.log('[myreque] talk2', JSON.stringify(talk2));
      await continueThrash(page, 16, 300);
      stage = await getServerVarQuiet(page, 'routequest');
    }

    for (let i = 0; i < 6 && Number(stage) < 5; i++) {
      await continueThrash(page, 8, 280);
      stage = await getServerVarQuiet(page, 'routequest');
    }
    console.log(`[myreque] after Vanstrom routequest=${stage}`);
    if (shot) await shot('after-start');

    if (!(Number(stage) >= 5)) {
      fail(`start-gate FAIL: routequest=${stage} want≥5 (^routequest_started)`);
    }
  } else {
    console.log('[myreque] SOFT routequest 5 (start-gate skip)');
    await cheatQuiet(page, 'setvar routequest 5', 500);
    stage = await getServerVarQuiet(page, 'routequest');
    if (Number(stage) !== 5) fail(`soft start stage failed got ${stage}`);
  }

  // Mid A: Cyreg Paddlehorn — product multi → ^routequest_boatman_agreed (15)
  // Soft: steel weapons for ~routequest_has_weapons (not the multi path itself)
  console.log('[myreque] SOFT give steel weapons for Cyreg gate');
  await giveItems(page, [
    ['steel_longsword', 1],
    ['steel_sword', 2],
    ['steel_dagger', 1],
    ['steel_mace', 1],
    ['steel_warhammer', 1]
  ]);

  console.log('[myreque] tele Cyreg', CYREG);
  if (!(await teleTo(page, CYREG, 4, 30_000))) fail('tele Cyreg failed');
  await waitSceneReady(page, 20_000);
  if (shot) await shot('at-cyreg');

  const cyregPrefer = [
    "what kind of a man are you", // page4 → boatman_agreed
    "if you don't tell me, their deaths", // page3 → page4
    'resourceful enough to get their own steel', // page2 → page3
    "well, i guess they'll just die without weapons", // page1 → page2
    'oh come on, you can tell me',
    "i'll give you some cash",
    'i just want to help them',
    'what have they been up against',
    'what kind of loss',
    'who are the drakans',
    'why do you say that this place is forsaken',
    'ok, thanks'
  ];
  let talkCy = await talkNpc(page, 'Cyreg Paddlehorn', cyregPrefer, 120);
  console.log('[myreque] talk Cyreg', JSON.stringify(talkCy));
  if (!talkCy?.ok) {
    talkCy = await talkNpc(page, 'Cyreg', cyregPrefer, 120);
    console.log('[myreque] talk Cyreg2', JSON.stringify(talkCy));
  }
  if (talkCy?.noTrig) fail(talkCy.noTrig);
  await continueThrash(page, 24, 300);

  stage = await getServerVarQuiet(page, 'routequest');
  for (let i = 0; i < 12 && Number(stage) < 15; i++) {
    // re-open multi if still on path
    if (Number(stage) < 15) {
      await talkNpc(page, 'Cyreg Paddlehorn', cyregPrefer, 40).catch(() => {});
      await continueThrash(page, 10, 280);
    }
    stage = await getServerVarQuiet(page, 'routequest');
  }
  console.log(`[myreque] after Cyreg routequest=${stage}`);
  if (shot) await shot('after-cyreg');

  if (!(Number(stage) >= 15)) {
    fail(
      `mid-gate FAIL: routequest=${stage} want≥15 (^routequest_boatman_agreed). talk=${JSON.stringify(talkCy)}`
    );
  }

  // Mid B: boatman_repaired (20) — product plank handoff; SOFT pouch charges + planks
  console.log('[myreque] SOFT give druid_pouch×5 + woodplank×3 + coins (Cyreg take-to-myreque)');
  await giveItems(page, [
    ['druid_pouch', 5],
    ['woodplank', 3],
    ['coins', 50]
  ]);

  const plankPrefer = [
    'give wooden planks to cyreg',
    'will you still take me',
    'yes',
    'ok, thanks'
  ];
  let talkPlank = await talkNpc(page, 'Cyreg Paddlehorn', plankPrefer, 80);
  console.log('[myreque] talk Cyreg planks', JSON.stringify(talkPlank));
  if (talkPlank?.noTrig) fail(talkPlank.noTrig);
  await continueThrash(page, 16, 280);

  stage = await getServerVarQuiet(page, 'routequest');
  for (let i = 0; i < 10 && Number(stage) < 20; i++) {
    await talkNpc(page, 'Cyreg Paddlehorn', plankPrefer, 40).catch(() => {});
    await continueThrash(page, 8, 250);
    stage = await getServerVarQuiet(page, 'routequest');
  }
  console.log(`[myreque] after planks routequest=${stage}`);
  if (shot) await shot('after-planks');

  if (!(Number(stage) >= 20)) {
    fail(
      `mid-gate FAIL: routequest=${stage} want≥20 (^routequest_boatman_repaired). talk=${JSON.stringify(talkPlank)}`
    );
  }

  // Mid C: enter hollows (25) — product oploc1 boat + pay; boat IF stubbed to tele in content
  console.log('[myreque] product boat → hollows (oploc route_rowboat / mortton boat)');
  const boat = await page.evaluate(async () => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    if (!a?.opLoc && !a?.opLocAt) return { error: 'no opLoc' };
    // Map: route_rowboat_mortton @ m55_51 0 3 20 → 3523,3284; op2 = Board (Pay 10)
    let ok = false;
    let how = '';
    if (a.opLocAt?.(3523, 3284, 'pay') || a.opLocAt?.(3523, 3284, 'Board')) {
      ok = true;
      how = 'opLocAt-pay';
    } else if (a.opLoc?.('Swamp Boaty', 'Pay', 16) || a.opLoc?.('Swamp Boaty', 'Board', 16)) {
      ok = true;
      how = 'opLoc-name';
    } else if (a.opLocAt?.(3523, 3284, '') || a.opLoc1At?.(3523, 3284)) {
      ok = true;
      how = 'opLocAt-default';
    }
    await new Promise(res => setTimeout(res, 1000));
    for (let i = 0; i < 24; i++) {
      const opts = (r?.chatOptions?.() ?? [])
        .map(o => (typeof o === 'string' ? o : o?.text))
        .filter(Boolean);
      if (opts.length) {
        const low = opts.map(o => String(o).toLowerCase());
        let pick = low.findIndex(o => o.includes('yes') || o.includes('pay ten'));
        if (pick < 0) pick = 0;
        a.chooseOption?.([opts[pick]]);
      } else {
        a.continueDialog?.();
        a.dismissModalMessage?.();
      }
      await new Promise(res => setTimeout(res, 280));
    }
    return { ok, how };
  });
  console.log('[myreque] boat', boat);
  await continueThrash(page, 12, 300);

  stage = await getServerVarQuiet(page, 'routequest');
  for (let i = 0; i < 10 && Number(stage) < 25; i++) {
    await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      a?.opLoc?.('boat', '', 12) || a?.opLocAt?.(3523, 3284, '');
      await new Promise(r => setTimeout(r, 500));
      a?.chooseOption?.(['Yes, I\'ll pay ten gold.']);
      a?.continueDialog?.();
    }).catch(() => {});
    await continueThrash(page, 8, 280);
    stage = await getServerVarQuiet(page, 'routequest');
  }
  const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
  console.log(`[myreque] after boat routequest=${stage} tile=`, tile);
  if (shot) await shot('after-boat');

  if (!(Number(stage) >= 25)) {
    fail(
      `mid-gate FAIL: routequest=${stage} want≥25 (^routequest_entered_hollowed). boat=${JSON.stringify(boat)} tile=${JSON.stringify(tile)}`
    );
  }

  // Mid D: palm climb-down (oploc2 north palm) → ≥52 found_guard
  // North-angle palm 3502,3431 — stand south (lower z) so not "already down"
  const PALM = { x: 3502, z: 3430, level: 0 };
  console.log('[myreque] product palm climb-down for stage 52', PALM);
  if (!(await teleTo(page, PALM, 2, 25_000))) fail('tele palm failed');
  await waitSceneReady(page, 15_000);
  const palmOp = await page.evaluate(async () => {
    const a = globalThis.__lc377?.actions;
    // op2 = climb down on harmless_dead_palm_mid
    const ok =
      a?.opLocAt?.(3502, 3431, 'down') ||
      a?.opLocAt?.(3502, 3431, 'Climb') ||
      a?.opLoc?.('tree', 'down', 10) ||
      a?.opLoc?.('palm', 'down', 10) ||
      a?.opLocAt?.(3502, 3431, '');
    await new Promise(r => setTimeout(r, 2500));
    return { ok: !!ok };
  });
  console.log('[myreque] palm', palmOp);
  await continueThrash(page, 8, 280);
  stage = await getServerVarQuiet(page, 'routequest');
  for (let i = 0; i < 6 && Number(stage) < 52; i++) {
    await page.evaluate(async () => {
      globalThis.__lc377?.actions?.opLocAt?.(3502, 3431, 'down');
      await new Promise(r => setTimeout(r, 1500));
    });
    stage = await getServerVarQuiet(page, 'routequest');
  }
  console.log(`[myreque] after palm routequest=${stage}`);
  if (shot) await shot('after-palm');
  if (!(Number(stage) >= 52)) {
    fail(`mid-gate FAIL: routequest=${stage} want≥52 (found_guard/palm). palm=${JSON.stringify(palmOp)}`);
  }

  // Mid E: Curpile quiz → ≥55 (product multi + question-aware answers; SOFT weapons)
  // Prefer-list alone fails: Sani appears as a wrong option on leader/etc questions.
  const CURPILE = { x: 3508, z: 3440, level: 0 };
  async function curpileQuizOnce() {
    if (!(await teleTo(page, CURPILE, 3, 25_000))) return { error: 'tele Curpile failed' };
    await waitSceneReady(page, 15_000);
    await giveItems(page, [
      ['steel_longsword', 1],
      ['steel_sword', 2],
      ['steel_dagger', 1],
      ['steel_mace', 1],
      ['steel_warhammer', 1]
    ]).catch(() => {});
    return page.evaluate(async () => {
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
      // Multi header / NPC lines live on chatBodyText (p_choice5_header), not game chat.
      const bodyText = () => {
        try {
          return String(r.chatBodyText?.() ?? '').toLowerCase();
        } catch {
          return '';
        }
      };
      // Map question keywords → correct answer substring (routequest_hollow.rs2)
      const answerFor = txt => {
        if (/youngest/.test(txt)) return 'ivan strom';
        if (/female/.test(txt)) return 'sani piliu';
        if (/leader/.test(txt)) return 'veliaf hurtz';
        if (/scholar|previously a scholar/.test(txt)) return 'polmafi ferdygris';
        if (/boatman/.test(txt)) return 'cyreg paddlehorn';
        if (/family|morytania|rumoured to rule/.test(txt)) return 'drakan';
        return null;
      };
      let ok = !!a.talkNpc?.('Curpile');
      if (!ok) {
        const n = (r.npcs?.() ?? []).find(x =>
          /curpile|fyod/i.test(String(x?.name ?? ''))
        );
        if (n) ok = !!a.npcOp?.(n.index, 1);
      }
      await new Promise(res => setTimeout(res, 1200));
      const picks = [];
      const bodies = [];
      for (let i = 0; i < 120; i++) {
        const opts = getOpts();
        if (opts.length) {
          const low = opts.map(o => String(o).toLowerCase());
          const txt = bodyText();
          bodies.push(txt.slice(0, 120));
          let pick = -1;
          // multi open: help myreque
          if (low.some(o => o.includes("i've come to help") || o.includes('brought weapons'))) {
            pick = low.findIndex(
              o => o.includes("i've come to help") || o.includes('brought weapons')
            );
          } else {
            const want = answerFor(txt);
            if (want) {
              pick = low.findIndex(o => o.includes(want));
            }
            // boatman options: exact "Cyreg Paddlehorn" (not Geof/Gyrec)
            if (pick < 0 && /paddle/.test(low.join(' '))) {
              pick = low.findIndex(o => o.includes('cyreg paddlehorn'));
            }
            // family: exact Drakan (not Drunken/Draynor)
            if (pick < 0 && low.some(o => o.includes('drakan'))) {
              // only if body mentions family / morytania, or all options look like surnames
              if (/family|morytania|rule|drakan|drunken/.test(txt) || low.includes('drakan')) {
                pick = low.findIndex(o => o === 'drakan' || o.includes('drakan'));
              }
            }
          }
          if (pick < 0) {
            // last resort: refuse rather than guess first wrong option
            pick = low.findIndex(o => /don.?t know/i.test(o));
            if (pick < 0) pick = 0;
          }
          picks.push({ opt: opts[pick], body: txt.slice(0, 80), want: answerFor(txt) });
          a.chooseOption?.([opts[pick]]);
        } else {
          a.continueDialog?.();
          a.dismissModalMessage?.();
        }
        await new Promise(res => setTimeout(res, 420));
        if ((r.modals?.()?.chat ?? -1) === -1 && i > 12) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(24).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return {
        ok,
        noTrig: noTrig ?? null,
        picks: picks.slice(0, 24),
        bodies: bodies.slice(0, 12),
        chat: chat.slice(0, 12)
      };
    });
  }

  console.log('[myreque] product Curpile quiz', CURPILE);
  let talkCu = await curpileQuizOnce();
  console.log('[myreque] talk Curpile', JSON.stringify(talkCu));
  if (talkCu?.error) fail(talkCu.error);
  if (talkCu?.noTrig) fail(talkCu.noTrig);
  await continueThrash(page, 12, 300);

  stage = await getServerVarQuiet(page, 'routequest');
  // wrong answers knock out → Mort'ton; retry with re-tele + weapons
  for (let i = 0; i < 4 && Number(stage) < 55; i++) {
    console.log(`[myreque] Curpile retry ${i + 1} (stage=${stage})`);
    talkCu = await curpileQuizOnce();
    console.log('[myreque] talk Curpile retry', JSON.stringify(talkCu));
    await continueThrash(page, 10, 280);
    stage = await getServerVarQuiet(page, 'routequest');
  }
  console.log(`[myreque] after Curpile routequest=${stage}`);
  if (shot) await shot('after-curpile');
  if (!(Number(stage) >= 55)) {
    fail(
      `mid-gate FAIL: routequest=${stage} want≥55 (answered questions). talk=${JSON.stringify(talkCu)}`
    );
  }

  // Mid F: surface hideout doors freedomfighterentrancel/r → ≥60 entered_underground
  // m54_53 jm2 `0 53 55: 5061` / `0 54 55: 5060` → world **3509/3510,3447**
  // (research table once said 3517/3518 — wrong: 54*64+53=3509)
  const HIDEOUT_DOOR = { x: 3509, z: 3446, level: 0 }; // stand south of door
  console.log('[myreque] product hideout door for stage 60', HIDEOUT_DOOR);
  if (!(await teleTo(page, HIDEOUT_DOOR, 3, 25_000))) fail('tele hideout door failed');
  await waitSceneReady(page, 15_000);
  const doorOp = await page.evaluate(async () => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    const locs = (r?.locs?.({ maxDist: 12 }) ?? []).map(l => ({
      name: l?.name,
      x: l?.x,
      z: l?.z,
      id: l?.id
    }));
    const tries = [
      () => a?.opLocAt?.(3509, 3447, 'open'),
      () => a?.opLocAt?.(3510, 3447, 'open'),
      () => a?.opLocAt?.(3509, 3447, ''),
      () => a?.opLocAt?.(3510, 3447, ''),
      () => a?.opLoc?.('door', 'open', 12),
      () => a?.opLoc?.('entrance', 'open', 12),
      () => a?.opLoc?.('wooden', 'open', 12)
    ];
    let ok = false;
    let how = null;
    for (const t of tries) {
      try {
        if (t()) {
          ok = true;
          how = t.toString().slice(0, 80);
          break;
        }
      } catch {
        /* next */
      }
    }
    await new Promise(res => setTimeout(res, 3500));
    const tile = r?.worldTile?.() ?? r?.tile?.() ?? null;
    return { ok, how, locs: locs.slice(0, 16), tile };
  });
  console.log('[myreque] door', JSON.stringify(doorOp));
  await continueThrash(page, 8, 280);
  stage = await getServerVarQuiet(page, 'routequest');
  for (let i = 0; i < 8 && Number(stage) < 60; i++) {
    await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      a?.opLocAt?.(3509, 3447, 'open');
      a?.opLocAt?.(3510, 3447, 'open');
      a?.opLocAt?.(3509, 3447, '');
      a?.opLocAt?.(3510, 3447, '');
      await new Promise(res => setTimeout(res, 2000));
    });
    await continueThrash(page, 4, 250);
    stage = await getServerVarQuiet(page, 'routequest');
  }
  const afterDoorTile = await page.evaluate(
    () => globalThis.__lc377?.reader?.worldTile?.() ?? globalThis.__lc377?.reader?.tile?.() ?? null
  );
  console.log(`[myreque] after hideout door routequest=${stage} tile=`, afterDoorTile);
  if (shot) await shot('after-hideout-door');
  if (!(Number(stage) >= 60)) {
    fail(
      `mid-gate FAIL: routequest=${stage} want≥60 (entered_underground). door=${JSON.stringify(doorOp)} tile=${JSON.stringify(afterDoorTile)}`
    );
  }

  // Mid G: Veliaf Hurtz first talk → ≥65 introduced_veliaf
  // Hideout tele lands 0_54_153_44_19 → world 3500,9811 L0; Veliaf 0_54_153_50_46 → 3506,9838
  const VELIAF = { x: 3506, z: 9838, level: 0 };
  console.log('[myreque] product Veliaf intro', VELIAF);
  if (!(await teleTo(page, VELIAF, 4, 30_000))) fail('tele Veliaf failed');
  await waitSceneReady(page, 20_000);
  const nearVel = await page.evaluate(() =>
    (globalThis.__lc377?.reader?.npcs?.() ?? []).map(n => n?.name).filter(Boolean)
  );
  console.log('[myreque] nearby npcs', nearVel.slice(0, 14));
  if (!nearVel.some(n => /veliaf/i.test(String(n)))) {
    // L3 duplicate spawn
    if (!(await teleTo(page, { ...VELIAF, level: 3 }, 3, 20_000))) {
      fail(`Veliaf not in scene: ${JSON.stringify(nearVel.slice(0, 20))}`);
    }
    await waitSceneReady(page, 15_000);
  }
  const talkVe = await talkNpc(
    page,
    'Veliaf',
    ["hello", "friend", "ok, thanks", 'thanks', 'continue'],
    80
  );
  console.log('[myreque] talk Veliaf', JSON.stringify(talkVe));
  if (talkVe?.noTrig) fail(talkVe.noTrig);
  await continueThrash(page, 16, 300);
  stage = await getServerVarQuiet(page, 'routequest');
  for (let i = 0; i < 8 && Number(stage) < 65; i++) {
    await talkNpc(page, 'Veliaf', ["hello", "ok, thanks", 'thanks'], 40).catch(() => {});
    await continueThrash(page, 8, 280);
    stage = await getServerVarQuiet(page, 'routequest');
  }
  console.log(`[myreque] after Veliaf routequest=${stage}`);
  if (shot) await shot('after-veliaf');
  if (!(Number(stage) >= 65)) {
    fail(
      `mid-gate FAIL: routequest=${stage} want≥65 (introduced_veliaf). talk=${JSON.stringify(talkVe)}`
    );
  }

  // Optional: continue full mid into weapons+cutscene if MYREQUE_TO>=80
  if (toStage >= 80 && Number(stage) >= 65) {
    console.log('[myreque] continue full mid → product cutscene (MYREQUE_TO≥80)');
    // soft-fill member bits if product intros not done this run
    await cheatQuiet(page, 'setvar routequest_myreque_bits 31', 400);
    await giveItems(page, [
      ['steel_longsword', 1],
      ['steel_sword', 2],
      ['steel_dagger', 1],
      ['steel_mace', 1],
      ['steel_warhammer', 1]
    ]).catch(() => {});
    const talkCut = await talkNpc(
      page,
      'Veliaf',
      ['weapons', 'hello', 'ok, thanks', 'thanks'],
      120
    );
    console.log('[myreque] talk Veliaf weapons', JSON.stringify(talkCut));
    const t0 = Date.now();
    while (Date.now() - t0 < 120_000 && Number(stage) < 80) {
      await continueThrash(page, 8, 280);
      stage = await getServerVarQuiet(page, 'routequest');
    }
    console.log(`[myreque] after cutscene routequest=${stage}`);
    if (!(Number(stage) >= 80)) {
      fail(`cutscene-gate FAIL: routequest=${stage} want≥80. talk=${JSON.stringify(talkCut)}`);
    }
  }

  console.log(
    `RESULT: PASS (Myreque mid routequest=${stage} ≥${Math.min(toStage, Number(stage))}; product palm+quiz+door+intro${Number(stage) >= 80 ? '+cutscene' : ''}; SOFT NS/weapons/pouch/planks${midOnly ? ' mid-only' : ' + product Vanstrom'})`
  );
  process.exit(0);
} catch (e) {
  console.error('FAIL:', e?.message || e);
  process.exit(1);
} finally {
  try {
    await browser?.close?.();
  } catch {
    /* ignore */
  }
}
