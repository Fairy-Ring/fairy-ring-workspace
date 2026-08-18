/**
 * Thin live-harness helpers (rs2b0t tools/lib/harness.ts shape).
 *
 * Lives under tools/ — never inside vendor/client-ts.
 * Requires: engine :81, client build:dev deploy, page URL with ?harness=1
 * so rs2.html keeps a Client ref and loads tools/harness attach.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SMOKE_PKG = path.join(ROOT, 'tools/client-smoke');

/** Playwright profile — IndexedDB `lostcity` ondemand cache survives between runs (274-style). */
export const DEFAULT_HARNESS_PROFILE = path.join(ROOT, '.tmp/playwright-harness-profile');

/** Default shot root — local only (docs/ is gitignored). */
export const DEFAULT_SHOT_DIR = path.join(ROOT, 'docs/plans/harness-shots');

/**
 * Max age (ms) of last thrash-pin smoke **end** (harness-shots mtime) to allow s1-then-inject steal.
 * Default **90s**. `0` = always allow steal; `-1` = never steal.
 * Override: `RESUME_STEAL_MAX_AGE_MS`.
 */
export const RESUME_STEAL_MAX_AGE_MS = (() => {
  const raw = process.env.RESUME_STEAL_MAX_AGE_MS;
  if (raw === undefined || raw === '') return 90_000;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 90_000;
})();

export function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

/**
 * Latest mtime (epoch ms) under `docs/plans/harness-shots/*` for this username.
 * Run dirs look like `mm_mmthrash1` / `misc_miscthrash1` — match folder name containing the user.
 * Uses dir + first-level file mtimes (png/json) as “session ended” signal.
 * @param {string} username
 * @returns {number|null}
 */
export function lastHarnessShotSessionEndMs(username) {
  const want = String(username || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
  if (!want) return null;
  let root;
  try {
    root = DEFAULT_SHOT_DIR;
    if (!fsSync.existsSync(root)) return null;
  } catch {
    return null;
  }
  let latest = null;
  let names;
  try {
    names = fsSync.readdirSync(root);
  } catch {
    return null;
  }
  for (const name of names) {
    if (name.startsWith('.')) continue;
    const low = name.toLowerCase();
    // Exact folder or suffix `_user` only. Do **not** `includes` — short
    // prefixes matched old runs and made the 90s steal gate look dead.
    if (low !== want && !low.endsWith(`_${want}`)) continue;
    const dir = path.join(root, name);
    let st;
    try {
      st = fsSync.statSync(dir);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    let t = st.mtimeMs;
    try {
      for (const f of fsSync.readdirSync(dir)) {
        try {
          const ft = fsSync.statSync(path.join(dir, f)).mtimeMs;
          if (ft > t) t = ft;
        } catch {
          /* skip */
        }
      }
    } catch {
      /* skip listing */
    }
    if (latest == null || t > latest) latest = t;
  }
  return latest;
}

/**
 * Whether s1-then-inject steal is allowed for this thrash pin.
 * Steal only if last harness-shots activity for the user ended ≤ RESUME_STEAL_MAX_AGE_MS ago.
 * @param {string} username
 * @returns {{ allow: boolean, reason: string, ageMs: number|null, endedMs: number|null }}
 */
export function resumeStealAgeGate(username) {
  const limit = RESUME_STEAL_MAX_AGE_MS;
  if (limit < 0) {
    return { allow: false, reason: 'RESUME_STEAL_MAX_AGE_MS<0 (steal disabled)', ageMs: null, endedMs: null };
  }
  if (limit === 0) {
    return { allow: true, reason: 'RESUME_STEAL_MAX_AGE_MS=0 (always allow)', ageMs: null, endedMs: null };
  }
  const endedMs = lastHarnessShotSessionEndMs(username);
  if (endedMs == null) {
    return {
      allow: false,
      reason: `no harness-shots dir for user=${username} (treat as cold)`,
      ageMs: null,
      endedMs: null
    };
  }
  const ageMs = Date.now() - endedMs;
  if (ageMs <= limit) {
    return {
      allow: true,
      reason: `last shot end ${Math.round(ageMs / 1000)}s ago ≤ ${Math.round(limit / 1000)}s`,
      ageMs,
      endedMs
    };
  }
  return {
    allow: false,
    reason: `last shot end ${Math.round(ageMs / 1000)}s ago > ${Math.round(limit / 1000)}s`,
    ageMs,
    endedMs
  };
}

export function parseArgs(argv, defaults = {}) {
  let base;
  const rest = [];
  // Flags that take a value (must not land in rest as a fake username).
  // Symptom 2026-08-09: `--max-ms 300000` → user=`--max-ms` → s1/login thrash as `max_ms`.
  const valueFlags = new Set(['--base', '--max-ms', '--timeout', '--user', '--pass']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base' && i + 1 < argv.length) {
      base = argv[++i];
      continue;
    }
    if (valueFlags.has(a) && i + 1 < argv.length) {
      i++; // skip value
      continue;
    }
    if (a.startsWith('-')) {
      // bare flags: --headless, --proof, …
      continue;
    }
    if (a.startsWith('http') || a.includes('://')) {
      base = a;
      continue;
    }
    rest.push(a);
  }
  return {
    // Harness client is a separate page/artifact (not pure rs2.html).
    base: base ?? defaults.base ?? 'http://127.0.0.1:81/harness.html',
    rest
  };
}

/**
 * Fresh local account per run (rs2b0t e2e-smoke / live harness pattern).
 *
 * Local engine auto-creates on login when WEBSITE_REGISTRATION=false.
 * Client username max **12** chars — keep prefix short (≤5).
 * Password defaults to `test` like rs2b0t tools.
 *
 * @param {string} [prefix='h'] short tag e.g. `smoke`, `pab`, `lw`
 * @returns {{ username: string, password: string }}
 */
export function freshAccount(prefix = 'h') {
  const stamp = Date.now().toString(36).slice(-7);
  const p = String(prefix)
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 5) || 'h';
  return {
    username: (p + stamp).slice(0, 12),
    password: 'test'
  };
}

/**
 * Smoke account mode (rs2b0t-style + thrash pin).
 *
 * | Mode | When | Account |
 * |------|------|---------|
 * | **proof** (default) | residual / citeable PASS | fresh username every run |
 * | **thrash** | harness iteration | pin sav (`SMOKE_USER` or `{prefix}thrash1`) |
 * | **pinned** | explicit argv / SMOKE_USER without thrash flag | reuse that user |
 *
 * Env: `SMOKE_MODE=proof|thrash|residual` · `THRASH_PIN=1` → thrash ·
 * `SMOKE_USER` / `SMOKE_PASS` · argv user/pass override all.
 *
 * @see docs/research/harness-lessons-rs2b0t-nav.md
 * @param {string[]} rest positional [user, pass] from parseArgs
 * @param {string} [prefix='h']
 * @returns {{ username: string, password: string, mode: 'proof'|'thrash'|'pinned' }}
 */
export function resolveAccount(rest = [], prefix = 'h') {
  const envMode = String(process.env.SMOKE_MODE || '')
    .toLowerCase()
    .trim();
  const thrashEnv =
    process.env.THRASH_PIN === '1' ||
    process.env.THRASH_PIN === 'true' ||
    envMode === 'thrash';
  const proofEnv = envMode === 'proof' || envMode === 'residual';

  // Positional user must look like a username, not a leftover flag value.
  const posUser = rest.find(a => a && !String(a).startsWith('-') && !/^\d+$/.test(String(a)));
  if (posUser) {
    const passIdx = rest.indexOf(posUser) + 1;
    const posPass = rest[passIdx];
    const acc = {
      username: String(posUser).slice(0, 12),
      password:
        posPass && !String(posPass).startsWith('-')
          ? String(posPass)
          : (process.env.SMOKE_PASS ?? 'test'),
      mode: thrashEnv ? 'thrash' : 'pinned'
    };
    console.log(
      `[harness] account mode=${acc.mode} user=${acc.username} (argv)`
    );
    return acc;
  }
  if (process.env.SMOKE_USER) {
    const acc = {
      username: String(process.env.SMOKE_USER).slice(0, 12),
      password: process.env.SMOKE_PASS ?? 'test',
      mode: thrashEnv || !proofEnv ? 'thrash' : 'pinned'
    };
    // SMOKE_USER alone = thrash-friendly pin unless SMOKE_MODE=proof forces fresh
    if (proofEnv && !thrashEnv) {
      const fresh = freshAccount(prefix);
      console.log(
        `[harness] account mode=proof user=${fresh.username} (SMOKE_MODE=proof ignores SMOKE_USER=${acc.username})`
      );
      return { ...fresh, mode: 'proof' };
    }
    console.log(
      `[harness] account mode=${acc.mode} user=${acc.username} (SMOKE_USER)`
    );
    return acc;
  }
  if (thrashEnv) {
    const p = String(prefix)
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 5) || 'h';
    const username = `${p}thrash1`.slice(0, 12);
    console.log(
      `[harness] account mode=thrash user=${username} (THRASH_PIN / SMOKE_MODE=thrash)`
    );
    return { username, password: process.env.SMOKE_PASS ?? 'test', mode: 'thrash' };
  }
  const fresh = freshAccount(prefix);
  console.log(`[harness] account mode=proof user=${fresh.username} (fresh)`);
  return { ...fresh, mode: 'proof' };
}

export const HARNESS_VIEWPORT = { width: 1280, height: 720 };

function loadPlaywright() {
  const require = createRequire(path.join(SMOKE_PKG, 'package.json'));
  try {
    return require('playwright');
  } catch {
    console.error(
      'playwright not found. Install:\n  cd tools/client-smoke && npm install && npx playwright install chromium'
    );
    process.exit(2);
  }
}

/**
 * Default **headed** — watch the game while iterating content/scripts.
 * Headless only when explicitly requested (CI / batch).
 *
 *   HEADED=1|true|yes  → headed (default if unset)
 *   HEADLESS=1|true    → headless
 *   HEADED=0|false|no  → headless
 */
