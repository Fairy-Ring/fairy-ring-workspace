#!/usr/bin/env node
/**
 * Farming F1 — potato allotment mid-gate (Falador south).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/farming-f1-smoke.mjs
 *
 * **Do not tele onto the patch** — allotment locs are unwalkable; stand beside
 * (Tool Leprechaun 3053,3305) and use-with / OPLOC from range.
 *
 * Product: rake weeds 0→3 → plant 3 potato seeds (dibber) → harvest (spade).
 * Soft (labeled): setstat/give/tele; SOFT grow `setvar varbit_708 10` (skip CANDIDATE 40m).
 * Soft weeded is **not** default — product rake must clear; fail if varbit stays 0.
 *
 * @see docs/research/farming-377-f1-potato-map-audit.md
 * @see docs/plans/2026-08-07-farming-f0-kickoff.md
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
const { username, password } = resolveAccount(rest, 'f1p');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';
const softGrow =
  process.env.FARMING_F1_REAL_GROW !== '1' && process.env.FARMING_F1_REAL_GROW !== 'true';
/** Emergency only — soft set weeded if product rake fails (labels SOFT; not a hard PASS). */
const softWeedOk =
  process.env.FARMING_F1_SOFT_WEED === '1' || process.env.FARMING_F1_SOFT_WEED === 'true';

/**
 * Stand **beside** patch — one tile west of SW corner (not on 8550 footprint).
 * Leprechaun 3053,3305 is farther; west edge is distance 1 for reach.
 * Patch click target remains SW sample tile.
 */
const STAND = { x: 3049, z: 3307, level: 0 };
/** farming_veg_patch_1 SW sample tile — for loc snap only, not tele */
const PATCH = { x: 3050, z: 3307, level: 0 };
const VEG_PATCH_1_ID = 8550;
const STAGE_WEEDED = 3;
const STAGE_PLANTED = 6;
const STAGE_FULLYGROWN = 10;

async function farmingXp(page) {
  return page.evaluate(() => globalThis.__lc377?.reader?.stat?.(19) ?? null);
}

async function invNames(page) {
  return page.evaluate(() => {
    const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
    return inv.map(x => x?.name).filter(Boolean);
  });
}

async function invCount(page, nameSubstr) {
  return page.evaluate(sub => {
    const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
    let n = 0;
    for (const x of inv) {
      if (String(x?.name ?? '').toLowerCase().includes(String(sub).toLowerCase())) {
        n += x.count | 0 || 1;
      }
    }
    return n;
  }, nameSubstr);
}

async function patchLocSnap(page) {
  return page.evaluate(
    ([wx, wz, id]) => {
      const r = globalThis.__lc377?.reader;
      if (!r) return null;
      const at = r.locAt?.(wx, wz);
      if (at && (at.id | 0) === id) return at;
      const list = r.locs?.({ maxDist: 20 }) ?? [];
      return list.find(l => (l.id | 0) === id) ?? list.find(l => l.x === wx && l.z === wz) ?? null;
    },
    [PATCH.x, PATCH.z, VEG_PATCH_1_ID]
  );
}

