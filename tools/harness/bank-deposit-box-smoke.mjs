#!/usr/bin/env node
/**
 * Bank deposit box leftover IF — cache-native bank_deposit_box (4465), was inter_95.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/bank-deposit-box-smoke.mjs
 *
 * Soft: give cooked_meat. Product Deposit loc @ Falador west 2943,3369 → main 4465.
 * Do not use Draynor 3094,3240 — dark wizards agro/curse fresh accounts.
 */
import {
  assertEnginePackHealth,
  boot,
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
  waitSceneReady,
  waitTicks
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'bdep');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

// m45_52 0 63 41: 9398 — Falador west bank. Same loc type, forceapproach=south.
// Draynor 3094,3240 is period-correct but dark wizards kill/curse a fresh account
// before the op lands ("You feel weakened.").
const LOC = { x: 2943, z: 3369, level: 0 };
const STAND = { x: 2943, z: 3368, level: 0 };
const IF_ROOT = 4465;

async function waitIdleNear(page, tile, dist = 1, iters = 50) {
  await page.evaluate(
    async ([wx, wz, d, n]) => {
      const h = globalThis.__lc377;
      for (let i = 0; i < n; i++) {
        const t = h?.worldTile?.();
        const busy = h?.reader?.busy?.() || h?.reader?.moving?.();
        if (t && Math.max(Math.abs(t.x - wx), Math.abs(t.z - wz)) <= d && !busy) break;
        await new Promise(r => setTimeout(r, 200));
      }
    },
    [tile.x, tile.z, dist, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[bdep] ${base} user=${username} (bank_deposit_box ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`bdep_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await giveItems(page, [['cooked_meat', 1]]);
    await waitTicks(page, 2);
    if (!(await teleTo(page, STAND, 0, 25_000))) fail('tele Falador west deposit stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 2);
    await waitIdleNear(page, STAND, 0, 40);

    const op = await page.evaluate(async ([lx, lz]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const loc = typeof r?.locAt === 'function' ? r.locAt(lx, lz) : null;
      const tryOp = () =>
        !!(
          a?.opLocAt?.(lx, lz, 'Deposit') ||
          a?.opLocAt?.(lx, lz, '') ||
          a?.opLoc?.('Bank Deposit Box', 'Deposit', 8) ||
          a?.opLoc?.('deposit', 'Deposit', 8)
        );
      const ok = tryOp();
      const mains = [];
      for (let i = 0; i < 24; i++) {
        if (i === 8 || i === 16) tryOp();
        const main = r?.modals?.()?.main ?? -1;
        mains.push(main);
        if (main === 4465) break;
        await new Promise(res => setTimeout(res, 250));
      }
      const mods = r?.modals?.() ?? {};
      return {
        ok,
        loc,
        tile: r?.coord?.() ?? r?.localTile?.() ?? null,
        main: mods.main ?? -1,
        mains,
        mods
      };
    }, [LOC.x, LOC.z]);
    console.log('[bdep] deposit', JSON.stringify(op).slice(0, 700));
    if (Number(op?.main) !== IF_ROOT) {
      if (shot) await shot('fail-no-if');
      fail(`expected main ${IF_ROOT}, got ${JSON.stringify(op)}`);
    }
    if (shot) await shot('pass-if-open');
    console.log(`RESULT PASS bank-deposit-box main=${op.main}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
