#!/usr/bin/env node
/**
 * Myreque swamp-boat IF — leftover inter_230 rename + 289 travel_to_hollow.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-myreque-boat-if-smoke.mjs
 *
 * Soft: routequest 20 (repaired) + coins. Product Board/Pay → main 11902 then hollows 25.
 * Then product hollows Board → same IF + land Mort’ton stand.
 *
 * @see docs/plans/2026-08-13-myreque-swamp-boat-if.md
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
  waitTicks
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'myrboat');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const IF_ROOT = 11902;
const MORTTON_BOAT = { x: 3522, z: 3284, level: 0 };
const MORTTON_LOC = { x: 3523, z: 3284 };
const HOLLOWS_LAND = { x: 3498, z: 3380 };
const HOLLOWS_BOAT = { x: 3498, z: 3377 };

async function boardLoc(page, tile, wantOp) {
  return page.evaluate(
    async ({ x, z, wantOp }) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a || !r) return { error: 'no abi' };
      const seen = [];
      const tryOp = op => {
        if (a.opLocAt?.(x, z, op)) {
          seen.push(`opLocAt:${op}`);
          return true;
        }
        return false;
      };
      let ok = tryOp(wantOp) || tryOp('Board') || tryOp('Pay') || tryOp('pay') || tryOp('');
      if (!ok && a.opLoc) {
        ok = !!(a.opLoc('Swamp Boaty', wantOp, 12) || a.opLoc('Swamp Boaty', 'Board', 12));
        if (ok) seen.push('opLoc-name');
      }
      let mainSeen = -1;
      const mains = [];
      for (let i = 0; i < 40; i++) {
        const opts = (r.chatOptions?.() ?? [])
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
        const main = r.modals?.()?.main ?? -1;
        mains.push(main);
        if (main === 11902) mainSeen = main;
        await new Promise(res => setTimeout(res, 180));
      }
      const tile = globalThis.__lc377?.worldTile?.() ?? null;
      return { ok, seen, mainSeen, lastMain: mains[mains.length - 1], mains: mains.filter(m => m > 0).slice(0, 12), tile };
    },
    { x: tile.x, z: tile.z, wantOp }
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[myr-boat] ${base} user=${username} (IF 11902; headed default)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`myr-boat_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    await cheatQuiet(page, 'setvar routequest 20', 500);
    await giveItems(page, [['coins', 50]]);
    await waitTicks(page, 2);

    console.log('[myr-boat] tele Mort’ton stand', MORTTON_BOAT);
    if (!(await teleTo(page, MORTTON_BOAT, 2, 25_000))) fail('tele Mort’ton boat stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 2);

    const out = await boardLoc(page, MORTTON_LOC, 'Pay');
    console.log('[myr-boat] outbound', JSON.stringify(out).slice(0, 900));
    if (shot) await shot(out.mainSeen === IF_ROOT ? 'outbound-if' : 'outbound-no-if');

    await waitTicks(page, 8);
    await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      a?.continueDialog?.();
      a?.dismissModalMessage?.();
    });

    const stageOut = Number(await getServerVarQuiet(page, 'routequest'));
    const tileOut = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    console.log(`[myr-boat] after outbound routequest=${stageOut} tile=`, tileOut);
    if (out.mainSeen !== IF_ROOT) {
      fail(`outbound FAIL: expected main ${IF_ROOT} (swamp_boatjourney), got mainSeen=${out.mainSeen} last=${out.lastMain}`);
    }
    if (!(stageOut >= 25)) {
      fail(`outbound FAIL: routequest=${stageOut} want≥25 tile=${JSON.stringify(tileOut)}`);
    }
    const ox = Number(tileOut?.x);
    const oz = Number(tileOut?.z);
    if (Math.abs(ox - HOLLOWS_LAND.x) > 2 || Math.abs(oz - HOLLOWS_LAND.z) > 2) {
      fail(`outbound FAIL: land tile ${ox},${oz} want ~${HOLLOWS_LAND.x},${HOLLOWS_LAND.z}`);
    }

    const ret = await boardLoc(page, HOLLOWS_BOAT, 'Board');
    console.log('[myr-boat] return', JSON.stringify(ret).slice(0, 900));
    if (shot) await shot(ret.mainSeen === IF_ROOT ? 'return-if' : 'return-no-if');
    await waitTicks(page, 6);

    const tileRet = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    console.log('[myr-boat] after return tile=', tileRet);
    if (ret.mainSeen !== IF_ROOT) {
      fail(`return FAIL: expected main ${IF_ROOT}, got mainSeen=${ret.mainSeen} last=${ret.lastMain}`);
    }
    const rx = Number(tileRet?.x);
    const rz = Number(tileRet?.z);
    if (Math.abs(rx - MORTTON_BOAT.x) > 3 || Math.abs(rz - MORTTON_BOAT.z) > 3) {
      fail(`return FAIL: land tile ${rx},${rz} want ~${MORTTON_BOAT.x},${MORTTON_BOAT.z}`);
    }

    if (shot) await shot('pass-both');
    console.log(`RESULT PASS myr-boat product swamp_boatjourney ${IF_ROOT} out+back user=${username} stage=${stageOut}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