export function wantHeaded() {
  const h = process.env.HEADED;
  if (h === '0' || h === 'false' || h === 'no') return false;
  if (process.env.HEADLESS === '1' || process.env.HEADLESS === 'true') return false;
  // unset HEADED, or HEADED=1/true/yes, or any other truthy → headed
  return true;
}

/**
 * Persistent Chromium profile so client IndexedDB (ondemand) is reused across
 * harness runs. Same idea as 274 — cold first boot; subsequent boots hit cache.
 *
 * Returns a BrowserContext (has `.newPage()` / `.close()` like callers expect).
 *
 * Env:
 *   (default)                 headed browser + persistent profile
 *   HEADLESS=1                headless (opt-in)
 *   HEADED=0                  headless
 *   HARNESS_PROFILE=/path     override profile dir (default `.tmp/playwright-harness-profile`)
 *   HARNESS_FRESH_PROFILE=1   wipe profile before launch (force cold ondemand)
 *   HARNESS_EPHEMERAL=1       no userDataDir (always cold)
 *   SLOWMO=ms                 only applied when headed (default 200)
 */
/**
 * Chromium flags so Spessa AudioContext is not stuck `suspended` until focus.
 * Without this, MidiFacade init/play can wait on resume() and feel like the
 * client is held until the harness window is clicked (browser autoplay policy).
 */
const HARNESS_CHROMIUM_ARGS = [
  '--autoplay-policy=no-user-gesture-required',
  '--disable-features=AudioServiceOutOfProcess'
];

export async function launchBrowser() {
  const { chromium } = loadPlaywright();
  const headed = wantHeaded();
  const slowMo = headed ? Number(process.env.SLOWMO ?? 200) : 0;

  if (process.env.HARNESS_EPHEMERAL === '1') {
    console.log(`[harness] ephemeral browser headed=${headed} (no profile — cold ondemand)`);
    return chromium.launch({ headless: !headed, slowMo, args: HARNESS_CHROMIUM_ARGS });
  }

  const userDataDir = process.env.HARNESS_PROFILE
    ? path.resolve(process.env.HARNESS_PROFILE)
    : DEFAULT_HARNESS_PROFILE;

  if (process.env.HARNESS_FRESH_PROFILE === '1') {
    await fs.rm(userDataDir, { recursive: true, force: true });
    console.log(`[harness] wiped profile ${userDataDir}`);
  }
  await fs.mkdir(userDataDir, { recursive: true });

  console.log(`[harness] headed=${headed} profile=${userDataDir}`);
  // BrowserContext — callers already use .newPage() / .close()
  return chromium.launchPersistentContext(userDataDir, {
    headless: !headed,
    slowMo,
    viewport: HARNESS_VIEWPORT,
    args: HARNESS_CHROMIUM_ARGS
  });
}

const BOOT_MS = Number(process.env.BOOT_MS) || 180_000;
const LOGIN_MS = Number(process.env.LOGIN_MS) || 120_000;

/**
 * Title-screen hitboxes from Client.titleScreenLoop (765×503 logical canvas).
 * Same coords as scripts/smoke-client-ts.mjs — not a client API fork.
 *
 *   loginscreen 0 "Existing User": x=sWid/2+80, y=sHei/2+40  → (462, 291)
 *   loginscreen 2 "Login" button:  x=sWid/2-80, y=sHei/2+70  → (302, 321)
 * Tab only toggles user↔pass; Enter does NOT submit (must click Login).
 */
export const TITLE_CLICK = {
  focus: { x: 382, y: 200 },
  existingUser: { x: 462, y: 291 },
  loginBtn: { x: 302, y: 321 }
};

export function boot(page) {
  return page.waitForFunction(
    () => {
      const h = globalThis.__lc377;
      return h && h.ok && h.loopCycle() > 10;
    },
    undefined,
    { timeout: BOOT_MS }
  );
}

/** GET full body via node:http (IPv4). */
async function httpGetBuffer(url) {
  const httpMod = await import('node:http');
  const http = httpMod.default ?? httpMod;
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: u.hostname === 'localhost' ? '127.0.0.1' : u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        method: 'GET',
        family: 4,
        timeout: 15_000
      },
      res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () =>
          resolve({ status: res.statusCode | 0, buf: Buffer.concat(chunks) })
        );
      }
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.end();
  });
}

/** Jagex CRC32 (Client.ts Packet.getcrc / engine Packet.getcrc). */
function jagCrc32(src) {
  const POLY = 0xedb88320;
  if (!jagCrc32.table) {
    const table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let r = i;
      for (let bit = 0; bit < 8; bit++) {
        r = (r & 1) === 1 ? (r >>> 1) ^ POLY : r >>> 1;
      }
      table[i] = r;
    }
    jagCrc32.table = table;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < src.length; i++) {
    crc = (crc >>> 8) ^ jagCrc32.table[(crc ^ src[i]) & 0xff];
  }
  return ~crc | 0;
}

/**
 * Client getJagCrc self-check: 9×i32 jag CRCs + rolling hash
 *   hash = 1234; for i in 0..8: hash = ((hash << 1) + crc[i]) | 0
 * Fail → title "checksum problem" then "Game updated - please reload page".
 */
function checkCrcTable(buf) {
  if (!buf || buf.length < 40) {
    return { ok: false, note: `/crc len ${buf?.length ?? 0} (want 40)` };
  }
  const crcs = [];
  for (let i = 0; i < 9; i++) crcs.push(buf.readInt32BE(i * 4));
  const expected = buf.readInt32BE(36);
  let hash = 1234;
  for (let i = 0; i < 9; i++) {
    hash = ((hash << 1) + crcs[i]) | 0;
  }
  if (hash !== expected) {
    return {
      ok: false,
      crcs,
      note: `/crc self-check fail hash=${hash} expected=${expected} (client: Game updated). Restart engine after pack; wipe .tmp/playwright-harness-profile`
    };
  }
  if (crcs[8] === 0) {
    return { ok: false, crcs, note: '/crc sounds crc is 0 — getJagCrc loops forever' };
  }
  return { ok: true, crcs };
}

/** GET body byte length via node:http (IPv4). */
async function httpBodySize(url) {
  const httpMod = await import('node:http');
  const http = httpMod.default ?? httpMod;
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: u.hostname === 'localhost' ? '127.0.0.1' : u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        method: 'GET',
        family: 4,
        timeout: 8000
      },
      res => {
        let n = 0;
        res.on('data', c => {
          n += c.length;
        });
        res.on('end', () => resolve({ status: res.statusCode | 0, size: n }));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
    req.end();
  });
}

/**
 * Preflight: live HTTP pack must match flat client pack (esp. versionlist).
 * Mismatch → sceneState stuck at **1** forever (model ver=0 / CRC “Game updated”).
 *
 * @see docs/plans/2026-08-05-scene-stuck-versionlist-zero.md
 * @param {string} [base='http://127.0.0.1:81']
 * @returns {Promise<{ ok: boolean, versionlistHttp: number, versionlistDisk: number, configHttp: number, note?: string }>}
 */
export async function checkEnginePackHealth(base = 'http://127.0.0.1:81') {
  const fsSync = await import('node:fs');
  const diskPath = path.join(ROOT, 'vendor/engine/data/pack/client/versionlist');
  let versionlistDisk = 0;
  try {
    versionlistDisk = fsSync.statSync(diskPath).size;
  } catch {
    /* missing */
  }
  // base may be full page URL (…/harness.html) — health checks need origin only
  let origin = base.replace(/\/$/, '');
  try {
    const u = new URL(origin);
    origin = `${u.protocol}//${u.host}`;
  } catch {
    origin = 'http://127.0.0.1:81';
  }
  let versionlistHttp = 0;
  let configHttp = 0;
  try {
    const vr = await httpBodySize(`${origin}/versionlist`);
    if (vr.status !== 200) {
      return {
        ok: false,
        versionlistHttp: 0,
        versionlistDisk,
        configHttp: 0,
        note: `versionlist HTTP ${vr.status}`
      };
    }
    versionlistHttp = vr.size;
  } catch (e) {
    return {
      ok: false,
      versionlistHttp: 0,
      versionlistDisk,
      configHttp: 0,
      note: `versionlist fetch failed: ${e?.message || e}`
    };
  }
  try {
    const cr = await httpBodySize(`${origin}/config`);
    if (cr.status === 200) configHttp = cr.size;
  } catch {
    /* ignore */
  }
  // Known-good flat size ~81054; HTTP must match disk (not a smaller stale cache).
  const match = versionlistHttp > 0 && versionlistHttp === versionlistDisk;
  const configOk = configHttp > 100_000;

  // /crc self-check is what Client.getJagCrc actually gates on. Size match can
  // still be green after a live pack left CrcBuffer stale → "Game updated".
  let crcOk = false;
  let crcNote;
  try {
    const crcRes = await httpGetBuffer(`${origin}/crc`);
    const table = checkCrcTable(crcRes.buf);
    crcOk = crcRes.status === 200 && table.ok;
    crcNote = table.ok ? undefined : table.note;
    if (crcOk && table.crcs) {
      const tex = await httpGetBuffer(`${origin}/textures`);
      if (tex.status === 200 && tex.buf.length) {
        const got = jagCrc32(tex.buf);
        if (got !== table.crcs[6]) {
          crcOk = false;
          crcNote = `/textures crc ${got} ≠ table[6] ${table.crcs[6]} (stale CrcBuffer after pack). Restart engine; wipe .tmp/playwright-harness-profile`;
        }
      }
    }
  } catch (e) {
    crcNote = `/crc fetch failed: ${e?.message || e}`;
  }

  const ok = match && configOk && crcOk;
  const note = ok
    ? undefined
    : crcNote
      ? crcNote
      : !match
        ? `versionlist HTTP ${versionlistHttp} ≠ disk ${versionlistDisk} — scene1 hang risk. ` +
          `Fix: BUILD_VERIFY=false npm run build in vendor/engine + restart; wipe .tmp/playwright-harness-profile`
        : `config HTTP size ${configHttp} looks empty/bad`;
  return { ok, versionlistHttp, versionlistDisk, configHttp, crcOk, note };
}

/**
 * Fail fast **before** launchBrowser if pack/cache contract is broken.
 * Retries while HTTP size is 0 (engine still booting / mid “Packing changes”).
 * Set SKIP_PACK_HEALTH=1 to bypass.
 */
