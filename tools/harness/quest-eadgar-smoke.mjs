#!/usr/bin/env node
/**
 * Eadgar's Ruse — start + mid-gate smoke (Wave 1A #4).
 *
 * Gates:
 *   EADGAR_COMPLETE_STAGE=10  — Sanfew accept (start)
 *   EADGAR_COMPLETE_STAGE=50  — explained plan (mid) after Burntmeat/Eadgar + zoo parrot
 *   EADGAR_FROM=90            — soft got_burnt_meat → product drawer key + storeroom door ≥100
 *   EADGAR_FROM=100           — soft unlocked → product goutweed crate + Sanfew complete ≥110
 *   EADGAR_FROM=90 EADGAR_TO=110 — door then crate then Sanfew complete
 *
 * Authentic progress: Talk trees + Pete bits + alco-chunks on Aviary Hatch + parrot to Eadgar.
 * Host prep only: setstat/setvar deps, material give (pineapple_chunks+vodka), region tele
 * between Sanfew / Mad Eadgar cave / kitchen / zoo (travel — not setvar progress).
 *
 * @see docs/research/eadgar-complete-gate-377.md
 * @see docs/research/port-quest-eadgar-274-to-377.md
 * @see docs/plans/2026-08-06-port-quest-eadgar.md
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

const argv = process.argv.slice(2);
const { base, rest } = parseArgs(argv.filter(a => a !== '--max-ms'));
const maxMsIdx = argv.indexOf('--max-ms');
const maxMs = maxMsIdx >= 0 ? Number(argv[maxMsIdx + 1]) || 600_000 : 600_000;
const { username, password } = resolveAccount(
  rest.filter(r => r !== String(maxMs)),
  'edg'
);
const wantStage = Number(process.env.EADGAR_COMPLETE_STAGE) || 10;
const fromStage = Number(process.env.EADGAR_FROM || 0) || 0;
const toStage =
  Number(
    process.env.EADGAR_TO ||
      (fromStage >= 100 ? 110 : fromStage >= 90 ? 100 : wantStage)
  ) || wantStage;
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

/** m45_53 level1 sanfew */
const SANFEW = { x: 2897, z: 3426, level: 1 };
/** Mad Eadgar cave (freed) — m45_157 L2 `2 10 38: 1113` */
const EADGAR = { x: 2890, z: 10086, level: 2 };
/** Burntmeat kitchen — m44_157 L1 `1 28 9: 1151` */
const BURNTMEAT = { x: 2844, z: 10057, level: 1 };
/** Kitchen drawers m44_157 `1 36 1: 3816` → 2852,10049 L1 */
const DRAWERS = { x: 44 * 64 + 36, z: 157 * 64 + 1, level: 1 };
/** Storeroom door m44_157 `0 53 37: 3810` → 2869,10085 L0 */
const STOREROOM_DOOR = { x: 44 * 64 + 53, z: 157 * 64 + 37, level: 0 };
/** Goutweed crate m44_157 `0 40 26: 3822` → 2856,10074 L0 */
const GOUTWEED_CRATE = { x: 44 * 64 + 40, z: 157 * 64 + 26, level: 0 };
/** Ardougne zoo aviary — m40_51 Parroty Pete + hatch */
const ZOO_PETE = { x: 2611, z: 3285, level: 0 };
const ZOO_HATCH = { x: 2611, z: 3287, level: 0 };

const deadline = Date.now() + maxMs;

function checkBudget(label) {
  if (Date.now() > deadline) fail(`budget exceeded at ${label}`);
}

/** Talk-to + multi/continue thrash until modal settles. */
async function talkNpc(page, npcName, prefer = [], iters = 56) {
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
      const chat = typeof r.chat === 'function' ? r.chat(28).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 16), chat: chat.slice(0, 12) };
    },
    [npcName, prefer, iters]
  );
}

async function walkNear(page, tile, dist = 1) {
  await page.evaluate(
    async ([wx, wz, d]) => {
      const h = globalThis.__lc377;
      h?.actions?.walkWorld?.(wx, wz);
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 200));
        const t = h?.worldTile?.();
        if (t && Math.max(Math.abs(t.x - wx), Math.abs(t.z - wz)) <= d) break;
      }
    },
    [tile.x, tile.z, dist]
  );
}

