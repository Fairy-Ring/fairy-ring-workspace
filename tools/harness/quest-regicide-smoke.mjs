#!/usr/bin/env node
/**
 * Regicide start + mid smoke (Wave 1A #6 / Lane A Idris + tracker).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-regicide-smoke.mjs   # headed default
 *   REGICIDE_MID_ONLY=1 …  # soft stage 2 → product Idris ≥3 → Iorwerth ≥4
 *   REGICIDE_SKIP_IDRIS=1 … # soft stage 3 then product Iorwerth only
 *   REGICIDE_FROM=4 …      # soft stage 4 → product Elf Tracker ≥5
 *   REGICIDE_FROM=4 REGICIDE_TO=6 …  # tracker ≥5 → Iorwerth pendant → tracker ≥6
 *   REGICIDE_FROM=6 …      # soft pendant stage → product footprints ≥7 → tracker ≥8
 *   REGICIDE_FROM=8 …      # soft tracker2 → product Tyras guard kill ≥9
 *   REGICIDE_FROM=9 …      # soft defeated_guard → product dense-forest camp enter ≥10
 *   REGICIDE_FROM=10 …     # soft entered_camp → product Iorwerth alchemy book ≥11
 *   REGICIDE_FROM=11 …     # soft iorwerth2 → product rabbit+catapult bomb ≥12
 *   REGICIDE_FROM=12 …     # soft killed_tyras → product report Iorwerth ≥13
 *   REGICIDE_FROM=13 …     # soft reported + message → product zone Arianwyn ≥14
 *   REGICIDE_FROM=14 …     # soft spoken_arianwyn + message → product Lathas complete ≥15
 *
 * Soft: upass 10; staged FROM skips earlier product. Soft ≠ authentic full playthrough.
 * Guard kit (FROM=8): SOFT gilded plate + dragon scim (needs soft mm_main 10 + dragonquest 10).
 * Product: … ≥11 book; ≥12 catapult; ≥13 report; ≥14 Arianwyn zone; ≥15 Lathas complete.
 *
 * @see docs/research/regicide-zones-tracker-residual-377.md
 * @see docs/research/regicide-idris-spawn-377.md
 * @see docs/plans/2026-08-07-regicide-start-gate-smoke.md
 */
import {
  assertEnginePackHealth,
  boot,
  cheatQuiet,
  createShotRunDir,
  fail,
  fillRunEnergy,
  getServerVarQuiet,
  giveItems,
  installScreenshotBridge,
  launchBrowser,
  mainlandAccount,
  parseArgs,
  resolveAccount,
  setStats,
  setWorldSpeed,
  teleTo,
  waitSceneReady
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'reg');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

/** King Lathas — m40_51 `1 18 29: 364` → 2578,3293 L1 */
const LATHAS = { x: 2578, z: 3293, level: 1 };
/** Well of Voyage surface exit / armed mapsquare 0_36_50 — arms Idris when stage==2 */
const ISAFDAR_IDRIS = { x: 2312, z: 3216, level: 0 };
/** Lord Iorwerth — n34_50 id 1182 → 2205,3252 L0 */
const IORWERTH = { x: 2205, z: 3252, level: 0 };
/** Elf Tracker — m35_49 NPC 1199 @ 0 17 13 → 2257,3149 L0 */
const TRACKER = { x: 2257, z: 3149, level: 0 };
/** Footprints loc 3941 m35_49 `0 0 14` / `0 1 14` → 2240–2241,3150 L0 */
const FOOTPRINTS = { x: 2240, z: 3150, level: 0 };
/** Near 274 spawn_tyras_guard mapsquare 0_34_49_52_10 → world 2228,3146 */
const GUARD_STAND = { x: 2228, z: 3146, level: 0 };
/**
 * Dense forest into Tyras camp — m34_49 `0 11 33: 3998` angle=east (2)
 * → loc world 2187,3169. Content requires distance(player, $start) ≤ 1 where
 * $start = loc+(1,-1) from south side → **2188,3168** (not tele on loc).
 */
const DENSE_STAND = { x: 2188, z: 3168, level: 0 };
const DENSE_LOC = { x: 2187, z: 3169 };
/** Catapult m34_49 `0 9 47: 3976` → 2185,3183; lazy guard `0 5 48: 1205` → 2181,3184 */
const CATAPULT_STAND = { x: 2187, z: 3185, level: 0 };
const CATAPULT_LOC = { x: 2185, z: 3183 };
/**
 * Arianwyn zone `0_40_51_24_32` → world 2584,3296 L0 (path toward Lathas).
 * Soft tele into zone with stage 13 + iorwerth message.
 */
const ARIANWYN_ZONE = { x: 2584, z: 3296, level: 0 };
const midOnly = process.env.REGICIDE_MID_ONLY === '1' || process.env.REGICIDE_MID_ONLY === 'true';
const skipIdris =
  process.env.REGICIDE_SKIP_IDRIS === '1' || process.env.REGICIDE_SKIP_IDRIS === 'true';
const fromStage = Number(process.env.REGICIDE_FROM || 0) || 0;
const toStage =
  Number(
    process.env.REGICIDE_TO ||
      (fromStage >= 14
        ? 15
        : fromStage >= 13
          ? 14
          : fromStage >= 12
            ? 13
            : fromStage >= 11
              ? 12
              : fromStage >= 10
                ? 11
                : fromStage >= 9
                  ? 10
                  : fromStage >= 8
                    ? 9
                    : fromStage >= 6
                      ? 8
                      : fromStage >= 4
                        ? 5
                        : 4)
  ) || 4;

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
      const chat = typeof r.chat === 'function' ? r.chat(24).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 16), chat: chat.slice(0, 14) };
    },
    [npcName, prefer, iters]
  );
}