export async function assertEnginePackHealth(base = 'http://127.0.0.1:81') {
  if (process.env.SKIP_PACK_HEALTH === '1' || process.env.SKIP_PACK_HEALTH === 'true') {
    return;
  }
  const deadline = Date.now() + Number(process.env.PACK_HEALTH_MS || 45_000);
  let h = await checkEnginePackHealth(base);
  let attempt = 0;
  while (!h.ok && Date.now() < deadline) {
    attempt++;
    // 0-byte HTTP = engine down or mid-reload; mismatch = real scene1 risk
    const transient = h.versionlistHttp === 0 || h.configHttp === 0;
    console.log(
      `[harness] pack health wait #${attempt} vl_http=${h.versionlistHttp} vl_disk=${h.versionlistDisk} config=${h.configHttp} crc=${h.crcOk}` +
        (transient ? ' (engine not ready yet)' : '') +
        (h.note ? ` note=${h.note}` : '')
    );
    if (!transient) break; // hard mismatch — no point spinning forever
    await new Promise(r => setTimeout(r, 1500));
    h = await checkEnginePackHealth(base);
  }
  console.log(
    `[harness] pack health vl_http=${h.versionlistHttp} vl_disk=${h.versionlistDisk} config=${h.configHttp} crc=${h.crcOk} ok=${h.ok}`
  );
  if (!h.ok) {
    fail(h.note || 'engine pack health check failed');
  }
}

/**
 * Login via Client.login inject (rs2b0t tools/lib/harness.ts).
 *
 * Dirty-kill (cold title, World holds username → reply 5):
 *   Ghost is **World RAM**, not a `.sav` flag. Bare opcode 18 from title is wrong.
 *
 * **Resume steal (s1-then-inject)** only when the thrash pin’s last smoke **ended**
 * recently — measured by mtime of `docs/plans/harness-shots/*{user}*` (png/json).
 * Default window: **≤90s** (`RESUME_STEAL_MAX_AGE_MS`). If older / no shots:
 *   dirty hold → normal login inject → **same thrash prep as steal** (wipe inv/worn,
 *   `__lc377_resumeSteal` so mainlandAccount skips tutorial setvar/relog).
 *   Opt out of steal entirely: `DIRTY_LOGIN_STEAL=0`.
 *
 * Opt into title UI: TITLE_LOGIN=1.
 * @returns {Promise<boolean>}
 */
export async function login(page, user, pass = 'test') {
  await page.evaluate(() => {
    globalThis.__lc377_resumeSteal = false;
  }).catch(() => {});

  if (process.env.TITLE_LOGIN === '1' || process.env.TITLE_LOGIN === 'true') {
    return loginTitleUi(page, user, pass);
  }
  const r = await loginInject(page, user, pass);
  if (r.ok) return true;

  if (!r.alreadyLoggedIn) {
    return false;
  }

  const stealOff =
    process.env.DIRTY_LOGIN_STEAL === '0' || process.env.DIRTY_LOGIN_STEAL === 'false';
  const ageGate = resumeStealAgeGate(user);
  if (!stealOff && ageGate.allow) {
    console.log(
      `[harness] already logged in — resumeSteal OK (${ageGate.reason}) — s1-then-inject (donor → softDrop → reconnect ${user})`
    );
    if (await loginStealGhost(page, user, pass)) {
      await wipeAfterResumeSteal(page);
      await resyncMusicAfterSteal(page);
      await page.evaluate(() => {
        globalThis.__lc377_resumeSteal = true;
      });
      return true;
    }
    console.warn('[harness] s1-then-inject steal failed — falling back to dirty hold + normal login');
  } else if (!stealOff && !ageGate.allow) {
    console.log(
      `[harness] already logged in — skip resumeSteal (${ageGate.reason}) — dirty hold + normal login, then thrash wipe`
    );
  }

  const hold = RELOG_COOLDOWN_DIRTY_MS;
  console.log(
    `[harness] already logged in (World ghost, not .sav) — dirty hold ${Math.round(hold / 1000)}s then retry`
  );
  await page.waitForTimeout(hold);

  const deadline = Date.now() + RELOG_BUDGET_MS;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt++;
    console.log(
      `[harness] dirty-hold login retry ${attempt} mes='${await loginMes(page).catch(() => '')}'`
    );
    const again = await loginInject(page, user, pass);
    if (again.ok) {
      // Same thrash prep as resumeSteal: wipe inv/worn; skip full mainland setvar/relog.
      await wipeInvAndWorn(page, 'thrash pin after dirty hold (no steal)');
      await page.evaluate(() => {
        globalThis.__lc377_resumeSteal = true;
      });
      return true;
    }
    if (!again.alreadyLoggedIn) return false;
    await page.waitForTimeout(RELOG_RETRY_MS);
  }
  return false;
}

/** True if last successful login() used s1-then-inject steal (page flag). */
export async function didResumeSteal(page) {
  return page.evaluate(() => !!globalThis.__lc377_resumeSteal).catch(() => false);
}

/**
 * Strip worn + pack so thrash can re-seed cleanly.
 * Does **not** touch tutorial varp, stats, or quest vars.
 *
 * Needed when dirty **steal fails** (or is off): thrash pin sav still has worn
 * (e.g. Castle Wars Hooded cloak) and `~clearinv` alone does not unequip.
 */
export async function wipeInvAndWorn(page, reason = 'wipe') {
  console.log(`[harness] ${reason}: unequipAll + ~clearinv + ~clearinv worn (keep tutorial/stats/quest)`);
  await page.evaluate(() => {
    const a = globalThis.__lc377?.actions;
    if (typeof a?.unequipAll === 'function') a.unequipAll(12);
  }).catch(() => {});
  await page.waitForTimeout(400);
  // Pack wipe (does not strip worn — unequip first)
  await cheatQuiet(page, '~clearinv', 500);
  // Leftover worn if unequip missed a slot
  await cheatQuiet(page, '~clearinv worn', 500);
  await page.waitForTimeout(300);
}

/** @deprecated name — use wipeInvAndWorn (steal is only one caller path) */
export async function wipeAfterResumeSteal(page) {
  return wipeInvAndWorn(page, 'resume steal');
}

/**
 * After s1-then-inject steal: title music (scape_main) often keeps playing because
 * reconnect reply 15 does **not** re-run mapzone → midi_song. Server only fires
 * music on mapsquare enter (NetworkPlayer lastMapZone change).
 *
 * 1. clearMidiState (stop tinymidipcm + reset nextMidiSong so MIDI_SONG applies)
 * 2. brief hop off mapsquare + back → triggerMapzone → music_playbyregion
 */
export async function resyncMusicAfterSteal(page) {
  console.log('[harness] resume steal: resync game music (stop title + re-enter mapzone)');
  await page.evaluate(() => {
    globalThis.__lc377?.clearMidiState?.('post-steal');
  }).catch(() => {});

  const tile = await worldTile(page).catch(() => null);
  if (!tile) {
    console.warn('[harness] resyncMusic: no tile — skipped mapzone hop');
    return;
  }

  // Leave mapsquare (64×64) then re-enter so engine fires [mapzone,0_mx_mz] music.
  const mx = tile.x >> 6;
  const mz = tile.z >> 6;
  const localX = tile.x & 63;
  // Prefer hop west; if on west edge hop east instead
  const outX = localX >= 2 ? mx * 64 - 1 : (mx + 1) * 64 + 1;
  const out = { x: outX, z: tile.z, level: tile.level ?? 0 };

  const hopOk = await teleTo(page, out, 3, 18_000).catch(() => false);
  if (!hopOk) {
    console.warn('[harness] resyncMusic: exit hop failed — music may stay title');
    return;
  }
  await page.waitForTimeout(500);
  // Ensure client accepts a new MIDI_SONG (title left nextMidiSong=0 often)
  await page.evaluate(() => {
    globalThis.__lc377?.clearMidiState?.('pre-reenter');
  }).catch(() => {});
  await teleTo(page, tile, 3, 18_000).catch(() => {});
  await waitSceneReady(page, 25_000).catch(() => {});
  await page.waitForTimeout(400);
  console.log(
    `[harness] resyncMusic: re-entered mapsquare ${mx}_${mz} at ${tile.x},${tile.z}`
  );
}

/**
 * Steal a World ghost: **get client to s1 the normal way, then inject reconnect.**
 *
 * 1. Full login as throwaway donor (reply 2 → prepareGame + graph) — known-good path
 * 2. Wait until **ingame && sceneState ≥ 1** (s1 = map build / mid-session shape)
 * 3. softDropStream — close socket only (tryReconnect-shaped; no logout teardown)
 * 4. reconnectLogin(target) — opcode 18 inject while already post-s1
 * 5. Wait ingame + scene ≥ 1 (then prefer 2)
 *
 * Opt out: DIRTY_LOGIN_STEAL=0. Harness-only.
 */
