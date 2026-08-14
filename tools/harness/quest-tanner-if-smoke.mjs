#!/usr/bin/env node
/**
 * Al-Kharid Ellis Trade → tanner **14670** (was leftover inter_306).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-tanner-if-smoke.mjs
 *
 * Product: op3 Trade (not Talk). Stand west of Ellis 3276,3193.
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
const { username, password } = resolveAccount(rest, 'tan');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

// m51_49 NPC 2824 @ 0 12 57
const NPC = { x: 3276, z: 3193, level: 0 };
const STAND = { x: 3275, z: 3193, level: 0 };
const IF_ROOT = 14670;

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
  console.log(`[tan] ${base} user=${username} (tanner ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`tan_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    if (!(await teleTo(page, STAND, 1, 25_000))) fail('tele Ellis stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 4);
    await waitIdleNear(page, STAND, 1, 40);

    const open = await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const n = (r?.npcs?.() ?? []).find(x => /ellis/i.test(x?.name || ''));
      const ok = !!(a?.npcOp?.(n?.index, 3) || a?.npcOp?.(n?.name, 3));
      const hits = [];
      for (let i = 0; i < 30; i++) {
        const opts = (() => {
          try {
            return (r.chatOptions?.() ?? []).map(o => (typeof o === 'string' ? o : o?.text)).filter(Boolean);
          } catch {
            return [];
          }
        })();
        if (opts.length) a.chooseOption?.(['trade', 'tan']);
        else {
          a.continueDialog?.();
          a.dismissModalMessage?.();
        }
        const m = r?.modals?.() ?? {};
        hits.push({ main: m.main ?? -1, side: m.side ?? -1, npc: n?.name });
        if ((m.main ?? -1) === 14670) {
          return { ok, npc: n?.name, ...m, hits: hits.slice(-6) };
        }
        await new Promise(res => setTimeout(res, 300));
      }
      const m = r?.modals?.() ?? {};
      return { ok, npc: n?.name, ...m, hits: hits.slice(-8) };
    });
    console.log('[tan] open', JSON.stringify(open));
    if (Number(open?.main) !== IF_ROOT) {
      if (shot) await shot('fail-no-tanner');
      fail(`expected tanner ${IF_ROOT}, got ${JSON.stringify(open)}`);
    }
    if (shot) await shot('pass-tanner');
    console.log(`RESULT PASS tanner main=${open.main}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
