#!/usr/bin/env node
/**
 * Leftover blast_furnace_bar_stock **14458** from cooled dispenser Take.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-bf-stock-if-smoke.mjs
 *
 * Soft: setvar blast_furnace_readings 768 (bars_hot=3). Product Take → if_openmain.
 * Stand next to dispenser **1940,4963** (width 2).
 */
import {
  assertEnginePackHealth,
  boot,
  cheatQuiet,
  createShotRunDir,
  fail,
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
const { username, password } = resolveAccount(rest, 'bfstk');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 1940, z: 4962, level: 0 };
const DISP = { x: 1940, z: 4963 };
const IF_ROOT = 14458;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[bfstk] ${base} user=${username} (blast_furnace_bar_stock ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`bfstk_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    // Tele first so the multi loc is in the scene, then flip bars_hot=3
    // (varp-before-tele left 9092 on the empty Search child).
    if (!(await teleTo(page, STAND, 1, 25_000))) fail('tele BF dispenser stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 4);
    await cheatQuiet(page, 'setvar blast_furnace_bars_hot 3', 400);
    await waitTicks(page, 6);
    await page.evaluate(async () => {
      const h = globalThis.__lc377;
      for (let i = 0; i < 40; i++) {
        if (!h?.reader?.busy?.() && !h?.reader?.moving?.()) break;
        await new Promise(r => setTimeout(r, 200));
      }
    });

    const clicked = await page.evaluate(([wx, wz]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a) return { error: 'no abi' };
      const all = r?.locs?.({ maxDist: 12 }) ?? [];
      const locs = all.slice(0, 20).map(x => ({
        name: x?.name,
        op: x?.ops,
        id: x?.id,
        x: x?.x,
        z: x?.z
      }));
      // Multi root 9092 has no LocType name/ops (ops live on the cooled child).
      // locAt() therefore returns null; click the typecode directly (OP_LOC1=625).
      const root = all.find(x => (x?.id | 0) === 9092);
      const okRoot =
        !!root &&
        typeof a.menuAction === 'function' &&
        !!a.menuAction(625, root.typecode, root.lx, root.lz);
      const okName =
        !!a.opLocAt?.(wx, wz, 'Take') ||
        !!a.opLoc?.('Bar dispenser', 'Take', 12) ||
        !!a.opLoc?.('dispenser', 'Take', 12);
      return { ok: okRoot || okName, how: okRoot ? 'menu-9092' : okName ? 'name' : 'none', root: root ? { id: root.id, x: root.x, z: root.z } : null, locs };
    }, [DISP.x, DISP.z]);
    console.log('[bfstk] Take', clicked);
    if (!clicked?.ok) {
      if (shot) await shot('fail-no-take');
      fail(`dispenser Take failed ${JSON.stringify(clicked)}`);
    }

    const open = await page.evaluate(async () => {
      const r = globalThis.__lc377?.reader;
      const hits = [];
      for (let i = 0; i < 32; i++) {
        const m = r?.modals?.() ?? {};
        hits.push({ main: m.main ?? -1 });
        if ((m.main ?? -1) === 14458) return { ...m, hits: hits.slice(-6) };
        await new Promise(res => setTimeout(res, 250));
      }
      return { ...(r?.modals?.() ?? {}), hits };
    });
    console.log('[bfstk] open', JSON.stringify(open));
    if (shot) await shot(Number(open.main) === IF_ROOT ? 'pass-stock' : 'fail-no-stock');
    if (Number(open.main) !== IF_ROOT) {
      fail(`expected blast_furnace_bar_stock main ${IF_ROOT}, got ${JSON.stringify(open)}`);
    }
    console.log(`RESULT PASS bfstk main=${open.main} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
