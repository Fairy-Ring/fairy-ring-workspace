#!/usr/bin/env node
/**
 * Read leftover inter_327 (The Ballad of Jareesh) from elid_ballad.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-ballad-if-smoke.mjs
 *
 * Soft: give Ballad. Product opheld1 Read → if_openmain leftover inter_327.
 * Leftover poem text only — do not invent Elid chat.
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
const { username, password } = resolveAccount(rest, 'jare');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3222, z: 3218, level: 0 };
const IF_ROOT = 15712; // leftover-if-titles: inter_327 **15712**

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[jare] ${base} user=${username} (inter_327 ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`jare_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await giveItems(page, [['elid_ballad', 1]]);
    if (!(await teleTo(page, STAND, 1, 25_000))) fail('tele Lumbridge stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);

    const inv = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.inventory?.() ?? []).map(x => x?.name)
    );
    console.log('[jare] inv', inv);
    if (!inv.some(n => /ballad/i.test(String(n)))) {
      fail(`no Ballad in inv: ${JSON.stringify(inv)}`);
    }

    const open = await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a?.heldOp) return { error: 'no heldOp' };
      const ok = a.heldOp('Ballad', 1) || a.heldOp('ballad', 1) || a.useHeld?.('Ballad');
      const hits = [];
      for (let i = 0; i < 28; i++) {
        const m = r?.modals?.() ?? {};
        hits.push({ main: m.main ?? -1, chat: m.chat ?? -1, ok });
        if ((m.main ?? -1) === 15712) return { ...m, ok, hits: hits.slice(-6) };
        await new Promise(res => setTimeout(res, 250));
      }
      return { ...(r?.modals?.() ?? {}), ok, hits };
    });
    console.log('[jare] open', JSON.stringify(open));
    if (Number(open?.main) !== IF_ROOT) {
      if (shot) await shot('fail-no-ballad');
      fail(`expected leftover inter_327 main ${IF_ROOT}, got ${JSON.stringify(open)}`);
    }
    await waitTicks(page, 4);
    if (shot) await shot('pass-ballad');
    const next = await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const ok = !!a?.ifButton?.(15719);
      await new Promise(res => setTimeout(res, 400));
      return { ok, main: r?.modals?.()?.main ?? -1 };
    });
    console.log('[jare] next', JSON.stringify(next));
    await waitTicks(page, 3);
    if (shot) await shot('pass-ballad-page2');
    if (Number(next?.main) !== IF_ROOT) {
      fail(`next lost leftover ballad main, got ${JSON.stringify(next)}`);
    }
    console.log(`RESULT PASS jare inter_327 main=${open.main} next=${next.main} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