export async function loginStealGhost(page, user, pass = 'test') {
  const donor = freshAccount('don');
  const s1Ms = Number(process.env.STEAL_S1_MS) || Math.min(LOGIN_MS, 90_000);
  console.log(
    `[harness] stealGhost: donor=${donor.username} → wait s1 (scene≥1) → softDrop → inject reconnect ${user}`
  );

  // --- 1) Known-good: full donor login (opcode 16 / reply 2). Don't require s2 yet. ---
  const dispatched = await page.evaluate(
    ([u, p]) => {
      const h = globalThis.__lc377;
      if (h?.login) return h.login(u, p, false);
      const c = h?.client;
      if (!c?.login) return false;
      c.loginUser = u;
      c.loginPass = p;
      void c.login(u, p, false);
      return true;
    },
    [donor.username, donor.password]
  );
  if (!dispatched) {
    console.warn('[harness] stealGhost: donor login not dispatched');
    return false;
  }

  // --- 2) Get to s1 (ingame + sceneState ≥ 1). This is the shape we know how to reach. ---
  try {
    await page.waitForFunction(
      () => {
        const h = globalThis.__lc377;
        if (!h?.ingame?.()) return false;
        const s = h.sceneState?.() ?? -1;
        return s >= 1; // s1 or s2 — past title / reply-2 graph live
      },
      undefined,
      { timeout: s1Ms }
    );
  } catch {
    const diag = await sceneDiag(page).catch(() => null);
    console.warn(
      '[harness] stealGhost: never reached s1 on donor',
      diag ? JSON.stringify(diag) : await loginMes(page).catch(() => '')
    );
    return false;
  }

  const pre = await page.evaluate(() => {
    const h = globalThis.__lc377;
    return {
      ingame: !!h?.ingame?.(),
      scene: h?.sceneState?.() ?? -1,
      mes: h?.loginMes?.() ?? ''
    };
  });
  console.log(`[harness] stealGhost: donor at s${pre.scene} (ingame=${pre.ingame}) — softDrop + inject`);

  // --- 3) Soft-drop like tryReconnect (keep graph; drop stream) ---
  const dropped = await page.evaluate(() => {
    const h = globalThis.__lc377;
    if (typeof h?.softDropStream === 'function') return h.softDropStream();
    const c = h?.client;
    if (!c) return false;
    try {
      c.stream?.close?.();
      c.stream = null;
      c.ingame = false;
      if (typeof c.loginRetryCount === 'number') c.loginRetryCount = 0;
      return true;
    } catch {
      return false;
    }
  });
  if (!dropped) {
    console.warn('[harness] stealGhost: softDropStream failed');
    return false;
  }

  // --- 4) Inject reconnect as the thrash pin (opcode 18) ---
  const recon = await page.evaluate(
    ([u, p]) => {
      const h = globalThis.__lc377;
      if (typeof h?.reconnectLogin === 'function') return h.reconnectLogin(u, p);
      return h?.login?.(u, p, true) === true;
    },
    [String(user).slice(0, 12), String(pass ?? 'test')]
  );
  if (!recon) {
    console.warn('[harness] stealGhost: reconnect inject not dispatched');
    return false;
  }

  // --- 5) Resume: reply 15 → ingame; rebuild often hits s1 then s2 ---
  try {
    await page.waitForFunction(
      () => {
        const h = globalThis.__lc377;
        return h && h.ingame() && (h.sceneState?.() ?? -1) >= 1;
      },
      undefined,
      { timeout: Math.min(LOGIN_MS, 60_000) }
    );
    // Prefer s2 when it lands; don't fail the steal if stuck briefly at s1
    await page
      .waitForFunction(
        () => {
          const h = globalThis.__lc377;
          return h && h.ingame() && h.sceneState() === 2;
        },
        undefined,
        { timeout: 45_000 }
      )
      .catch(() => {});
    const post = await page.evaluate(() => {
      const h = globalThis.__lc377;
      return { ingame: !!h?.ingame?.(), scene: h?.sceneState?.() ?? -1 };
    });
    console.log(`[harness] stealGhost: ok as ${user} scene=${post.scene} ingame=${post.ingame}`);
    return post.ingame && post.scene >= 1;
  } catch {
    const diag = await sceneDiag(page).catch(() => null);
    console.warn(
      '[harness] stealGhost: after inject still not s1+',
      diag ? JSON.stringify(diag) : await loginMes(page).catch(() => '')
    );
    return false;
  }
}

/**
 * rs2b0t-style inject — no canvas clicks.
 * @returns {{ ok: boolean, alreadyLoggedIn?: boolean }}
 */
export async function loginInject(page, user, pass = 'test', opts = {}) {
  const reconnect = !!opts.reconnect;
  await page.waitForFunction(() => !!globalThis.__lc377?.ok, undefined, { timeout: 30_000 });
  const dispatched = await page.evaluate(
    ([u, p, recon]) => {
      const h = globalThis.__lc377;
      if (h?.login) return h.login(u, p, recon);
      const c = h?.client;
      if (!c?.login) return false;
      c.loginUser = u;
      c.loginPass = p;
      void c.login(u, p, recon);
      return true;
    },
    [String(user).slice(0, 12), String(pass ?? 'test'), reconnect]
  );
  if (!dispatched) {
    console.warn('[harness] login inject not dispatched — falling back to title UI');
    const ok = await loginTitleUi(page, user, pass);
    return { ok, alreadyLoggedIn: false };
  }

  // Fail-fast on reply 5 ("already logged in") — do not burn LOGIN_MS on title.
  const deadline = Date.now() + LOGIN_MS;
  let lastLog = 0;
  let stuckS1Since = 0;
  while (Date.now() < deadline) {
    const snap = await page.evaluate(() => {
      const h = globalThis.__lc377;
      if (!h) return { ingame: false, scene: -1, mes: '' };
      return {
        ingame: !!h.ingame?.(),
        scene: h.sceneState?.() ?? -1,
        mes: h.loginMes?.() ?? ''
      };
    });
    if (snap.ingame && snap.scene === 2) return { ok: true };
    if (snap.ingame && snap.scene === 1) {
      if (!stuckS1Since) stuckS1Since = Date.now();
      // 25s stuck at s1 → almost always versionlist/CRC; log loud (do not burn full LOGIN_MS silent)
      if (Date.now() - stuckS1Since > 25_000 && Date.now() - lastLog > 8_000) {
        lastLog = Date.now();
        const diag = await sceneDiag(page).catch(() => null);
        console.warn(
          `[harness] STUCK sceneState=1 for ${Math.round((Date.now() - stuckS1Since) / 1000)}s — ` +
            `usually versionlist HTTP≠disk or stale Playwright profile. diag=${diag ? JSON.stringify(diag) : 'n/a'}`
        );
      }
    } else {
      stuckS1Since = 0;
    }
    if (/already logged in/i.test(snap.mes)) {
      console.log(`[harness] loginInject fail-fast: ${snap.mes}`);
      return { ok: false, alreadyLoggedIn: true };
    }
    // Other hard title failures (invalid pass, full world, …) — stop early too
    if (
      /invalid username|account has been disabled|world is full|error connecting|unable to connect/i.test(
        snap.mes
      )
    ) {
      console.warn(`[harness] loginInject title failure: ${snap.mes}`);
      return { ok: false, alreadyLoggedIn: false };
    }
    if (Date.now() - lastLog > 15_000 && snap.ingame) {
      lastLog = Date.now();
      console.log(
        `[harness] login wait… ingame=${snap.ingame} scene=${snap.scene} mes='${snap.mes || ''}'`
      );
    }
    await page.waitForTimeout(250);
  }

  const diag = await sceneDiag(page).catch(() => null);
  console.warn(
    `[harness] login wait timed out after ${LOGIN_MS}ms reconnect=${reconnect} (want ingame+scene 2):`,
    diag ? JSON.stringify(diag) : await loginMes(page)
  );
  return { ok: false, alreadyLoggedIn: /already logged in/i.test(await loginMes(page).catch(() => '')) };
}

/** Snapshot of scene load blockers (sceneState 1 hang diagnosis). */
export async function sceneDiag(page) {
  return page.evaluate(() => {
    const h = globalThis.__lc377;
    if (typeof h?.sceneDiag === 'function') return h.sceneDiag();
    return {
      sceneState: h?.sceneState?.() ?? -1,
      ingame: !!h?.ingame?.(),
      loginMes: h?.loginMes?.() ?? ''
    };
  });
}

/**
 * Human-path title login: Existing User → type user/pass → Login click.
 * Kept for UI regression / TITLE_LOGIN=1.
 */
export async function loginTitleUi(page, user, pass = 'test') {
  const canvas = page.locator('#canvas');
  await canvas.waitFor({ state: 'visible', timeout: 15_000 });

  await canvas.click({ position: TITLE_CLICK.focus });
  await page.waitForTimeout(300);
  await canvas.click({ position: TITLE_CLICK.existingUser });
  await page.waitForTimeout(500);

  for (const ch of user) {
    await page.keyboard.type(ch, { delay: 40 });
  }
  await page.keyboard.press('Tab');
  await page.waitForTimeout(120);
  for (const ch of pass) {
    await page.keyboard.type(ch, { delay: 40 });
  }
  await page.waitForTimeout(200);
  await canvas.click({ position: TITLE_CLICK.loginBtn });

  try {
    await page.waitForFunction(
      () => {
        const h = globalThis.__lc377;
        return h && h.ingame() && h.sceneState() === 2;
      },
      undefined,
      { timeout: LOGIN_MS }
    );
    return true;
  } catch {
    return false;
  }
}

/** Engine CLIENT_CHEAT (tele / give / ~home / …). No `::` prefix required. */
export async function cheatQuiet(page, command, waitMs = 900) {
  const sent = await page.evaluate(c => globalThis.__lc377?.cheat(c) ?? false, command);
  await page.waitForTimeout(waitMs);
  return sent;
}

/**
 * Apply engine `::setstat <skill> <level>` for each entry.
 * Levels are absolute (not XP). Re-apply after relog if needed — setstat is live.
 *
 * @param {import('playwright').Page} page
 * @param {Record<string, number> | Array<[string, number]>} stats skill→level
 * @param {{ waitMs?: number }} [opts]
 * @returns {Promise<string[]>} commands that failed to send
 * @see ClientCheatHandler setstat / rs2b0t aio-quest-test statsCsv
 */
export async function setStats(page, stats, opts = {}) {
  const waitMs = opts.waitMs ?? 250;
  const entries = Array.isArray(stats)
    ? stats
    : Object.entries(stats).map(([k, v]) => [k, v]);
  /** @type {string[]} */
  const failed = [];
  for (const [skill, level] of entries) {
    const cmd = `setstat ${String(skill).toLowerCase()} ${Number(level) | 0}`;
    if (!(await cheatQuiet(page, cmd, waitMs))) {
      failed.push(cmd);
    }
  }
  return failed;
}

/**
 * Engine `::speed <ms>` — world tick rate (min 20). Default e2e harness: **300**.
 * Faster ticks + TaskBot `delayTicks` = real content path without wall-clock thrash.
 * @see ClientCheatHandler `speed`; docs/runbooks/harness.md § Test-speed cheats
 * @param {import('playwright').Page} page
 * @param {number} [ms=300]
 */
