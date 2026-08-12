/**
 * Headed probe: Spessa play() twice with the same stop + loadNewSongList
 * wait as vendor/client-ts/src/sound/backends/spessaBackend.ts.
 *
 * Usage (engine :81 not required):
 *   HARNESS_EPHEMERAL=1 HEADLESS=1 bun tools/harness/midi-swap-probe.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './lib/harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CLIENT = path.join(ROOT, 'vendor/client-ts/node_modules');
const SONGS = path.join(ROOT, 'vendor/content/songs');
const SF2 = path.join(ROOT, 'vendor/engine/public/client/SCC1_Florestan.sf2');
const PROC = path.join(CLIENT, 'spessasynth_lib/dist/spessasynth_processor.min.js');

const SONG_A = path.join(SONGS, 'scape main.mid');
const SONG_B = path.join(SONGS, 'harmony.mid');

function mime(p) {
  if (p.endsWith('.js')) return 'application/javascript';
  if (p.endsWith('.mid')) return 'audio/midi';
  if (p.endsWith('.sf2')) return 'application/octet-stream';
  if (p.endsWith('.html')) return 'text/html';
  return 'application/octet-stream';
}

const HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>midi-swap-probe</title></head>
<body>
<pre id="out">starting…</pre>
<script type="importmap">
{
  "imports": {
    "spessasynth_lib": "/nm/spessasynth_lib/dist/index.js",
    "spessasynth_core": "/nm/spessasynth_core/dist/index.js",
    "stb-vorbis": "/nm/stb-vorbis/dist/index.js"
  }
}
</script>
<script type="module">
import { WorkletSynthesizer, Sequencer } from 'spessasynth_lib';

const log = [];
const out = document.getElementById('out');
function line(s) {
  log.push(s);
  out.textContent = log.join('\\n');
  console.info('[probe]', s);
}
window.__probeLog = log;

function copyToArrayBuffer(data) {
  if (data instanceof ArrayBuffer) return data.slice(0);
  return data.slice().buffer;
}

async function playLikeBackend(seq, synth, smf, loop, label) {
  const events = [];
  const t0 = performance.now();
  try {
    seq.pause();
  } catch (e) {
    events.push('stop-err ' + e);
  }
  try { synth.stopAll(true); } catch { /* */ }

  const ab = copyToArrayBuffer(smf);
  await new Promise((resolve, reject) => {
    const tid = 'midi-backend-load';
    const eid = 'midi-backend-err';
    const cleanup = () => {
      try { seq.eventHandler.removeEvent('songChange', tid); } catch { /* */ }
      try { seq.eventHandler.removeEvent('midiError', eid); } catch { /* */ }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('loadNewSongList timed out'));
    }, 4000);
    seq.eventHandler.addEvent('songChange', tid, (data) => {
      events.push('songChange t+' + (performance.now() - t0).toFixed(0) + 'ms dur=' + (seq.duration ?? 0).toFixed(2));
      clearTimeout(timer);
      cleanup();
      resolve(data);
    });
    seq.eventHandler.addEvent('midiError', eid, (err) => {
      clearTimeout(timer);
      cleanup();
      reject(err instanceof Error ? err : new Error(String(err)));
    });
    try {
      seq.loadNewSongList([{ binary: ab, fileName: label + '.mid' }]);
    } catch (e) {
      clearTimeout(timer);
      cleanup();
      reject(e);
    }
  });
  seq.loopCount = loop ? -1 : 0;
  try { seq.currentTime = 0; } catch { /* */ }
  seq.play();
  return {
    label,
    ms: performance.now() - t0,
    duration: seq.duration ?? 0,
    paused: seq.paused,
    isFinished: seq.isFinished,
    events
  };
}

