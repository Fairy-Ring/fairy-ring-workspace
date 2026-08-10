#!/usr/bin/env node
/**
 * Shades of Mort'ton — Playwright residual / mid host.
 *
 * Two code paths (do not confuse with the panel script picker):
 *
 *   A) Early path (default no MORTTON_FROM): host prep + scripts.start('quest-mortton')
 *      → in-page QuestBot defs/mortton.ts (diary → brew → kill mid ≤40 / temple start).
 *      Panel Start can run the same script; residual thrash is NOT that script.
 *
 *   B) Flamtaer residual (MORTTON_FROM≥50): **host thrash only** in this monofile
 *      (courtyard / oil / pyre / Loar). Does not use QuestBot. Bar §2 when residualMode.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-mortton-smoke.mjs   # headed default ≥40
 *   MORTTON_FROM=65 MORTTON_TO=85 …  # residual product thrash under bar §2
 *
 * Residual bar (default when MORTTON_FROM set):
 *   one soft setvar morttonquest=FROM; then only setstat/tele/generic prep.
 *   No mid-path quest setvar; no give sacred oil / remains.
 *   Opt out: MORTTON_SOFT_THRASH=1 (DIRTY — not residual PASS).
 *
 * @see docs/plans/2026-08-09-harness-fork-after-mortton.md
 * @see docs/plans/2026-08-08-promise-cleanup.md
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
  thrashPoint,
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
/**
 * Loar hunt stands (m54_51 npc 1240→1241 shade form).
 * Live thrash: shadows convert to **Loar Shade** and cluster near Flamtaer
 * (datapoints 2026-08-09: 9× at ~3500,3312). Field west still valid for wander.
 * @see docs/research/game-knowledge/anchors-mort-myre.md
 */
const SHADE_FIELD_SPAWNS = [
  // Temple-adjacent cluster (where client actually sees Loar Shade)
  { x: 3500, z: 3312, level: 0 },
  { x: 3498, z: 3314, level: 0 },
  { x: 3502, z: 3311, level: 0 },
  { x: 3496, z: 3308, level: 0 },
  // West town / field (jm2 1240 samples)
  { x: 3474, z: 3280, level: 0 },
  { x: 3480, z: 3271, level: 0 },
  { x: 3479, z: 3283, level: 0 },
  { x: 3483, z: 3283, level: 0 },
  { x: 3482, z: 3302, level: 0 },
  { x: 3478, z: 3307, level: 0 },
  { x: 3492, z: 3285, level: 0 }
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

/**
 * Combat floor for Loar (vislevel 40, HP 38, DEF 26) + multi-aggro field.
 * Host prep only (bar §2 allows setstat + generic gear). Corpus: steel full + food×20
 * (`docs/research/game-knowledge/combat-floors-377.md`). c18 stuck 60+ hunt ticks on
 * steel@60 with only 6–8 lobster and no shield — thrash looked “combat stuck” but was
 * under-geared for multi-aggro thrash speed.
 */
const MORTTON_STATS = {
  herblore: 20,
  attack: 70,
  strength: 70,
  defence: 60,
  hitpoints: 80,
  prayer: 1,
  crafting: 80,
  firemaking: 40
};

/**
 * Generic melee kit for Loar field.
 * Cooked lobster is **non-stackable** — 20 food = 20 inv slots (c21 FAIL: no plank).
 * Wear gear first (equip frees 4 slots), then food + mats.
 */
const LOAR_GEAR_GIVE = [
  ['adamant_scimitar', 1],
  ['adamant_platebody', 1],
  ['adamant_platelegs', 1],
  ['adamant_kiteshield', 1]
];
/** Food for multi-aggro thrash — non-stack; keep small so mats/tinder fit (28-pack). */
const LOAR_FOOD_GIVE = [['lobster', 6]];
const LOAR_EQUIP_NAMES = [
  'Adamant scimitar',
  'Adamant platebody',
  'Adamant platelegs',
  'Adamant kiteshield'
];

/**
 * Flamtaer courtyard multi-aggro is **never** clearable (15–25 Loar respawn/reaggro).
 * Residual oil remake must **not** try to kill the field.
 *
 * Strategy: flee south until `inCombat` drops, then short wall-build windows.
 * Eat only while fighting; never Attack Loar during rebuild thrash.
 *
 * Flee stand: south of temple (out of courtyard multi), still Mort’ton.
 */
const TEMPLE_FLEE = { x: 3505, z: 3288 };

/**
 * @returns {{ action: 'flee-aggro'|'build-window', combat: boolean, ate?: object, loarNear?: number, tile?: object }}
 */
async function templeOilAggroGate(page) {
  return page.evaluate(flee => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    a?.continueDialog?.();
    a?.dismissModalMessage?.();
    a?.chatContinue?.();
    const ate = a?.eatIfNeeded?.('Lobster', 12, { floor: 50, minMissing: 8 }) ?? null;
    const combat = !!r?.inCombat?.();
    const me = r?.worldTile?.() || { x: 0, z: 0 };
    const npcs = r?.npcs?.() ?? [];
    let loarNear = 0;
    for (const n of npcs) {
      const nm = String(n?.name ?? '');
      const id = n?.id | 0;
      if (!(/^Loar (Shadow|Shade)$/i.test(nm) || id === 1240 || id === 1241)) continue;
      const nx = n.tile?.x ?? n.wx ?? n.x;
      const nz = n.tile?.z ?? n.wz ?? n.z;
      const d =
        typeof n.distance === 'number'
          ? n.distance
          : nx != null && nz != null
            ? Math.max(Math.abs(me.x - nx), Math.abs(me.z - nz))
            : 99;
      if (d <= 4) loarNear++;
    }
    // Scoop remains only when not in combat (free slot later for pyre).
    if (!combat) {
      const invLen = (r?.inventory?.() ?? []).length;
      if (invLen >= 26) a?.heldOp?.('Lobster', 5);
      const ground = r?.groundItems?.({ maxDist: 3 }) ?? [];
      const rem = ground.find(g => /loar remains|shade remains/i.test(String(g?.name ?? '')));
      if (rem && invLen < 27) {
        if (a?.takeObj) a.takeObj(rem.lx, rem.lz, rem.id, 3);
        else a?.takeGround?.(String(rem.name), 6);
      }
    }
    if (combat) {
      // Break multi — walk south; do not Attack (never clears).
      a?.walkWorld?.(flee.x, flee.z);
      return {
        action: 'flee-aggro',
        combat: true,
        ate,
        loarNear,
        tile: me,
        flee
      };
    }
    return {
      action: 'build-window',
      combat: false,
      ate,
      loarNear,
      tile: me
    };
  }, TEMPLE_FLEE);
}

/**
 * Equip adamant kit with real settle (c25: 250ms clicks showed Wear but items stayed in inv).
 * menuAction is one client click — needs a game tick+ at WORLD_SPEED_MS≈300.
 */
async function equipLoarKit(page) {
  const report = await page.evaluate(async names => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    const sleep = ms => new Promise(res => setTimeout(res, ms));
    const wornNames = () =>
      (r?.equipment?.() ?? []).map(i => String(i?.name ?? '')).filter(Boolean);
    const invHas = n =>
      (r?.inventory?.() ?? []).some(i =>
        String(i?.name ?? '')
          .toLowerCase()
          .includes(String(n).toLowerCase().replace(/^adamant\s+/i, 'adamant '))
      ) ||
      (r?.inventory?.() ?? []).some(i =>
        String(i?.name ?? '')
          .toLowerCase()
          .includes(String(n).toLowerCase())
      );
    a?.setSideTab?.(3); // inventory
    await sleep(200);
    const worn = [];
    for (const n of names) {
      // Skip if already worn
      if (wornNames().some(w => w.toLowerCase().includes(n.toLowerCase().split(' ').pop()))) {
        worn.push({ n, ok: true, already: true });
        continue;
      }
      if (!invHas(n) && !invHas(n.replace(/^Adamant /i, ''))) {
        worn.push({ n, ok: false, reason: 'not-in-inv' });
        continue;
      }
      let ok = false;
      for (let attempt = 0; attempt < 3 && !ok; attempt++) {
        a?.setSideTab?.(3);
        await sleep(100);
        a?.equip?.(n);
        // ≥2 ticks at 300ms world speed
        await sleep(700);
        const w = wornNames();
        const needle = n.toLowerCase().replace(/^adamant\s+/, '');
        ok = w.some(x => x.toLowerCase().includes(needle) || x.toLowerCase().includes(n.toLowerCase()));
      }
      worn.push({ n, ok, worn: wornNames() });
    }
    a?.setSideTab?.(3);
    return { worn: wornNames(), steps: worn };
  }, LOAR_EQUIP_NAMES);
  console.log('[quest-mortton] equipLoarKit', JSON.stringify(report));
  return report;
}

