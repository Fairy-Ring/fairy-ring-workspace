#!/usr/bin/env node
/**
 * Shades of Mort'ton e2e smoke (start diary → mid temple).
 *
 * Host prep (not content proofs):
 *   - mainlandAccount + combat/herblore floor
 *   - diary flip to last page → morttonquest = 5 (read_diary)
 *   - brew materials (tarromin, ashes, vials) + combat gear + serum spare
 *   - one tele to Mort'ton (Ulsquire); no mid-quest tele
 *
 * Script: scripts.start('quest-mortton') — brew → Razmire → kill 5 (default).
 * Temple (50) only with real ground remains — no give-seed.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-mortton-smoke.mjs   # headed default ≥40
 *   MORTTON_COMPLETE_STAGE=15 node tools/harness/quest-mortton-smoke.mjs
 *   MORTTON_COMPLETE_STAGE=50 …  # needs ground-take remains; will hard-fail if missing
 *   MORTTON_FROM=50 …            # soft temple mid → product Flamtaer first repair ≥55
 *   MORTTON_FROM=50 MORTTON_TO=60 …  # thrash until temple_repaired_p=100 (visible full segments)
 *   MORTTON_FROM=60 MORTTON_TO=65 …  # soft 60 + product light altar + olive oil → sacred oil
 *   MORTTON_FROM=60 MORTTON_TO=85 …  # residual default: one soft entry, e2e under bar §2
 *
 * Residual bar (default when MORTTON_FROM set — highest promise standard):
 *   one soft setvar morttonquest=FROM at thrash start; then only setstat/tele/generic prep.
 *   No mid-path quest/multi setvar; no give sacred oil / remains / quest seeds.
 *   Opt out: MORTTON_SOFT_THRASH=1 (DIRTY thrash only — not residual PASS).
 *
 * @see docs/plans/2026-08-08-promise-cleanup.md
 * @see docs/research/mortton-flamtaer-complete-377.md
 */
