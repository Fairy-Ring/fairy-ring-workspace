#!/usr/bin/env node
/**
 * Playwright smoke: TS web client against local isolated engine.
 *
 * Prerequisites:
 *   - Engine listening on WEB_PORT=81 (http://127.0.0.1:81/rs2.html)
 *   - Client deployed: bash scripts/deploy-client-ts.sh
 *   - Playwright: cd tools/client-smoke && npm install && npx playwright install chromium
 *
 * Usage:
 *   node scripts/smoke-client-ts.mjs
 *   SMOKE_URL=http://127.0.0.1:81/rs2.html node scripts/smoke-client-ts.mjs
 *   SMOKE_USER=bot SMOKE_PASS=bot node scripts/smoke-client-ts.mjs   # optional keyboard login
 *
 * Exit 0: no T1/T2, no uncaught pageerrors for settle window after load/login.
 * Exit 1: failures (with summary).
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SMOKE_PKG = path.join(ROOT, 'tools/client-smoke');

function loadPlaywright() {
  const require = createRequire(path.join(SMOKE_PKG, 'package.json'));
  try {
    return require('playwright');
  } catch {
    const requireRoot = createRequire(path.join(ROOT, 'package.json'));
    try {
      return requireRoot('playwright');
    } catch {
      console.error(
        'playwright not found. Install:\n' +
          '  cd tools/client-smoke && npm install && npx playwright install chromium'
      );
      process.exit(2);
    }
  }
}

const { chromium } = loadPlaywright();

const URL = process.env.SMOKE_URL || 'http://127.0.0.1:81/rs2.html';
const LOAD_TIMEOUT_MS = Number(process.env.SMOKE_LOAD_MS || 60_000);
const SETTLE_MS = Number(process.env.SMOKE_SETTLE_MS || 20_000);
const POST_LOAD_REPORT_MS = Number(process.env.SMOKE_REPORT_MS || 45_000);
const USER = process.env.SMOKE_USER || '';
const PASS = process.env.SMOKE_PASS || '';
const HEADLESS = process.env.SMOKE_HEADED !== '1';

/** @typedef {{ t: number, type: string, text: string }} LogEntry */

function ts() {
  return new Date().toISOString();
}

function interesting(text) {
  return /T1\b|T2\b|loaderror|Error|error|failed|Failed|exception|Exception|unhandled/i.test(
    text
  );
}

function isT1orT2(text) {
  return /\bT1\b|\bT2\b|T1\s*-|T2\s*-/.test(text);
}

function hasLoadError(text) {
  return /loaderror/i.test(text);
}

/**
 * Sample a few canvas pixels; return true if any non-near-black.
 * @param {import('playwright').Page} page
 */
async function canvasHasNonBlackPixels(page) {
  return page.evaluate(() => {
    const c = /** @type {HTMLCanvasElement|null} */ (document.getElementById('canvas'));
    if (!c) return { ok: false, reason: 'no-canvas' };
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { ok: false, reason: 'no-2d' };
    // Client may draw via WebGL or putImageData; try readback from 2d.
    // If canvas is tainted or empty, data may be all zeros.
    let data;
    try {
      data = ctx.getImageData(0, 0, c.width, c.height).data;
    } catch (e) {
      return { ok: false, reason: `getImageData: ${e}` };
    }
    let nonBlack = 0;
    let samples = 0;
    const step = 16;
    for (let y = 0; y < c.height; y += step) {
      for (let x = 0; x < c.width; x += step) {
        const i = (y * c.width + x) * 4;
        samples++;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a > 8 && (r > 8 || g > 8 || b > 8)) nonBlack++;
      }
    }
    return {
      ok: nonBlack > 0,
      nonBlack,
      samples,
      w: c.width,
      h: c.height,
      reason: nonBlack > 0 ? 'has-content' : 'all-near-black',
    };
  });
}

/**
 * Best-effort: client often draws with ImageData into 2d; if still black,
 * check that progress logs appeared or lastProgress via console.
 */
