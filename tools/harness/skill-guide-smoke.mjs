#!/usr/bin/env node
/**
 * Open skill guide from stats tab (Mining) after mainlandAccount.
 *   HEADED=1 node tools/harness/skill-guide-smoke.mjs
 * @see docs/plans/2026-08-04-platform-ux-inventory.md
 */
import {
  boot,
  createShotRunDir,
  fail,
  installScreenshotBridge,
  launchBrowser,
  mainlandAccount,
  parseArgs,
  resolveAccount
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'sg');

const browser = await launchBrowser();
let page = null;
try {
  page = await browser.newPage();
  page.on('console', msg => {
    const t = msg.text();
    if (/script|skill|guide|error|if_button/i.test(t)) console.log(`[browser.${msg.type()}] ${t.slice(0, 240)}`);
  });

  console.log(`[skill-guide] ${base} user=${username}`);
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  const shotDir = await createShotRunDir(`skill-guide_${username}`);
  const { shot } = await installScreenshotBridge(page, shotDir);

  await mainlandAccount(page, username, password);
  if (shot) await shot('mainland');

  // Pack IDs: stats:attack=8654, stats:mining=8656 → skill_guide main=18800
  // @see vendor/content/pack/interface.pack
  const open = await page.evaluate(async () => {
    const h = globalThis.__lc377;
    if (!h?.actions || !h?.reader) return { error: 'no abi' };
    h.actions.setSideTab?.(1);
    await new Promise(r => setTimeout(r, 400));
    const r = h.reader;
    const before = r.modals?.()?.main ?? -1;
    // Prefer mining then attack (core skills)
    for (const comId of [8656, 8654, 8658, 8660, 8662]) {
      h.actions.ifButton?.(comId);
      await new Promise(r => setTimeout(r, 700));
      const main = r.modals?.()?.main ?? -1;
      // skill_guide root is 18800
      if (main === 18800 || (main !== -1 && main !== before)) {
        return { ok: true, comId, main, skillGuide: main === 18800 };
      }
    }
    return {
      ok: false,
      main: r.modals?.()?.main ?? -1,
      side: r.sideTabInterface?.(1),
      active: r.activeSideTab?.()
    };
  });

  console.log('[skill-guide] open attempt', JSON.stringify(open));
  if (shot) await shot(open.ok ? 'guide-open' : 'fail');

  if (!open.ok) {
    fail(`skill guide did not open: ${JSON.stringify(open)}`);
  }
  console.log('RESULT: PASS (skill guide main modal opened)');
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await browser.close().catch(() => {});
}
