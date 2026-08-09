#!/usr/bin/env node
/**
 * Thin bang-on smoke: login → cheat tele → tryMove walk → stay ingame.
 *
 * Does not modify Client-TS. Uses deploy-shell harness attach only.
 *
 *   node tools/harness/login-walk-smoke.mjs
 *   HEADED=1 node tools/harness/login-walk-smoke.mjs
 *   node tools/harness/login-walk-smoke.mjs --base 'http://127.0.0.1:81/rs2.html?harness=1' test test
 */
import {
  boot,
  cheatQuiet,
  fail,
  launchBrowser,
  login,
  loginMes,
  parseArgs,
  resolveAccount,
  walkRel,
  worldTile
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
// Default: fresh user each run (rs2b0t e2e-smoke). Pass user/pass to pin.
const { username, password } = resolveAccount(rest, 'lw');

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(String(err.stack || err)));

  console.log(`[login-walk] ${base} user=${username}`);
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30_000 });

  try {
    await boot(page);
  } catch (e) {
    fail(
      `boot failed (need ?harness=1, attach deployed, build:dev): ${e.message || e}`
    );
  }
  console.log('[login-walk] harness ABI up');

  if (!(await login(page, username, password))) {
    fail(`login did not reach ingame (server: '${await loginMes(page)}')`);
  }
  console.log('[login-walk] ingame sceneState=2');

  const before = await worldTile(page);
  if (!before) fail('worldTile null after login');
  console.log(`[login-walk] tile ${before.x},${before.z} local ${before.lx},${before.lz}`);

  // Engine cheats (staff 4 on local non-prod): position for walk path
  await cheatQuiet(page, 'tele 0,50,50,22,22', 1500);
  const mid = await worldTile(page);
  const midScene = await page.evaluate(() => globalThis.__lc377.sceneState());
  console.log(
    `[login-walk] after tele ${mid ? `${mid.x},${mid.z}` : 'null'} sceneState=${midScene}`
  );

  // REBUILD after tele often leaves sceneState=1 while ondemand loads; wait a bit but don't require 2
  try {
    await page.waitForFunction(() => globalThis.__lc377.sceneState() === 2, undefined, {
      timeout: 15_000
    });
    console.log('[login-walk] scene back to 2 after tele');
  } catch {
    console.log('[login-walk] warn: scene still loading after tele (ondemand); continuing if ingame');
  }

  if (!(await page.evaluate(() => globalThis.__lc377.ingame()))) {
    fail('not ingame after tele');
  }

  const beforeWalk = await worldTile(page);
  // Client tryMove (+1 local east) — exercises MOVE_* alt encoding
  const walked = await walkRel(page, 1, 0);
  console.log(`[login-walk] walkRel(1,0)=${walked}`);
  await page.waitForTimeout(1500);

  // Connection-lost bar is !ingame. sceneState may stay 1 while maps load after tele.
  if (!(await page.evaluate(() => globalThis.__lc377.ingame()))) {
    fail('not ingame after walk (connection lost?)');
  }

  const after = await worldTile(page);
  console.log(`[login-walk] tile after ${after ? `${after.x},${after.z}` : 'null'}`);
  if (beforeWalk && after && beforeWalk.x === after.x && beforeWalk.z === after.z && walked) {
    console.log('[login-walk] warn: tile unchanged after walkRel (path may have failed silently)');
  } else if (beforeWalk && after && (beforeWalk.x !== after.x || beforeWalk.z !== after.z)) {
    console.log('[login-walk] tile moved — MOVE path ok');
  }

  if (pageErrors.length) {
    console.log(pageErrors.slice(0, 5).join('\n'));
    fail(`pageerrors=${pageErrors.length}`);
  }

  console.log('RESULT: PASS');
  process.exit(0);
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await browser.close().catch(() => {});
}