import {
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
import { softRandomTick } from './lib/randomEvents.mjs';

const argv = process.argv.slice(2);
const { base, rest } = parseArgs(argv.filter(a => a !== '--max-ms'));
const maxMsIdx = argv.indexOf('--max-ms');
const maxMs = maxMsIdx >= 0 ? Number(argv[maxMsIdx + 1]) || 15 * 60_000 : 15 * 60_000;
const { username, password } = resolveAccount(
  rest.filter(r => r !== String(maxMs)),
  'mtn'
);

/**
 * Default mid-gate: **40** (five shades) — authentic combat proof.
 * Temple 50 needs real ground remains (no give-seed). Start: 5. Accept kill: 15.
 * Flamtaer: MORTTON_FROM=50 → first wall repair ≥55.
 */
const wantStage = Number(process.env.MORTTON_COMPLETE_STAGE) || 40;
const fromStage = Number(process.env.MORTTON_FROM || 0) || 0;
const toStage =
  Number(
    process.env.MORTTON_TO ||
      (fromStage >= 65
        ? 85
        : fromStage >= 60
          ? 65
          : fromStage >= 50
            ? 55
            : wantStage)
  ) || wantStage;
/** Highest residual bar when soft-entering mid (stance rule 9). */
const residualMode =
  fromStage > 0 &&
  process.env.MORTTON_SOFT_THRASH !== '1' &&
  process.env.MORTTON_SOFT_THRASH !== 'true';
const softThrash = !residualMode && fromStage > 0;
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

/** m54_51 `0 40 25: 1251` ulsquire_shauncy_afflicted */
const ULSQUIRE = { x: 3496, z: 3289, level: 0 };
/** Funeral pyre sample — m54_51 `0 9 19: temple_pyre` → 3465,3283. Stand adjacent. */
const FUNERAL_PYRE = { x: 54 * 64 + 9, z: 51 * 64 + 19, level: 0 };
const FUNERAL_PYRE_STAND = { x: FUNERAL_PYRE.x + 1, z: FUNERAL_PYRE.z, level: 0 };
/** Loar shadow spawns m54_51 (npc 1240) — sample jm2 tiles for residual hunt. */
const SHADE_FIELD_SPAWNS = [
  { x: 3474, z: 3280, level: 0 }, // 0 18 16
  { x: 3478, z: 3307, level: 0 }, // 0 22 43
  { x: 3479, z: 3283, level: 0 }, // 0 23 19
  { x: 3480, z: 3271, level: 0 }, // 0 24 7
  { x: 3482, z: 3302, level: 0 }, // 0 26 38
  { x: 3483, z: 3283, level: 0 } // 0 27 19
];
/** Flamtaer wall sample (Broken Wall) — do NOT tele onto; op from inside courtyard. */
const FLAMTAER_WALL = { x: 54 * 64 + 48, z: 51 * 64 + 51, level: 0 };
/**
 * Altar loc `0_54_51_50_52` → 3506,3316 — scenery tile; **UNWALKABLE**.
 * @see docs/research/game-knowledge/harness-tele-stand.md
 */
const FLAMTAER_ALTAR = { x: 54 * 64 + 50, z: 51 * 64 + 52, level: 0 };
/**
 * Walkable stand **next to** altar (SW), inside the wall ring.
 * tele / soft re-tele home — never tele onto FLAMTAER_ALTAR.
 */
const FLAMTAER_COURTYARD = { x: 3505, z: 3315, level: 0 };
/**
 * Soft re-tele / “still inside temple” box (outer inclusive).
 * Walls form a ring around the altar; thrash **stands inside** and Repair-ops
 * adjacent segs — never walkWorld onto outer tiles.
 */
const TEMPLE_BOX = { x0: 3502, z0: 3312, x1: 3510, z1: 3320 };
/** Geometric centre for “step wall → inside” projection (may equal altar; not a tele). */
const TEMPLE_CENTER = { x: FLAMTAER_ALTAR.x, z: FLAMTAER_ALTAR.z };

const MORTTON_STATS = {
  herblore: 20,
  // Practical combat floor — Loar shades + multi aggro (smoke mtnsgr765j died @35)
  attack: 60,
  strength: 60,
  defence: 50,
  hitpoints: 70,
  prayer: 1,
  crafting: 80,
  firemaking: 40
};

const browser = await launchBrowser();
/** @type {import('playwright').Page | null} */
let page = null;
/** @type {((label: string) => Promise<string|null>) | null} */
let shot = null;

try {
  page = await browser.newPage();
  page.on('console', msg => {
    const t = msg.text();
    if (
      /script|mort|ulsquire|razmire|shade|trigger|error|quest|377port.*scene complete|brew|kill-shade/i.test(
        t
      )
    ) {
      console.log(`[browser.${msg.type()}] ${t.slice(0, 320)}`);
    }
  });

  console.log(
    `[quest-mortton] ${base} user=${username} maxMs=${maxMs} wantStage=${wantStage} from=${fromStage || 'start'} to=${toStage} residual=${residualMode} softThrash=${softThrash} (headed default)`
  );
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);

  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`quest-mortton_${username}`);
    shot = (await installScreenshotBridge(page, shotDir)).shot;
    await page.evaluate(() => {
      globalThis.__harnessShotPolicy = { autoStall: false, maxStallShots: 0 };
    });
    console.log(`[quest-mortton] shots → ${shotDir}`);
  }

  await mainlandAccount(page, username, password);
  await waitSceneReady(page, 60_000);
  await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300);
  await fillRunEnergy(page);

  console.log('[quest-mortton] prep: setstat', JSON.stringify(MORTTON_STATS));
  await setStats(page, MORTTON_STATS);

  // --- Flamtaer residual (soft entry ≥50) ---
  // 55 = first repair · 60 = repaired_p=100 · 65 = olive oil on lit altar
  if (fromStage >= 50) {
    const target = Math.max(55, toStage);
    /** Rebuild thrash when soft entry is still below can-light (60). */
    const doRebuild = fromStage < 60 && target >= 55;
    let stage = fromStage;

    if (doRebuild) {
    const thrashMs = Math.min(maxMs, Math.min(60, target) >= 60 ? 25 * 60_000 : 8 * 60_000);
    console.log(
      `[quest-mortton] SOFT morttonquest ${fromStage} → product Flamtaer rebuild thrash to=${Math.min(60, target)} (budget ${thrashMs}ms)`
    );
    await cheatQuiet(page, `setvar morttonquest ${fromStage}`, 500);
    await cheatQuiet(page, 'setvar morttonmulti 0', 400);
    await cheatQuiet(page, 'setvar temple_resources 0', 300).catch(() => {});
    await cheatQuiet(page, 'setvar temple_repaired_p 0', 300).catch(() => {});
    stage = await getServerVarQuiet(page, 'morttonquest');
    if (Number(stage) < 50) fail(`soft temple stage failed got ${stage}`);

    const invSnap = async () =>
      page.evaluate(() => {
        const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
        const names = inv.map(i => i?.name).filter(Boolean);
        const count = re =>
          inv.reduce((n, i) => (re.test(String(i?.name ?? '')) ? n + (i?.count || 1) : n), 0);
        return {
          names,
          free: 28 - inv.length,
          hammer: names.some(n => /^hammer$/i.test(n) || n === 'Hammer'),
          plank: count(/plank/i),
          brick: count(/limestone brick/i),
          paste: count(/swamp paste/i),
          lobster: count(/lobster/i)
        };
      });

    // Initial kit once. Restock must NOT re-give hammer every tick (hammers don't stack
    // usefully — was filling 28 slots with hammers).
    await giveItems(page, [
      ['hammer', 1],
      ['swamppaste', 100],
      ['limestonebrick', 12],
      ['woodplank', 12],
      ['steel_scimitar', 1],
      ['steel_platebody', 1],
      ['steel_platelegs', 1],
      ['lobster', 8]
    ]).catch(() => {});

    const restock = async () => {
      const s = await invSnap();
      const need = [];
      // only if missing — never pile hammers
      if (!s.hammer) need.push(['hammer', 1]);
      if (s.paste < 20) need.push(['swamppaste', 80]);
      if (s.brick < 4) need.push(['limestonebrick', 8]);
      if (s.plank < 4) need.push(['woodplank', 8]);
      if (s.lobster < 3) need.push(['lobster', 6]);
      if (!need.length) return s;
      // leave a couple free slots
      if (s.free < 2 && s.plank + s.brick > 6) {
        console.log('[quest-mortton] restock skip (inv tight)', JSON.stringify(s));
        return s;
      }
      console.log('[quest-mortton] restock', JSON.stringify(need), 'free=', s.free);
      await giveItems(page, need).catch(() => {});
      return invSnap();
    };

    let kit = await invSnap();
    console.log('[quest-mortton] flamtaer kit', JSON.stringify(kit));
    if (!kit.hammer || kit.plank < 1 || kit.brick < 1 || kit.paste < 5) {
      fail(
        `flamtaer kit incomplete (need hammer+plank+limestone brick+swamp paste): ${JSON.stringify(kit.names)}`
      );
    }
    await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      for (const n of ['Steel scimitar', 'Steel platebody', 'Steel platelegs']) {
        a?.equip?.(n);
        await new Promise(r => setTimeout(r, 300));
      }
    });

    // Stand in courtyard (altar), not on wall loc — tele-on-wall is a bad thrash pose.
    // Upstream rs2b0t: walkNear before interact; RandomEvents for genie/MOM/hostiles.
    console.log('[quest-mortton] product Flamtaer courtyard stand', FLAMTAER_COURTYARD);
    if (!(await teleTo(page, FLAMTAER_COURTYARD, 2, 30_000))) fail('tele Flamtaer courtyard failed');
    await waitSceneReady(page, 20_000);
    if (shot) await shot('at-flamtaer');

    const wallSnap = () =>
      page.evaluate(() => {
        const locs = globalThis.__lc377?.reader?.locs?.({ maxDist: 16 }) ?? [];
        const walls = locs.filter(l => /wall|rubble/i.test(String(l?.name ?? '')));
        const names = {};
        for (const w of walls) {
          const n = String(w?.name ?? '?');
          names[n] = (names[n] || 0) + 1;
        }
        return {
          names,
          sample: walls.slice(0, 8).map(l => ({
            name: l?.name,
            ops: l?.ops,
            wx: l?.wx ?? l?.x,
            wz: l?.wz ?? l?.z
          }))
        };
      });
    console.log('[quest-mortton] wall snap', JSON.stringify(await wallSnap()));

    const inTemple = async () => {
      const t = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
      if (!t) return false;
      return (
        t.x >= TEMPLE_BOX.x0 &&
        t.x <= TEMPLE_BOX.x1 &&
        t.z >= TEMPLE_BOX.z0 &&
        t.z <= TEMPLE_BOX.z1
      );
    };

    /**
     * Courtyard thrash (product-accurate pose):
     * - Product `p_oploc(3)` continuous build wants us **adjacent inside**, not on wall.
     * - Old thrash: `walkWorld(wx+1,wz)` every tick → when a seg upgrades it chases the
     *   next Broken Wall around the **outside** of the ring (bad).
     * - New: sticky wall target; stand tile = step from wall toward TEMPLE_CENTER;
     *   only re-walk if far from that stand; re-click Repair only when idle so we
     *   do not cancel the continuous build loop.
     */
    const deadline = Date.now() + thrashMs;
    let ticks = 0;
    let repairedP = await getServerVarQuiet(page, 'temple_repaired_p').catch(() => null);
    /** Rebuild thrash goal: can-light (60) + full repair % — not full residual TO. */
    const rebuildGoal = Math.min(60, target);
    /** @type {{ wx: number, wz: number } | null} */
    let stickyWall = null;
    while (
      Date.now() < deadline &&
      (Number(stage) < rebuildGoal || Number(repairedP) < 100)
    ) {
      ticks++;
      // rs2b0t RandomEvents thin port — dialog / Strange plant / hostile macros.
      // preferAttack: temple thrash fights plant+swarm instead of long flee.
      if (ticks % 3 === 0) {
        const rnd = await softRandomTick(page, {
          preferAttack: true,
          log: m => console.log(`[quest-mortton] ${m}`)
        });
        if (rnd?.handled) {
          // Handled a random — skip repair this tick so plant/dialog owns the client.
          continue;
        }
      }
      if (ticks % 8 === 0 && !(await inTemple())) {
        console.log('[quest-mortton] SOFT re-tele courtyard (death/random fail-tele out of temple)');
        stickyWall = null;
        await teleTo(page, FLAMTAER_COURTYARD, 2, 25_000);
        await waitSceneReady(page, 15_000);
        await restock();
      }

      const thrash = await page.evaluate(
        async ({ sticky, center, box }) => {
          const a = globalThis.__lc377?.actions;
          const r = globalThis.__lc377?.reader;
          a?.continueDialog?.();
          a?.dismissModalMessage?.();
          a?.chatContinue?.();

          const me = r?.worldTile?.();
          if (!me) return { ok: false, reason: 'no-tile' };

          // Keep interior bias: if outside box, walk center (tele handled host-side).
          const inside =
            me.x >= box.x0 && me.x <= box.x1 && me.z >= box.z0 && me.z <= box.z1;
          if (!inside) {
            a?.walkWorld?.(center.x, center.z);
            return { ok: false, reason: 'outside', me };
          }

          const walls = (r?.locs?.({ maxDist: 14 }) ?? []).filter(l =>
            /wall|rubble/i.test(String(l?.name ?? ''))
          );
          const opsOf = l => (l?.ops || []).map(o => String(o ?? ''));
          /** Still needs segment advance (Broken / mid) — not full Temple wall Reinforce-only. */
          const canRepair = l => opsOf(l).some(o => /repair/i.test(o));
          const canWork = l => opsOf(l).some(o => /repair|reinforce/i.test(o));
          const wxOf = l => (l?.wx ?? l?.x) | 0;
          const wzOf = l => (l?.wz ?? l?.z) | 0;
          const nameOf = l => String(l?.name ?? '');
          const isBrokenish = l =>
            /broken|rubble|damaged/i.test(nameOf(l)) || canRepair(l);

          /** Step from wall tile toward courtyard center → stand **inside**. */
          const insideStand = (wx, wz) => {
            let sx = wx;
            let sz = wz;
            if (wx < center.x) sx = wx + 1;
            else if (wx > center.x) sx = wx - 1;
            if (wz < center.z) sz = wz + 1;
            else if (wz > center.z) sz = wz - 1;
            return { x: sx, z: sz };
          };
          const cheb = (ax, az, bx, bz) => Math.max(Math.abs(ax - bx), Math.abs(az - bz));

          // Sticky only while that tile still needs Repair (not finished Temple wall).
          // Bug: sticky on Temple wall + Reinforce only → repaired_p stuck forever.
          let target = null;
          if (sticky) {
            target =
              walls.find(
                l =>
                  canRepair(l) &&
                  isBrokenish(l) &&
                  wxOf(l) === sticky.wx &&
                  wzOf(l) === sticky.wz
              ) || null;
          }
          if (!target) {
            // Prefer Broken / Repairable segs; only Reinforce if no broken left.
            const repairable = walls.filter(l => canRepair(l) || /broken|rubble/i.test(nameOf(l)));
            const broken = repairable.filter(l => /broken|rubble/i.test(nameOf(l)));
            let pool = broken.length ? broken : repairable;
            if (!pool.length) pool = walls.filter(canWork);
            pool.sort((a, b) => {
              const da = cheb(me.x, me.z, wxOf(a), wzOf(a));
              const db = cheb(me.x, me.z, wxOf(b), wzOf(b));
              return da - db;
            });
            target = pool[0] || null;
          }
          if (!target) {
            return { ok: false, reason: 'no-wall', me, sticky: null };
          }

          const wx = wxOf(target);
          const wz = wzOf(target);
          const stand = insideStand(wx, wz);
          const distStand = cheb(me.x, me.z, stand.x, stand.z);
          const moving = !!r?.playerMoving?.();

          const stickyKeep =
            canRepair(target) || /broken|rubble/i.test(nameOf(target))
              ? { wx, wz }
              : null;

          // Only walk when not already on/near the inside stand tile.
          if (distStand > 1 && !moving) {
            a?.walkWorld?.(stand.x, stand.z);
            return {
              ok: true,
              action: 'walk-inside',
              wall: { wx, wz, name: nameOf(target) },
              stand,
              me,
              sticky: stickyKeep
            };
          }

          // Product continuous p_oploc(3): do not spam re-click while busy.
          if (moving) {
            return {
              ok: true,
              action: 'wait-move',
              wall: { wx, wz, name: nameOf(target) },
              stand,
              me,
              sticky: stickyKeep
            };
          }

          // Prefer Repair (segment advance) over Reinforce (sanctity-only on full segs).
          const ops = opsOf(target);
          const op =
            ops.find(o => /repair/i.test(o)) ||
            ops.find(o => /reinforce/i.test(o)) ||
            'repair';
          a?.opLocAt?.(wx, wz, op) ||
            a?.opLoc?.(nameOf(target), op) ||
            a?.opLoc?.('Broken', 'repair') ||
            a?.opLoc?.('wall', 'repair');
          // Keep sticky only for Repair targets; finished Temple wall → re-pick next tick.
          const keepSticky = canRepair(target) || /broken|rubble/i.test(nameOf(target));
          return {
            ok: true,
            action: 'op',
            op,
            wall: { wx, wz, name: nameOf(target) },
            stand,
            me,
            sticky: keepSticky ? { wx, wz } : null
          };
        },
        {
          sticky: stickyWall,
          center: TEMPLE_CENTER,
          box: TEMPLE_BOX
        }
      );
      if (thrash?.sticky) stickyWall = thrash.sticky;
      else stickyWall = null;
      // Rotate sticky if thrash keeps wait-move / reinforce on same tile with no wall progress
      if (ticks % 80 === 0) stickyWall = null;
      if (ticks % 40 === 0 && thrash) {
        console.log(
          `[quest-mortton] courtyard thrash`,
          thrash.action || thrash.reason,
          thrash.wall ? JSON.stringify(thrash.wall) : '',
          thrash.me ? `me=${thrash.me.x},${thrash.me.z}` : ''
        );
      }
      await page.waitForTimeout(420);
      if (ticks % 20 === 0) {
        const s = await restock();
        await page.evaluate(() => globalThis.__lc377?.actions?.eatIfNeeded?.('Lobster', 12));
        stage = await getServerVarQuiet(page, 'morttonquest');
        repairedP = await getServerVarQuiet(page, 'temple_repaired_p').catch(() => null);
        const build = await getServerVarQuiet(page, 'current_temple_build').catch(() => null);
        const resPool = await getServerVarQuiet(page, 'temple_resources').catch(() => null);
        const snap = await wallSnap();
        const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
        console.log(
          `[quest-mortton] flamtaer tick=${ticks} stage=${stage} repaired_p=${repairedP} build=${build} res=${resPool} tile=${JSON.stringify(tile)} walls=${JSON.stringify(snap.names)} inv hammers=${(s?.names || []).filter(n => /hammer/i.test(n)).length} plank=${s?.plank} brick=${s?.brick} paste=${s?.paste}`
        );
        if (shot && ticks % 60 === 0) await shot(`flamtaer-t${ticks}`);
      }
      if (ticks % 4 === 0) {
        stage = await getServerVarQuiet(page, 'morttonquest');
        repairedP = await getServerVarQuiet(page, 'temple_repaired_p').catch(() => repairedP);
        if (Number(stage) >= rebuildGoal && Number(repairedP) >= 100) break;
      }
    }
    stage = await getServerVarQuiet(page, 'morttonquest');
    repairedP = await getServerVarQuiet(page, 'temple_repaired_p').catch(() => null);
    const finalWalls = await wallSnap();
    console.log(
      `[quest-mortton] after Flamtaer rebuild stage=${stage} repaired_p=${repairedP} ticks=${ticks} walls=${JSON.stringify(finalWalls.names)}`
    );
    if (shot) await shot(`after-flamtaer-rebuild`);
    const rebuildWant = Math.min(60, target);
    if (!(Number(stage) >= Math.min(55, rebuildWant))) {
      fail(`flamtaer-gate FAIL: morttonquest=${stage} want≥${Math.min(55, rebuildWant)}`);
    }
    if (rebuildWant >= 60 && Number(stage) < 60) {
      fail(
        `flamtaer-60 FAIL: morttonquest=${stage} repaired_p=${repairedP} want≥60 (need full templewall_10 segments). walls=${JSON.stringify(finalWalls.names)}`
      );
    }
    if (target < 65) {
      console.log(
        `RESULT: PASS (Mort'ton Flamtaer morttonquest=${stage} ≥${target}; product wall repair; SOFT stage${fromStage}+mats; repaired_p=${repairedP})`
      );
      process.exit(0);
    }
    console.log(`[quest-mortton] rebuild done stage=${stage} — continuing to sacred oil (target ${target})`);
    } // end doRebuild

    // --- Sacred oil (60 → 65): light Fire altar + olive oil on Flaming Fire altar ---
    if (target >= 65) {
      stage = await getServerVarQuiet(page, 'morttonquest');
      // Soft FROM=65+ skips oil thrash (entry stage = fromStage, not always 65)
      if (Number(stage) >= 65 || fromStage >= 65) {
        const softIn = Math.max(65, fromStage | 0);
        if (Number(stage) < softIn) {
          await cheatQuiet(page, `setvar morttonquest ${softIn}`, 500);
          stage = await getServerVarQuiet(page, 'morttonquest');
        }
        console.log(`[quest-mortton] skip oil thrash (stage=${stage} from=${fromStage})`);
      } else {
      const oilMs = Math.min(maxMs, 12 * 60_000);
      console.log(
        `[quest-mortton] ${residualMode ? 'RESIDUAL' : 'SOFT'} entry ≥60 → product light+oil thrash to=65 (budget ${oilMs}ms)`
      );
      // One soft entry of morttonquest only. Residual forbids repaired_p/sanctity setvar.
      await cheatQuiet(page, 'setvar morttonquest 60', 500);
      if (softThrash) {
        await cheatQuiet(page, 'setvar temple_repaired_p 100', 300).catch(() => {});
        await cheatQuiet(page, 'setvar temple_sanctity 900', 400).catch(() => {});
        await cheatQuiet(page, 'setvar temple_sanctity_p 30', 300).catch(() => {});
      }
      stage = await getServerVarQuiet(page, 'morttonquest');
      console.log(`[quest-mortton] oil soft stage after setvar=${stage} residual=${residualMode}`);
      if (Number(stage) < 60) fail(`oil soft stage failed got ${stage} want≥60`);

      // olive oil = shopable generic; mats for product repair without reseed
      await giveItems(page, [
        ['tinderbox', 1],
        ['oliveoil4', 4],
        ['hammer', 1],
        ['swamppaste', 40],
        ['limestonebrick', 8],
        ['woodplank', 8],
        ['logs', 4],
        ['lobster', 8],
        ['steel_scimitar', 1],
        ['steel_platebody', 1],
        ['steel_platelegs', 1]
      ]).catch(() => {});

      console.log('[quest-mortton] oil path tele courtyard', FLAMTAER_COURTYARD);
      if (!(await teleTo(page, FLAMTAER_COURTYARD, 2, 30_000))) fail('tele Flamtaer courtyard (oil) failed');
      await waitSceneReady(page, 20_000);
      if (shot) await shot('oil-at-flamtaer');

      const altarSnap = () =>
        page.evaluate(() => {
          const locs = globalThis.__lc377?.reader?.locs?.({ maxDist: 12 }) ?? [];
          const altars = locs.filter(l => /altar|fire/i.test(String(l?.name ?? '')));
          return altars.map(l => ({
            name: l?.name,
            ops: l?.ops,
            wx: l?.wx ?? l?.x,
            wz: l?.wz ?? l?.z
          }));
        });

      const oilDeadline = Date.now() + oilMs;
      let oilTicks = 0;
      let lit = false;
      while (Date.now() < oilDeadline && Number(stage) < 65) {
        oilTicks++;
        if (oilTicks % 3 === 0) {
          const rnd = await softRandomTick(page, {
            preferAttack: true,
            log: m => console.log(`[quest-mortton] ${m}`)
          });
          if (rnd?.handled) continue;
        }
        const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
        if (
          !tile ||
          tile.x < TEMPLE_BOX.x0 ||
          tile.x > TEMPLE_BOX.x1 ||
          tile.z < TEMPLE_BOX.z0 ||
          tile.z > TEMPLE_BOX.z1
        ) {
          console.log('[quest-mortton] SOFT re-tele courtyard (oil path)');
          await teleTo(page, FLAMTAER_COURTYARD, 2, 20_000);
          await waitSceneReady(page, 12_000);
        }

        // Soft thrash only: reseed repaired_p while Broken Fire altar (hides pack/world).
        // Residual: never — fail if product cannot upgrade altar.
        if (softThrash) {
          const altsPre = await altarSnap();
          const brokenStill = altsPre.some(a => /broken fire altar/i.test(String(a?.name ?? '')));
          if (brokenStill && oilTicks % 2 === 0) {
            await cheatQuiet(page, 'setvar temple_repaired_p 100', 200).catch(() => {});
            await cheatQuiet(page, 'setvar morttonquest 60', 150).catch(() => {});
          }
        }

        // Residual: when sanc low, Light once then settle to capture mesbox (do not dismiss).
        const sancNow = await getServerVarQuiet(page, 'temple_sanctity_p').catch(() => 0);
        const lowSanc = Number(sancNow) < 10;
        const captureMesbox = residualMode && lowSanc && oilTicks % 20 === 5;

        const step = await page.evaluate(
          async ({ center, residual, captureMesbox: cap }) => {
            const a = globalThis.__lc377?.actions;
            const r = globalThis.__lc377?.reader;
            // Soft thrash: always clear. Residual mesbox capture: leave chat open.
            if (!cap) {
              a?.continueDialog?.();
              a?.dismissModalMessage?.();
              a?.chatContinue?.();
              if ((r?.chatOptions?.() ?? []).length) a?.chooseOption?.();
            }

            const me = r?.worldTile?.();
            const locs = r?.locs?.({ maxDist: 14 }) ?? [];
            const flaming = locs.find(l =>
              /flaming.*fire altar|flaming fire altar/i.test(String(l?.name ?? ''))
            );
            const nofire = locs.find(
              l =>
                /^fire altar$/i.test(String(l?.name ?? '')) &&
                !/broken|flaming/i.test(String(l?.name ?? ''))
            );
            const broken = locs.find(l => /broken fire altar/i.test(String(l?.name ?? '')));
            const wall = locs.find(
              l =>
                /wall/i.test(String(l?.name ?? '')) &&
                (l.ops || []).some(o => /repair|reinforce/i.test(String(o ?? '')))
            );

            // Residual: broken altar → wall first (product upgrades on wall oploc when repaired_p=100)
            if (residual && broken && wall && !flaming) {
              const wx = wall.wx ?? wall.x;
              const wz = wall.wz ?? wall.z;
              let sx = wx;
              let sz = wz;
              if (wx < center.x) sx = wx + 1;
              else if (wx > center.x) sx = wx - 1;
              if (wz < center.z) sz = wz + 1;
              else if (wz > center.z) sz = wz - 1;
              if (me && Math.max(Math.abs(me.x - sx), Math.abs(me.z - sz)) > 1) {
                a?.walkWorld?.(sx, sz);
                return { action: 'walk-wall-broken-altar', lit: false, broken: true };
              }
              a?.opLocAt?.(wx, wz, 'reinforce') ||
                a?.opLocAt?.(wx, wz, 'repair') ||
                a?.opLoc?.(wall.name, 'reinforce');
              return { action: 'reinforce-broken-altar', lit: false, broken: true, name: wall.name };
            }

            // 1) Lit → pour olive oil
            if (flaming) {
              const wx = flaming.wx ?? flaming.x;
              const wz = flaming.wz ?? flaming.z;
              const sx = wx <= center.x ? wx - 1 : wx + 1;
              const sz = wz;
              if (me && Math.max(Math.abs(me.x - sx), Math.abs(me.z - sz)) > 1) {
                a?.walkWorld?.(sx, sz);
                return { action: 'walk-altar', lit: true, name: flaming.name };
              }
              const ok = a?.useHeldOnLoc?.('Olive oil', flaming.name || 'Flaming Fire altar', 14);
              return { action: ok ? 'oil' : 'oil-fail', lit: true, name: flaming.name };
            }

            // 2) Unlit repaired altar → Light
            if (nofire) {
              const wx = nofire.wx ?? nofire.x;
              const wz = nofire.wz ?? nofire.z;
              const sx = wx <= center.x ? wx - 1 : wx + 1;
              if (me && Math.max(Math.abs(me.x - sx), Math.abs(me.z - (wz | 0))) > 1) {
                a?.walkWorld?.(sx, wz);
                return { action: 'walk-nofire', lit: false, name: nofire.name };
              }
              a?.useHeldOnLoc?.('Tinderbox', nofire.name || 'Fire altar', 14);
              a?.opLocAt?.(wx, wz, 'light') || a?.opLoc?.('Fire altar', 'light');
              return { action: 'light', lit: false, name: nofire.name, captureMesbox: !!cap };
            }

            // 3) walls for sanctity / upgrade
            if (wall) {
              const wx = wall.wx ?? wall.x;
              const wz = wall.wz ?? wall.z;
              let sx = wx;
              let sz = wz;
              if (wx < center.x) sx = wx + 1;
              else if (wx > center.x) sx = wx - 1;
              if (wz < center.z) sz = wz + 1;
              else if (wz > center.z) sz = wz - 1;
              if (me && Math.max(Math.abs(me.x - sx), Math.abs(me.z - sz)) > 1) {
                a?.walkWorld?.(sx, sz);
                return { action: 'walk-wall', lit: false, broken: !!broken };
              }
              a?.opLocAt?.(wx, wz, 'repair') ||
                a?.opLocAt?.(wx, wz, 'reinforce') ||
                a?.opLoc?.('wall', 'repair');
              return { action: 'reinforce', lit: false, broken: !!broken, name: wall.name };
            }

            return {
              action: 'idle',
              lit: false,
              names: locs.map(l => l?.name).filter(Boolean).slice(0, 12)
            };
          },
          { center: TEMPLE_CENTER, residual: residualMode, captureMesbox }
        );

        // Residual: settle after low-sanc Light and log chat IF text (sanctity mesbox proof)
        if (captureMesbox && step?.action === 'light') {
          await page.waitForTimeout(1800);
          const dlg = await page.evaluate(() => {
            const r = globalThis.__lc377?.reader;
            const c = globalThis.__lc377?.client;
            const main = r?.modals?.()?.main ?? c?.mainModalId ?? -1;
            const chat = r?.modals?.()?.chat ?? c?.chatModalId ?? -1;
            const lines = (r?.chat?.(8) ?? []).map(l => String(l?.text ?? l ?? ''));
            // Try read open chat interface component texts if exposed
            const ifTexts = [];
            try {
              const ifGet = globalThis.__lc377?.ifGet || globalThis.__lc377?.hooks?.ifGet;
              // message4 comps 369–372 (pack) — walk nearby ids if available
              for (let id = 368; id <= 380; id++) {
                const com = ifGet?.(id);
                if (com?.text) ifTexts.push({ id, text: String(com.text) });
              }
            } catch {
              /* ignore */
            }
            return { main, chat, lines, ifTexts };
          });
          console.log(
            `[quest-mortton] RESIDUAL low-sanc Light settle sanc=${sancNow}`,
            JSON.stringify(dlg)
          );
          const blob = JSON.stringify(dlg).toLowerCase();
          if (/line1|line2|line3|line4/.test(blob) && !/sanctity|sanctif|10%|light the fire/.test(blob)) {
            console.log(
              '[quest-mortton] WARN: mesbox shell Line1–4 without sanctity copy (product residual)'
            );
          }
        }

        if (step?.lit) lit = true;
        if (oilTicks % 15 === 0) {
          stage = await getServerVarQuiet(page, 'morttonquest');
          const sanc = await getServerVarQuiet(page, 'temple_sanctity').catch(() => null);
          const sancP = await getServerVarQuiet(page, 'temple_sanctity_p').catch(() => null);
          const alts = await altarSnap();
          console.log(
            `[quest-mortton] oil tick=${oilTicks} stage=${stage} lit=${lit} sanc=${sanc}/${sancP} step=${step?.action} altars=${JSON.stringify(alts)}`
          );
          if (shot && oilTicks % 45 === 0) await shot(`oil-t${oilTicks}`);
        }
        // product may set 65 mid-tick
        if (oilTicks % 5 === 0) {
          stage = await getServerVarQuiet(page, 'morttonquest');
        }
        await page.waitForTimeout(450);
      }

      stage = await getServerVarQuiet(page, 'morttonquest');
      const finalAltars = await altarSnap();
      console.log(
        `[quest-mortton] after oil thrash stage=${stage} ticks=${oilTicks} altars=${JSON.stringify(finalAltars)}`
      );
      if (shot) await shot('after-flamtaer-oil');
      if (Number(stage) < 65) {
        fail(
          `flamtaer-65 FAIL: morttonquest=${stage} want≥65 (light Fire altar + olive oil). altars=${JSON.stringify(finalAltars)}`
        );
      }
      console.log(`[quest-mortton] oil done stage=${stage} lit=${lit}`);
      } // end oil thrash else

      stage = await getServerVarQuiet(page, 'morttonquest');
      if (Number(stage) < 65) {
        fail(`flamtaer-65 FAIL: morttonquest=${stage} want≥65 before pyre`);
      }
      if (target < 70) {
        console.log(
          `RESULT: PASS (Mort'ton Flamtaer morttonquest=${stage} ≥65; product light+oil; ${residualMode ? 'RESIDUAL' : 'SOFT'} entry60+oliveoil${softThrash ? '+sanctity' : ''})`
        );
        process.exit(0);
      }
      console.log(`[quest-mortton] oil gate ok stage=${stage} — continuing pyre/complete to=${target}`);
    }

    // --- Pyre + Ulsquire complete (65 → 70 → 75 → 80 → 85) ---
    if (target >= 70) {
      const pyreMs = Math.min(maxMs, residualMode ? 18 * 60_000 : 12 * 60_000);
      console.log(
        `[quest-mortton] ${residualMode ? 'RESIDUAL' : 'SOFT'} ≥65 → product pyre+complete thrash to=${target} (budget ${pyreMs}ms)`
      );
      // Soft entry once if not already ≥65 (e.g. FROM=65 only, or oil path just wrote 65).
      stage = await getServerVarQuiet(page, 'morttonquest');
      const softPyre = Math.max(65, fromStage | 0);
      if (Number(stage) < softPyre) {
        await cheatQuiet(page, `setvar morttonquest ${softPyre}`, 500);
      }
      stage = await getServerVarQuiet(page, 'morttonquest');
      console.log(`[quest-mortton] pyre stage after entry setvar=${stage} residual=${residualMode}`);
      if (Number(stage) < 65) fail(`pyre soft stage failed got ${stage} want≥65`);

      // Residual: generic only — logs, tinder, food, combat, brew mats for serum,
      // plus temple mats so remake sacred oil can productively repair/light (cleanup7:
      // clearinv without mats → fix-broken-altar forever, never flaming).
      // Soft thrash: also sacred oil + remains (DIRTY under bar §2).
      if (residualMode) {
        // Temple thrash fills 28 slots — ~clearinv (host prep) then generic kit only.
        // Do NOT re-give sacred oil: product re-make with olive at temple if wiped.
        await cheatQuiet(page, '~clearinv', 500);
        await giveItems(page, [
          ['logs', 8],
          ['tinderbox', 1],
          ['oliveoil4', 4],
          // remake oil at temple (product walls/altar — no soft reseed)
          ['hammer', 1],
          ['swamppaste', 40],
          ['limestonebrick', 8],
          ['woodplank', 8],
          ['tarromin', 3],
          ['ashes', 3],
          ['vial_water', 3],
          ['lobster', 6],
          ['steel_scimitar', 1],
          ['steel_platebody', 1],
          ['steel_platelegs', 1]
        ]).catch(() => {});
        const invCheck = await page.evaluate(() => {
          const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
          return {
            logs: inv.some(i => /^logs$/i.test(String(i?.name ?? ''))),
            oil: inv.some(i => /sacred oil/i.test(String(i?.name ?? ''))),
            olive: inv.some(i => /olive oil/i.test(String(i?.name ?? ''))),
            hammer: inv.some(i => /hammer/i.test(String(i?.name ?? ''))),
            free: 28 - inv.length,
            names: inv.map(i => i?.name).filter(Boolean)
          };
        });
        console.log('[quest-mortton] residual pyre kit', JSON.stringify(invCheck));
        if (!invCheck.logs) {
          fail(
            `RESIDUAL pyre kit missing logs after ~clearinv+give. inv=${JSON.stringify(invCheck.names)}`
          );
        }
      } else {
        await giveItems(page, [
          ['sacred_oil4', 2],
          ['logs', 4],
          ['shade_bones1', 2],
          ['tinderbox', 1],
          ['lobster', 4]
        ]).catch(() => {});
      }

      const pyreDeadline = Date.now() + pyreMs;
      let pyreTicks = 0;
      /** Residual Loar hunt ticks (separate fail budget from oil-on-logs). */
      let remainsHuntTicks = 0;
      /** Ticks spent on place/light pyre only (not Loar hunt) — mtnsm1v0v5 burned 120 on hunt. */
      let pyrePlaceTicks = 0;
      /**
       * Residual remake sacred oil ticks (separate budget).
       * First oil thrash took ~210 ticks; cleanup7 failed at 100 on broken-only spam.
       */
      let remakeOilTicks = 0;
      /** @type {{ name: string, wx: number, wz: number } | null} */
      let stickShade = null;
      while (Date.now() < pyreDeadline && Number(stage) < Math.min(85, target)) {
        pyreTicks++;
        // Soft random steals the 49t pyre_loc window during place/light — only when hunting
        stage = await getServerVarQuiet(page, 'morttonquest');
        const sPre = Number(stage);
        if (pyreTicks % 4 === 0 && (sPre < 70 || sPre >= 80)) {
          const rnd = await softRandomTick(page, {
            preferAttack: true,
            log: m => console.log(`[quest-mortton] ${m}`)
          });
          if (rnd?.handled) continue;
        }

        stage = await getServerVarQuiet(page, 'morttonquest');
        const s = Number(stage);

        // 80 → talk Ulsquire for complete queue → 85
        if (s >= 80 && target >= 85) {
          if (!(await teleTo(page, ULSQUIRE, 3, 25_000))) {
            console.log('[quest-mortton] tele Ulsquire failed — retry');
            await page.waitForTimeout(800);
            continue;
          }
          await waitSceneReady(page, 15_000);
          // Soft thrash only: force multi bits. Residual: brew/use serum productively.
          if (softThrash) {
            await cheatQuiet(page, 'setvar morttonmulti 34', 300).catch(() => {});
            await giveItems(page, [['mort_serum3', 2]]).catch(() => {});
          } else if (residualMode) {
            await page.evaluate(async () => {
              const a = globalThis.__lc377?.actions;
              const r = globalThis.__lc377?.reader;
              a?.setSideTab?.(3);
              const inv = r?.inventory?.() ?? [];
              if (inv.some(i => /serum 207/i.test(String(i?.name ?? '')))) return;
              const tar = inv.find(i => /tarromin/i.test(String(i?.name ?? '')));
              const vial = inv.find(i => /vial of water/i.test(String(i?.name ?? '')));
              const ash = inv.find(i => /^ashes$/i.test(String(i?.name ?? '')));
              const unf = inv.find(i => /unf|tarromin potion/i.test(String(i?.name ?? '')));
              if (tar && vial) a?.useHeldOnHeld?.(tar.name, vial.name);
              else if (unf && ash) a?.useHeldOnHeld?.(ash.name, unf.name);
            });
            await page.waitForTimeout(800);
          }
          const talk = await page.evaluate(async () => {
            const a = globalThis.__lc377?.actions;
            const r = globalThis.__lc377?.reader;
            a?.setSideTab?.(3);
            await new Promise(res => setTimeout(res, 200));
            const inv = r?.inventory?.() ?? [];
            const serum = inv.find(i => /serum 207/i.test(String(i?.name ?? '')));
            const npcs = r?.npcs?.() ?? [];
            const uls =
              npcs.find(n => /ulsquire/i.test(String(n?.name ?? ''))) ||
              npcs.find(n => /afflicted/i.test(String(n?.name ?? '')));
            if (serum && uls) {
              a?.useHeldOnNpc?.(
                { id: serum.id, slot: serum.slot, comId: serum.comId },
                String(uls.name)
              );
              await new Promise(res => setTimeout(res, 1000));
              for (let i = 0; i < 12; i++) {
                a?.continueDialog?.();
                a?.dismissModalMessage?.();
                a?.chatContinue?.();
                await new Promise(res => setTimeout(res, 250));
              }
            }
            a?.talkNpc?.('Ulsquire Shauncy') ||
              a?.talkNpc?.('Ulsquire') ||
              a?.talkNpc?.(String(uls?.name ?? 'Afflicted')) ||
              a?.npcOp?.(uls?.index, 1);
            // Continue chat until complete queue fires, then STOP — leave reward scroll open.
            // ~send_quest_complete opens main modal; spam dismiss was blanking the scroll shot.
            let scrollOpen = false;
            for (let i = 0; i < 20; i++) {
              a?.continueDialog?.();
              a?.chatContinue?.();
              const opts = r?.chatOptions?.() ?? [];
              if (opts.length) a?.chooseOption?.(0) || a?.chooseOption?.();
              await new Promise(res => setTimeout(res, 350));
              const main = r?.modals?.()?.main ?? -1;
              const chat = (r?.chat?.(4) ?? []).map(l => String(l?.text ?? l ?? ''));
              if (main > 0 || chat.some(t => /quest complete/i.test(t))) {
                scrollOpen = main > 0;
                // one more short settle for IF paint
                await new Promise(res => setTimeout(res, 400));
                break;
              }
            }
            const mainModal = r?.modals?.()?.main ?? -1;
            return {
              uls: uls?.name,
              serum: serum?.name,
              mainModal,
              scrollOpen: mainModal > 0 || scrollOpen,
              chat: (r?.chat?.(8) ?? []).map(l => String(l?.text ?? l ?? ''))
            };
          });
          stage = await getServerVarQuiet(page, 'morttonquest');
          if (Number(stage) >= 85 && shot) {
            // Prefer shot while reward IF still up (mainModal > 0)
            await page.waitForTimeout(500);
            await shot('quest-complete-scroll');
            console.log(
              `[quest-mortton] shot quest-complete-scroll stage=${stage} modal=${talk?.mainModal}`
            );
          }
          if (pyreTicks % 8 === 0 || Number(stage) >= 85) {
            console.log(
              `[quest-mortton] pyre tick=${pyreTicks} stage=${stage} step=ulsquire-talk`,
              talk
            );
          }
          await page.waitForTimeout(500);
          continue;
        }

        // <70: product sacred oil (if needed) then oil on logs → pyre logs
        if (s < 70) {
          const invPre = await page.evaluate(() => {
            const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
            return {
              oil: inv.some(i => /sacred oil/i.test(String(i?.name ?? ''))),
              pyre: inv.some(i => /pyre logs/i.test(String(i?.name ?? ''))),
              olive: inv.some(i => /olive oil/i.test(String(i?.name ?? '')))
            };
          });
          // Residual: make oil at temple before OPHELDU (no give sacred oil).
          // After ~clearinv pyre kit, olive + temple mats; need flaming altar + pour.
          // Mirror first oil thrash (walk wall → reinforce → light → pour); do not
          // tele every tick (cleanup7 stuck on fix-broken-altar + interrupt).
          if (residualMode && !invPre.oil && !invPre.pyre) {
            remakeOilTicks++;
            if (remakeOilTicks % 10 === 1) {
              console.log(
                `[quest-mortton] residual: make sacred oil at temple remakeTicks=${remakeOilTicks}`,
                invPre
              );
            }
            // Soft re-tele only when outside temple box (same as first oil thrash)
            const tileRemake = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
            const outsideTemple =
              !tileRemake ||
              tileRemake.x < TEMPLE_BOX.x0 ||
              tileRemake.x > TEMPLE_BOX.x1 ||
              tileRemake.z < TEMPLE_BOX.z0 ||
              tileRemake.z > TEMPLE_BOX.z1;
            if (outsideTemple) {
              if (!(await teleTo(page, FLAMTAER_COURTYARD, 4, 20_000))) {
                await teleTo(page, FLAMTAER_COURTYARD, 6, 15_000).catch(() => {});
              }
              await waitSceneReady(page, 12_000);
            }
            // Ensure olive + light mats if missing (generic prep only)
            if (!invPre.olive) {
              await giveItems(page, [['oliveoil4', 2]]).catch(() => {});
            }
            const remake = await page.evaluate(async ({ altarWx, altarWz, center }) => {
              const a = globalThis.__lc377?.actions;
              const r = globalThis.__lc377?.reader;
              a?.continueDialog?.();
              a?.dismissModalMessage?.();
              a?.chatContinue?.();
              if ((r?.chatOptions?.() ?? []).length) a?.chooseOption?.();
              a?.setSideTab?.(3);
              const locs = r?.locs?.({ maxDist: 16 }) ?? [];
              const snap = l =>
                l && l.typecode != null
                  ? { typecode: l.typecode | 0, lx: l.lx | 0, lz: l.lz | 0, x: l.x, z: l.z, name: l.name }
                  : null;
              // Only true Flaming Fire altar — never treat Broken/plain as flaming (cleanup6).
              const isFlaming = n =>
                /flaming/i.test(String(n ?? '')) && /altar/i.test(String(n ?? ''));
              let flaming = locs.find(l => isFlaming(l?.name));
              const atTile = r?.locAt?.(altarWx, altarWz);
              if (!flaming && atTile && isFlaming(atTile.name)) flaming = atTile;
              const nofire =
                locs.find(
                  l =>
                    /^fire altar$/i.test(String(l?.name ?? '')) &&
                    !/broken|flaming/i.test(String(l?.name ?? ''))
                ) ||
                (atTile &&
                /^fire altar$/i.test(String(atTile.name ?? '')) &&
                !/broken|flaming/i.test(String(atTile.name ?? ''))
                  ? atTile
                  : null);
              const broken =
                locs.find(l => /broken fire altar/i.test(String(l?.name ?? ''))) ||
                (atTile && /broken fire altar/i.test(String(atTile.name ?? '')) ? atTile : null);
              const inv = r?.inventory?.() ?? [];
              const oil = inv.find(i => /olive oil/i.test(String(i?.name ?? '')));
              const tinder = inv.find(i => /tinderbox/i.test(String(i?.name ?? '')));
              const wall = locs.find(
                l =>
                  /wall/i.test(String(l?.name ?? '')) &&
                  (l.ops || []).some(o => /repair|reinforce/i.test(String(o ?? '')))
              );
              const me = r?.worldTile?.();
              const walkToWall = w => {
                const wx = w.wx ?? w.x;
                const wz = w.wz ?? w.z;
                let sx = wx;
                let sz = wz;
                if (wx < center.x) sx = wx + 1;
                else if (wx > center.x) sx = wx - 1;
                if (wz < center.z) sz = wz + 1;
                else if (wz > center.z) sz = wz - 1;
                if (me && Math.max(Math.abs(me.x - sx), Math.abs(me.z - sz)) > 1) {
                  a?.walkWorld?.(sx, sz);
                  return true;
                }
                return false;
              };

              // 1) Lit → pour olive oil
              if (flaming && oil) {
                const wx = flaming.wx ?? flaming.x;
                const wz = flaming.wz ?? flaming.z;
                const sx = wx <= center.x ? wx - 1 : wx + 1;
                if (me && Math.max(Math.abs(me.x - sx), Math.abs(me.z - (wz | 0))) > 1) {
                  a?.walkWorld?.(sx, wz);
                  return { action: 'walk-altar', flaming: flaming.name };
                }
                const fs = snap(flaming);
                const ok = fs
                  ? a?.useHeldOnLoc?.(
                      { id: oil.id, slot: oil.slot, comId: oil.comId },
                      fs,
                      14
                    )
                  : a?.useHeldOnLoc?.(
                      { id: oil.id, slot: oil.slot, comId: oil.comId },
                      flaming.name,
                      14
                    );
                return {
                  action: 'pour-olive',
                  ok: !!ok,
                  flaming: flaming?.name,
                  loc: fs
                };
              }

              // 2) Unlit repaired altar → Light
              if (nofire && tinder && !flaming) {
                const wx = nofire.wx ?? nofire.x;
                const wz = nofire.wz ?? nofire.z;
                const sx = wx <= center.x ? wx - 1 : wx + 1;
                if (me && Math.max(Math.abs(me.x - sx), Math.abs(me.z - (wz | 0))) > 1) {
                  a?.walkWorld?.(sx, wz);
                  return { action: 'walk-nofire', name: nofire.name };
                }
                const ns = snap(nofire);
                if (ns) {
                  a?.useHeldOnLoc?.(
                    { id: tinder.id, slot: tinder.slot, comId: tinder.comId },
                    ns,
                    14
                  );
                } else {
                  a?.useHeldOnLoc?.(tinder.name, nofire.name, 14);
                }
                a?.opLocAt?.(wx, wz, 'light') || a?.opLoc?.(nofire.name, 'light');
                return { action: 'light-nofire', name: nofire.name };
              }

              // 3) Broken altar → wall reinforce first (product upgrades when repaired_p high)
              if (broken && wall && !flaming) {
                if (walkToWall(wall)) {
                  return { action: 'walk-wall-broken-altar', wall: wall.name, broken: broken.name };
                }
                a?.opLocAt?.(wall.wx ?? wall.x, wall.wz ?? wall.z, 'reinforce') ||
                  a?.opLocAt?.(wall.wx ?? wall.x, wall.wz ?? wall.z, 'repair') ||
                  a?.opLoc?.(wall.name, 'reinforce');
                return {
                  action: 'reinforce-broken-altar',
                  wall: wall.name,
                  broken: broken.name
                };
              }

              // 4) Walls for sanctity / upgrade even when no broken loc yet
              if (wall && !flaming && !nofire) {
                if (walkToWall(wall)) {
                  return { action: 'walk-wall', wall: wall.name };
                }
                a?.opLocAt?.(wall.wx ?? wall.x, wall.wz ?? wall.z, 'repair') ||
                  a?.opLocAt?.(wall.wx ?? wall.x, wall.wz ?? wall.z, 'reinforce') ||
                  a?.opLoc?.(wall.name, 'repair');
                return { action: 'reinforce', wall: wall.name, broken: broken?.name ?? null };
              }

              // 5) Broken with no wall ops — try repair broken directly
              if (broken && !flaming) {
                a?.opLocAt?.(broken.wx ?? broken.x, broken.wz ?? broken.z, 'repair') ||
                  a?.opLocAt?.(broken.wx ?? broken.x, broken.wz ?? broken.z, 'build') ||
                  a?.opLoc?.(broken.name, 'repair');
                return { action: 'fix-broken-altar', broken: broken.name, wall: wall?.name ?? null };
              }

              return {
                action: 'idle-remake',
                flaming: flaming?.name ?? null,
                broken: broken?.name ?? null,
                nofire: nofire?.name ?? null,
                olive: !!oil,
                atTile: atTile?.name ?? null,
                names: locs.map(l => l?.name).filter(Boolean).slice(0, 10)
              };
            }, {
              altarWx: FLAMTAER_ALTAR.x,
              altarWz: FLAMTAER_ALTAR.z,
              center: TEMPLE_CENTER
            });
            if (remakeOilTicks % 12 === 0 || remake?.action === 'pour-olive') {
              const sanc = await getServerVarQuiet(page, 'temple_sanctity').catch(() => null);
              const sancP = await getServerVarQuiet(page, 'temple_sanctity_p').catch(() => null);
              console.log(
                `[quest-mortton] residual remake oil t=${remakeOilTicks} sanc=${sanc}/${sancP}`,
                remake
              );
            }
            // First oil ~210 ticks; allow ~280 remake (no soft reseed)
            if (remakeOilTicks >= 280 && !invPre.oil) {
              fail(
                `RESIDUAL cannot make sacred oil after ${remakeOilTicks} remake ticks (stage=${stage}; no soft give oil / no reseed sanctity). last=${JSON.stringify(remake)}`
              );
            }
            await page.waitForTimeout(500);
            continue;
          }

          const made = await page.evaluate(async () => {
            const a = globalThis.__lc377?.actions;
            const r = globalThis.__lc377?.reader;
            a?.continueDialog?.();
            a?.dismissModalMessage?.();
            a?.setSideTab?.(3); // inventory
            await new Promise(res => setTimeout(res, 200));
            let inv = r?.inventory?.() ?? [];
            const hasPyre = inv.some(i => /pyre logs/i.test(String(i?.name ?? '')));
            if (hasPyre) return { ok: true, already: true, inv: inv.map(i => i?.name) };
            const oil = inv.find(i => /sacred oil/i.test(String(i?.name ?? '')));
            const logs = inv.find(
              i =>
                /^logs$/i.test(String(i?.name ?? '')) ||
                String(i?.name ?? '').toLowerCase() === 'logs'
            );
            if (!oil || !logs) {
              return {
                ok: false,
                reason: 'need oil+logs',
                oil: oil?.name,
                logs: logs?.name,
                inv: inv.map(i => i?.name)
              };
            }
            const ok =
              a?.useHeldOnHeld?.(
                { id: oil.id, slot: oil.slot, comId: oil.comId },
                { id: logs.id, slot: logs.slot, comId: logs.comId }
              ) || a?.useHeldOnHeld?.(oil.name, logs.name);
            await new Promise(res => setTimeout(res, 900));
            inv = r?.inventory?.() ?? [];
            const chat = (r?.chat?.(6) ?? []).map(l => String(l?.text ?? l ?? ''));
            return {
              ok: !!ok,
              action: 'oil-on-logs',
              hasPyre: inv.some(i => /pyre logs/i.test(String(i?.name ?? ''))),
              inv: inv.map(i => i?.name),
              chat
            };
          });
          if (pyreTicks % 8 === 0) {
            console.log(`[quest-mortton] pyre tick=${pyreTicks} stage=${stage} step=make-pyre-logs`, made);
          }
          if (pyreTicks >= 40 && !made?.hasPyre && !made?.already && Number(stage) < 70) {
            fail(
              `product oil-on-logs stalled after ${pyreTicks} ticks (stage still ${stage}); no soft setvar 70. chat=${JSON.stringify(made?.chat ?? [])}`
            );
          }
          await page.waitForTimeout(500);
          if (pyreTicks % 4 === 0) stage = await getServerVarQuiet(page, 'morttonquest');
          continue;
        }

        // 70–79: place logs, remains, light
        if (s >= 70 && s < 80) {
          // Residual: get Loar remains via kill + ground Take (no give)
          if (residualMode) {
            const hasRem = await page.evaluate(() => {
              const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
              return inv.some(i => /loar remains|shade remains/i.test(String(i?.name ?? '')));
            });
            if (!hasRem) {
              remainsHuntTicks++;
              if (remainsHuntTicks % 12 === 0) {
                console.log(
                  `[quest-mortton] residual: kill+Take Loar remains t=${remainsHuntTicks} stick=${stickShade ? stickShade.name : 'none'}`
                );
              }
              // Equip once at hunt start / every ~40 ticks (not every thrash)
              if (remainsHuntTicks === 1 || remainsHuntTicks % 40 === 0) {
                await page.evaluate(async () => {
                  const a = globalThis.__lc377?.actions;
                  for (const n of ['Steel scimitar', 'Steel platebody', 'Steel platelegs']) {
                    a?.equip?.(n);
                    await new Promise(r => setTimeout(r, 150));
                  }
                });
              }
              // Only tele when not sticky — tele every tick was aborting Loar combat (mtnsl3j4qg).
              const needTele = !stickShade && remainsHuntTicks % 8 === 1;
              let shadeOk = true;
              if (needTele) {
                const spawn =
                  SHADE_FIELD_SPAWNS[Math.floor(remainsHuntTicks / 8) % SHADE_FIELD_SPAWNS.length] ||
                  SHADE_FIELD_SPAWNS[0];
                shadeOk = await teleTo(page, spawn, 4, 25_000);
                await waitSceneReady(page, 12_000);
              } else if (stickShade && remainsHuntTicks % 20 === 0) {
                // Soft re-home near sticky target if still far from field
                await teleTo(page, { x: stickShade.wx, z: stickShade.wz, level: 0 }, 6, 15_000).catch(
                  () => {}
                );
                await waitSceneReady(page, 10_000);
              }
              const take = await page.evaluate(async stick => {
                const a = globalThis.__lc377?.actions;
                const r = globalThis.__lc377?.reader;
                a?.continueDialog?.();
                a?.dismissModalMessage?.();
                a?.setSideTab?.(3);
                a?.eatIfNeeded?.('Lobster', 12);
                const tile = r?.worldTile?.();
                // takeGround expects name substring (not a snap object)
                if (a?.takeGround?.('Loar remains', 18)) {
                  return { ok: true, how: 'takeGround', tile };
                }
                if (a?.takeGround?.('remains', 18)) {
                  return { ok: true, how: 'takeGround-remains', tile };
                }
                const ground = r?.groundItems?.({ maxDist: 18 }) ?? [];
                const rem = ground.find(g =>
                  /loar remains|shade remains/i.test(String(g?.name ?? ''))
                );
                if (rem && a?.takeObj) {
                  a.takeObj(rem.lx, rem.lz, rem.id, 3);
                  return { ok: true, how: 'takeObj', name: rem.name, tile };
                }
                const npcs = r?.npcs?.() ?? [];
                const me = tile || { x: 0, z: 0 };
                const shadeCands = npcs
                  .filter(n => /^Loar (Shadow|Shade)$/i.test(String(n?.name ?? '')))
                  .map(n => {
                    const nx = n.tile?.x ?? n.wx ?? n.x;
                    const nz = n.tile?.z ?? n.wz ?? n.z;
                    const d =
                      typeof n.distance === 'number'
                        ? n.distance
                        : nx != null && nz != null
                          ? Math.max(Math.abs(me.x - nx), Math.abs(me.z - nz))
                          : 999;
                    return { n, d, nx, nz };
                  })
                  .sort((a, b) => a.d - b.d);
                // Prefer sticky name if still in list, else nearest Loar
                let pick = shadeCands[0];
                if (stick?.name) {
                  const stuck = shadeCands.find(
                    c => String(c.n.name).toLowerCase() === String(stick.name).toLowerCase()
                  );
                  if (stuck) pick = stuck;
                }
                if (pick) {
                  const shade = pick.n;
                  const d = pick.d;
                  const nx = pick.nx;
                  const nz = pick.nz;
                  // Walk in if out of attack reach — attackNpc alone at d≈15 never finished
                  if (d > 1 && nx != null && nz != null) {
                    a?.walkWorld?.(nx, nz);
                  }
                  // Attack is op2 (1-based); prefer index so multi Loars work
                  const atk =
                    (shade.index != null && a?.npcOp?.(shade.index, 2)) ||
                    a?.attackNpc?.(shade.name);
                  return {
                    ok: false,
                    how: d > 2 ? 'walk-attack' : 'attack',
                    name: shade.name,
                    dist: d,
                    atk: !!atk,
                    inCombat: !!shade.inCombat,
                    wx: nx,
                    wz: nz,
                    tile,
                    cand: shadeCands.slice(0, 5).map(c => ({ name: c.n.name, d: c.d }))
                  };
                }
                // No Loar in client list — light sweep near last stick / field
                const sx = stick?.wx ?? 3474 + ((Date.now() / 1000) % 6 | 0) * 3;
                const sz = stick?.wz ?? 3280 - ((Date.now() / 700) % 5 | 0) * 2;
                a?.walkWorld?.(sx, sz);
                return {
                  ok: false,
                  how: 'none',
                  teleOk: true,
                  tile,
                  ground: ground.map(g => g?.name).slice(0, 8),
                  npcCount: npcs.length,
                  npcNames: [...new Set(npcs.map(n => n?.name).filter(Boolean))].slice(0, 30)
                };
              }, stickShade);
              if (take?.ok) {
                stickShade = null;
                console.log('[quest-mortton] residual: took Loar remains', take.how);
              } else if (take?.how === 'attack' || take?.how === 'walk-attack') {
                if (take.wx != null && take.wz != null) {
                  stickShade = { name: take.name, wx: take.wx, wz: take.wz };
                }
              } else if (take?.how === 'none') {
                // Lost visual — clear stick after a few empties so tele can re-hunt
                if (remainsHuntTicks % 6 === 0) stickShade = null;
              }
              if (remainsHuntTicks % 10 === 0 || take?.how === 'attack' || take?.how === 'walk-attack') {
                console.log(
                  `[quest-mortton] residual remains thrash teleOk=${shadeOk} stick=${!!stickShade}`,
                  take
                );
              }
              // ~3s/tick thrash × 280 ≈ 14 min hunt budget (was 100 total pyreTicks — too short)
              if (remainsHuntTicks >= 280) {
                fail(
                  `RESIDUAL no Loar remains after ${remainsHuntTicks} hunt ticks (kill+Take failed; no give). last=${JSON.stringify(take)}`
                );
              }
              await page.waitForTimeout(600);
              continue;
            }
            // Have remains — clear stick for later
            stickShade = null;
          }

          // Place/light budget is independent of Loar hunt ticks.
          // Content: logs → remains (oplocu _flamtaer_pyre_logs) → light (tinder/oploc1
          // _flamtaer_pyre_bones). longqueue clear_pyre_loc @ 49 game ticks — tele+scene
          // every place tick (cleanup8) burns the window; remains "ok" never consumes.
          pyrePlaceTicks++;
          const tilePyre = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
          const nearPyre =
            tilePyre &&
            Math.max(
              Math.abs(tilePyre.x - FUNERAL_PYRE_STAND.x),
              Math.abs(tilePyre.z - FUNERAL_PYRE_STAND.z)
            ) <= 3;
          if (!nearPyre) {
            if (!(await teleTo(page, FUNERAL_PYRE_STAND, 3, 20_000))) {
              console.log('[quest-mortton] tele pyre stand failed');
              await page.waitForTimeout(600);
              continue;
            }
            await waitSceneReady(page, 10_000);
          }
          const step = await page.evaluate(async ({ pyreWx, pyreWz, questStage, placeN }) => {
            const a = globalThis.__lc377?.actions;
            const r = globalThis.__lc377?.reader;
            // Do not spam dismiss during multi-tick light (p_oploc 4)
            if (placeN % 3 === 0) {
              a?.continueDialog?.();
              a?.dismissModalMessage?.();
            }
            a?.setSideTab?.(3);
            const inv = r?.inventory?.() ?? [];
            const me = r?.worldTile?.();
            const locs = r?.locs?.({ maxDist: 16 }) ?? [];
            const pyres = locs.filter(l => /funeral pyre|pyre/i.test(String(l?.name ?? '')));
            /** Prefer exact funeral pyre tile (m54_51 temple_pyre). */
            let pyre = typeof r?.locAt === 'function' ? r.locAt(pyreWx, pyreWz) : null;
            if (!pyre) {
              pyre =
                pyres.find(
                  l =>
                    (l.x === pyreWx || l.wx === pyreWx) && (l.z === pyreWz || l.wz === pyreWz)
                ) || pyres[0];
            }
            // Stand adjacent if still far (walk, not tele — keeps pyre_loc window)
            if (
              me &&
              Math.max(Math.abs(me.x - (pyreWx + 1)), Math.abs(me.z - pyreWz)) > 1
            ) {
              a?.walkWorld?.(pyreWx + 1, pyreWz);
              return { action: 'walk-pyre', me, pyreWx, pyreWz };
            }
            const snap = loc =>
              loc && loc.typecode != null
                ? {
                    typecode: loc.typecode | 0,
                    lx: loc.lx | 0,
                    lz: loc.lz | 0,
                    x: loc.x ?? loc.wx,
                    z: loc.z ?? loc.wz,
                    name: loc.name,
                    ops: loc.ops || []
                  }
                : null;
            const pyreSnap = snap(pyre);
            const hasLightOp = loc =>
              (loc?.ops || []).some(o => /light/i.test(String(o ?? '')));
            const lightable =
              pyres.find(hasLightOp) || (pyre && hasLightOp(pyre) ? pyre : null);
            const lightSnap = snap(lightable) || pyreSnap;
            const pyreLogs = inv.find(i => /pyre logs/i.test(String(i?.name ?? '')));
            const remains = inv.find(i =>
              /loar remains|shade remains|loar shade remains/i.test(String(i?.name ?? ''))
            );
            const tinder = inv.find(i => /tinderbox/i.test(String(i?.name ?? '')));

            // Light: content is tinder OPLOCU on bones stage OR oploc1 with tinder in inv.
            // Ops often null in reader — always send opLoc1 + tinder useHeld.
            const tryLight = why => {
              if (!tinder) return { action: why, ok: false, reason: 'no-tinder', loc: lightSnap };
              const loc = lightSnap || pyreSnap;
              const wx = loc?.x ?? pyreWx;
              const wz = loc?.z ?? pyreWz;
              let useOk = false;
              if (loc) {
                useOk = !!a?.useHeldOnLoc?.(
                  { id: tinder.id, slot: tinder.slot, comId: tinder.comId },
                  loc,
                  14
                );
              } else {
                useOk = !!a?.useHeldOnLoc?.(tinder.name, 'Funeral Pyre', 14);
              }
              // Prefer OPLOC1 (content [oploc1,_flamtaer_pyre_bones]) even when ops blank
              const op1 =
                (wx != null && (a?.opLoc1At?.(wx, wz) || a?.opLocAt?.(wx, wz, ''))) ||
                (wx != null && a?.opLocAt?.(wx, wz, 'light')) ||
                a?.opLoc?.('Funeral Pyre', 'light');
              return {
                action: why,
                ok: !!(useOk || op1),
                useOk: !!useOk,
                op1: !!op1,
                lightable: !!lightable,
                remainsInInv: !!remains,
                loc: lightSnap || pyreSnap,
                ops: (lightable || pyre)?.ops || []
              };
            };

            // 1) pyre logs → empty/base pyre (stage < 75)
            if (pyreLogs && questStage < 75) {
              const ok = pyreSnap
                ? a?.useHeldOnLoc?.(
                    { id: pyreLogs.id, slot: pyreLogs.slot, comId: pyreLogs.comId },
                    pyreSnap,
                    14
                  )
                : a?.useHeldOnLoc?.(pyreLogs.name, 'Funeral Pyre', 14);
              return { action: 'logs-on-pyre', ok: !!ok, loc: pyreSnap };
            }

            // 2) Named Light op if client exposes it
            if (lightable) {
              return tryLight('light-pyre');
            }

            // 3) Remains only (do NOT tinder same tick — base temple_pyre rejects tinder)
            //    content: oplocu,_flamtaer_pyre_logs + shade_bones category
            if (remains && questStage >= 75 && placeN % 3 !== 2) {
              const ok = pyreSnap
                ? a?.useHeldOnLoc?.(
                    { id: remains.id, slot: remains.slot, comId: remains.comId },
                    pyreSnap,
                    14
                  )
                : a?.useHeldOnLoc?.(remains.name, 'Funeral Pyre', 14);
              return {
                action: 'remains-on-pyre',
                ok: !!ok,
                loc: pyreSnap,
                ops: pyre?.ops || [],
                remainsName: remains?.name,
                hasLight: hasLightOp(pyre)
              };
            }

            // 4) Light every 3rd tick while remains still held (bones may already be on pyre)
            //    + always when remains gone
            if (questStage >= 75 && tinder) {
              return tryLight(remains ? 'light-pyre-with-remains-held' : 'light-pyre-stage75');
            }

            // 5) remains before stage 75
            if (remains) {
              const ok = pyreSnap
                ? a?.useHeldOnLoc?.(
                    { id: remains.id, slot: remains.slot, comId: remains.comId },
                    pyreSnap,
                    14
                  )
                : a?.useHeldOnLoc?.(remains.name, 'Funeral Pyre', 14);
              return { action: 'remains-on-pyre-early', ok: !!ok, loc: pyreSnap };
            }

            if (tinder) return tryLight('light-pyre-fallback');

            return {
              action: 'idle',
              inv: inv.map(i => i?.name).filter(Boolean).slice(0, 12),
              pyre: pyreSnap,
              pyres: pyres.map(p => ({ name: p?.name, ops: p?.ops, x: p?.x, z: p?.z }))
            };
          }, {
            pyreWx: FUNERAL_PYRE.x,
            pyreWz: FUNERAL_PYRE.z,
            questStage: s,
            placeN: pyrePlaceTicks
          });

          if (pyrePlaceTicks % 5 === 0 || pyreTicks % 8 === 0 || /light/.test(String(step?.action))) {
            stage = await getServerVarQuiet(page, 'morttonquest');
            console.log(
              `[quest-mortton] pyre tick=${pyreTicks} place=${pyrePlaceTicks} stage=${stage} step=${JSON.stringify(step)}`
            );
            if (shot && pyrePlaceTicks % 40 === 0) await shot(`pyre-t${pyrePlaceTicks}`);
          }
          // Soft thrash only: re-give quest materials / soft stage 80
          if (softThrash && pyrePlaceTicks % 25 === 0 && Number(stage) < 80) {
            await giveItems(page, [
              ['logs_pyre', 1],
              ['shade_bones1', 1],
              ['tinderbox', 1]
            ]).catch(() => {});
          }
          if (softThrash && pyrePlaceTicks >= 90 && Number(stage) >= 75 && Number(stage) < 80) {
            console.log('[quest-mortton] SOFT setvar 80 (lit pyre stall — hand-in product still required)');
            await cheatQuiet(page, 'setvar morttonquest 80', 400);
          }
          // Residual: denser ticks; budget 160 (clear_pyre ~49 game ticks ~15s @300ms)
          if (residualMode && pyrePlaceTicks >= 160 && Number(stage) < 80) {
            fail(
              `RESIDUAL pyre stall stage=${stage} placeTicks=${pyrePlaceTicks} (no soft setvar 80 / no give remains). step=${JSON.stringify(step)}`
            );
          }
          // Multi-tick light needs settle; remains need a beat before re-use
          const settle =
            /light/.test(String(step?.action ?? '')) ? 900 : step?.action === 'remains-on-pyre' ? 700 : 400;
          await page.waitForTimeout(settle);
          if (pyrePlaceTicks % 3 === 0) stage = await getServerVarQuiet(page, 'morttonquest');
          continue;
        }

        await page.waitForTimeout(400);
      }

      stage = await getServerVarQuiet(page, 'morttonquest');
      console.log(`[quest-mortton] after pyre thrash stage=${stage} ticks=${pyreTicks}`);
      if (shot) await shot(`after-flamtaer-${target}`);
      if (Number(stage) < Math.min(85, target)) {
        fail(
          `flamtaer-complete FAIL: morttonquest=${stage} want≥${Math.min(85, target)} residual=${residualMode}. ticks=${pyreTicks}`
        );
      }
      console.log(
        `RESULT: PASS (Mort'ton complete morttonquest=${stage} ≥${target}; product pyre path; ${residualMode ? 'RESIDUAL bar§2 entry' + softPyre : 'SOFT thrash'}; ticks=${pyreTicks})`
      );
      process.exit(0);
    }

    // target 50–64 without oil path already exited above
    fail(`flamtaer residual: unhandled target=${target} stage=${stage}`);
  }

  for (const c of ['setvar morttonquest 0', 'setvar morttonmulti 0']) {
    await cheatQuiet(page, c, 400);
  }

  // Diary + brew materials + spare serum + melee + food
  console.log('[quest-mortton] prep: diary + brew + gear');
  await giveItems(page, [
    ['serum_book', 1],
    ['tarromin', 3],
    ['ashes', 3],
    ['vial_water', 3],
    ['mort_serum3', 4],
    ['steel_scimitar', 1],
    ['steel_platebody', 1],
    ['steel_platelegs', 1],
    ['lobster', 20]
  ]);

  // —— 1. Read diary to last page (case 12 sets read_diary = 5) ——
  console.log('[quest-mortton] read diary to last page (if_button book:com_86 ×14)');
  const diary = await page.evaluate(async () => {
    const h = globalThis.__lc377;
    const a = h?.actions;
    const r = h?.reader;
    if (!a || !r) return { error: 'no abi' };

    const inv = r.inventory?.() ?? [];
    const book = inv.find(
      i => /diary|herbi/i.test(i?.name ?? '') || (i?.id | 0) === 3395
    );
    if (!book) return { error: 'no diary in inv', inv: inv.map(i => i?.name) };

    a.dismissModalMessage?.();
    a.continueDialog?.();
    await new Promise(res => setTimeout(res, 300));
    a.heldOp?.(book.name, 1);
    await new Promise(res => setTimeout(res, 600));
    a.continueDialog?.();
    a.dismissModalMessage?.();
    await new Promise(res => setTimeout(res, 400));

    const NEXT = 841; // book:com_86
    for (let i = 0; i < 14; i++) {
      a.ifButton?.(NEXT);
      await new Promise(res => setTimeout(res, 350));
    }
    a.ifButton?.(10162);
    a.closeModal?.();
    return { opened: true, book: book.name };
  });
  console.log('[quest-mortton] diary', JSON.stringify(diary));
  if (diary.error) fail(diary.error);
  if (shot) await shot('after-diary');

  let stage = await getServerVarQuiet(page, 'morttonquest');
  console.log(`[quest-mortton] after diary getvar morttonquest=${stage}`);
  if ((stage ?? 0) < 5) {
    fail(`diary did not set stage 5: morttonquest=${stage}`);
  }

  // Start-gate only
  if (wantStage <= 5) {
    console.log(`RESULT: PASS (Mort'ton start-gate morttonquest=${stage})`);
    process.exit(0);
  }

  // —— 2. Tele Mort'ton, seed script stage ——
  console.log('[quest-mortton] tele Ulsquire', ULSQUIRE);
  if (!(await teleTo(page, ULSQUIRE, 4, 45_000))) {
    fail('tele Ulsquire failed');
  }
  await waitSceneReady(page, 45_000);
  if (shot) await shot('at-mortton');

  // Equip melee (best-effort)
  await page.evaluate(async () => {
    const a = globalThis.__lc377?.actions;
    for (const n of ['Steel scimitar', 'Steel platebody', 'Steel platelegs']) {
      a?.equip?.(n);
      await new Promise(r => setTimeout(r, 400));
    }
  });

  await page.evaluate(ws => {
    globalThis.__morttonCompleteStage = ws;
    globalThis.__morttonServerStage = 5;
  }, wantStage);
  console.log(`[quest-mortton] __morttonCompleteStage=${wantStage}`);

  // —— 3. Quest script ——
  console.log('[quest-mortton] scripts.start quest-mortton');
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
    ['quest-mortton', maxMs]
  );

  if (result.error) {
    if (shot) await shot('error');
    fail(result.error);
  }

  stage = await getServerVarQuiet(page, 'morttonquest');
  const clientMirror = await page.evaluate(() => globalThis.__morttonServerStage | 0);
  const final = await page.evaluate(() => {
    const r = globalThis.__lc377?.reader;
    const chat = typeof r?.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
    return {
      tile: globalThis.__lc377?.worldTile?.() ?? null,
      inv: (r?.inventory?.() ?? []).map(i => `${i?.name}#${i?.id}`).slice(0, 20),
      chat
    };
  });

  console.log(
    '[quest-mortton] finished',
    JSON.stringify({ ...result, stage, clientMirror, final }, null, 2)
  );
  if (shot) await shot(`end-st${stage}`);

  const resStr = String(result.result ?? '');
  if (resStr.startsWith('fail:') || /No trigger for/i.test(resStr)) {
    if (shot) await shot('fail-no-trigger');
    fail(resStr);
  }
  const chatHit = (final.chat ?? []).find(t => /No trigger for/i.test(String(t ?? '')));
  if (chatHit) {
    if (shot) await shot('fail-no-trigger-chat');
    fail(`chat: ${chatHit}`);
  }

  const finalStage = stage ?? clientMirror ?? 0;
  if (finalStage >= wantStage) {
    console.log(`RESULT: PASS (Mort'ton mid-gate morttonquest=${finalStage} want>=${wantStage})`);
  } else {
    if (shot) await shot('fail-stage');
    fail(
      `Mort'ton stage too low: morttonquest=${finalStage} (want >=${wantStage}); result=${resStr}`
    );
  }
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await browser.close().catch(() => {});
}
