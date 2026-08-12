#!/usr/bin/env node
/**
 * Managing Miscellania M1 soft mid — product approval labour (rev 377 tip).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-managing-smoke.mjs
 *
 * Soft entry (labeled):
 *   misc_quest 100 (Throne complete), misc_approval 90 (below 75% band)
 * Product under test:
 *   Weed misc_heather_* (client name "Herbs", op Weed) with worn iron sickle
 *   → product %misc_approval +1
 *   Talk Gardener → "Your approval rating." dialogue
 *
 * Era: tip ~2 May 2006. Sickle heather is map-true on m39_60.
 * RT-era rake herb/flax plots (wiki 22 May 2006) are post-tip — not this smoke.
 *
 * Timing: weed_herbs uses action_delay (~5t firstswing) + roll; do **not** spam
 * oploc every wall-ms or the swing never settles. Fire → waitTicks → getvar.
 *
 * @see docs/research/port-mg-managing-misc-289-to-377.md
 * @see docs/plans/2026-08-10-next-soft-managing-m1.md
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
const { username, password } = resolveAccount(rest, 'managem');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

/** Gardener Gunnhild find coord 0_39_60_29_10 → 2525,3850 L0 */
const GARDENER = { x: 2525, z: 3850, level: 0 };
/**
 * Host **stand** (walkable) — NOT heather/wall tiles.
 * Bad (old smoke): 2524,3849 = local 28,9 **oldcastlewall** → tele into wall.
 * Good: local 28,11 empty floor beside misc_heather (map m39_60).
 * @see docs/research/game-knowledge/harness-tele-stand.md
 * @see docs/research/game-knowledge/anchors-miscellania.md
 */
