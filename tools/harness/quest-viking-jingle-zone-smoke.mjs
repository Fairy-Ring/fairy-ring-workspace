#!/usr/bin/env node
/**
 * After Brundt complete jingle, zone MIDI_SONG must resume (Java 377).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-viking-jingle-zone-smoke.mjs
 *
 * Soft: viking 8. Product: Talk Brundt → jingle → wait nextMusicDelay → Rellekka.
 * Client cycle is 20ms — do not poll faster than that.
 *
 * @see docs/research/midi-jingle-then-zone-377.md
 */
import {
  assertEnginePackHealth,
  boot,
  cheatQuiet,
  createShotRunDir,
  fail,
  getServerVarQuiet,
  installScreenshotBridge,
  launchBrowser,
  mainlandAccount,
  parseArgs,
  resolveAccount,
  setWorldSpeed,
  teleTo,
  waitSceneReady,
  waitTicks,
  wipeInvAndWorn
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'vikjz');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2658, z: 3669, level: 0 };
const QUEST_SCROLL = 12140;
/** midi.pack 289=rellekka */
const RELLEKKA = 289;
/** midi.pack 238–240 = quest complete 1–3 */
const JINGLES = new Set([238, 239, 240]);

async function talkNpc(page, npcName, prefer = [], iters = 72) {
  return page.evaluate(
    async ([name, pref, maxI]) => {
      const h = globalThis.__lc377;
      const a = h?.actions;
      const r = h?.reader;
      if (!a || !r) return { error: 'no abi' };
      const getOpts = () => {
        try {
          return (r.chatOptions?.() ?? [])
            .map(o => (typeof o === 'string' ? o : o?.text))
            .filter(Boolean);
        } catch {
          return [];
        }
      };
      let ok = !!a.talkNpc?.(name);
      if (!ok) {
        const n = (r.npcs?.() ?? []).find(x =>
          String(x?.name ?? '')
            .toLowerCase()
            .includes(String(name).toLowerCase())
        );
        if (n) ok = !!a.npcOp?.(n.index, 1);
      }
      await new Promise(res => setTimeout(res, 1200));
      for (let i = 0; i < maxI; i++) {
        const opts = getOpts();
        if (opts.length) {
          const low = opts.map(o => String(o).toLowerCase());
          let pick = 0;
          for (const p of pref) {
            const j = low.findIndex(o => o.includes(String(p).toLowerCase()));
            if (j >= 0) {
              pick = j;
              break;
            }
          }
          a.chooseOption?.([opts[pick]]);
        } else {
          a.continueDialog?.();
          a.dismissModalMessage?.();
        }
        await new Promise(res => setTimeout(res, 320));
        if ((r.modals?.()?.chat ?? -1) === -1 && i > 10) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(24).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null };
    },
    [npcName, prefer, iters]
  );
}

async function continueThrash(page, iters = 16, ms = 260) {
  await page.evaluate(
    async ([n, d]) => {
      const a = globalThis.__lc377?.actions;
      for (let i = 0; i < n; i++) {
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
        await new Promise(r => setTimeout(r, d));
      }
    },
    [iters, ms]
  );
}

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
      saveCalls: (globalThis.__midiSaveLog ?? []).length
    };
  });
  console.log(`[vik-jz] ${tag}`, JSON.stringify(snap));
  return snap;
}

