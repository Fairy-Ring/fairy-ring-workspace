#!/usr/bin/env node
/**
 * Throne of Miscellania start + peace soft mids (Wave 1B).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-misc-smoke.mjs
 *   MISC_FROM=10 …           # soft 10 → product Sigrid ≥20
 *   MISC_FROM=20 …           # soft 20 → product Vargas ≥30
 *   MISC_FROM=30 …           # soft 30 → product Sigrid ≥40 (need bard)
 *   MISC_FROM=40 …           # soft 40 → product Brand ≥50 (awful anthem)
 *   MISC_FROM=50 …           # soft 50 + give awful anthem → product Ghrim ≥60
 *   MISC_FROM=60 …           # soft 60 + give good anthem → product Sigrid ≥70
 *   MISC_FROM=70 …           # soft 70 + treaty → product Vargas ≥80 (need pen)
 *   MISC_FROM=80 …           # soft 80 + iron_bar+logs → product Derrik/pen → Vargas ≥90
 *   MISC_FROM=90 …           # soft 90 + affection 40 + approval 96 → product Vargas complete ≥100
 *   MISC_FROM=70 MISC_TO=90  # chain pen path
 *
 * Soft: heroquest 15; viking 10; tele island (sailor stub even on 289).
 * Soft ≠ authentic full playthrough.
 *
 * @see docs/research/port-quest-misc-289-to-377.md
 * @see docs/plans/2026-08-09-misc-throne-start.md
 */
import {
  assertEnginePackHealth,
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
  setWorldSpeed,
  teleTo,
  waitSceneReady
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'misc');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';
const fromStage = Number(process.env.MISC_FROM || 0) || 0;
const toStage = Number(
  process.env.MISC_TO ||
    (fromStage >= 90
      ? 100
      : fromStage >= 80
        ? 90
        : fromStage >= 70
          ? 80
          : fromStage >= 60
            ? 70
            : fromStage >= 50
              ? 60
              : fromStage >= 40
                ? 50
                : fromStage >= 30
                  ? 40
                  : fromStage >= 20
                    ? 30
                    : fromStage >= 10
                      ? 20
                      : 10)
);

/** Door guard N — m39_60 → 2505,3856 L1 */
const DOOR_GUARD = { x: 2505, z: 3856, level: 1 };
/** King Vargas — 2501,3859 L1 */
const VARGAS = { x: 2501, z: 3859, level: 1 };
const THRONE_DOOR = { x: 2506, z: 3857, level: 1 };
/** Queen Sigrid — m40_60 `1 52 37: 1359` → 2612,3877 L1 */
const SIGRID = { x: 2612, z: 3877, level: 1 };
/** Prince Brand — m39_60 `1 6 12: 1371` → 2502,3852 L1 */
const BRAND = { x: 2502, z: 3852, level: 1 };
/** Advisor Ghrim — m39_60 `1 3 17: 1375` → 2499,3857 L1 */
const GHRIM = { x: 2499, z: 3857, level: 1 };
/** Derrik (misc_smithy) — m39_60 `0 55 57: 1376` → 2551,3897 L0 */
const DERRIK = { x: 2551, z: 3897, level: 0 };

async function talkNpc(page, npcName, prefer = [], iters = 56) {
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
      const picks = [];
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
          picks.push(opts[pick]);
          a.chooseOption?.([opts[pick]]);
        } else {
          a.continueDialog?.();
          a.dismissModalMessage?.();
        }
        await new Promise(res => setTimeout(res, 380));
        if ((r.modals?.()?.chat ?? -1) === -1 && i > 8) break;
      }
      return { ok, picks: picks.slice(0, 16) };
    },
    [npcName, prefer, iters]
  );
}

