#!/usr/bin/env node
/**
 * Leftover void_knights_training **18691** from Void Knight Exchange.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-pest-exchange-if-smoke.mjs
 *
 * Product: opnpc3 Exchange → if_openmain leftover Training Options.
 * Stand south of VK **2654,2663**.
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
const { username, password } = resolveAccount(rest, 'pestx');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2654, z: 2662, level: 0 };
const IF_ROOT = 18691;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[pestx] ${base} user=${username} (void_knights_training ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`pestx_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    if (!(await teleTo(page, STAND, 1, 25_000))) fail('tele Void Knight stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    await page.evaluate(async () => {
      const h = globalThis.__lc377;
      for (let i = 0; i < 40; i++) {
        if (!h?.reader?.busy?.() && !h?.reader?.moving?.()) break;
        await new Promise(r => setTimeout(r, 200));
      }
    });

    const traded = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a || !r) return { error: 'no abi' };
      const n = (r.npcs?.() ?? []).find(x => /void knight/i.test(x?.name || ''));
      if (!n) return { error: 'no Void Knight', names: (r.npcs?.() ?? []).map(x => x?.name).slice(0, 16) };
      const ok = !!a.npcOp?.(n.index, 3);
      return { ok, index: n.index, name: n.name, ops: n.ops, tile: n.tile };
    });
    console.log('[pestx] Exchange', traded);
    if (!traded?.ok) {
      if (shot) await shot('fail-no-exchange');
      fail(`Void Knight Exchange failed ${JSON.stringify(traded)}`);
    }

    const open = await page.evaluate(async () => {
      const r = globalThis.__lc377?.reader;
      const hits = [];
      for (let i = 0; i < 32; i++) {
        const m = r?.modals?.() ?? {};
        hits.push({ main: m.main ?? -1 });
        if ((m.main ?? -1) === 18691) return { ...m, hits: hits.slice(-6) };
        await new Promise(res => setTimeout(res, 250));
      }
      return { ...(r?.modals?.() ?? {}), hits };
    });
    console.log('[pestx] open', JSON.stringify(open));
    if (shot) await shot(Number(open.main) === IF_ROOT ? 'pass-if' : 'fail-no-if');
    if (Number(open.main) !== IF_ROOT) {
      fail(`expected void_knights_training main ${IF_ROOT}, got ${JSON.stringify(open)}`);
    }
    console.log(`RESULT PASS pestx main=${open.main} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
