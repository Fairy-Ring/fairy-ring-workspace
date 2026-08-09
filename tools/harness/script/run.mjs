#!/usr/bin/env node
/**
 * Playwright host for in-browser harness scripts (rapid iteration).
 *
 * Default is **headed** (visible browser). Use HEADLESS=1 only for CI/batch.
 *
 *   node tools/harness/script/run.mjs tutorial
 *   node tools/harness/script/run.mjs tutorial --max-ms 600000
 *   HEADLESS=1 node tools/harness/script/run.mjs tutorial
 *
 * Screenshots: docs/plans/harness-shots/<runId>/
 *   SHOTS=0              disable bridge entirely
 *   SHOT_INTERVAL_MS=N   Node tick-* shots (default 20000; **0=off**)
 *   STALL_SHOTS=1        one in-page stall-* shot after ~5s on same stage
 *                        (default **off** — page.screenshot artifacts WebGL canvas)
 *
 * Note: SHOT_INTERVAL_MS=0 alone used to leave stall auto-shots on; those are
 * now off unless STALL_SHOTS=1. Manual panel Shot / harnessShot() still work
 * when SHOTS is not 0.
 *
 * In-page: await globalThis.__harnessShot('label')
 * Scripts: harnessShot('label') from api.ts
 *
 * Does not embed a full bot client — scripts run inside harness-client.js
 * against reader/actions (rs2b0t adapter pattern).
 */
import {
  boot,
  createShotRunDir,
  fail,
  installScreenshotBridge,
  launchBrowser,
  login,
  loginMes,
  parseArgs,
  resolveAccount,
  screenshotPage,
  stillAlive,
  waitSceneReady
} from '../lib/harness.mjs';

const argv = process.argv.slice(2);
const scriptName = argv.find(a => !a.startsWith('-') && !a.includes('://') && a !== '--base') ?? 'tutorial';
const { base, rest } = parseArgs(argv.filter(a => a !== scriptName && a !== '--max-ms'));
const maxMsIdx = argv.indexOf('--max-ms');
const maxMs = maxMsIdx >= 0 ? Number(argv[maxMsIdx + 1]) || 25 * 60_000 : 25 * 60_000;
const { username, password } = resolveAccount(
  rest.filter(r => r !== String(maxMs)),
  scriptName.slice(0, 3)
);

const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';
const shotIntervalMs = Number(process.env.SHOT_INTERVAL_MS ?? 20_000);
/** Stall auto-shots artifact the canvas — opt-in only (not tied to interval). */
const stallShots =
  process.env.STALL_SHOTS === '1' ||
  process.env.STALL_SHOTS === 'true' ||
  process.env.STALL_SHOTS === 'yes';
const maxStallShots = Math.max(0, Number(process.env.STALL_SHOT_MAX ?? 1) || 0);

const browser = await launchBrowser();
/** @type {import('playwright').Page | null} */
let page = null;
/** @type {string | null} */
let shotDir = null;
/** @type {((label: string) => Promise<string|null>) | null} */
let shot = null;

try {
  page = await browser.newPage();
  page.on('console', msg => {
    const t = msg.text();
    if (/\[script|script-host|harness|nav|walk|T1|T2|error|path ok|door /i.test(t)) {
      console.log(`[browser.${msg.type()}] ${t.slice(0, 240)}`);
    }
  });
  page.on('pageerror', e => console.error('[pageerror]', e));

  console.log(`[run] ${base} script=${scriptName} user=${username} maxMs=${maxMs}`);
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);

  if (shotsEnabled) {
    shotDir = await createShotRunDir(`${scriptName}_${username}`);
    const bridge = await installScreenshotBridge(page, shotDir);
    shot = bridge.shot;
    // In-page TaskBot reads this — default autoStall false (no stall spam / canvas dig)
    await page.evaluate(
      policy => {
        globalThis.__harnessShotPolicy = policy;
      },
      { autoStall: stallShots, maxStallShots }
    );
    console.log(
      `[run] shots → ${shotDir} (interval=${shotIntervalMs}ms stall=${stallShots ? maxStallShots : 0}; SHOTS=0 off, STALL_SHOTS=1 for one stall shot)`
    );
  }

  if (!(await login(page, username, password))) {
    if (shot) await shot('login-failed');
    fail(`login failed: ${await loginMes(page)}`);
  }
  // login() already waits ingame+sceneState=2; still re-assert before bot start
  if (!(await waitSceneReady(page, 60_000))) {
    fail(`login ok but scene never reached 2: ${await loginMes(page)}`);
  }
  console.log('[run] ready (ingame + scene 2) — starting script in page');
  if (shot) await shot('post-login');

  // Periodic shots while the long in-page script runs (failure-state capture)
  let tick = 0;
  let intervalId = null;
  if (shot && shotIntervalMs > 0) {
    intervalId = setInterval(() => {
      tick += 1;
      // fire-and-forget; don't stack if slow
      shot(`tick-${String(tick).padStart(3, '0')}`).catch(() => {});
    }, shotIntervalMs);
  }

  let result;
  try {
    result = await page.evaluate(
      async ({ name, ms }) => {
        const api = globalThis.__lc377?.scripts;
        if (!api?.start) {
          return { error: 'script host not registered — rebuild harness-client' };
        }
        const r = await api.start(name, ms);
        const rd = globalThis.__lc377.reader;
        return {
          result: r,
          tutorial: rd?.tutorial?.() ?? globalThis.__lc377.varp?.(281),
          tile: rd?.worldTile?.() ?? globalThis.__lc377.worldTile?.(),
          ingame: rd?.ingame?.() ?? globalThis.__lc377.ingame?.(),
          snapshot: rd?.snapshot?.() ?? globalThis.__lc377.snapshot?.() ?? null
        };
      },
      { name: scriptName, ms: maxMs }
    );
  } finally {
    if (intervalId) clearInterval(intervalId);
  }

  console.log('[run] finished', JSON.stringify(result, null, 2));
  if (shot) {
    await shot(`end-${result?.result ?? 'unknown'}`);
    if (result?.error) await shot('error');
  }

  if (result.error) fail(result.error);
  if (!(await stillAlive(page))) {
    if (shot) await shot('not-ingame');
    fail('not ingame after script');
  }

  // Tutorial: stages are state-driven (inv/skills/tile), not tut varp alone
  if (scriptName === 'tutorial') {
    const snap = result.snapshot ?? {};
    const tut = result.tutorial ?? snap.tutorial ?? -1;
    const x = result.tile?.x ?? snap.tile?.x ?? 0;
    const cook = snap.skills?.cooking ?? result.cookXp ?? -1;
    const fm = snap.skills?.firemaking ?? result.fmXp ?? -1;
    console.log(`[run] state cookXp=${cook} fmXp=${fm} tile.x=${x} tutVarp=${tut} (varp diagnostic only)`);
    if (x >= 3200 || result.result === 'done') {
      console.log('[run] tutorial milestone / mainland / done()');
    } else {
      console.log('[run] WARN incomplete — iterate stages (content or adapter gaps)');
      if (shot) await shot('incomplete');
    }
  }

  if (shotDir) console.log(`[run] shots saved under ${shotDir}`);
  console.log('RESULT: PASS');
  process.exit(0);
} catch (e) {
  console.error(e);
  if (page && shotDir) {
    await screenshotPage(page, shotDir, 'exception').catch(() => {});
  }
  process.exit(1);
} finally {
  await browser.close().catch(() => {});
}
