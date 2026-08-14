#!/usr/bin/env node
/**
 * Visual check: Rimmington copper 9708 depletes to leftover empty 9723,
 * not limestone pile_of_rock 4027 and not old plainrock1 450.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-deplete \
 *     node tools/harness/quest-rimmington-deplete-smoke.mjs
 *
 * Soft: give bronze_pickaxe + setstat mining 15. Product oploc1 Mine.
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
const { username, password } = resolveAccount(rest, 'dep');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

/** Stand next to copper 9708 @ 2977–2978,3247–3248 (m46_50). */
const COPPER = { x: 2978, z: 3247, level: 0 };
const ORE_IDS = [9708, 9709, 9710];
const EMPTY_OK = new Set([9723, 9724, 9725]);
const EMPTY_WRONG = new Set([4027, 4028, 4029, 4030, 450, 451, 452, 453]);

async function nearbyRocks(page) {
  return page.evaluate(() => {
    const r = globalThis.__lc377?.reader;
    const list = r?.locs?.({ maxDist: 6 }) ?? [];
    return list
      .filter(l => /rock/i.test(String(l?.name ?? '')))
      .map(l => ({
        id: l.id | 0,
        name: l.name,
        x: l.x | 0,
        z: l.z | 0,
        d: l.distance | 0,
        ops: l.ops || []
      }))
      .sort((a, b) => a.d - b.d);
  });
}

async function mineOnce(page) {
  return page.evaluate(async ids => {
    const h = globalThis.__lc377;
    const a = h?.actions;
    const r = h?.reader;
    if (!a || !r) return { ok: false, err: 'no abi' };
    const want = new Set(ids);
    const rocks = (r.locs?.({ maxDist: 8 }) ?? [])
      .filter(l => want.has(l.id | 0) && (l.ops || []).some(o => /mine/i.test(String(o ?? ''))))
      .sort((x, y) => (x.distance | 0) - (y.distance | 0));
    const rock = rocks[0];
    if (!rock) return { ok: false, err: 'no ore rock' };
    const ok = !!(a.opLocAt?.(rock.x, rock.z, 'Mine') || a.opLoc?.(rock, 'Mine', 16));
    return { ok, id: rock.id | 0, x: rock.x | 0, z: rock.z | 0 };
  }, ORE_IDS);
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[dep] ${base} user=${username}`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`dep_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await setStats(page, { mining: 15 }).catch(() => cheatQuiet(page, 'setstat mining 15', 300));
    await giveItems(page, [['bronze_pickaxe', 1]]);
    if (!(await teleTo(page, COPPER, 1, 25_000))) fail('tele Rimmington copper failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 4);

    const before = await nearbyRocks(page);
    console.log('[dep] before', JSON.stringify(before.slice(0, 8)));
    if (shot) await shot('before');

    const hit = await mineOnce(page);
    console.log('[dep] mine', JSON.stringify(hit));
    if (!hit?.ok) fail(`mine failed: ${JSON.stringify(hit)}`);

    let after = [];
    let seenOk = false;
    let seenWrong = null;
    for (let i = 0; i < 24; i++) {
      await waitTicks(page, 4);
      after = await nearbyRocks(page);
      const at = after.filter(l => Math.abs(l.x - (hit.x | 0)) <= 1 && Math.abs(l.z - (hit.z | 0)) <= 1);
      if (at.some(l => EMPTY_OK.has(l.id))) seenOk = true;
      const bad = at.find(l => EMPTY_WRONG.has(l.id));
      if (bad) seenWrong = bad;
      if (i === 0 || i % 4 === 0 || seenOk || seenWrong) {
        console.log('[dep] after', i, JSON.stringify(at));
      }
      if (seenOk || seenWrong) break;
    }
    if (shot) await shot('after');

    if (seenWrong) {
      fail(`depleted to wrong loc ${seenWrong.name}#${seenWrong.id} (want leftover 9723/9724/9725)`);
    }
    if (!seenOk) {
      fail(`no leftover empty 9723/9724/9725 at ${hit.x},${hit.z}; last=${JSON.stringify(after.slice(0, 8))}`);
    }
    console.log(`[dep] PASS leftover empty at ${hit.x},${hit.z}`);
  } finally {
    if (process.env.KEEP_OPEN !== '1') await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
