#!/usr/bin/env node
/**
 * Exercise a few engine debug paths after login (content is thin — cheats only).
 *
 *   tele, give, ~home (debugproc), walkRel
 *
 *   node tools/harness/cheat-paths-smoke.mjs [user [pass]]
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
const { username, password } = resolveAccount(rest, 'cht');

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  page.on('pageerror', err => console.error('[pageerror]', err));

  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await boot(page);
  if (!(await login(page, username, password))) {
    fail(`login: ${await loginMes(page)}`);
  }
  console.log('[cheat-paths] logged in');

  // Engine ClientCheatHandler (staff≥2 tele, staff≥4 give) + ~ debugprocs
  const steps = [
    ['tele 0,50,50,22,22', 1200],
    ['give bronze_dagger 1', 800],
    ['~home', 1500], // content debugproc → Lumbridge
    ['give coins 100', 800]
  ];

  for (const [cmd, ms] of steps) {
    const sent = await cheatQuiet(page, cmd, ms);
    const tile = await worldTile(page);
    const ingame = await page.evaluate(() => globalThis.__lc377.ingame());
    console.log(
      `[cheat-paths] ${cmd} sent=${sent} ingame=${ingame} tile=${tile ? `${tile.x},${tile.z}` : '?'}`
    );
    if (!ingame) fail(`dropped after cheat: ${cmd}`);
  }

  const w = await walkRel(page, 0, 1);
  await page.waitForTimeout(1000);
  console.log(`[cheat-paths] walkRel(0,1)=${w}`);

  if (!(await page.evaluate(() => globalThis.__lc377.ingame()))) {
    fail('not ingame after walk');
  }

  console.log('RESULT: PASS');
  process.exit(0);
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await browser.close().catch(() => {});
}
