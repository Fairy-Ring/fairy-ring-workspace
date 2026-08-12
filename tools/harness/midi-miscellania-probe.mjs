/**
 * Prove Miscellania mapzone sends MIDI_SONG (not leftover Lumbridge Harmony).
 *
 *   HARNESS_EPHEMERAL=1 WORLD_SPEED_MS=300 bun tools/harness/midi-miscellania-probe.mjs
 *
 * Expect: Lumbridge Harmony 76 → Miscellania 284 (midi.pack).
 * Server: [mapzone,0_39_60] @music_playbyregion → musicregion_39_60 → music_Miscellania.
 */
import {
  assertEnginePackHealth,
  boot,
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
const { username, password } = resolveAccount(rest, 'midimisc');

const LUMBY = { x: 3222, z: 3218, level: 0 }; // Harmony 76
const MISC = { x: 2524, z: 3851, level: 0 }; // labour stand, mapsquare 0_39_60
const HARMONY = 76;
const MISCELLANIA = 284;

async function midiSnap(page, tag) {
  const snap = await page.evaluate(() => {
    const c = globalThis.__lc377Client;
    if (!c) return { error: 'no __lc377Client' };
    return {
      midiSong: c.midiSong,
      nextMidiSong: c.nextMidiSong,
      midiActive: c.midiActive,
      midiFading: c.midiFading,
      saveCalls: globalThis.__midiSaveLog?.slice() ?? null
    };
  });
  console.log(`[midi-misc] ${tag}`, JSON.stringify(snap));
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

  await mainlandAccount(page, username, password);
  await waitSceneReady(page, 90_000);
  await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
  await waitTicks(page, 3);

  if (!(await teleTo(page, LUMBY, 2, 25_000))) {
    console.log('[midi-misc] tele lumby failed');
  }
  await waitSceneReady(page, 15_000);
  await waitTicks(page, 8);
  const lumby = await midiSnap(page, 'lumby-harmony');

  if (!(await teleTo(page, MISC, 2, 25_000))) {
    console.log('[midi-misc] tele miscellania failed');
  }
  await waitSceneReady(page, 15_000);
  await waitTicks(page, 8);
  const misc = await midiSnap(page, 'misc-miscellania');

  const lumbyId = lumby.nextMidiSong ?? lumby.midiSong;
  const miscId = misc.nextMidiSong ?? misc.midiSong;
  const changed = lumbyId !== miscId;
  const gotMisc = miscId === MISCELLANIA;
  console.log(
    `[midi-misc] RESULT lumby=${lumbyId} (want ${HARMONY}) misc=${miscId} (want ${MISCELLANIA}) changed=${changed} gotMisc=${gotMisc}`
  );
  await browser.close();
  process.exit(changed && gotMisc ? 0 : 2);
}

await main();
