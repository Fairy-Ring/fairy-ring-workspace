#!/usr/bin/env node
/**
 * Flamtaer overlay IF — cache-native flamtaer_status (4959), not free-ID 18962.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-flamtaer-status-smoke.mjs
 *
 * Soft: morttonquest 50 + craft 20 + mats. Product Repair wall → overlay 4959.
 */
import {
  assertEnginePackHealth,
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
  setStats,
  setWorldSpeed,
  teleTo,
  waitSceneReady,
  waitTicks
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'flmif');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3505, z: 3315, level: 0 };
const IF_ROOT = 4959;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[flm-if] ${base} user=${username} (flamtaer_status ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`flm-if_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar morttonquest 50', 400);
    await setStats(page, { crafting: 20 }).catch(() => cheatQuiet(page, 'setstat crafting 20', 300));
    await giveItems(page, [
      ['hammer', 1],
      ['woodplank', 4],
      ['swamppaste', 20],
      ['limestonebrick', 4]
    ]);
    await waitTicks(page, 2);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Flamtaer courtyard failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);

    const op = await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const tryTiles = [
        [3504, 3315],
        [3506, 3315],
        [3505, 3314],
        [3505, 3316],
        [3508, 3317]
      ];
      const hits = [];
      for (const [x, z] of tryTiles) {
        const loc = typeof r?.locAt === 'function' ? r.locAt(x, z) : null;
        const ok = !!(
          a?.opLocAt?.(x, z, 'Repair') ||
          a?.opLocAt?.(x, z, '') ||
          a?.opLoc?.('wall', 'Repair', 8)
        );
        hits.push({ x, z, ok, loc: loc ? { name: loc.name, id: loc.id, ops: loc.ops } : null });
        await new Promise(res => setTimeout(res, 400));
        const ov = r?.modals?.()?.overlay ?? -1;
        if (ov === 4959) break;
      }
      const overlays = [];
      for (let i = 0; i < 20; i++) {
        a?.continueDialog?.();
        const mods = r?.modals?.() ?? {};
        overlays.push(mods.overlay ?? -1);
        if ((mods.overlay ?? -1) === 4959) break;
        await new Promise(res => setTimeout(res, 200));
      }
      return {
        hits: hits.slice(0, 6),
        overlaySeen: overlays.includes(4959) ? 4959 : overlays.at(-1),
        overlays,
        mods: r?.modals?.() ?? null
      };
    });
    console.log('[flm-if] repair', JSON.stringify(op).slice(0, 900));
    if (shot) await shot(op.overlaySeen === IF_ROOT ? 'status-open' : 'status-no-if');
    if (op.overlaySeen !== IF_ROOT) {
      fail(`expected overlay ${IF_ROOT} (flamtaer_status), got ${op.overlaySeen} mods=${JSON.stringify(op.mods)}`);
    }
    console.log(`RESULT PASS flm-if product overlay flamtaer_status ${IF_ROOT} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
