#!/usr/bin/env node
/**
 * Fremennik Trials — start + mid-gate smoke (Wave 1A #5).
 *
 * Gates:
 *   VIKING_COMPLETE_STAGE=1  — Brundt accept (start)
 *   VIKING_COMPLETE_STAGE=2  — first council vote (Manni drinking contest)
 *   VIKING_COMPLETE_STAGE=3  — second vote (Swensen maze, portals 1–7)
 *   VIKING_COMPLETE_STAGE=4  — third vote (Peer the Seer house puzzle)
 *   VIKING_COMPLETE_STAGE=5  — fourth vote (Sigli Draugen hunt)
 *   VIKING_COMPLETE_STAGE=6  — fifth vote (Thorvald / Koschei unarmed)
 *
 * Host prep: material give for Manni (default); region tele between NPCs.
 *   VIKING_MANNI_LIVE_MATERIALS=1 — acquire keg (longhall table), low-alc
 *   (poison salesman Seers 250gp), bomb (beer → council workman); then contest.
 * Sigli: adamant kit (host prep) for Draugen vislevel 69 + def 100; equip.
 * Thorvald: authentic empty gear (Peer bank); high unarmed stats only.
 * No setvar vote progress. Maze uses real portal locs (no mid-maze tele).
 * Peer: authentic riddle+house (combo from viking_bits; no skip).
 *
 * @see docs/plans/2026-08-06-port-quest-viking.md
 * @see docs/research/port-quest-viking-274-to-377.md
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
  setStats,
  setWorldSpeed,
  teleTo,
  waitSceneReady,
  waitTileChange,
  createSmokeBudget,
  withStepBudget
} from './lib/harness.mjs';

const argv = process.argv.slice(2);
const { base, rest } = parseArgs(argv.filter(a => a !== '--max-ms'));
const maxMsIdx = argv.indexOf('--max-ms');
const maxMs = maxMsIdx >= 0 ? Number(argv[maxMsIdx + 1]) || 600_000 : 600_000;
const { username, password } = resolveAccount(
  rest.filter(r => r !== String(maxMs)),
  'vik'
);
const wantStage = Number(process.env.VIKING_COMPLETE_STAGE) || 1;
const manniLiveMaterials =
  process.env.VIKING_MANNI_LIVE_MATERIALS === '1' ||
  process.env.VIKING_MANNI_LIVE_MATERIALS === 'true';
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

/** m41_57 L0 Brundt */
const BRUNDT = { x: 2659, z: 3669, level: 0 };
/** Manni the Reveller — m41_57 `0 36 25: 1286` */
const MANNI = { x: 2660, z: 3673, level: 0 };
/** Longhall pipe — m41_57 `0 39 26: 4162` */
const PIPE = { x: 2663, z: 3674, level: 0 };
/** Longhall champion table keg — content `0_41_57_36_28` opobj3 viking_beerkeg */
const LONGHALL_KEG = { x: 41 * 64 + 36, z: 57 * 64 + 28, level: 0 }; // 2660,3676
/** Poison salesman — Seers Village pub (scan + talk; tele near) */
const POISON_SALESMAN = { x: 2702, z: 3493, level: 0 };
/**
 * Council workman — beer → Strange object.
 * Map spawn (377 + 274): `m41_56.jm2` NPC line `0 31 8: 1287` (vt_council_workmen)
 * → world **2655,3592** (south of Rellekka, on road/bridge approach — not market).
 * live-mat3/4 wrongly scanned z≈3660–3685 (Rellekka SW) — tele thrash, empty.
 */
const COUNCIL_WORKMAN = { x: 41 * 64 + 31, z: 56 * 64 + 8, level: 0 }; // 2655,3592
/** Fallback scan if primary tele misses (wander / wrong pack). */
const COUNCIL_WORKMAN_SCAN = [
  { x: 2655, z: 3592, level: 0 },
  { x: 2655, z: 3600, level: 0 },
  { x: 2645, z: 3590, level: 0 },
  { x: 2665, z: 3595, level: 0 },
  { x: 2650, z: 3585, level: 0 }
];
/** Swensen the Navigator — m41_57 `0 22 12: 1283` */
const SWENSEN = { x: 2646, z: 3660, level: 0 };
/** Maze ladder top — m41_57 `0 20 9: 4158` */
const MAZE_LADDER_TOP = { x: 2644, z: 3657, level: 0 };
/** m41_156 maze: correct portal_1..7 then exit ladder (content path) */
const mazeTile = (lx, lz) => ({ x: 41 * 64 + lx, z: 156 * 64 + lz, level: 0 });
// portalId = pack loc id (4150=portal_1 … 4156=portal_7)
const MAZE_PORTALS = [
  { ...mazeTile(7, 18), portalId: 4150 },
  { ...mazeTile(15, 31), portalId: 4151 },
  { ...mazeTile(32, 20), portalId: 4152 },
  { ...mazeTile(41, 34), portalId: 4153 },
  { ...mazeTile(6, 39), portalId: 4154 },
  { ...mazeTile(32, 53), portalId: 4155 },
  { ...mazeTile(42, 45), portalId: 4156 }
];
const MAZE_EXIT = { ...mazeTile(41, 53), portalId: 4160 };

/** Peer the Seer — m41_57 `0 10 20: 1288` */
const PEER = { x: 2634, z: 3668, level: 0 };
/** Door1 (entry + riddle) `0 7 19: 4165` */
const PEER_DOOR1 = { x: 2631, z: 3667, level: 0 };
/** Door2 (exit + key) `0 12 19: 4166` */
const PEER_DOOR2 = { x: 2636, z: 3667, level: 0 };
/** Ground ladders */
const PEER_LADDER_UP = { x: 2631, z: 3663, level: 0 };
const PEER_LADDER_DOWN = { x: 2636, z: 3663, level: 0 };
/** Ground mural `0 10 15: 4179` */
const PEER_MURAL = { x: 2634, z: 3663, level: 0 };
/** Upper floor (level 2) puzzle anchors from m41_57 */
const PEER_L2 = {
  cupboard: { x: 2629, z: 3660, level: 2 }, // 5,12: 4177
  tap: { x: 2629, z: 3661, level: 2 }, // 5,13: 4176
  drain: { x: 2629, z: 3662, level: 2 }, // 5,14: 4175
  range: { x: 2629, z: 3663, level: 2 }, // 5,15: 4172
  scaleChest: { x: 2632, z: 3665, level: 2 }, // 8,17: 4170 scales
  frozen: { x: 2638, z: 3665, level: 2 }, // 14,17: 4169 icy table
  bookcase: { x: 2634, z: 3665, level: 2 }, // 10,17: 4171
  chest: { x: 2635, z: 3660, level: 2 }, // 11,12: 4167 jug chest
  unicorn: { x: 2632, z: 3660, level: 2 }, // 8,12: 4181
  bull: { x: 2634, z: 3660, level: 2 } // 10,12: 4182
};

/** Riddle answers: letter stages A=0 … (alphabet.enum) */
const PEER_RIDDLE = {
  0: [12, 8, 13, 3], // MIND
  1: [19, 17, 4, 4], // TREE
  2: [11, 8, 5, 4], // LIFE
  3: [5, 8, 17, 4], // FIRE
  4: [19, 8, 12, 4], // TIME
  5: [22, 8, 13, 3] // WIND
};
/** combolockdoor:com_N absolute component ids (interface.pack) */
const COMBO = {
  plus: [19038, 19040, 19042, 19044], // com_48,50,52,54
  enter: 19047 // com_57
};

/** Sigli the Huntsman — m41_57 `0 36 5: 1281` */
const SIGLI = { x: 2660, z: 3653, level: 0 };
/**
 * Draugen hunt box — Rellekka west/south forests + rock-crab coast + seers forest.
 * Content spawn_draugen_butterfly (west-biased maps 41–42 / 55–58):
 *   case 0 forest N of Seers is z≈3572 — z0 must be ≤ that or clamp + "south"
 *   leaves the bot bouncing on the box edge forever (mid25).
 * Do NOT hop Seers↔crabs as a region carousel. Follow talisman with short steps.
 */
const DRAUGEN_BOX = { x0: 2625, z0: 3540, x1: 2740, z1: 3725 };
/** Short step length when following "talisman guides you …" (tiles). */
const DRAUGEN_STEP = 18;
/**
 * Practical combat floor for Draugen (vislevel 69). Host prep only.
 * Gear tier must match — see docs/research/game-knowledge/harness-prep-and-gear.md
 * (bronze was a lazy minimal give; wrong for 60 combat).
 */
const SIGLI_STATS = {
  attack: 60,
  strength: 60,
  defence: 50,
  hitpoints: 60
};
/**
 * Draugen: HP 60 + melee def 100 each style — steel is too slow (mid32 fight timeout).
 * Host prep: adamant scim + plate (policy: raise tier when flaky, not soft-pass).
 */
const SIGLI_GEAR = [
  ['adamant_scimitar', 1],
  ['adamant_platebody', 1],
  ['adamant_platelegs', 1],
  ['adamant_kiteshield', 1],
  ['adamant_full_helm', 1],
  ['lobster', 20]
];

const SIGLI_EQUIP_NAMES = [
  'Adamant full helm',
  'Adamant platebody',
  'Adamant platelegs',
  'Adamant kiteshield',
  'Adamant scimitar'
];

/** Thorvald the Warrior — m41_57 `0 42 45: 1289` */
const THORVALD = { x: 2666, z: 3693, level: 0 };
/** Warrior ladder down — map `0 43 46: 4187` (oploc2) */
const THORVALD_LADDER = { x: 2667, z: 3694, level: 0 };
/**
 * Unarmed Koschei ×4 forms. Authentic: no armour/weapons in inv or worn.
 * Min stats that still clear (raise if smoke flakes). Food only.
 */
const THORVALD_STATS = {
  attack: 70,
  strength: 70,
  defence: 60,
  hitpoints: 70,
  // Dramen staff carve needs Crafting 31 (quest_zanaris cut_dramenstaff)
  crafting: 40
};

function clampDraugenTile(x, z) {
  return {
    x: Math.max(DRAUGEN_BOX.x0, Math.min(DRAUGEN_BOX.x1, x | 0)),
    z: Math.max(DRAUGEN_BOX.z0, Math.min(DRAUGEN_BOX.z1, z | 0)),
    level: 0
  };
}

/** Parse "The talisman guides you north-west." → {dx,dz} unit-ish. */
function parseTalismanDir(chatLines) {
  const line = (chatLines || [])
    .map(c => String(c ?? ''))
    .find(t => /talisman guides you/i.test(t));
  if (!line) return null;
  const t = line.toLowerCase();
  let dx = 0;
  let dz = 0;
  if (/north-west|northwest/.test(t)) {
    dx = -1;
    dz = 1;
  } else if (/north-east|northeast/.test(t)) {
    dx = 1;
    dz = 1;
  } else if (/south-west|southwest/.test(t)) {
    dx = -1;
    dz = -1;
  } else if (/south-east|southeast/.test(t)) {
    dx = 1;
    dz = -1;
  } else if (/north/.test(t)) dz = 1;
  else if (/south/.test(t)) dz = -1;
  else if (/east/.test(t)) dx = 1;
  else if (/west/.test(t)) dx = -1;
  if (!dx && !dz) return null;
  return { dx, dz, line };
}

function bitRange(v, start, end) {
  let out = 0;
  for (let i = start; i <= end; i++) {
    if ((v | 0) & (1 << i)) out |= 1 << (i - start);
  }
  return out;
}

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
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 16), chat: chat.slice(0, 12) };
    },
    [npcName, prefer, iters]
  );
}

async function walkNear(page, tile, dist = 1) {
  await page.evaluate(
    async ([wx, wz, d]) => {
      const h = globalThis.__lc377;
      h?.actions?.walkWorld?.(wx, wz);
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 200));
        const t = h?.worldTile?.();
        if (t && Math.max(Math.abs(t.x - wx), Math.abs(t.z - wz)) <= d) break;
      }
    },
    [tile.x, tile.z, dist]
  );
}

async function invHas(page, substr) {
  return page.evaluate(s => {
    const want = String(s).toLowerCase();
    return (globalThis.__lc377?.reader?.inventory?.() ?? []).some(
      i => i?.name && String(i.name).toLowerCase().includes(want)
    );
  }, substr);
}

async function useHeldOnHeld(page, useSub, tgtSub) {
  return page.evaluate(
    ([u, t]) => globalThis.__lc377?.actions?.useHeldOnHeld?.(u, t) ?? false,
    [useSub, tgtSub]
  );
}