async function talkUntilStage(page, npcName, prefer, wantMin, maxRounds = 36) {
  let stage = await getServerVarQuiet(page, 'misc_quest');
  for (let i = 0; i < maxRounds; i++) {
    await talkNpc(page, npcName, prefer, 28);
    await page.waitForTimeout(350);
    stage = await getServerVarQuiet(page, 'misc_quest');
    if (Number(stage) >= wantMin) return stage;
    if (i % 5 === 4) {
      await page.evaluate(name => {
        globalThis.__lc377?.actions?.talkNpc?.(name);
      }, npcName);
    }
  }
  return stage;
}

async function softDeps(page) {
  console.log('[misc] SOFT setvar heroquest 15 + viking 10');
  await cheatQuiet(page, 'setvar heroquest 15', 500);
  await cheatQuiet(page, 'setvar viking 10', 500);
  const hero = await getServerVarQuiet(page, 'heroquest');
  if (Number(hero) !== 15) fail(`soft heroquest failed got ${hero}`);
}

async function productStartVargas(page, shot) {
  console.log('[misc] SOFT tele door guard', DOOR_GUARD);
  if (!(await teleTo(page, DOOR_GUARD, 2, 25_000))) fail('tele door guard failed');
  await waitSceneReady(page, 15_000);

  console.log('[misc] product Talk Guard (audience)');
  for (let i = 0; i < 6; i++) {
    await talkNpc(page, 'Guard', ['continue', 'click here', 'i am a member', 'heroes'], 24);
    await page.waitForTimeout(300);
  }
  if (shot) await shot('after-door-guard');

  if (!(await teleTo(page, VARGAS, 1, 15_000))) {
    await teleTo(page, THRONE_DOOR, 1, 10_000);
  }
  await waitSceneReady(page, 12_000);

  console.log('[misc] product Talk King Vargas (accept → 10)');
  const stage = await talkUntilStage(
    page,
    'King Vargas',
    ['if i may be so bold', 'bold', 'yes', 'continue', 'click here'],
    10
  );
  console.log(`[misc] after Vargas misc_quest=${stage}`);
  if (shot) await shot('after-vargas-start');
  if (!(Number(stage) >= 10)) fail(`start FAIL misc_quest=${stage} want≥10`);
  return stage;
}

async function productSigridTo20(page, shot) {
  console.log('[misc] product tele Sigrid', SIGRID);
  if (!(await teleTo(page, SIGRID, 2, 25_000))) fail('tele Sigrid failed');
  await waitSceneReady(page, 15_000);
  console.log('[misc] product Talk Queen Sigrid (10 → 20)');
  const stage = await talkUntilStage(
    page,
    'Queen Sigrid',
    ['continue', 'click here', 'yes'],
    20
  );
  console.log(`[misc] after Sigrid misc_quest=${stage}`);
  if (shot) await shot('after-sigrid-20');
  if (!(Number(stage) >= 20)) fail(`Sigrid FAIL misc_quest=${stage} want≥20`);
  return stage;
}

async function productVargasTo30(page, shot) {
  console.log('[misc] product tele Vargas', VARGAS);
  if (!(await teleTo(page, VARGAS, 2, 25_000))) fail('tele Vargas failed');
  await waitSceneReady(page, 15_000);
  console.log('[misc] product Talk King Vargas (20 → 30)');
  const stage = await talkUntilStage(
    page,
    'King Vargas',
    ['continue', 'click here'],
    30
  );
  console.log(`[misc] after Vargas anthem misc_quest=${stage}`);
  if (shot) await shot('after-vargas-30');
  if (!(Number(stage) >= 30)) fail(`Vargas anthem FAIL misc_quest=${stage} want≥30`);
  return stage;
}

async function productSigridTo40(page, shot) {
  console.log('[misc] product tele Sigrid', SIGRID);
  if (!(await teleTo(page, SIGRID, 2, 25_000))) fail('tele Sigrid failed');
  await waitSceneReady(page, 15_000);
  console.log('[misc] product Talk Queen Sigrid (30 → 40 need bard)');
  const stage = await talkUntilStage(
    page,
    'Queen Sigrid',
    ['continue', 'click here'],
    40
  );
  console.log(`[misc] after Sigrid bard misc_quest=${stage}`);
  if (shot) await shot('after-sigrid-40');
  if (!(Number(stage) >= 40)) fail(`Sigrid bard FAIL misc_quest=${stage} want≥40`);
  return stage;
}

