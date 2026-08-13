#!/usr/bin/env node
/**
 * Viking Peer mural IF — cache-native viking_mural (9929), not free-ID inter_185.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-viking-mural-smoke.mjs
 */
import {
  assertEnginePackHealth,
  boot,
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
const { username, password } = resolveAccount(rest, 'vikmur');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2634, z: 3664, level: 0 };
const LOC = { x: 2634, z: 3663 };
const IF_ROOT = 9929;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[vik-mural] ${base} user=${username} (viking_mural ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`vik-mural_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele mural stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 2);

    const op = await page.evaluate(async ({ x, z }) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const loc = typeof r?.locAt === 'function' ? r.locAt(x, z) : null;
      const ok = !!(
        a?.opLocAt?.(x, z, 'Study') ||
        a?.opLocAt?.(x, z, '') ||
        a?.opLoc?.('Abstract mural', 'Study', 10)
      );
      const mains = [];
      for (let i = 0; i < 28; i++) {
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
        mains.push(r?.modals?.()?.main ?? -1);
        if (mains[mains.length - 1] === 9929) break;
        await new Promise(res => setTimeout(res, 200));
      }
      return {
        ok,
        loc: loc ? { name: loc.name, id: loc.id, ops: loc.ops } : null,
        mainSeen: mains.includes(9929) ? 9929 : mains.at(-1),
        mains
      };
    }, LOC);
    console.log('[vik-mural] study', JSON.stringify(op).slice(0, 700));
    if (shot) await shot(op.mainSeen === IF_ROOT ? 'mural-open' : 'mural-no-if');
    if (op.mainSeen !== IF_ROOT) {
      fail(`expected main ${IF_ROOT} (viking_mural), got ${op.mainSeen} loc=${JSON.stringify(op.loc)}`);
    }
    console.log(`RESULT PASS vik-mural product open viking_mural ${IF_ROOT} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