export async function setWorldSpeed(page, ms = 300) {
  const n = Math.max(20, Number(ms) || 300);
  console.log(`[harness] prep: speed ${n} (world tick ms)`);
  if (!(await cheatQuiet(page, `speed ${n}`, 400))) {
    console.warn(`setWorldSpeed: speed ${n} not sent`);
    return false;
  }
  // Stash for waitTicks — most product ops need 3–5 ticks before var/mes settle.
  page.__lc377_worldSpeedMs = n;
  return true;
}

/**
 * Wait N **world ticks** (not wall-clock guesses).
 *
 * Most RS2 product writes (oploc success, stage/var set, inv_add after p_delay)
 * land after **3–5 ticks**. Smokes that `getvar` immediately after menuAction
 * falsely FAIL. Prefer this over bare `waitForTimeout(200)`.
 *
 * Tick length = last `setWorldSpeed` on this page, else `WORLD_SPEED_MS`, else 300.
 *
 * @param {import('playwright').Page} page
 * @param {number} [ticks=5]
 * @param {{ tickMs?: number }} [opts]
 */
export async function waitTicks(page, ticks = 5, opts = {}) {
  const n = Math.max(0, Number(ticks) || 0);
  if (n === 0) return;
  const tickMs = Math.max(
    20,
    Number(opts.tickMs) ||
      Number(page?.__lc377_worldSpeedMs) ||
      Number(process.env.WORLD_SPEED_MS) ||
      300
  );
  await page.waitForTimeout(n * tickMs);
}

/**
 * Poll until `getServerVarQuiet(varName)` satisfies `pred`, waiting `ticksBetween`
 * world ticks between samples. Default pred: value changed from `from`.
 *
 * @param {import('playwright').Page} page
 * @param {string} varName
 * @param {{ from?: number|string|null, pred?: (v: number|null) => boolean, attempts?: number, ticksBetween?: number }} [opts]
 * @returns {Promise<number|null>} last value (or null)
 */
export async function waitServerVar(page, varName, opts = {}) {
  const attempts = Math.max(1, Number(opts.attempts) || 12);
  const ticksBetween = Math.max(1, Number(opts.ticksBetween) || 4);
  const from = opts.from;
  const pred =
    typeof opts.pred === 'function'
      ? opts.pred
      : from !== undefined
        ? v => v != null && Number(v) !== Number(from)
        : v => v != null;
  let last = null;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await waitTicks(page, ticksBetween);
    last = await getServerVarQuiet(page, varName);
    if (pred(last)) return last;
  }
  return last;
}

/** Free inventory slots (28-pack). Non-stack food/gear each need one slot. */
export async function invFreeSlots(page) {
  return page.evaluate(() => {
    const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
    return Math.max(0, 28 - inv.length);
  });
}

/**
 * `::give <item> [amount]` — setup seed only (Decision 004).
 * Prefer calling after waitSceneReady when the bot will immediately use items
 * (scene=1 can drop inventory refresh / OP use-with thrash).
 *
 * **Inv-aware:** cooked food / many objs are non-stackable. A single
 * `give lobster 20` needs 20 free slots or later items never land (Flamtaer
 * oil kit lost tinder/plank). When free slots run out, remaining gives are
 * skipped and listed in the return value / warn log.
 *
 * @param {import('playwright').Page} page
 * @param {Array<[string, number]|{name:string, qty?:number}>} items
 * @param {{ waitScene?: boolean, failOnFull?: boolean }} [opts]
 *   waitScene default true; failOnFull default false (warn + skip)
 * @returns {Promise<string[]>} failed or skipped commands
 */
export async function giveItems(page, items, opts = {}) {
  const waitScene = opts.waitScene !== false;
  const failOnFull = opts.failOnFull === true;
  if (waitScene) {
    const ok = await waitSceneReady(page, 45_000);
    if (!ok) console.warn('giveItems: scene not ready after 45s — sending give anyway');
  }
  /** @type {string[]} */
  const failed = [];
  let free = await invFreeSlots(page);
  const worstCaseSlots = items.reduce((n, entry) => {
    const qty = Array.isArray(entry) ? entry[1] ?? 1 : entry.qty ?? 1;
    return n + Math.max(1, qty | 0);
  }, 0);
  if (free < worstCaseSlots) {
    console.warn(
      `[harness] giveItems: free=${free} slots, list wants ≤${worstCaseSlots} if non-stack — will stop when full`
    );
  }
  for (const entry of items) {
    const name = Array.isArray(entry) ? entry[0] : entry.name;
    let qty = Array.isArray(entry) ? entry[1] ?? 1 : entry.qty ?? 1;
    qty = Math.max(0, qty | 0);
    if (qty < 1) continue;
    free = await invFreeSlots(page);
    if (free < 1) {
      const skip = `give ${name} ${qty} (inv full)`;
      failed.push(skip);
      console.warn(`[harness] giveItems skip: ${skip}`);
      if (failOnFull) break;
      continue;
    }
    // Full qty in one cheat: stackables (runes) need 1 slot; engine stacks.
    // Min(qty, free) wrongly truncates stackable runes to free slots (e.g. air 500→28).
    const cmd = `give ${name} ${qty}`;
    if (!(await cheatQuiet(page, cmd, 280))) {
      failed.push(cmd);
      continue;
    }
    free = await invFreeSlots(page);
  }
  if (failed.length) console.warn('giveItems failed/skipped:', failed.join('; '));
  return failed;
}

/**
 * Full run energy + run on via content `[debugproc,energy]`.
 * Must be `~energy` (debugproc char); plain `energy` is a no-op.
 * Retries: p_finduid can fail if busy — drain dialogs first when possible.
 * @see docs/runbooks/harness.md § Test-speed cheats
 */
export async function fillRunEnergy(page, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    if (await cheatQuiet(page, '~energy', 500)) {
      // soft verify via client energy %
      const e = await page.evaluate(() => globalThis.__lc377?.reader?.energy?.() ?? -1);
      if (e < 0 || e >= 50) return true;
    }
    await page.waitForTimeout(400);
  }
  console.warn('fillRunEnergy: ~energy did not stick (busy? pack missing debugproc?)');
  return false;
}

/**
 * Engine `::tele level,mx,mz,lx,lz` from a world tile.
 * @see rs2b0t tools/tutorial/harness.ts teleCheat
 */
export function teleCheat(tile) {
  const level = tile.level ?? 0;
  return `tele ${level},${tile.x >> 6},${tile.z >> 6},${tile.x & 63},${tile.z & 63}`;
}

/**
 * getvar via CLIENT_CHEAT + chat mirror (server truth — not client varp[]).
 * Needed because many progress varps are not transmitted.
 * Retries: setstat spam can push the getvar line out of a tiny chat window.
 *
 * Side effect: authentic `::getvar` on a **protect** varp (or a varbit whose
 * basevar is protect) calls `closeModal`. Do not read those while a main IF
 * under test is open — click first, getvar after.
 */
export async function getServerVarQuiet(page, name, attempts = 4) {
  const want = `get ${String(name).toLowerCase()}:`;
  for (let a = 0; a < attempts; a++) {
    const sent = await page.evaluate(n => {
      const h = globalThis.__lc377;
      if (!h?.ingame?.() || !h?.cheat) return false;
      return h.cheat(`getvar ${n}`);
    }, name);
    if (!sent) {
      await page.waitForTimeout(400);
      continue;
    }
    await page.waitForTimeout(a === 0 ? 1000 : 700);
    const lines = await page.evaluate(() => {
      const r = globalThis.__lc377?.reader;
      if (typeof r?.chat === 'function') {
        return r.chat(40).map(c => String(c?.text ?? c ?? ''));
      }
      return [];
    });
    const line = (lines ?? []).find(t => String(t).toLowerCase().includes(want));
    if (!line) continue;
    // "get junglepotion: 12" or "get junglepotion: to 12"
    const m = String(line).match(/:\s*(?:to\s*)?(-?\d+)/i);
    if (!m) continue;
    const value = parseInt(m[1], 10);
    if (!Number.isNaN(value)) return value;
  }
  return null;
}

/** Lumbridge courtyard — same hop as rs2b0t mainlandAccount (not a tutorial walk). */
export const OFF_ISLAND_TELE = '0,50,50,20,20';

/**
 * Soft tele Lumbridge after thrash resume (steal / pin-no-steal).
 * Clears Castle Wars waiting room / last-fight dirt so product `pre_tele_checks`
 * (sigil, jewellery, …) are not blocked by `in_castlewars_*`.
 */
export async function softTeleLumbridge(page, reason = 'resume') {
  console.log(`[harness] soft tele Lumbridge (${reason}) ${OFF_ISLAND_TELE}`);
  await cheatQuiet(page, `tele ${OFF_ISLAND_TELE}`, 600);
  await page.waitForTimeout(800);
  await waitSceneReady(page, 25_000).catch(() => {});
  return worldTile(page);
}

/**
 * Rough tutorial-island AABB (not map-perfect). Used only to skip mainland prep
 * when a thrash pin sav already finished tutorial and is on the mainland.
 */
export function onTutorialIsland(tile) {
  if (!tile || tile.x == null || tile.z == null) return true;
  const x = tile.x | 0;
  const z = tile.z | 0;
  return x >= 3055 && x <= 3155 && z >= 3050 && z <= 3135;
}

/**
 * `logout:try_logout` — interface.pack id (same as rs2b0t / 274).
 * IF_BUTTON → content `[if_button,logout:try_logout]` → `p_logout` (clean server session).
 * Socket-drop `client.logout()` alone leaves the engine session hot → login reply 5 + long relog.
 */
export const LOGOUT_BUTTON_COM = 2458;

