#!/usr/bin/env node
/**
 * Prove index-0 client cache identity: engine /crc + jag bodies
 * vs what a cold browser Client-TS actually downloads.
 *
 * Usage (engine on WEB_PORT=81):
 *   node scripts/verify-client-cache-parity.mjs
 *   CACHE_BASE=http://127.0.0.1:81 node scripts/verify-client-cache-parity.mjs
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.CACHE_BASE || 'http://127.0.0.1:81';
const OUT = path.join(ROOT, 'docs/plans/cache-parity');
fs.mkdirSync(OUT, { recursive: true });

const ARCHIVES = [
  [1, 'title'],
  [2, 'config'],
  [3, 'interface'],
  [4, 'media'],
  [5, 'versionlist'],
  [6, 'textures'],
  [7, 'wordenc'],
  [8, 'sounds']
];

function sha(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function fetchBuf(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Packet.getcrc (same poly as Packet.ts)
const POLY = 0xedb88320;
const crctable = new Int32Array(256);
for (let i = 0; i < 256; i++) {
  let r = i;
  for (let b = 0; b < 8; b++) r = r & 1 ? (r >>> 1) ^ POLY : r >>> 1;
  crctable[i] = r;
}
function getcrc(src) {
  let crc = 0xffffffff;
  for (let i = 0; i < src.length; i++) crc = (crc >>> 8) ^ crctable[(crc ^ src[i]) & 0xff];
  return ~crc | 0;
}

const crcRaw = await fetchBuf(`${BASE}/crc`);
const table = [];
for (let i = 0; i < 9; i++) {
  table.push(crcRaw.readInt32BE(i * 4));
}

const engine = [];
let crcOk = true;
for (const [idx, name] of ARCHIVES) {
  const body = await fetchBuf(`${BASE}/${name}`);
  const bodyCrc = getcrc(body);
  const match = bodyCrc === table[idx];
  if (!match) crcOk = false;
  engine.push({ idx, name, len: body.length, sha: sha(body), tableCrc: table[idx], bodyCrc, match });
  fs.writeFileSync(path.join(OUT, `${name}.http.bin`), body);
}

// Cold browser fetch (Playwright)
const require = createRequire(path.join(ROOT, 'tools/client-smoke/package.json'));
let tsFetches = [];
let browserErr = null;
try {
  const { chromium } = require('playwright');
  // SMOKE_HEADED=1 → visible browser (same as smoke-client-ts.mjs)
  const browser = await chromium.launch({ headless: process.env.SMOKE_HEADED !== '1' });
  const page = await browser.newPage();
  page.on('response', async (res) => {
    try {
      const pathOnly = new URL(res.url()).pathname;
      if (!/^\/(crc|title|config|interface|media|versionlist|textures|wordenc|sounds)/.test(pathOnly)) return;
      const buf = Buffer.from(await res.body());
      tsFetches.push({ url: pathOnly, status: res.status(), len: buf.length, sha: sha(buf) });
    } catch (e) {
      tsFetches.push({ url: res.url(), error: String(e) });
    }
  });
  await page.goto(`${BASE}/rs2.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(async () => {
    try {
      for (const d of (await indexedDB.databases?.()) || []) {
        if (d.name) indexedDB.deleteDatabase(d.name);
      }
    } catch {}
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${BASE}/rs2.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(20000);
  await browser.close();
} catch (e) {
  browserErr = String(e);
}

function baseName(url) {
  const m = url.match(/^\/([a-z]+)/);
  return m ? m[1] : url;
}

let tsOk = !browserErr;
const comparisons = [];
for (const e of engine) {
  const hit = tsFetches.find((f) => baseName(f.url) === e.name);
  const ok = hit && hit.sha === e.sha && hit.len === e.len;
  if (!ok) tsOk = false;
  comparisons.push({ name: e.name, engineSha: e.sha, tsSha: hit?.sha ?? null, ok: !!ok });
}

// Java framing: g3@3 + 6 === length
let javaHeaderOk = true;
for (const e of engine) {
  const body = fs.readFileSync(path.join(OUT, `${e.name}.http.bin`));
  const g3 = (body[3] << 16) | (body[4] << 8) | body[5];
  if (g3 + 6 !== body.length) javaHeaderOk = false;
}

const report = {
  base: BASE,
  at: new Date().toISOString(),
  crcTableOk: crcOk,
  javaJagLengthHeaderOk: javaHeaderOk,
  tsBrowserColdFetchOk: tsOk,
  browserErr,
  engine,
  tsFetches,
  comparisons,
  note:
    'Index-0 jag parity only. OnDemand models/maps use same engine FileStream (data/pack) for both Java TCP and TS WS when pointed at this world. Wipe Java .file_store_* / storeid cache for cold parity.'
};

fs.writeFileSync(path.join(OUT, 'parity-report.json'), JSON.stringify(report, null, 2));

console.log('crcTableOk', crcOk);
console.log('javaJagLengthHeaderOk', javaHeaderOk);
console.log('tsBrowserColdFetchOk', tsOk);
for (const c of comparisons) {
  console.log(c.ok ? 'OK ' : 'BAD', c.name, c.engineSha?.slice(0, 12), c.tsSha?.slice(0, 12));
}
console.log('report →', path.join(OUT, 'parity-report.json'));
process.exit(crcOk && javaHeaderOk && tsOk ? 0 : 1);
