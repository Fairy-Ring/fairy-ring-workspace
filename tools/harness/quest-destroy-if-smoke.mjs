#!/usr/bin/env node
/**
 * Destroy leftover destroy_this_object **14170** from fairy_symptoms_list **7411**.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-destroy-if-smoke.mjs
 *
 * Soft: give Symptoms list. Product opheld5 Destroy → if_openchat.
 * Leftover Yes/No only — do not invent per-item lines.
 */
import {
  assertEnginePackHealth,
  boot,
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
const { username, password } = resolveAccount(rest, 'dstry');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3222, z: 3218, level: 0 };
const IF_ROOT = 14170;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[dstry] ${base} user=${username} (destroy_this_object ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`dstry_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await giveItems(page, [['fairy_symptoms_list', 1]]);
    if (!(await teleTo(page, STAND, 1, 25_000))) fail('tele Lumbridge stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);

    const inv = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.inventory?.() ?? []).map(x => x?.name)
    );
    console.log('[dstry] inv', inv);
    if (!inv.some(n => /symptom/i.test(String(n)))) {
      fail(`no Symptoms list in inv: ${JSON.stringify(inv)}`);
    }

    const open = await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a?.heldOp) return { error: 'no heldOp' };
      const ok = a.heldOp('Symptoms list', 5) || a.heldOp('symptom', 5);
      const hits = [];
      for (let i = 0; i < 28; i++) {
        const m = r?.modals?.() ?? {};
        hits.push({ main: m.main ?? -1, chat: m.chat ?? -1, ok });
        if ((m.chat ?? -1) === 14170) return { ...m, ok, hits: hits.slice(-6) };
        await new Promise(res => setTimeout(res, 250));
      }
      return { ...(r?.modals?.() ?? {}), ok, hits };
    });
    console.log('[dstry] open', JSON.stringify(open));
    if (Number(open?.chat) !== IF_ROOT) {
      if (shot) await shot('fail-no-destroy');
      fail(`expected destroy_this_object chat ${IF_ROOT}, got ${JSON.stringify(open)}`);
    }
    await waitTicks(page, 4);
    if (shot) await shot('pass-destroy');
    console.log(`RESULT PASS dstry destroy_this_object chat=${open.chat} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