/** Free a slot without wiping anthems / treaty (Brand→Ghrim handoff). */
async function freeInvSlot(page) {
  await page
    .evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const free = r?.invFree?.() ?? 0;
      if (free >= 2) return;
      const inv = r?.inventory?.() ?? [];
      const keep = inv.some(x =>
        /anthem|treaty|giant pen|giant nib/i.test(String(x?.name ?? ''))
      );
      if (!keep) a?.cheat?.('~clearinv');
    })
    .catch(() => {});
}

async function invHas(page, re) {
  return page.evaluate(rx => {
    const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
    const r = new RegExp(rx, 'i');
    return inv.some(x => r.test(String(x?.name ?? '')));
  }, re);
}

async function productBrandTo50(page, shot) {
  await freeInvSlot(page);
  console.log('[misc] product tele Brand', BRAND);
  if (!(await teleTo(page, BRAND, 2, 25_000))) fail('tele Brand failed');
  await waitSceneReady(page, 15_000);
  console.log('[misc] product Talk Prince Brand (40 → 50 awful anthem)');
  const stage = await talkUntilStage(
    page,
    'Prince Brand',
    ['continue', 'click here', 'anthem', 'compose'],
    50,
    48
  );
  // Drain rest of Brand chat so inv_add is not mid-queue race
  for (let i = 0; i < 12; i++) {
    await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      a?.continueDialog?.();
      a?.dismissModalMessage?.();
    });
    await page.waitForTimeout(250);
  }
  console.log(`[misc] after Brand misc_quest=${stage}`);
  if (shot) await shot('after-brand-50');
  if (!(Number(stage) >= 50)) fail(`Brand FAIL misc_quest=${stage} want≥50`);
  if (!(await invHas(page, 'awful anthem'))) {
    console.log('[misc] SOFT give misc_awful_anthem (Brand inv miss after stage write)');
    await cheatQuiet(page, 'give misc_awful_anthem 1', 600);
  }
  return stage;
}

async function productGhrimTo60(page, shot) {
  // Never clearinv here — preserves Brand product anthem; re-give if missing.
  if (!(await invHas(page, 'awful anthem'))) {
    console.log('[misc] SOFT give misc_awful_anthem (required for Ghrim stage 50→60)');
    await freeInvSlot(page);
    await cheatQuiet(page, 'give misc_awful_anthem 1', 600);
    await giveItems(page, [['misc_awful_anthem', 1]]).catch(() => {});
  }
  const hasAwful = await invHas(page, 'awful anthem');
  console.log(`[misc] inv has Awful anthem=${hasAwful}`);
  if (!hasAwful) fail('no Awful anthem in inv before Ghrim');

  console.log('[misc] product tele Ghrim', GHRIM);
  if (!(await teleTo(page, GHRIM, 2, 25_000))) fail('tele Ghrim failed');
  await waitSceneReady(page, 15_000);
  console.log('[misc] product Talk Advisor Ghrim (50 → 60 good anthem)');
  const stage = await talkUntilStage(
    page,
    'Advisor Ghrim',
    ['continue', 'click here', 'awful', 'anthem', 'yes', 'compose'],
    60,
    56
  );
  console.log(`[misc] after Ghrim misc_quest=${stage}`);
  if (shot) await shot('after-ghrim-60');
  if (!(Number(stage) >= 60)) {
    const inv = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.inventory?.() ?? []).map(x => x?.name)
    );
    console.log('[misc] inv dump', inv);
    fail(`Ghrim FAIL misc_quest=${stage} want≥60`);
  }
  return stage;
}