async function getStage(page) {
  const v = await getServerVarQuiet(page, 'varbit_708');
  return Number(v);
}

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  page.on('console', msg => {
    const t = msg.text();
    if (/farming|allotment|potato|rake|weed|trigger|error|script/i.test(t)) {
      console.log(`[browser.${msg.type()}] ${t.slice(0, 260)}`);
    }
  });

  console.log(
    `[farming-f1] ${base} user=${username} softGrow=${softGrow} softWeedOk=${softWeedOk} stand=${STAND.x},${STAND.z} patch=${PATCH.x},${PATCH.z}`
  );
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`farming-f1_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }

  await mainlandAccount(page, username, password);
  await waitSceneReady(page, 45_000);
  await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

  await setStats(page, { farming: 1 }).catch(() => {});
  await giveItems(page, [
    ['rake', 1],
    ['dibber', 1],
    ['spade', 1],
    ['potato_seed', 12]
  ]);

  console.log('[farming-f1] tele STAND (beside patch — not on loc)', STAND);
  if (!(await teleTo(page, STAND, 3, 25_000))) fail('tele stand failed');
  await waitSceneReady(page, 15_000);
  if (shot) await shot('at-stand');

  const xp0 = await farmingXp(page);
  console.log('[farming-f1] farming stat0', xp0);

  // Soft reset weeds only (host prep) — product rake must clear from here
  await cheatQuiet(page, 'setvar varbit_708 0', 500);
  let stage = await getStage(page);
  console.log('[farming-f1] stage after reset', stage);
  if (stage !== 0) fail(`expected varbit_708=0 after soft reset, got ${stage}`);

  let loc = await patchLocSnap(page);
  console.log('[farming-f1] patch loc', loc);
  if (!loc?.typecode) fail(`no farming_veg_patch_1 near stand: ${JSON.stringify(loc)}`);

  // Product rake ×3 → weeded (stage 3). Do **not** soft-set weeded by default.
  // Re-fetch loc snap each try; wait long enough for walk+op (pathfind can take seconds).
  for (let i = 0; i < 3; i++) {
    loc = (await patchLocSnap(page)) ?? loc;
    const before = await getStage(page);
    const rake = await page.evaluate(async snap => {
      const a = globalThis.__lc377?.actions;
      const client = globalThis.__lc377Client;
      if (!a?.useHeldOnLoc) return { error: 'no useHeldOnLoc' };
      // Diag: does world still have this typecode at lx,lz?
      let typeOk = null;
      try {
        const w = client?.world;
        const level = client?.minusedlevel | 0;
        if (w?.typeCode2 && snap) {
          typeOk = w.typeCode2(level, snap.lx | 0, snap.lz | 0, snap.typecode | 0);
        }
      } catch (e) {
        typeOk = String(e?.message || e);
      }
      const ok = a.useHeldOnLoc('Rake', snap);
      await new Promise(r => setTimeout(r, 3500));
      const chat = [];
      try {
        // last few game messages if exposed
        const r = globalThis.__lc377?.reader;
        if (r?.chatLines) chat.push(...(r.chatLines() ?? []).slice(-4));
      } catch {
        /* ignore */
      }
      return { ok: !!ok, typeOk, chat };
    }, loc);
    const after = await getStage(page);
    console.log(`[farming-f1] rake${i}`, rake, `stage ${before}→${after}`);
    await new Promise(r => setTimeout(r, 300));
  }
  stage = await getStage(page);
  console.log('[farming-f1] stage after rake', stage);
  if (shot) await shot('after-rake');

  if (stage < STAGE_WEEDED) {
    if (softWeedOk) {
      console.log(
        `[farming-f1] SOFT setvar varbit_708 ${STAGE_WEEDED} — product rake failed (stage=${stage}); NOT a hard PASS`
      );
      await cheatQuiet(page, `setvar varbit_708 ${STAGE_WEEDED}`, 500);
      stage = STAGE_WEEDED;
    } else {
      fail(
        `product rake FAIL: varbit_708=${stage} want≥${STAGE_WEEDED} (patch still weeds — check after-rake shot; stand beside not on loc). Set FARMING_F1_SOFT_WEED=1 only to soft-continue.`
      );
    }
  }

  // Product plant
  loc = (await patchLocSnap(page)) ?? loc;
  const seedsBefore = await invCount(page, 'Potato seed');
  const plant = await page.evaluate(async snap => {
    const a = globalThis.__lc377?.actions;
    if (!a?.useHeldOnLoc) return { error: 'no useHeldOnLoc' };
    const ok = a.useHeldOnLoc('Potato seed', snap);
    await new Promise(r => setTimeout(r, 1400));
    return { ok: !!ok };
  }, loc);
  await new Promise(r => setTimeout(r, 500));
  stage = await getStage(page);
  const seedsAfter = await invCount(page, 'Potato seed');
  const xpPlant = await farmingXp(page);
  console.log('[farming-f1] plant', plant, `stage=${stage} seeds ${seedsBefore}→${seedsAfter}`, xpPlant);
  if (shot) await shot('after-plant');

  if (stage < STAGE_PLANTED) {
    fail(`product plant FAIL: varbit_708=${stage} want≥${STAGE_PLANTED}`);
  }
  if (seedsAfter > seedsBefore - 3) {
    fail(`expected −3 potato seeds, ${seedsBefore}→${seedsAfter}`);
  }
  if (!((xpPlant?.xp ?? 0) > (xp0?.xp ?? 0))) {
    fail(`plant XP did not rise: ${JSON.stringify({ xp0, xpPlant })}`);
  }

  if (softGrow) {
    console.log(
      `[farming-f1] SOFT setvar varbit_708 ${STAGE_FULLYGROWN} (skip CANDIDATE 40m growth — labeled soft)`
    );
    await cheatQuiet(page, `setvar varbit_708 ${STAGE_FULLYGROWN}`, 600);
  } else {
    fail('FARMING_F1_REAL_GROW not wired for smoke budget');
  }
  if (shot) await shot('fullygrown');

  const harvest = await page.evaluate(async ([wx, wz]) => {
    const a = globalThis.__lc377?.actions;
    if (!a) return { error: 'no actions' };
    const ok =
      a.opLocAt?.(wx, wz, 'Harvest') ||
      a.opLoc1At?.(wx, wz) ||
      a.opLocAt?.(wx, wz, '');
    await new Promise(res => setTimeout(res, 1400));
    return { ok: !!ok, wx, wz };
  }, [PATCH.x, PATCH.z]);
  console.log('[farming-f1] harvest', harvest);
  await new Promise(r => setTimeout(r, 400));

  const inv = await invNames(page);
  const xpH = await farmingXp(page);
  stage = await getStage(page);
  console.log('[farming-f1] inv', inv, 'stage', stage, 'xp', xpH);
  if (shot) await shot('after-harvest');

  const hasPotato = inv.some(n => /potato/i.test(n) && !/seed/i.test(n));
  if (!hasPotato) fail(`no potato in inv: ${JSON.stringify(inv)}`);
  if (!((xpH?.xp ?? 0) > (xpPlant?.xp ?? 0))) {
    fail(`harvest XP did not rise: ${JSON.stringify({ xpPlant, xpH })}`);
  }

  const softParts = ['softGrow'];
  if (softWeedOk && process.env.FARMING_F1_SOFT_WEED) softParts.push('softWeed');
  console.log(
    `RESULT: PASS farming-f1 potato (stand beside; product rake+plant+harvest; ${softParts.join('+')}; XP CANDIDATE)`
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
