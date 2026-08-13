#!/usr/bin/env node
/**
 * Horror study IF — cache-native horror_metaldoor (10116), not free-ID 18952.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-horror-metaldoor-smoke.mjs
 *
 * Soft: horrorquest 2. Product Study strange wall (south side) → main 10116.
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
const { username, password } = resolveAccount(rest, 'hfdoor');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2514, z: 4626, level: 1 };
const LOC = { x: 2514, z: 4627 };
const IF_ROOT = 10116;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[hf-door] ${base} user=${username} (horror_metaldoor ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`hf-door_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar horrorquest 2', 400);
    await waitTicks(page, 2);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele strange-wall stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 2);

    const op = await page.evaluate(async ({ x, z }) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const loc = typeof r?.locAt === 'function' ? r.locAt(x, z) : null;
      let ok = !!(a?.opLocAt?.(x, z, 'Study') || a?.opLocAt?.(x, z, '') || a?.opLoc?.('Strange wall', 'Study', 10));
      const mains = [];
      const chats = [];
      for (let i = 0; i < 28; i++) {
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
        mains.push(r?.modals?.()?.main ?? -1);
        if (mains[mains.length - 1] === 10116) break;
        await new Promise(res => setTimeout(res, 200));
      }
      try {
        chats.push(...(r?.chat?.(12) ?? []).map(c => String(c?.text ?? c ?? '')));
      } catch {
        /* ignore */
      }
      return {
        ok,
        loc: loc ? { name: loc.name, id: loc.id, ops: loc.ops } : null,
        mainSeen: mains.includes(10116) ? 10116 : mains.at(-1),
        mains,
        chats: chats.slice(-8)
      };
    }, LOC);
    console.log('[hf-door] study', JSON.stringify(op).slice(0, 800));
    if (shot) await shot(op.mainSeen === IF_ROOT ? 'metaldoor-open' : 'metaldoor-no-if');
    if (op.mainSeen !== IF_ROOT) {
      fail(`expected main ${IF_ROOT} (horror_metaldoor), got ${op.mainSeen} loc=${JSON.stringify(op.loc)} chat=${JSON.stringify(op.chats)}`);
    }
    console.log(`RESULT PASS hf-door product open horror_metaldoor ${IF_ROOT} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