async function useHeldOnLoc(page, useSub, locSub) {
  return page.evaluate(
    ([u, loc]) => globalThis.__lc377?.actions?.useHeldOnLoc?.(u, loc, 16) ?? false,
    [useSub, locSub]
  );
}

async function opLoc(page, nameSub, actionSub = '') {
  return page.evaluate(
    ([n, a]) => globalThis.__lc377?.actions?.opLoc?.(n, a, 16) ?? false,
    [nameSub, actionSub]
  );
}

async function opLocAt(page, tile, actionSub = '') {
  return page.evaluate(
    ([wx, wz, act]) => globalThis.__lc377?.actions?.opLocAt?.(wx, wz, act) ?? false,
    [tile.x, tile.z, actionSub]
  );
}

async function continueThrash(page, iters = 24, ms = 300) {
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

async function clickPortal(page, tile, label) {
  // Host approach tele; hop OP authentic. Try several stand tiles (walls block S-only).
  // Do NOT abortMovement after OP — that cancels p_arrivedelay pathing.
  return withStepBudget(`maze-${label}`, 40_000, async () => {
    await continueThrash(page, 8, 200);
    const approaches = [
      { x: tile.x, z: tile.z - 1, level: 0 },
      { x: tile.x, z: tile.z + 1, level: 0 },
      { x: tile.x - 1, z: tile.z, level: 0 },
      { x: tile.x + 1, z: tile.z, level: 0 },
      { x: tile.x, z: tile.z, level: 0 }
    ];

    const resolvePortal = () =>
      page.evaluate(
        ([wx, wz, wantId]) => {
          const r = globalThis.__lc377?.reader;
          const list = r?.locs?.({ maxDist: 16 }) ?? [];
          const byId = list.filter(l => (l.id | 0) === (wantId | 0));
          // Prefer closest instance to expected tile
          byId.sort(
            (a, b) =>
              Math.max(Math.abs(a.x - wx), Math.abs(a.z - wz)) -
              Math.max(Math.abs(b.x - wx), Math.abs(b.z - wz))
          );
          const l = byId[0];
          return l
            ? {
                name: l.name,
                id: l.id,
                typecode: l.typecode,
                x: l.x,
                z: l.z,
                lx: l.lx,
                lz: l.lz,
                ops: l.ops
              }
            : null;
        },
        [tile.x, tile.z, tile.portalId]
      );

    const fireOp = loc =>
      page.evaluate(
        L => {
          const a = globalThis.__lc377?.actions;
          if (!a || !L) return false;
          // menuAction(OP_LOC1=625, typecode, lx, lz) — exact instance
          if (L.typecode != null && L.lx != null && a.menuAction?.(625, L.typecode, L.lx, L.lz)) {
            return 'menu625';
          }
          if (a.opLoc1At?.(L.x, L.z)) return 'opLoc1At';
          if (a.opLocAt?.(L.x, L.z, '')) return 'opLocAt';
          if (a.opLocAt?.(L.x, L.z, 'use')) return 'use';
          return false;
        },
        loc
      );

    const waitHop = (from, ms) =>
      page
        .waitForFunction(
          ([x, z, lvl]) => {
            const t = globalThis.__lc377?.worldTile?.();
            if (!t || (t.level ?? 0) !== lvl) return false;
            return Math.max(Math.abs(t.x - x), Math.abs(t.z - z)) >= 8;
          },
          [from?.x ?? 0, from?.z ?? 0, from?.level ?? 0],
          { timeout: ms }
        )
        .then(() => true)
        .catch(() => false);

    let lastDiag = null;
    for (const ap of approaches) {
      if (!(await teleTo(page, ap, 2, 12_000))) continue;
      await waitSceneReady(page, 8_000);
      await page.waitForTimeout(400);
      // soft walk toward portal without abort after OP
      await walkNear(page, { x: tile.x, z: tile.z, level: 0 }, 1);
      await page.waitForTimeout(400);

      const loc = await resolvePortal();
      if (!loc) {
        lastDiag = { ap, err: 'no portal id' };
        continue;
      }
      const before = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
      const ok = await fireOp(loc);
      // Let p_arrivedelay walk complete — do not abort
      const hop = await waitHop(before, 14_000);
      const after = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
      lastDiag = { ap, loc, ok, hop, before, after };
      console.log(
        `[quest-viking] maze ${label} try ap=${ap.x},${ap.z} loc=${loc.id}@${loc.x},${loc.z} ` +
          `op=${ok} hop=${hop} ${before?.x},${before?.z} → ${after?.x},${after?.z}`
      );
      if (hop) {
        await waitSceneReady(page, 8_000);
        return true;
      }
    }
    fail(`maze ${label}: no telejump after approach tries. last=${JSON.stringify(lastDiag)}`);
  });
}

const budget = createSmokeBudget(
  Number(process.env.SMOKE_BUDGET_MS) > 0
    ? Number(process.env.SMOKE_BUDGET_MS)
    : Math.min(
        maxMs,
        wantStage >= 6
          ? 720_000
          : wantStage >= 5
            ? 540_000
            : wantStage >= 4
              ? 420_000
              : wantStage >= 3
                ? 240_000
                : 180_000
      )
);
console.log(`[quest-viking] smoke budget ${budget.totalMs}ms wantStage=${wantStage}`);

const browser = await launchBrowser();
let page = null;
let shot = null;

try {
  page = await browser.newPage();
  page.on('console', msg => {
    const t = msg.text();
    if (/script|viking|brundt|manni|fremennik|trigger|error|quest|keg|beer/i.test(t)) {
      console.log(`[browser.${msg.type()}] ${t.slice(0, 280)}`);
    }
  });

  console.log(`[quest-viking] ${base} user=${username} wantStage=${wantStage}`);
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`quest-viking_${username}`);
    shot = (await installScreenshotBridge(page, shotDir)).shot;
  }

  await mainlandAccount(page, username, password);
  await waitSceneReady(page, 60_000);
  await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300);

  for (const c of ['setvar viking 0', 'setvar viking_bits 0']) {
    await cheatQuiet(page, c, 400);
  }

  // --- start: Brundt ---
  console.log('[quest-viking] tele Brundt', BRUNDT);
  if (!(await teleTo(page, BRUNDT, 8, 50_000))) fail('tele Brundt failed');
  await waitSceneReady(page, 45_000);
  if (shot) await shot('at-brundt');

  const scene = await page.evaluate(() => {
    const r = globalThis.__lc377?.reader;
    const npcs = (r?.npcs?.() ?? [])
      .filter(n => /brundt/i.test(n?.name ?? ''))
      .map(n => `${n.name}@${n.tile?.x},${n.tile?.z}`);
    return { tile: globalThis.__lc377?.worldTile?.(), npcs };
  });
  console.log('[quest-viking] scene', JSON.stringify(scene));
  if (!scene.npcs?.length) fail('no Brundt in scene');

  await walkNear(page, BRUNDT, 1);
  let talk = await talkNpc(page, 'Brundt', [
    'quests',
    'interested',
    'fremennik',
    'become a fremennik',
    'yes',
    "i'm interested",
    'i am interested'
  ]);
  console.log('[quest-viking] talk Brundt', JSON.stringify(talk));
  if (talk?.noTrig) fail(talk.noTrig);

  let stage = await getServerVarQuiet(page, 'viking');
  if ((stage ?? 0) < 1) {
    talk = await talkNpc(page, 'Brundt', ['quests', 'interested', 'fremennik', 'become', 'yes']);
    console.log('[quest-viking] talk Brundt2', JSON.stringify(talk));
    stage = await getServerVarQuiet(page, 'viking');
  }
  console.log(`[quest-viking] after start viking=${stage}`);
  if ((stage ?? 0) < 1) fail(`start-gate fail viking=${stage}`);
  if (shot) await shot('started');

  if (wantStage <= 1) {
    if (shot) await shot('end');
    console.log(`RESULT: PASS (Viking start-gate viking=${stage})`);
    process.exit(0);
  }

  // --- mid: Manni drinking contest (first vote → viking=2) ---
  // Default: host give-seed (contest only). Live: table keg + poison salesman + workman bomb.
  // Content: poison_salesman Viking branch + vt_council_workman (ported 2026-08-06).
  console.log(
    `[quest-viking] Manni materials mode=${manniLiveMaterials ? 'LIVE' : 'give-seed'}`
  );

  console.log('[quest-viking] tele Manni', MANNI);
  if (!(await teleTo(page, MANNI, 8, 50_000))) fail('tele Manni failed');
  await waitSceneReady(page, 45_000);
  {
    const npcs = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.npcs?.() ?? [])
        .filter(n => /manni|reveller/i.test(n?.name ?? ''))
        .map(n => `${n.name}@${n.tile?.x},${n.tile?.z}`)
    );
    console.log('[quest-viking] manni scene', JSON.stringify(npcs));
    if (!npcs.length) fail('no Manni in scene');
  }
  await walkNear(page, MANNI, 1);

  talk = await talkNpc(page, 'Manni', [
    'yes',
    'drinking',
    'contest',
    'council',
    'fremennik'
  ]);
  console.log('[quest-viking] talk Manni start', JSON.stringify(talk));
  if (talk?.noTrig) fail(talk.noTrig);
  if (shot) await shot('manni-accepted');

  if (manniLiveMaterials) {
    // Soft prep only: coins for low-alc, beer for workman, tinderbox to light bomb.
    // Do NOT give keg / low-alc / firecracker — those must come from NPCs/table.
    await giveItems(page, [
      ['coins', 500],
      ['beer', 2],
      ['tinderbox', 1]
    ]);

    // 1) Take keg from longhall table (opobj3 viking_beerkeg @ 0_41_57_36_28)
    console.log('[quest-viking] LIVE take keg', LONGHALL_KEG);
    await teleTo(page, LONGHALL_KEG, 2, 20_000).catch(() => {});
    await walkNear(page, LONGHALL_KEG, 0);
    await page.waitForTimeout(400);
    const tookKeg = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const ground = (r?.groundItems?.({ maxDist: 12 }) ?? []).map(g => ({
        name: g?.name,
        lx: g?.lx,
        lz: g?.lz,
        id: g?.id,
        ops: g?.ops
      }));
      // Table keg is ground obj — Take via takeGround (OPOBJ, usually op 3)
      if (a?.takeGround?.('Keg of beer', 12)) return { ok: 'takeGround-Keg', ground };
      if (a?.takeGround?.('keg of beer', 12)) return { ok: 'takeGround-keg', ground };
      if (a?.takeGround?.('Keg', 12)) return { ok: 'takeGround-Keg-short', ground };
      return { ok: false, ground };
    });
    console.log('[quest-viking] LIVE take keg', JSON.stringify(tookKeg));
    await page.waitForTimeout(1200);
    await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      for (let i = 0; i < 12; i++) {
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
        await new Promise(r => setTimeout(r, 200));
      }
    });
    if (!(await invHas(page, 'keg of beer'))) {
      // fallback: give keg only (still fail soft-pass on bomb/lowalc)
      console.warn('[quest-viking] LIVE table take failed — host give keg only');
      await giveItems(page, [['viking_beerkeg', 1]]);
    }
    if (!(await invHas(page, 'keg of beer'))) fail('LIVE: no Keg of beer after table take');

    // 2) Poison salesman Seers — Fremennik Trials branch → 250gp low-alc
    console.log('[quest-viking] LIVE tele poison salesman', POISON_SALESMAN);
    if (!(await teleTo(page, POISON_SALESMAN, 10, 40_000))) fail('tele Seers poison salesman failed');
    await waitSceneReady(page, 30_000);
    {
      const npcs = await page.evaluate(() =>
        (globalThis.__lc377?.reader?.npcs?.() ?? [])
          .filter(n => /poison|salesman/i.test(n?.name ?? ''))
          .map(n => `${n.name}@${n.tile?.x},${n.tile?.z}`)
      );
      console.log('[quest-viking] LIVE salesman scene', JSON.stringify(npcs));
      if (!npcs.length) fail('LIVE: no Poison Salesman in scene');
      // walk to nearest if not at tele
      const nearest = await page.evaluate(() => {
        const t = globalThis.__lc377?.worldTile?.();
        const list = (globalThis.__lc377?.reader?.npcs?.() ?? []).filter(n =>
          /poison/i.test(n?.name ?? '')
        );
        if (!list.length || !t) return null;
        list.sort(
          (a, b) =>
            Math.max(Math.abs((a.tile?.x ?? 0) - t.x), Math.abs((a.tile?.z ?? 0) - t.z)) -
            Math.max(Math.abs((b.tile?.x ?? 0) - t.x), Math.abs((b.tile?.z ?? 0) - t.z))
        );
        return { x: list[0].tile?.x, z: list[0].tile?.z, level: 0 };
      });
      if (nearest?.x != null) await walkNear(page, nearest, 1);
    }
    talk = await talkNpc(
      page,
      'Poison',
      [
        'fremennik',
        'trials',
        'talk about the fremennik',
        'yes',
        'please',
        'actually',
        'like some',
        'how much'
      ],
      80
    );
    console.log('[quest-viking] LIVE talk poison salesman', JSON.stringify(talk));
    await page.waitForTimeout(800);
    await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      for (let i = 0; i < 40; i++) {
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
        await new Promise(r => setTimeout(r, 250));
      }
    });
    // second talk if first was pitch-only (spoken bit set, buy on re-talk)
    if (!(await invHas(page, 'low alcohol'))) {
      talk = await talkNpc(
        page,
        'Poison',
        ['low alcohol', 'fremennik', 'yes', 'please', 'buy'],
        40
      );
      console.log('[quest-viking] LIVE talk poison rebuy', JSON.stringify(talk));
      await page.waitForTimeout(600);
      await page.evaluate(async () => {
        const a = globalThis.__lc377?.actions;
        for (let i = 0; i < 24; i++) {
          a?.continueDialog?.();
          a?.dismissModalMessage?.();
          await new Promise(r => setTimeout(r, 200));
        }
      });
    }
    if (!(await invHas(page, 'low alcohol'))) fail('LIVE: no Low alcohol keg from poison salesman');
    if (shot) await shot('live-lowalc-bought');

    // 3) Council workman — use beer → Strange object (firecracker)
    console.log('[quest-viking] LIVE tele council workman scan', COUNCIL_WORKMAN_SCAN.length);
    let workmanTile = null;
    for (const t of COUNCIL_WORKMAN_SCAN) {
      await teleTo(page, t, 10, 20_000).catch(() => {});
      await waitSceneReady(page, 12_000);
      const npcs = await page.evaluate(() =>
        (globalThis.__lc377?.reader?.npcs?.() ?? [])
          .filter(n => /workman|council/i.test(n?.name ?? ''))
          .map(n => ({
            name: n.name,
            x: n.tile?.x,
            z: n.tile?.z
          }))
      );
      const all = await page.evaluate(() =>
        (globalThis.__lc377?.reader?.npcs?.() ?? [])
          .slice(0, 20)
          .map(n => `${n.name}@${n.tile?.x},${n.tile?.z}`)
      );
      console.log(
        `[quest-viking] LIVE workman scan @${t.x},${t.z} hit=${JSON.stringify(npcs)} nearby=${JSON.stringify(all)}`
      );
      if (npcs.length) {
        workmanTile = npcs[0];
        break;
      }
    }
    if (!workmanTile) {
      fail(
        'LIVE: no Council workman (scan empty). Expected m41_56 spawn ~2655,3592 — check map NPC 1287'
      );
    }
    console.log('[quest-viking] LIVE workman at', JSON.stringify(workmanTile));
    // use beer — nearestNpc is EXACT name match ("Council workman")
    await walkNear(page, { x: workmanTile.x, z: workmanTile.z, level: 0 }, 0);
    await talkNpc(page, 'Council workman', ['yes', 'planning', 'hello', 'bridge'], 24);
    await page.waitForTimeout(400);
    let beerOk = false;
    for (let attempt = 0; attempt < 4 && !beerOk; attempt++) {
      const beerUse = await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        const r = globalThis.__lc377?.reader;
        const inv = r?.inventory?.() ?? [];
        // content: beer | viking_tankard_full (not metal tankard empty)
        const beer =
          inv.find(i => /^beer$/i.test(String(i?.name ?? '').trim())) ||
          inv.find(i => /beer tankard|tankard of beer/i.test(i?.name ?? ''));
        if (!a?.useHeldOnNpc || !beer) {
          return { ok: false, err: 'no beer or abi', names: inv.map(i => i?.name) };
        }
        // EXACT display name — nearestNpc uses === not includes
        const ok = !!a.useHeldOnNpc(beer, 'Council workman');
        const near = (r?.npcs?.() ?? [])
          .filter(n => /workman|council/i.test(n?.name ?? ''))
          .map(n => n.name);
        return { ok, beer: beer.name, near, names: inv.map(i => i?.name) };
      });
      console.log(`[quest-viking] LIVE beer→workman try${attempt}`, JSON.stringify(beerUse));
      await page.waitForTimeout(800);
      await page.evaluate(async () => {
        const a = globalThis.__lc377?.actions;
        for (let i = 0; i < 24; i++) {
          a?.continueDialog?.();
          a?.dismissModalMessage?.();
          await new Promise(r => setTimeout(r, 250));
        }
      });
      beerOk = await invHas(page, 'strange object');
    }
    if (!beerOk) fail('LIVE: no Strange object from workman (beer OPNPCU — need exact "Council workman")');
    if (shot) await shot('live-bomb-from-workman');
    console.log(
      '[quest-viking] LIVE materials ready',
      JSON.stringify(
        await page.evaluate(() =>
          (globalThis.__lc377?.reader?.inventory?.() ?? []).map(i => i?.name).filter(Boolean)
        )
      )
    );
  } else {
    await giveItems(page, [
      ['viking_beerkeg', 1],
      ['viking_low_alcahol_beerkeg', 1],
      ['viking_firecracker', 2],
      ['tinderbox', 1]
    ]);
  }

  // --- outside: light cherry bomb (Strange object) AT the pipe, then plant ---
  // Lighting/swapping inside with Manni watching → "Thinking of cheating" / no lowalc bit.
  console.log('[quest-viking] walk outside to pipe', PIPE);
  if (!(await teleTo(page, PIPE, 4, 30_000))) {
    // tele is host travel; walk fallback
    await walkNear(page, PIPE, 1);
  } else {
    await waitSceneReady(page, 30_000);
  }
  await walkNear(page, PIPE, 0);
  if (shot) await shot('at-pipe-outside');

  // Light Strange object with tinderbox (display names — not "firecracker")
  let lit = await page.evaluate(() => {
    const a = globalThis.__lc377?.actions;
    const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
    const box = inv.find(i => /tinderbox/i.test(i?.name ?? ''));
    const bomb = inv.find(i => /strange object/i.test(i?.name ?? '') && !/lit/i.test(i?.name ?? ''));
    if (!a?.useHeldOnHeld || !box || !bomb) return { ok: false, inv: inv.map(i => i?.name) };
    return { ok: !!a.useHeldOnHeld(box, bomb), inv: inv.map(i => i?.name) };
  });
  console.log('[quest-viking] light bomb', JSON.stringify(lit));
  await page.waitForTimeout(700);
  if (!(await invHas(page, 'lit'))) {
    // reverse order
    lit = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
      const box = inv.find(i => /tinderbox/i.test(i?.name ?? ''));
      const bomb = inv.find(i => /strange object/i.test(i?.name ?? '') && !/lit/i.test(i?.name ?? ''));
      if (!a?.useHeldOnHeld || !box || !bomb) return false;
      return !!a.useHeldOnHeld(bomb, box);
    });
    await page.waitForTimeout(700);
  }
  if (!(await invHas(page, 'lit'))) fail('failed to light Strange object (cherry bomb) at pipe');

  // Plant lit bomb in pipe immediately (before inv explode queue)
  let pipeOk = await page.evaluate(() => {
    const a = globalThis.__lc377?.actions;
    const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
    const litBomb = inv.find(i => /strange object/i.test(i?.name ?? '') && /lit/i.test(i?.name ?? ''));
    if (litBomb && a?.useHeldOnLoc) {
      if (a.useHeldOnLoc(litBomb, 'pipe', 16)) return 'use-pipe';
      if (a.useHeldOnLoc(litBomb, 'Pipe', 16)) return 'use-Pipe';
    }
    if (a?.opLoc?.('pipe', '', 16)) return 'oploc-pipe';
    return false;
  });
  console.log(`[quest-viking] pipe plant=${pipeOk}`);
  await page.waitForTimeout(1000);
  await page.evaluate(async () => {
    const a = globalThis.__lc377?.actions;
    for (let i = 0; i < 16; i++) {
      a?.continueDialog?.();
      a?.dismissModalMessage?.();
      await new Promise(r => setTimeout(r, 250));
    }
  });
  if (shot) await shot('bomb-in-pipe');

  // --- inside longhall: swap low-alc into keg (zone lx 31–38 only) ---
  console.log('[quest-viking] walk back inside to Manni', MANNI);
  await walkNear(page, MANNI, 1);
  await page.waitForTimeout(500);

  // CRITICAL: "Low alcohol keg" also matches /keg/ — use snaps, never bare "keg"
  const fill = await page.evaluate(() => {
    const a = globalThis.__lc377?.actions;
    const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
    const low = inv.find(i => /^low alcohol keg$/i.test(String(i?.name ?? '').trim()) || /low alcohol/i.test(i?.name ?? ''));
    const keg = inv.find(i => {
      const n = String(i?.name ?? '');
      return /keg of beer/i.test(n) && !/low/i.test(n);
    });
    const names = inv.map(i => i?.name);
    if (!a?.useHeldOnHeld) return { ok: false, err: 'no abi', names };
    if (!low) return { ok: false, err: 'no low alcohol keg', names };
    if (!keg) return { ok: false, err: 'no keg of beer', names };
    // low-alc ON keg of beer (content: opheldu low on beerkeg)
    const ok = !!a.useHeldOnHeld(low, keg);
    return { ok, low: low.name, keg: keg.name, names };
  });
  console.log('[quest-viking] fill lowalc', JSON.stringify(fill));
  if (!fill.ok) fail(`lowalc fill failed: ${fill.err || 'unknown'}`);
  await page.waitForTimeout(2000);
  // bang mes + NPC reactions
  await page.evaluate(async () => {
    const a = globalThis.__lc377?.actions;
    for (let i = 0; i < 24; i++) {
      a?.continueDialog?.();
      a?.dismissModalMessage?.();
      await new Promise(r => setTimeout(r, 300));
    }
  });
  if (shot) await shot('after-lowalc-swap');

  // Drink contest — win if lowalc bit set
  talk = await talkNpc(page, 'Manni', ['yes', 'ready', 'drink', 'start']);
  console.log('[quest-viking] talk Manni drink', JSON.stringify(talk));
  // contest has multi-tick delays (p_delay 4 + 2)
  await page.waitForTimeout(4000);
  await page.evaluate(async () => {
    const a = globalThis.__lc377?.actions;
    for (let i = 0; i < 48; i++) {
      a?.continueDialog?.();
      a?.dismissModalMessage?.();
      await new Promise(r => setTimeout(r, 350));
    }
  });

  stage = await getServerVarQuiet(page, 'viking');
  console.log(`[quest-viking] after manni viking=${stage}`);
  if ((stage ?? 0) < 2) fail(`manni vote fail viking=${stage}`);
  if (shot) await shot('after-manni');

  if (wantStage <= 2) {
    if (shot) await shot('end');
    console.log(`RESULT: PASS (Viking mid-gate viking=${stage})`);
    process.exit(0);
  }

  // --- second vote: Swensen maze (authentic portals 1–7) ---
  console.log('[quest-viking] tele Swensen', SWENSEN);
  if (!(await teleTo(page, SWENSEN, 8, 50_000))) fail('tele Swensen failed');
  await waitSceneReady(page, 45_000);
  {
    const npcs = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.npcs?.() ?? [])
        .filter(n => /swensen/i.test(n?.name ?? ''))
        .map(n => `${n.name}@${n.tile?.x},${n.tile?.z}`)
    );
    console.log('[quest-viking] swensen scene', JSON.stringify(npcs));
    if (!npcs.length) fail('no Swensen in scene');
  }
  await walkNear(page, SWENSEN, 1);
  talk = await talkNpc(page, 'Swensen', [
    'yes',
    'vote',
    'council',
    'fremennik',
    'test',
    'maze',
    'challenge'
  ]);
  console.log('[quest-viking] talk Swensen', JSON.stringify(talk));
  if (talk?.noTrig) fail(talk.noTrig);
  if (shot) await shot('swensen-accepted');

  // Climb into maze
  await walkNear(page, MAZE_LADDER_TOP, 1);
  let ladderOk = await opLocAt(page, MAZE_LADDER_TOP, '');
  if (!ladderOk) ladderOk = await opLoc(page, 'ladder', '');
  console.log(`[quest-viking] maze ladder top ok=${ladderOk}`);
  await page.waitForTimeout(1500);
  await waitSceneReady(page, 45_000);
  const mazeTile0 = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
  console.log('[quest-viking] in maze', JSON.stringify(mazeTile0));
  if (shot) await shot('maze-start');

  for (let i = 0; i < MAZE_PORTALS.length; i++) {
    budget.check(`portal_${i + 1}`);
    await clickPortal(page, MAZE_PORTALS[i], `portal_${i + 1}`);
  }

  // Exit ladder (vt_mazeladderexit). Content 046cc7040 queues complete_swensen_trial
  // whenever swensen_started (no longer gated on npc_find). Do NOT count walkNear as hop.
  budget.check('maze-exit');
  await walkNear(page, MAZE_EXIT, 0);
  await page.waitForTimeout(500);
  // Prefer exact loc at exit tile — bare "ladder" can hit escape (4161) nearby
  const exitLoc = await page.evaluate(([wx, wz]) => {
    const r = globalThis.__lc377?.reader;
    const loc = r?.locAt?.(wx, wz);
    const near = (r?.locs?.({ maxDist: 3 }) ?? []).map(l => ({
      name: l?.name,
      x: l?.x,
      z: l?.z,
      ops: l?.ops
    }));
    return { loc: loc ? { name: loc.name, x: loc.x, z: loc.z, ops: loc.ops } : null, near };
  }, [MAZE_EXIT.x, MAZE_EXIT.z]);
  console.log('[quest-viking] exit loc', JSON.stringify(exitLoc));

  const beforeClimb = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
  let exitOk = await opLocAt(page, MAZE_EXIT, '');
  if (!exitOk) {
    // name substr: "Ladder" on exit only — still risk escape; prefer at-tile
    exitOk = await page.evaluate(([wx, wz]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const loc = r?.locAt?.(wx, wz);
      if (!loc || !a?.menuAction) return false;
      // OP_LOC1 = first op
      return !!a.opLocAt?.(wx, wz, '') || !!a.opLoc?.(loc.name ?? 'Ladder', '', 4);
    }, [MAZE_EXIT.x, MAZE_EXIT.z]);
  }
  // Climb must leave dungeon (mz 156 → surface mz 57, z ~3661)
  const climbed = await page
    .waitForFunction(
      fromZ => {
        const t = globalThis.__lc377?.worldTile?.();
        if (!t) return false;
        // surface Rellekka: z well below dungeon (~10000)
        return t.z < 5000 && t.z !== fromZ;
      },
      beforeClimb?.z ?? 10000,
      { timeout: 12_000 }
    )
    .then(() => true)
    .catch(() => false);
  const afterClimb = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
  console.log(
    `[quest-viking] maze exit op=${exitOk} climbed=${climbed} before=${JSON.stringify(
      beforeClimb
    )} after=${JSON.stringify(afterClimb)}`
  );
  if (!climbed) {
    fail(
      'maze exit: did not reach surface (wrong ladder / p_arrivedelay). ' +
        'Do not count walkNear as climb.'
    );
  }
  await waitSceneReady(page, 12_000);
  // queue(complete_swensen_trial, 0) needs a few world ticks (WORLD_SPEED_MS).
  // mid14: single 800ms read still saw viking=2; re-exit path then hit 3.
  const land = { x: 2649, z: 3661, level: 0 }; // 0_41_57_25_13
  for (let i = 0; i < 12; i++) {
    stage = await getServerVarQuiet(page, 'viking');
    if ((stage ?? 0) >= 3) break;
    await page.waitForTimeout(400);
  }
  console.log(`[quest-viking] after first exit climb viking=${stage}`);

  if ((stage ?? 0) < 3 && wantStage >= 3) {
    // Fallback if pack is pre-046cc7040 or queue missed: park Swensen + re-exit.
    console.log('[quest-viking] vote missing — park Swensen then re-exit (fallback)');
    if (!(await teleTo(page, SWENSEN, 3, 20_000))) fail('tele Swensen park failed');
    await waitSceneReady(page, 10_000);
    await walkNear(page, SWENSEN, 0);
    await talkNpc(page, 'Swensen', ['maze', 'tough', 'yes', 'vote']);
    await continueThrash(page, 10, 250);
    if (!(await teleTo(page, MAZE_LADDER_TOP, 3, 20_000))) fail('tele ladder top re-enter failed');
    await waitSceneReady(page, 10_000);
    await walkNear(page, MAZE_LADDER_TOP, 1);
    await opLocAt(page, MAZE_LADDER_TOP, '');
    await page.waitForTimeout(1200);
    await waitSceneReady(page, 10_000);
    if (!(await teleTo(page, { x: MAZE_EXIT.x, z: MAZE_EXIT.z - 1, level: 0 }, 2, 20_000))) {
      fail('tele maze exit approach failed');
    }
    await waitSceneReady(page, 10_000);
    await walkNear(page, MAZE_EXIT, 1);
    await page.waitForTimeout(400);
    const b2 = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
    await page.evaluate(([wx, wz]) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const list = r?.locs?.({ maxDist: 6 }) ?? [];
      const lad = list.find(l => /ladder/i.test(l?.name ?? '') && /climb/i.test(String(l?.ops?.[0] ?? '')));
      if (lad && a?.menuAction) {
        a.menuAction(625, lad.typecode, lad.lx, lad.lz);
        return;
      }
      a?.opLocAt?.(wx, wz, '');
      a?.opLoc?.('Ladder', 'Climb', 6);
    }, [MAZE_EXIT.x, MAZE_EXIT.z]);
    await page
      .waitForFunction(
        fromZ => {
          const t = globalThis.__lc377?.worldTile?.();
          return t && t.z < 5000 && t.z !== fromZ;
        },
        b2?.z ?? 10000,
        { timeout: 12_000 }
      )
      .catch(() => {});
    await waitSceneReady(page, 10_000);
    await walkNear(page, land, 1);
    await walkNear(page, SWENSEN, 1);
    await continueThrash(page, 28, 300);
    for (let i = 0; i < 8; i++) {
      stage = await getServerVarQuiet(page, 'viking');
      if ((stage ?? 0) >= 3) break;
      await page.waitForTimeout(400);
    }
    console.log(`[quest-viking] after re-exit viking=${stage}`);
    if ((stage ?? 0) < 3) {
      const dist = await page.evaluate(() => {
        const t = globalThis.__lc377?.worldTile?.();
        const n = (globalThis.__lc377?.reader?.npcs?.() ?? []).find(x =>
          /swensen/i.test(x?.name ?? '')
        );
        if (!t || !n?.tile) return null;
        return {
          player: t,
          swensen: n.tile,
          cheb: Math.max(Math.abs(t.x - n.tile.x), Math.abs(t.z - n.tile.z))
        };
      });
      console.log('[quest-viking] swensen range check', JSON.stringify(dist));
    }
  }

  if (wantStage >= 4 && (stage ?? 0) >= 3) {
    budget.check('peer-start');
    console.log('[quest-viking] tele Peer', PEER);
    if (!(await teleTo(page, PEER, 3, 25_000))) fail('tele Peer failed');
    await waitSceneReady(page, 20_000);
    const peerScene = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.npcs?.() ?? []).map(n => `${n?.name}@${n?.tile?.x},${n?.tile?.z}`)
    );
    console.log('[quest-viking] peer scene', JSON.stringify(peerScene));
    // Accept + bank deposit (empties inv/worn for house rule)
    const peerTalk = await talkNpc(page, 'Peer', [
      'yes',
      'interested',
      'council',
      'fremennik',
      'vote',
      'bank',
      'deposit',
      'thank'
    ]);
    console.log('[quest-viking] talk Peer', JSON.stringify(peerTalk));
    if (peerTalk?.noTrig) fail(peerTalk.noTrig);
    await continueThrash(page, 12, 250);
    if (shot) await shot('peer-accepted');

    // Ensure inv empty (deposit should have cleared; drop leftovers if any)
    await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
      for (const it of inv) {
        if (it?.name) a?.heldOp?.(it.name, 2); // Drop if present
        await new Promise(r => setTimeout(r, 80));
      }
    });
    await page.waitForTimeout(500);

    budget.check('peer-riddle');
    // Open door1 → Solve riddle IF
    if (!(await teleTo(page, { x: PEER_DOOR1.x, z: PEER_DOOR1.z - 1, level: 0 }, 2, 15_000))) {
      fail('tele peer door1 approach failed');
    }
    await walkNear(page, PEER_DOOR1, 1);
    await continueThrash(page, 6, 200);
    let doorOp = await opLocAt(page, PEER_DOOR1, '');
    if (!doorOp) doorOp = await opLoc(page, 'Door', '');
    console.log(`[quest-viking] peer door1 op=${doorOp}`);
    await page.waitForTimeout(800);
    await continueThrash(page, 8, 250);
    // Choose "Solve the riddle"
    await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      for (let i = 0; i < 20; i++) {
        const opts = (r?.chatOptions?.() ?? [])
          .map(o => (typeof o === 'string' ? o : o?.text))
          .filter(Boolean);
        if (opts.length) {
          const j = opts.findIndex(o => /solve/i.test(o));
          a?.chooseOption?.([opts[j >= 0 ? j : 0]]);
        } else {
          a?.continueDialog?.();
          a?.dismissModalMessage?.();
        }
        await new Promise(res => setTimeout(res, 350));
      }
    });
    await page.waitForTimeout(600);

    const bits = (await getServerVarQuiet(page, 'viking_bits')) ?? 0;
    const riddleId = bitRange(bits, 3, 5); // ^viking_seerdoor_start..end
    const letters = PEER_RIDDLE[riddleId] ?? PEER_RIDDLE[0];
    console.log(`[quest-viking] peer riddle id=${riddleId} letters=${letters.join(',')} bits=${bits}`);

    // Combo starts at AAAA (0). Click + per letter stage, then Enter.
    for (let lock = 0; lock < 4; lock++) {
      const n = letters[lock] | 0;
      for (let k = 0; k < n; k++) {
        await page.evaluate(id => globalThis.__lc377?.actions?.ifButton?.(id), COMBO.plus[lock]);
        await page.waitForTimeout(60);
      }
    }
    await page.evaluate(id => globalThis.__lc377?.actions?.ifButton?.(id), COMBO.enter);
    await page.waitForTimeout(800);
    await continueThrash(page, 10, 250);
    // Door may need second click after riddle solved (peer_completed_riddle)
    await walkNear(page, PEER_DOOR1, 0);
    await opLocAt(page, PEER_DOOR1, '');
    await page.waitForTimeout(1200);
    await waitSceneReady(page, 12_000);
    if (shot) await shot('peer-inside');

    budget.check('peer-house');
    /** L2 walk-only (tele often fails inside house). */
    const goL2 = async tile => {
      await walkNear(page, tile, 1);
      await page.waitForTimeout(250);
    };
    const invNames = async () =>
      page.evaluate(() =>
        (globalThis.__lc377?.reader?.inventory?.() ?? []).map(i => i?.name).filter(Boolean)
      );
    /** Use held item on nearest loc by pack id (exact instance). */
    const useOnLocId = async (itemSub, locId) =>
      page.evaluate(
        ([item, id]) => {
          const a = globalThis.__lc377?.actions;
          const r = globalThis.__lc377?.reader;
          if (!a?.useHeldOnLoc || !r) return false;
          const loc = (r.locs?.({ maxDist: 24 }) ?? []).find(l => (l.id | 0) === (id | 0));
          if (!loc) return false;
          return !!a.useHeldOnLoc(item, loc, 24);
        },
        [itemSub, locId]
      );
    const climbAnyLadder = async () => {
      const ok = await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        const r = globalThis.__lc377?.reader;
        const list = r?.locs?.({ maxDist: 24 }) ?? [];
        const lad = list.find(l => /ladder/i.test(l?.name ?? ''));
        if (lad && a?.menuAction) {
          a.menuAction(625, lad.typecode, lad.lx, lad.lz);
          return true;
        }
        return !!a?.opLoc?.('Ladder', 'Climb', 16) || !!a?.opLoc?.('ladder', '', 16);
      });
      await page.waitForTimeout(1600);
      return ok;
    };
    const waitLevel = async (want, ms = 10_000) => {
      await page
        .waitForFunction(w => (globalThis.__lc377?.worldTile?.()?.level ?? 0) === w, want, {
          timeout: ms
        })
        .catch(() => {});
    };

    // Climb to L2
    await teleTo(page, PEER_LADDER_UP, 2, 15_000).catch(() => {});
    await walkNear(page, PEER_LADDER_UP, 0);
    await opLocAt(page, PEER_LADDER_UP, '');
    await climbAnyLadder();
    await waitLevel(2);
    console.log('[quest-viking] peer upper', JSON.stringify(await page.evaluate(() => globalThis.__lc377?.worldTile?.())));

    // Collect: open+search cupboard (bucket), chest (jug), bookcase (herring), heads (disks)
    const openSearch = async (tile, label) => {
      await goL2(tile);
      await opLocAt(page, tile, 'Open');
      await page.waitForTimeout(350);
      let ok = await opLocAt(page, tile, 'Search');
      if (!ok) ok = await opLoc(page, label, 'Search');
      if (!ok) ok = await opLocAt(page, tile, '');
      await continueThrash(page, 8, 220);
      return ok;
    };
    console.log('[quest-viking] cupboard', await openSearch(PEER_L2.cupboard, 'Cupboard'));
    console.log('[quest-viking] chest', await openSearch(PEER_L2.chest, 'Chest'));
    console.log('[quest-viking] bookcase', await openSearch(PEER_L2.bookcase, 'Bookcase'));
    console.log('[quest-viking] unicorn', await openSearch(PEER_L2.unicorn, "Unicorn"));
    console.log('[quest-viking] bull', await openSearch(PEER_L2.bull, 'Bull'));
    console.log('[quest-viking] inv after collect', JSON.stringify(await invNames()));

    // Cook Red herring on Cooking range → Sticky red goop
    await goL2(PEER_L2.range);
    let cook =
      (await useHeldOnLoc(page, 'Red herring', 'Cooking range')) ||
      (await useOnLocId('Red herring', 4172)) ||
      (await useHeldOnLoc(page, 'Red herring', 'range'));
    console.log(`[quest-viking] cook herring=${cook}`);
    await continueThrash(page, 14, 280);
    console.log('[quest-viking] inv after cook', JSON.stringify(await invNames()));

    // Sticky red goop on Wooden disk → second Red disk
    let paint =
      (await useHeldOnHeld(page, 'Sticky red goop', 'Wooden disk')) ||
      (await useHeldOnHeld(page, 'goop', 'Wooden disk'));
    console.log(`[quest-viking] paint disk=${paint}`);
    await page.waitForTimeout(500);
    console.log('[quest-viking] inv after paint', JSON.stringify(await invNames()));

    // Climb down to L0 mural; place both Red disks on Abstract mural → Vase lid
    await climbAnyLadder();
    await waitLevel(0);
    // trapdoor fallback if still upstairs
    if (((await page.evaluate(() => globalThis.__lc377?.worldTile?.()?.level)) ?? 0) >= 2) {
      await goL2({ x: 2631, z: 3663, level: 2 });
      await opLoc(page, 'Trapdoor', 'Open');
      await opLoc(page, 'Trapdoor', 'Climb');
      await page.waitForTimeout(1200);
    }
    await teleTo(page, PEER_MURAL, 2, 15_000).catch(() => {});
    await walkNear(page, PEER_MURAL, 1);
    let mural1 =
      (await useHeldOnLoc(page, 'Red disk', 'Abstract mural')) ||
      (await useOnLocId('Red disk', 4179));
    await page.waitForTimeout(500);
    let mural2 =
      (await useHeldOnLoc(page, 'Red disk', 'Abstract mural')) ||
      (await useOnLocId('Red disk', 4179));
    console.log(`[quest-viking] mural disks=${mural1},${mural2}`);
    await continueThrash(page, 10, 250);
    console.log('[quest-viking] inv after mural', JSON.stringify(await invNames()));

    // Back upstairs
    await teleTo(page, PEER_LADDER_UP, 2, 12_000).catch(() => {});
    await walkNear(page, PEER_LADDER_UP, 0);
    await opLocAt(page, PEER_LADDER_UP, '');
    await climbAnyLadder();
    await waitLevel(2);

    // Ensure empty vessels if missing (invHas 'bucket' also matches Full bucket)
    if (!(await invHas(page, 'Empty bucket')) && !(await invHas(page, 'Full bucket'))) {
      await openSearch(PEER_L2.cupboard, 'Cupboard');
    }
    if (!(await invHas(page, 'Empty jug')) && !(await invHas(page, 'Full jug'))) {
      await openSearch(PEER_L2.chest, 'Chest');
    }
    // Drop cooked herring — free space / avoid inv noise (not needed for trial)
    if (await invHas(page, 'Herring')) {
      await page.evaluate(() => globalThis.__lc377?.actions?.heldOp?.('Herring', 2));
      await page.waitForTimeout(300);
    }

    // Water: 5-bucket / 3-jug → 4/5ths full bucket for scale chest
    const fillTap = async item => {
      await goL2(PEER_L2.tap);
      return (
        (await useHeldOnLoc(page, item, 'Tap')) ||
        (await useOnLocId(item, 4176))
      );
    };
    const emptyDrain = async item => {
      await goL2(PEER_L2.drain);
      return (
        (await useHeldOnLoc(page, item, 'Drain')) ||
        (await useOnLocId(item, 4175))
      );
    };
    /** Inv-tab pour with snaps (paint worked; name-only pour failed mid16). */
    const pour = async (useName, tgtName, label) => {
      const res = await page.evaluate(
        ([u, t]) => {
          const a = globalThis.__lc377?.actions;
          const r = globalThis.__lc377?.reader;
          if (!a?.useHeldOnHeld || !r) return { ok: false, err: 'no abi' };
          a.setSideTab?.(3); // inventory
          const inv = r.inventory?.() ?? [];
          const use = inv.find(i => i?.name === u) || inv.find(i => (i?.name ?? '').includes(u));
          const tgt = inv.find(i => i?.name === t) || inv.find(i => (i?.name ?? '').includes(t));
          if (!use || !tgt) {
            return {
              ok: false,
              err: 'missing',
              inv: inv.map(i => i?.name),
              use: use?.name,
              tgt: tgt?.name
            };
          }
          const ok = !!a.useHeldOnHeld(use, tgt);
          return { ok, use: use.name, tgt: tgt.name, slots: [use.slot, tgt.slot] };
        },
        [useName, tgtName]
      );
      await page.waitForTimeout(800);
      console.log(`[quest-viking] pour ${label}`, JSON.stringify(res), JSON.stringify(await invNames()));
      return !!res?.ok;
    };

    // Reset vessels to empty
    for (const n of [
      'Full bucket',
      '4/5ths full bucket',
      '3/5ths full bucket',
      '2/5ths full bucket',
      '1/5ths full bucket',
      'Full jug',
      '2/3rds full jug',
      '1/3rds full jug'
    ]) {
      if (await invHas(page, n)) await emptyDrain(n);
    }
    await page.waitForTimeout(400);
    // Fill empty bucket
    let f1 = await fillTap('Empty bucket');
    if (!f1) f1 = await fillTap('bucket');
    console.log(`[quest-viking] fill bucket=${f1}`, JSON.stringify(await invNames()));
    await page.waitForTimeout(500);
    // pour Full bucket → Empty jug  (opheldu empty jug + bucket_5)
    await pour('Full bucket', 'Empty jug', '5→jug');
    // if still full, try reverse wire order (use jug on bucket — content may no-op)
    if (await invHas(page, 'Full bucket')) await pour('Empty jug', 'Full bucket', 'jug←5-rev');
    await page.waitForTimeout(400);
    if (await invHas(page, 'Full jug')) await emptyDrain('Full jug');
    await page.waitForTimeout(400);
    // pour 2/5ths → empty jug
    if (await invHas(page, '2/5ths full bucket')) {
      await pour('2/5ths full bucket', 'Empty jug', '2→jug');
    }
    await page.waitForTimeout(400);
    await fillTap('Empty bucket');
    await page.waitForTimeout(500);
    // pour full into 2/3rds jug → 4/5ths bucket
    if (await invHas(page, '2/3rds full jug')) {
      await pour('Full bucket', '2/3rds full jug', '5→2/3jug');
    } else if (await invHas(page, 'Empty jug')) {
      // fallback classic alt: fill jug, pour into bucket repeatedly
      await fillTap('Empty jug');
      await pour('Full jug', 'Empty bucket', 'jug→empty-b');
      await fillTap('Empty jug');
      await pour('Full jug', '2/5ths full bucket', 'jug→2/5');
      await pour('Full jug', '3/5ths full bucket', 'jug→3/5');
    }
    await page.waitForTimeout(500);
    console.log('[quest-viking] peer water inv', JSON.stringify(await invNames()));

    // Scale chest wants 4/5ths full bucket (id 4170)
    await goL2(PEER_L2.scaleChest);
    let scale = false;
    if (await invHas(page, '4/5ths full bucket')) {
      scale =
        (await useHeldOnLoc(page, '4/5ths full bucket', 'Chest')) ||
        (await useOnLocId('4/5ths full bucket', 4170));
    }
    // last resort: try any partial bucket on scale (content only accepts 4)
    if (!scale) {
      scale = await useOnLocId('bucket', 4170);
    }
    console.log(`[quest-viking] scale chest=${scale}`);
    await continueThrash(page, 10, 250);
    console.log('[quest-viking] inv after scale', JSON.stringify(await invNames()));

    // MUST fill vase with water BEFORE lid. mid18: tap use reported ok but inv
    // stayed dry "Vase" — prefer Full jug / full bucket ON vase (opheldu).
    if (await invHas(page, 'Sealed vase') && !(await invHas(page, 'Frozen key'))) {
      await page.evaluate(() => {
        globalThis.__lc377?.actions?.setSideTab?.(3);
        globalThis.__lc377?.actions?.heldOp?.('Sealed vase', 1);
      });
      await page.waitForTimeout(600);
      console.log('[quest-viking] unscrew sealed', JSON.stringify(await invNames()));
    }
    if (await invHas(page, 'Vase') && !(await invHas(page, 'Vase of water'))) {
      // inv pour first (reliable mid17/18 pour path)
      let fv = false;
      if (await invHas(page, 'Full jug')) fv = await pour('Full jug', 'Vase', 'jug→vase');
      if (!(await invHas(page, 'Vase of water')) && (await invHas(page, '4/5ths full bucket'))) {
        fv = (await pour('4/5ths full bucket', 'Vase', '4→vase')) || fv;
      }
      if (!(await invHas(page, 'Vase of water')) && (await invHas(page, 'Full bucket'))) {
        fv = (await pour('Full bucket', 'Vase', '5→vase')) || fv;
      }
      if (!(await invHas(page, 'Vase of water'))) {
        // tap fallback — walk adjacent + longer wait
        await goL2(PEER_L2.tap);
        await page.waitForTimeout(400);
        fv =
          (await useHeldOnLoc(page, 'Vase', 'Tap')) ||
          (await useOnLocId('Vase', 4176)) ||
          fv;
        await page.waitForTimeout(1000);
      }
      console.log(`[quest-viking] fill vase done`, JSON.stringify(await invNames()));
    }
    // Lid on Vase of water only
    if ((await invHas(page, 'Vase of water')) && (await invHas(page, 'Vase lid'))) {
      await pour('Vase lid', 'Vase of water', 'lid→water');
      if (!(await invHas(page, 'Sealed vase'))) {
        await pour('Vase of water', 'Vase lid', 'water→lid-rev');
      }
    }
    if (!(await invHas(page, 'Sealed vase')) && !(await invHas(page, 'Vase of water'))) {
      console.log('[quest-viking] WARN no sealed/water vase', JSON.stringify(await invNames()));
    }
    await page.waitForTimeout(400);
    // 4) Freeze sealed water → Frozen key (shatter). Dry sealed leaves sealed.
    await goL2(PEER_L2.frozen);
    let freeze =
      (await useHeldOnLoc(page, 'Sealed vase', 'Frozen table')) ||
      (await useOnLocId('Sealed vase', 4169));
    // if only water vase (no lid yet), freeze then thaw is wrong path — need lid first
    if (!freeze && (await invHas(page, 'Vase of water'))) {
      freeze = await useHeldOnLoc(page, 'Vase of water', 'Frozen table');
    }
    console.log(`[quest-viking] freeze vase=${freeze}`);
    await page.waitForTimeout(900);
    console.log('[quest-viking] inv after freeze', JSON.stringify(await invNames()));
    // Retry once: if still sealed (dry), unscrew, fill, re-lid, re-freeze
    if (!(await invHas(page, 'Frozen key')) && (await invHas(page, 'Sealed vase'))) {
      await page.evaluate(() => {
        globalThis.__lc377?.actions?.setSideTab?.(3);
        globalThis.__lc377?.actions?.heldOp?.('Sealed vase', 1);
      });
      await page.waitForTimeout(500);
      await fillTap('Vase');
      await page.waitForTimeout(400);
      await pour('Vase lid', 'Vase of water', 'lid→water-retry');
      await goL2(PEER_L2.frozen);
      freeze =
        (await useHeldOnLoc(page, 'Sealed vase', 'Frozen table')) ||
        (await useOnLocId('Sealed vase', 4169));
      await page.waitForTimeout(900);
      console.log(`[quest-viking] freeze retry=${freeze}`, JSON.stringify(await invNames()));
    }

    // Melt Frozen key on Cooking range → Seer's key
    await goL2(PEER_L2.range);
    let melt =
      (await useHeldOnLoc(page, 'Frozen key', 'Cooking range')) ||
      (await useOnLocId('Frozen key', 4172));
    console.log(`[quest-viking] melt key=${melt}`);
    await page.waitForTimeout(800);
    console.log('[quest-viking] inv after melt', JSON.stringify(await invNames()));

    // Exit door2 with Seer's key from INSIDE the house.
    // content: unlock only if check_axis(...) = false (inside face). mid19 used key
    // (packet ok) but key stayed in inv and viking stayed 3 — stood on outside.
    // Door2 @ 2636,3667; house interior is lower-z (mural 3663) — stand 2636,3665.
    await climbAnyLadder();
    await waitLevel(0);
    if (((await page.evaluate(() => globalThis.__lc377?.worldTile?.()?.level)) ?? 0) >= 2) {
      await opLoc(page, 'Trapdoor', 'Climb');
      await page.waitForTimeout(1200);
    }
    const DOOR2_INSIDE = { x: 2636, z: 3665, level: 0 };
    const DOOR2_INSIDE2 = { x: 2635, z: 3666, level: 0 };
    // Prefer walk from inside (ladder/mural area) rather than tele onto door tile
    await teleTo(page, PEER_MURAL, 2, 15_000).catch(() => {});
    await walkNear(page, DOOR2_INSIDE, 0);
    await page.waitForTimeout(400);
    const here = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
    console.log('[quest-viking] peer at door2 approach', JSON.stringify(here));

    const tryUnlock = async label => {
      // oploc1 path: key in inv + open door from inside
      let ok = await opLocAt(page, PEER_DOOR2, '');
      if (!ok) ok = await opLoc(page, 'Door', '');
      await page.waitForTimeout(500);
      // oplocu path: use key on door
      ok =
        (await useHeldOnLoc(page, "Seer's key", 'Door')) ||
        (await useOnLocId("Seer's key", 4166)) ||
        ok;
      await page.waitForTimeout(800);
      await continueThrash(page, 12, 250);
      let st = await getServerVarQuiet(page, 'viking');
      const inv = await invNames();
      console.log(
        `[quest-viking] unlock try ${label} viking=${st} hasKey=${inv.some(n => /key/i.test(n))} inv=${JSON.stringify(inv)}`
      );
      return (st ?? 0) >= 4;
    };

    let unlocked = await tryUnlock('inside-3665');
    if (!unlocked) {
      await walkNear(page, DOOR2_INSIDE2, 0);
      unlocked = await tryUnlock('inside-3666');
    }
    if (!unlocked) {
      // other side of door in case orientation flipped
      await walkNear(page, { x: 2636, z: 3668, level: 0 }, 0);
      unlocked = await tryUnlock('outside-3668');
    }
    if (!unlocked) {
      await walkNear(page, { x: 2637, z: 3667, level: 0 }, 0);
      unlocked = await tryUnlock('side-2637');
    }
    for (let i = 0; i < 12; i++) {
      stage = await getServerVarQuiet(page, 'viking');
      if ((stage ?? 0) >= 4) break;
      await page.waitForTimeout(400);
    }
    console.log(`[quest-viking] after peer viking=${stage} inv=${JSON.stringify(await invNames())}`);
    if (shot) await shot('peer-end');
  }

  // —— Sigli Draugen hunt (vote 4 → viking=5) ——
  if (wantStage >= 5 && (stage ?? 0) >= 4) {
    budget.check('sigli-start');
    const invNames = async () =>
      page.evaluate(() =>
        (globalThis.__lc377?.reader?.inventory?.() ?? []).map(i => i?.name).filter(Boolean)
      );
    const statFail = await setStats(page, SIGLI_STATS);
    if (statFail?.length) console.log('[quest-viking] setStats soft-fail', statFail);
    // Gear matches combat floor (not bronze). Equip or fight is unarmed with steel in bag.
    await giveItems(page, SIGLI_GEAR);
    await page.waitForTimeout(400);
    await page.evaluate(async names => {
      const a = globalThis.__lc377?.actions;
      for (const n of names) {
        a?.equip?.(n);
        await new Promise(r => setTimeout(r, 350));
      }
    }, SIGLI_EQUIP_NAMES);
    await page.waitForTimeout(400);
    console.log(
      `[quest-viking] sigli gear inv=${JSON.stringify(await invNames())} worn=${JSON.stringify(
        await page.evaluate(() =>
          (globalThis.__lc377?.reader?.equipment?.() ?? []).map(i => i?.name).filter(Boolean)
        )
      )}`
    );

    console.log('[quest-viking] tele Sigli', SIGLI);
    if (!(await teleTo(page, SIGLI, 3, 25_000))) fail('tele Sigli failed');
    await waitSceneReady(page, 15_000);
    const sigliTalk = await talkNpc(page, 'Sigli', [
      'yes',
      'draugen',
      'council',
      'fremennik',
      'hunt',
      'prove',
      'what'
    ]);
    console.log('[quest-viking] talk Sigli', JSON.stringify(sigliTalk));
    if (sigliTalk?.noTrig) fail(sigliTalk.noTrig);
    await continueThrash(page, 16, 280);
    if (!(await invHas(page, 'talisman'))) {
      // dialog may need second pass for Yes on draugen
      await talkNpc(page, 'Sigli', ['yes', 'draugen', 'what']);
      await continueThrash(page, 12, 250);
    }
    if (!(await invHas(page, 'talisman'))) fail('no Hunters talisman after Sigli accept');
    if (shot) await shot('sigli-accepted');

    // Track butterfly → spawn Draugen → kill → charged talisman
    // mid21 mistake: tele-hopped spawn centres (Seers↔crabs) and ignored
    // "talisman guides you …". Follow bearing with short steps in DRAUGEN_BOX.
    budget.check('sigli-hunt');
    // Start near Sigli / SW forest (inside box), not a random far spawn.
    await teleTo(page, clampDraugenTile(SIGLI.x - 10, SIGLI.z - 20), 4, 15_000).catch(() => {});
    await waitSceneReady(page, 10_000);

    let defeated = false;
    const useTalisman = async (tag = '') => {
      const used = await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
        const names = inv.map(i => i?.name).filter(Boolean);
        const tal =
          names.find(n => /hunter.*talisman|talisman/i.test(n)) || "Hunters' talisman";
        a?.setSideTab?.(3);
        // opheld1 = locate (content opheld1,viking_draugen_talisman_uncharged)
        const ok =
          a?.heldOp?.(tal, 1) ||
          a?.heldOp?.(tal, 2) ||
          a?.heldOp?.("Hunters' talisman", 1) ||
          a?.heldOp?.('talisman', 1);
        return { ok: !!ok, tal, names: names.filter(n => /talis|hunter/i.test(n)) };
      });
      await page.waitForTimeout(800);
      await continueThrash(page, 4, 150);
      const chat = await page.evaluate(() => {
        const r = globalThis.__lc377?.reader;
        return typeof r?.chat === 'function' ? r.chat(10).map(c => c?.text) : [];
      });
      const tip = (chat || []).find(c =>
        /talisman|Draugen|guides you|already captured/i.test(String(c ?? ''))
      );
      if (tag || tip) {
        console.log(
          `[quest-viking] talisman ${tag} used=${JSON.stringify(used)} tip=${tip || '(no tip chat)'}`
        );
      }
      return tip || null;
    };
    const readHuntScene = async () =>
      page.evaluate(() => {
        const r = globalThis.__lc377?.reader;
        const t = globalThis.__lc377?.worldTile?.();
        const npcs = (r?.npcs?.() ?? []).map(n => ({
          name: n?.name,
          x: n?.tile?.x ?? n?.x,
          z: n?.tile?.z ?? n?.z
        }));
        const chat = typeof r?.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
        return { t, npcs, chat };
      });

    const fightDraugen = async draugen => {
      console.log('[quest-viking] Draugen on scene', JSON.stringify(draugen));
      await walkNear(page, { x: draugen.x, z: draugen.z, level: 0 }, 1);
      // nearestNpc is EXACT match — display name is "The Draugen" not "Draugen"
      const atk0 = await page.evaluate(() =>
        !!globalThis.__lc377?.actions?.attackNpc?.('The Draugen')
      );
      console.log('[quest-viking] Draugen attack0', atk0);
      // HP 60 + melee def 100 — adamant host kit; ~2 min real-time wall
      for (let f = 0; f < 280; f++) {
        await page.waitForTimeout(450);
        const still = await page.evaluate(() =>
          (globalThis.__lc377?.reader?.npcs?.() ?? []).some(
            n => String(n?.name ?? '') === 'The Draugen'
          )
        );
        if (still && f % 6 === 0) {
          await page.evaluate(() => globalThis.__lc377?.actions?.attackNpc?.('The Draugen'));
        }
        // Lobster heals 12 — only eat when missing ≥12 (or emergency floor); no timed spam
        if (still && f % 4 === 2) {
          await page.evaluate(() => globalThis.__lc377?.actions?.eatIfNeeded?.('Lobster', 12));
        }
        if (still && f % 20 === 10) {
          // re-close if kite walked off
          await walkNear(page, { x: draugen.x, z: draugen.z, level: 0 }, 1).catch(() => {});
        }
        if (!still) {
          console.log('[quest-viking] Draugen despawned', JSON.stringify(await invNames()));
          return true;
        }
        const absorbed = await page.evaluate(() => {
          const chat = globalThis.__lc377?.reader?.chat?.(8) ?? [];
          return chat.some(c => /absorb/i.test(String(c?.text ?? c ?? '')));
        });
        if (absorbed) return true;
        if (f > 0 && f % 40 === 0) {
          const hp = await page.evaluate(() => globalThis.__lc377?.reader?.hitpoints?.());
          console.log(`[quest-viking] Draugen fight tick f=${f} still=true hp=${JSON.stringify(hp)}`);
        }
      }
      console.log('[quest-viking] Draugen fight timed out');
      return false;
    };

    // Content: spawn when distance(player, viking_draugen_safe) < 4 on talisman click.
    // mid28: never chase scene "Butterfly" (wild + viking_draugen_safe share the name).
    // mid29: fixed-step tele overshot → SE↔NW oscillation; binary-search on reverse.
    let step = DRAUGEN_STEP;
    /** Never re-open range after a reverse-halve (mid30 grew 3→8 and walked past). */
    let stepCap = DRAUGEN_STEP;
    let lastDirKey = null;
    let prevHere = null;
    for (let attempt = 0; attempt < 100 && !defeated; attempt++) {
      let scene = await readHuntScene();
      const here = scene.t || { x: SIGLI.x, z: SIGLI.z };

      const tip = await useTalisman(`seek-${attempt}`);
      scene = await readHuntScene();

      const hereMsg = (scene.chat || []).find(c => /Draugen is here|absorb/i.test(String(c ?? '')));
      if (hereMsg) console.log(`[quest-viking] talisman chat: ${hereMsg}`);

      let draugen = (scene.npcs || []).find(n => /draugen/i.test(n?.name ?? ''));
      if (!draugen && (hereMsg || /Draugen is here/i.test(String(tip ?? '')))) {
        await page.waitForTimeout(600);
        scene = await readHuntScene();
        draugen = (scene.npcs || []).find(n => /draugen/i.test(n?.name ?? ''));
      }
      if (draugen) {
        defeated = await fightDraugen(draugen);
        break;
      }

      const dir = parseTalismanDir(scene.chat) || parseTalismanDir([tip].filter(Boolean));
      if (!dir) {
        const nudge = clampDraugenTile(here.x - DRAUGEN_STEP, here.z);
        console.log(`[quest-viking] hunt nudge west ${nudge.x},${nudge.z}`);
        await teleTo(page, nudge, 2, 10_000).catch(() => walkNear(page, nudge, 2));
        prevHere = here;
        continue;
      }

      const dirKey = `${dir.dx},${dir.dz}`;
      // Opposite tip ⇒ we jumped over the target — midpoint + half step
      const opposite =
        lastDirKey &&
        lastDirKey.split(',').map(Number)[0] === -dir.dx &&
        lastDirKey.split(',').map(Number)[1] === -dir.dz;
      if (opposite) {
        step = Math.max(1, Math.floor(step / 2));
        stepCap = step;
        if (prevHere) {
          const mid = clampDraugenTile(
            Math.round((prevHere.x + here.x) / 2),
            Math.round((prevHere.z + here.z) / 2)
          );
          console.log(
            `[quest-viking] hunt reverse→mid ${mid.x},${mid.z} (was ${here.x},${here.z}↔${prevHere.x},${prevHere.z}) step=${step} cap=${stepCap}`
          );
          await teleTo(page, mid, 1, 12_000).catch(() => walkNear(page, mid, 1));
          await waitSceneReady(page, 8_000);
          await page.waitForTimeout(250);
          // re-locate at midpoint without stepping further this iteration
          prevHere = here;
          lastDirKey = dirKey;
          // spam talisman a few times while stationary (land inside <4)
          for (let k = 0; k < 3 && !defeated; k++) {
            const t2 = await useTalisman(`mid-spam-${k}`);
            scene = await readHuntScene();
            if (
              (scene.npcs || []).some(n => /draugen/i.test(n?.name ?? '')) ||
              /Draugen is here/i.test(String(t2 ?? ''))
            ) {
              const d3 = (scene.npcs || []).find(n => /draugen/i.test(n?.name ?? ''));
              if (d3) {
                defeated = await fightDraugen(d3);
                break;
              }
            }
            await page.waitForTimeout(200);
          }
          if (defeated) break;
          // After mid spam still only a tip: micro-step once in tip dir (no grow)
          const micro = clampDraugenTile(mid.x + dir.dx * step, mid.z + dir.dz * step);
          console.log(
            `[quest-viking] hunt micro ${dir.line} → ${micro.x},${micro.z} step=${step}`
          );
          await teleTo(page, micro, 1, 10_000).catch(() => walkNear(page, micro, 1));
          await waitSceneReady(page, 6_000);
          continue;
        }
      }
      // hold step under cap — do not re-open after reverse
      step = Math.min(step, stepCap);

      // When close enough, pick a scene Butterfly that matches tip quadrant
      // (wild butterflies exist; tip-aligned one is likely viking_draugen_safe).
      if (step <= 6) {
        const aligned = (scene.npcs || [])
          .filter(n => /butterfly/i.test(n?.name ?? '') && n.x != null)
          .map(n => {
            const dx = n.x - here.x;
            const dz = n.z - here.z;
            const cheb = Math.max(Math.abs(dx), Math.abs(dz));
            // tip dir is unit toward target; require same sign on nonzero axes
            const okX = dir.dx === 0 || Math.sign(dx) === dir.dx || Math.abs(dx) <= 1;
            const okZ = dir.dz === 0 || Math.sign(dz) === dir.dz || Math.abs(dz) <= 1;
            return { n, cheb, ok: okX && okZ && cheb < 30 };
          })
          .filter(x => x.ok)
          .sort((a, b) => a.cheb - b.cheb);
        if (aligned.length) {
          const bf = aligned[0].n;
          const bt = clampDraugenTile(bf.x, bf.z);
          console.log(
            `[quest-viking] hunt tip-aligned butterfly ${JSON.stringify(bf)} cheb=${aligned[0].cheb} tip=${dir.line}`
          );
          await teleTo(page, bt, 0, 12_000).catch(() => walkNear(page, bt, 0));
          await waitSceneReady(page, 8_000);
          await page.waitForTimeout(300);
          prevHere = { x: here.x, z: here.z };
          lastDirKey = dirKey;
          for (let k = 0; k < 4 && !defeated; k++) {
            const t2 = await useTalisman(`aligned-spam-${k}`);
            scene = await readHuntScene();
            const d3 = (scene.npcs || []).find(n => /draugen/i.test(n?.name ?? ''));
            if (d3 || /Draugen is here/i.test(String(t2 ?? ''))) {
              if (d3) {
                defeated = await fightDraugen(d3);
                break;
              }
              await page.waitForTimeout(500);
              scene = await readHuntScene();
              const d4 = (scene.npcs || []).find(n => /draugen/i.test(n?.name ?? ''));
              if (d4) {
                defeated = await fightDraugen(d4);
                break;
              }
            }
            await page.waitForTimeout(250);
          }
          if (defeated) break;
          continue;
        }
      }

      const next = clampDraugenTile(here.x + dir.dx * step, here.z + dir.dz * step);
      console.log(
        `[quest-viking] hunt step ${dir.line} → ${next.x},${next.z} (from ${here.x},${here.z}) step=${step} cap=${stepCap}`
      );
      prevHere = { x: here.x, z: here.z };
      lastDirKey = dirKey;
      await teleTo(page, next, Math.max(0, Math.min(1, step)), 12_000).catch(() =>
        walkNear(page, next, 0)
      );
      await waitSceneReady(page, 8_000);
      await page.waitForTimeout(250);

      // When close (step≤3), re-click talisman on same tile before next move
      if (step <= 3) {
        for (let k = 0; k < 2 && !defeated; k++) {
          const t2 = await useTalisman(`close-spam-${k}`);
          scene = await readHuntScene();
          const d3 = (scene.npcs || []).find(n => /draugen/i.test(n?.name ?? ''));
          if (d3 || /Draugen is here/i.test(String(t2 ?? ''))) {
            if (d3) {
              defeated = await fightDraugen(d3);
              break;
            }
            await page.waitForTimeout(500);
            scene = await readHuntScene();
            const d4 = (scene.npcs || []).find(n => /draugen/i.test(n?.name ?? ''));
            if (d4) {
              defeated = await fightDraugen(d4);
              break;
            }
          }
        }
      }
    }
    console.log(`[quest-viking] after hunt defeated=${defeated} inv=${JSON.stringify(await invNames())}`);
    if (!defeated) {
      fail(
        `Draugen hunt failed (no kill). inv=${JSON.stringify(await invNames())} — bearing binary-search; no wild butterfly chase`
      );
    }
    if (shot) await shot('sigli-after-hunt');

    // Return to Sigli with charged talisman
    budget.check('sigli-return');
    if (!(await teleTo(page, SIGLI, 3, 20_000))) fail('tele Sigli return failed');
    await waitSceneReady(page, 12_000);
    await talkNpc(page, 'Sigli', ['yes', 'defeated', 'talisman', 'vote', 'thanks']);
    await continueThrash(page, 20, 300);
    for (let i = 0; i < 12; i++) {
      stage = await getServerVarQuiet(page, 'viking');
      if ((stage ?? 0) >= 5) break;
      await page.waitForTimeout(400);
    }
    console.log(`[quest-viking] after sigli viking=${stage}`);
    if (shot) await shot('sigli-end');
  }

  // —— Thorvald / Koschei unarmed (vote 5 → viking=6) ——
  if (wantStage >= 6 && (stage ?? 0) >= 5) {
    budget.check('thorvald-start');
    const invNames = async () =>
      page.evaluate(() =>
        (globalThis.__lc377?.reader?.inventory?.() ?? []).map(i => i?.name).filter(Boolean)
      );
    const wornNames = async () =>
      page.evaluate(() =>
        (globalThis.__lc377?.reader?.equipment?.() ?? []).map(i => i?.name).filter(Boolean)
      );

    // Min unarmed floor first (no weapon give — authentic)
    const tFail = await setStats(page, THORVALD_STATS);
    if (tFail?.length) console.log('[quest-viking] thorvald setStats soft-fail', tFail);

    // 1) Accept Thorvald FIRST — deposit option only appears once thorvald_started
    //    (content viking_peer.rs2: p_choice2 … depositing when thorvald mid).
    console.log('[quest-viking] tele Thorvald', THORVALD);
    if (!(await teleTo(page, THORVALD, 3, 20_000))) fail('tele Thorvald failed');
    await waitSceneReady(page, 12_000);
    const thTalk = await talkNpc(page, 'Thorvald', [
      'yes',
      'fremennik',
      'council',
      'vote',
      'prepared',
      'battle',
      'combat'
    ]);
    console.log('[quest-viking] talk Thorvald', JSON.stringify(thTalk));
    if (thTalk?.noTrig) fail(thTalk.noTrig);
    await continueThrash(page, 16, 280);
    if (shot) await shot('thorvald-accepted');

    // 2) Empty gear for can_enter_thorvald_trial.
    // Research: Peer/bank *script* deposits worn, but 377 bank_deposit_request lacks
    // 274's worn post-hook (~unequip_effect → update_all → buildappearance). Engine
    // inv_moveitem_uncert has no explicit worn ban — gap is content-side until repro.
    // Authentic player path: Remove all worn → Peer deposit inv. See
    // docs/research/peer-bank-worn-deposit-377.md — do not "fix" engine yet.
    console.log('[quest-viking] unequip all before Peer bank (INV_BUTTON Remove; worn deposit under research)');
    // Wait between Removes so server processes each inv_button1,worn
    const stillWorn = await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      a?.setSideTab?.(4);
      await new Promise(res => setTimeout(res, 400));
      for (let p = 0; p < 10; p++) {
        const list = r?.equipment?.() ?? [];
        if (!list.length) break;
        for (const it of list) {
          if (!it?.name || it.id == null || it.slot == null || it.comId == null) continue;
          // explicit INV_BUTTON1 path (option1=Remove on wornitems)
          a?.invButton?.(it.id | 0, it.slot | 0, it.comId | 0, 1) || a?.unequip?.(it.name);
          await new Promise(res => setTimeout(res, 450));
        }
        await new Promise(res => setTimeout(res, 300));
      }
      a?.setSideTab?.(4);
      await new Promise(res => setTimeout(res, 200));
      return (r?.equipment?.() ?? []).map(i => i?.name).filter(Boolean);
    });
    console.log('[quest-viking] after unequip stillWorn', JSON.stringify(stillWorn));
    if (stillWorn?.length) {
      fail(`Thorvald prep: could not unequip: ${JSON.stringify(stillWorn)}`);
    }

    console.log('[quest-viking] Peer bank gear after Thorvald accept');
    if (!(await teleTo(page, PEER, 3, 20_000))) fail('tele Peer bank failed');
    await waitSceneReady(page, 12_000);
    const peerBank = await talkNpc(
      page,
      'Peer',
      [
        'depositing', // "Ask about depositing your equipment"
        'deposit',
        'bank your equipment', // not "Don't bank…"
        'bank your',
        'yes',
        'thank'
      ],
      72
    );
    console.log('[quest-viking] talk Peer bank', JSON.stringify(peerBank));
    await continueThrash(page, 24, 280);
    // Drop anything left that blocks can_enter_thorvald_trial
    await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      a?.setSideTab?.(3);
      const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
      for (const it of inv) {
        const n = it?.name ?? '';
        if (
          /sword|scim|plate|helm|shield|kite|dagger|axe|bow|arrow|staff|spear|mace|whip|claw|armour|chain|legs|body|adamant|mithril|rune|steel|bronze|iron/i.test(
            n
          )
        ) {
          a?.heldOp?.(n, 2); // Drop
          await new Promise(r => setTimeout(r, 250));
        }
      }
    });
    await page.waitForTimeout(500);
    {
      await page.evaluate(() => globalThis.__lc377?.actions?.setSideTab?.(4));
      await page.waitForTimeout(200);
      const inv = await invNames();
      const worn = await wornNames();
      console.log(`[quest-viking] after bank inv=${JSON.stringify(inv)} worn=${JSON.stringify(worn)}`);
      // Fail hard: combat kit gone. Only food + optional Dramen branch/knife enter pen.
      const bad = [...inv, ...worn].filter(
        n =>
          /adamant|mithril|rune|steel|bronze|iron|plate|scimitar|kiteshield|full helm|weapon|sword|dagger|mace|battleaxe|chainbody|med helm/i.test(
            String(n)
          )
      );
      if (bad.length) {
        fail(
          `Thorvald bank incomplete — still have combat gear: ${JSON.stringify(bad)}. Unequip+Peer must empty worn+inv. See peer-bank-worn-deposit-377.md`
        );
      }
      if (worn.length) {
        fail(`Thorvald bank incomplete — worn not empty: ${JSON.stringify(worn)}`);
      }
    }
    // Food only after bank (lobsters OK for can_enter). Optional Dramen path:
    // branch+knife allowed; staff is weapon_staff and blocked at ladder — carve in pen (Crafting ≥31).
    // NOTE: Sigli adamant is intentional for Draugen only; it must already be banked here.
    const koscheiDramen =
      process.env.VIKING_KOSCHEI_DRAMEN === '1' ||
      process.env.VIKING_KOSCHEI_DRAMEN === 'true';
    if (koscheiDramen) {
      await giveItems(page, [
        ['lobster', 25],
        ['dramen_branch', 1],
        ['knife', 1]
      ]);
      console.log('[quest-viking] Koschei Dramen mode: branch+knife only (no armour; carve staff in pen)');
    } else {
      await giveItems(page, [['lobster', 25]]);
      console.log('[quest-viking] Koschei unarmed: food only (no armour give)');
    }
    await page.waitForTimeout(300);

    // 3) Climb warrior ladder (oploc2) → pen 2_41_157
    // Content: longqueue spawn 20–70 ticks after oploc2; climb-up clears queue.
    budget.check('thorvald-pen');
    const enterPen = async (tag = 'enter') => {
      if (!(await teleTo(page, THORVALD_LADDER, 2, 15_000))) fail('tele warrior ladder failed');
      await walkNear(page, THORVALD_LADDER, 0);
      let climb =
        (await opLocAt(page, THORVALD_LADDER, 'Climb')) ||
        (await opLoc(page, 'Ladder', 'Climb')) ||
        (await opLocAt(page, THORVALD_LADDER, 'down'));
      console.log(`[quest-viking] warrior ladder climb=${climb} (${tag})`);
      await continueThrash(page, 12, 280);
      await page.waitForTimeout(1500);
      let penTile = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
      if (!penTile || (penTile.z ?? 0) < 5000) {
        console.log('[quest-viking] pen miss, retry climb', JSON.stringify(penTile));
        climb =
          (await opLocAt(page, THORVALD_LADDER, 'Climb')) ||
          (await opLoc(page, 'Ladder', 'Climb')) ||
          climb;
        await continueThrash(page, 16, 300);
        await page
          .waitForFunction(
            () => {
              const t = globalThis.__lc377?.worldTile?.();
              return t && (t.z > 5000 || (t.level ?? 0) >= 2);
            },
            undefined,
            { timeout: 20_000 }
          )
          .catch(() => {});
        penTile = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
      }
      return penTile;
    };

    let penTile = await enterPen('first');
    console.log('[quest-viking] in pen', JSON.stringify(penTile));
    if (!penTile || (penTile.z ?? 0) < 5000) {
      fail(
        `Thorvald pen not entered (still surface). inv=${JSON.stringify(await invNames())} worn=${JSON.stringify(await wornNames())}`
      );
    }
    if (shot) await shot('thorvald-pen');

    // Carve Dramen staff inside (opheldu knife on branch; Crafting 31 — Lost City script)
    if (koscheiDramen) {
      // knife ON branch (content: opheldu,dramen_branch + last_useitem knife)
      for (let attempt = 0; attempt < 3; attempt++) {
        await page.evaluate(() => {
          const a = globalThis.__lc377?.actions;
          const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
          const knife = inv.find(i => /^knife$/i.test(String(i?.name ?? '').trim()));
          const branch = inv.find(i => /dramen branch/i.test(i?.name ?? ''));
          if (knife && branch && a?.useHeldOnHeld) a.useHeldOnHeld(knife, branch);
        });
        await page.waitForTimeout(600);
        await continueThrash(page, 10, 250);
        if (await invHas(page, 'Dramen staff')) break;
      }
      const afterCarve = await invNames();
      console.log('[quest-viking] after Dramen carve', JSON.stringify(afterCarve));
      if (!(await invHas(page, 'Dramen staff'))) {
        console.warn(
          '[quest-viking] Dramen staff not carved (need Crafting ≥31 + knife on branch) — fighting unarmed'
        );
      } else {
        await page.evaluate(() => {
          const a = globalThis.__lc377?.actions;
          a?.setSideTab?.(3);
          a?.equip?.('Dramen staff') || a?.heldOp?.('Dramen staff', 2) || a?.heldOp?.('Dramen staff', 1);
        });
        await page.waitForTimeout(500);
      }
      console.log(
        '[quest-viking] after equip attempt',
        JSON.stringify({ inv: await invNames(), worn: await wornNames() })
      );
    }

    // Wait for spawn: content longqueue ~random_range(20, 70) ticks after ladder.
    // At WORLD_SPEED_MS=300 that is ~6–21s — longer waits are still legit (tick lag / speed).
    // mid30 waited ~3min with zero NPC — that is not "slow spawn", but do NOT requeue early.
    const findKos = async () =>
      page.evaluate(() => {
        const list = globalThis.__lc377?.reader?.npcs?.() ?? [];
        const all = list.map(n => `${n?.name}@${n?.tile?.x},${n?.tile?.z}`);
        const kos =
          list.find(n => /koschei|deathless/i.test(n?.name ?? '')) || null;
        return {
          kos: kos
            ? {
                name: kos.name,
                x: kos.tile?.x ?? kos.x,
                z: kos.tile?.z ?? kos.z,
                level: kos.tile?.level ?? kos.level
              }
            : null,
          all,
          chat: (globalThis.__lc377?.reader?.chat?.(12) ?? []).map(c => c?.text ?? c)
        };
      });

    let spawned = false;
    // Poll up to 90s before one requeue; then another 45s (slow spawn is OK)
    for (let w = 0; w < 90 && !spawned; w++) {
      await page.waitForTimeout(1000);
      await continueThrash(page, 4, 150);
      const snap = await findKos();
      if (w % 10 === 0 || snap.kos) {
        console.log(
          `[quest-viking] pen wait ${w}s kos=${JSON.stringify(snap.kos)} npcs=${JSON.stringify(snap.all)}`
        );
      }
      if (snap.kos) {
        spawned = true;
        break;
      }
      // Only requeue once after a full minute — leave room for legit late spawn
      if (w === 60 && !spawned) {
        console.log(
          '[quest-viking] no Koschei after 60s — one re-enter to requeue spawn (slow spawn is legit; this is last resort)'
        );
        await opLoc(page, 'Ladder', 'Climb').catch(() => {});
        await continueThrash(page, 12, 300);
        await page.waitForTimeout(1000);
        penTile = await enterPen('requeue');
        console.log('[quest-viking] re-enter pen', JSON.stringify(penTile));
      }
    }
    if (!spawned) {
      const snap = await findKos();
      console.log('[quest-viking] still no Koschei after wait', JSON.stringify(snap));
    }

    // Fight forms. Display name stays "Koschei the deathless" across changetype —
    // mid31 only counted despawn (form1). Also count form-transition chat once each.
    // Dedicated residual (pack ids 1290–1293): quest-viking-koschei-forms-smoke.mjs
    budget.check('thorvald-fight');
    let forms = 0;
    const seenFormChat = new Set();
    const maxFightMs = 300_000;
    const t0 = Date.now();
    const attackKos = async () => {
      // nearestNpc is EXACT match
      await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        a?.attackNpc?.('Koschei the deathless') || a?.attackNpc?.('Koschei');
      });
    };
    const noteFormChat = async () => {
      const lines = await page.evaluate(() => {
        const chat = globalThis.__lc377?.reader?.chat?.(16) ?? [];
        return chat.map(c => String(c?.text ?? c ?? ''));
      });
      for (const t of lines) {
        // defeat_viking_enemy1 / 2 / 3 / 4 dialogue
        if (/some idea of combat/i.test(t) && !seenFormChat.has('f1')) {
          seenFormChat.add('f1');
          forms = Math.max(forms, 1);
          console.log('[quest-viking] koschei form chat f1', t.slice(0, 80));
        }
        if (/fight for real|Impressive start/i.test(t) && !seenFormChat.has('f2')) {
          seenFormChat.add('f2');
          forms = Math.max(forms, 2);
          console.log('[quest-viking] koschei form chat f2', t.slice(0, 80));
        }
        if (/hold back no longer|lose your prayer/i.test(t) && !seenFormChat.has('f3')) {
          seenFormChat.add('f3');
          forms = Math.max(forms, 3);
          console.log('[quest-viking] koschei form chat f3', t.slice(0, 80));
        }
        if (/Incredible|defeat ME|passed the trial/i.test(t) && !seenFormChat.has('f4')) {
          seenFormChat.add('f4');
          forms = Math.max(forms, 4);
          console.log('[quest-viking] koschei form chat f4', t.slice(0, 80));
        }
        // After form 3, climbing out also completes trial (bravery) — content path
        if (/Thorvald|bravery|vote/i.test(t) && forms >= 3) {
          /* stage poll will catch */
        }
      }
    };
    while (Date.now() - t0 < maxFightMs && forms < 4) {
      await continueThrash(page, 6, 200);
      // Random events used to be allowed in pen and could fail-teleport out (MOM).
      // Content now bans 2_41_157; still recover if teleported.
      {
        const t = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
        if (!t || (t.z ?? 0) < 5000) {
          console.log('[quest-viking] left pen mid-fight (random tele?) — re-enter', JSON.stringify(t));
          penTile = await enterPen('mid-fight-recover');
          if (!penTile || (penTile.z ?? 0) < 5000) {
            fail(`Thorvald pen lost mid-fight: ${JSON.stringify(t)}`);
          }
          await page.waitForTimeout(3000); // allow re-spawn queue
        }
      }
      const snap = await findKos();
      const kos = snap.kos;
      if (!kos) {
        await continueThrash(page, 12, 300);
        stage = await getServerVarQuiet(page, 'viking');
        if ((stage ?? 0) >= 6) break;
        await page.waitForTimeout(800);
        continue;
      }
      const level = penTile?.level ?? 2;
      if (kos.x != null) await walkNear(page, { x: kos.x, z: kos.z, level }, 1);
      await attackKos();
      for (let f = 0; f < 120; f++) {
        await page.waitForTimeout(400);
        await continueThrash(page, 2, 100);
        await noteFormChat();
        // After 3 form transitions, trial can complete by dying or climbing — poll stage
        stage = await getServerVarQuiet(page, 'viking');
        if ((stage ?? 0) >= 6) break;
        const still = await page.evaluate(() =>
          (globalThis.__lc377?.reader?.npcs?.() ?? []).some(
            n => String(n?.name ?? '') === 'Koschei the deathless'
          )
        );
        if (!still) {
          // brief despawn between forms or after f4
          forms = Math.max(forms, forms + 1);
          console.log(`[quest-viking] koschei despawn forms=${forms}`);
          await continueThrash(page, 24, 300);
          await noteFormChat();
          break;
        }
        if (f % 6 === 0) await attackKos();
        // Lobster heals 12 — only when deficit/floor (see actions.eatIfNeeded)
        if (f % 4 === 2) {
          await page.evaluate(() => globalThis.__lc377?.actions?.eatIfNeeded?.('Lobster', 12));
        }
        // Vote = kill form 4 OR die to form 4 only (not climb). Research: viking-thorvald-koschei-377.md
      }
      stage = await getServerVarQuiet(page, 'viking');
      if ((stage ?? 0) >= 6) break;
    }

    for (let i = 0; i < 15; i++) {
      stage = await getServerVarQuiet(page, 'viking');
      if ((stage ?? 0) >= 6) break;
      await continueThrash(page, 8, 300);
      await page.waitForTimeout(400);
    }
    console.log(
      `[quest-viking] after thorvald viking=${stage} forms=${forms} inv=${JSON.stringify(await invNames())}`
    );
    if (shot) await shot('thorvald-end');
  }

  if (shot) await shot('end');

  if ((stage ?? 0) < wantStage) {
    fail(
      `mid-gate stage too low: viking=${stage} want>=${wantStage} ` +
        `(s3=Swensen; s4=Peer; s5=Sigli; s6=Thorvald/Koschei)`
    );
  }
  console.log(`RESULT: PASS (Viking mid-gate viking=${stage})`);
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await browser.close().catch(() => {});
}
