#!/usr/bin/env node
/**
 * Peer combo lock IF — cache-native combolockdoor (10051), not free-ID 18989.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-viking-combo-smoke.mjs
 *
 * Soft: viking_bits peer=1 (1<<18). Product door1 → Solve the riddle → main 10051.
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
const { username, password } = resolveAccount(rest, 'vikcmb');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2630, z: 3667, level: 0 };
const LOC = { x: 2631, z: 3667 };
const IF_ROOT = 10051;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[vik-combo] ${base} user=${username} (combolockdoor ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`vik-combo_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    // peer bits 18–19 = 1 → viking_bits 262144
    await cheatQuiet(page, 'setvar viking_bits 262144', 400);
    await waitTicks(page, 2);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele door1 stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 2);

    const op = await page.evaluate(async ({ x, z }) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const loc = typeof r?.locAt === 'function' ? r.locAt(x, z) : null;
      const ok = !!(a?.opLocAt?.(x, z, '') || a?.opLocAt?.(x, z, 'Open') || a?.opLoc?.('Door', '', 10));
      const mains = [];
      const picks = [];
      for (let i = 0; i < 36; i++) {
        const opts = (r?.chatOptions?.() ?? [])
          .map(o => (typeof o === 'string' ? o : o?.text))
          .filter(Boolean);
        if (opts.length) {
          a.chooseOption?.(['Solve the riddle', 'solve']);
          picks.push(opts);
        } else {
          a.continueDialog?.();
          a.dismissModalMessage?.();
        }
        mains.push(r?.modals?.()?.main ?? -1);
        if (mains[mains.length - 1] === 10051) break;
        await new Promise(res => setTimeout(res, 220));
      }
      return {
        ok,
        loc: loc ? { name: loc.name, id: loc.id, ops: loc.ops } : null,
        mainSeen: mains.includes(10051) ? 10051 : mains.at(-1),
        mains: mains.filter(m => m > 0).slice(0, 8),
        picks: picks.slice(0, 4)
      };
    }, LOC);
    console.log('[vik-combo] door', JSON.stringify(op).slice(0, 800));
    if (shot) await shot(op.mainSeen === IF_ROOT ? 'combo-open' : 'combo-no-if');
    if (op.mainSeen !== IF_ROOT) {
      fail(`expected main ${IF_ROOT} (combolockdoor), got ${op.mainSeen} loc=${JSON.stringify(op.loc)}`);
    }
    console.log(`RESULT PASS vik-combo product open combolockdoor ${IF_ROOT} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