async function waitForPastLoading(page, logs, deadlineMs) {
  const start = Date.now();
  let lastStatus = 'waiting';
  while (Date.now() - start < deadlineMs) {
    // loaderror in console/pageerror
    const loadErr = logs.find((l) => hasLoadError(l.text));
    if (loadErr) {
      return { pastLoading: false, loaderror: loadErr.text, lastStatus };
    }

    // Progress-style logs (dev build keeps console.log "N%: message")
    const progressLogs = logs.filter((l) => /^\d+%:/.test(l.text.trim()));
    if (progressLogs.length) {
      lastStatus = progressLogs[progressLogs.length - 1].text;
      // Title / login UI often after "Starting game engine" / 100% / high %
      if (
        /100%|Starting game engine|Preparing game engine|Loading title screen|Please wait/i.test(
          lastStatus
        ) ||
        progressLogs.some((p) => parseInt(p.text, 10) >= 95)
      ) {
        // give a beat for title draw
        await page.waitForTimeout(1500);
        return { pastLoading: true, loaderror: null, lastStatus };
      }
    }

    const px = await canvasHasNonBlackPixels(page).catch((e) => ({
      ok: false,
      reason: String(e),
    }));
    if (px.ok) {
      return { pastLoading: true, loaderror: null, lastStatus: `canvas:${px.reason}`, pixels: px };
    }

    // DOM error pre from rs2.html catch
    const preText = await page
      .locator('pre')
      .first()
      .textContent({ timeout: 100 })
      .catch(() => null);
    if (preText && /error|fail|stack/i.test(preText)) {
      return { pastLoading: false, loaderror: preText.slice(0, 500), lastStatus: 'dom-pre' };
    }

    await page.waitForTimeout(500);
  }
  return { pastLoading: false, loaderror: null, lastStatus: 'timeout', timedOut: true };
}

/**
 * Canvas login UI is not DOM — optional keyboard login via Client-TS titleScreenLoop coords.
 *
 * Game logical size 765×503 (rs2.html #canvas). Clicks use canvas-local pixels.
 * From vendor/client-ts Client.titleScreenLoop:
 *   loginscreen 0 "Existing User": x=sWid/2+80, y=sHei/2+40  → (462, 291)
 *   loginscreen 2 "Login" button:  x=sWid/2-80, y=sHei/2+70  → (302, 321)
 * Enter/Tab only toggles loginSelect (user↔pass); they do **not** submit login.
 *
 * Limitations (documented for operators):
 *   - Requires title screen ready (past loading). No DOM inputs.
 *   - Engine auto-register only if WEBSITE_REGISTRATION=false; default is true.
 *   - Empty/unmigrated db.sqlite → login cannot create/load accounts.
 *   - Success is not proven by pixels alone; check engine player count / ingame flag.
 *
 * @param {import('playwright').Page} page
 */
async function tryKeyboardLogin(page) {
  if (!USER) return { attempted: false };
  const canvas = page.locator('#canvas');
  // Focus canvas (key events bind to canvas.onkeydown)
  await canvas.click({ position: { x: 382, y: 200 } });
  await page.waitForTimeout(250);
  // Existing User
  await canvas.click({ position: { x: 462, y: 291 } });
  await page.waitForTimeout(400);
  // Username field is default loginSelect=0 after Existing User
  for (const ch of USER) {
    await page.keyboard.type(ch, { delay: 35 });
  }
  await page.keyboard.press('Tab');
  await page.waitForTimeout(100);
  for (const ch of PASS) {
    await page.keyboard.type(ch, { delay: 35 });
  }
  await page.waitForTimeout(150);
  // Click Login (Enter only switches fields back to username)
  await canvas.click({ position: { x: 302, y: 321 } });
  return { attempted: true, user: USER, flow: 'existing-user→type→login-btn' };
}