/** Give gear → settle → equip (verify worn) → food/mats → re-check equip only if missing. */
async function seedLoarCombatKit(page, extra = []) {
  await giveItems(page, [...LOAR_GEAR_GIVE]).catch(() => {});
  await page.waitForTimeout(500); // inv refresh after give
  await equipLoarKit(page);
  await giveItems(page, [...LOAR_FOOD_GIVE, ...extra]).catch(() => {});
  await page.waitForTimeout(300);
  // Only re-equip pieces still in inv (don't spam Wear on empty slots)
  const need = await page.evaluate(names => {
    const r = globalThis.__lc377?.reader;
    const worn = (r?.equipment?.() ?? []).map(i => String(i?.name ?? '').toLowerCase());
    const inv = (r?.inventory?.() ?? []).map(i => String(i?.name ?? '').toLowerCase());
    return names.filter(n => {
      const needle = n.toLowerCase();
      const short = needle.replace(/^adamant\s+/, '');
      const isWorn = worn.some(w => w.includes(short) || w.includes(needle));
      const inInv = inv.some(i => i.includes(short) || i.includes(needle));
      return inInv && !isWorn;
    });
  }, LOAR_EQUIP_NAMES);
  if (need.length) {
    console.log('[quest-mortton] re-equip still in inv', need);
    await equipLoarKit(page);
  }
}

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
    // Equip adamant first (frees slots), then food + temple mats (lobster non-stack).
    await seedLoarCombatKit(page, [
      ['hammer', 1],
      ['swamppaste', 80],
      ['limestonebrick', 8],
      ['woodplank', 8]
    ]);

    const restock = async () => {
      const s = await invSnap();
      const need = [];
      // only if missing — never pile hammers
      if (!s.hammer) need.push(['hammer', 1]);
      if (s.paste < 20) need.push(['swamppaste', 80]);
      if (s.brick < 4) need.push(['limestonebrick', 8]);
      if (s.plank < 4) need.push(['woodplank', 8]);
      if (s.lobster < 4) need.push(['lobster', 8]);
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

      // c23: rebuild left free=0 → tinder never landed. c27: ~clearinv does NOT unequip —
      // re-give adamant stacked on still-worn set (equip said already, inv still held copies).
      await page.evaluate(() => {
        globalThis.__lc377?.actions?.unequipAll?.(12);
      });
      await page.waitForTimeout(400);
      await cheatQuiet(page, '~clearinv', 500);
      await giveItems(page, [...LOAR_GEAR_GIVE]).catch(() => {});
      await page.waitForTimeout(400);
      await equipLoarKit(page);
      // Mats first (broken-altar upgrade needs resource pool on wall oploc), then food/oil.
      await giveItems(page, [
        ['hammer', 1],
        ['swamppaste', 40],
        ['limestonebrick', 6],
        ['woodplank', 6],
        ['tinderbox', 1],
        ['oliveoil4', 3],
        ['lobster', 6]
      ]).catch(() => {});
      await equipLoarKit(page);
      let oilKit = await page.evaluate(() => {
        const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
        const n = i => String(i?.name ?? '');
        return {
          tinder: inv.some(i => /tinderbox/i.test(n(i))),
          olive: inv.some(i => /olive oil/i.test(n(i))),
          hammer: inv.some(i => /hammer/i.test(n(i))),
          plank: inv.filter(i => /plank/i.test(n(i))).length,
          brick: inv.filter(i => /brick/i.test(n(i))).length,
          paste: inv.some(i => /swamp paste/i.test(n(i))),
          free: 28 - inv.length,
          names: inv.map(i => i?.name).filter(Boolean)
        };
      });
      console.log('[quest-mortton] oil kit', JSON.stringify(oilKit));
      if (!oilKit.tinder || !oilKit.olive || !oilKit.hammer || oilKit.plank < 1 || oilKit.brick < 1) {
        await giveItems(page, [
          ['tinderbox', 1],
          ['oliveoil4', 2],
          ['hammer', 1],
          ['woodplank', 4],
          ['limestonebrick', 4],
          ['swamppaste', 20]
        ]).catch(() => {});
        oilKit = await page.evaluate(() => {
          const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
          const n = i => String(i?.name ?? '');
          return {
            tinder: inv.some(i => /tinderbox/i.test(n(i))),
            olive: inv.some(i => /olive oil/i.test(n(i))),
            hammer: inv.some(i => /hammer/i.test(n(i))),
            plank: inv.filter(i => /plank/i.test(n(i))).length,
            brick: inv.filter(i => /brick/i.test(n(i))).length,
            paste: inv.some(i => /swamp paste/i.test(n(i))),
            free: 28 - inv.length,
            names: inv.map(i => i?.name).filter(Boolean)
          };
        });
        console.log('[quest-mortton] oil kit retry', JSON.stringify(oilKit));
      }
      if (!oilKit.tinder) fail(`oil kit missing tinderbox: ${JSON.stringify(oilKit.names)}`);
      if (oilKit.plank < 1 || oilKit.brick < 1) {
        fail(
          `oil kit missing wall mats (broken altar upgrade needs plank+brick+paste): ${JSON.stringify(oilKit)}`
        );
      }

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

        // Flamtaer two layers (product flamtaer_temple.rs2):
        //   • Wall segs / flaming altar = **world locs** (shared; prior thrash leaves walls up).
        //   • %temple_sanctity / _p = **player varp** (new account starts 0; drains on timer).
        // Light: sanctity_p≥10 (raw≥300). Olive→sacred oil: raw≥300 (10% mes). Serum: raw≥600 (20%).
        // Thrash uses **20% / raw≥600 before pour** so post-light drain + multi-dose don't bounce.
        const sancRawNow = Number(
          (await getServerVarQuiet(page, 'temple_sanctity').catch(() => 0)) ?? 0
        );
        const sancNow = Number(
          (await getServerVarQuiet(page, 'temple_sanctity_p').catch(() => 0)) ?? 0
        );
        const needSancLight = sancNow < 10 || sancRawNow < 300;
        const needSancPour = sancNow < 20 || sancRawNow < 600;
        const lowSanc = needSancPour; // thrash until pour-ready
        const captureMesbox = residualMode && needSancLight && oilTicks % 20 === 5;

        const step = await page.evaluate(
          async ({ center, residual, captureMesbox: cap, needSancLight, needSancPour }) => {
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
            const walls = locs.filter(
              l =>
                /wall/i.test(String(l?.name ?? '')) &&
                (l.ops || []).some(o => /repair|reinforce/i.test(String(o ?? '')))
            );
            // Broken wall Repair first when altar broken; Temple reinforce is sanc-only.
            const wall =
              walls.find(
                l =>
                  /broken/i.test(String(l?.name ?? '')) &&
                  (l.ops || []).some(o => /repair/i.test(String(o ?? '')))
              ) ||
              walls.find(l => (l.ops || []).some(o => /repair/i.test(String(o ?? '')))) ||
              walls.find(l =>
                (l.ops || []).some(o => /reinforce/i.test(String(o ?? '')))
              ) ||
              walls[0] ||
              null;
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

            // Residual: broken altar upgrades via wall build. Prefer Repair on Broken segs.
            if (residual && broken && !flaming) {
              const w = wall;
              if (!w) {
                a?.opLocAt?.(broken.wx ?? broken.x, broken.wz ?? broken.z, 'repair') ||
                  a?.opLoc?.(broken.name, 'repair');
                return { action: 'fix-broken-altar', lit: false, broken: true };
              }
              if (walkToWall(w)) {
                return {
                  action: 'walk-wall-broken-altar',
                  lit: false,
                  broken: true,
                  name: w.name
                };
              }
              const ops = (w.ops || []).map(o => String(o ?? ''));
              const op =
                ops.find(o => /repair/i.test(o)) ||
                ops.find(o => /reinforce/i.test(o)) ||
                'repair';
              a?.opLocAt?.(w.wx ?? w.x, w.wz ?? w.z, op) || a?.opLoc?.(w.name, op);
              return {
                action: 'wall-for-broken-altar',
                lit: false,
                broken: true,
                name: w.name,
                op
              };
            }

            // Personal sanc: reinforce until pour-ready (20%/600). Walls may already be world-up.
            if (needSancPour && wall && !cap) {
              if (walkToWall(wall)) {
                return { action: 'walk-wall-sanc', lit: false, name: wall.name };
              }
              const ops = (wall.ops || []).map(o => String(o ?? ''));
              const op =
                ops.find(o => /reinforce/i.test(o)) ||
                ops.find(o => /repair/i.test(o)) ||
                'reinforce';
              a?.opLocAt?.(wall.wx ?? wall.x, wall.wz ?? wall.z, op) ||
                a?.opLoc?.(wall.name, op);
              return { action: 'reinforce-sanc', lit: false, name: wall.name, op };
            }

            // 1) Lit → pour olive only when pour-ready
            if (flaming && !needSancPour) {
              const wx = flaming.wx ?? flaming.x;
              const wz = flaming.wz ?? flaming.z;
              const sx = wx <= center.x ? wx - 1 : wx + 1;
              const sz = wz;
              if (me && Math.max(Math.abs(me.x - sx), Math.abs(me.z - sz)) > 1) {
                a?.walkWorld?.(sx, sz);
                return { action: 'walk-altar', lit: true, name: flaming.name };
              }
              const inv = r?.inventory?.() ?? [];
              const olive = inv.find(i => /olive oil/i.test(String(i?.name ?? '')));
              const tinder = inv.find(i => /tinderbox/i.test(String(i?.name ?? '')));
              if (!olive) {
                return { action: 'need-olive', lit: true, hasTinder: !!tinder };
              }
              const ok = a?.useHeldOnLoc?.(
                { id: olive.id, slot: olive.slot, comId: olive.comId },
                {
                  typecode: flaming.typecode | 0,
                  lx: flaming.lx | 0,
                  lz: flaming.lz | 0,
                  x: flaming.x ?? wx,
                  z: flaming.z ?? wz,
                  name: flaming.name
                },
                14
              ) || a?.useHeldOnLoc?.(olive.name, flaming.name || 'Flaming Fire altar', 14);
              return { action: ok ? 'oil' : 'oil-fail', lit: true, name: flaming.name };
            }

            // 2) Light after 10% (product gate) — still reinforce to 20% before pour
            if (nofire && (!needSancLight || cap)) {
              const wx = nofire.wx ?? nofire.x;
              const wz = nofire.wz ?? nofire.z;
              const sx = wx <= center.x ? wx - 1 : wx + 1;
              if (me && Math.max(Math.abs(me.x - sx), Math.abs(me.z - (wz | 0))) > 1) {
                a?.walkWorld?.(sx, wz);
                return { action: 'walk-nofire', lit: false, name: nofire.name };
              }
              const inv = r?.inventory?.() ?? [];
              const tinder = inv.find(i => /tinderbox/i.test(String(i?.name ?? '')));
              if (!tinder) {
                return { action: 'need-tinder', lit: false, name: nofire.name };
              }
              a?.useHeldOnLoc?.(
                { id: tinder.id, slot: tinder.slot, comId: tinder.comId },
                {
                  typecode: nofire.typecode | 0,
                  lx: nofire.lx | 0,
                  lz: nofire.lz | 0,
                  x: nofire.x ?? wx,
                  z: nofire.z ?? wz,
                  name: nofire.name
                },
                14
              ) || a?.useHeldOnLoc?.(tinder.name, nofire.name || 'Fire altar', 14);
              a?.opLocAt?.(wx, wz, 'light') || a?.opLoc?.('Fire altar', 'light');
              return { action: 'light', lit: false, name: nofire.name, captureMesbox: !!cap };
            }

            // 3) walls for sanctity / upgrade
            if (wall) {
              if (walkToWall(wall)) {
                return { action: 'walk-wall', lit: false, broken: !!broken };
              }
              a?.opLocAt?.(wall.wx ?? wall.x, wall.wz ?? wall.z, 'repair') ||
                a?.opLocAt?.(wall.wx ?? wall.x, wall.wz ?? wall.z, 'reinforce') ||
                a?.opLoc?.('wall', 'repair');
              return { action: 'reinforce', lit: false, broken: !!broken, name: wall.name };
            }

            return {
              action: 'idle',
              lit: false,
              needSancLight,
              needSancPour,
              names: locs.map(l => l?.name).filter(Boolean).slice(0, 12)
            };
          },
          {
            center: TEMPLE_CENTER,
            residual: residualMode,
            captureMesbox,
            needSancLight,
            needSancPour
          }
        );

        // Multi-tick wall oploc (p_oploc 3) — one click per thrash without settle never upgrades altar
        if (
          residualMode &&
          /wall-for-broken|reinforce-broken|walk-wall-broken/.test(String(step?.action ?? ''))
        ) {
          await page.waitForTimeout(1100);
        }
        if (residualMode && oilTicks % 15 === 0) {
          const rp = await getServerVarQuiet(page, 'temple_repaired_p').catch(() => null);
          const alts = await altarSnap();
          console.log(
            `[quest-mortton] oil diag t=${oilTicks} repaired_p=${rp} sanc=${sancRawNow}/${sancNow} step=${step?.action} altars=${JSON.stringify(alts)}`
          );
          if (
            oilTicks >= 90 &&
            alts.some(a => /broken fire altar/i.test(String(a?.name ?? '')))
          ) {
            fail(
              `RESIDUAL broken Fire altar stuck ${oilTicks} ticks (sanc=${sancNow}% repaired_p=${rp}; need wall oploc with mats + repaired_p=100 to upgrade). last=${JSON.stringify(step)}`
            );
          }
        }

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
        await seedLoarCombatKit(page, [
          ['logs', 6],
          ['tinderbox', 1],
          ['oliveoil4', 3],
          ['hammer', 1],
          ['swamppaste', 30],
          ['limestonebrick', 4],
          ['woodplank', 4]
        ]);
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
      /** Residual: product re-make pyre logs after clear_pyre wiped placed logs (stage may stay 75). */
      let remakePyreLogsTicks = 0;
      /**
       * Residual remake sacred oil ticks (separate budget).
       * First oil thrash took ~210 ticks; cleanup7 failed at 100 on broken-only spam.
       */
      let remakeOilTicks = 0;
      /** Consecutive flee ticks while temple oil remake blocked by multi-aggro. */
      let templeCombatStreak = 0;
      /** Last sanc/repaired_p snapshot for stall detect (not tick-only fail-fast). */
      let lastTempleProgressKey = '';
      let lastTempleProgressTick = 0;
      /** @type {{ name: string, wx: number, wz: number } | null} */
      let stickShade = null;
      /** Rate-limit residual teles — patient: walk first, tele only when truly far/stuck. */
      let lastResidualTeleAt = 0;
      let emptyLoarStreak = 0;
      /** Min ms between residual teleTo calls (scene rebuild spam feels like teleport thrash). */
      const RESIDUAL_TELE_COOLDOWN_MS = Number(process.env.RESIDUAL_TELE_COOLDOWN_MS) || 12_000;
      /**
       * Walk if within walkRadius; tele only if farther AND cooldown elapsed (or force).
       * Prefer staying put and letting combat / altar thrash finish.
       */
      const residualGo = async (dest, { walkRadius = 4, teleRadius = 4, force = false, label = 'go' } = {}) => {
        const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
        const d =
          tile && dest
            ? Math.max(Math.abs(tile.x - dest.x), Math.abs(tile.z - dest.z))
            : 999;
        if (d <= walkRadius) return { ok: true, how: 'here', d };
        const now = Date.now();
        const canTele =
          force ||
          (d > 18 && now - lastResidualTeleAt >= RESIDUAL_TELE_COOLDOWN_MS);
        if (!canTele) {
          await page.evaluate(({ x, z }) => {
            globalThis.__lc377?.actions?.walkWorld?.(x, z);
          }, { x: dest.x, z: dest.z });
          await page.waitForTimeout(700);
          return { ok: true, how: 'walk', d };
        }
        lastResidualTeleAt = now;
        const ok = await teleTo(page, dest, teleRadius, 20_000);
        if (ok) await waitSceneReady(page, 10_000);
        console.log(`[quest-mortton] residual ${label} d=${d} tele=${ok} (patient)`);
        return { ok, how: ok ? 'tele' : 'tele-fail', d };
      };
      /**
       * After remains land on pyre, refuse Loar hunt/tele for N place ticks so the
       * 49t clear_pyre window is not burned (c14: remains-on-pyre → immediate shade tele).
       */
      let pyreWindowSticky = 0;
      /**
       * Product stage 75 means logs were accepted even if client typecode still shows base
       * for a few ticks (c17: logs-on → stage 75 → still 4093 → need-pyre remake loop).
       * Count down place ticks; only remake after this expires while still base.
       */
      let logsWindowExpect = 0;
      /** Peek funeral pyre loc stage (4093 base / 4094–99 logs / 4100–05 bones). */
      const peekPyreLoc = async () =>
        page.evaluate(({ wx, wz }) => {
          const r = globalThis.__lc377?.reader;
          let pyre = typeof r?.locAt === 'function' ? r.locAt(wx, wz) : null;
          if (!pyre) {
            const locs = r?.locs?.({ maxDist: 16 }) ?? [];
            pyre =
              locs.find(
                l =>
                  /funeral pyre|pyre/i.test(String(l?.name ?? '')) &&
                  (l.x === wx || l.wx === wx) &&
                  (l.z === wz || l.wz === wz)
              ) || locs.find(l => /funeral pyre/i.test(String(l?.name ?? '')));
          }
          const typecode = pyre?.typecode != null ? pyre.typecode | 0 : 0;
          const locTypeId = typecode ? (typecode >> 14) & 0xffff : 0;
          const isBase = locTypeId === 4093 || locTypeId === 0;
          const isLogs =
            (locTypeId >= 4094 && locTypeId <= 4099) || locTypeId === 9006 || locTypeId === 9007;
          const isBones =
            (locTypeId >= 4100 && locTypeId <= 4105) || locTypeId === 9008 || locTypeId === 9009;
          const inv = r?.inventory?.() ?? [];
          return {
            locTypeId,
            isBase,
            isLogs,
            isBones,
            name: pyre?.name ?? null,
            ops: pyre?.ops || [],
            hasRemains: inv.some(i =>
              /loar.*remains|shade.*remains|remains/i.test(String(i?.name ?? ''))
            ),
            hasPyreLogs: inv.some(i => /pyre logs/i.test(String(i?.name ?? ''))),
            hasTinder: inv.some(i => /tinderbox/i.test(String(i?.name ?? '')))
          };
        }, { wx: FUNERAL_PYRE.x, wz: FUNERAL_PYRE.z });
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
            // Patient: only approach temple when outside; walk preferred (no TP thrash).
            await residualGo(FLAMTAER_COURTYARD, {
              walkRadius: 4,
              force: remakeOilTicks === 1,
              label: 'temple-s65-remake'
            });
            // Ensure olive + light mats if missing (generic prep only)
            if (!invPre.olive) {
              await giveItems(page, [['oliveoil4', 2]]).catch(() => {});
            }
            // Product gates: light needs sanctity_p≥10; olive pour needs sanctity≥300 (same 10%).
            // Soft entry 65 without rebuild leaves sanc≈0 — must reinforce before light spam.
            const sancPre = Number(
              (await getServerVarQuiet(page, 'temple_sanctity').catch(() => 0)) ?? 0
            );
            const sancPPre = Number(
              (await getServerVarQuiet(page, 'temple_sanctity_p').catch(() => 0)) ?? 0
            );
            const remake = await page.evaluate(
              async ({ altarWx, altarWz, center, sancP, sancRaw }) => {
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
              // Prefer Temple wall Reinforce when full segs; else Repair broken
              const walls = locs.filter(
                l =>
                  /wall/i.test(String(l?.name ?? '')) &&
                  (l.ops || []).some(o => /repair|reinforce/i.test(String(o ?? '')))
              );
              // Prefer Broken wall Repair when fixing broken altar; Temple reinforce is sanc-only.
              const wallBroken =
                walls.find(
                  l =>
                    /broken/i.test(String(l?.name ?? '')) &&
                    (l.ops || []).some(o => /repair|reinforce/i.test(String(o ?? '')))
                ) || null;
              const wallRepair =
                walls.find(l => (l.ops || []).some(o => /repair/i.test(String(o ?? '')))) || null;
              const wallReinforce =
                walls.find(l =>
                  (l.ops || []).some(o => /reinforce/i.test(String(o ?? '')))
                ) || null;
              const wall = wallBroken || wallRepair || wallReinforce || walls[0] || null;
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
                // cheb ≤1 → op (do not walk forever on blocked stand)
                if (me && Math.max(Math.abs(me.x - sx), Math.abs(me.z - sz)) > 1) {
                  a?.walkWorld?.(sx, sz);
                  return true;
                }
                return false;
              };
              // Light 10%/300; pour thrash 20%/600 (product olive is 10%; serum 20%)
              const needSanc = sancP < 20 || sancRaw < 600;

              // 0) Sanctity gate first — never light-spam mesbox at 0% (cleanup12 soft-65)
              if (needSanc && wall) {
                if (walkToWall(wall)) {
                  return {
                    action: 'walk-wall-sanc',
                    wall: wall.name,
                    sancP,
                    sancRaw
                  };
                }
                const ops = (wall.ops || []).map(o => String(o ?? ''));
                const op =
                  ops.find(o => /reinforce/i.test(o)) ||
                  ops.find(o => /repair/i.test(o)) ||
                  'reinforce';
                a?.opLocAt?.(wall.wx ?? wall.x, wall.wz ?? wall.z, op) ||
                  a?.opLoc?.(wall.name, op);
                return {
                  action: 'reinforce-sanc',
                  wall: wall.name,
                  op,
                  sancP,
                  sancRaw
                };
              }

              // 1) Lit → pour olive oil (only when sanc enough for product drain)
              if (flaming && oil && !needSanc) {
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

              // 2) Unlit repaired altar → Light (only after 10% sanctity)
              if (nofire && tinder && !flaming && !needSanc) {
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

              // 3) Broken altar + sanc ok → Repair Broken walls first, then reinforce, then altar op.
              // Temple wall reinforce alone leaves altar Broken (parked residual hang).
              if (broken && !flaming) {
                const w = wallBroken || wallRepair || wall;
                if (w) {
                  if (walkToWall(w)) {
                    return {
                      action: 'walk-wall-broken-altar',
                      wall: w.name,
                      broken: broken.name
                    };
                  }
                  const ops = (w.ops || []).map(o => String(o ?? ''));
                  const op =
                    ops.find(o => /repair/i.test(o)) ||
                    ops.find(o => /reinforce/i.test(o)) ||
                    'repair';
                  a?.opLocAt?.(w.wx ?? w.x, w.wz ?? w.z, op) || a?.opLoc?.(w.name, op);
                  return {
                    action: 'wall-for-broken-altar',
                    wall: w.name,
                    op,
                    broken: broken.name
                  };
                }
                // No wall ops — try product repair/build on broken altar loc
                a?.opLocAt?.(broken.wx ?? broken.x, broken.wz ?? broken.z, 'repair') ||
                  a?.opLocAt?.(broken.wx ?? broken.x, broken.wz ?? broken.z, 'build') ||
                  a?.opLoc?.(broken.name, 'repair');
                return { action: 'fix-broken-altar', broken: broken.name };
              }

              // 4) Walls for sanctity / upgrade even when no broken loc yet
              if (wall && !flaming) {
                if (walkToWall(wall)) {
                  return { action: 'walk-wall', wall: wall.name };
                }
                a?.opLocAt?.(wall.wx ?? wall.x, wall.wz ?? wall.z, 'repair') ||
                  a?.opLocAt?.(wall.wx ?? wall.x, wall.wz ?? wall.z, 'reinforce') ||
                  a?.opLoc?.(wall.name, 'repair');
                return { action: 'reinforce', wall: wall.name, broken: broken?.name ?? null };
              }

              return {
                action: 'idle-remake',
                flaming: flaming?.name ?? null,
                broken: broken?.name ?? null,
                nofire: nofire?.name ?? null,
                olive: !!oil,
                needSanc,
                sancP,
                atTile: atTile?.name ?? null,
                names: locs.map(l => l?.name).filter(Boolean).slice(0, 10)
              };
            }, {
              altarWx: FLAMTAER_ALTAR.x,
              altarWz: FLAMTAER_ALTAR.z,
              center: TEMPLE_CENTER,
              sancP: sancPPre,
              sancRaw: sancPre
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
          if (pyreTicks % 4 === 0) {
            await thrashPoint(page, 'mortton-pyre-logs', {
              stage: Number(stage),
              t: pyreTicks,
              phase: 'make-pyre-logs',
              made
            });
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
          // Residual gate (resume wipe leaves stage 75 without oil/pyre logs):
          // 1) stay at temple until sacred oil + pyre logs exist
          // 2) then hunt Loar (often near temple — not empty west town)
          // 3) only then walk pyre for place/light
          // Never bounce temple↔pyre while remaking (looks like "no shades + running").
          if (residualMode) {
            const invGate = await page.evaluate(() => {
              const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
              const names = inv.map(i => i?.name).filter(Boolean);
              return {
                free: 28 - inv.length,
                oil: names.some(n => /sacred oil/i.test(n)),
                pyre: names.some(n => /pyre logs/i.test(n)),
                olive: names.some(n => /olive oil/i.test(n)),
                logs: names.some(n => /^logs$/i.test(n)),
                remains: names.some(n => /remain/i.test(n)),
                names
              };
            });

            // --- A) Need sacred oil: temple only (no pyre walk) ---
            if (!invGate.pyre && !invGate.oil) {
              remakeOilTicks++;
              if (remakeOilTicks % 8 === 1) {
                console.log(
                  `[quest-mortton] residual: patient temple oil remake t=${remakeOilTicks}`,
                  invGate
                );
              }
              if (!invGate.olive || !invGate.logs) {
                await giveItems(page, [
                  ['logs', 4],
                  ['oliveoil4', 2],
                  ['tinderbox', 1]
                ]).catch(() => {});
              }
              // Top off food + wall mats mid-rebuild (resource pool drains).
              if (remakeOilTicks % 12 === 5) {
                const kit = await page.evaluate(() => {
                  const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
                  const n = s =>
                    inv.filter(i => new RegExp(s, 'i').test(String(i?.name ?? ''))).length;
                  return {
                    food: n('lobster'),
                    plank: n('plank'),
                    brick: n('limestone'),
                    paste: n('swamp paste')
                  };
                });
                const top = [];
                if (kit.food < 3) top.push(['lobster', 6]);
                if (kit.plank < 2) top.push(['plank', 6]);
                if (kit.brick < 2) top.push(['limestonebrick', 6]);
                if (kit.paste < 5) top.push(['swamppaste', 20]);
                if (top.length) await giveItems(page, top).catch(() => {});
              }
              // Never kill-all Loar (field never clears). Flee multi first —
              // do NOT residualGo(courtyard) while in combat (walks into swarm).
              const aggroGate = await templeOilAggroGate(page);
              if (aggroGate.action === 'flee-aggro') {
                templeCombatStreak = (templeCombatStreak | 0) + 1;
                if (remakeOilTicks % 4 === 0 || templeCombatStreak <= 2) {
                  console.log(
                    `[quest-mortton] residual temple flee-aggro t=${remakeOilTicks} streak=${templeCombatStreak}`,
                    aggroGate
                  );
                }
                // Soft tele south if walk stuck in courtyard multi for many ticks.
                if (templeCombatStreak % 6 === 0) {
                  await residualGo(TEMPLE_FLEE, {
                    walkRadius: 2,
                    force: true,
                    label: 'flee-loar-south'
                  });
                }
                if (templeCombatStreak >= 100) {
                  fail(
                    `FAIL-FAST: temple oil remake stuck fleeing multi (no build window) t=${remakeOilTicks} streak=${templeCombatStreak} last=${JSON.stringify(aggroGate)}`
                  );
                }
                await thrashPoint(page, 'mortton-temple-oil', {
                  stage: Number(stage),
                  t: remakeOilTicks,
                  phase: 'flee-aggro',
                  aggroGate,
                  invGate
                });
                await page.waitForTimeout(500);
                continue;
              }
              templeCombatStreak = 0;

              // Build window: only now enter courtyard for wall sticky.
              await residualGo(FLAMTAER_COURTYARD, {
                walkRadius: 4,
                force: remakeOilTicks <= 2,
                label: 'temple-oil-only'
              });
              // Re-check: re-aggro while walking in → flee next tick, don't wall spam.
              const recheck = await templeOilAggroGate(page);
              if (recheck.action === 'flee-aggro') {
                templeCombatStreak = 1;
                await page.waitForTimeout(400);
                continue;
              }

              const sancR = Number(
                (await getServerVarQuiet(page, 'temple_sanctity').catch(() => 0)) ?? 0
              );
              const sancPR = Number(
                (await getServerVarQuiet(page, 'temple_sanctity_p').catch(() => 0)) ?? 0
              );
              // Same product thrash as s<70 remake (opLocAt / useHeldOnLoc snaps) — not dead locOp.
              const pour = await page.evaluate(
                async ({ altarWx, altarWz, center, sancP, sancRaw }) => {
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
                      ? {
                          typecode: l.typecode | 0,
                          lx: l.lx | 0,
                          lz: l.lz | 0,
                          x: l.x,
                          z: l.z,
                          name: l.name
                        }
                      : null;
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
                    (atTile && /broken fire altar/i.test(String(atTile.name ?? ''))
                      ? atTile
                      : null);
                  const inv = r?.inventory?.() ?? [];
                  const oil = inv.find(i => /olive oil/i.test(String(i?.name ?? '')));
                  const tinder = inv.find(i => /tinderbox/i.test(String(i?.name ?? '')));
                  const walls = locs.filter(
                    l =>
                      /wall/i.test(String(l?.name ?? '')) &&
                      (l.ops || []).some(o => /repair|reinforce/i.test(String(o ?? '')))
                  );
                  const wall =
                    walls.find(l =>
                      (l.ops || []).some(o => /reinforce/i.test(String(o ?? '')))
                    ) ||
                    walls.find(l => /broken/i.test(String(l?.name ?? ''))) ||
                    walls[0] ||
                    null;
                  const me = r?.worldTile?.();
                  const anim = r?.selfAnim?.() ?? -1;
                  // Sticky: only walk when far (cheb>2). >1 caused walk-spam vs sticky p_oploc.
                  const walkToWall = w => {
                    const wx = w.wx ?? w.x;
                    const wz = w.wz ?? w.z;
                    let sx = wx;
                    let sz = wz;
                    if (wx < center.x) sx = wx + 1;
                    else if (wx > center.x) sx = wx - 1;
                    if (wz < center.z) sz = wz + 1;
                    else if (wz > center.z) sz = wz - 1;
                    if (me && Math.max(Math.abs(me.x - sx), Math.abs(me.z - sz)) > 2) {
                      a?.walkWorld?.(sx, sz);
                      return true;
                    }
                    return false;
                  };
                  // Nearest Repair wall (not walls[0] which can be far / wrong side).
                  const nearestWall = pool => {
                    if (!pool?.length || !me) return pool?.[0] || null;
                    return [...pool]
                      .map(w => {
                        const wx = w.wx ?? w.x;
                        const wz = w.wz ?? w.z;
                        const d =
                          wx != null && wz != null
                            ? Math.max(Math.abs(me.x - wx), Math.abs(me.z - wz))
                            : 99;
                        return { w, d };
                      })
                      .sort((a, b) => a.d - b.d)[0]?.w;
                  };
                  // Light needs ~10%/300; pour product ~10% olive (use 10/300 gate).
                  // Broken Fire altar upgrades only when wall repaired_p→100 (try_build_temple) —
                  // NOT by opLoc repair on the altar loc. Spamming fix-broken-altar hangs forever.
                  // Order: wall-for-broken → light nofire → pour flaming → personal sanc if low.
                  const needSanc = sancP < 10 || sancRaw < 300;

                  // 1) Lit → pour (product path to sacred oil)
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
                    return { action: 'pour-olive', ok: !!ok, flaming: flaming?.name, loc: fs };
                  }

                  // 2) Nofire altar + tinder → light (after walls upgraded broken→nofire)
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

                  // 3) Broken Fire altar → wall Repair/reinforce until repaired_p upgrades loc
                  if (broken && !flaming) {
                    const repairPool = walls.filter(l =>
                      (l.ops || []).some(o => /repair/i.test(String(o ?? '')))
                    );
                    const reinforcePool = walls.filter(l =>
                      (l.ops || []).some(o => /reinforce/i.test(String(o ?? '')))
                    );
                    // Prefer Broken wall Repair nearest; reinforce only if no Repair segs left.
                    const w =
                      nearestWall(repairPool) ||
                      nearestWall(reinforcePool) ||
                      nearestWall(walls) ||
                      wall;
                    if (w) {
                      // Mid sticky anim: re-issue Repair without walk (walk kills p_oploc sticky).
                      if (anim != null && anim >= 0 && !walkToWall(w)) {
                        const ops = (w.ops || []).map(o => String(o ?? ''));
                        const op =
                          ops.find(o => /repair/i.test(o)) ||
                          ops.find(o => /reinforce/i.test(o)) ||
                          'repair';
                        a?.opLocAt?.(w.wx ?? w.x, w.wz ?? w.z, op) || a?.opLoc?.(w.name, op);
                        return {
                          action: 'wall-sticky',
                          wall: w.name,
                          broken: broken.name,
                          op,
                          anim,
                          sancP,
                          sancRaw
                        };
                      }
                      if (walkToWall(w)) {
                        return {
                          action: 'walk-wall-broken-altar',
                          wall: w.name,
                          broken: broken.name,
                          sancP,
                          sancRaw
                        };
                      }
                      const ops = (w.ops || []).map(o => String(o ?? ''));
                      const op =
                        ops.find(o => /repair/i.test(o)) ||
                        ops.find(o => /reinforce/i.test(o)) ||
                        'reinforce';
                      a?.opLocAt?.(w.wx ?? w.x, w.wz ?? w.z, op) || a?.opLoc?.(w.name, op);
                      return {
                        action: 'wall-for-broken-altar',
                        wall: w.name,
                        broken: broken.name,
                        op,
                        sancP,
                        sancRaw
                      };
                    }
                    // No wall ops visible — last resort on altar loc (usually dead)
                    a?.opLocAt?.(broken.wx ?? broken.x, broken.wz ?? broken.z, 'repair') ||
                      a?.opLoc?.(broken.name, 'repair');
                    return {
                      action: 'fix-broken-altar',
                      broken: broken.name,
                      wall: null,
                      sancP,
                      sancRaw
                    };
                  }

                  // 4) Personal sanc low with walls up (no broken) — reinforce for pour gate
                  if (needSanc && wall) {
                    if (walkToWall(wall)) {
                      return { action: 'walk-wall-sanc', wall: wall.name, sancP, sancRaw };
                    }
                    const ops = (wall.ops || []).map(o => String(o ?? ''));
                    const op =
                      ops.find(o => /reinforce/i.test(o)) ||
                      ops.find(o => /repair/i.test(o)) ||
                      'reinforce';
                    a?.opLocAt?.(wall.wx ?? wall.x, wall.wz ?? wall.z, op) ||
                      a?.opLoc?.(wall.name, op);
                    return { action: 'reinforce-sanc', wall: wall.name, op, sancP, sancRaw };
                  }

                  if (wall && !flaming) {
                    if (walkToWall(wall)) {
                      return { action: 'walk-wall', wall: wall.name };
                    }
                    a?.opLocAt?.(wall.wx ?? wall.x, wall.wz ?? wall.z, 'repair') ||
                      a?.opLocAt?.(wall.wx ?? wall.x, wall.wz ?? wall.z, 'reinforce') ||
                      a?.opLoc?.(wall.name, 'repair');
                    return { action: 'reinforce', wall: wall.name, broken: broken?.name ?? null };
                  }

                  return {
                    action: 'idle-remake',
                    flaming: flaming?.name ?? null,
                    broken: broken?.name ?? null,
                    nofire: nofire?.name ?? null,
                    wall: wall?.name ?? null,
                    oil: !!oil,
                    tinder: !!tinder,
                    sancP,
                    sancRaw,
                    locNames: locs.map(l => l?.name).filter(Boolean).slice(0, 12)
                  };
                },
                {
                  altarWx: FLAMTAER_ALTAR.x,
                  altarWz: FLAMTAER_ALTAR.z,
                  center: TEMPLE_CENTER,
                  sancP: sancPR,
                  sancRaw: sancR
                }
              );
              if (
                remakeOilTicks % 3 === 0 ||
                /pour|light|reinforce|walk/.test(String(pour?.action ?? ''))
              ) {
                console.log(
                  `[quest-mortton] residual temple oil t=${remakeOilTicks} sanc=${sancR}/${sancPR}`,
                  pour
                );
                await thrashPoint(page, 'mortton-temple-oil', {
                  stage: Number(stage),
                  t: remakeOilTicks,
                  phase: 'temple-oil-only',
                  pour,
                  invGate,
                  sanc: { raw: sancR, p: sancPR }
                });
              }
              // repaired_p (not personal sanc) upgrades Broken→nofire. Log it.
              const repairedP = Number(
                (await getServerVarQuiet(page, 'temple_repaired_p').catch(() => 0)) ?? 0
              );
              if (remakeOilTicks % 6 === 0 || pour?.action === 'light-nofire' || pour?.action === 'pour-olive') {
                console.log(
                  `[quest-mortton] residual temple oil t=${remakeOilTicks} sanc=${sancR}/${sancPR} repaired_p=${repairedP}`,
                  pour?.action,
                  pour?.broken || pour?.flaming || pour?.name || ''
                );
              }
              // Progress: sanc or repaired_p rising = rebuild working (need ~15 full segs → 100%).
              // Fail only when both stall, not on wall tick count alone (48 was too tight).
              const progressKey = `${sancR}|${repairedP}|${pour?.broken || pour?.flaming || ''}`;
              if (progressKey !== lastTempleProgressKey) {
                lastTempleProgressKey = progressKey;
                lastTempleProgressTick = remakeOilTicks;
              }
              if (
                remakeOilTicks >= 40 &&
                remakeOilTicks - lastTempleProgressTick >= 35 &&
                /wall-for-broken|walk-wall-broken|fix-broken|idle-remake/.test(
                  String(pour?.action ?? '')
                )
              ) {
                fail(
                  `FAIL-FAST: temple oil rebuild stalled (no sanc/repaired_p change ${remakeOilTicks - lastTempleProgressTick} ticks). t=${remakeOilTicks} last=${JSON.stringify(pour)} sanc=${sancR}/${sancPR} repaired_p=${repairedP}`
                );
              }
              if (remakeOilTicks >= 280) {
                fail(
                  `RESIDUAL temple oil remake stalled t=${remakeOilTicks} (need sacred oil before pyre/Loar). last=${JSON.stringify(pour)} sanc=${sancR}/${sancPR} repaired_p=${repairedP}`
                );
              }
              await page.waitForTimeout(900);
              continue;
            }

            // --- B) Oil but no pyre logs: OPHELDU here (no pyre walk yet) ---
            if (!invGate.pyre && invGate.oil) {
              remakePyreLogsTicks++;
              const made = await page.evaluate(async () => {
                const a = globalThis.__lc377?.actions;
                const r = globalThis.__lc377?.reader;
                a?.continueDialog?.();
                a?.dismissModalMessage?.();
                a?.setSideTab?.(3);
                await new Promise(res => setTimeout(res, 150));
                let inv = r?.inventory?.() ?? [];
                if (inv.some(i => /pyre logs/i.test(String(i?.name ?? '')))) {
                  return { ok: true, already: true };
                }
                const oil = inv.find(i => /sacred oil/i.test(String(i?.name ?? '')));
                const logs = inv.find(i => /^logs$/i.test(String(i?.name ?? '')));
                if (!oil || !logs) return { ok: false, reason: 'need oil+logs' };
                a?.useHeldOnHeld?.(
                  { id: oil.id, slot: oil.slot, comId: oil.comId },
                  { id: logs.id, slot: logs.slot, comId: logs.comId }
                );
                await new Promise(res => setTimeout(res, 900));
                inv = r?.inventory?.() ?? [];
                return {
                  ok: inv.some(i => /pyre logs/i.test(String(i?.name ?? ''))),
                  action: 'oil-on-logs'
                };
              });
              if (remakePyreLogsTicks % 4 === 0 || made?.ok) {
                console.log(
                  `[quest-mortton] residual: oil-on-logs t=${remakePyreLogsTicks}`,
                  made
                );
                await thrashPoint(page, 'mortton-pyre-logs', {
                  stage: Number(stage),
                  t: remakePyreLogsTicks,
                  phase: 'oil-on-logs-stay',
                  made
                });
              }
              if (made?.ok) remakePyreLogsTicks = 0;
              if (remakePyreLogsTicks >= 80) {
                fail(`RESIDUAL oil-on-logs stalled t=${remakePyreLogsTicks}`);
              }
              await page.waitForTimeout(600);
              continue;
            }
          }

          // Residual: get Loar remains via kill + ground Take (no give)
          if (residualMode) {
            // Free slots for Take remains — NEVER ~clearinv when holding pyre logs / sacred oil
            // (c29 wiped product pyre logs → remake loop; chat "Inventory wiped").
            if (remainsHuntTicks === 0 || remainsHuntTicks % 40 === 1) {
              const free = await page.evaluate(() => {
                const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
                return {
                  free: 28 - inv.length,
                  names: inv.map(i => i?.name).filter(Boolean),
                  hasPyreLogs: inv.some(i => /pyre logs/i.test(String(i?.name ?? ''))),
                  hasOil: inv.some(i => /sacred oil/i.test(String(i?.name ?? ''))),
                  hasOlive: inv.some(i => /olive oil/i.test(String(i?.name ?? '')))
                };
              });
              console.log('[quest-mortton] residual remains inv before hunt', JSON.stringify(free));
              if ((free?.free ?? 0) < 3) {
                const keepCritical = free.hasPyreLogs || free.hasOil || Number(stage) >= 70;
                if (keepCritical) {
                  // Drop lobsters / spare olive only — keep pyre logs, sacred oil, tinder, logs
                  const dropped = await page.evaluate(async () => {
                    const a = globalThis.__lc377?.actions;
                    const r = globalThis.__lc377?.reader;
                    const sleep = ms => new Promise(res => setTimeout(res, ms));
                    const freeSlots = () => 28 - (r?.inventory?.() ?? []).length;
                    let n = 0;
                    a?.setSideTab?.(3);
                    for (let i = 0; i < 16 && freeSlots() < 4; i++) {
                      const inv = r?.inventory?.() ?? [];
                      const drop =
                        inv.find(x => /lobster/i.test(String(x?.name ?? ''))) ||
                        inv.find(
                          x =>
                            /olive oil/i.test(String(x?.name ?? '')) &&
                            inv.filter(y => /olive oil/i.test(String(y?.name ?? ''))).length > 1
                        ) ||
                        inv.find(x => /adamant/i.test(String(x?.name ?? ''))); // should be worn
                      if (!drop) break;
                      // Drop = held op matching Drop
                      const ops = drop.ops || [];
                      let idx = ops.findIndex(o => o && /drop/i.test(String(o)));
                      if (idx < 0) idx = 4; // often last held op
                      a?.heldOp?.(drop.name, idx + 1) || a?.equip?.(drop.name);
                      n++;
                      await sleep(350);
                    }
                    return {
                      dropped: n,
                      free: freeSlots(),
                      names: (r?.inventory?.() ?? []).map(i => i?.name).filter(Boolean)
                    };
                  });
                  console.log(
                    '[quest-mortton] residual remains: drop-food free slots (kept pyre/oil)',
                    JSON.stringify(dropped)
                  );
                } else {
                  await cheatQuiet(page, '~clearinv', 500);
                  await seedLoarCombatKit(page, [
                    ['logs', 4],
                    ['tinderbox', 1],
                    ['oliveoil4', 2]
                  ]);
                  console.log('[quest-mortton] residual remains: clearinv+lean (pre-pyre only)');
                }
              }
            }
            const hasRem = await page.evaluate(() => {
              const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
              return inv.some(i =>
                /loar.*remains|shade.*remains|remains.*loar/i.test(String(i?.name ?? ''))
              );
            });
            // c14: after remains-on-pyre inv_del, !hasRem tele-hunted and burned 49t bones window.
            // c16: sticky after logs-on-pyre blocked hunt → light-spam on logs stage, window dies.
            // Hunt whenever logs stage has no remains in inv. Sticky only holds for bones light
            // or when we still hold remains to place.
            if (!hasRem) {
              const pl = await peekPyreLoc();
              // Hunt BEFORE placing logs when we already hold pyre logs (c18 burned 49t
              // hunting after logs-on). Also hunt on live logs stage / logsWindowExpect.
              // Order under residual: remains in inv → logs-on → remains-on → light.
              const invPyreReady = await page.evaluate(() => {
                const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
                return inv.some(i => /pyre logs/i.test(String(i?.name ?? '')));
              });
              const needHuntRemains =
                !pl?.hasRemains &&
                (pl?.isLogs === true ||
                  (logsWindowExpect > 0 && !pl?.isBones && Number(stage) >= 75) ||
                  (pl?.isBase && invPyreReady && Number(stage) >= 70 && !pl?.isBones));
              if (!needHuntRemains) {
                if (pyreTicks % 6 === 0) {
                  console.log(
                    '[quest-mortton] residual: skip Loar hunt — place/light/remake',
                    JSON.stringify(pl),
                    `sticky=${pyreWindowSticky} logsExpect=${logsWindowExpect} invPyre=${invPyreReady}`
                  );
                }
                // fall through to place/light (do not continue)
              } else {
                remainsHuntTicks++;
                // Equip at hunt start + every ~20 ticks (steel@60 + 6 food was under-geared)
                if (remainsHuntTicks === 1 || remainsHuntTicks % 20 === 0) {
                  await equipLoarKit(page);
                }
                // Patient field hunt: walk between spawns; tele only first time or long empty streak.
                // Tele every 8 ticks was aborting Loar combat and felt like random TP spam.
                let shadeOk = true;
                let teleSpawn = null;
                let goHow = 'none';
                if (stickShade) {
                  // Stay on sticky target — walk only, never tele mid-fight
                  const go = await residualGo(
                    { x: stickShade.wx, z: stickShade.wz, level: 0 },
                    { walkRadius: 2, force: false, label: 'stick-shade' }
                  );
                  goHow = go.how;
                  shadeOk = go.ok;
                } else {
                  teleSpawn =
                    SHADE_FIELD_SPAWNS[
                      Math.floor(remainsHuntTicks / 16) % SHADE_FIELD_SPAWNS.length
                    ] || SHADE_FIELD_SPAWNS[0];
                  const forceTele =
                    remainsHuntTicks === 1 ||
                    (emptyLoarStreak >= 30 && remainsHuntTicks % 40 === 0);
                  const go = await residualGo(teleSpawn, {
                    walkRadius: 6,
                    force: forceTele,
                    label: 'loar-field'
                  });
                  goHow = go.how;
                  shadeOk = go.ok;
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
                  // 1240 Loar Shadow ↔ 1241 Loar Shade (timer form swap). Match either.
                  const shadeCands = npcs
                    .filter(n => {
                      const nm = String(n?.name ?? '');
                      const id = n?.id | 0;
                      return (
                        /^Loar (Shadow|Shade)$/i.test(nm) ||
                        /loar/i.test(nm) ||
                        id === 1240 ||
                        id === 1241
                      );
                    })
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
                  emptyLoarStreak = 0;
                  // Verify inv after take — takeGround can report ok with full inv (cleanup9)
                  await page.waitForTimeout(900);
                  const got = await page.evaluate(() => {
                    const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
                    return {
                      free: 28 - inv.length,
                      rem: inv
                        .filter(i => /remain/i.test(String(i?.name ?? '')))
                        .map(i => i?.name),
                      names: inv.map(i => i?.name).filter(Boolean).slice(0, 16)
                    };
                  });
                  console.log(
                    '[quest-mortton] residual: took Loar remains',
                    take.how,
                    JSON.stringify(got)
                  );
                  if (!(got?.rem?.length > 0)) {
                    // Click sent but no inv land — do not treat as success; keep hunting
                    console.log(
                      '[quest-mortton] WARN: take ok but rem not in inv — continue hunt',
                      JSON.stringify(got)
                    );
                    await page.waitForTimeout(700);
                    continue;
                  }
                } else if (take?.how === 'attack' || take?.how === 'walk-attack') {
                  emptyLoarStreak = 0;
                  if (take.wx != null && take.wz != null) {
                    stickShade = { name: take.name, wx: take.wx, wz: take.wz };
                  }
                  // Patient combat settle — do not tele/walk spam mid-fight
                  await page.waitForTimeout(1200);
                } else if (take?.how === 'none') {
                  emptyLoarStreak++;
                  // Lost visual — clear stick slowly; walk field, don't TP thrash
                  if (emptyLoarStreak >= 12) stickShade = null;
                }
                // Dense datapoint every other tick
                if (remainsHuntTicks % 2 === 0 || take?.how !== 'none') {
                  await thrashPoint(page, 'mortton-remains', {
                    stage: Number(stage),
                    t: remainsHuntTicks,
                    phase: 'kill-take-loar',
                    action: take?.how ?? '?',
                    stick: stickShade,
                    goHow,
                    teleOk: shadeOk,
                    teleSpawn,
                    emptyLoarStreak,
                    pl,
                    take: take
                      ? {
                          how: take.how,
                          name: take.name,
                          dist: take.dist,
                          atk: take.atk,
                          cand: take.cand
                        }
                      : null
                  });
                }
                // ~ patient ticks × 320 ≈ long hunt without tele spam
                if (remainsHuntTicks >= 320) {
                  fail(
                    `RESIDUAL no Loar remains after ${remainsHuntTicks} hunt ticks (kill+Take failed; no give). last=${JSON.stringify(take)}`
                  );
                }
                await page.waitForTimeout(
                  take?.how === 'attack' || take?.how === 'walk-attack' ? 900 : 700
                );
                continue;
              }
            }
            // Have remains (or stayOnPyre fall-through) — clear stick for place/light
            stickShade = null;
          }

          // Place/light — only when we have something to place (remains or pyre logs).
          // Residual without mats already continued above (temple oil / oil-on-logs).
          const canPlace = await page.evaluate(() => {
            const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
            const n = inv.map(i => i?.name).filter(Boolean);
            return {
              pyre: n.some(x => /pyre logs/i.test(x)),
              remains: n.some(x => /remain/i.test(x)),
              oil: n.some(x => /sacred oil/i.test(x))
            };
          });
          if (residualMode && !canPlace.pyre && !canPlace.remains) {
            // Should have been handled by temple oil / oil-on-logs gates; avoid pyre walk thrash
            await page.waitForTimeout(500);
            continue;
          }

          // Place/light budget is independent of Loar hunt ticks.
          // Content: logs → remains (oplocu _flamtaer_pyre_logs) → light (tinder/oploc1
          // _flamtaer_pyre_bones). longqueue clear_pyre_loc @ 49 game ticks — tele+scene
          // every place tick (cleanup8) burns the window; remains "ok" never consumes.
          pyrePlaceTicks++;
          if (pyreWindowSticky > 0) pyreWindowSticky--;
          if (logsWindowExpect > 0) logsWindowExpect--;
          const tilePyre = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
          const nearPyre =
            tilePyre &&
            Math.max(
              Math.abs(tilePyre.x - FUNERAL_PYRE_STAND.x),
              Math.abs(tilePyre.z - FUNERAL_PYRE_STAND.z)
            ) <= 3;
          // Patient: walk to pyre; tele only when far + cooldown (never spam mid 49t window).
          if (!nearPyre) {
            const go = await residualGo(FUNERAL_PYRE_STAND, {
              walkRadius: 3,
              force: false,
              label: 'pyre-stand'
            });
            if (!go.ok && go.how === 'tele-fail') {
              console.log('[quest-mortton] tele pyre stand failed');
              await page.waitForTimeout(600);
              continue;
            }
            if (go.how === 'walk' || go.how === 'walk-cooldown') {
              await page.waitForTimeout(500);
            }
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

            // Loc type id often in typecode>>14 (4093=temple_pyre, 4094=…_logs, 4100=…_bones_logs)
            const locTypeId = pyreSnap ? (pyreSnap.typecode >> 14) & 0xffff : 0;
            const isBasePyre = locTypeId === 4093 || locTypeId === 0;
            const isLogsPyre =
              (locTypeId >= 4094 && locTypeId <= 4099) || locTypeId === 9006 || locTypeId === 9007;
            const isBonesPyre =
              (locTypeId >= 4100 && locTypeId <= 4105) || locTypeId === 9008 || locTypeId === 9009;
            const chat = (r?.chat?.(6) ?? []).map(l => String(l?.text ?? l ?? ''));

            // 1) pyre logs on base — only when remains already in inv (residual).
            //    c18: logs-first then 60+ hunt ticks → clear_pyre before remains.
            if (pyreLogs && isBasePyre) {
              if (!remains) {
                return {
                  action: 'need-remains-before-logs',
                  locTypeId,
                  hasPyreLogs: true,
                  chat
                };
              }
              const ok = pyreSnap
                ? a?.useHeldOnLoc?.(
                    { id: pyreLogs.id, slot: pyreLogs.slot, comId: pyreLogs.comId },
                    pyreSnap,
                    14
                  )
                : a?.useHeldOnLoc?.(pyreLogs.name, 'Funeral Pyre', 14);
              return {
                action: 'logs-on-pyre',
                ok: !!ok,
                loc: pyreSnap,
                locTypeId,
                replace: questStage >= 75,
                hasRemains: !!remains,
                chat
              };
            }

            // 2) Remains only on *logs* stage — never base (oplocu temple_pyre rejects shade_bones)
            if (remains && isLogsPyre) {
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
                locTypeId,
                isLogsPyre: true,
                ops: pyre?.ops || [],
                remainsName: remains?.name,
                hasLight: hasLightOp(pyre),
                chat
              };
            }

            // 3) Light ONLY bones stage (or named Light op) — never base, never bare logs.
            //    c16: light-after-remains-maybe on logs stage printed "Nothing interesting" and
            //    burned the 49t window before we hunted Loar remains.
            if ((lightable || isBonesPyre) && !isBasePyre && !isLogsPyre) {
              return tryLight(isBonesPyre ? 'light-bones-pyre' : 'light-pyre');
            }
            // Logs stage without remains in inv → outer loop must hunt (not light).
            if (isLogsPyre && !remains) {
              return {
                action: 'need-remains-on-logs',
                locTypeId,
                ops: pyre?.ops || [],
                chat
              };
            }

            // 4) base + no pyre logs at stage≥70 → remake only if logs window not expected.
            //    c17: stage already 75 after product logs-on; client still 4093 for a beat —
            //    remake then wastes oil and never hunts. Outer loop gates remake on logsWindowExpect.
            if (questStage >= 70 && isBasePyre && !pyreLogs) {
              return {
                action: 'need-pyre-logs-replace',
                locTypeId,
                hasOil: inv.some(i => /sacred oil/i.test(String(i?.name ?? ''))),
                hasOlive: inv.some(i => /olive oil/i.test(String(i?.name ?? ''))),
                hasLogs: inv.some(i => /^logs$/i.test(String(i?.name ?? ''))),
                hasRemains: !!remains,
                chat
              };
            }

            // 5) Light when remains already applied (not held) or bones stage
            if (questStage >= 75 && tinder && !isBasePyre && !remains) {
              return tryLight('light-pyre-stage75');
            }

            // 6) Early remains before logs placed (stage 70–74) — only on logs loc
            if (remains && isLogsPyre) {
              const ok = pyreSnap
                ? a?.useHeldOnLoc?.(
                    { id: remains.id, slot: remains.slot, comId: remains.comId },
                    pyreSnap,
                    14
                  )
                : a?.useHeldOnLoc?.(remains.name, 'Funeral Pyre', 14);
              return { action: 'remains-on-pyre-early', ok: !!ok, loc: pyreSnap, locTypeId, chat };
            }

            return {
              action: 'idle',
              locTypeId,
              isBasePyre,
              isLogsPyre,
              isBonesPyre,
              inv: inv.map(i => i?.name).filter(Boolean).slice(0, 12),
              pyre: pyreSnap,
              chat,
              pyres: pyres.map(p => ({ name: p?.name, ops: p?.ops, x: p?.x, z: p?.z }))
            };
          }, {
            pyreWx: FUNERAL_PYRE.x,
            pyreWz: FUNERAL_PYRE.z,
            questStage: s,
            placeN: pyrePlaceTicks
          });

          if (
            pyrePlaceTicks % 5 === 0 ||
            pyreTicks % 8 === 0 ||
            /light|need-pyre|logs-on|remains-on/.test(String(step?.action))
          ) {
            stage = await getServerVarQuiet(page, 'morttonquest');
            console.log(
              `[quest-mortton] pyre tick=${pyreTicks} place=${pyrePlaceTicks} stage=${stage} sticky=${pyreWindowSticky} step=${JSON.stringify(step)}`
            );
            await thrashPoint(page, 'mortton-pyre-place', {
              stage: Number(stage),
              t: pyreTicks,
              place: pyrePlaceTicks,
              phase: 'place-light',
              sticky: pyreWindowSticky,
              logsExpect: logsWindowExpect,
              step
            });
            if (shot && pyrePlaceTicks % 40 === 0) await shot(`pyre-t${pyrePlaceTicks}`);
          }

          // Sticky only after remains land (bones window) or successful light thrash.
          // After logs-on-pyre alone we still need Loar remains — do not block hunt (c16).
          if (
            step?.ok &&
            (step?.action === 'remains-on-pyre' || step?.action === 'remains-on-pyre-early')
          ) {
            pyreWindowSticky = Math.max(pyreWindowSticky, 22);
            logsWindowExpect = 0; // remains path owns the window now
            console.log(
              `[quest-mortton] residual: pyre window sticky=${pyreWindowSticky} after ${step.action}`
            );
          }
          if (step?.ok && step?.action === 'logs-on-pyre') {
            // Product accepted logs (stage often 75 next); hold remake, go hunt remains.
            logsWindowExpect = Math.max(logsWindowExpect, 28);
            stage = await getServerVarQuiet(page, 'morttonquest');
            console.log(
              `[quest-mortton] residual: logs-on accepted stage=${stage} logsExpect=${logsWindowExpect}`
            );
            await page.waitForTimeout(900); // let loc_change land before remake/hunt thrash
            continue;
          }
          if (/light/.test(String(step?.action ?? '')) && step?.ok) {
            pyreWindowSticky = Math.max(pyreWindowSticky, 12);
          }
          // need-remains-on-logs / need-remains-before-logs: hunt next loop (do not remake)
          if (
            step?.action === 'need-remains-on-logs' ||
            step?.action === 'need-remains-before-logs'
          ) {
            if (step?.action === 'need-remains-on-logs') {
              logsWindowExpect = Math.max(logsWindowExpect, 12);
            }
            if (pyreTicks % 8 === 0) {
              console.log(`[quest-mortton] residual: ${step.action} → hunt Loar`);
            }
            await page.waitForTimeout(200);
            continue;
          }

          // cleanup11 gap: need-pyre-logs-replace was logged but never acted on → light-spam stall @75.
          // Product remake only (generic olive+logs; no give sacred oil / pyre logs / remains).
          // c17: skip remake while logsWindowExpect — client base lag after product logs-on.
          if (
            residualMode &&
            step?.action === 'need-pyre-logs-replace' &&
            logsWindowExpect > 0
          ) {
            if (pyreTicks % 5 === 0) {
              console.log(
                `[quest-mortton] residual: hold remake — logs window expect=${logsWindowExpect} (hunt remains)`
              );
            }
            await page.waitForTimeout(400);
            continue;
          }
          if (residualMode && step?.action === 'need-pyre-logs-replace') {
            remakePyreLogsTicks++;
            if (remakePyreLogsTicks % 5 === 1) {
              console.log(
                `[quest-mortton] residual: re-make pyre logs after clear_pyre t=${remakePyreLogsTicks}`,
                step
              );
            }
            const invR = await page.evaluate(() => {
              const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
              return {
                oil: inv.some(i => /sacred oil/i.test(String(i?.name ?? ''))),
                pyre: inv.some(i => /pyre logs/i.test(String(i?.name ?? ''))),
                olive: inv.some(i => /olive oil/i.test(String(i?.name ?? ''))),
                logs: inv.some(i => /^logs$/i.test(String(i?.name ?? ''))),
                names: inv.map(i => i?.name).filter(Boolean).slice(0, 14)
              };
            });
            if (invR.pyre) {
              remakePyreLogsTicks = 0;
              await page.waitForTimeout(300);
              continue;
            }
            if (!invR.logs || !invR.olive) {
              await giveItems(page, [
                ['logs', 4],
                ['oliveoil4', 2],
                ['tinderbox', 1]
              ]).catch(() => {});
            }
            if (!invR.oil) {
              // Temple pour path — patient: walk into courtyard; tele only if far + cooldown.
              // Do not bounce temple↔pyre every tick while remaking oil.
              await residualGo(FLAMTAER_COURTYARD, {
                walkRadius: 4,
                force: false,
                label: 'temple-remake-oil'
              });
              const sancR = Number(
                (await getServerVarQuiet(page, 'temple_sanctity').catch(() => 0)) ?? 0
              );
              const sancPR = Number(
                (await getServerVarQuiet(page, 'temple_sanctity_p').catch(() => 0)) ?? 0
              );
              const pour = await page.evaluate(
                async ({ altarWx, altarWz, center, sancP, sancRaw }) => {
                const a = globalThis.__lc377?.actions;
                const r = globalThis.__lc377?.reader;
                a?.continueDialog?.();
                a?.dismissModalMessage?.();
                a?.setSideTab?.(3);
                const locs = r?.locs?.({ maxDist: 16 }) ?? [];
                const inv = r?.inventory?.() ?? [];
                const isFlaming = n =>
                  /flaming/i.test(String(n ?? '')) && /altar/i.test(String(n ?? ''));
                const flaming =
                  locs.find(l => isFlaming(l?.name)) ||
                  (() => {
                    const at = r?.locAt?.(altarWx, altarWz);
                    return at && isFlaming(at.name) ? at : null;
                  })();
                const nofire = locs.find(
                  l =>
                    /^fire altar$/i.test(String(l?.name ?? '')) &&
                    !/broken|flaming/i.test(String(l?.name ?? ''))
                );
                const olive = inv.find(i => /olive oil/i.test(String(i?.name ?? '')));
                const tinder = inv.find(i => /tinderbox/i.test(String(i?.name ?? '')));
                const walls = locs.filter(
                  l =>
                    /wall/i.test(String(l?.name ?? '')) &&
                    (l.ops || []).some(o => /repair|reinforce/i.test(String(o ?? '')))
                );
                const wall =
                  walls.find(l =>
                    (l.ops || []).some(o => /reinforce/i.test(String(o ?? '')))
                  ) || walls[0];
                const broken = locs.find(l =>
                  /broken/i.test(String(l?.name ?? '')) && /altar|fire/i.test(String(l?.name ?? ''))
                );
                // Light 10%/300; pour thrash 20%/600 (product olive is 10%; serum 20%)
              const needSanc = sancP < 20 || sancRaw < 600;
                // c14: sanc already 14%/426 but thrash stuck on Temple wall — only reinforce when low sanc
                if (needSanc && wall) {
                  const wx = wall.wx ?? wall.x;
                  const wz = wall.wz ?? wall.z;
                  let sx = wx;
                  let sz = wz;
                  if (wx < center.x) sx = wx + 1;
                  else if (wx > center.x) sx = wx - 1;
                  if (wz < center.z) sz = wz + 1;
                  else if (wz > center.z) sz = wz - 1;
                  const me = r?.worldTile?.();
                  if (me && Math.max(Math.abs(me.x - sx), Math.abs(me.z - sz)) > 1) {
                    a?.walkWorld?.(sx, sz);
                    return { action: 'walk-wall-sanc', sancP };
                  }
                  a?.opLocAt?.(wx, wz, 'reinforce') ||
                    a?.opLocAt?.(wx, wz, 'repair') ||
                    a?.opLoc?.(wall.name, 'reinforce');
                  return { action: 'reinforce-sanc', wall: wall.name, sancP };
                }
                if (flaming && olive && !needSanc) {
                  const snap =
                    flaming.typecode != null
                      ? {
                          typecode: flaming.typecode | 0,
                          lx: flaming.lx | 0,
                          lz: flaming.lz | 0,
                          x: flaming.x,
                          z: flaming.z,
                          name: flaming.name
                        }
                      : null;
                  const ok = snap
                    ? a?.useHeldOnLoc?.(
                        { id: olive.id, slot: olive.slot, comId: olive.comId },
                        snap,
                        14
                      )
                    : a?.useHeldOnLoc?.(olive.name, flaming.name, 14);
                  return { action: 'pour-olive', ok: !!ok, name: flaming.name };
                }
                // Prefer locAt altar tile when reader miss (player near pyre then tele in)
                const atAltar = r?.locAt?.(altarWx, altarWz);
                if (atAltar && /flaming/i.test(String(atAltar.name ?? '')) && olive && !needSanc) {
                  const snap =
                    atAltar.typecode != null
                      ? {
                          typecode: atAltar.typecode | 0,
                          lx: atAltar.lx | 0,
                          lz: atAltar.lz | 0,
                          x: atAltar.x ?? altarWx,
                          z: atAltar.z ?? altarWz,
                          name: atAltar.name
                        }
                      : null;
                  const ok = snap
                    ? a?.useHeldOnLoc?.(
                        { id: olive.id, slot: olive.slot, comId: olive.comId },
                        snap,
                        14
                      )
                    : a?.useHeldOnLoc?.(olive.name, atAltar.name, 14);
                  return { action: 'pour-olive-at', ok: !!ok, name: atAltar.name };
                }
                if (nofire && tinder && !needSanc) {
                  a?.useHeldOnLoc?.(tinder.name, nofire.name, 14) ||
                    a?.opLocAt?.(nofire.x ?? nofire.wx, nofire.z ?? nofire.wz, 'light') ||
                    a?.opLocAt?.(altarWx, altarWz, 'light');
                  return { action: 'light-altar', name: nofire.name };
                }
                if (atAltar && !/flaming|broken/i.test(String(atAltar.name ?? '')) && tinder && !needSanc) {
                  a?.useHeldOnLoc?.(tinder.name, atAltar.name, 14) ||
                    a?.opLocAt?.(altarWx, altarWz, 'light');
                  return { action: 'light-altar-at', name: atAltar.name };
                }
                if (broken) {
                  const wx = broken.wx ?? broken.x;
                  const wz = broken.wz ?? broken.z;
                  a?.opLocAt?.(wx, wz, 'repair') ||
                    a?.opLocAt?.(wx, wz, 'reinforce') ||
                    a?.opLoc?.(broken.name, 'repair');
                  return { action: 'fix-broken-altar', name: broken.name };
                }
                // Walk to altar center if nothing found in range
                const me = r?.worldTile?.();
                if (
                  me &&
                  Math.max(Math.abs(me.x - altarWx), Math.abs(me.z - altarWz)) > 2
                ) {
                  a?.walkWorld?.(altarWx, altarWz - 1);
                  return {
                    action: 'walk-altar',
                    me,
                    altars: locs
                      .filter(l => /altar/i.test(String(l?.name ?? '')))
                      .map(l => l?.name)
                      .slice(0, 6)
                  };
                }
                // Do NOT reinforce walls when sanc already ok (c14 infinite Temple wall)
                return {
                  action: 'idle-remake',
                  needSanc,
                  sancP,
                  sancRaw,
                  altarNames: locs
                    .filter(l => /altar|fire/i.test(String(l?.name ?? '')))
                    .map(l => l?.name)
                    .slice(0, 8),
                  chat: (r?.chat?.(4) ?? []).map(l => String(l?.text ?? l ?? ''))
                };
              }, {
                altarWx: FLAMTAER_ALTAR.x,
                altarWz: FLAMTAER_ALTAR.z,
                center: TEMPLE_CENTER,
                sancP: sancPR,
                sancRaw: sancR
              });
              if (remakePyreLogsTicks % 8 === 0) {
                console.log('[quest-mortton] residual remake-for-pyre-logs oil step', pour);
              }
            } else {
              // Have sacred oil → oil on normal logs
              const made = await page.evaluate(async () => {
                const a = globalThis.__lc377?.actions;
                const r = globalThis.__lc377?.reader;
                a?.setSideTab?.(3);
                const inv = r?.inventory?.() ?? [];
                const oil = inv.find(i => /sacred oil/i.test(String(i?.name ?? '')));
                const logs = inv.find(i => /^logs$/i.test(String(i?.name ?? '')));
                if (!oil || !logs) {
                  return { ok: false, reason: 'need oil+logs', names: inv.map(i => i?.name) };
                }
                const ok =
                  a?.useHeldOnHeld?.(
                    { id: oil.id, slot: oil.slot, comId: oil.comId },
                    { id: logs.id, slot: logs.slot, comId: logs.comId }
                  ) || a?.useHeldOnHeld?.(oil.name, logs.name);
                await new Promise(res => setTimeout(res, 800));
                const inv2 = r?.inventory?.() ?? [];
                return {
                  ok: !!ok,
                  hasPyre: inv2.some(i => /pyre logs/i.test(String(i?.name ?? ''))),
                  chat: (r?.chat?.(6) ?? []).map(l => String(l?.text ?? l ?? ''))
                };
              });
              if (remakePyreLogsTicks % 4 === 0 || made?.hasPyre) {
                console.log('[quest-mortton] residual remake oil-on-logs', made);
              }
              if (made?.hasPyre) remakePyreLogsTicks = 0;
            }
            if (remakePyreLogsTicks >= 120) {
              fail(
                `RESIDUAL cannot re-make pyre logs after clear_pyre (${remakePyreLogsTicks} ticks; stage=${stage}). last=${JSON.stringify(step)}`
              );
            }
            // Do not burn placeTicks budget on remake thrash
            pyrePlaceTicks = Math.max(0, pyrePlaceTicks - 1);
            await page.waitForTimeout(500);
            continue;
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
          // Multi-tick light needs settle; remains/logs need a beat (49t window is real)
          const settle =
            /light/.test(String(step?.action ?? ''))
              ? 900
              : step?.action === 'remains-on-pyre' || step?.action === 'logs-on-pyre'
                ? 750
                : 400;
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
    ['mort_serum3', 4]
  ]);
  await seedLoarCombatKit(page);

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
  await equipLoarKit(page);

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
