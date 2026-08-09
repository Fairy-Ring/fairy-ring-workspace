#!/usr/bin/env node
/**
 * Horror from the Deep e2e smoke (milestone path → full complete).
 *
 *   node tools/harness/quest-horror-smoke.mjs
 *   WORLD_SPEED_MS=300 node tools/harness/quest-horror-smoke.mjs --max-ms 600000
 *   HORROR_COMPLETE_STAGE=2  # ENTERED mid-gate (default 10 COMPLETE)
 *
 * Host: mainland + speed 300 + give tools + **one** start tele to Larrissa.
 * Between steps: **walk + basalt Jump-across** (no mid-quest tele).
 * Script: real Talk / use-with / rock jumps (quest-horror).
 *
 * @see docs/research/port-quest-horror-274-to-377.md
 * @see vendor/content/scripts/quests/quest_horror/scripts/basalt_rocks.rs2
 */
import {
  boot,
  cheatQuiet,
  createShotRunDir,
  fail,
  getServerVarQuiet,
  giveItems,
  installScreenshotBridge,
  launchBrowser,
  mainlandAccount,
  parseArgs,
  resolveAccount,
  fillRunEnergy,
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
  'hfd'
);

const wantStage = Number(process.env.HORROR_COMPLETE_STAGE) || 10; // COMPLETE
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const LARRISSA = { x: 2508, z: 3635, level: 0 };

/**
 * Fresh mainland accounts are 10hp — basalt slip hits 1–10 and rock crabs / dagannoths
 * later will one-shot. Practical e2e floor (not min quest list only).
 * List era: Agility 35; combat for lighthouse fights is separate.
 */
const HORROR_STATS = {
  // list / content
  agility: 80, // basalt slip uses agility random — high Agi avoids tide wipe
  // combat floor (jr dagannoth + mother later; mid-gate still needs slip HP)
  attack: 60,
  strength: 60,
  defence: 50,
  hitpoints: 70,
  ranged: 50,
  magic: 50,
  prayer: 43
};

const browser = await launchBrowser();
/** @type {import('playwright').Page | null} */
let page = null;
/** @type {((label: string) => Promise<string|null>) | null} */
let shot = null;
let pollStop = false;

