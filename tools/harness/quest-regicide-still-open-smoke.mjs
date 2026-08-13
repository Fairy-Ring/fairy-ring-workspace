#!/usr/bin/env node
/**
 * Leftover IF join proof: inter_110 → regicide_still (id 4919).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-regicide-still-open-smoke.mjs
 *
 * Soft: regicide 11 + tar. Product oplocu still → main 4919.
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
  setWorldSpeed,
  teleTo,
  waitSceneReady,
  waitTicks
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'regif');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STILL_STAND = { x: 2926, z: 3212, level: 0 };
const STILL_LOC = { x: 2927, z: 3212 };
const IF_ROOT = 4919;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[reg-if] ${base} user=${username} (open regicide_still ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`reg-if_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar upass 10', 200);
    await cheatQuiet(page, 'setvar regicide_quest 11', 200);
    await giveItems(page, [['regicide_barrel_tar', 1]]);
    await waitTicks(page, 2);
    if (!(await teleTo(page, STILL_STAND, 2, 25_000))) fail('tele still failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 2);

    const use = await page.evaluate(async ({ wx, wz }) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const loc = typeof r?.locAt === 'function' ? r.locAt(wx, wz) : null;
      const ok = loc
        ? !!a?.useHeldOnLoc?.('Barrel of coal-tar', loc)
        : !!a?.useHeldOnLoc?.('Barrel of coal-tar', 'Fractionalizing still', 10);
      const mains = [];
      for (let i = 0; i < 24; i++) {
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
        mains.push(r?.modals?.()?.main ?? -1);
        if (mains[mains.length - 1] === 4919) break;
        await new Promise(res => setTimeout(res, 200));
      }
      return { ok, loc: loc ? { name: loc.name, id: loc.id } : null, mainSeen: mains.includes(4919) ? 4919 : mains.at(-1), mains };
    }, STILL_LOC);
    console.log('[reg-if] use', JSON.stringify(use).slice(0, 500));
    if (shot) await shot(use.mainSeen === IF_ROOT ? 'still-open' : 'still-no-if');
    if (use.mainSeen !== IF_ROOT) {
      fail(`expected main ${IF_ROOT} (regicide_still), got ${use.mainSeen}`);
    }
    console.log(`RESULT PASS reg-if product open regicide_still ${IF_ROOT} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
