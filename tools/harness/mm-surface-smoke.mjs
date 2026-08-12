#!/usr/bin/env node
/**
 * MM Wave B surface — product Hold leftover greegrees, banana pick, hunt skip, remains drop.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/mm-surface-smoke.mjs
 *   SURFACE=hold,banana   # subset (default: hold,banana,hunt,drop)
 *
 * Soft: tele / give / setstat / `setvar dragonquest 10` (DS complete so rune plate equips).
 * Product: heldOp Hold, opLoc Search, hunt check_invcat, Attack.
 *
 * @see docs/research/mm-waveb-config-unit-377.md
 * @see docs/research/game-knowledge/anchors-ape-atoll.md
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
  setStats,
  setWorldSpeed,
  teleTo,
  waitSceneReady,
  waitTicks,
  wipeInvAndWorn
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'mmsurf');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';
const phases = String(process.env.SURFACE || 'hold,banana,hunt,drop')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

/** Greegree zone stand (existing slice). */
const APE_ZONE = { x: 2755, z: 2795, level: 0 };
/** m42_43 `0 53 43: 4749` mm_bananatreefull — stand south. */
const BANANA = { x: 2741, z: 2794, level: 0 };
const BANANA_LOC = { x: 2741, z: 2795 };
/** m43_43 `0 2 26: 1458` mm_posted_archer. */
const ARCHER = { x: 2754, z: 2776, level: 0 };

const GREEGREES = [
  'mm_monkey_greegree_for_normal_gorilla',
  'mm_monkey_greegree_for_small_zombie_monkey'
];

async function invNames(page) {
  return page.evaluate(() =>
    (globalThis.__lc377?.reader?.inventory?.() ?? []).map(x => x?.name)
  );
}
async function wornNames(page) {
  return page.evaluate(() =>
    (globalThis.__lc377?.reader?.equipment?.() ?? []).map(x => x?.name)
  );
}

async function holdGreegree(page) {
  return page.evaluate(async () => {
    const a = globalThis.__lc377?.actions;
    if (!a?.heldOp) return { error: 'no heldOp' };
    const ok = a.heldOp('Monkey greegree', 2) || a.heldOp('greegree', 2);
    await new Promise(res => setTimeout(res, 2200));
    return { ok: !!ok };
  });
}

async function hp(page) {
  const v = await page.evaluate(() => {
    const r = globalThis.__lc377?.reader;
    if (typeof r?.stat === 'function') return r.stat('hitpoints');
    if (typeof r?.stats === 'function') return r.stats()?.hitpoints;
    return null;
  });
  if (v && typeof v === 'object') return Number(v.current ?? v.cur ?? v.base ?? 0);
  return Number(v) || 0;
}

