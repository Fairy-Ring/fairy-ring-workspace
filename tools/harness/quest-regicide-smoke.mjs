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
 *
 * Soft: upass 10; staged FROM skips earlier product. Soft ≠ authentic full playthrough.
 * Product: Lathas ≥2; Idris ≥3; Iorwerth ≥4; tracker ≥5; pendant ≥6; footprints ≥7; tips ≥8.
 *
 * @see docs/research/regicide-zones-tracker-residual-377.md
 * @see docs/research/regicide-idris-spawn-377.md
 * @see docs/plans/2026-08-07-regicide-start-gate-smoke.md
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
const midOnly = process.env.REGICIDE_MID_ONLY === '1' || process.env.REGICIDE_MID_ONLY === 'true';
const skipIdris =
  process.env.REGICIDE_SKIP_IDRIS === '1' || process.env.REGICIDE_SKIP_IDRIS === 'true';
const fromStage = Number(process.env.REGICIDE_FROM || 0) || 0;
const toStage =
  Number(
    process.env.REGICIDE_TO ||
      (fromStage >= 6 ? 8 : fromStage >= 4 ? 5 : 4)
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

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  page.on('console', msg => {
    const t = msg.text();
    if (/regicide|lathas|trigger|error|script/i.test(t)) {
      console.log(`[browser.${msg.type()}] ${t.slice(0, 260)}`);
    }
  });

  console.log(
    `[regicide] ${base} user=${username} midOnly=${midOnly} skipIdris=${skipIdris} from=${fromStage || 'start'} to=${toStage} (headed default)`
  );
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

  // --- Fast mid: footprints ≥7 + tracker tips ≥8 (soft stage 6) ---
  if (fromStage >= 6) {
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
  if (fromStage >= 4) {
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
