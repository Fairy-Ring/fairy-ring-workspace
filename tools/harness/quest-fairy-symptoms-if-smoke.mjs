#!/usr/bin/env node
/**
 * Read leftover fairy_queen_symptoms **18164** from fairy_symptoms_list **7411**.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-fairy-symptoms-if-smoke.mjs
 *
 * Soft: give Symptoms list. Product opheld1 Read → if_openmain.
 * Leftover list text only — do not invent FT1 chat.
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
const { username, password } = resolveAccount(rest, 'fqsy');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3222, z: 3218, level: 0 };
const IF_ROOT = 18164;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[fqsy] ${base} user=${username} (fairy_queen_symptoms ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`fqsy_${username}`);
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
    console.log('[fqsy] inv', inv);
    if (!inv.some(n => /symptom/i.test(String(n)))) {
      fail(`no Symptoms list in inv: ${JSON.stringify(inv)}`);
    }

    const open = await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a?.heldOp) return { error: 'no heldOp' };
      const ok =
        a.heldOp('Symptoms list', 1) ||
        a.heldOp('symptom', 1) ||
        a.useHeld?.('Symptoms');
      const hits = [];
      for (let i = 0; i < 24; i++) {
        const m = r?.modals?.() ?? {};
        hits.push({ main: m.main ?? -1, chat: m.chat ?? -1, ok });
        if ((m.main ?? -1) === 18164) return { ...m, ok, hits: hits.slice(-6) };
        await new Promise(res => setTimeout(res, 250));
      }
      return { ...(r?.modals?.() ?? {}), ok, hits };
    });
    console.log('[fqsy] open', JSON.stringify(open));
    if (Number(open?.main) !== IF_ROOT) {
      if (shot) await shot('fail-no-symptoms');
      fail(`expected fairy_queen_symptoms main ${IF_ROOT}, got ${JSON.stringify(open)}`);
    }
    await waitTicks(page, 4);
    if (shot) await shot('pass-symptoms');
    console.log(`RESULT PASS fqsy fairy_queen_symptoms main=${open.main} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