const HEATHER_STAND = { x: 2524, z: 3851, level: 0 };

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[manage-m1] ${base} user=${username} (headed default)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  // boot() only waits for __lc377 — must navigate first (else about:blank)
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`manage_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    // Pack may land while engine long-lived — reload scripts from data/pack
    console.log('[manage-m1] ::reload pack (labour scripts)');
    await cheatQuiet(page, 'reload', 800);
    await waitTicks(page, 4);

    console.log('[manage-m1] soft Throne complete');
    await cheatQuiet(page, 'setvar misc_quest 100', 600);
    await waitTicks(page, 2);

    await giveItems(page, [{ name: 'iron_sickle', count: 1 }]);
    await waitTicks(page, 2);
    // worn required by weed_herbs.rs2 (inv_total worn sickle)
    const equip = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a) return { error: 'no actions' };
      const ok = !!(a.equip?.('Iron sickle') || a.equip?.('iron_sickle') || a.equip?.('sickle'));
      return {
        ok,
        inv: (r?.inventory?.() ?? []).map(i => i?.name).filter(Boolean).slice(0, 12),
        worn: (r?.equipment?.() ?? []).map(i => i?.name).filter(Boolean)
      };
    });
    console.log('[manage-m1] equip sickle', equip);
    // 2–3 ticks for wear to land server-side
    await waitTicks(page, 3);
    const worn = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.equipment?.() ?? []).map(i => String(i?.name ?? ''))
    );
    if (!worn.some(n => /sickle/i.test(n))) {
      fail(`iron sickle not worn after equip (worn=${JSON.stringify(worn)}; equip=${JSON.stringify(equip)})`);
    }

    console.log('[manage-m1] tele heather stand (beside patch, not wall)', HEATHER_STAND);
    if (!(await teleTo(page, HEATHER_STAND, 2, 25_000))) fail('tele heather stand failed');
    await waitSceneReady(page, 20_000);
    await waitTicks(page, 3);

    // Mapzone first visit seeds approval=32 — soft 90 AFTER tele so product can prove +1
    console.log('[manage-m1] soft misc_approval 90 (post-tele; mapzone may have seeded 32)');
    await cheatQuiet(page, 'setvar misc_approval 90', 600);
    await waitTicks(page, 2);
    const a0 = await getServerVarQuiet(page, 'misc_approval');
    console.log(`[manage-m1] baseline misc_approval=${a0}`);
    if (Number(a0) !== 90) {
      fail(`soft setvar misc_approval 90 failed (got ${a0})`);
    }

    // Product: one Weed op, then let content action_delay (~5t) + continue ticks run.
    // Spamming opLoc every wall-ms restarts firstswing and never rolls success.
    let a1 = a0;
    for (let attempt = 0; attempt < 8; attempt++) {
      const r = await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        const r = globalThis.__lc377?.reader;
        if (!a || !r) return { error: 'no abi' };
        const locs = typeof r.locs === 'function' ? r.locs({ maxDist: 12 }) : [];
        const herbs = locs.filter(
          l =>
            typeof l?.name === 'string' &&
            /^herbs$/i.test(l.name.trim()) &&
            (l.ops || []).some(o => o && /weed/i.test(String(o)))
        );
        const nearest = herbs[0] ?? null;
        let ok = false;
        if (typeof a.opLoc === 'function') {
          ok = !!a.opLoc('Herbs', 'Weed', 14);
        }
        if (!ok && nearest && typeof a.opLocAt === 'function') {
          ok = !!a.opLocAt(nearest.x, nearest.z, 'Weed');
        }
        return {
          ok,
          herbN: herbs.length,
          nearest: nearest
            ? { name: nearest.name, x: nearest.x, z: nearest.z, dist: nearest.distance, ops: nearest.ops }
            : null,
          worn: (r.equipment?.() ?? []).map(i => i?.name).filter(Boolean)
        };
      });
      console.log(`[manage-m1] weed fire ${attempt}`, JSON.stringify(r).slice(0, 300));
      if (!r?.ok) {
        await waitTicks(page, 3);
        continue;
      }
      // firstswing rate 5 + continue rolls + mes settle — poll var only after ticks, not same-ms
      // Need 10+ ticks for full delay cycle (5t firstswing + 5t continue) before re-fire,
      // otherwise new opLoc replaces Player.activeScript mid-delay (runtime.md §7.1)
      a1 = await waitServerVar(page, 'misc_approval', {
        from: a0,
        attempts: 12,
        ticksBetween: 8
      });
      const chat = await page.evaluate(() => {
        const r = globalThis.__lc377?.reader;
        const lines = typeof r?.chat === 'function' ? r.chat(20) : [];
        return (lines ?? []).map(c => String(c?.text ?? c ?? '')).filter(Boolean).slice(-12);
      });
      console.log(`[manage-m1] after wait misc_approval=${a1} (from ${a0}) chat=`, chat);
      if (Number(a1) > Number(a0)) {
        console.log(`[manage-m1] product approval write ${a0} → ${a1}`);
        break;
      }
      // brief pause before re-fire (let any stuck p_oploc drain)
      await waitTicks(page, 4);
    }

    // Product dialogue: talk Gardener → approval rating
    if (!(await teleTo(page, GARDENER, 4, 20_000))) fail('tele gardener failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 2);
    const talk = await page.evaluate(async () => {
      const h = globalThis.__lc377;
      const a = h?.actions;
      const r = h?.reader;
      if (!a || !r) return { error: 'no abi' };
      let ok = !!a.talkNpc?.('Gunnhild') || !!a.talkNpc?.('Gardener');
      if (!ok) {
        const n = (r.npcs?.() ?? []).find(x => /gunnhild|gardener/i.test(x?.name || ''));
        if (n) ok = !!a.talkNpc?.(n.name);
      }
      // multi open is multi-tick
      await new Promise(res => setTimeout(res, 1500));
      const opts = (r.chatOptions?.() ?? [])
        .map(o => (typeof o === 'string' ? o : o?.text))
        .filter(Boolean);
      let pick = null;
      for (const o of opts) {
        if (/approval/i.test(o)) {
          pick = o;
          break;
        }
      }
      if (pick && a.chatOption) a.chatOption(pick);
      else if (pick && a.pickChat) a.pickChat(pick);
      await new Promise(res => setTimeout(res, 1500));
      const chat = (r.chatLines?.() ?? r.chat?.() ?? []).slice(-8);
      return { ok, opts, pick, chat };
    });
    console.log('[manage-m1] gardener talk', JSON.stringify(talk).slice(0, 500));

    if (Number(a1) <= Number(a0)) {
      if (shot) await shot('fail-no-approval');
      fail(
        `M1 FAIL: product did not raise misc_approval (still ${a1}; soft entry was ${a0}). Weed/intercept residual.`
      );
    }

    if (shot) await shot('pass-weed');
    console.log(
      `RESULT PASS manage-m1 product misc_approval ${a0}→${a1} (soft Throne complete + soft 90 entry; sickle heather)`
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