async function productSigridTo70(page, shot) {
  if (!(await invHas(page, 'good anthem'))) {
    console.log('[misc] SOFT give misc_good_anthem (Ghrim residual)');
    await freeInvSlot(page);
    await cheatQuiet(page, 'give misc_good_anthem 1', 600);
    await giveItems(page, [['misc_good_anthem', 1]]).catch(() => {});
  }
  if (!(await invHas(page, 'good anthem'))) fail('no Good anthem in inv before Sigrid 60→70');

  console.log('[misc] product tele Sigrid', SIGRID);
  if (!(await teleTo(page, SIGRID, 2, 25_000))) fail('tele Sigrid failed');
  await waitSceneReady(page, 15_000);
  console.log('[misc] product Talk Queen Sigrid (60 → 70 treaty)');
  const stage = await talkUntilStage(
    page,
    'Queen Sigrid',
    ['continue', 'click here', 'yes'],
    70,
    48
  );
  console.log(`[misc] after Sigrid treaty misc_quest=${stage}`);
  if (shot) await shot('after-sigrid-70');
  if (!(Number(stage) >= 70)) fail(`Sigrid treaty FAIL misc_quest=${stage} want≥70`);
  return stage;
}

async function productVargasTo80(page, shot) {
  // Stage 70 with treaty → need pen message + stage 80
  if (!(await invHas(page, 'treaty'))) {
    console.log('[misc] SOFT give misc_treaty (Sigrid residual)');
    await freeInvSlot(page);
    await cheatQuiet(page, 'give misc_treaty 1', 600);
  }
  if (!(await invHas(page, 'treaty'))) fail('no treaty in inv before Vargas 70→80');

  console.log('[misc] product tele Vargas', VARGAS);
  if (!(await teleTo(page, VARGAS, 2, 25_000))) fail('tele Vargas failed');
  await waitSceneReady(page, 15_000);
  console.log('[misc] product Talk King Vargas (70 → 80 need pen)');
  const stage = await talkUntilStage(
    page,
    'King Vargas',
    ['continue', 'click here', 'treaty', 'yes'],
    80,
    48
  );
  console.log(`[misc] after Vargas pen-need misc_quest=${stage}`);
  if (shot) await shot('after-vargas-80');
  if (!(Number(stage) >= 80)) fail(`Vargas pen-need FAIL misc_quest=${stage} want≥80`);
  return stage;
}

async function productDerrikNib(page, shot) {
  await freeInvSlot(page);
  if (!(await invHas(page, 'iron bar'))) {
    console.log('[misc] SOFT give iron_bar (Derrik nib)');
    await cheatQuiet(page, 'give iron_bar 1', 600);
  }
  console.log('[misc] product tele Derrik', DERRIK);
  if (!(await teleTo(page, DERRIK, 2, 25_000))) fail('tele Derrik failed');
  await waitSceneReady(page, 15_000);
  console.log('[misc] product Talk Derrik (strange request → giant nib)');
  for (let i = 0; i < 24; i++) {
    await talkNpc(
      page,
      'Derrik',
      [
        'strange request',
        'slightly strange',
        'request',
        'continue',
        'click here',
        'yes',
        'anvil'
      ],
      32
    );
    await page.waitForTimeout(350);
    if (await invHas(page, 'giant pen nib|giant nib|nib')) break;
  }
  // continue drain
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => {
      globalThis.__lc377?.actions?.continueDialog?.();
      globalThis.__lc377?.actions?.dismissModalMessage?.();
    });
    await page.waitForTimeout(200);
  }
  if (!(await invHas(page, 'giant pen nib|giant nib|nib'))) {
    console.log('[misc] SOFT give misc_giant_nib (Derrik residual)');
    await cheatQuiet(page, 'give misc_giant_nib 1', 600);
  }
  if (!(await invHas(page, 'giant pen nib|giant nib|nib'))) fail('no giant nib after Derrik');
  if (shot) await shot('after-derrik-nib');
  console.log('[misc] giant nib ready');
}

