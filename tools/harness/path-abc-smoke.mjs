#!/usr/bin/env node
/**
 * Path A→B→C step-1 smoke — **script host**, not cheat probes.
 *
 * Runs the in-browser `path-abc` TaskBot:
 *   A  Tutorial Island (shared stages with TutorialBot)
 *   B  Lumbridge castle + bank + walk
 *   C  Kill one Goblin (mainland combat wire)
 *
 *   node tools/harness/path-abc-smoke.mjs
 *   node tools/harness/path-abc-smoke.mjs --max-ms 1800000
 *   HEADLESS=1 node tools/harness/path-abc-smoke.mjs
 *
 * Same script via generic host:
 *   node tools/harness/script/run.mjs path-abc --max-ms 1800000
 *
 * Classifies final result:
 *   ok / done  — goblin kill landed (full A+B+C)
 *   timeout    — still mid-tutorial or stuck stage (content/harness iterate)
 *   client     — dropped / !ingame / pageerror
 *
 * @see docs/plans/2026-08-04-path-abc-script.md
 * @see docs/plans/2026-08-03-content-delta-sketch.md
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
  snapshot,
  waitSceneReady,
  worldTile,
  varp
} from './lib/harness.mjs';

const argv = process.argv.slice(2);
const { base, rest } = parseArgs(argv.filter(a => a !== '--max-ms'));
const maxMsIdx = argv.indexOf('--max-ms');
/** Default 30 min — full island + lumb + goblin. */
const maxMs = maxMsIdx >= 0 ? Number(argv[maxMsIdx + 1]) || 30 * 60_000 : 30 * 60_000;
const { username, password } = resolveAccount(
  rest.filter(r => r !== String(maxMs)),
  'pab'
);

const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';
const shotIntervalMs = Number(process.env.SHOT_INTERVAL_MS ?? 0);

const browser = await launchBrowser();
/** @type {import('playwright').Page | null} */
let page = null;
/** @type {string | null} */
let shotDir = null;
/** @type {((label: string) => Promise<string|null>) | null} */
let shot = null;

try {
  page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', err => {
    pageErrors.push(String(err.stack || err));
    console.error('[pageerror]', err);
  });
  page.on('console', msg => {
    const t = msg.text();
    if (/\[script|script-host|harness|nav|walk|T1|T2|error|phase=|path ok|door /i.test(t)) {
      console.log(`[browser.${msg.type()}] ${t.slice(0, 280)}`);
    }
  });

  console.log(`[path-abc] ${base} user=${username} maxMs=${maxMs} script=path-abc`);
  console.log('[path-abc] A tutorial → B Lumbridge → C goblin (TaskBot; no tele/give force-pass)');

  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);

  if (shotsEnabled) {
    shotDir = await createShotRunDir(`path-abc_${username}`);
    const bridge = await installScreenshotBridge(page, shotDir);
    shot = bridge.shot;
    await page.evaluate(
      () => {
        globalThis.__harnessShotPolicy = { autoStall: false, maxStallShots: 0 };
      }
    );
    console.log(`[path-abc] shots → ${shotDir}`);
  }

  if (!(await login(page, username, password))) {
    if (shot) await shot('login-failed');
    fail(`login failed: ${await loginMes(page)}`);
  }
  if (!(await waitSceneReady(page, 60_000))) {
    fail(`login ok but scene never reached 2: ${await loginMes(page)}`);
  }
  console.log('[path-abc] ready (ingame + scene 2) — starting path-abc script');
  if (shot) await shot('post-login');

  let tick = 0;
  let intervalId = null;
  if (shot && shotIntervalMs > 0) {
    intervalId = setInterval(() => {
      tick += 1;
      shot(`tick-${String(tick).padStart(3, '0')}`).catch(() => {});
    }, shotIntervalMs);
  }

  let result;
  try {
    result = await page.evaluate(
      async ({ name, ms }) => {
        const api = globalThis.__lc377?.scripts;
        if (!api?.start) {
          return { error: 'script host not registered — rebuild harness-client (bun tools/harness/build-client.mjs)' };
        }
        const list = api.list?.() ?? [];
        if (!list.includes(name)) {
          return { error: `script "${name}" not registered (have: ${list.join(',')})` };
        }
        const r = await api.start(name, ms);
        const rd = globalThis.__lc377.reader;
        return {
          result: r,
          tutorial: rd?.tutorial?.() ?? globalThis.__lc377.varp?.(281),
          tile: rd?.worldTile?.() ?? globalThis.__lc377.worldTile?.(),
          ingame: rd?.ingame?.() ?? globalThis.__lc377.ingame?.(),
          skills: {
            attack: rd?.stat?.(0)?.xp,
            strength: rd?.stat?.(2)?.xp,
            magic: rd?.stat?.(6)?.xp,
            cooking: rd?.stat?.(7)?.xp,
            firemaking: rd?.stat?.(11)?.xp,
            mining: rd?.stat?.(14)?.xp
          },
          inv: (rd?.inventory?.() ?? []).map(i => i?.name).filter(Boolean).slice(0, 16),
          snapshot: rd?.snapshot?.() ?? null
        };
      },
      { name: 'path-abc', ms: maxMs }
    );
  } finally {
    if (intervalId) clearInterval(intervalId);
  }

  console.log('[path-abc] finished', JSON.stringify(result, null, 2));
  if (shot) await shot(`end-${result?.result ?? 'unknown'}`);

  if (result?.error) {
    if (shot) await shot('error');
    fail(result.error);
  }
  if (!(await stillAlive(page))) {
    if (shot) await shot('dropped');
    fail('client dropped (!ingame) after path-abc');
  }
  if (pageErrors.length) {
    console.log('--- pageerrors ---');
    for (const e of pageErrors.slice(0, 5)) console.log(e);
    fail(`${pageErrors.length} pageerror(s) — client-classified`);
  }

  const tile = result?.tile ?? (await worldTile(page));
  const tut = result?.tutorial ?? (await varp(page, 281));
  const r = result?.result;

  console.log('\n========== PATH A/B/C SUMMARY ==========');
  console.log(`  script result: ${r}`);
  console.log(`  tile: ${tile ? `${tile.x},${tile.z}` : '?'}`);
  console.log(`  tutorial varp: ${tut}`);
  console.log(`  skills: ${JSON.stringify(result?.skills ?? {})}`);
  console.log(`  inv: ${(result?.inv ?? []).join(', ')}`);
  console.log('========================================\n');

  // done = goblin kill; ok = TaskBot returned ok (unusual); timeout = incomplete
  if (r === 'done' || r === 'ok') {
    console.log('RESULT: PASS (path-abc script complete — A tutorial + B lumb + C goblin)');
    process.exit(0);
  }
  if (r === 'timeout' || r === 'stopped') {
    // Still a useful content probe — not a client desync
    console.log(
      `RESULT: INCOMPLETE (${r}) — iterate tutorial/lumb/combat stages; client stayed up`
    );
    if (shot) await screenshotPage(page, shotDir, `incomplete-${r}`);
    process.exit(2);
  }
  fail(`unexpected script result: ${r}`);
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await browser.close().catch(() => {});
}
