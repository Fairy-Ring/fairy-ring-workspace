#!/usr/bin/env node
/**
 * Read leftover inter_272 (goblin tribes) from lost_tribe_book.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-goblin-book-if-smoke.mjs
 *
 * Soft: give Goblin symbol book. Product opheld1 → if_openmain leftover inter_272.
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
const { username, password } = resolveAccount(rest, 'gbln');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3222, z: 3218, level: 0 };
const IF_ROOT = 13486;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[gbln] ${base} user=${username} (inter_272 ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`gbln_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await giveItems(page, [['lost_tribe_book', 1]]);
    if (!(await teleTo(page, STAND, 1, 25_000))) fail('tele Lumbridge stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);

    const inv = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.inventory?.() ?? []).map(x => x?.name)
    );
    console.log('[gbln] inv', inv);
    if (!inv.some(n => /goblin|symbol|book/i.test(String(n)))) {
      fail(`no Goblin symbol book in inv: ${JSON.stringify(inv)}`);
    }

    const open = await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a?.heldOp) return { error: 'no heldOp' };
      const ok =
        a.heldOp('Goblin symbol book', 1) ||
        a.heldOp('symbol book', 1) ||
        a.heldOp('Goblin', 1) ||
        a.useHeld?.('Goblin');
      const hits = [];
      for (let i = 0; i < 28; i++) {
        const m = r?.modals?.() ?? {};
        hits.push({ main: m.main ?? -1, chat: m.chat ?? -1, ok });
        if ((m.main ?? -1) === 13486) return { ...m, ok, hits: hits.slice(-6) };
        await new Promise(res => setTimeout(res, 250));
      }
      return { ...(r?.modals?.() ?? {}), ok, hits };
    });
    console.log('[gbln] open', JSON.stringify(open));
    if (Number(open?.main) !== IF_ROOT) {
      if (shot) await shot('fail-no-goblin-book');
      fail(`expected leftover inter_272 main ${IF_ROOT}, got ${JSON.stringify(open)}`);
    }
    await waitTicks(page, 4);
    if (shot) await shot('pass-goblin-book');
    console.log(`RESULT PASS gbln inter_272 main=${open.main} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
