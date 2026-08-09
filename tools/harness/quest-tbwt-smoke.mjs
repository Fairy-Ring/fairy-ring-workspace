#!/usr/bin/env node
/**
 * E2E smoke: Tai Bwo Wannai Trio via harness quest template.
 *
 * Account prep follows **rs2b0t aio-quest-test / mainlandAccount** pattern
 * (Node host, packet cheats, getvar verify) — **not** in-script setvar loops.
 *
 *   HEADED=1 node tools/harness/quest-tbwt-smoke.mjs
 *   node tools/harness/quest-tbwt-smoke.mjs --max-ms 600000
 *
 * Sequence:
 *   1. boot + mainlandAccount (tele off island + tutorial=1000 + relog)
 *   2. setstat — official reqs + practical combat/FM (not min-only)
 *   3. setvar junglepotion 12 + tbwt_* reset (getvar verify on server)
 *   4. tele Timfraku hut upstairs (map spawn L1)
 *   5. scripts.start('quest-tbwt') — real Talk path
 *
 * @see docs/plans/2026-08-04-harness-quest-template.md
 * @see rs2b0t tools/aio-quest-test.ts + tools/tutorial/harness.ts mainlandAccount
 */
import {
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
  fillRunEnergy,
  giveItems,
  setStats,
  setWorldSpeed,
  teleCheat,
  teleTo,
  waitSceneReady
} from './lib/harness.mjs';

const argv = process.argv.slice(2);
const { base, rest } = parseArgs(argv.filter(a => a !== '--max-ms'));
const maxMsIdx = argv.indexOf('--max-ms');
const maxMs = maxMsIdx >= 0 ? Number(argv[maxMsIdx + 1]) || 20 * 60_000 : 20 * 60_000;
const { username, password } = resolveAccount(
  rest.filter(r => r !== String(maxMs)),
  'tbw'
);

const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';
/**
 * Timfraku map spawn: m43_48 NPC `1 28 15: 1162` → world L1 2780,3087.
 * (Earlier smoke used L0 2790,3084 — no Timfraku in scene → stall.)
 */
const TIMFRAKU = { x: 2780, z: 3087, level: 1 };

/**
 * Official list reqs + content gates + combat floor for lv48 Jogres.
 * Not "min only" — firemaking 30 is a paste/bones gate; combat is practical.
 * @see rs2b0t quests.ts tbwt; content tbwt_jogre_bones.rs2
 */
const TBWT_STATS = {
  // quest list
  cooking: 30,
  // Cairn Isle rocks + bridge use stat_random(agility,125,250) — 15 is bare
  // list req; seed higher for e2e reliability (host setstat only, not mid-quest).
  agility: 60,
  fishing: 15, // list is 5; pad for karambwanji rolls
  // content hard gates
  firemaking: 30, // burn jogre bones
  herblore: 34, // craft agility pots for Tamayu (if bot makes them)
  // combat floor (aio-quest style) — journal: defeat level 48 Jogres
  attack: 50,
  strength: 50,
  defence: 40,
  hitpoints: 50
};

const browser = await launchBrowser();
/** @type {import('playwright').Page | null} */
let page = null;
/** @type {((label: string) => Promise<string|null>) | null} */
let shot = null;

