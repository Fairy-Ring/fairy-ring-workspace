/**
 * Click music LOOP (music:loop = 9925) and expect the enable mes.
 *
 *   HARNESS_EPHEMERAL=1 HEADLESS=1 bun tools/harness/midi-loop-if-probe.mjs
 */
import {
  assertEnginePackHealth,
  boot,
  launchBrowser,
  mainlandAccount,
  parseArgs,
  resolveAccount,
  setWorldSpeed,
  waitSceneReady,
  waitTicks
} from './lib/harness.mjs';

const LOOP_COM = 9925; // music:loop
const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'midiloop');

const browser = await launchBrowser();
const page = await browser.newPage();
await assertEnginePackHealth(base);
await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await boot(page);
await mainlandAccount(page, username, password);
await waitSceneReady(page, 90_000);
await setWorldSpeed(page, 300).catch(() => {});
await waitTicks(page, 3);

const r = await page.evaluate(com => {
  const a = globalThis.__lc377?.actions;
  if (!a?.ifButton) return { error: 'no ifButton' };
  return { ok: !!a.ifButton(com) };
}, LOOP_COM);
await waitTicks(page, 3);
const chat = await page.evaluate(() => {
  const r = globalThis.__lc377?.reader;
  try {
    return (r.chat?.(12) ?? []).map(l => (typeof l === 'string' ? l : l?.text));
  } catch (e) {
    return { err: String(e) };
  }
});
console.log('[midi-loop] ifButton', JSON.stringify(r));
console.log('[midi-loop] chat', JSON.stringify(chat));
const blob = JSON.stringify({ r, chat });
const pass = /looping now enabled/i.test(blob);
await browser.close();
process.exit(pass ? 0 : 2);