async function main() {
  /** @type {LogEntry[]} */
  const logs = [];
  /** @type {LogEntry[]} */
  const pageErrors = [];
  const started = Date.now();

  console.log(`[smoke] ${ts()} URL=${URL} headless=${HEADLESS}`);
  console.log(`[smoke] load<=${LOAD_TIMEOUT_MS}ms settle=${SETTLE_MS}ms report=${POST_LOAD_REPORT_MS}ms`);

  // Preflight: engine reachable
  try {
    const res = await fetch(URL, { signal: AbortSignal.timeout(5000) });
    console.log(`[smoke] preflight GET ${URL} → ${res.status}`);
    if (!res.ok) {
      console.error(`[smoke] FAIL engine not serving rs2.html (status ${res.status})`);
      process.exit(1);
    }
  } catch (e) {
    console.error(`[smoke] FAIL cannot reach ${URL}: ${e.message || e}`);
    console.error('[smoke] Start engine: cd vendor/engine && npm start  (WEB_PORT=81)');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    viewport: { width: 900, height: 600 },
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    logs.push({ t: Date.now() - started, type, text });
    if (interesting(text) || type === 'error' || type === 'warning') {
      console.log(`[console.${type}] +${Date.now() - started}ms ${text}`);
    }
  });

  page.on('pageerror', (err) => {
    const text = err.stack || err.message || String(err);
    pageErrors.push({ t: Date.now() - started, type: 'pageerror', text });
    console.log(`[pageerror] +${Date.now() - started}ms ${text}`);
  });

  page.on('requestfailed', (req) => {
    const text = `${req.method()} ${req.url()} → ${req.failure()?.errorText || 'failed'}`;
    logs.push({ t: Date.now() - started, type: 'requestfailed', text });
    if (!/favicon/.test(req.url())) {
      console.log(`[requestfailed] +${Date.now() - started}ms ${text}`);
    }
  });

  let navError = null;
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  } catch (e) {
    navError = e;
    console.error(`[smoke] navigation error: ${e.message || e}`);
  }

  // Canvas must exist
  try {
    await page.waitForSelector('#canvas', { timeout: 15_000 });
    console.log('[smoke] #canvas present');
  } catch (e) {
    console.error('[smoke] FAIL #canvas not found');
    await browser.close();
    process.exit(1);
  }

  console.log(`[smoke] waiting up to ${LOAD_TIMEOUT_MS}ms for progress past loading…`);
  const loadResult = await waitForPastLoading(page, logs, LOAD_TIMEOUT_MS);
  console.log(
    `[smoke] load: pastLoading=${loadResult.pastLoading} status=${JSON.stringify(loadResult.lastStatus)}` +
      (loadResult.loaderror ? ` loaderror=${JSON.stringify(loadResult.loaderror)}` : '') +
      (loadResult.timedOut ? ' (timed out)' : '')
  );

  const login = await tryKeyboardLogin(page);
  if (login.attempted) {
    console.log(`[smoke] keyboard login attempted user=${login.user}`);
  } else {
    console.log('[smoke] no SMOKE_USER — skipping keyboard login; monitoring console only');
  }

  // After load (or login attempt): settle window for T1/T2 / uncaught
  const settleStart = Date.now();
  const monitorMs = login.attempted ? SETTLE_MS : Math.max(SETTLE_MS, POST_LOAD_REPORT_MS);
  console.log(`[smoke] settling ${monitorMs}ms (watching T1/T2 / pageerrors)…`);

  // Stay-ingame / stay-title estimate: sample canvas at settle start, mid, end
  const pixelSamples = [];
  const sampleAt = async (label) => {
    const px = await canvasHasNonBlackPixels(page).catch((e) => ({
      ok: false,
      reason: String(e),
    }));
    pixelSamples.push({ label, t: Date.now() - started, ...px });
    console.log(`[smoke] canvas pixels @${label}: ${JSON.stringify(px)}`);
    return px;
  };
  await sampleAt('settle-start');
  const midWait = Math.max(0, Math.floor(monitorMs / 2) - 50);
  await page.waitForTimeout(midWait);
  await sampleAt('settle-mid');
  await page.waitForTimeout(Math.max(0, monitorMs - midWait - 50));
  const pixels = await sampleAt('settle-end');

  await browser.close();

  // --- Summary ---
  const allTexts = [...logs, ...pageErrors];
  const t1t2 = allTexts.filter((l) => isT1orT2(l.text));
  const loaderrs = allTexts.filter((l) => hasLoadError(l.text));
  const consoleErrors = logs.filter(
    (l) => l.type === 'error' || (l.type === 'warning' && /error/i.test(l.text))
  );
  const interestingLogs = logs.filter((l) => interesting(l.text));

  console.log('\n========== SMOKE SUMMARY ==========');
  console.log(`URL:              ${URL}`);
  console.log(`Duration:         ${Date.now() - started}ms`);
  console.log(`pastLoading:      ${loadResult.pastLoading}`);
  console.log(`loaderror:        ${loadResult.loaderror || loaderrs[0]?.text || '(none)'}`);
  console.log(`loginAttempted:   ${!!login.attempted}${login.flow ? ` (${login.flow})` : ''}`);
  console.log(`canvasNonBlack:   ${pixels.ok} (${pixels.reason || ''})`);
  if (pixelSamples.length) {
    const stayNonBlack = pixelSamples.every((s) => s.ok);
    console.log(
      `stayNonBlack20s:  ${stayNonBlack} (samples: ${pixelSamples
        .map((s) => `${s.label}=${s.ok ? s.nonBlack + '/' + s.samples : s.reason}`)
        .join(', ')})`
    );
  }
  console.log(`pageerrors:       ${pageErrors.length}`);
  console.log(`T1/T2 hits:       ${t1t2.length}`);
  console.log(`console errors:   ${consoleErrors.length}`);
  console.log(`navError:         ${navError ? navError.message : '(none)'}`);

  if (interestingLogs.length) {
    console.log('\n--- interesting console (T1/T2/loaderror/Error) ---');
    for (const l of interestingLogs.slice(0, 80)) {
      console.log(`  +${l.t}ms [${l.type}] ${l.text.slice(0, 400)}`);
    }
  } else {
    console.log('\n--- interesting console: (none matched filters) ---');
    console.log(
      '  note: prod `bun run build` drops console.*; use build:dev deploy for progress/T1/T2 logs'
    );
  }

  if (pageErrors.length) {
    console.log('\n--- pageerrors ---');
    for (const e of pageErrors.slice(0, 20)) {
      console.log(`  +${e.t}ms ${e.text.slice(0, 600)}`);
    }
  }

  // Exit criteria (task):
  // 0 if no T1/T2 and no uncaught errors for settle window after login attempt
  // (we treat full run pageerrors as fail; loaderror fail; nav fail)
  const settleCutoff = settleStart - started;
  const latePageErrors = pageErrors.filter((e) => e.t >= settleCutoff);
  const lateT1T2 = t1t2.filter((e) => e.t >= settleCutoff);
  // Also fail on any T1/T2 any time (protocol death)
  const anyT1T2 = t1t2.length > 0;
  const anyUncaught = pageErrors.length > 0;
  const hardLoadFail = !!loadResult.loaderror || loaderrs.length > 0;

  let pass = true;
  const reasons = [];
  if (navError) {
    pass = false;
    reasons.push(`navigation: ${navError.message}`);
  }
  if (hardLoadFail) {
    pass = false;
    reasons.push(`loaderror: ${loadResult.loaderror || loaderrs[0]?.text}`);
  }
  if (anyT1T2) {
    pass = false;
    reasons.push(`T1/T2: ${t1t2.map((x) => x.text).join(' | ').slice(0, 300)}`);
  }
  if (anyUncaught) {
    pass = false;
    reasons.push(`pageerror count=${pageErrors.length} (settle=${latePageErrors.length})`);
  }
  // Soft signal only: never past loading within timeout — fail if we never left black/no progress
  if (!loadResult.pastLoading && !hardLoadFail) {
    pass = false;
    reasons.push(
      `did not get past loading within ${LOAD_TIMEOUT_MS}ms (status=${loadResult.lastStatus})`
    );
  }

  console.log(`\nRESULT: ${pass ? 'PASS' : 'FAIL'}`);
  if (reasons.length) {
    console.log('reasons:');
    for (const r of reasons) console.log(`  - ${r}`);
  }
  console.log('===================================\n');

  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error('[smoke] fatal', e);
  process.exit(1);
});
