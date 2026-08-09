#!/usr/bin/env node
/**
 * Nav executor smoke: Timfraku hut L1 → Tiadeche shore (ladder Climb-down + wooden log Balance/Cross).
 * Does **not** run TBWT dialogue — pure Traversal.walkTo after tele.
 *
 *   HEADED=1 node tools/harness/nav-hop-smoke.mjs
 *
 * @see docs/plans/2026-08-04-nav-full-executor-port.md
 */
import {
  boot,
  createShotRunDir,
  fail,
  fillRunEnergy,
  installScreenshotBridge,
  launchBrowser,
  mainlandAccount,
  parseArgs,
  resolveAccount,
  teleTo
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'navh');

const TIMFRAKU = { x: 2780, z: 3087, level: 1 };
const TIADECHE = { x: 2912, z: 3118, level: 0 };

const browser = await launchBrowser();
let page = null;
try {
  page = await browser.newPage();
  page.on('console', msg => {
    const t = msg.text();
    if (/\[script|nav|walk|path|transport|Climb|Balance|Cross|error|arrived|giving/i.test(t)) {
      console.log(`[browser.${msg.type()}] ${t.slice(0, 320)}`);
    }
  });

  console.log(`[nav-hop] ${base} user=${username}`);
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);

  const shotDir = await createShotRunDir(`nav-hop_${username}`);
  const { shot } = await installScreenshotBridge(page, shotDir);
  console.log(`[nav-hop] shots → ${shotDir}`);

  await mainlandAccount(page, username, password);
  await fillRunEnergy(page).catch(() => {});

  console.log(`[nav-hop] tele Timfraku L1 ${JSON.stringify(TIMFRAKU)}`);
  if (!(await teleTo(page, TIMFRAKU, 12, 45_000))) {
    fail('tele Timfraku failed');
  }
  await page.waitForTimeout(1500);
  if (shot) await shot('at-timfraku-L1');

  console.log('[nav-hop] Traversal.walkTo Tiadeche shore (ladder + log)');
  const result = await page.evaluate(
    async ([dest, ms]) => {
      const nav = globalThis.__lc377Nav;
      if (!nav?.walkTo) return { error: 'nav.walkTo missing' };
      try {
        const ok = await nav.walkTo(dest, {
          radius: 8,
          timeoutMs: ms,
          log: m => console.log(`[script] ${m}`)
        });
        const tile = globalThis.__lc377?.worldTile?.() ?? null;
        return { ok, tile };
      } catch (e) {
        return { error: String(e?.stack || e) };
      }
    },
    [TIADECHE, 240_000]
  );

  console.log('[nav-hop] result', JSON.stringify(result, null, 2));
  if (shot) await shot(result.ok ? 'at-tiadeche' : 'fail');

  if (result.error) fail(result.error);
  if (!result.ok) fail(`walkTo Tiadeche failed tile=${JSON.stringify(result.tile)}`);

  const t = result.tile;
  const d = Math.max(Math.abs((t?.x ?? 0) - TIADECHE.x), Math.abs((t?.z ?? 0) - TIADECHE.z));
  if ((t?.level ?? 0) !== 0 || d > 10) {
    fail(`arrived wrong place tile=${JSON.stringify(t)} (want ~${TIADECHE.x},${TIADECHE.z} L0)`);
  }

  console.log('RESULT: PASS (Timfraku L1 → Tiadeche shore via full WalkExecutor)');
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await browser.close().catch(() => {});
}
