#!/usr/bin/env node
/**
 * Leftover Tai Bwo rotten fence Repair → village_fence_fixed1 **9026**.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-tbw-fence-if-smoke.mjs
 *
 * Stand north of south-ring **9025** @ **2794,3053**. Product Repair. No spars / favour.
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
const { username, password } = resolveAccount(rest, 'tbwfn');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2794, z: 3054, level: 0 };
const FENCE = { x: 2794, z: 3053 };
const ROTTEN = 9025;
const FIXED1 = 9026;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[tbwfn] ${base} user=${username} (village_fence_rotten ${ROTTEN} → ${FIXED1})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`tbwfn_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    if (!(await teleTo(page, STAND, 1, 25_000))) fail('tele TBW fence stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 4);

    const clicked = await page.evaluate(([wx, wz]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a) return { error: 'no abi' };
      const locs = (r?.locs?.({ maxDist: 8 }) ?? []).map(x => ({
        id: x?.id,
        name: x?.name,
        op: x?.ops,
        x: x?.x,
        z: x?.z
      }));
      const ok =
        !!a.opLocAt?.(wx, wz, 'Repair') ||
        !!a.opLoc?.('Rotten village fence', 'Repair', 10) ||
        !!a.opLoc?.('fence', 'Repair', 10);
      return { ok, locs };
    }, [FENCE.x, FENCE.z]);
    console.log('[tbwfn] Repair', JSON.stringify(clicked));
    if (!clicked?.ok) {
      if (shot) await shot('fail-no-repair');
      fail(`fence Repair failed ${JSON.stringify(clicked)}`);
    }

    const after = await page.evaluate(async ([wx, wz, want]) => {
      const r = globalThis.__lc377?.reader;
      const hits = [];
      for (let i = 0; i < 40; i++) {
        const at = r?.locAt?.(wx, wz);
        const nearby = (r?.locs?.({ maxDist: 4 }) ?? []).filter(
          x => (x?.x | 0) === wx && (x?.z | 0) === wz
        );
        hits.push({ id: at?.id ?? nearby[0]?.id ?? -1, name: at?.name ?? nearby[0]?.name });
        if (hits.at(-1).id === want) return { id: want, hits: hits.slice(-6) };
        await new Promise(res => setTimeout(res, 250));
      }
      return { id: hits.at(-1)?.id ?? -1, hits };
    }, [FENCE.x, FENCE.z, FIXED1]);
    console.log('[tbwfn] after', JSON.stringify(after));
    if (shot) await shot(Number(after.id) === FIXED1 ? 'pass-fixed1' : 'fail-no-stage');
    if (Number(after.id) !== FIXED1) {
      fail(`expected loc ${FIXED1} after Repair, got ${JSON.stringify(after)}`);
    }
    console.log(`RESULT PASS tbwfn loc=${after.id} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