/** After clean p_logout — short settle before re-login (override RELOG_COOLDOWN_CLEAN_MS). */
const RELOG_COOLDOWN_CLEAN_MS = Number(process.env.RELOG_COOLDOWN_CLEAN_MS) || 2_000;
/**
 * After dirty kill / socket drop — player stays in World.playerLoop until
 * TIMEOUT_NO_RESPONSE (100 ticks) with no packet. At speed 600ms ≈ 60s; at
 * speed 300ms ≈ 30s.
 *
 * **Not a .sav flag** — `Player.save()` is pos/stats/vars/inv only.
 * With LOGIN_SERVER=false (isolation), LoginThread is file-mode and never
 * checks a logged_in bit; rejection is World RAM only (client reply 5).
 * With LOGIN_SERVER=true, `account_login.logged_in` in db.sqlite is the
 * multi-world lock (still not the sav).
 *
 * Prefer: clean IF logout before process exit. On reply 5, login() waits
 * dirty hold then retries. DIRTY_LOGIN_STEAL=1 is experimental only.
 * Override RELOG_COOLDOWN_MS.
 */
const RELOG_COOLDOWN_DIRTY_MS = Number(process.env.RELOG_COOLDOWN_MS) || 65_000;
const RELOG_PROBE_MS = Number(process.env.RELOG_PROBE_MS) || 5_000;
const RELOG_RETRY_MS = Number(process.env.RELOG_RETRY_MS) || 3_000;
const RELOG_BUDGET_MS = Number(process.env.RELOG_BUDGET_MS) || 120_000;

/** Wall-clock wait after unclean thrash kill before re-using the same username. */
export function dirtyLogoutHoldMs() {
  return RELOG_COOLDOWN_DIRTY_MS;
}

/**
 * Clean logout via game IF button (preferred). Falls back to socket-drop client.logout.
 * Harness-only test tool — not a bot-script corpus primitive; keep severable for rs2b0t forward-port.
 *
 * @returns {{ clean: boolean, sent: boolean }}
 * @see rs2b0t tools/lib/harness.ts logout
 */
export async function logoutSafe(page, waitMs = 8_000) {
  const sent = await page.evaluate(com => {
    const a = globalThis.__lc377?.actions;
    // Prefer IF_BUTTON p_logout; attach also exposes logout() which tries this first.
    if (a?.ifButton?.(com)) return true;
    return globalThis.__lc377?.logout?.() === true;
  }, LOGOUT_BUTTON_COM);

  if (!sent) {
    return { clean: false, sent: false };
  }

  const left = await page
    .waitForFunction(() => !globalThis.__lc377?.ingame?.(), undefined, { timeout: waitMs })
    .then(() => true)
    .catch(() => false);

  // Heuristic: if we left ingame within a few seconds, treat as clean p_logout path.
  // Dirty socket close often still needs the long session-hold cooldown even if client clears.
  const clean = left;
  return { clean, sent: true };
}

/**
 * Logout + login again (tutorial UI lock / side icons refresh at login).
 * Prefers clean IF logout so mainlandAccount does not burn ~20s+ on dirty session hold.
 * @see rs2b0t tools/tutorial/harness.ts relog
 */
export async function relog(page, user, pass = 'test') {
  const lo = await logoutSafe(page, 8_000);
  const cooldown = lo.clean ? RELOG_COOLDOWN_CLEAN_MS : RELOG_COOLDOWN_DIRTY_MS;
  console.log(
    `  relog: logout clean=${lo.clean} sent=${lo.sent} → wait ${Math.round(cooldown / 1000)}s ` +
      `(clean IF vs dirty World hold; cold reconnect is not used)`
  );

  if (!lo.clean) {
    // Ensure client leaves ingame even if IF path failed mid-flight
    await page.evaluate(() => globalThis.__lc377?.logout?.());
    await page
      .waitForFunction(() => !globalThis.__lc377?.ingame?.(), undefined, { timeout: 12_000 })
      .catch(() => {});
  }

  await page.waitForTimeout(cooldown);
  await boot(page);

  const deadline = Date.now() + RELOG_BUDGET_MS;
  let attempt = 0;
  for (;;) {
    attempt++;
    const r = await loginInject(page, user, pass);
    if (r.ok) {
      console.log(`  relog: back ingame (attempt ${attempt})`);
      return;
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `relog: could not log back in as '${user}' after ${attempt} attempts / ${Math.round(RELOG_BUDGET_MS / 1000)}s`
      );
    }
    if (attempt === 1 || attempt % 3 === 0) {
      console.log(`  relog: attempt ${attempt} not ingame yet — retry (alreadyLoggedIn=${!!r.alreadyLoggedIn})`);
    }
    await page.waitForTimeout(RELOG_RETRY_MS);
  }
}

/**
 * New account → mainland without running TutorialBot.
 *
 * Pattern from rs2b0t `tools/tutorial/harness.ts` mainlandAccount:
 *   1. boot + login
 *   2. CLIENT_CHEAT tele off island + setvar tutorial 1000 (with getvar verify)
 *   3. relog so side icons / tutorial UI lock refresh
 *
 * **Resume steal path** (dirty World ghost → s1-then-inject): login already
 * unequipAll + clearinv. Skip tutorial setvar + relog (pin already mainlanded;
 * stats/quest vars kept). Smokes re-seed inv as needed.
 *
 * **Thrash/pinned sav fast path:** if `tutorial` already 1000 and tile is not
 * tutorial island, skip setvar + tele + relog (~15–30s). Force full path:
 * `MAINLAND_FORCE_FULL=1`.
 *
 * Uses packet cheats, not keyboard `::…` (island chat eats keystrokes).
 *
 * @param {import('playwright').Page} page already at harness.html after boot()
 * @param {string} user
 * @param {string} [pass='test']
 */
export async function mainlandAccount(page, user, pass = 'test') {
  // Node console → headed panel LogBus (smokes rarely call thrashPoint)
  installSmokePanelMirror(page);
  console.log(`mainlandAccount: login as '${user}'`);
  if (!(await login(page, user, pass))) {
    const diag = await sceneDiag(page).catch(() => null);
    const mes = await loginMes(page);
    // Distinguish title "Connecting…" from stuck post-login sceneState=1
    throw new Error(
      `mainlandAccount: login did not reach scene 2 within ${LOGIN_MS}ms — ` +
        `loginMes='${mes}' diag=${diag ? JSON.stringify(diag) : 'n/a'}`
    );
  }

  if (await didResumeSteal(page)) {
    // Already wiped in login(); thrash pin keeps tutorial/stats/quest — just settle scene.
    if (!(await waitSceneReady(page, 60_000))) {
      console.warn('mainlandAccount: resume steal sceneState not 2 — continuing carefully');
    }
    // Leave CW / minigame / last thrash tile so product teles (sigil, etc.) work.
    await softTeleLumbridge(page, 'resume steal');
    const tile = await worldTile(page);
    console.log(
      `mainlandAccount: resume steal ready tile=${tile ? `${tile.x},${tile.z}` : '?'} ` +
        `(wiped inv/worn; Lumb tele; skipped tutorial setvar + relog)`
    );
    return tile;
  }

  // Steal failed / off: thrash pin sav can still wear CW Hooded cloak etc.
  // ~clearinv alone does not unequip — strip when tutorial already complete (reused sav).
  const tutProbe = await getServerVarQuiet(page, 'tutorial').catch(() => null);
  if (Number(tutProbe) === 1000) {
    await wipeInvAndWorn(page, 'pin-no-steal');
  }

  const forceFull =
    process.env.MAINLAND_FORCE_FULL === '1' || process.env.MAINLAND_FORCE_FULL === 'true';

  // Thrash pins: sav already finished tutorial and sits on mainland — skip setvar+relog tax.
  if (!forceFull) {
    const tutNow = Number(tutProbe) === 1000 ? 1000 : await getServerVarQuiet(page, 'tutorial').catch(() => null);
    const tileNow = await worldTile(page);
    if (Number(tutNow) === 1000 && tileNow && !onTutorialIsland(tileNow)) {
      if (!(await waitSceneReady(page, 45_000))) {
        console.warn('mainlandAccount: sceneState not 2 (skip-mainland) — continuing carefully');
      }
      // Cold pin login also lands on last sav tile (often Castle Wars thrash dirt).
      await softTeleLumbridge(page, 'pin-no-steal cold resume');
      const tile = await worldTile(page);
      console.log(
        `mainlandAccount: skip prep (tutorial=1000 already) — wiped inv/worn; soft Lumb tele; ` +
          `tile=${tile ? `${tile.x},${tile.z}` : '?'}`
      );
      return tile;
    }
    if (Number(tutNow) === 1000 && tileNow && onTutorialIsland(tileNow)) {
      console.log(
        `mainlandAccount: tutorial=1000 but still on island tile=${tileNow.x},${tileNow.z} — tele only + relog`
      );
      if (!(await cheatQuiet(page, `tele ${OFF_ISLAND_TELE}`))) {
        throw new Error('mainlandAccount: tele not sent (not ingame?)');
      }
      await page.waitForTimeout(900);
      await relog(page, user, pass);
      if (!(await waitSceneReady(page, 60_000))) {
        console.warn('mainlandAccount: sceneState not 2 after tele+relog — continuing carefully');
      }
      // Relog can restore worn from sav — wipe again after back
      await wipeInvAndWorn(page, 'pin-after-relog');
      const tile = await worldTile(page);
      console.log(
        `mainlandAccount: ready (scene 2) tile=${tile ? `${tile.x},${tile.z}` : '?'} (tele+relog, skipped setvar, wiped gear)`
      );
      return tile;
    }
  }

  console.log(`mainlandAccount: tele ${OFF_ISLAND_TELE} + setvar tutorial 1000`);
  if (!(await cheatQuiet(page, `tele ${OFF_ISLAND_TELE}`))) {
    throw new Error('mainlandAccount: tele not sent (not ingame?)');
  }
  await page.waitForTimeout(900);

  let tut = null;
  for (let attempt = 0; attempt < 4 && tut !== 1000; attempt++) {
    if (attempt > 0) await page.waitForTimeout(600);
    if (!(await cheatQuiet(page, 'setvar tutorial 1000'))) {
      throw new Error('mainlandAccount: setvar tutorial not sent');
    }
    tut = await getServerVarQuiet(page, 'tutorial');
  }
  if (tut !== 1000) {
    throw new Error(
      `mainlandAccount: setvar tutorial 1000 did not stick (getvar=${tut}) — still on-island?`
    );
  }

  await relog(page, user, pass);

  // relog ends at ingame+scene2 probe, but reload/tele often leave a short 1→2 window
  if (!(await waitSceneReady(page, 60_000))) {
    console.warn('mainlandAccount: sceneState not 2 after relog — continuing carefully');
  }

  const tile = await worldTile(page);
  console.log(
    `mainlandAccount: ready (scene 2) tile=${tile ? `${tile.x},${tile.z}` : '?'} (tabs unlocked via relog)`
  );
  return tile;
}