async function continueThrash(page, iters = 16, ms = 280) {
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

console.log(
  `[regicide] ${base} user=${username} midOnly=${midOnly} skipIdris=${skipIdris} from=${fromStage || 'start'} to=${toStage} (headed default)`
);
// Before Playwright: versionlist HTTP must == disk (else scene1 forever after pack)
await assertEnginePackHealth(base);

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  page.on('console', msg => {
    const t = msg.text();
    if (/regicide|lathas|trigger|error|script/i.test(t)) {
      console.log(`[browser.${msg.type()}] ${t.slice(0, 260)}`);
    }
  });

  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`regicide_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }

  await mainlandAccount(page, username, password);
  await waitSceneReady(page, 45_000);
  await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

  // Soft deps — labeled
  console.log('[regicide] SOFT setvar upass 10');
  await cheatQuiet(page, 'setvar upass 10', 500);
  await cheatQuiet(page, 'setvar regicide_bits 0', 400);
  await setStats(page, { agility: 56, crafting: 10 }).catch(() => {});

  const up = await getServerVarQuiet(page, 'upass');
  console.log(`[regicide] prep upass=${up}`);
  if (Number(up) !== 10) fail(`soft upass failed got ${up}`);

  let stage = 0;

  // --- Fast mid: Lathas complete ≥15 (soft stage 14 spoken_arianwyn + message) ---
  // Product: Talk King Lathas with message → quest_regicide_complete (15). Exclusive ===14.
  if (fromStage === 14) {
    console.log(
      `[regicide] SOFT regicide_quest 14 (spoken_arianwyn) + message → product Lathas complete ≥15`
    );
    await cheatQuiet(page, 'setvar regicide_quest 14', 500);
    stage = await getServerVarQuiet(page, 'regicide_quest');
    if (Number(stage) !== 14) fail(`soft FROM spoken_arianwyn failed got ${stage}`);

    await page
      .evaluate(() => {
        const a = globalThis.__lc377?.actions;
        const free = globalThis.__lc377?.reader?.invFree?.() ?? 0;
        if (free < 2) a?.cheat?.('~clearinv');
      })
      .catch(() => {});
    await giveItems(page, [['regicide_iorwerth_message', 1]]);
    console.log('[regicide] SOFT give regicide_iorwerth_message (report residual later)');

    console.log('[regicide] product tele Lathas', LATHAS);
    if (!(await teleTo(page, LATHAS, 2, 25_000))) fail('tele Lathas failed');
    await waitSceneReady(page, 15_000);

    console.log('[regicide] product Talk King Lathas (spoken_arianwyn → complete)');
    for (let i = 0; i < 48; i++) {
      await talkNpc(page, 'King Lathas', ['continue', 'click here', 'yes'], 24);
      await page.waitForTimeout(400);
      // Close letter/scroll IF if open
      await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
        a?.chatContinue?.();
        a?.closeInterface?.();
      });
      stage = await getServerVarQuiet(page, 'regicide_quest');
      if (Number(stage) >= 15) break;
      if (i % 5 === 4) {
        await page.evaluate(() => {
          globalThis.__lc377?.actions?.talkNpc?.('King Lathas') ||
            globalThis.__lc377?.actions?.npcOp?.('King Lathas', 'Talk-to');
        });
      }
    }
    stage = await getServerVarQuiet(page, 'regicide_quest');
    console.log(`[regicide] after Lathas regicide_quest=${stage}`);
    if (shot) await shot('after-lathas-complete');
    if (!(Number(stage) >= 15)) {
      fail(`Lathas complete FAIL: regicide_quest=${stage} want≥15`);
    }
    console.log(
      `RESULT: PASS (Regicide complete regicide_quest=${stage} ≥15; product Lathas Talk; SOFT stage14+message+upass)`
    );
    process.exit(0);
  }

  // --- Fast mid: Arianwyn ≥14 (soft stage 13 reported + message) ---
  // Product: walk/tele zone 0_40_51_24_32 → queue arianwyn_dialogue → spoken_arianwyn (14).
  // Exclusive ===13 so FROM=13 does not match report (≥12 was wrong exclusivity).
  if (fromStage === 13) {
    console.log(
      `[regicide] SOFT regicide_quest 13 (reported) + message → product Arianwyn zone ≥14`
    );
    await cheatQuiet(page, 'setvar regicide_quest 13', 500);
    stage = await getServerVarQuiet(page, 'regicide_quest');
    if (Number(stage) !== 13) fail(`soft FROM reported_iorwerth failed got ${stage}`);

    await page
      .evaluate(() => {
        const a = globalThis.__lc377?.actions;
        const free = globalThis.__lc377?.reader?.invFree?.() ?? 0;
        if (free < 2) a?.cheat?.('~clearinv');
      })
      .catch(() => {});
    await giveItems(page, [['regicide_iorwerth_message', 1]]);
    console.log('[regicide] SOFT give regicide_iorwerth_message (Iorwerth report residual later)');

    console.log('[regicide] product tele Arianwyn zone', ARIANWYN_ZONE);
    if (!(await teleTo(page, ARIANWYN_ZONE, 2, 25_000))) fail('tele Arianwyn zone failed');
    await waitSceneReady(page, 15_000);

    // Zone triggers queue dialogue; mash continue + re-enter zone if needed.
    console.log('[regicide] product Arianwyn zone dialogue → spoken_arianwyn');
    for (let i = 0; i < 80; i++) {
      await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
        a?.chatContinue?.();
        a?.closeInterface?.();
        // Click through objbox / letter IF
        a?.clickHereToContinue?.();
      });
      // Prefer talking to Arianwyn if already spawned
      if (i % 6 === 0) {
        await talkNpc(page, 'Arianwyn', ['continue', 'click here', 'yes'], 12).catch(() => {});
      }
      // Re-trigger zone if dialogue never started
      if (i % 15 === 14 && Number(await getServerVarQuiet(page, 'regicide_quest')) < 14) {
        await teleTo(page, ARIANWYN_ZONE, 1, 10_000).catch(() => {});
        await page.waitForTimeout(300);
      }
      await page.waitForTimeout(350);
      stage = await getServerVarQuiet(page, 'regicide_quest');
      if (Number(stage) >= 14) break;
    }
    stage = await getServerVarQuiet(page, 'regicide_quest');
    console.log(`[regicide] after Arianwyn regicide_quest=${stage}`);
    if (shot) await shot('after-arianwyn');
    if (!(Number(stage) >= 14)) {
      fail(`Arianwyn FAIL: regicide_quest=${stage} want≥14 (spoken_arianwyn)`);
    }
    console.log(
      `RESULT: PASS (Regicide Arianwyn regicide_quest=${stage} ≥14; product zone dialogue; SOFT stage13+message+upass)`
    );
    process.exit(0);
  }

  // --- Fast mid: report Iorwerth ≥13 (soft stage 12 killed_tyras) ---
  // Product: Talk Lord Iorwerth → message + reported_iorwerth (13). No extra soft give.
  // Exclusive ===12 so FROM=13/14 do not fall into this branch.
  if (fromStage === 12) {
    console.log(
      `[regicide] SOFT regicide_quest ${fromStage} (killed_tyras) → product report Iorwerth ≥13`
    );
    await cheatQuiet(page, `setvar regicide_quest ${fromStage}`, 500);
    if (Number(await getServerVarQuiet(page, 'regicide_quest')) !== 12) {
      await cheatQuiet(page, 'setvar regicide_quest 12', 500);
    }
    stage = await getServerVarQuiet(page, 'regicide_quest');
    if (Number(stage) !== 12) fail(`soft FROM killed_tyras failed got ${stage}`);

    // Free inv for regicide_iorwerth_message
    await page
      .evaluate(() => {
        const a = globalThis.__lc377?.actions;
        const free = globalThis.__lc377?.reader?.invFree?.() ?? 0;
        if (free < 2) a?.cheat?.('~clearinv');
      })
      .catch(() => {});

    console.log('[regicide] product tele Iorwerth', IORWERTH);
    if (!(await teleTo(page, IORWERTH, 2, 25_000))) fail('tele Iorwerth failed');
    await waitSceneReady(page, 15_000);

    console.log('[regicide] product Talk Lord Iorwerth (killed_tyras → reported_iorwerth)');
    for (let i = 0; i < 40; i++) {
      await talkNpc(page, 'Lord Iorwerth', ['continue', 'click here', 'yes'], 24);
      await page.waitForTimeout(400);
      stage = await getServerVarQuiet(page, 'regicide_quest');
      if (Number(stage) >= 13) break;
      if (i % 5 === 4) {
        await page.evaluate(() => {
          globalThis.__lc377?.actions?.talkNpc?.('Lord Iorwerth') ||
            globalThis.__lc377?.actions?.npcOp?.('Lord Iorwerth', 'Talk-to');
        });
      }
    }
    stage = await getServerVarQuiet(page, 'regicide_quest');
    const hasMsg = await page.evaluate(() => {
      const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
      return inv.some(x => /scroll|message|letter/i.test(String(x?.name ?? '')));
    });
    console.log(`[regicide] after report regicide_quest=${stage} msgish=${hasMsg}`);
    if (shot) await shot('after-report-iorwerth');
    if (!(Number(stage) >= 13)) {
      fail(`report Iorwerth FAIL: regicide_quest=${stage} want≥13 (reported_iorwerth + message)`);
    }
    console.log(
      `RESULT: PASS (Regicide report Iorwerth regicide_quest=${stage} ≥13; product Talk; SOFT stage12+upass)`
    );
    process.exit(0);
  }

  // --- Fast mid: catapult bomb kill Tyras ≥12 (soft stage 11 spoken_iorwerth2) ---
  // SOFT give cooked rabbit + fused barrel (still/craft residual later). Product: bribe + oplocu.
  if (fromStage === 11) {
    console.log(
      `[regicide] SOFT regicide_quest ${fromStage} (iorwerth2) → product catapult bomb ≥12`
    );
    await cheatQuiet(page, `setvar regicide_quest ${fromStage}`, 500);
    if (Number(await getServerVarQuiet(page, 'regicide_quest')) !== 11) {
      await cheatQuiet(page, 'setvar regicide_quest 11', 500);
    }
    await cheatQuiet(page, 'setvar regicide_bits 0', 400);
    stage = await getServerVarQuiet(page, 'regicide_quest');
    if (Number(stage) !== 11) fail(`soft FROM iorwerth2 failed got ${stage}`);

    await giveItems(page, [
      ['cooked_rabbit', 1],
      ['regicide_barrel_lid_fused', 1]
    ]);
    console.log('[regicide] SOFT give cooked_rabbit + barrel_lid_fused (bomb craft residual later)');

    console.log('[regicide] product tele catapult stand', CATAPULT_STAND);
    if (!(await teleTo(page, CATAPULT_STAND, 2, 25_000))) fail('tele catapult failed');
    await waitSceneReady(page, 15_000);

    // Bribe lazy Tyras guard (sets regicide_given_rabbit bit) — product OPNPCU.
    // Prefer nearest Tyras guard with Talk-to (lazy camp) by distance to catapult stand.
    console.log('[regicide] product rabbit → Tyras guard (lazy)');
    let rabbitOk = false;
    for (let i = 0; i < 16; i++) {
      const r = await page.evaluate(([cx, cz]) => {
        const a = globalThis.__lc377?.actions;
        const rdr = globalThis.__lc377?.reader;
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
        a?.chatContinue?.();
        a?.setSideTab?.(3);
        const inv = rdr?.inventory?.() ?? [];
        const rabbit = inv.find(x => /cooked rabbit/i.test(String(x?.name ?? '')));
        const me = rdr?.worldTile?.() || { x: cx, z: cz };
        const npcs = rdr?.npcs?.() ?? [];
        const guards = npcs
          .filter(n => /tyras guard/i.test(String(n?.name ?? '')))
          .map(n => {
            const nx = n.tile?.x ?? n.wx ?? n.x;
            const nz = n.tile?.z ?? n.wz ?? n.z;
            const d =
              typeof n.distance === 'number'
                ? n.distance
                : nx != null
                  ? Math.max(Math.abs(me.x - nx), Math.abs(me.z - nz))
                  : 99;
            return { n, d, nx, nz };
          })
          .sort((a, b) => a.d - b.d);
        const g = guards[0]?.n;
        if (!rabbit) return { ok: false, reason: 'no-rabbit', guards: guards.length };
        if (!g) return { ok: false, reason: 'no-guard', guards: 0 };
        // Walk in if far (OPNPCU range)
        if (guards[0].d > 1 && guards[0].nx != null) {
          a?.walkWorld?.(guards[0].nx, guards[0].nz);
          return { ok: false, reason: 'walk', d: guards[0].d, idx: g.index };
        }
        const ok = a?.useHeldOnNpc?.(
          { id: rabbit.id, slot: rabbit.slot, comId: rabbit.comId },
          g.index != null ? g.index : 'Tyras guard'
        );
        return { ok: !!ok, d: guards[0].d, idx: g.index, name: g.name };
      }, [CATAPULT_STAND.x, CATAPULT_STAND.z]);
      if (i === 0 || r?.ok || r?.reason === 'walk') console.log('[regicide] rabbit-on-guard', r);
      await continueThrash(page, 12, 280);
      await page.waitForTimeout(500);
      // After bribe, chat says rabbit is lovely / give us a minute — inventory loses rabbit
      const stillHas = await page.evaluate(() => {
        const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
        return inv.some(x => /cooked rabbit/i.test(String(x?.name ?? '')));
      });
      if (!stillHas) {
        rabbitOk = true;
        console.log('[regicide] rabbit consumed (bribe bit product path)');
        break;
      }
    }
    if (!rabbitOk) {
      fail('rabbit bribe FAIL: cooked rabbit still in inv (lazy guard OPNPCU not accepted)');
    }

    // Use fused barrel on catapult
    console.log('[regicide] product barrel bomb on Catapult');
    for (let i = 0; i < 20; i++) {
      stage = await getServerVarQuiet(page, 'regicide_quest');
      if (Number(stage) >= 12) break;
      const u = await page.evaluate(([cx, cz]) => {
        const a = globalThis.__lc377?.actions;
        const rdr = globalThis.__lc377?.reader;
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
        a?.setSideTab?.(3);
        const inv = rdr?.inventory?.() ?? [];
        const bomb = inv.find(x =>
          /barrel bomb|fused|barrel lid/i.test(String(x?.name ?? ''))
        );
        const locs = rdr?.locs?.({ maxDist: 12 }) ?? [];
        const cat =
          locs.find(l => /^catapult$/i.test(String(l?.name ?? ''))) ||
          rdr?.locAt?.(cx, cz);
        if (!bomb) return { ok: false, reason: 'no-bomb' };
        if (!cat) return { ok: false, reason: 'no-catapult', names: locs.map(l => l?.name).slice(0, 8) };
        const snap =
          cat.typecode != null
            ? { typecode: cat.typecode | 0, lx: cat.lx | 0, lz: cat.lz | 0, x: cat.x, z: cat.z, name: cat.name }
            : cat.name;
        const ok = a?.useHeldOnLoc?.(
          { id: bomb.id, slot: bomb.slot, comId: bomb.comId },
          snap,
          14
        );
        return { ok: !!ok, cat: cat.name, bomb: bomb.name };
      }, [CATAPULT_LOC.x, CATAPULT_LOC.z]);
      if (i % 3 === 0 || u?.ok) console.log('[regicide] bomb-on-catapult', u);
      await page.waitForTimeout(1200);
      stage = await getServerVarQuiet(page, 'regicide_quest');
    }

    stage = await getServerVarQuiet(page, 'regicide_quest');
    if (shot) await shot('after-catapult-bomb');
    if (!(Number(stage) >= 12)) {
      fail(
        `catapult bomb FAIL: regicide_quest=${stage} want≥12 (killed_tyras). SOFT rabbit+fused barrel`
      );
    }
    console.log(
      `RESULT: PASS (Regicide catapult bomb regicide_quest=${stage} ≥12; product rabbit+catapult; SOFT stage11+fused barrel)`
    );
    process.exit(0);
  }

  // --- Fast mid: Iorwerth alchemy book ≥11 (soft stage 10 entered_camp) ---
  if (fromStage === 10) {
    console.log(
      `[regicide] SOFT regicide_quest ${fromStage} (entered_camp) → product Iorwerth book ≥11`
    );
    await cheatQuiet(page, `setvar regicide_quest ${fromStage}`, 500);
    if (Number(await getServerVarQuiet(page, 'regicide_quest')) !== 10) {
      await cheatQuiet(page, 'setvar regicide_quest 10', 500);
    }
    stage = await getServerVarQuiet(page, 'regicide_quest');
    if (Number(stage) !== 10) fail(`soft FROM entered_camp failed got ${stage}`);

    console.log('[regicide] product tele Iorwerth', IORWERTH);
    if (!(await teleTo(page, IORWERTH, 2, 25_000))) fail('tele Iorwerth failed');
    await waitSceneReady(page, 15_000);

    // Free inv slot for alchemy book
    await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const free = globalThis.__lc377?.reader?.invFree?.() ?? 0;
      if (free < 1) a?.cheat?.('~clearinv');
    }).catch(() => {});

    console.log('[regicide] product Talk Lord Iorwerth (entered_camp → spoken_iorwerth2)');
    for (let i = 0; i < 40; i++) {
      await talkNpc(page, 'Lord Iorwerth', ['yes', 'continue', 'click here'], 24);
      await page.waitForTimeout(400);
      stage = await getServerVarQuiet(page, 'regicide_quest');
      if (Number(stage) >= 11) break;
      // re-op if chat closed without write
      if (i % 5 === 4) {
        await page.evaluate(() => {
          globalThis.__lc377?.actions?.talkNpc?.('Lord Iorwerth') ||
            globalThis.__lc377?.actions?.npcOp?.('Lord Iorwerth', 'Talk-to');
        });
      }
    }
    stage = await getServerVarQuiet(page, 'regicide_quest');
    const hasBook = await page.evaluate(() => {
      const r = globalThis.__lc377?.reader;
      return !!(r?.invHas?.('alchemy') || r?.invHas?.('Alchemy') || r?.invHas?.('book'));
    });
    console.log(`[regicide] after Iorwerth regicide_quest=${stage} bookish=${hasBook}`);
    if (shot) await shot('after-iorwerth2');
    if (!(Number(stage) >= 11)) {
      fail(`iorwerth2 FAIL: regicide_quest=${stage} want≥11 (spoken_iorwerth2 + alchemy book)`);
    }
    console.log(
      `RESULT: PASS (Regicide Iorwerth2 regicide_quest=${stage} ≥11; product Talk; SOFT stage10+upass)`
    );
    process.exit(0);
  }

  // --- Fast mid: dense forest → Tyras camp ≥10 (soft stage 9 defeated_guard) ---
  if (fromStage === 9) {
    console.log(
      `[regicide] SOFT regicide_quest ${fromStage} (defeated_guard) → product dense-forest Enter ≥10`
    );
    await cheatQuiet(page, `setvar regicide_quest ${fromStage}`, 500);
    if (Number(await getServerVarQuiet(page, 'regicide_quest')) !== 9) {
      await cheatQuiet(page, 'setvar regicide_quest 9', 500);
    }
    stage = await getServerVarQuiet(page, 'regicide_quest');
    if (Number(stage) !== 9) fail(`soft FROM defeated_guard failed got ${stage}`);

    await setStats(page, { agility: 56 }).catch(() => {});
    await fillRunEnergy(page).catch(() => {});

    console.log('[regicide] product tele dense start tile', DENSE_STAND);
    if (!(await teleTo(page, DENSE_STAND, 1, 25_000))) fail('tele dense start failed');
    await waitSceneReady(page, 15_000);

    const locSnap = await page.evaluate(([lx, lz]) => {
      const r = globalThis.__lc377?.reader;
      const self = r?.tile?.() ?? r?.self?.();
      const locs = r?.locs?.({ maxDist: 12 }) ?? [];
      return {
        self,
        dens: locs
          .map(l => ({
            name: l?.name,
            op: l?.op,
            x: l?.x,
            z: l?.z,
            d: l?.distance
          }))
          .filter(l => /dense|forest/i.test(String(l?.name ?? '')))
          .slice(0, 12),
        want: `${lx},${lz}`
      };
    }, [DENSE_LOC.x, DENSE_LOC.z]);
    console.log('[regicide] dense forest snap', JSON.stringify(locSnap));

    console.log('[regicide] product Enter dense forest (cross_over2_tyras_camp → stage 10)');
    for (let i = 0; i < 16; i++) {
      // Prefer exact camp loc tile 2187,3169 (not other Dense forest in range)
      await page.evaluate(([wx, wz]) => {
        const a = globalThis.__lc377?.actions;
        a?.opLocAt?.(wx, wz, 'Enter') || a?.opLocAt?.(wx, wz, '');
      }, [DENSE_LOC.x, DENSE_LOC.z]);
      await page.waitForTimeout(1200);
      stage = await getServerVarQuiet(page, 'regicide_quest');
      if (Number(stage) >= 10) break;
      // re-snap to start tile if we bounced
      if (i % 4 === 3) {
        await teleTo(page, DENSE_STAND, 1, 12_000);
        await waitSceneReady(page, 8_000);
      }
    }
    stage = await getServerVarQuiet(page, 'regicide_quest');
    console.log(`[regicide] after dense enter regicide_quest=${stage}`);
    if (shot) await shot('after-dense-camp');
    if (!(Number(stage) >= 10)) {
      fail(
        `camp-enter FAIL: regicide_quest=${stage} want≥10 (entered_camp). product Enter dense forest`
      );
    }
    console.log(
      `RESULT: PASS (Regicide camp enter regicide_quest=${stage} ≥10; product dense-forest; SOFT stage9+upass+agi56)`
    );
    process.exit(0);
  }

  // --- Fast mid: Tyras guard kill ≥9 (soft stage 8 spoken_tracker2) ---
  if (fromStage === 8) {
    console.log(
      `[regicide] SOFT regicide_quest ${fromStage} (spoken_tracker2) → product Tyras guard kill ≥9`
    );
    await cheatQuiet(page, `setvar regicide_quest ${fromStage}`, 500);
    // exact equality for death write
    if (Number(await getServerVarQuiet(page, 'regicide_quest')) !== 8) {
      await cheatQuiet(page, 'setvar regicide_quest 8', 500);
    }
    stage = await getServerVarQuiet(page, 'regicide_quest');
    if (Number(stage) !== 8) fail(`soft FROM tracker2 failed got ${stage}`);

    // Soft prep combat floor (vislevel 110 / 110 HP). setstat only — NOT ~maxme
    // (maxme stat_advance spam level-up jingles + music thrash).
    // Flair kit: full gilded + d scim (match high floor). Equip gates:
    //   d scim → ATK 60 + mm_main ≥ complete; gilded platebody → DEF 40 + DS complete.
    console.log(
      '[regicide] SOFT combat prep (setstat floor + soft mm/DS + gilded + d scim + sharks)'
    );
    await setStats(page, {
      attack: 90,
      strength: 90,
      defence: 80,
      hitpoints: 90,
      agility: 56
    }).catch(() => {});
    await fillRunEnergy(page).catch(() => {});
    await cheatQuiet(page, 'setvar mm_main 10', 400);
    await cheatQuiet(page, 'setvar dragonquest 10', 400);

    console.log('[regicide] product tele guard stand', GUARD_STAND);
    if (!(await teleTo(page, GUARD_STAND, 2, 25_000))) fail('tele guard stand failed');
    await waitSceneReady(page, 15_000);

    await giveItems(page, [
      ['dragon_scimitar', 1],
      ['rune_full_helm_goldplate', 1],
      ['rune_platebody_goldplate', 1],
      ['rune_platelegs_goldplate', 1],
      ['rune_kiteshield_goldplate', 1],
      ['shark', 12]
    ]).catch(() => {});
    await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      for (const n of [
        'Dragon scimitar',
        'Gilded full helm',
        'Gilded platebody',
        'Gilded platelegs',
        'Gilded kiteshield'
      ]) {
        a?.equip?.(n) || a?.heldOp?.(n, 2);
        await new Promise(r => setTimeout(r, 250));
      }
    });
    // Soft spawn once (product dense-forest spawn residual later). Do not re-~npc mid-fight.
    console.log('[regicide] SOFT spawn once ~npc regicide_old_camp_guard');
    await cheatQuiet(page, '~npc regicide_old_camp_guard', 1500);
    let spawnIdx = await page.evaluate(() => {
      const g = (globalThis.__lc377?.reader?.npcs?.() ?? []).find(n =>
        /tyras guard/i.test(String(n?.name ?? ''))
      );
      return g?.index ?? null;
    });
    if (spawnIdx == null) {
      await cheatQuiet(page, '~npc regicide_old_camp_guard', 1000);
      spawnIdx = await page.evaluate(() => {
        const g = (globalThis.__lc377?.reader?.npcs?.() ?? []).find(n =>
          /tyras guard/i.test(String(n?.name ?? ''))
        );
        return g?.index ?? null;
      });
    }
    if (spawnIdx == null) {
      const names = await page.evaluate(() =>
        (globalThis.__lc377?.reader?.npcs?.() ?? []).map(n => n?.name).filter(Boolean).slice(0, 24)
      );
      fail(`no Tyras guard after ~npc; nearby=${JSON.stringify(names)}`);
    }
    console.log(`[regicide] attack Tyras guard idx=${spawnIdx} (product death → stage 9)`);
    await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      a?.attackNpc?.('Tyras guard');
    });

    // Fight: track *spawn index* so a new soft/map slot is not treated as same fight.
    // No mid-fight getvar (busy). No re-spawn cheat.
    const t0 = Date.now();
    const timeoutMs = Number(process.env.GUARD_FIGHT_MS) || 120_000;
    let f = 0;
    let sawDespawn = false;
    while (Date.now() - t0 < timeoutMs) {
      f++;
      await page.waitForTimeout(400);
      const snap = await page.evaluate(wantIdx => {
        const r = globalThis.__lc377?.reader;
        const a = globalThis.__lc377?.actions;
        const list = r?.npcs?.() ?? [];
        const byIdx = list.find(n => (n.index | 0) === (wantIdx | 0));
        const anyGuard = list.find(n => /tyras guard/i.test(String(n?.name ?? '')));
        if (byIdx) {
          if ((f => f) && a) {
            /* re-attack below */
          }
        }
        return {
          stillIdx: !!byIdx,
          anyGuard: !!anyGuard,
          anyIdx: anyGuard?.index ?? null,
          combat: !!r?.inCombat?.(),
          gCombat: !!byIdx?.inCombat || !!anyGuard?.inCombat,
          d: byIdx?.distance ?? anyGuard?.distance ?? null,
          hp: r?.hitpoints?.()
        };
      }, spawnIdx);

      if (snap.stillIdx && f % 3 === 0) {
        await page.evaluate(() => globalThis.__lc377?.actions?.attackNpc?.('Tyras guard'));
      }
      if (snap.stillIdx && f % 5 === 2) {
        await page.evaluate(() => {
          const a = globalThis.__lc377?.actions;
          const r = globalThis.__lc377?.reader;
          const hp = r?.hitpoints?.() ?? r?.stat?.(3);
          if ((hp?.effective ?? 99) < 40) {
            a?.heldOp?.('Shark', 2) || a?.heldOp?.('Lobster', 2);
          }
        });
      }

      if (f % 15 === 0) {
        console.log(
          `[regicide] guard fight f=${f} stillIdx=${snap.stillIdx} any=${snap.anyGuard}@${snap.anyIdx} diag=${JSON.stringify(snap)}`
        );
      }

      // Original spawn gone — product death path; do not attack a replacement
      if (!snap.stillIdx && f > 5) {
        sawDespawn = true;
        await page.waitForTimeout(1200);
        stage = await getServerVarQuiet(page, 'regicide_quest');
        console.log(
          `[regicide] spawn idx ${spawnIdx} gone f=${f} stage=${stage} replacement=${snap.anyGuard ? snap.anyIdx : 'none'}`
        );
        break;
      }
    }

    if (!sawDespawn) {
      stage = await getServerVarQuiet(page, 'regicide_quest');
      console.log(
        `[regicide] after guard timeout stage=${stage} elapsed=${Date.now() - t0}ms f=${f}`
      );
    } else {
      console.log(
        `[regicide] after guard despawn regicide_quest=${stage} elapsed=${Date.now() - t0}ms f=${f}`
      );
    }
    if (shot) await shot('after-guard');
    if (!(Number(stage) >= 9)) {
      fail(
        `guard-gate FAIL: regicide_quest=${stage} want≥9 (defeated_guard). despawn=${sawDespawn} f=${f}`
      );
    }
    console.log(
      `RESULT: PASS (Regicide guard kill regicide_quest=${stage} ≥9; product death write; SOFT stage8+npcadd once+upass+gilded+d scim)`
    );
    process.exit(0);
  }

  // --- Fast mid: footprints ≥7 + tracker tips ≥8 (soft stage 6) ---
  if (fromStage === 6) {
    console.log(
      `[regicide] SOFT regicide_quest ${fromStage} (shown_pendant) → footprints ≥7 → tracker ≥8 to=${toStage}`
    );
    await cheatQuiet(page, `setvar regicide_quest ${fromStage}`, 500);
    stage = await getServerVarQuiet(page, 'regicide_quest');
    if (Number(stage) < 6) fail(`soft FROM pendant failed got ${stage}`);
    // exact equality for footprints write is shown_pendant (6)
    if (Number(stage) !== 6) {
      console.log('[regicide] SOFT clamp regicide_quest 6 for footprints gate');
      await cheatQuiet(page, 'setvar regicide_quest 6', 500);
    }

    console.log('[regicide] product footprints', FOOTPRINTS);
    if (!(await teleTo(page, FOOTPRINTS, 2, 25_000))) fail('tele footprints failed');
    await waitSceneReady(page, 15_000);
    const locSnap = await page.evaluate(() => {
      const r = globalThis.__lc377?.reader;
      const locs = r?.locs?.({ maxDist: 8 }) ?? [];
      return locs.map(l => ({
        name: l?.name,
        wx: l?.wx ?? l?.x,
        wz: l?.wz ?? l?.z,
        ops: l?.ops
      }));
    });
    console.log('[regicide] nearby locs', JSON.stringify(locSnap.slice(0, 20)));
    const fpOp = await page.evaluate(async ([wx, wz]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      let ok =
        a?.opLocAt?.(wx, wz, '') ||
        a?.opLocAt?.(wx + 1, wz, '') ||
        a?.opLoc?.('footprint', '') ||
        a?.opLoc?.('foot', '') ||
        a?.opLoc?.('print', '') ||
        a?.opLoc?.('track', '');
      if (!ok) {
        // bare loc id path: any nearby with Examine-only or null name
        const locs = r?.locs?.({ maxDist: 6 }) ?? [];
        for (const l of locs) {
          if (l?.typecode != null && a?.menuAction) {
            // OP_LOC1
            try {
              ok = !!a.menuAction?.(14, l.typecode, l.lx, l.lz);
            } catch {
              /* ignore */
            }
            if (ok) break;
            ok = !!a.opLocAt?.(l.wx ?? l.x, l.wz ?? l.z, '');
            if (ok) break;
          }
        }
      }
      await new Promise(res => setTimeout(res, 1000));
      a?.continueDialog?.();
      a?.dismissModalMessage?.();
      return !!ok;
    }, [FOOTPRINTS.x, FOOTPRINTS.z]);
    console.log('[regicide] footprints op', fpOp);
    await continueThrash(page, 4, 280);
    stage = await getServerVarQuiet(page, 'regicide_quest');
    if (Number(stage) < 7) {
      // second tile + examine spam
      for (const dx of [0, 1, -1]) {
        await page.evaluate(async ([wx, wz, d]) => {
          const a = globalThis.__lc377?.actions;
          a?.opLocAt?.(wx + d, wz, '');
          a?.opLocAt?.(wx + d, wz + 0, 'examine');
          await new Promise(r => setTimeout(r, 700));
        }, [FOOTPRINTS.x, FOOTPRINTS.z, dx]);
      }
      stage = await getServerVarQuiet(page, 'regicide_quest');
    }
    console.log(`[regicide] after footprints regicide_quest=${stage}`);
    if (shot) await shot('after-footprints');
    if (!(Number(stage) >= 7)) {
      fail(`footprints-gate FAIL: regicide_quest=${stage} want≥7`);
    }

    if (toStage >= 8) {
      console.log('[regicide] product tracker forest tips at stage 7');
      if (!(await teleTo(page, TRACKER, 3, 25_000))) fail('tele Tracker tips failed');
      await waitSceneReady(page, 15_000);
      const talkTips = await talkNpc(
        page,
        'Tracker',
        ['hello', 'thanks', 'see what', 'continue'],
        48
      );
      console.log('[regicide] talk Tracker tips', JSON.stringify(talkTips));
      if (talkTips?.noTrig) {
        await talkNpc(page, 'Elf', ['hello', 'thanks', 'continue'], 32);
      }
      await continueThrash(page, 16, 280);
      stage = await getServerVarQuiet(page, 'regicide_quest');
      for (let i = 0; i < 8 && Number(stage) < 8; i++) {
        await continueThrash(page, 6, 280);
        stage = await getServerVarQuiet(page, 'regicide_quest');
      }
      console.log(`[regicide] after tracker tips regicide_quest=${stage}`);
      if (shot) await shot('after-tracker-tips');
      if (!(Number(stage) >= 8)) {
        fail(`tracker2-gate FAIL: regicide_quest=${stage} want≥8`);
      }
      console.log(
        `RESULT: PASS (Regicide footprints+tips regicide_quest=${stage} ≥8; product; SOFT stage${fromStage}+upass)`
      );
      process.exit(0);
    }

    console.log(
      `RESULT: PASS (Regicide footprints regicide_quest=${stage} ≥7; product; SOFT stage${fromStage}+upass)`
    );
    process.exit(0);
  }

  // --- Fast mid: Elf Tracker (soft ≥4 → product ≥5; optional pendant ≥6) ---
  if (fromStage === 4) {
    console.log(
      `[regicide] SOFT regicide_quest ${fromStage} → product Elf Tracker ≥5 (to=${toStage})`
    );
    await cheatQuiet(page, `setvar regicide_quest ${fromStage}`, 500);
    stage = await getServerVarQuiet(page, 'regicide_quest');
    if (Number(stage) < 4) fail(`soft FROM iorwerth failed got ${stage}`);

    console.log('[regicide] product tele Elf Tracker', TRACKER);
    if (!(await teleTo(page, TRACKER, 3, 30_000))) fail('tele Tracker failed');
    await waitSceneReady(page, 20_000);
    if (shot) await shot('at-tracker');

    const nearby = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.npcs?.() ?? []).map(n => n?.name).filter(Boolean)
    );
    console.log('[regicide] nearby npcs', nearby.slice(0, 12));
    if (!nearby.some(n => /tracker|elf/i.test(String(n)))) {
      console.warn('[regicide] tracker name not obvious in scene list — still trying talk');
    }

    // No pendant → distrust path writes stage 5 if still < 5
    const talkTr = await talkNpc(
      page,
      'Tracker',
      ['hello', 'no', 'well', 'err', 'continue', 'thanks'],
      48
    );
    console.log('[regicide] talk Tracker', JSON.stringify(talkTr));
    if (talkTr?.noTrig) {
      const talk2 = await talkNpc(page, 'Elf', ['hello', 'no', 'well', 'continue'], 48);
      console.log('[regicide] talk Elf fallback', JSON.stringify(talk2));
      if (talk2?.noTrig) fail(talk2.noTrig);
    }
    await continueThrash(page, 16, 280);
    stage = await getServerVarQuiet(page, 'regicide_quest');
    for (let i = 0; i < 8 && Number(stage) < 5; i++) {
      await continueThrash(page, 6, 280);
      stage = await getServerVarQuiet(page, 'regicide_quest');
    }
    console.log(`[regicide] after Tracker regicide_quest=${stage}`);
    if (shot) await shot('after-tracker');
    if (!(Number(stage) >= 5)) {
      fail(`tracker-gate FAIL: regicide_quest=${stage} want≥5 (spoken_tracker)`);
    }

    if (toStage >= 6) {
      // Product pendant from Iorwerth at stage 5, then re-talk tracker with pendant → 6
      console.log('[regicide] product Iorwerth pendant at stage 5', IORWERTH);
      if (!(await teleTo(page, IORWERTH, 3, 30_000))) fail('tele Iorwerth pendant failed');
      await waitSceneReady(page, 15_000);
      const talkIo = await talkNpc(
        page,
        'Lord Iorwerth',
        ['hello', 'pendant', 'tracker', 'continue', 'thanks'],
        48
      );
      console.log('[regicide] talk Iorwerth pendant', JSON.stringify(talkIo));
      if (talkIo?.noTrig) fail(talkIo.noTrig);
      await continueThrash(page, 16, 280);

      if (!(await teleTo(page, TRACKER, 3, 30_000))) fail('tele Tracker with pendant failed');
      await waitSceneReady(page, 15_000);
      const talkTr2 = await talkNpc(
        page,
        'Tracker',
        ['hello', 'tyras', 'camp', 'help', 'continue', 'thanks'],
        56
      );
      console.log('[regicide] talk Tracker pendant', JSON.stringify(talkTr2));
      if (talkTr2?.noTrig) {
        await talkNpc(page, 'Elf', ['hello', 'tyras', 'help', 'continue'], 48);
      }
      await continueThrash(page, 20, 280);
      stage = await getServerVarQuiet(page, 'regicide_quest');
      for (let i = 0; i < 10 && Number(stage) < 6; i++) {
        await continueThrash(page, 6, 280);
        stage = await getServerVarQuiet(page, 'regicide_quest');
      }
      console.log(`[regicide] after pendant tracker regicide_quest=${stage}`);
      if (shot) await shot('after-tracker-pendant');
      if (!(Number(stage) >= 6)) {
        fail(`pendant-tracker-gate FAIL: regicide_quest=${stage} want≥6 (shown_pendant)`);
      }
      console.log(
        `RESULT: PASS (Regicide tracker+pendant regicide_quest=${stage} ≥6; product tracker+Iorwerth pendant; SOFT stage${fromStage}+upass)`
      );
      process.exit(0);
    }

    console.log(
      `RESULT: PASS (Regicide tracker regicide_quest=${stage} ≥5; product Elf Tracker; SOFT stage${fromStage}+upass)`
    );
    process.exit(0);
  }

  if (!midOnly) {
    console.log('[regicide] SOFT regicide_quest 1 (messenger done)');
    await cheatQuiet(page, 'setvar regicide_quest 1', 500);
    const r0 = await getServerVarQuiet(page, 'regicide_quest');
    if (Number(r0) !== 1) fail(`soft messenger stage failed got ${r0}`);

    console.log('[regicide] tele Lathas', LATHAS);
    if (!(await teleTo(page, LATHAS, 3, 25_000))) fail('tele Lathas failed');
    await waitSceneReady(page, 15_000);
    if (shot) await shot('at-lathas');

    const talk = await talkNpc(page, 'King Lathas', [
      'received your message',
      'serve the kingdom',
      'continue'
    ]);
    console.log('[regicide] talk Lathas', JSON.stringify(talk));
    if (talk?.noTrig) fail(talk.noTrig);
    await continueThrash(page, 20, 300);

    stage = await getServerVarQuiet(page, 'regicide_quest');
    for (let i = 0; i < 8 && Number(stage) < 2; i++) {
      await continueThrash(page, 8, 280);
      stage = await getServerVarQuiet(page, 'regicide_quest');
    }
    console.log(`[regicide] after Lathas regicide_quest=${stage}`);
    if (shot) await shot('after-lathas');

    if (!(Number(stage) >= 2)) {
      fail(
        `start-gate FAIL: regicide_quest=${stage} want≥2 (spoken_lathas). talk=${JSON.stringify(talk)}`
      );
    }
  } else {
    // mid-only: soft stage 2 so Idris timer can arm (exact equality spoken_lathas)
    console.log('[regicide] SOFT regicide_quest 2 (mid-only / spoken_lathas)');
    await cheatQuiet(page, 'setvar regicide_quest 2', 500);
    stage = await getServerVarQuiet(page, 'regicide_quest');
    if (Number(stage) !== 2) fail(`soft stage 2 failed got ${stage}`);
  }

  if (skipIdris) {
    // Legacy mid: SOFT skip product ambush → stage 3, then Iorwerth
    console.log('[regicide] SOFT regicide_quest 3 (REGICIDE_SKIP_IDRIS / Idris skip)');
    await cheatQuiet(page, 'setvar regicide_quest 3', 500);
    const r3 = await getServerVarQuiet(page, 'regicide_quest');
    if (Number(r3) !== 3) fail(`soft scouts stage failed got ${r3}`);
  } else {
    // Product Idris: tele armed mapsquare → music mapzone arms timer (20–30t) → ambush → stage 3
    console.log('[regicide] product Idris tele Isafdar', ISAFDAR_IDRIS);
    if (!(await teleTo(page, ISAFDAR_IDRIS, 4, 30_000))) fail('tele Isafdar Idris failed');
    await waitSceneReady(page, 20_000);
    if (shot) await shot('at-isafdar-idris');

    // Wait timer (20–30 ticks) + ambush dialogue; thrash continues while watching stage
    const tickMs = Number(process.env.WORLD_SPEED_MS) || 300;
    const waitMs = Math.max(45_000, tickMs * 80); // ≥30t arm + dialogue slack
    console.log(`[regicide] wait Idris ambush up to ${waitMs}ms (tick≈${tickMs}ms)`);
    const t0 = Date.now();
    stage = await getServerVarQuiet(page, 'regicide_quest');
    while (Date.now() - t0 < waitMs && Number(stage) < 3) {
      await continueThrash(page, 6, 250);
      // re-talk if Idris / elves present and chat stalled
      await page.evaluate(async () => {
        const a = globalThis.__lc377?.actions;
        const r = globalThis.__lc377?.reader;
        const npcs = r?.npcs?.() ?? [];
        const idris = npcs.find(n => /idris|essyllt|morvran|elf/i.test(String(n?.name ?? '')));
        if (idris && a?.npcOp) a.npcOp(idris.index, 1);
        // continue chat if open
        try {
          a?.chatContinue?.();
        } catch {
          /* ignore */
        }
        await new Promise(res => setTimeout(res, 400));
      }).catch(() => {});
      stage = await getServerVarQuiet(page, 'regicide_quest');
    }
    console.log(`[regicide] after Idris regicide_quest=${stage} elapsed=${Date.now() - t0}ms`);
    if (shot) await shot('after-idris');
    if (!(Number(stage) >= 3)) {
      const npcs = await page.evaluate(() =>
        (globalThis.__lc377?.reader?.npcs?.() ?? []).map(n => n?.name).filter(Boolean)
      );
      fail(
        `idris-gate FAIL: regicide_quest=${stage} want≥3 (spoken_scouts). nearby=${JSON.stringify(npcs.slice(0, 16))}`
      );
    }
  }

  console.log('[regicide] tele Iorwerth', IORWERTH);
  if (!(await teleTo(page, IORWERTH, 4, 30_000))) fail('tele Iorwerth failed');
  await waitSceneReady(page, 20_000);
  if (shot) await shot('at-iorwerth');

  // Confirm NPC in scene
  const npcs = await page.evaluate(() =>
    (globalThis.__lc377?.reader?.npcs?.() ?? []).map(n => n?.name).filter(Boolean)
  );
  console.log('[regicide] nearby npcs', npcs.slice(0, 12));
  if (!npcs.some(n => /iorwerth/i.test(String(n)))) {
    fail(`Lord Iorwerth not in scene: ${JSON.stringify(npcs.slice(0, 20))}`);
  }

  const talkIo = await talkNpc(page, 'Lord Iorwerth', [
    'scouts',
    'Hello',
    'continue'
  ]);
  console.log('[regicide] talk Iorwerth', JSON.stringify(talkIo));
  if (talkIo?.noTrig) fail(talkIo.noTrig);
  await continueThrash(page, 24, 300);

  stage = await getServerVarQuiet(page, 'regicide_quest');
  for (let i = 0; i < 10 && Number(stage) < 4; i++) {
    await continueThrash(page, 8, 280);
    stage = await getServerVarQuiet(page, 'regicide_quest');
  }
  console.log(`[regicide] after Iorwerth regicide_quest=${stage}`);
  if (shot) await shot('after-iorwerth');

  if (!(Number(stage) >= 4)) {
    fail(
      `mid-gate FAIL: regicide_quest=${stage} want≥4 (spoken_iorwerth). talk=${JSON.stringify(talkIo)}`
    );
  }

  console.log(
    `RESULT: PASS (Regicide mid-gate regicide_quest=${stage} ≥4; product Iorwerth; ${
      skipIdris ? 'SOFT Idris-skip stage3' : 'product Idris ≥3'
    }; SOFT upass+messenger${midOnly ? ' mid-only soft stage2' : ' + product Lathas start'})`
  );
  process.exit(0);
} catch (e) {
  console.error('FAIL:', e?.message || e);
  process.exit(1);
} finally {
  try {
    await browser?.close?.();
  } catch {
    /* ignore */
  }
}