async function sceneNpcs(page, re) {
  return page.evaluate(pat => {
    const rx = new RegExp(pat, 'i');
    return (globalThis.__lc377?.reader?.npcs?.() ?? [])
      .filter(n => rx.test(n?.name ?? ''))
      .map(n => `${n.name}@${n.tile?.x},${n.tile?.z},L${n.tile?.level ?? '?'}`);
  }, re);
}

async function invHas(page, substr) {
  return page.evaluate(s => {
    const want = String(s).toLowerCase();
    const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
    return inv.some(i => i?.name && String(i.name).toLowerCase().includes(want));
  }, substr);
}

async function useHeldOnHeld(page, useSub, tgtSub) {
  return page.evaluate(
    ([u, t]) => globalThis.__lc377?.actions?.useHeldOnHeld?.(u, t) ?? false,
    [useSub, tgtSub]
  );
}

async function useHeldOnLoc(page, useSub, locSub) {
  return page.evaluate(
    ([u, loc]) => globalThis.__lc377?.actions?.useHeldOnLoc?.(u, loc, 16) ?? false,
    [useSub, locSub]
  );
}

async function stageOf(page) {
  return getServerVarQuiet(page, 'eadgar_quest');
}

async function expectMinStage(page, min, label) {
  const s = await stageOf(page);
  console.log(`[quest-eadgar] ${label}: eadgar_quest=${s} (want>=${min})`);
  if ((s ?? 0) < min) fail(`${label}: stage ${s} < ${min}`);
  return s;
}

async function teleTalk(page, tile, npcName, prefer, label) {
  checkBudget(label);
  console.log(`[quest-eadgar] ${label}: tele`, tile);
  if (!(await teleTo(page, tile, 8, 50_000))) fail(`${label}: tele failed`);
  await waitSceneReady(page, 45_000);
  const npcs = await sceneNpcs(page, npcName.replace(/\s+/g, '.*'));
  console.log(`[quest-eadgar] ${label}: npcs`, JSON.stringify(npcs));
  if (!npcs.length) fail(`${label}: no ${npcName} in scene`);
  await walkNear(page, tile, 2);
  const talk = await talkNpc(page, npcName, prefer);
  console.log(`[quest-eadgar] ${label}: talk`, JSON.stringify(talk));
  if (talk?.noTrig) fail(talk.noTrig);
  if (talk?.error) fail(talk.error);
  return talk;
}

const browser = await launchBrowser();
let page = null;
let shot = null;