try {
  page = await browser.newPage();
  page.on('pageerror', err => console.error('[pageerror]', err));
  page.on('console', msg => {
    const t = msg.text();
    if (
      /\[script|script-host|harness|nav|walk|quest|horror|Larrissa|Gunnjorn|dialog|basalt|Jump|error|mainland/i.test(
        t
      )
    ) {
      console.log(`[browser.${msg.type()}] ${t.slice(0, 320)}`);
    }
  });

  console.log(`[quest-horror] ${base} user=${username} maxMs=${maxMs} wantStage=${wantStage}`);
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);

  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`quest-horror_${username}`);
    const bridge = await installScreenshotBridge(page, shotDir);
    shot = bridge.shot;
    await page.evaluate(() => {
      globalThis.__harnessShotPolicy = { autoStall: false, maxStallShots: 0 };
    });
    console.log(`[quest-horror] shots → ${shotDir}`);
  }

  await mainlandAccount(page, username, password);
  if (shot) await shot('mainland-ready');

  await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300);
  await cheatQuiet(page, 'reload', 2000);
  await waitSceneReady(page, 60_000);
  await fillRunEnergy(page);

  console.log('[quest-horror] prep: setstat', JSON.stringify(HORROR_STATS));
  const statFail = await setStats(page, HORROR_STATS);
  if (statFail.length) {
    console.warn('[quest-horror] setstat failed:', statFail.join('; '));
  }

  console.log('[quest-horror] prep: reset quest + give bridge tools + food (after scene 2)');
  // Barbarian Outpost gate: oploc1 _outpost_gate blocks unless barcrawl complete (^ = 2).
  // Without this, path to Gunnjorn dies at the gate (Alfred Grimhand Barcrawl).
  await cheatQuiet(page, 'setvar barcrawl 2', 300);
  console.log('[quest-horror] prep: setvar barcrawl 2 (outpost gate unlock — not full barcrawl proof)');
  await cheatQuiet(page, 'setvar horrorquest 0');
  await cheatQuiet(page, 'setvar deephorror 0', 400);
  for (const b of [
    'horrorbridgeleft',
    'horrorbridgeright',
    'horroragilitykey',
    'horrorlighthouseentrance'
  ]) {
    await cheatQuiet(page, `setvar ${b} 0`, 200);
  }
  await giveItems(page, [
    ['woodplank', 4],
    ['nails', 16],
    ['hammer', 1],
    ['swordfish', 10] // basalt slip + walk — not a 10hp run
  ]);

  // Single setup tele: start at Larrissa. Rest is basalt + walk.
  console.log(`[quest-horror] setup tele Larrissa ${teleCheat(LARRISSA)} (only host tele)`);
  if (!(await teleTo(page, LARRISSA, 10, 45_000))) {
    fail('tele Larrissa failed');
  }
  await page.waitForTimeout(800);
  if (shot) await shot('at-larrissa');

  await page.evaluate(ws => {
    globalThis.__horrorServerStage = 0;
    globalThis.__horrorCompleteStage = ws;
    globalThis.__horrorBridgeSide = 0;
    globalThis.__horrorBridgeLeft = 0;
    globalThis.__horrorBridgeRight = 0;
  }, wantStage);

  // Host: getvar stage + bridge bits only — **no mid-quest tele** (setup tele Larrissa only).
  (async function hostLoop() {
    while (!pollStop) {
      try {
        const sceneOk = await page.evaluate(() => {
          const h = globalThis.__lc377;
          return !!(h?.ingame?.() && (h.sceneState?.() ?? 0) === 2);
        });
        if (!sceneOk) {
          await page.waitForTimeout(500).catch(() => {});
          continue;
        }
        const busy = await page.evaluate(() => {
          const r = globalThis.__lc377?.reader;
          return !!(r?.dialogOpen?.() || r?.modalMessage?.());
        });
        if (!busy) {
          const v = await getServerVarQuiet(page, 'horrorquest', 1);
          if (v != null) {
            await page.evaluate(s => {
              globalThis.__horrorServerStage = s;
            }, v);
            if (v >= wantStage) break;
          }
          // Bridge halves are separate varbits — feed module for “fixed?” heuristic
          for (const [name, key] of [
            ['horrorbridgeleft', '__horrorBridgeLeft'],
            ['horrorbridgeright', '__horrorBridgeRight']
          ]) {
            const b = await getServerVarQuiet(page, name, 1);
            if (b != null) {
              await page.evaluate(
                ([k, val]) => {
                  globalThis[k] = val;
                },
                [key, b]
              );
            }
          }
        }
      } catch {
        /* ignore */
      }
      try {
        await page.waitForTimeout(3000);
      } catch {
        break;
      }
    }
  })();

  console.log('[quest-horror] scripts.start quest-horror (walk + basalt; no mid tele)');
  const result = await page.evaluate(
    async ([name, ms]) => {
      const s = globalThis.__lc377?.scripts;
      if (!s?.start) return { error: 'script host missing — rebuild harness-client' };
      try {
        return { result: await s.start(name, ms) };
      } catch (e) {
        return { error: String(e?.stack || e) };
      }
    },
    ['quest-horror', maxMs]
  );

  pollStop = true;

  if (result.error) {
    if (shot) await shot('error');
    fail(result.error);
  }

  const serverStage = await getServerVarQuiet(page, 'horrorquest');
  const final = await page.evaluate(() => {
    const r = globalThis.__lc377?.reader;
    const chat = typeof r?.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
    return {
      tile: globalThis.__lc377?.worldTile?.() ?? null,
      inv: (r?.inventory?.() ?? []).map(i => i?.name).filter(Boolean),
      chat
    };
  });

  console.log('[quest-horror] finished', JSON.stringify({ ...result, serverStage, final }, null, 2));
  if (shot) await shot(`end-${String(result.result).slice(0, 40)}`);

  const resStr = String(result.result ?? '');
  if (resStr.startsWith('fail:') || /No trigger for/i.test(resStr)) {
    fail(resStr);
  }
  const stage = serverStage ?? 0;
  if (stage >= wantStage) {
    console.log(`RESULT: PASS (Horror horrorquest=${stage} want>=${wantStage})`);
  } else {
    if (shot) await shot('fail-stage');
    fail(`Horror stage=${stage} want>=${wantStage}; result=${resStr}`);
  }
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  pollStop = true;
  await browser.close().catch(() => {});
}
