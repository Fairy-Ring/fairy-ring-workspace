/**
 * In-game MIDI swap evidence: tele Harmony → Garden and watch Client midi + saveMidi.
 *
 *   HARNESS_EPHEMERAL=1 HEADLESS=1 bun tools/harness/midi-ingame-swap-probe.mjs
 */
import {
  assertEnginePackHealth,
  boot,
  cheatQuiet,
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
const { username, password } = resolveAccount(rest, 'midiswap');

const LUMBY = { x: 3222, z: 3218, level: 0 }; // Harmony 76
const VARROCK = { x: 3213, z: 3424, level: 0 }; // Garden 125

async function midiSnap(page, tag) {
  const snap = await page.evaluate(() => {
    const c = globalThis.__lc377Client;
    if (!c) return { error: 'no __lc377Client' };
    return {
      midiSong: c.midiSong,
      nextMidiSong: c.nextMidiSong,
      nextMusicDelay: c.nextMusicDelay,
      midiActive: c.midiActive,
      midiFading: c.midiFading,
      lowMem: c.constructor?.lowMem,
      saveCalls: globalThis.__midiSaveLog?.slice() ?? null
    };
  });
  console.log(`[midi-ingame] ${tag}`, JSON.stringify(snap));
  return snap;
}

async function main() {
  await assertEnginePackHealth(base);
  process.env.HARNESS_EPHEMERAL = process.env.HARNESS_EPHEMERAL || '1';
  const browser = await launchBrowser();
  const page = await browser.newPage();
  page.on('console', msg => {
    const t = msg.text();
    if (/\[midi|play failed|loadNewSongList|saveMidi/i.test(t)) {
      console.log(`[page] ${t}`);
    }
  });
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);

  await page.evaluate(() => {
    const c = globalThis.__lc377Client;
    if (!c || c.__midiSaveWrapped) return;
    const log = [];
    globalThis.__midiSaveLog = log;
    const orig = c.saveMidi.bind(c);
    c.saveMidi = (data, fading) => {
      log.push({
        t: Date.now(),
        len: data?.length ?? 0,
        fading: !!fading,
        midiSong: c.midiSong,
        nextMidiSong: c.nextMidiSong
      });
      return orig(data, fading);
    };
    c.__midiSaveWrapped = true;
  });

  await midiSnap(page, 'title');
  await mainlandAccount(page, username, password);
  await waitSceneReady(page, 90_000);
  await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
  await waitTicks(page, 3);
  await midiSnap(page, 'after-login');

  if (!(await teleTo(page, LUMBY, 2, 25_000))) {
    console.log('[midi-ingame] tele lumby failed');
  }
  await waitSceneReady(page, 15_000);
  await waitTicks(page, 8);
  const lumby = await midiSnap(page, 'lumby-harmony');

  if (!(await teleTo(page, VARROCK, 2, 25_000))) {
    console.log('[midi-ingame] tele varrock failed');
  }
  await waitSceneReady(page, 15_000);
  await waitTicks(page, 2);
  const fade0 = await page.evaluate(() => globalThis.__lc377?.debugMidi?.() ?? { error: 'no debugMidi' });
  console.log('[midi-ingame] fade-immediate', JSON.stringify(fade0));
  await page.waitForTimeout(800);
  const fade800 = await page.evaluate(() => globalThis.__lc377?.debugMidi?.() ?? { error: 'no debugMidi' });
  console.log('[midi-ingame] fade+800ms', JSON.stringify(fade800));
  const varrock = await midiSnap(page, 'varrock-garden');

  const changed =
    lumby.nextMidiSong !== varrock.nextMidiSong || lumby.midiSong !== varrock.midiSong;
  const saves = varrock.saveCalls || [];
  const fadeRestored =
    fade800 &&
    fade800.error == null &&
    fade800.midivol >= 32 &&
    fade800.midiFadeVol >= 32 &&
    !fade800.midiFadingOut;
  console.log(
    `[midi-ingame] RESULT songIdsChanged=${changed} saveCalls=${saves.length} fadeRestored=${fadeRestored} last=${JSON.stringify(saves.slice(-4))}`
  );
  await browser.close();
  process.exit(changed && saves.length >= 2 && fadeRestored ? 0 : 2);
}

await main();
