#!/usr/bin/env node
/**
 * Horror unfinished-book Check (31 Jan 2005).
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-hftd-check \
 *     node tools/harness/quest-horror-check-smoke.mjs
 *
 * Soft give damaged book + setvar holypage 1 and 3. Check reports 1+3 not 2/4.
 */
import {
  assertEnginePackHealth,
  boot,
  cheatQuiet,
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
const { username, password } = resolveAccount(rest, 'hfchk');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2509, z: 3635, level: 0 };

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[hfchk] ${base} user=${username} (Check unfinished book)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`hfchk_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele lighthouse failed');
    await waitSceneReady(page, 15_000);
    await giveItems(page, [['unfinished_saradominbook', 1]]);
    await cheatQuiet(page, 'setvar horror_holypage1 1', 300);
    await cheatQuiet(page, 'setvar horror_holypage3 1', 300);
    await waitTicks(page, 4);
    if (shot) await shot('01-inv');

    const chk = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const ok = !!(
        a?.heldOp?.('Damaged book', 3) ||
        a?.heldOp?.('damaged book', 3) ||
        a?.heldOp?.('unfinished_saradominbook', 3)
      );
      return { ok };
    });
    console.log('[hfchk] check', JSON.stringify(chk));
    if (!chk?.ok) fail(`Check op failed ${JSON.stringify(chk)}`);
    await waitTicks(page, 6);
    if (shot) await shot('02-check');
    const chat = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.chat?.(20) ?? []).map(c => String(c?.text ?? c ?? ''))
    );
    const text = chat.join(' | ');
    console.log('[hfchk] chat', text);
    if (!/torn page 1/i.test(text)) fail(`page 1 missing: ${text}`);
    if (!/torn page 3/i.test(text)) fail(`page 3 missing: ${text}`);
    if (/torn page 2/i.test(text)) fail(`page 2 should be absent: ${text}`);
    if (/torn page 4/i.test(text)) fail(`page 4 should be absent: ${text}`);
    if (/preach|bless|special energy/i.test(text)) fail(`Preach leaked: ${text}`);

    console.log(`RESULT PASS hfchk check pages=1,3 user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