/**
 * Teleport and wait until within radius of world tile.
 * Retries: L1 map load + scene rebuild can miss a single teleJump.
 *
 * **Stand tile discipline:** pass a **walkable** tile next to the interaction loc,
 * not the scenery’s own coords (altars / walls / booths are often unwalkable).
 * Keep separate `*_ALTAR` / `*_LOC` vs `*_STAND` / `*_COURTYARD` constants.
 * @see docs/research/game-knowledge/harness-tele-stand.md
 * @see rs2b0t teleTo
 */
export async function teleTo(page, tile, radius = 8, timeoutMs = 25_000) {
  const level = tile.level ?? 0;
  const cheat = teleCheat(tile);
  const attempts = 3;
  const perTry = Math.max(8_000, Math.floor(timeoutMs / attempts));

  for (let a = 0; a < attempts; a++) {
    // Drop any modal that would make engine tele return "finish what you are doing"
    await page.evaluate(() => globalThis.__lc377?.actions?.closeModal?.()).catch(() => {});
    await page.waitForTimeout(150);

    if (!(await cheatQuiet(page, cheat, 600))) {
      console.warn(`teleTo: cheat not sent (${cheat}) attempt ${a + 1}`);
      continue;
    }

    // Scene may go 1→2 while maps load after plane change
    await page
      .waitForFunction(
        () => {
          const h = globalThis.__lc377;
          return h?.ingame?.() && (h.sceneState?.() ?? 0) >= 1;
        },
        undefined,
        { timeout: 8_000 }
      )
      .catch(() => {});

    try {
      await page.waitForFunction(
        ([x, z, lvl, r]) => {
          const t = globalThis.__lc377?.worldTile?.();
          if (!t) return false;
          if ((t.level ?? 0) !== (lvl ?? 0)) return false;
          const dx = t.x - x;
          const dz = t.z - z;
          return dx * dx + dz * dz <= r * r;
        },
        [tile.x, tile.z, level, radius],
        { timeout: perTry }
      );
      // Tile match ≠ maps built — wait scene 2 before host/bot world ops or item seeds
      // Cap scene wait so multi-tele mid-gates don't stack 3×90s hangs
      const sceneMs = Math.min(
        Number(process.env.SCENE_READY_MS) > 0 ? Number(process.env.SCENE_READY_MS) : 25_000,
        Math.max(12_000, perTry)
      );
      const sceneOk = await waitSceneReady(page, sceneMs);
      if (!sceneOk) {
        console.warn(
          `teleTo: at tile but scene not 2 after attempt ${a + 1} (cheat=${cheat}) — retry/fail-fast`
        );
        continue;
      }
      return true;
    } catch {
      const here = await worldTile(page);
      const ss = await page
        .evaluate(() => globalThis.__lc377?.sceneState?.() ?? null)
        .catch(() => null);
      console.warn(
        `teleTo: not at ${tile.x},${tile.z},L${level} after attempt ${a + 1} ` +
          `(here=${here ? `${here.x},${here.z},L${here.level ?? 0}` : 'null'} scene=${ss})`
      );
    }
  }
  return false;
}

export async function walkRel(page, dx, dz) {
  return page.evaluate(([x, z]) => globalThis.__lc377?.walkRel(x, z) ?? false, [dx, dz]);
}

export async function worldTile(page) {
  return page.evaluate(() => globalThis.__lc377?.worldTile() ?? null);
}

export async function loginMes(page) {
  return page.evaluate(() => globalThis.__lc377?.loginMes() ?? '');
}

export async function menuAction(page, action, a, b, c) {
  return page.evaluate(
    ([act, aa, bb, cc]) => globalThis.__lc377?.menuAction(act, aa, bb, cc) ?? false,
    [action, a, b, c]
  );
}

/** Client var mirror; tutorial progress = varp 281. */
export async function varp(page, id) {
  return page.evaluate(i => globalThis.__lc377?.varp(i) ?? -1, id);
}

export async function snapshot(page) {
  return page.evaluate(() => globalThis.__lc377?.snapshot?.() ?? null);
}

/**
 * Dense thrash datapoint for productive headed sessions.
 *
 * Pulls client thrashSnap (tile, free, inv, worn, npcNames+dist, ground, chat,
 * combat flags) + host `extra` (stage, phase, action, stick, …). Logs one line:
 *   [thrash] {"tag":"mortton-remains","stage":70,...}
 *
 * Env:
 *   THRASH_NDJSON=path  — append NDJSON for offline grepping
 *   THRASH_POINT=0      — disable logging (still returns object)
 *
 * @param {import('playwright').Page} page
 * @param {string} tag short phase id e.g. mortton-remains
 * @param {Record<string, unknown>} [extra] host-side fields
 * @returns {Promise<object|null>}
 */
/**
 * Push a host smoke line into the in-page panel LogBus + cliResidual.host.
 * Fire-and-forget; safe if page is mid-nav.
 * @param {import('playwright').Page} page
 * @param {string} msg
 * @param {'info'|'warn'|'error'} [level]
 */
export function panelLog(page, msg, level = 'info') {
  if (!page || page.isClosed?.()) return;
  const text = String(msg ?? '').slice(0, 420);
  if (!text) return;
  page
    .evaluate(
      ({ m, lv }) => {
        const bus = globalThis.__harnessLogBus;
        if (bus?.add) bus.add(lv === 'warn' || lv === 'error' ? lv : 'info', m);
        const h = globalThis.__lc377;
        if (h) {
          const prev = h.cliResidual && typeof h.cliResidual === 'object' ? h.cliResidual : {};
          h.cliResidual = {
            ...prev,
            host: m,
            at: Date.now()
          };
        }
      },
      { m: text, lv: level }
    )
    .catch(() => {});
}