async function wrapSaveMidi(page) {
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
        nextMidiSong: c.nextMidiSong,
        nextMusicDelay: c.nextMusicDelay
      });
      return orig(data, fading);
    };
    c.__midiSaveWrapped = true;
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[vik-jz] ${base} user=${username} (jingle then zone; headed default)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  page.on('console', msg => {
    const t = msg.text();
    if (/\[midi|play failed|saveMidi/i.test(t)) console.log(`[page] ${t}`);
  });
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  await wrapSaveMidi(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`vik-jz_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await wipeInvAndWorn(page, 'vik-jz prep');
    await cheatQuiet(page, 'setvar viking_bits 0', 300);
    await cheatQuiet(page, 'setvar viking 8', 400);
    await waitTicks(page, 2);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Brundt failed');
    await waitSceneReady(page, 15_000);
    let before = null;
    for (let i = 0; i < 20; i++) {
      await waitTicks(page, 2);
      before = await midiSnap(page, `pre-talk ${i}`);
      if ((before.nextMidiSong | 0) > 0) break;
    }
    if ((before?.nextMidiSong | 0) <= 0) {
      fail(`no zone MIDI_SONG before talk nextMidiSong=${before?.nextMidiSong} (steal/resync?)`);
    }
    const zoneWant = before.nextMidiSong | 0;
    console.log(`[vik-jz] zoneWant=${zoneWant} (rellekka pack ${RELLEKKA})`);

    const talk = await talkNpc(page, 'Brundt', ['becoming a fremennik', 'hello'], 80);
    console.log('[vik-jz] talk', JSON.stringify(talk));
    if (talk?.noTrig) fail(talk.noTrig);
    await continueThrash(page, 16, 260);

    let scrollMain = -1;
    let midAfter = null;
    for (let i = 0; i < 20; i++) {
      await continueThrash(page, 3, 200);
      await page.waitForTimeout(200);
      const mods = await page.evaluate(() => globalThis.__lc377?.reader?.modals?.() ?? {});
      scrollMain = Number(mods.main ?? -1);
      midAfter = await midiSnap(page, `post-complete ${i}`);
      if (scrollMain === QUEST_SCROLL && (midAfter.nextMusicDelay | 0) > 0) break;
      if ((midAfter.nextMusicDelay | 0) > 0 && JINGLES.has(midAfter.midiSong | 0)) break;
    }
    if (shot) await shot('after-jingle-start');
    console.log(`[vik-jz] after complete scroll=${scrollMain} midi=${JSON.stringify(midAfter)}`);

    if ((midAfter?.nextMusicDelay | 0) <= 0) {
      fail(
        `JINGLE FAIL nextMusicDelay=${midAfter?.nextMusicDelay} midiSong=${midAfter?.midiSong} ` +
          `(want delay>0 and jingle 238–240)`
      );
    }
    if (!JINGLES.has(midAfter.midiSong | 0)) {
      console.warn(`[vik-jz] midiSong=${midAfter.midiSong} not in ${[...JINGLES]} — still waiting delay`);
    }

    // Client cycle 20ms — poll 400ms. Quest complete delay is 8–12s.
    const t0 = Date.now();
    let midWait = midAfter;
    while (Date.now() - t0 < 16_000) {
      await page.waitForTimeout(400);
      midWait = await midiSnap(page, `wait ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      if ((midWait.nextMusicDelay | 0) === 0) break;
    }
    // fade + onDemand after timer hits 0
    await page.waitForTimeout(2000);
    const after = await midiSnap(page, 'after-delay');
    if (shot) await shot('after-zone-resume');

    const viking = Number(await getServerVarQuiet(page, 'viking'));
    const resumed =
      (after.midiSong | 0) === zoneWant ||
      ((after.nextMidiSong | 0) === zoneWant && (after.nextMusicDelay | 0) === 0);
    console.log(
      `[vik-jz] end viking=${viking} zoneWant=${zoneWant} resumed=${resumed} ` +
        `after=${JSON.stringify(after)}`
    );

    if (viking < 10) fail(`product complete miss viking=${viking}`);
    if (!resumed) {
      fail(
        `ZONE FAIL after jingle midiSong=${after.midiSong} nextMidiSong=${after.nextMidiSong} ` +
          `delay=${after.nextMusicDelay} want zone=${zoneWant} (rellekka ${RELLEKKA})`
      );
    }
    console.log(
      `RESULT PASS vik-jz viking=${viking} jingleDelay=${midAfter.nextMusicDelay} ` +
        `zone ${zoneWant} resumed (SOFT 8; product Brundt + MIDI_JINGLE then MIDI_SONG)`
    );
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
