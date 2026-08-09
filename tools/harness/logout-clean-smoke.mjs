import {
  boot,
  fail,
  launchBrowser,
  mainlandAccount,
  parseArgs,
  resolveAccount
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'lo');
const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  console.log(`[logout-clean] ${base} user=${username}`);
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await boot(page);
  const t0 = Date.now();
  await mainlandAccount(page, username, password);
  const ms = Date.now() - t0;
  console.log(`RESULT: PASS mainlandAccount clean-logout probe user=${username} ms=${ms}`);
} catch (e) {
  console.error(e);
  fail(String(e?.message || e));
} finally {
  await browser.close().catch(() => {});
}