const browser = await launchBrowser();
try {
  await assertEnginePackHealth(base);
  const page = await browser.newPage();
  page.on('console', msg => {
    const t = msg.text();
    if (/greegree|banana|inv_setslot|error|hunt|monkey/i.test(t)) {
      console.log(`[browser.${msg.type()}] ${t.slice(0, 240)}`);
    }
  });
  console.log(`[mm-surface] ${base} user=${username} phases=${phases.join(',')}`);
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`mm-surface_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  await mainlandAccount(page, username, password);
  await waitSceneReady(page, 90_000);
  await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

  if (phases.includes('hold')) {
    console.log('[mm-surface] HOLD leftover greegrees (gorilla + small zombie)');
    if (!(await teleTo(page, APE_ZONE, 3, 25_000))) fail('tele Ape zone failed');
    await waitSceneReady(page, 20_000);
    for (const debug of GREEGREES) {
      await cheatQuiet(page, 'empty', 200).catch(() => {});
      await giveItems(page, [[debug, 1]]);
      const inv = await invNames(page);
      if (!inv.some(n => /greegree/i.test(String(n)))) {
        fail(`give ${debug} failed inv=${JSON.stringify(inv)}`);
      }
      const hold = await holdGreegree(page);
      await waitTicks(page, 3);
      const worn = await wornNames(page);
      console.log(`[mm-surface] hold ${debug}`, hold, 'worn', worn);
      if (shot) await shot(`hold-${debug}`);
      if (!worn.some(n => /greegree/i.test(String(n)))) {
        fail(`Hold ${debug} did not wear: ${JSON.stringify({ hold, worn })}`);
      }
    }
    console.log('[mm-surface] HOLD PASS');
  }

  if (phases.includes('banana')) {
    console.log('[mm-surface] BANANA Search next_loc_stage');
    if (!(await teleTo(page, BANANA, 2, 25_000))) fail('tele banana failed');
    await waitSceneReady(page, 15_000);
    const before = await invNames(page);
    const banana0 = before.filter(n => /^banana$/i.test(String(n))).length;
    const pick = await page.evaluate(([wx, wz]) => {
      const a = globalThis.__lc377?.actions;
      const ok =
        a?.opLocAt?.(wx, wz, 'Search') ||
        a?.opLocAt?.(wx, wz, 'Weed') ||
        a?.opLoc?.('Banana Tree', 'Search', 8) ||
        a?.opLocAt?.(wx, wz, '');
      return { ok: !!ok };
    }, [BANANA_LOC.x, BANANA_LOC.z]);
    console.log('[mm-surface] banana op', pick);
    await waitTicks(page, 6);
    const after = await invNames(page);
    const banana1 = after.filter(n => /^banana$/i.test(String(n)) || /banana/i.test(String(n))).length;
    console.log(`[mm-surface] banana inv ${banana0} → ${banana1}`, after);
    if (shot) await shot('after-banana');
    if (banana1 <= banana0 && !after.some(n => /banana/i.test(String(n)))) {
      fail(`banana pick FAIL: no banana in inv after Search ${JSON.stringify({ pick, after })}`);
    }
    console.log('[mm-surface] BANANA PASS');
  }

  async function kitForArcher(page, why) {
    console.log(`[mm-surface] ${why}: SOFT dragonquest=10 (^dragon_complete) so rune platebody can equip`);
    await wipeInvAndWorn(page, why);
    await cheatQuiet(page, 'setvar dragonquest 10', 400); // SOFT DS complete — same as mm-smoke
    await setStats(page, {
      attack: 90,
      strength: 90,
      defence: 80,
      hitpoints: 90,
      prayer: 99
    });
    await giveItems(page, [
      ['rune_scimitar', 1],
      ['rune_platebody', 1],
      ['rune_platelegs', 1],
      ['rune_kiteshield', 1],
      ['lobster', 20]
    ]);
    await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      for (const n of ['Rune scimitar', 'Rune platebody', 'Rune platelegs', 'Rune kiteshield']) {
        a?.equip?.(n) || a?.heldOp?.(n, 2);
        await new Promise(r => setTimeout(r, 280));
      }
    });
    await waitTicks(page, 2);
    const worn = await wornNames(page);
    console.log(`[mm-surface] ${why} worn`, worn);
    if (!worn.some(n => /platebody/i.test(String(n)))) {
      fail(`rune platebody not worn after SOFT dragonquest 10: ${JSON.stringify(worn)}`);
    }
  }

  async function softProtectMissiles(page) {
    await cheatQuiet(page, 'setstat prayer 99', 150);
    let on = Number(await getServerVarQuiet(page, 'prayer13'));
    if (on === 1) return true;
    await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      a?.setSideTab?.(5);
      // 5622=prayer:prayer_protectfrommissiles → %prayer13
      a?.ifButton?.(5622);
    });
    await waitTicks(page, 2);
    on = Number(await getServerVarQuiet(page, 'prayer13'));
    console.log(`[mm-surface] Protect from Missiles prayer13=${on}`);
    return on === 1;
  }

  if (phases.includes('hunt')) {
    console.log('[mm-surface] HUNT skip while wearing greegree');
    await kitForArcher(page, 'hunt-kit');
    await giveItems(page, [['mm_monkey_greegree_for_normal_monkey', 1]]);
    if (!(await teleTo(page, ARCHER, 2, 25_000))) fail('tele archer failed');
    await waitSceneReady(page, 15_000);
    await holdGreegree(page);
    await waitTicks(page, 4);
    const worn = await wornNames(page);
    if (!worn.some(n => /greegree/i.test(String(n)))) {
      fail(`hunt prep: greegree not worn ${JSON.stringify(worn)}`);
    }
    const hp0 = await hp(page);
    await waitTicks(page, 20);
    const hp1 = await hp(page);
    console.log(`[mm-surface] hunt skip hp ${hp0} → ${hp1} worn=${JSON.stringify(worn)}`);
    if (shot) await shot('hunt-skip');
    if (hp0 > 0 && hp1 > 0 && hp1 < hp0 - 5) {
      fail(`hunt skip FAIL: took damage while wearing greegree (${hp0}→${hp1})`);
    }
    console.log('[mm-surface] HUNT PASS (no material damage while worn)');
  }

  if (phases.includes('drop')) {
    console.log('[mm-surface] DROP posted archer → ninja bones');
    await page.evaluate(() => globalThis.__lc377?.actions?.closeModal?.());
    await kitForArcher(page, 'drop-kit');
    await softProtectMissiles(page);
    if (!(await teleTo(page, ARCHER, 2, 25_000))) fail('tele archer (drop) failed');
    await waitSceneReady(page, 15_000);
    await softProtectMissiles(page);
    const invBefore = await invNames(page);
    const bones0 = invBefore.filter(n => /monkey bones/i.test(String(n))).length;
    const atk = await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const ok = a?.attackNpc?.('Monkey Archer') || a?.attackNpc?.('Archer');
      await new Promise(r => setTimeout(r, 800));
      return { ok: !!ok };
    });
    console.log('[mm-surface] attack archer', atk);
    const deadline = Date.now() + 90_000;
    let bones1 = bones0;
    let lastInv = invBefore;
    while (Date.now() < deadline) {
      await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        const r = globalThis.__lc377?.reader;
        a?.attackNpc?.('Monkey Archer');
        a?.continueDialog?.();
        const st = typeof r?.stat === 'function' ? r.stat('hitpoints') : null;
        const cur = Number(st?.current ?? st?.cur ?? 99);
        if (cur > 0 && cur < 50) a?.heldOp?.('Lobster', 1);
      });
      await waitTicks(page, 3);
      lastInv = await invNames(page);
      bones1 = lastInv.filter(n => /monkey bones/i.test(String(n))).length;
      if (bones1 > bones0) break;
      await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        a?.takeGround?.('Monkey bones', 8) || a?.takeGround?.('bones', 8);
      });
      await waitTicks(page, 2);
      lastInv = await invNames(page);
      bones1 = lastInv.filter(n => /monkey bones/i.test(String(n))).length;
      if (bones1 > bones0) break;
    }
    console.log(`[mm-surface] bones ${bones0} → ${bones1} inv=${JSON.stringify(lastInv)}`);
    if (shot) await shot('after-drop');
    if (bones1 <= bones0) {
      fail(`death_drop FAIL: no Monkey bones after Attack ${JSON.stringify({ atk, lastInv })}`);
    }
    console.log('[mm-surface] DROP PASS');
  }

  console.log(`RESULT: PASS mm-surface (${phases.join(',')}; SOFT tele/give/setstat)`);
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
