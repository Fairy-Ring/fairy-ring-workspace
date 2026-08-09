/**
 * Thin live-harness helpers (rs2b0t tools/lib/harness.ts shape).
 *
 * Lives under tools/ — never inside vendor/client-ts.
 * Requires: engine :81, client build:dev deploy, page URL with ?harness=1
 * so rs2.html keeps a Client ref and loads tools/harness attach.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SMOKE_PKG = path.join(ROOT, 'tools/client-smoke');

/** Playwright profile — IndexedDB `lostcity` ondemand cache survives between runs (274-style). */
export const DEFAULT_HARNESS_PROFILE = path.join(ROOT, '.tmp/playwright-harness-profile');

export function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

export function parseArgs(argv, defaults = {}) {
  let base;
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base' && i + 1 < argv.length) {
      base = argv[++i];
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
 * Resolve credentials: explicit argv → SMOKE_USER/PASS → fresh random.
 * Prefer random so sav state never poisons smokes (rs2b0t style).
 *
 * @param {string[]} rest positional [user, pass] from parseArgs
 * @param {string} [prefix='h']
 */
export function resolveAccount(rest = [], prefix = 'h') {
  if (rest[0]) {
    return {
      username: String(rest[0]).slice(0, 12),
      password: rest[1] ?? process.env.SMOKE_PASS ?? 'test'
    };
  }
  if (process.env.SMOKE_USER) {
    return {
      username: String(process.env.SMOKE_USER).slice(0, 12),
      password: process.env.SMOKE_PASS ?? 'test'
    };
  }
  return freshAccount(prefix);
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
export async function launchBrowser() {
  const { chromium } = loadPlaywright();
  const headed = wantHeaded();
  const slowMo = headed ? Number(process.env.SLOWMO ?? 200) : 0;

  if (process.env.HARNESS_EPHEMERAL === '1') {
    console.log(`[harness] ephemeral browser headed=${headed} (no profile — cold ondemand)`);
    return chromium.launch({ headless: !headed, slowMo });
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
    viewport: HARNESS_VIEWPORT
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

/**
 * Login via Client.login inject (rs2b0t tools/lib/harness.ts).
 *
 *   await page.evaluate → client.loginUser/loginPass + void client.login(u,p,false)
 *
 * Default for harness client. Opt into old canvas typing with TITLE_LOGIN=1
 * if you need to exercise the title screen UI.
 */
export async function login(page, user, pass = 'test') {
  if (process.env.TITLE_LOGIN === '1' || process.env.TITLE_LOGIN === 'true') {
    return loginTitleUi(page, user, pass);
  }
  return loginInject(page, user, pass);
}

/** rs2b0t-style inject — no canvas clicks. */
export async function loginInject(page, user, pass = 'test') {
  await page.waitForFunction(() => !!globalThis.__lc377?.ok, undefined, { timeout: 30_000 });
  const dispatched = await page.evaluate(
    ([u, p]) => {
      const h = globalThis.__lc377;
      if (h?.login) return h.login(u, p, false);
      // Fallback: dig client on abi
      const c = h?.client;
      if (!c?.login) return false;
      c.loginUser = u;
      c.loginPass = p;
      void c.login(u, p, false);
      return true;
    },
    [String(user).slice(0, 12), String(pass ?? 'test')]
  );
  if (!dispatched) {
    console.warn('[harness] login inject not dispatched — falling back to title UI');
    return loginTitleUi(page, user, pass);
  }
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
    // Often: already ingame but stuck sceneState=1 (ondemand). loginMes may still say
    // "Connecting to server..." — dump real scene diag so we don't misread the failure.
    const diag = await sceneDiag(page).catch(() => null);
    console.warn(
      `[harness] login wait timed out after ${LOGIN_MS}ms (want ingame+scene 2):`,
      diag ? JSON.stringify(diag) : await loginMes(page)
    );
    return false;
  }
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
  return true;
}

/**
 * `::give <item> [amount]` — setup seed only (Decision 004).
 * Prefer calling after waitSceneReady when the bot will immediately use items
 * (scene=1 can drop inventory refresh / OP use-with thrash).
 * @param {import('playwright').Page} page
 * @param {Array<[string, number]|{name:string, qty?:number}>} items
 * @param {{ waitScene?: boolean }} [opts] default waitScene=true
 */
export async function giveItems(page, items, opts = {}) {
  const waitScene = opts.waitScene !== false;
  if (waitScene) {
    const ok = await waitSceneReady(page, 45_000);
    if (!ok) console.warn('giveItems: scene not ready after 45s — sending give anyway');
  }
  /** @type {string[]} */
  const failed = [];
  for (const entry of items) {
    const name = Array.isArray(entry) ? entry[0] : entry.name;
    const qty = Array.isArray(entry) ? entry[1] ?? 1 : entry.qty ?? 1;
    const cmd = `give ${name} ${qty | 0}`;
    if (!(await cheatQuiet(page, cmd, 300))) failed.push(cmd);
  }
  if (failed.length) console.warn('giveItems failed:', failed.join('; '));
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
 * `logout:try_logout` — interface.pack id (same as rs2b0t / 274).
 * IF_BUTTON → content `[if_button,logout:try_logout]` → `p_logout` (clean server session).
 * Socket-drop `client.logout()` alone leaves the engine session hot → login reply 5 + long relog.
 */
export const LOGOUT_BUTTON_COM = 2458;

/** After clean p_logout — short settle before re-login (override RELOG_COOLDOWN_CLEAN_MS). */
const RELOG_COOLDOWN_CLEAN_MS = Number(process.env.RELOG_COOLDOWN_CLEAN_MS) || 2_000;
/** After dirty/socket logout — engine may hold the player (override RELOG_COOLDOWN_MS). */
const RELOG_COOLDOWN_DIRTY_MS = Number(process.env.RELOG_COOLDOWN_MS) || 20_000;
const RELOG_PROBE_MS = Number(process.env.RELOG_PROBE_MS) || 5_000;
const RELOG_RETRY_MS = Number(process.env.RELOG_RETRY_MS) || 3_000;
const RELOG_BUDGET_MS = Number(process.env.RELOG_BUDGET_MS) || 120_000;

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
    `  relog: logout clean=${lo.clean} sent=${lo.sent} → probe from ${Math.round(cooldown / 1000)}s ` +
      `(RELOG_COOLDOWN_CLEAN_MS / RELOG_COOLDOWN_MS / RELOG_PROBE_MS / RELOG_RETRY_MS / RELOG_BUDGET_MS)`
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
    await page.evaluate(
      ([u, p]) => globalThis.__lc377?.login?.(u, p, false),
      [String(user).slice(0, 12), String(pass ?? 'test')]
    );
    const ok = await page
      .waitForFunction(
        () => {
          const h = globalThis.__lc377;
          return h && h.ingame() && h.sceneState() === 2;
        },
        undefined,
        { timeout: RELOG_PROBE_MS }
      )
      .then(() => true)
      .catch(() => false);
    if (ok) {
      console.log(`  relog: back ingame (attempt ${attempt})`);
      return;
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `relog: could not log back in as '${user}' after ${attempt} attempts / ${Math.round(RELOG_BUDGET_MS / 1000)}s`
      );
    }
    if (attempt === 1 || attempt % 3 === 0) {
      console.log(`  relog: attempt ${attempt} not ingame yet — retry`);
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
 * Uses packet cheats, not keyboard `::…` (island chat eats keystrokes).
 *
 * @param {import('playwright').Page} page already at harness.html after boot()
 * @param {string} user
 * @param {string} [pass='test']
 */
export async function mainlandAccount(page, user, pass = 'test') {
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

/** Default shot root — local only (docs/ is gitignored). */
export const DEFAULT_SHOT_DIR = path.join(ROOT, 'docs/plans/harness-shots');

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