try {
  page = await browser.newPage();
  page.on('pageerror', err => console.error('[pageerror]', err));
  page.on('console', msg => {
    const t = msg.text();
    if (/\[script|script-host|harness|nav|walk|quest|tbwt|Timfraku|error|mainland/i.test(t)) {
      console.log(`[browser.${msg.type()}] ${t.slice(0, 300)}`);
    }
  });

  console.log(`[quest-tbwt] ${base} user=${username} maxMs=${maxMs}`);
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);

  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`quest-tbwt_${username}`);
    const bridge = await installScreenshotBridge(page, shotDir);
    shot = bridge.shot;
    await page.evaluate(() => {
      globalThis.__harnessShotPolicy = { autoStall: false, maxStallShots: 0 };
    });
    console.log(`[quest-tbwt] shots → ${shotDir}`);
  }

  // —— 1. Mainland prep (rs2b0t mainlandAccount) ——
  await mainlandAccount(page, username, password);
  if (shot) await shot('mainland-ready');

  // Faster world ticks for e2e — pairs with Client.loopCycle TaskBot pacing
  await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300);
  // Stats/setvar/seeds only after scene 2 (mid-quest item seeds same rule)
  await waitSceneReady(page, 60_000);

  // —— 2. Stats + test-speed energy (after relog; setstat is live on current session) ——
  console.log('[quest-tbwt] prep: setstat', JSON.stringify(TBWT_STATS));
  const statFail = await setStats(page, TBWT_STATS);
  if (statFail.length) {
    fail(`setstat not sent: ${statFail.join('; ')}`);
  }
  // ~energy = full run + run on (content debugproc) — long walks; not a quest proof
  console.log('[quest-tbwt] prep: ~energy (test speed)');
  await fillRunEnergy(page);

  // —— 3. Quest-specific server state (host prep, not script decide()) ——
  console.log('[quest-tbwt] prep: setvar junglepotion 12 + tbwt reset');
  if (!(await cheatQuiet(page, 'setvar junglepotion 12'))) {
    fail('setvar junglepotion not sent');
  }
  let jp = await getServerVarQuiet(page, 'junglepotion');
  for (let i = 0; i < 3 && jp !== 12; i++) {
    await cheatQuiet(page, 'setvar junglepotion 12');
    jp = await getServerVarQuiet(page, 'junglepotion');
  }
  if (jp !== 12) {
    console.warn(`[quest-tbwt] warn: getvar junglepotion=${jp} (expected 12) — continuing`);
  } else {
    console.log('[quest-tbwt] getvar junglepotion=12 OK');
  }

  for (const cmd of [
    'setvar tbwt_main 0',
    'setvar tbwt_tiadeche 0',
    // Other brothers: seed complete so mid-gate proves **Tiadeche live path** only
    // (Tinsay must be complete before he accepts vessel for crafting manual).
    // Override with TBWT_LIVE_BROTHERS=1 to leave at 0 for full brother e2e later.
    ...(process.env.TBWT_LIVE_BROTHERS === '1'
      ? ['setvar tbwt_tinsay 0', 'setvar tbwt_tamayu 0', 'setvar tbwt_lubufu 0']
      : [
          'setvar tbwt_tinsay 7', // ^tbwt_tinsay_complete
          'setvar tbwt_tamayu 4', // ^tbwt_tamayu_complete
          'setvar tbwt_lubufu 31' // ^tbwt_lubufu_complete
        ]),
    'setvar tbwt_flags 0'
  ]) {
    if (!(await cheatQuiet(page, cmd, 400))) {
      fail(`prep '${cmd}' not sent`);
    }
  }
  const tbwt0 = await getServerVarQuiet(page, 'tbwt_main');
  console.log(`[quest-tbwt] getvar tbwt_main=${tbwt0}`);
  if (process.env.TBWT_LIVE_BROTHERS !== '1') {
    console.log(
      '[quest-tbwt] prep: seeded tinsay/tamayu/lubufu complete (Tiadeche live only; TBWT_LIVE_BROTHERS=1 to skip)'
    );
  }

  // —— 4. Tele to Timfraku upstairs (engine tele format) ——
  await waitSceneReady(page, 30_000);
  console.log(`[quest-tbwt] tele Timfraku ${teleCheat(TIMFRAKU)}`);
  if (!(await teleTo(page, TIMFRAKU, 12, 45_000))) {
    const here = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    fail(`tele Timfraku failed or did not arrive (here=${JSON.stringify(here)})`);
  }
  // Scene settle — NPC list may lag a tick after tele
  await page.waitForTimeout(1500);
  const near = await page.evaluate(() => {
    const r = globalThis.__lc377?.reader;
    const tile = r?.worldTile?.() ?? globalThis.__lc377?.worldTile?.() ?? null;
    const npcs = (r?.npcs?.() ?? []).slice(0, 16).map(n =>
      n ? `${n.name ?? '?'}@${n.tile?.x},${n.tile?.z} d=${n.distance}` : null
    );
    return { tile, npcs };
  });
  console.log('[quest-tbwt] scene after tele', JSON.stringify(near));
  if (shot) await shot('at-timfraku');

  // Vessel seeds (debugnames — both display as "Karambwan vessel")
  // loaded → Tiadeche catch (consumed, not returned); empty → Tinsay → crafting manual.
  // Extra empty: reclaim path if manual lag / stage 5 without inv yet.
  console.log('[quest-tbwt] prep: give vessels (1 loaded + 2 empty)');
  await giveItems(page, [
    ['tbwt_karambwan_vessel_loaded_with_karambwanji', 1],
    ['tbwt_karambwan_vessel', 2]
  ]);

  // Full e2e default: completeStage COMPLETE (6). Override TBWT_COMPLETE_STAGE.
  const wantStage = Number(process.env.TBWT_COMPLETE_STAGE) || 6;
  await page.evaluate(ws => {
    globalThis.__tbwtCompleteStage = ws;
  }, wantStage);
  console.log(`[quest-tbwt] __tbwtCompleteStage=${wantStage}`);

  // —— 5. Run quest script (real Talk / use-on path) ——
  console.log('[quest-tbwt] scripts.start quest-tbwt');
  const result = await page.evaluate(
    async ([name, ms]) => {
      const s = globalThis.__lc377?.scripts;
      if (!s?.start) return { error: 'script host missing — rebuild harness-client' };
      try {
        const r = await s.start(name, ms);
        return { result: r };
      } catch (e) {
        return { error: String(e?.stack || e) };
      }
    },
    ['quest-tbwt', maxMs]
  );

  if (result.error) {
    if (shot) await shot('error');
    fail(result.error);
  }

  // Stage: prefer server getvar (truth); client mirror as secondary
  const serverStage = await getServerVarQuiet(page, 'tbwt_main');
  const clientStage = await page.evaluate(() => globalThis.__lc377?.varp?.(320) | 0);
  const final = await page.evaluate(() => {
    const r = globalThis.__lc377?.reader;
    const chat = typeof r?.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
    return {
      tile: globalThis.__lc377?.worldTile?.() ?? null,
      ingame: !!globalThis.__lc377?.ingame?.(),
      chat
    };
  });

  console.log(
    '[quest-tbwt] finished',
    JSON.stringify({ ...result, serverStage, clientStage, final }, null, 2)
  );
  if (shot) await shot(`end-${String(result.result).slice(0, 40)}`);

  const resStr = String(result.result ?? '');
  if (resStr.startsWith('fail:') || /No trigger for/i.test(resStr)) {
    if (shot) await shot('fail-no-trigger');
    fail(resStr);
  }
  // Host-side chat scan (in case script result was only "stopped")
  const chatHit = (final.chat ?? []).find(t => /No trigger for/i.test(String(t ?? '')));
  if (chatHit) {
    if (shot) await shot('fail-no-trigger-chat');
    fail(`chat: ${chatHit}`);
  }

  const stage = serverStage ?? clientStage ?? 0;
  const need = Number(process.env.TBWT_COMPLETE_STAGE) || 6;
  if (stage >= need) {
    console.log(`RESULT: PASS (TBWT tbwt_main=${stage} want>=${need})`);
  } else {
    if (shot) await shot('fail-stage');
    fail(`TBWT stage too low: tbwt_main=${stage} (want >=${need}); result=${resStr}`);
  }
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await browser.close().catch(() => {});
}