try {
  page = await browser.newPage();
  page.on('console', msg => {
    const t = msg.text();
    if (/script|eadgar|sanfew|burntmeat|parrot|trigger|error|quest/i.test(t)) {
      console.log(`[browser.${msg.type()}] ${t.slice(0, 280)}`);
    }
  });

  console.log(
    `[quest-eadgar] ${base} user=${username} wantStage=${wantStage} from=${fromStage || 'start'} to=${toStage} budgetMs=${maxMs} (headed default)`
  );
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`quest-eadgar_${username}`);
    shot = (await installScreenshotBridge(page, shotDir)).shot;
  }

  await mainlandAccount(page, username, password);
  await waitSceneReady(page, 60_000);
  await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300);
  await setStats(page, { herblore: 31, cooking: 40, agility: 32 });

  for (const c of [
    'setvar eadgar_quest 0',
    'setvar eadgar_bits 0',
    'setvar druidquest 4',
    'setvar death_equiproom 80',
    'setvar troll_quest 50',
    'setvar troll_freed_eadgar 1'
  ]) {
    await cheatQuiet(page, c, 400);
  }

  /** Product goutweed crate + Sanfew complete (stage ≥100 + herb → 110). */
  async function productCrateAndSanfewComplete(page, shot) {
    console.log('[quest-eadgar] product goutweed crate', GOUTWEED_CRATE);
    if (!(await teleTo(page, GOUTWEED_CRATE, 2, 30_000))) fail('tele goutweed crate failed');
    await waitSceneReady(page, 20_000);
    for (let i = 0; i < 5; i++) {
      await page.evaluate(async ([wx, wz]) => {
        const a = globalThis.__lc377?.actions;
        a?.opLocAt?.(wx, wz, '') ||
          a?.opLocAt?.(wx + 1, wz, '') ||
          a?.opLoc?.('crate', '') ||
          a?.opLoc?.('gout', '');
        await new Promise(r => setTimeout(r, 900));
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
        a?.chatContinue?.();
      }, [GOUTWEED_CRATE.x, GOUTWEED_CRATE.z]);
      await page.waitForTimeout(600);
      const hasHerb = await page.evaluate(() => {
        const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
        return inv.some(x => /goutweed/i.test(String(x?.name ?? '')));
      });
      if (hasHerb) break;
    }
    // Guard may knockout-tele to 0_44_157_49_40 — herb should remain
    let hasHerb = await page.evaluate(() => {
      const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
      return inv.some(x => /goutweed/i.test(String(x?.name ?? '')));
    });
    console.log('[quest-eadgar] after crate hasGoutweed=', hasHerb);
    if (shot) await shot('after-goutweed-crate');
    if (!hasHerb) fail('crate-gate FAIL: no goutweed herb after search');

    console.log('[quest-eadgar] product Sanfew complete with goutweed', SANFEW);
    if (!(await teleTo(page, SANFEW, 4, 30_000))) fail('tele Sanfew complete failed');
    await waitSceneReady(page, 20_000);
    const talkSf = await talkNpc(
      page,
      'Sanfew',
      [
        'goutweed',
        'have some',
        'found some',
        'what can i do',
        'continue',
        'thanks',
        'ok'
      ],
      48
    );
    console.log('[quest-eadgar] talk Sanfew complete', JSON.stringify(talkSf));
    if (talkSf?.noTrig) fail(talkSf.noTrig);
    await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      for (let i = 0; i < 24; i++) {
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
        a?.chatContinue?.();
        await new Promise(r => setTimeout(r, 280));
      }
    });
    let st = await getServerVarQuiet(page, 'eadgar_quest');
    for (let i = 0; i < 12 && Number(st) < 110; i++) {
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
      });
      st = await getServerVarQuiet(page, 'eadgar_quest');
    }
    console.log(`[quest-eadgar] after Sanfew eadgar_quest=${st}`);
    if (shot) await shot('after-complete');
    return Number(st);
  }

  // --- Complete: soft 100 → crate + Sanfew ≥110 ---
  if (fromStage >= 100) {
    console.log(
      `[quest-eadgar] SOFT eadgar_quest ${fromStage} → product crate+Sanfew ≥110`
    );
    await cheatQuiet(page, `setvar eadgar_quest ${fromStage}`, 500);
    let st = await getServerVarQuiet(page, 'eadgar_quest');
    if (Number(st) < 100) fail(`soft unlocked stage failed got ${st}`);
    st = await productCrateAndSanfewComplete(page, shot);
    if (!(st >= 110)) fail(`complete-gate FAIL: eadgar_quest=${st} want≥110`);
    console.log(
      `RESULT: PASS (Eadgar complete eadgar_quest=${st} ≥110; product crate+Sanfew; SOFT stage${fromStage})`
    );
    process.exit(0);
  }

  // --- Storeroom key/door product (soft stage 90 got_burnt_meat) ---
  if (fromStage >= 90 || wantStage >= 100) {
    const softStage = fromStage >= 90 ? fromStage : 90;
    console.log(
      `[quest-eadgar] SOFT eadgar_quest ${softStage} → product drawers+door ≥100 to=${toStage}`
    );
    await cheatQuiet(page, `setvar eadgar_quest ${softStage}`, 500);
    let st = await getServerVarQuiet(page, 'eadgar_quest');
    if (Number(st) < 90) fail(`soft eadgar stage failed got ${st}`);

    console.log('[quest-eadgar] product kitchen drawers', DRAWERS);
    st = await getServerVarQuiet(page, 'eadgar_quest');
    console.log(`[quest-eadgar] pre-drawer eadgar_quest=${st}`);
    if (!(await teleTo(page, DRAWERS, 2, 30_000))) fail('tele drawers failed');
    await waitSceneReady(page, 20_000);
    const drawerLocs = await page.evaluate(() => {
      const locs = globalThis.__lc377?.reader?.locs?.({ maxDist: 10 }) ?? [];
      return locs
        .filter(l => /drawer/i.test(String(l?.name ?? '')))
        .map(l => ({
          name: l?.name,
          ops: l?.ops,
          wx: l?.wx ?? l?.x,
          wz: l?.wz ?? l?.z
        }));
    });
    console.log('[quest-eadgar] drawer locs', JSON.stringify(drawerLocs));
    // Open closed drawers, wait for open variant, Search (op2)
    for (let attempt = 0; attempt < 4; attempt++) {
      const step = await page.evaluate(async attemptN => {
        const a = globalThis.__lc377?.actions;
        const r = globalThis.__lc377?.reader;
        const drawers = (r?.locs?.({ maxDist: 12 }) ?? []).filter(l =>
          /drawer/i.test(String(l?.name ?? ''))
        );
        const open = drawers.find(l =>
          (l.ops || []).some(o => /search/i.test(String(o ?? '')))
        );
        const closed = drawers.find(l =>
          (l.ops || []).some(o => /open/i.test(String(o ?? '')))
        );
        let did = null;
        // Prefer Search on already-open drawers (first run often left one open)
        if (open) {
          const ox = open.wx ?? open.x;
          const oz = open.wz ?? open.z;
          // walk nearer: tele-local hop via menu may still "can't reach" if south side
          a?.walkTo?.({ x: ox, z: oz - 1, level: 1 }) || a?.walkToTile?.(ox, oz - 1);
          await new Promise(res => setTimeout(res, 600));
          a?.opLocAt?.(ox, oz, 'search') || a?.opLoc?.('drawer', 'search');
          did = 'search';
        } else if (closed) {
          const cx = closed.wx ?? closed.x;
          const cz = closed.wz ?? closed.z;
          a?.walkTo?.({ x: cx, z: cz - 1, level: 1 }) || a?.walkToTile?.(cx, cz - 1);
          await new Promise(res => setTimeout(res, 600));
          a?.opLocAt?.(cx, cz, 'open') || a?.opLoc?.('drawer', 'open');
          did = 'open';
        } else {
          a?.opLoc?.('drawer', '') || a?.opLoc?.('Kitchen', '');
          did = 'fallback';
        }
        await new Promise(res => setTimeout(res, 1100));
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
        const inv = r?.inventory?.() ?? [];
        const key = inv.find(i => /storeroom key/i.test(String(i?.name ?? '')));
        const chat = typeof r?.chat === 'function' ? r.chat(8).map(c => c?.text) : [];
        return {
          attemptN,
          did,
          hasKey: !!key,
          inv: inv.map(i => i?.name).filter(Boolean),
          chat: chat.slice(0, 6),
          drawers: drawers.map(d => ({ name: d.name, ops: d.ops }))
        };
      }, attempt);
      console.log('[quest-eadgar] drawer step', JSON.stringify(step));
      if (step?.hasKey) break;
      await page.waitForTimeout(400);
    }
    const hasKey = await page.evaluate(() => {
      const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
      return inv.some(i => /storeroom key/i.test(String(i?.name ?? '')));
    });
    console.log('[quest-eadgar] after drawers hasKey=', hasKey);
    if (shot) await shot('after-drawers');
    if (!hasKey) fail('drawer-gate FAIL: no storeroom key in inv after search at stage 90');

    console.log('[quest-eadgar] product storeroom door', STOREROOM_DOOR);
    if (!(await teleTo(page, STOREROOM_DOOR, 2, 30_000))) fail('tele storeroom door failed');
    await waitSceneReady(page, 20_000);
    // use key on door if plain open fails (oplocu path via useHeldOnLoc)
    await page.evaluate(async ([wx, wz]) => {
      const a = globalThis.__lc377?.actions;
      let ok =
        a?.opLocAt?.(wx, wz, '') ||
        a?.opLoc?.('door', '') ||
        a?.opLoc?.('storeroom', '');
      if (!ok && a?.useHeldOnLoc) {
        ok = a.useHeldOnLoc('Storeroom key', 'door') || a.useHeldOnLoc('key', 'door');
      }
      await new Promise(r => setTimeout(r, 1200));
      a?.continueDialog?.();
      a?.dismissModalMessage?.();
      return !!ok;
    }, [STOREROOM_DOOR.x, STOREROOM_DOOR.z]);
    await page.waitForTimeout(1500);
    st = await getServerVarQuiet(page, 'eadgar_quest');
    console.log(`[quest-eadgar] after door eadgar_quest=${st}`);
    if (shot) await shot('after-storeroom-door');
    if (!(Number(st) >= 100)) {
      // retry open once
      await page.evaluate(async ([wx, wz]) => {
        globalThis.__lc377?.actions?.opLocAt?.(wx, wz, '');
        await new Promise(r => setTimeout(r, 1200));
      }, [STOREROOM_DOOR.x, STOREROOM_DOOR.z]);
      st = await getServerVarQuiet(page, 'eadgar_quest');
    }
    if (!(Number(st) >= 100)) {
      fail(`storeroom-door-gate FAIL: eadgar_quest=${st} want≥100`);
    }
    if (toStage >= 110 || wantStage >= 110) {
      st = await productCrateAndSanfewComplete(page, shot);
      if (!(st >= 110)) fail(`complete-gate FAIL: eadgar_quest=${st} want≥110 after door`);
      console.log(
        `RESULT: PASS (Eadgar door+complete eadgar_quest=${st} ≥110; product; SOFT stage${softStage})`
      );
      process.exit(0);
    }
    console.log(
      `RESULT: PASS (Eadgar storeroom eadgar_quest=${st} ≥100; product drawer key+door; SOFT stage${softStage})`
    );
    process.exit(0);
  }

  // --- start: Sanfew ---
  console.log('[quest-eadgar] tele Sanfew', SANFEW);
  if (!(await teleTo(page, SANFEW, 6, 45_000))) fail('tele Sanfew failed');
  await waitSceneReady(page, 45_000);
  if (shot) await shot('at-sanfew');

  const scene = await sceneNpcs(page, 'sanfew');
  console.log('[quest-eadgar] scene', JSON.stringify({ tile: await page.evaluate(() => globalThis.__lc377?.worldTile?.()), npcs: scene }));
  if (!scene.length) fail('no Sanfew in scene');

  await walkNear(page, SANFEW, 1);
  const talk0 = await talkNpc(page, 'Sanfew', [
    'more work',
    'reclaim the stone circle',
    'reclaim the circle',
    "i'll do it",
    'ill do it',
    'yes'
  ]);
  console.log('[quest-eadgar] talk Sanfew', JSON.stringify(talk0));
  if (talk0?.noTrig) fail(talk0.noTrig);

  let stage = await expectMinStage(page, 10, 'start-gate');
  if (shot) await shot('after-sanfew');

  if (wantStage <= 10) {
    if (shot) await shot('end');
    console.log(`RESULT: PASS (Eadgar start-gate eadgar_quest=${stage})`);
    process.exit(0);
  }

  // --- mid: Eadgar first (goutweed) → 15 ---
  await teleTalk(page, EADGAR, 'Eadgar', ['goutweed', 'find some gout'], 'eadgar-first');
  stage = await expectMinStage(page, 15, 'spoken-eadgar');
  if (shot) await shot('after-eadgar-15');

  // --- Burntmeat → 25 ---
  await teleTalk(page, BURNTMEAT, 'Burntmeat', [], 'burntmeat');
  stage = await expectMinStage(page, 20, 'spoken-burntmeat');
  if (shot) await shot('after-burntmeat');

  // --- Eadgar plan → 30 (needs parrot) ---
  await teleTalk(
    page,
    EADGAR,
    'Eadgar',
    ['talked to the troll', 'parrot', "i'll be", 'okay', 'where'],
    'eadgar-plan'
  );
  stage = await expectMinStage(page, 30, 'needs-parrot');
  if (shot) await shot('after-needs-parrot');

  // --- Zoo: Pete dialogs (bits) + alco + hatch → drunk parrot ---
  // Prep materials only (not progress).
  await giveItems(page, [
    ['pineapple_chunks', 2],
    ['vodka', 2]
  ]);

  console.log('[quest-eadgar] tele zoo Pete', ZOO_PETE);
  if (!(await teleTo(page, ZOO_PETE, 8, 50_000))) fail('tele zoo failed');
  await waitSceneReady(page, 45_000);
  {
    const npcs = await sceneNpcs(page, 'parroty|pete');
    console.log('[quest-eadgar] zoo npcs', JSON.stringify(npcs));
    if (!npcs.length) fail('no Parroty Pete in scene');
  }
  await walkNear(page, ZOO_PETE, 2);

  // Two talks to set both eadgar_bits dialog flags
  let pete = await talkNpc(page, 'Parroty Pete', ['when did you add', 'when did']);
  console.log('[quest-eadgar] pete when', JSON.stringify(pete));
  pete = await talkNpc(page, 'Parroty Pete', ['what do you feed', 'feed them', 'feed']);
  console.log('[quest-eadgar] pete feed', JSON.stringify(pete));

  // Make alco-chunks (vodka works both ways on pineapple_chunks)
  let made = false;
  for (const [a, b] of [
    ['pineapple', 'vodka'],
    ['vodka', 'pineapple'],
    ['pineapple chunks', 'vodka'],
    ['vodka', 'pineapple chunks']
  ]) {
    if (await useHeldOnHeld(page, a, b)) {
      made = true;
      console.log(`[quest-eadgar] useHeldOnHeld ${a}→${b}`);
      break;
    }
  }
  await page.waitForTimeout(800);
  if (!(await invHas(page, 'alco'))) {
    // bits may not have stuck — re-talk and retry once
    await talkNpc(page, 'Parroty Pete', ['when did you add']);
    await talkNpc(page, 'Parroty Pete', ['what do you feed']);
    await useHeldOnHeld(page, 'pineapple', 'vodka');
    await page.waitForTimeout(800);
  }
  if (!(await invHas(page, 'alco'))) fail('failed to make Alco-chunks (Pete bits?)');
  console.log('[quest-eadgar] has Alco-chunks');

  // Use on Aviary Hatch
  await walkNear(page, ZOO_HATCH, 2);
  let hatchOk = false;
  for (let i = 0; i < 6; i++) {
    hatchOk = await useHeldOnLoc(page, 'alco', 'Aviary Hatch');
    if (!hatchOk) hatchOk = await useHeldOnLoc(page, 'alco', 'hatch');
    console.log(`[quest-eadgar] hatch use try ${i} ok=${hatchOk}`);
    await page.waitForTimeout(600);
    // thrash mesbox / Pete angry dialog
    await talkNpc(page, 'Parroty Pete', ['nothing', 'vet', 'thank', "i'll", 'good'], 24);
    if (await invHas(page, 'drunk parrot')) break;
    if (await invHas(page, 'parrot')) break;
  }
  // continue any open modals
  await page.evaluate(async () => {
    const a = globalThis.__lc377?.actions;
    for (let i = 0; i < 30; i++) {
      a?.continueDialog?.();
      a?.dismissModalMessage?.();
      await new Promise(r => setTimeout(r, 300));
    }
  });
  await page.waitForTimeout(500);

  const hasParrot =
    (await invHas(page, 'drunk parrot')) || (await invHas(page, 'parrot'));
  console.log(`[quest-eadgar] has parrot=${hasParrot}`);
  if (!hasParrot) fail('no Drunk parrot after hatch');
  if (shot) await shot('got-parrot');

  // --- Eadgar with parrot → 50 explained plan ---
  await teleTalk(
    page,
    EADGAR,
    'Eadgar',
    ['here it is', 'parrot', 'plan', 'scarecrow', 'anything else', 'no thanks'],
    'eadgar-parrot'
  );
  // long dialog tree — thrash more continues
  await page.evaluate(async () => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    for (let i = 0; i < 40; i++) {
      const opts = (() => {
        try {
          return (r?.chatOptions?.() ?? []).map(o => (typeof o === 'string' ? o : o?.text)).filter(Boolean);
        } catch {
          return [];
        }
      })();
      if (opts.length) {
        const low = opts.map(o => String(o).toLowerCase());
        let pick = 0;
        for (const p of ['no thanks', 'anything else', 'more']) {
          const j = low.findIndex(o => o.includes(p));
          if (j >= 0) {
            pick = j;
            break;
          }
        }
        a?.chooseOption?.([opts[pick]]);
      } else {
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
      }
      await new Promise(res => setTimeout(res, 350));
      if ((r?.modals?.()?.chat ?? -1) === -1 && i > 10) break;
    }
  });

  stage = await stageOf(page);
  console.log(`[quest-eadgar] final eadgar_quest=${stage}`);
  if (shot) await shot('end');

  if ((stage ?? 0) < wantStage) {
    fail(`mid-gate stage too low: eadgar_quest=${stage} want>=${wantStage}`);
  }
  console.log(`RESULT: PASS (Eadgar mid-gate eadgar_quest=${stage})`);
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await browser.close().catch(() => {});
}