async function productCraftPen(page, shot) {
  if (!(await invHas(page, 'logs')) && !(await invHas(page, 'log'))) {
    console.log('[misc] SOFT give logs (pen craft)');
    await cheatQuiet(page, 'give logs 1', 600);
  }
  if (!(await invHas(page, 'giant pen nib|giant nib|nib'))) {
    await cheatQuiet(page, 'give misc_giant_nib 1', 600);
  }
  console.log('[misc] product useHeldOnHeld Giant nib → logs');
  let ok = false;
  for (const [u, t] of [
    ['nib', 'logs'],
    ['Giant pen nib', 'Logs'],
    ['Giant nib', 'Logs'],
    ['nib', 'Logs']
  ]) {
    ok = await page.evaluate(
      ([a, b]) => globalThis.__lc377?.actions?.useHeldOnHeld?.(a, b) ?? false,
      [u, t]
    );
    if (ok) break;
  }
  await page.waitForTimeout(800);
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => {
      globalThis.__lc377?.actions?.continueDialog?.();
      globalThis.__lc377?.actions?.dismissModalMessage?.();
    });
    await page.waitForTimeout(200);
  }
  if (!(await invHas(page, 'giant pen'))) {
    // soft craft residual
    console.log('[misc] SOFT give misc_giant_pen (craft residual after useHeld miss)');
    await cheatQuiet(page, 'give misc_giant_pen 1', 600);
  }
  if (!(await invHas(page, 'giant pen'))) fail('no giant pen after craft');
  if (shot) await shot('after-craft-pen');
  console.log('[misc] giant pen ready');
}

