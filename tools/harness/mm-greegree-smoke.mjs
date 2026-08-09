#!/usr/bin/env node
/**
 * MM greegree vertical slice — Hold greegree in-zone → transmog; leave zone → unequip.
 *
 * Soft: tele, give greegree. Product: opheld2 Hold + zone timer.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/mm-greegree-smoke.mjs
 *
 * @see docs/research/mm-greegree-377-pack-audit.md
 */
import {
  boot,
  cheatQuiet,
  createShotRunDir,
  fail,
  giveItems,
  installScreenshotBridge,
  launchBrowser,
  mainlandAccount,
  parseArgs,
  resolveAccount,
  setWorldSpeed,
  teleTo,
  waitSceneReady
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'mmg');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

/** Ape Atoll greegree zone — mapsquare 42,42 → world base 2688,2688; stand ~2755,2795 */
const APE_ATOLL = { x: 2755, z: 2795, level: 0 };
/** Lumbridge — outside greegree zone */
const LUMBY = { x: 3222, z: 3218, level: 0 };

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  page.on('console', msg => {
    const t = msg.text();
    if (/greegree|monkey|transmog|trigger|error/i.test(t)) {
      console.log(`[browser.${msg.type()}] ${t.slice(0, 260)}`);
    }
  });

  console.log(`[mm-greegree] ${base} user=${username} zone=${APE_ATOLL.x},${APE_ATOLL.z}`);
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`mm-greegree_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }

  await mainlandAccount(page, username, password);
  await waitSceneReady(page, 45_000);
  await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

  await giveItems(page, [['mm_monkey_greegree_for_normal_monkey', 1]]);
  console.log('[mm-greegree] SOFT tele Ape Atoll greegree zone');
  if (!(await teleTo(page, APE_ATOLL, 3, 25_000))) fail('tele Ape Atoll failed');
  await waitSceneReady(page, 20_000);
  if (shot) await shot('at-zone');

  const inv0 = await page.evaluate(() =>
    (globalThis.__lc377?.reader?.inventory?.() ?? []).map(x => x?.name)
  );
  console.log('[mm-greegree] inv', inv0);
  if (!inv0.some(n => /greegree/i.test(String(n)))) {
    fail(`no greegree in inv: ${JSON.stringify(inv0)}`);
  }

  // Product Hold (iop2) — harness heldOp(name, 2) = OP_HELD2 (not invent opHeld)
  const hold = await page.evaluate(async () => {
    const a = globalThis.__lc377?.actions;
    if (!a?.heldOp) return { error: 'no heldOp' };
    // iop2=Hold on greegree → 1-based op index 2
    const ok = a.heldOp('Monkey greegree', 2) || a.heldOp('greegree', 2);
    await new Promise(res => setTimeout(res, 2800));
    return { ok: !!ok };
  });
  console.log('[mm-greegree] hold', hold);
  if (shot) await shot('after-hold');

  // Soft wait for transmog — reader may not expose transmog; check worn + mes
  await new Promise(r => setTimeout(r, 1500));
  const worn = await page.evaluate(() =>
    (globalThis.__lc377?.reader?.equipment?.() ?? []).map(x => x?.name)
  );
  console.log('[mm-greegree] worn', worn);
  const wearing = worn.some(n => /greegree/i.test(String(n)));
  if (!wearing) {
    // try opHeld by id path
    fail(`greegree not worn after Hold: ${JSON.stringify({ hold, worn })}`);
  }

  console.log('[mm-greegree] SOFT tele outside zone (Lumbridge) — expect force unequip');
  // Drop modals so NORMAL timer canAccess() + tele cheat can run
  await page.evaluate(() => globalThis.__lc377?.actions?.closeModal?.()).catch(() => {});
  if (!(await teleTo(page, LUMBY, 3, 25_000))) fail('tele Lumbridge failed');
  await waitSceneReady(page, 15_000);
  const tileAfter = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
  console.log('[mm-greegree] tile after leave', tileAfter);

  // Zone timer is 1-tick; wait several world ticks + drain mesbox
  const waitMs = Number(process.env.GREEGREE_LEAVE_WAIT_MS) || 8000;
  const deadline = Date.now() + waitMs;
  let worn2 = [];
  let inv2 = [];
  while (Date.now() < deadline) {
    await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      a?.closeModal?.();
      for (let i = 0; i < 6; i++) {
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
        await new Promise(r => setTimeout(r, 80));
      }
    });
    worn2 = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.equipment?.() ?? []).map(x => x?.name)
    );
    inv2 = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.inventory?.() ?? []).map(x => x?.name)
    );
    const still = worn2.some(n => /greegree/i.test(String(n)));
    const back = inv2.some(n => /greegree/i.test(String(n)));
    if (!still && back) break;
    await new Promise(r => setTimeout(r, 400));
  }
  const chat = await page.evaluate(() => {
    const r = globalThis.__lc377?.reader;
    if (typeof r?.chat === 'function') {
      return r.chat(16).map(c => String(c?.text ?? c ?? ''));
    }
    return [];
  });
  console.log('[mm-greegree] after leave worn', worn2, 'inv', inv2);
  console.log('[mm-greegree] chat', chat.slice(-8));
  if (shot) await shot('after-leave-zone');

  const stillWorn = worn2.some(n => /greegree/i.test(String(n)));
  if (stillWorn) {
    fail(`greegree still worn outside zone: ${JSON.stringify(worn2)} tile=${JSON.stringify(tileAfter)}`);
  }
  const backInInv = inv2.some(n => /greegree/i.test(String(n)));
  if (!backInInv) {
    fail(`greegree not returned to inv: ${JSON.stringify(inv2)} chat=${JSON.stringify(chat.slice(-6))}`);
  }

  console.log(
    'RESULT: PASS mm-greegree slice (Hold in Ape Atoll zone; leave zone unequip; SOFT tele/give)'
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