async function main() {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioContext({ sampleRate: 22050 });
  await ctx.resume();
  line('ctx=' + ctx.state);

  await ctx.audioWorklet.addModule('/client/spessasynth_processor.min.js');
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  gain.connect(ctx.destination);
  const synth = new WorkletSynthesizer(ctx, { eventsEnabled: true });
  synth.connect(gain);
  await synth.isReady;
  line('synth ready');

  const sf = await fetch('/client/SCC1_Florestan.sf2').then(r => r.arrayBuffer());
  await synth.soundBankManager.addSoundBank(sf, 'main');
  line('sf2 ' + sf.byteLength);

  const seq = new Sequencer(synth);
  const a = new Uint8Array(await fetch('/songs/a.mid').then(r => r.arrayBuffer()));
  const b = new Uint8Array(await fetch('/songs/b.mid').then(r => r.arrayBuffer()));
  line('songs a=' + a.byteLength + ' b=' + b.byteLength);

  const r1 = await playLikeBackend(seq, synth, a, true, 'scape_main');
  line('play1 ' + JSON.stringify(r1));
  await new Promise(r => setTimeout(r, 400));
  const mid1 = { duration: seq.duration, paused: seq.paused, isFinished: seq.isFinished, t: seq.currentTime };

  let r2;
  try {
    r2 = await playLikeBackend(seq, synth, b, true, 'harmony');
    line('play2 ' + JSON.stringify(r2));
  } catch (e) {
    r2 = { error: String(e && e.message ? e.message : e) };
    line('play2 FAIL ' + r2.error);
  }
  await new Promise(r => setTimeout(r, 250));
  const mid2 = { duration: seq.duration, paused: seq.paused, isFinished: seq.isFinished, t: seq.currentTime };

  window.__probe = {
    ok: !r2.error && Math.abs((r2.duration || 0) - (r1.duration || 0)) > 0.5 && mid2.t < 5,
    play1: r1,
    play2: r2,
    mid1,
    mid2
  };
  line('RESULT ' + JSON.stringify(window.__probe));
}
main().catch(e => {
  line('FATAL ' + (e && e.stack ? e.stack : e));
  window.__probe = { ok: false, error: String(e) };
});
</script>
</body></html>`;

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const u = decodeURIComponent((req.url || '/').split('?')[0]);
      try {
        if (u === '/' || u === '/probe.html') {
          res.writeHead(200, { 'content-type': 'text/html' });
          res.end(HTML);
          return;
        }
        if (u === '/songs/a.mid') {
          res.writeHead(200, { 'content-type': mime(SONG_A) });
          res.end(fs.readFileSync(SONG_A));
          return;
        }
        if (u === '/songs/b.mid') {
          res.writeHead(200, { 'content-type': mime(SONG_B) });
          res.end(fs.readFileSync(SONG_B));
          return;
        }
        if (u === '/client/SCC1_Florestan.sf2') {
          res.writeHead(200, { 'content-type': mime(SF2) });
          res.end(fs.readFileSync(SF2));
          return;
        }
        if (u === '/client/spessasynth_processor.min.js') {
          res.writeHead(200, { 'content-type': mime(PROC) });
          res.end(fs.readFileSync(PROC));
          return;
        }
        if (u.startsWith('/nm/')) {
          const rel = u.slice(4);
          const fp = path.join(CLIENT, rel);
          if (!fp.startsWith(CLIENT) || !fs.existsSync(fp) || !fs.statSync(fp).isFile()) {
            res.writeHead(404);
            res.end('no');
            return;
          }
          res.writeHead(200, { 'content-type': mime(fp) });
          res.end(fs.readFileSync(fp));
          return;
        }
        res.writeHead(404);
        res.end('no');
      } catch (e) {
        res.writeHead(500);
        res.end(String(e));
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
    server.on('error', reject);
  });
}

async function parseDurations() {
  const { BasicMIDI } = await import(
    path.join(CLIENT, 'spessasynth_core/dist/index.js')
  );
  const names = ['scape main.mid', 'harmony.mid', 'newbie melody.mid', 'garden.mid', 'baroque.mid'];
  const rows = [];
  for (const name of names) {
    const fp = path.join(SONGS, name);
    const buf = fs.readFileSync(fp);
    try {
      const m = BasicMIDI.fromArrayBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), name);
      rows.push({ name, bytes: buf.length, duration: m.duration, tracks: m.tracks?.length });
    } catch (e) {
      rows.push({ name, bytes: buf.length, error: String(e && e.message ? e.message : e) });
    }
  }
  return rows;
}

const durations = await parseDurations();
console.log('[midi-swap-probe] BasicMIDI parse', JSON.stringify(durations, null, 2));

const { server, port } = await startServer();
process.env.HARNESS_EPHEMERAL = process.env.HARNESS_EPHEMERAL || '1';
process.env.HEADLESS = process.env.HEADLESS || '1';
const browser = await launchBrowser();
const page = typeof browser.newPage === 'function' ? await browser.newPage() : browser.pages()[0];
const url = `http://127.0.0.1:${port}/probe.html`;
console.log('[midi-swap-probe] goto', url);
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
const probe = await page.waitForFunction(() => window.__probe, { timeout: 30000 }).then(() =>
  page.evaluate(() => window.__probe)
);
const text = await page.evaluate(() => document.getElementById('out')?.textContent || '');
console.log('[midi-swap-probe] page log\\n' + text);
console.log('[midi-swap-probe] result', JSON.stringify(probe, null, 2));
await browser.close();
server.close();
process.exit(probe?.ok ? 0 : 2);