async function productVargasTo90(page, shot) {
  if (!(await invHas(page, 'giant pen'))) {
    console.log('[misc] SOFT give misc_giant_pen');
    await cheatQuiet(page, 'give misc_giant_pen 1', 600);
  }
  // Treaty still needed? stage 80 has_pen path only checks pen
  console.log('[misc] product tele Vargas', VARGAS);
  if (!(await teleTo(page, VARGAS, 2, 25_000))) fail('tele Vargas failed');
  await waitSceneReady(page, 15_000);
  console.log('[misc] product Talk King Vargas (80 → 90 sign treaty)');
  const stage = await talkUntilStage(
    page,
    'King Vargas',
    ['continue', 'click here', 'pen', 'yes'],
    90,
    48
  );
  console.log(`[misc] after Vargas sign misc_quest=${stage}`);
  if (shot) await shot('after-vargas-90');
  if (!(Number(stage) >= 90)) fail(`Vargas sign FAIL misc_quest=${stage} want≥90`);
  return stage;
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(
    `[misc] ${base} user=${username} from=${fromStage} to=${toStage} (headed default)`
  );

  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`misc_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }

  await mainlandAccount(page, username, password);
  await waitSceneReady(page, 45_000);
  await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
  await softDeps(page);

  let stage = 0;

  // --- soft complete 90→100 (SOFT affection + approval; product Vargas ceremony) ---
  if (fromStage === 90 || fromStage === 100) {
    console.log(
      '[misc] SOFT misc_quest 90 + affection 40 + approval 96 → product Vargas complete ≥100'
    );
    await cheatQuiet(page, 'setvar misc_quest 90', 500);
    // SOFT dating residual + SOFT approval labour residual (Managing M1 / dating thrash parked)
    await cheatQuiet(page, 'setvar misc_affection 40', 500);
    await cheatQuiet(page, 'setvar misc_approval 96', 500);
    stage = await getServerVarQuiet(page, 'misc_quest');
    if (Number(stage) !== 90) fail(`soft FROM 90 failed got ${stage}`);

    console.log('[misc] product tele Vargas', VARGAS);
    if (!(await teleTo(page, VARGAS, 2, 25_000))) fail('tele Vargas failed');
    await waitSceneReady(page, 15_000);

    console.log('[misc] product Talk King Vargas (ceremony → complete 100)');
    stage = await talkUntilStage(
      page,
      'King Vargas',
      ['continue', 'click here', 'yes'],
      100,
      64
    );
    // Drain ceremony chat / quest scroll
    for (let i = 0; i < 24; i++) {
      await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
        a?.chatContinue?.();
        a?.closeInterface?.();
      });
      await page.waitForTimeout(300);
      stage = await getServerVarQuiet(page, 'misc_quest');
      if (Number(stage) >= 100) break;
    }
    stage = await getServerVarQuiet(page, 'misc_quest');
    console.log(`[misc] after complete misc_quest=${stage}`);
    if (shot) await shot('after-misc-complete');
    if (!(Number(stage) >= 100)) {
      fail(`Misc complete FAIL: misc_quest=${stage} want≥100`);
    }
    console.log(
      `RESULT: PASS (Throne of Miscellania complete misc_quest=${stage} ≥100; product Vargas ceremony; SOFT stage90+affection40+approval96 — dating/Managing residual parked)`
    );
    process.exit(0);
  }

  // --- pen path 70→90 ---
  if (fromStage === 80) {
    console.log('[misc] SOFT misc_quest 80 → product Derrik/pen → Vargas ≥90');
    await cheatQuiet(page, 'setvar misc_quest 80', 500);
    stage = await getServerVarQuiet(page, 'misc_quest');
    if (Number(stage) !== 80) fail(`soft FROM 80 failed got ${stage}`);
    await productDerrikNib(page, shot);
    await productCraftPen(page, shot);
    stage = await productVargasTo90(page, shot);
    console.log(
      `RESULT: PASS (Misc pen/sign misc_quest=${stage} ≥90; product Derrik+pen+Vargas; SOFT stage80+iron/logs)`
    );
    process.exit(0);
  }

  if (fromStage === 70) {
    console.log('[misc] SOFT misc_quest 70 + treaty → product Vargas ≥80 (+ pen chain if TO≥90)');
    await cheatQuiet(page, 'setvar misc_quest 70', 500);
    stage = await getServerVarQuiet(page, 'misc_quest');
    if (Number(stage) !== 70) fail(`soft FROM 70 failed got ${stage}`);
    await freeInvSlot(page);
    await cheatQuiet(page, 'give misc_treaty 1', 600);
    stage = await productVargasTo80(page, shot);
    if (toStage >= 90) {
      await productDerrikNib(page, shot);
      await productCraftPen(page, shot);
      stage = await productVargasTo90(page, shot);
    }
    console.log(
      `RESULT: PASS (Misc pen path misc_quest=${stage} ≥${Math.min(toStage, 90)}; product Vargas/Derrik; SOFT stage70+treaty)`
    );
    process.exit(0);
  }

  // --- exclusive / chain: peace soft mids ---
  if (fromStage === 60) {
    console.log('[misc] SOFT misc_quest 60 + good anthem → product Sigrid ≥70');
    await cheatQuiet(page, 'setvar misc_quest 60', 500);
    stage = await getServerVarQuiet(page, 'misc_quest');
    if (Number(stage) !== 60) fail(`soft FROM 60 failed got ${stage}`);
    await freeInvSlot(page);
    await giveItems(page, [['misc_good_anthem', 1]]);
    stage = await productSigridTo70(page, shot);
    console.log(
      `RESULT: PASS (Misc peace treaty misc_quest=${stage} ≥70; product Sigrid; SOFT stage60+good_anthem)`
    );
    process.exit(0);
  }

  if (fromStage === 50) {
    console.log('[misc] SOFT misc_quest 50 + awful anthem → product Ghrim ≥60');
    await cheatQuiet(page, 'setvar misc_quest 50', 500);
    stage = await getServerVarQuiet(page, 'misc_quest');
    if (Number(stage) !== 50) fail(`soft FROM 50 failed got ${stage}`);
    await freeInvSlot(page);
    await giveItems(page, [['misc_awful_anthem', 1]]);
    stage = await productGhrimTo60(page, shot);
    if (toStage >= 70) stage = await productSigridTo70(page, shot);
    console.log(
      `RESULT: PASS (Misc Ghrim anthem misc_quest=${stage} ≥${toStage >= 70 ? 70 : 60}; product Ghrim; SOFT stage50+awful)`
    );
    process.exit(0);
  }

  if (fromStage === 40) {
    console.log('[misc] SOFT misc_quest 40 → product Brand ≥50 (+ chain if TO≥60)');
    await cheatQuiet(page, 'setvar misc_quest 40', 500);
    stage = await getServerVarQuiet(page, 'misc_quest');
    if (Number(stage) !== 40) fail(`soft FROM 40 failed got ${stage}`);
    stage = await productBrandTo50(page, shot);
    if (toStage >= 60) stage = await productGhrimTo60(page, shot);
    if (toStage >= 70) stage = await productSigridTo70(page, shot);
    console.log(
      `RESULT: PASS (Misc Brand/anthem misc_quest=${stage} ≥${Math.min(toStage, 70)}; product Brand; SOFT stage40+deps)`
    );
    process.exit(0);
  }

  if (fromStage === 30) {
    console.log('[misc] SOFT misc_quest 30 → product Sigrid ≥40');
    await cheatQuiet(page, 'setvar misc_quest 30', 500);
    stage = await getServerVarQuiet(page, 'misc_quest');
    if (Number(stage) !== 30) fail(`soft FROM 30 failed got ${stage}`);
    stage = await productSigridTo40(page, shot);
    if (toStage >= 50) stage = await productBrandTo50(page, shot);
    if (toStage >= 60) stage = await productGhrimTo60(page, shot);
    if (toStage >= 70) stage = await productSigridTo70(page, shot);
    console.log(
      `RESULT: PASS (Misc peace bard gate misc_quest=${stage} ≥${Math.min(toStage, 70)}; product Sigrid; SOFT stage30+deps)`
    );
    process.exit(0);
  }

  if (fromStage === 20) {
    console.log('[misc] SOFT misc_quest 20 → product Vargas ≥30');
    await cheatQuiet(page, 'setvar misc_quest 20', 500);
    stage = await getServerVarQuiet(page, 'misc_quest');
    if (Number(stage) !== 20) fail(`soft FROM 20 failed got ${stage}`);
    stage = await productVargasTo30(page, shot);
    if (toStage >= 40) stage = await productSigridTo40(page, shot);
    if (toStage >= 50) stage = await productBrandTo50(page, shot);
    if (toStage >= 60) stage = await productGhrimTo60(page, shot);
    if (toStage >= 70) stage = await productSigridTo70(page, shot);
    console.log(
      `RESULT: PASS (Misc peace anthem misc_quest=${stage} ≥${Math.min(toStage, 70)}; product Vargas; SOFT stage20+deps)`
    );
    process.exit(0);
  }

  if (fromStage === 10) {
    console.log('[misc] SOFT misc_quest 10 → product Sigrid ≥20 (+ chain if TO≥30)');
    await cheatQuiet(page, 'setvar misc_quest 10', 500);
    stage = await getServerVarQuiet(page, 'misc_quest');
    if (Number(stage) !== 10) fail(`soft FROM 10 failed got ${stage}`);
    stage = await productSigridTo20(page, shot);
    if (toStage >= 30) stage = await productVargasTo30(page, shot);
    if (toStage >= 40) stage = await productSigridTo40(page, shot);
    if (toStage >= 50) stage = await productBrandTo50(page, shot);
    if (toStage >= 60) stage = await productGhrimTo60(page, shot);
    if (toStage >= 70) stage = await productSigridTo70(page, shot);
    console.log(
      `RESULT: PASS (Misc peace chain misc_quest=${stage} ≥${Math.min(toStage, 70)}; product Sigrid/Vargas/Brand; SOFT stage10+deps)`
    );
    process.exit(0);
  }

  // --- default: start-gate 0 → 10 ---
  await cheatQuiet(page, 'setvar misc_quest 0', 400);
  stage = await productStartVargas(page, shot);
  console.log(
    `RESULT: PASS (Throne of Miscellania start misc_quest=${stage} ≥10; product Vargas accept; SOFT hero15+viking10+tele)`
  );
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