/** Lines from Node smoke console that should show in the headed panel. */
const PANEL_MIRROR_RE =
  /\[thrash\]|\[harness\]|\[mm\]|\[mm-|\[quest-|\[reg|\[misc|\[myre|\[nav|\[slayer|\[farm|RESULT:|FAIL:|PASS \(|SOFT |product |useOn|use bar|useHeld|tele |mainlandAccount|stealGhost|pack health|login|greegree|firewall|enchanted|Wall of flame|OPLOCU|OPNPCU|missingModels|sceneState|STUCK/i;

/**
 * Mirror matching Node `console.log/warn/error` into the page panel LogBus.
 * Call once after `newPage()` + before long thrash. Disable: `PANEL_MIRROR=0`.
 * @param {import('playwright').Page} page
 */
export function installSmokePanelMirror(page) {
  if (process.env.PANEL_MIRROR === '0' || process.env.PANEL_MIRROR === 'false') return;
  if (page.__smokePanelMirror) return;
  page.__smokePanelMirror = true;

  const wrap =
    (level, orig) =>
    (...args) => {
      orig(...args);
      try {
        const msg = args
          .map(a => {
            if (typeof a === 'string') return a;
            if (a && typeof a === 'object') {
              try {
                return JSON.stringify(a);
              } catch {
                return String(a);
              }
            }
            return String(a);
          })
          .join(' ');
        if (level === 'info' && !PANEL_MIRROR_RE.test(msg)) return;
        panelLog(page, msg, level);
      } catch {
        /* ignore */
      }
    };

  console.log = wrap('info', console.log.bind(console));
  console.info = wrap('info', console.info.bind(console));
  console.warn = wrap('warn', console.warn.bind(console));
  console.error = wrap('error', console.error.bind(console));
}

export async function thrashPoint(page, tag, extra = {}) {
  if (process.env.THRASH_POINT === '0' || process.env.THRASH_POINT === 'false') {
    return null;
  }
  let snap = null;
  try {
    snap = await page.evaluate(opts => {
      const h = globalThis.__lc377;
      if (typeof h?.thrashSnap === 'function') return h.thrashSnap(opts);
      if (typeof h?.snapshot === 'function') return h.snapshot();
      return null;
    }, extra.snapOpts || {});
  } catch (e) {
    snap = { err: String(e?.message || e) };
  }
  const row = {
    tag: String(tag || 'thrash'),
    ...snap,
    ...extra,
    // don't re-embed opts in file
    snapOpts: undefined
  };
  delete row.snapOpts;
  const line = JSON.stringify(row);
  console.log(`[thrash] ${line}`);
  // Compact one-liner for the in-page panel log (full JSON stays Node/NDJSON).
  const panelLine = compactThrashLine(row);
  // Panel CLI residual block (multi-line; no Start/Stop) — keep fields readable.
  const act =
    row.pour?.action ||
    row.step?.action ||
    row.action ||
    row.phase ||
    null;
  const detailBits = [];
  if (row.pour && typeof row.pour === 'object') {
    const p = row.pour;
    for (const k of ['wall', 'broken', 'op', 'flaming', 'name', 'sancP', 'sancRaw']) {
      if (p[k] != null && p[k] !== '') detailBits.push(`${k}=${p[k]}`);
    }
  }
  if (row.sanc && typeof row.sanc === 'object') {
    if (row.sanc.p != null) detailBits.push(`sancP=${row.sanc.p}`);
    if (row.sanc.raw != null) detailBits.push(`sanc=${row.sanc.raw}`);
  }
  const status = {
    tag: String(tag || 'thrash'),
    phase: row.phase ?? null,
    action: act,
    stage: row.stage ?? null,
    t: row.t ?? null,
    tile: row.tile ? `${row.tile.x},${row.tile.z}` : null,
    free: row.free ?? null,
    detail: detailBits.length ? detailBits.join(' ') : null,
    at: Date.now()
  };
  try {
    await page.evaluate(
      ({ msg, status: st }) => {
        const h = globalThis.__lc377;
        if (h) h.cliResidual = st;
        const bus = globalThis.__harnessLogBus;
        if (bus?.add) bus.add('info', msg);
        else if (h?.log) h.log('info', msg);
        else console.log(msg);
      },
      { msg: panelLine, status }
    );
  } catch {
    /* page closed */
  }
  const nd = process.env.THRASH_NDJSON;
  if (nd) {
    try {
      const fs = await import('node:fs/promises');
      await fs.appendFile(nd, line + '\n');
    } catch (e) {
      console.warn('[thrash] NDJSON append failed', e?.message || e);
    }
  }
  return row;
}

/** Human panel line from a thrash row (keep short). */
export function compactThrashLine(row) {
  if (!row || typeof row !== 'object') return String(row ?? '');
  const t = row.tile ? `${row.tile.x},${row.tile.z}` : '?';
  const has = row.has
    ? Object.entries(row.has)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(',')
    : '';
  const npcs = row.npcNames
    ? Object.entries(row.npcNames)
        .map(([k, v]) => `${k}×${v}`)
        .join(' ')
    : '';
  const act =
    row.pour?.action ||
    row.step?.action ||
    row.action ||
    row.phase ||
    row.tag ||
    'thrash';
  const st = row.stage != null ? `s${row.stage}` : '';
  const tick = row.t != null ? `t${row.t}` : '';
  const free = row.free != null ? `free=${row.free}` : '';
  const inv =
    Array.isArray(row.inv) && row.inv.length
      ? `inv=${row.inv
          .slice(0, 5)
          .map(n => String(n).slice(0, 16))
          .join(',')}`
      : '';
  const locs =
    Array.isArray(row.locs) && row.locs.length
      ? `locs=${row.locs
          .slice(0, 4)
          .map(l => l?.name || `id${l?.id}`)
          .join(',')}`
      : '';
  return [act, st, tick, `@${t}`, free, has && `[${has}]`, npcs, inv, locs]
    .filter(Boolean)
    .join(' ')
    .slice(0, 380);
}

/**
 * Smoke fail-fast budget (rs2b0t-style: budget vs silent spin).
 *
 * Env:
 *   SMOKE_BUDGET_MS   — absolute wall deadline from createSmokeBudget() (default 180000)
 *   SMOKE_STEP_MS     — default per-step budget for withStepBudget (default 45000)
 *
 * Prefer failing a step in 10–45s over stacking 8×25s waitSceneReady in a maze thrash.
 */
export function createSmokeBudget(totalMs) {
  const total =
    totalMs ??
    (Number(process.env.SMOKE_BUDGET_MS) > 0 ? Number(process.env.SMOKE_BUDGET_MS) : 180_000);
  const t0 = Date.now();
  return {
    totalMs: total,
    remaining() {
      return total - (Date.now() - t0);
    },
    check(label = 'step') {
      const left = total - (Date.now() - t0);
      if (left <= 0) {
        throw new Error(`[smoke] BUDGET EXCEEDED at ${label} (total ${total}ms)`);
      }
      return left;
    }
  };
}

/**
 * Run fn with a wall-clock cap. On timeout throws (fail-fast — do not hang the agent).
 * @param {string} label
 * @param {number} ms
 * @param {() => Promise<T>} fn
 */
export async function withStepBudget(label, ms, fn) {
  const cap =
    ms ??
    (Number(process.env.SMOKE_STEP_MS) > 0 ? Number(process.env.SMOKE_STEP_MS) : 45_000);
  let timer;
  try {
    return await Promise.race([
      fn(),
      new Promise((_, rej) => {
        timer = setTimeout(
          () => rej(new Error(`[smoke] STEP TIMEOUT ${label} after ${cap}ms`)),
          cap
        );
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Wait until tile changes (portal/ladder hop). Fail-fast if stuck.
 * @returns {Promise<boolean>} true if tile moved
 */
export async function waitTileChange(page, fromTile, timeoutMs = 8_000) {
  const ms = Math.max(1_000, timeoutMs | 0);
  const fx = fromTile?.x;
  const fz = fromTile?.z;
  const fl = fromTile?.level ?? 0;
  try {
    await page.waitForFunction(
      ([x, z, lvl]) => {
        const t = globalThis.__lc377?.worldTile?.();
        if (!t) return false;
        return t.x !== x || t.z !== z || (t.level ?? 0) !== lvl;
      },
      [fx, fz, fl],
      { timeout: ms }
    );
    return true;
  } catch {
    const here = await page.evaluate(() => globalThis.__lc377?.worldTile?.()).catch(() => null);
    console.warn(
      `[harness] waitTileChange FAIL ${ms}ms from=${fx},${fz},L${fl} here=${
        here ? `${here.x},${here.z},L${here.level ?? 0}` : 'null'
      }`
    );
    return false;
  }
}

/**
 * Wait until sceneState === 2 (maps built). Default timeout from
 * `SCENE_READY_MS` (env) or 45s — short enough that agents fail-fast instead of
 * hanging 90s+ on versionlist/scene-1 stuck (see plans/2026-08-05-scene-stuck-versionlist-zero.md).
 *
 * On failure logs ingame/sceneState/tile once so hosts can exit without thrash.
 */
export async function waitSceneReady(page, timeoutMs) {
  const ms =
    timeoutMs ??
    (Number(process.env.SCENE_READY_MS) > 0 ? Number(process.env.SCENE_READY_MS) : 45_000);
  try {
    await page.waitForFunction(
      () => {
        const h = globalThis.__lc377;
        return h && h.ingame() && h.sceneState() === 2;
      },
      undefined,
      { timeout: ms }
    );
    return true;
  } catch {
    const diag = await page
      .evaluate(() => {
        const h = globalThis.__lc377;
        if (!h) return { error: 'no __lc377' };
        const t = h.worldTile?.() ?? null;
        return {
          ingame: !!h.ingame?.(),
          sceneState: h.sceneState?.() ?? null,
          tile: t,
          loginMes: typeof h.loginMes === 'function' ? h.loginMes() : null
        };
      })
      .catch(e => ({ error: String(e?.message ?? e) }));
    console.warn(
      `[harness] waitSceneReady FAIL after ${ms}ms — scene stuck? ` + JSON.stringify(diag)
    );
    console.warn(
      '[harness] if sceneState=1 forever: check /versionlist model ver=0 ' +
        '(docs/plans/2026-08-05-scene-stuck-versionlist-zero.md); ' +
        'bash scripts/kill-harness-smoke.sh to free headed Chromium'
    );
    return false;
  }
}

/**
 * Still connected? Connection-lost clears ingame.
 * sceneState may be 1 while maps load after tele — that is OK.
 */
export async function stillAlive(page) {
  return page.evaluate(() => !!globalThis.__lc377?.ingame());
}

/**
 * Make a per-run shot directory: docs/plans/harness-shots/<runId>/
 * @param {string} [runId] default: ISO-ish + random
 */
export async function createShotRunDir(runId) {
  const id =
    runId ??
    `${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}_${Math.random().toString(36).slice(2, 7)}`;
  const dir = path.join(DEFAULT_SHOT_DIR, id);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function safeLabel(label) {
  return String(label || 'shot')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 80);
}

/**
 * Capture Playwright page (+ optional client snapshot JSON beside PNG).
 * @returns {Promise<string|null>} absolute path to PNG
 */
export async function screenshotPage(page, shotDir, label, opts = {}) {
  if (!page || page.isClosed?.()) return null;
  const dir = shotDir || DEFAULT_SHOT_DIR;
  await fs.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const base = `${stamp}_${safeLabel(label)}`;
  const pngPath = path.join(dir, `${base}.png`);
  try {
    await page.screenshot({ path: pngPath, fullPage: !!opts.fullPage });
  } catch (e) {
    console.warn(`[harness] screenshot failed (${label}):`, e?.message ?? e);
    return null;
  }

  if (opts.meta !== false) {
    try {
      const snap = await page.evaluate(() => {
        const r = globalThis.__lc377?.reader;
        if (!r) return null;
        return {
          tile: r.worldTile?.() ?? null,
          tutorial: r.tutorial?.() ?? r.varp?.(281) ?? null,
          inv: (r.inventory?.() ?? []).map(i =>
            i ? `${i.name ?? '?'}#${i.id}@${i.slot}` : null
          ).filter(Boolean),
          npcs: (r.npcs?.() ?? []).slice(0, 12).map(n => n?.name),
          doors: (r.locs?.({ maxDist: 12 }) ?? [])
            .filter(l => /door|gate/i.test(String(l?.name ?? '')))
            .map(l => ({ name: l.name, x: l.x, z: l.z, id: l.id, d: l.distance, ops: l.ops })),
          skills: {
            cooking: r.stat?.(7)?.xp,
            firemaking: r.stat?.(11)?.xp,
            smithing: r.stat?.(13)?.xp,
            mining: r.stat?.(14)?.xp
          },
          loopCycle: r.loopCycle?.() ?? null
        };
      });
      if (snap) {
        await fs.writeFile(path.join(dir, `${base}.json`), JSON.stringify(snap, null, 2));
      }
    } catch {
      /* ignore meta failures */
    }
  }

  console.log(`[harness] shot ${pngPath}`);
  return pngPath;
}

/**
 * Bridge so in-page scripts can request shots:
 *   await globalThis.__harnessShot('chef-door-stall')
 *
 * Also installs a Node-side stall poller handle via returned API.
 *
 * @param {import('playwright').Page} page
 * @param {string} shotDir
 * @returns {Promise<{ shot: (label:string)=>Promise<string|null>, dir: string }>}
 */
export async function installScreenshotBridge(page, shotDir) {
  const dir = shotDir || (await createShotRunDir());
  // exposeFunction may already exist if page reused — ignore re-bind errors
  try {
    await page.exposeFunction('__harnessShotNode', async label => {
      return screenshotPage(page, dir, label);
    });
  } catch {
    /* already exposed on this page */
  }

  await page.evaluate(() => {
    // Thin browser wrapper (scripts call this)
    globalThis.__harnessShot = async label => {
      const fn = globalThis.__harnessShotNode;
      if (typeof fn !== 'function') return null;
      try {
        return await fn(String(label || 'shot'));
      } catch {
        return null;
      }
    };
  });

  return {
    dir,
    shot: label => screenshotPage(page, dir, label)
  };
}
