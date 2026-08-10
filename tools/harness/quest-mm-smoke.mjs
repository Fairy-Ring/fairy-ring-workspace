#!/usr/bin/env node
/**
 * Monkey Madness soft mids (vertical slices after greegree).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-mm-smoke.mjs
 *   MM_FROM=0 …   # soft GT+Tree → product Narnode start mm_main≥1
 *   MM_FROM=1 …   # soft mm_main 1 + seal → product shipyard gate seal → ≥2 (+ Caranock)
 *   MM_FROM=2 …   # soft mm_main 2 + caranock done → product Narnode return → orders
 *   MM_FROM=3 …   # soft orders + narnode_received → product Daero hand orders → ≥3
 *   MM_FROM=4 …   # soft daero 3 → product Leave hangar + intro → started_reinit ≥5
 *   MM_FROM=5 …   # soft daero 5 only → product open panel + slide solve → reinit_complete ≥6
 *   MM_FROM=6 …   # soft daero 6 → product hangar Daero talk → daero_complete ≥7
 *   MM_FROM=7 …   # soft daero 7 → product Waydar Yes fly → Crash Island
 *   MM_FROM=8 …   # soft crash tele + daero7 → product Waydar intro → mm_waydar≥1
 *   MM_FROM=9 …   # soft waydar1 + seal → product Lumdo story → mm_lumdo≥2
 *   MM_FROM=10 …  # soft lumdo2 + waydar1 → product ch2 cutscene → mm_main≥3
 *   MM_FROM=11 …  # soft main3 + atoll tele → product Talk Garkor → mm_garkor≥2
 *   MM_FROM=12 …  # soft garkor2 + zooknock tele → product Talk Zooknock → mm_zooknock≥5
 *   MM_FROM=13 …  # soft need_items + mats → product use-on Zooknock → greegree + enchanted bar
 *   MM_FROM=14 …  # soft garkor2 + give normal greegree → equip + product Talk Garkor → ≥4 seek_alliance
 *   MM_FROM=15 …  # soft enchanted bar+mould+wool → product firewall smith + string → M'speak amulet
 *   MM_FROM=16 …  # soft garkor4 + greegree+amulet worn → product Talk throne → mm_awowogei≥1
 *   MM_FROM=17 …  # soft awo1 + amulet → product zoo Talk captive → backpack; + greegree → product throne hand-in ≥2
 *   MM_FROM=18 …  # soft awo2 + garkor4 + greegree → product Talk Garkor → learned_plan ≥5 (+ mm_main≥5 thin ch4)
 *   MM_FROM=19 …  # soft garkor5 → product Talk Garkor plan → joined_10th ≥6 + mm_sigil
 *   MM_FROM=20 …  # soft garkor6+main5 + sigil → product Wear → battle → kill demon → mm_main≥6
 *   MM_FROM=21 …  # soft mm_main6 → product Talk Narnode report+reward → mm_main≥9 complete
 *
 * Soft: grandtree complete, treequest complete (hard deps for authentic start).
 * Soft ≠ full MM. Greegree already proven separately.
 *
 * @see docs/research/mm-crash-island-ch2-377.md
 * @see docs/research/port-quest-mm-289-source-hunt.md
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
  setStats,
  setWorldSpeed,
  teleTo,
  waitSceneReady
} from './lib/harness.mjs';
import { solveFromInvItems } from './lib/mm-reinit-solver.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'mm');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';
const fromStage = Number(process.env.MM_FROM || 0) || 0;

/** King Narnode — m38_54 `0 34 41: 670` → 2466,3497 L0 */
const NARNODE = { x: 2466, z: 3497, level: 0 };
/** Daero Grand Tree bar — m38_54 `1 52 30: 1407` → 2484,3486 L1 */
const DAERO_GT = { x: 2484, z: 3486, level: 1 };
/** Hangar tele target — `0_37_154_25_36` (daero_move_hangar) */
const HANGAR = { x: 37 * 64 + 25, z: 154 * 64 + 36, level: 0 };
/** bunker_controlpanal — m37_154 `0 26 27: 4871` → 2394,9883 */
const CONTROL_PANEL = { x: 37 * 64 + 26, z: 154 * 64 + 27, level: 0 };
/** Post-reinit hangar stand near Daero — m41_70 `0 24 34: 1407` → 2648,4514 */
const FINAL_HANGAR_DAERO = { x: 41 * 64 + 24, z: 70 * 64 + 34, level: 0 };
/** Waydar fly dest — `0_45_42_13_37` (waydar_fly_crash_island) */
const CRASH_ISLAND = { x: 45 * 64 + 13, z: 42 * 64 + 37, level: 0 };
/** Crash stand near Waydar+Lumdo — m45_42 ~ between spawns */
const CRASH_STAND = { x: 45 * 64 + 14, z: 42 * 64 + 38, level: 0 }; // 2894,2726
/** Lumdo spawn stand */
const LUMDO_STAND = { x: 45 * 64 + 11, z: 42 * 64 + 36, level: 0 }; // 2891,2724
/** ch2 end / atoll boat land — m43_42 */
const ATOLL_LAND = { x: 43 * 64 + 49, z: 42 * 64 + 19, level: 0 }; // 2801,2707
/** Garkor Ape Atoll — m43_43 `0 53 10: 1411` mm_garkor_aa → 2805,2762 */
const GARKOR = { x: 43 * 64 + 53, z: 43 * 64 + 10, level: 0 };
/**
 * Zooknock NPC — m43_142 **NPC** `0 52 57: 1425` mm_zooknock_aa → **2804,9145**.
 * Not m43_143; not LOC 24,42 on m43_143 (id 1425 in LOC section = wall misread).
 * Stand one south of NPC (free floor; no cavewall).
 */
const ZOOKNOCK_NPC = { x: 43 * 64 + 52, z: 142 * 64 + 57, level: 0 }; // 2804,9145
const ZOOKNOCK_STAND = { x: 43 * 64 + 52, z: 142 * 64 + 56, level: 0 }; // 2804,9144
/**
 * Temple wall of flame (mm_iban_firewall) — m43_143 pack locs encode **level 1**,
 * but client scene places them on **L0** (diag 2026-08-10: wallsFw L1=[], L0 has 4765).
 * World ~2810,9191. Stand on **L0** so minusedlevel matches getWall.
 */
const TEMPLE_FIREWALL_STAND = { x: 43 * 64 + 58, z: 143 * 64 + 39, level: 0 }; // 2810,9191 L0
/** Awowogei throne m43_43 `0 50 13: 4771` → 2802,2765; advisors 2801/2804,2764 */
const AWO_THRONE = { x: 43 * 64 + 50, z: 43 * 64 + 13, level: 0 }; // 2802,2765
const AWO_STAND = { x: 43 * 64 + 50, z: 43 * 64 + 12, level: 0 }; // 2802,2764
/** Ardougne zoo mm_zoo_monkey m40_51 `0 41 12: 1463` → 2601,3276 */
const ZOO_MONKEY = { x: 40 * 64 + 41, z: 51 * 64 + 12, level: 0 }; // 2601,3276
const ZOO_STAND = { x: 40 * 64 + 41, z: 51 * 64 + 11, level: 0 }; // 2601,3275
/**
 * Tunnel combat floor: Monkey Zombie vislevel **82 / 98 / 129**.
 * Rune platebody needs soft Dragon Slayer (`dragonquest ≥ 10`).
 */
const ZOOK_TUNNEL_STATS = {
  attack: 90,
  strength: 90,
  defence: 85,
  hitpoints: 99,
  prayer: 43
};
const ZOOK_GEAR_GIVE = [
  ['rune_scimitar', 1],
  ['rune_platebody', 1],
  ['rune_platelegs', 1],
  ['rune_kiteshield', 1]
];
const ZOOK_FOOD_GIVE = [['lobster', 10]];
const ZOOK_EQUIP_NAMES = [
  'Rune scimitar',
  'Rune platebody',
  'Rune platelegs',
  'Rune kiteshield'
];

const readTile = page =>
  page.evaluate(() => {
    const r = globalThis.__lc377?.reader;
    return r?.worldTile?.() ?? globalThis.__lc377?.worldTile?.() ?? r?.tile?.() ?? null;
  });

/** Equip kit from inv (host prep). */
async function equipNamedKit(page, names) {
  return page.evaluate(async nameList => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    const sleep = ms => new Promise(res => setTimeout(res, ms));
    const wornNames = () =>
      (r?.equipment?.() ?? []).map(i => String(i?.name ?? '')).filter(Boolean);
    a?.setSideTab?.(3);
    await sleep(200);
    const steps = [];
    for (const n of nameList) {
      const short = n.toLowerCase().replace(/^rune\s+/, '').replace(/^adamant\s+/, '');
      if (wornNames().some(w => w.toLowerCase().includes(short))) {
        steps.push({ n, ok: true, already: true });
        continue;
      }
      let ok = false;
      for (let attempt = 0; attempt < 3 && !ok; attempt++) {
        a?.setSideTab?.(3);
        await sleep(80);
        a?.equip?.(n);
        await sleep(700);
        ok = wornNames().some(
          w => w.toLowerCase().includes(short) || w.toLowerCase().includes(n.toLowerCase())
        );
      }
      steps.push({ n, ok, worn: wornNames() });
    }
    return { worn: wornNames(), steps };
  }, names);
}

/**
 * Shipyard outer side of gate — m46_47 fencegate `0 1 33: 2438` → 2945,3041.
 * Content: gate path only if coordx(player) < loc x and shipyard guard nearby.
 */
const SHIPYARD_OUTSIDE = { x: 2943, z: 3040, level: 0 };
const SHIPYARD_GATE_LOC = { x: 2945, z: 3041 };
/** Caranock — m46_47 `0 12 17: 1427` → 2956,3025 L0 */
const CARANOCK = { x: 2956, z: 3025, level: 0 };

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
          a.chooseOption?.([opts[pick]]);
        } else {
          a.continueDialog?.();
          a.dismissModalMessage?.();
        }
        await new Promise(res => setTimeout(res, 380));
        if ((r.modals?.()?.chat ?? -1) === -1 && i > 8) break;
      }
      return { ok };
    },
    [npcName, prefer, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[mm] ${base} user=${username} from=${fromStage} (headed default)`);

  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`mm_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }

  await mainlandAccount(page, username, password);
  await waitSceneReady(page, 45_000);
  await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

  // Soft deps — Grand Tree + Tree Gnome Village (289 start gate)
  console.log('[mm] SOFT setvar grandtree 160 + treequest 9');
  await cheatQuiet(page, 'setvar grandtree 160', 500);
  await cheatQuiet(page, 'setvar treequest 9', 500);

  const gt = await getServerVarQuiet(page, 'grandtree');
  const tree = await getServerVarQuiet(page, 'treequest');
  console.log(`[mm] prep grandtree=${gt} treequest=${tree}`);
  if (Number(gt) !== 160) fail(`soft grandtree failed got ${gt}`);
  if (Number(tree) !== 9) fail(`soft treequest failed got ${tree}`);

  let stage = 0;

  // --- Soft complete: soft defeated_demon → product Narnode report+reward → mm_main≥9 ---
  if (fromStage === 21) {
    console.log('[mm] SOFT mm_main=6 → product Talk Narnode → complete ≥9');
    await cheatQuiet(page, 'setvar mm_main 6', 300); // defeated_demon
    await cheatQuiet(page, 'setvar mm_garkor 6', 200);
    await cheatQuiet(page, 'setvar mm_awowogei 2', 200);
    await giveItems(page, [['mm_sigil', 1], ['coins', 1]]).catch(() => {}); // sigil for show; free inv for reward
    await page.waitForTimeout(400);

    console.log('[mm] product tele Narnode', NARNODE);
    if (!(await teleTo(page, NARNODE, 2, 25_000))) fail('tele Narnode failed');
    await waitSceneReady(page, 15_000);

    let mainVb = 0;
    for (let attempt = 0; attempt < 6; attempt++) {
      const open = await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        const r = globalThis.__lc377?.reader;
        if (r?.dialogOpen?.() || r?.modalMessage?.()) return { already: true, op: false };
        const n = (r?.npcs?.() ?? []).find(x => /narnode|king/i.test(String(x?.name ?? '')));
        return {
          already: false,
          op: !!(a?.talkNpc?.('King Narnode') || a?.talkNpc?.('Narnode') || (n && a?.npcOp?.(n.index, 1)))
        };
      });
      console.log(`[mm] narnode complete open attempt=${attempt}`, open);
      await page.waitForTimeout(900);
      for (let step = 0; step < 60; step++) {
        const st = await page.evaluate(() => {
          const a = globalThis.__lc377?.actions;
          const r = globalThis.__lc377?.reader;
          const dlg = !!r?.dialogOpen?.();
          const mm = r?.modalMessage?.() || null;
          const body = typeof r?.chatBodyText === 'function' ? r.chatBodyText() : '';
          if (dlg || mm) a?.advanceDialog?.() || a?.continueDialog?.() || a?.dismissModalMessage?.();
          return { dlg, mm: mm ? String(mm).slice(0, 40) : null, body: String(body).slice(0, 90) };
        });
        if (step < 3 || /finished|reward|diamond|sigil|complete|Treasury/i.test(st.body || '')) {
          console.log(`[mm] narnode step=${step}`, st);
        }
        await page.waitForTimeout(380);
        if (!st.dlg && !st.mm && step > 5) break;
      }
      mainVb = await getServerVarQuiet(page, 'mm_main');
      if (Number(mainVb) >= 9) break;
    }
    mainVb = await getServerVarQuiet(page, 'mm_main');
    const inv = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.inventory?.() ?? []).map(i => ({ id: i?.id, name: i?.name }))
    );
    console.log(`[mm] after Narnode mm_main=${mainVb} inv=${JSON.stringify(inv)}`);
    if (shot) await shot('after-mm-complete');
    if (!(Number(mainVb) >= 9)) {
      fail(`MM complete FAIL: mm_main=${mainVb} want≥9 (complete)`);
    }
    console.log(
      `RESULT: PASS (MM soft complete mm_main=${mainVb} ≥9; product Narnode report+reward; SOFT defeated_demon)`
    );
    process.exit(0);
  }

  // --- Final battle: soft joined_10th + sigil → product Wear → magic demon → mm_main≥6 ---
  // Era: d scim is MM *reward* — cannot equip pre-complete. Soft magic kit (Fire Wave).
  if (fromStage === 20) {
    console.log('[mm] SOFT garkor6+main5+sigil → product Wear → Fire Wave Jungle Demon ≥6');
    // Pick up freshly packed mm_demon.rs2 (squad residual) without full engine restart
    await cheatQuiet(page, 'reload', 800);
    await cheatQuiet(page, 'setvar mm_main 5', 300); // completed_ch3
    await cheatQuiet(page, 'setvar mm_garkor 6', 300); // joined_10th
    await cheatQuiet(page, 'setvar mm_awowogei 2', 200);
    await cheatQuiet(page, 'setvar mm_zooknock 6', 200);
    // Demon vislevel 195 — soft magic kit (d scim is MM *reward*, not pre-complete).
    // Mystic set + mystic fire staff + Fire Wave runes (air/blood/death; staff provides fire).
    await setStats(page, {
      magic: 99,
      defence: 80,
      hitpoints: 99,
      prayer: 99, // Protect from Melee = 43; keep points for long fight
      attack: 40,
      strength: 40
    }).catch(() => {});
    // Pack debugnames: airrune/bloodrune/firerune (not air_rune). Fire Wave = 5 air + 7 fire + 1 blood.
    // Mystic fire staff supplies fire; still seed firerune in case staff unequipped mid-fight.
    // Full mystic + amulet of magic — unpack mystic robes were missing combat params
    // (only staff +10); residual filled era mage bonuses. Demon magic 170 / mdef 50.
    await giveItems(page, [
      ['mm_sigil', 1],
      ['mystic_fire_staff', 1],
      ['mystic_hat', 1],
      ['mystic_robe_top', 1],
      ['mystic_robe_bottom', 1],
      ['mystic_gloves', 1],
      ['mystic_boots', 1],
      ['amulet_of_magic', 1],
      ['airrune', 500],
      ['bloodrune', 400], // Fire Wave = 1 blood each; long fight vs 170 HP
      ['firerune', 400],
      ['shark', 20] // food; death = FAIL mid (no force-TP)
    ]).catch(() => {});
    await page.waitForTimeout(500);

    // Wear sigil first (product tele) — mystic kit after landing (rhand free for staff)
    console.log('[mm] product Wear 10th squad sigil (tele battle)');
    const wearSig = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      return {
        ok: !!(
          a?.heldOp?.('10th squad sigil', 2) ||
          a?.heldOp?.('sigil', 2) ||
          a?.equip?.('10th squad sigil') ||
          a?.equip?.('sigil')
        )
      };
    });
    console.log('[mm] wear sigil', wearSig);
    await page.waitForTimeout(2500);
    // Drain garkor chat if any
    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => {
        globalThis.__lc377?.actions?.advanceDialog?.() ||
          globalThis.__lc377?.actions?.continueDialog?.() ||
          globalThis.__lc377?.actions?.dismissModalMessage?.();
      });
      await page.waitForTimeout(300);
    }
    await waitSceneReady(page, 20_000);

    let tile = await readTile(page);
    console.log(`[mm] after sigil tele tile=${JSON.stringify(tile)}`);
    // Fight stand is the **L1 platform** (289 SW corner `1_42_143_14_21` ≈ 2702,9173).
    // Stay on the platform — do not soft-tele to centre/L0 as a “fix” (those are wrong floors/stands).
    // L0 of m42_143 is warehouse spiders only; 10th squad + demon are scripted on L1 platform.
    let onArena =
      tile && tile.x >= 2688 && tile.x <= 2751 && tile.z >= 9152 && tile.z <= 9215 && (tile.level ?? 1) === 1;
    if (!onArena) {
      console.warn('[mm] product tele miss — soft tele SW **platform** L1 (1_42_143_14_21)');
      await cheatQuiet(page, 'tele 1,42,143,14,21', 500);
      await waitSceneReady(page, 15_000);
      tile = await readTile(page);
      onArena = true;
    }
    const dumpNpcs = async label => {
      const snap = await page.evaluate(() => {
        const r = globalThis.__lc377?.reader;
        const client = globalThis.__lc377?.client;
        const t = r?.tile?.() ?? null;
        // Reader skips unresolved types — also dump raw slots for missing names (mm_demon hunt)
        const raw = [];
        try {
          const self = client?.localPlayer;
          if (self && client?.npc && client?.npcIds) {
            for (let i = 0; i < (client.npcCount | 0); i++) {
              const index = client.npcIds[i];
              const npc = client.npc[index];
              if (!npc) continue;
              const typeId = npc.type?.id ?? npc.type ?? -1;
              raw.push({
                index,
                typeId: typeId | 0,
                name: npc.type?.name ?? null
              });
            }
          }
        } catch (_) {}
        const npcs = (r?.npcs?.() ?? []).map(n => ({
          name: n?.name,
          id: n?.id,
          d: n?.distance,
          tile: n?.tile
        }));
        return {
          tile: t,
          minusedlevel: client?.minusedlevel,
          npcs,
          raw: raw.slice(0, 24)
        };
      });
      console.log(`[mm] ${label}`, JSON.stringify(snap));
      return snap;
    };
    await dumpNpcs('cast after product tele (platform L1 — squad + Jungle Demon)');
    // Soft rail: product Wear already ran. One soft ~npc only if product spawn missing
    // (era map_findsquare softlock). Never re-spawn mid-fight (dual demons) and never
    // soft-tele after death — death = FAIL this mid.
    let hasDemon = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.npcs?.() ?? []).some(n => /jungle.?demon/i.test(String(n?.name ?? '')))
    );
    if (!hasDemon) {
      console.warn(
        '[mm] SOFT no Jungle Demon after product spawn (era softlock-class) — one ~npc mm_demon on platform'
      );
      for (let i = 0; i < 8; i++) {
        await page.evaluate(() => {
          globalThis.__lc377?.actions?.advanceDialog?.() ||
            globalThis.__lc377?.actions?.continueDialog?.() ||
            globalThis.__lc377?.actions?.dismissModalMessage?.();
        });
        await page.waitForTimeout(200);
      }
      await cheatQuiet(page, '~npc mm_demon', 600);
      await page.waitForTimeout(1000);
      hasDemon = await page.evaluate(() =>
        (globalThis.__lc377?.reader?.npcs?.() ?? []).some(n =>
          /jungle.?demon/i.test(String(n?.name ?? ''))
        )
      );
      await dumpNpcs(`cast after soft ~npc hasDemon=${hasDemon}`);
      if (!hasDemon) {
        fail('MM demon FAIL: no Jungle Demon after product Wear + one soft ~npc (spawn softlock)');
      }
    }
    if (shot) await shot('after-sigil-tele');

    // Mystic kit on platform (sigil on front; fire staff rhand for runes + autocast)
    await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      for (const n of [
        'Mystic hat',
        'Mystic robe top',
        'Mystic robe bottom',
        'Mystic gloves',
        'Mystic boots',
        'Amulet of magic',
        'Mystic fire staff',
        'mystic fire staff',
        'Staff of fire'
      ]) {
        a?.equip?.(n) || a?.heldOp?.(n, 2);
      }
    });
    await page.waitForTimeout(500);
    // Prefer client packets for combat UI (if_button / castOnNpc) — not setvar fakes.
    // Autocast Fire Wave: combat_staff_2:auto_choose (353) → staff_spells:ssb15 (1845).
    await page.waitForTimeout(400); // let p_delay/chat finish so p_finduid canAccess
    const softAutocastFireWave = async () => {
      const r = await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        a?.setSideTab?.(0); // ^tab_combat_options — staff combat styles
        const choose = !!(a?.ifButton?.(353)); // combat_staff_2:auto_choose
        return { choose };
      });
      await page.waitForTimeout(500);
      const pick = await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        // staff_spells replaces side tab 0; ssb15 = fire_wave
        const fire = !!(a?.ifButton?.(1845));
        return { fire };
      });
      await page.waitForTimeout(400);
      console.log('[mm] SOFT autocast Fire Wave if_button', { ...r, ...pick });
      return !!(pick.fire || r.choose);
    };
    await softAutocastFireWave();

    // Protect from Melee — product if_button only (prayer_activate → headicon_add).
    // if_button toggles: only click when prayer14 is off.
    await cheatQuiet(page, 'setstat prayer 99', 200);
    const softProtectMelee = async reason => {
      await cheatQuiet(page, 'setstat prayer 99', 150);
      let on = Number(await getServerVarQuiet(page, 'prayer14'));
      if (on === 1) {
        console.log(`[mm] Protect from Melee already on (${reason})`);
        return true;
      }
      const click = await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        const r = globalThis.__lc377?.reader;
        const client = globalThis.__lc377?.client;
        a?.setSideTab?.(5); // ^tab_prayer
        const root = client?.sideIcon?.[5] ?? -1;
        // 5623=prayer:prayer_protectfrommelee
        let ok = !!(a?.ifButton?.(5623));
        if (!ok && root >= 0 && r?.buttonByText) {
          for (const lab of ['Protect from Melee', 'protect from melee', 'Melee']) {
            const com = r.buttonByText(root, lab);
            if (com != null && com !== -1 && a?.ifButton?.(com)) {
              ok = true;
              break;
            }
          }
        }
        return { ok, root, activeIcon: client?.activeIcon };
      });
      await page.waitForTimeout(400);
      on = Number(await getServerVarQuiet(page, 'prayer14'));
      console.log(`[mm] SOFT Protect from Melee (${reason})`, { click, prayer14: on });
      return on === 1;
    };
    if (!(await softProtectMelee('pre-fight'))) {
      console.warn(
        '[mm] SOFT Protect from Melee if_button did not stick — no setvar fallback (packet path only)'
      );
    }

    // Product fight proof on platform. Death / leave arena = FAIL (soft rail mid gate).
    const onMmArena = t =>
      t &&
      t.x >= 2688 &&
      t.x <= 2751 &&
      t.z >= 9152 &&
      t.z <= 9215 &&
      (t.level ?? 0) === 1;
    let mainVb = 0;
    let castDiagOnce = false;
    // Fire Wave maxhit 20 vs demon HP 170 → need many solid hits (authentic). Soft thrash
    // extends window; do not invent higher maxhit. Prefer autocast Attack (product combat
    // loop at ~5t) over spam castOnNpc (action_delay no-ops).
    const tickMs = Math.max(20, Number(process.env.WORLD_SPEED_MS) || 300);
    const CAST_MS = tickMs * 5; // ~one spell per attackrate
    const MAX_CASTS = Math.max(120, Number(process.env.MM_DEMON_CASTS) || 220);
    console.log(
      `[mm] fight budget casts=${MAX_CASTS} castMs=${CAST_MS} (Fire Wave max 20 vs ~170 HP)`
    );
    for (let attempt = 0; attempt < MAX_CASTS; attempt++) {
      tile = await readTile(page);
      if (!onMmArena(tile)) {
        fail(
          `MM demon FAIL: left arena (death/tele) tile=${JSON.stringify(tile)} — soft rail does not force-TP; mid failed`
        );
      }

      const castInfo = await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        const r = globalThis.__lc377?.reader;
        const client = globalThis.__lc377?.client;
        a?.advanceDialog?.() || a?.continueDialog?.() || a?.dismissModalMessage?.();
        // Eat only when hurt enough for a shark (+20). Spam Eat cancels spellcasts.
        const hp = r?.hitpoints?.() ?? { effective: 99, base: 99 };
        const cur = hp.effective | 0;
        const max = Math.max(1, hp.base | 0);
        if (cur > 0 && cur <= max - 15) {
          a?.heldOp?.('Shark', 1); // Eat
        }
        const demons = (r?.npcs?.() ?? []).filter(x =>
          /jungle.?demon/i.test(String(x?.name ?? ''))
        );
        const n = demons[0];
        if (!n) {
          return {
            ok: false,
            reason: 'no-demon',
            demonCount: 0,
            magicTab: client?.sideIcon?.[6] ?? -1,
            activeIcon: client?.activeIcon ?? -1
          };
        }
        // Primary: Attack with product autocast (staff combat loop) — continuous DPS
        const atk = !!(a?.npcOp?.(n.index, 2));
        // Secondary: click-cast Fire Wave if autocast not armed
        let cast = false;
        if (!atk) {
          a?.setSideTab?.(6);
          for (const spell of ['Fire Wave', 'Fire wave', 'fire_wave']) {
            if (a?.castOnNpc?.(spell, n.index)) {
              cast = true;
              break;
            }
          }
        }
        return {
          ok: atk || cast,
          path: atk ? 'attack-autocast' : cast ? 'castOnNpc' : 'none',
          demonCount: demons.length,
          index: n.index,
          d: n.distance
        };
      });
      if (!castDiagOnce || attempt % 10 === 0) {
        castDiagOnce = true;
        console.log(`[mm] cast t=${attempt}`, castInfo);
      }
      await page.waitForTimeout(CAST_MS);

      if (attempt % 8 === 0) {
        mainVb = await getServerVarQuiet(page, 'mm_main');
        const snap = await page.evaluate(() => {
          const r = globalThis.__lc377?.reader;
          const demons = (r?.npcs?.() ?? []).filter(n =>
            /jungle.?demon/i.test(String(n?.name ?? ''))
          );
          return {
            demonCount: demons.length,
            npcs: (r?.npcs?.() ?? []).map(n => n?.name).filter(Boolean).slice(0, 12),
            worn: (r?.equipment?.() ?? []).map(i => i?.name).filter(Boolean),
            inv: (r?.inventory?.() ?? []).map(i => i?.name).filter(Boolean).slice(0, 12),
            tile: r?.tile?.() ?? null
          };
        });
        console.log(`[mm] demon magic t=${attempt} mm_main=${mainVb}`, snap);
        if (Number(mainVb) >= 6) break;
        // Thrash world may retain prior-run mm_demon (duration 2000). Soft rail does not
        // mass-despawn. Prefer SMOKE_MODE=proof / engine restart for a clean arena.
        if (snap.demonCount > 1) {
          console.warn(
            `[mm] WARN ${snap.demonCount} Jungle Demons (leftover thrash spawns?); casting nearest only`
          );
        }
        // Keep Protect from Melee via product if_button (headicon) — never bare setvar prayer14
        await softProtectMelee(`t=${attempt}`);
        // Rune inventory must stay non-empty or casts are no-ops (members spell + runes)
        if (!snap.inv.some(n => /rune|air|blood|fire/i.test(String(n)))) {
          console.warn('[mm] SOFT re-seed airrune/bloodrune/firerune (inv had no runes)');
          await giveItems(page, [
            ['airrune', 200],
            ['bloodrune', 100],
            ['firerune', 100]
          ]).catch(() => {});
        }
      }
    }
    mainVb = await getServerVarQuiet(page, 'mm_main');
    tile = await readTile(page);
    console.log(`[mm] after demon mm_main=${mainVb} tile=${JSON.stringify(tile)}`);
    if (shot) await shot('after-demon-kill');
    if (!(Number(mainVb) >= 6)) {
      fail(
        `MM demon FAIL: mm_main=${mainVb} want≥6 (defeated_demon); still on arena=${onMmArena(tile)}`
      );
    }
    console.log(
      `RESULT: PASS (MM final battle mm_main=${mainVb} ≥6 defeated_demon; product wear+Fire Wave; SOFT garkor6+autocast kit)`
    );
    process.exit(0);
  }

  // --- Garkor sigil: soft learned_plan → product plan talk → joined_10th + sigil ---
  if (fromStage === 19) {
    console.log('[mm] SOFT garkor5 → product Talk Garkor plan → joined_10th ≥6 + sigil');
    await cheatQuiet(page, 'setvar mm_main 5', 200); // completed_ch3 soft
    await cheatQuiet(page, 'setvar mm_garkor 5', 300); // learned_plan
    await cheatQuiet(page, 'setvar mm_awowogei 2', 200);
    await cheatQuiet(page, 'setvar mm_zooknock 6', 200);

    console.log('[mm] product tele Garkor', GARKOR);
    if (!(await teleTo(page, GARKOR, 2, 25_000))) fail('tele Garkor failed');
    await waitSceneReady(page, 15_000);

    let garkorVb = 0;
    let hasSigil = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const open = await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        const r = globalThis.__lc377?.reader;
        if (r?.dialogOpen?.() || r?.modalMessage?.()) return { already: true, op: false };
        return { already: false, op: !!(a?.talkNpc?.('Garkor') || a?.npcOp?.((r?.npcs?.() ?? []).find(n => /garkor/i.test(String(n?.name ?? '')))?.index, 1)) };
      });
      console.log(`[mm] garkor sigil open attempt=${attempt}`, open);
      await page.waitForTimeout(900);
      for (let step = 0; step < 50; step++) {
        const st = await page.evaluate(() => {
          const a = globalThis.__lc377?.actions;
          const r = globalThis.__lc377?.reader;
          const dlg = !!r?.dialogOpen?.();
          const mm = r?.modalMessage?.() || null;
          const body = typeof r?.chatBodyText === 'function' ? r.chatBodyText() : '';
          if (dlg || mm) a?.advanceDialog?.() || a?.continueDialog?.() || a?.dismissModalMessage?.();
          const inv = r?.inventory?.() ?? [];
          const worn = r?.equipment?.() ?? [];
          const sig = [...inv, ...worn].some(
            i => (i?.id | 0) === 4035 || /sigil|10th squad/i.test(String(i?.name ?? ''))
          );
          return { dlg, mm: mm ? String(mm).slice(0, 40) : null, body: String(body).slice(0, 90), sig };
        });
        if (step < 3 || st.sig || /sigil|medallion|Welcome to the 10th|plan/i.test(st.body || '')) {
          console.log(`[mm] sigil step=${step}`, st);
        }
        if (st.sig) hasSigil = true;
        await page.waitForTimeout(380);
        if (!st.dlg && !st.mm && step > 4) break;
      }
      if (!hasSigil) {
        hasSigil = await page.evaluate(() =>
          (globalThis.__lc377?.reader?.inventory?.() ?? []).some(
            i => (i?.id | 0) === 4035 || /sigil|10th squad/i.test(String(i?.name ?? ''))
          )
        );
      }
      garkorVb = await getServerVarQuiet(page, 'mm_garkor');
      if (Number(garkorVb) >= 6 && hasSigil) break;
    }
    garkorVb = await getServerVarQuiet(page, 'mm_garkor');
    const inv = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.inventory?.() ?? []).map(i => ({ id: i?.id, name: i?.name }))
    );
    console.log(`[mm] after sigil mm_garkor=${garkorVb} hasSigil=${hasSigil} inv=${JSON.stringify(inv)}`);
    if (shot) await shot('after-garkor-sigil');
    if (!(Number(garkorVb) >= 6)) fail(`MM Garkor sigil FAIL: mm_garkor=${garkorVb} want≥6`);
    if (!hasSigil) fail(`MM Garkor sigil FAIL: no mm_sigil in inv ${JSON.stringify(inv)}`);
    console.log(
      `RESULT: PASS (MM Garkor mm_garkor=${garkorVb} ≥6 joined_10th + sigil; product plan talk; SOFT garkor5)`
    );
    process.exit(0);
  }

  // --- Garkor post-awo thin ch4: soft awo2 + garkor4 → product Talk → learned_plan ≥5 ---
  if (fromStage === 18) {
    console.log('[mm] SOFT awo2 + garkor4 + greegree → product Talk Garkor thin ch4 ≥5');
    await cheatQuiet(page, 'setvar mm_main 4', 200); // completed_ch2 soft
    await cheatQuiet(page, 'setvar mm_garkor 4', 300); // seek_alliance
    await cheatQuiet(page, 'setvar mm_awowogei 2', 200); // complete_mission
    await cheatQuiet(page, 'setvar mm_zooknock 6', 200);
    await giveItems(page, [['mm_monkey_greegree_for_normal_monkey', 1]]).catch(() => {});
    await page.waitForTimeout(400);

    console.log('[mm] product tele Garkor', GARKOR);
    if (!(await teleTo(page, GARKOR, 2, 25_000))) fail('tele Garkor failed');
    await waitSceneReady(page, 15_000);

    // Hold greegree (289: often still monkey when returning)
    const hold = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      return { ok: !!(a?.heldOp?.('Monkey greegree', 2) || a?.heldOp?.('greegree', 2)) };
    });
    console.log('[mm] hold greegree', hold);
    await page.waitForTimeout(1000);

    let garkorVb = 0;
    let mainVb = 0;
    for (let attempt = 0; attempt < 5; attempt++) {
      const open = await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        const r = globalThis.__lc377?.reader;
        if (r?.dialogOpen?.() || r?.modalMessage?.()) return { already: true, op: false };
        const n = (r?.npcs?.() ?? []).find(x => /garkor/i.test(String(x?.name ?? '')));
        return {
          already: false,
          op: !!(a?.talkNpc?.('Garkor') || (n && a?.npcOp?.(n.index, 1)))
        };
      });
      console.log(`[mm] garkor ch4 open attempt=${attempt}`, open);
      await page.waitForTimeout(900);
      for (let step = 0; step < 40; step++) {
        const st = await page.evaluate(s => {
          const a = globalThis.__lc377?.actions;
          const r = globalThis.__lc377?.reader;
          const dlg = !!r?.dialogOpen?.();
          const mm = r?.modalMessage?.() || null;
          const body = typeof r?.chatBodyText === 'function' ? r.chatBodyText() : '';
          // Chapter scroll is main modal — dismiss via continue / click
          if (dlg || mm) a?.advanceDialog?.() || a?.continueDialog?.() || a?.dismissModalMessage?.();
          // Close main overlay if chapter card stuck (after chat)
          const mainId = (globalThis.__lc377?.client?.mainModalId ?? -1) | 0;
          if (mainId > 0 && s > 8 && !dlg && !mm) {
            a?.ifClose?.() || a?.closeModal?.();
          }
          return {
            dlg,
            mm: mm ? String(mm).slice(0, 40) : null,
            body: String(body).slice(0, 90),
            mainId
          };
        }, step);
        if (step < 4 || /Well done|vain|overheard|Chapter 4|Final Battle/i.test(st.body || '')) {
          console.log(`[mm] ch4 step=${step}`, st);
        }
        await page.waitForTimeout(380);
        if (!st.dlg && !st.mm && step > 5) break;
      }
      // Stage may write before chapter card continues
      garkorVb = await getServerVarQuiet(page, 'mm_garkor');
      mainVb = await getServerVarQuiet(page, 'mm_main');
      if (Number(garkorVb) >= 5) break;
    }
    garkorVb = await getServerVarQuiet(page, 'mm_garkor');
    mainVb = await getServerVarQuiet(page, 'mm_main');
    const tile = await readTile(page);
    console.log(
      `[mm] after thin ch4 mm_garkor=${garkorVb} mm_main=${mainVb} tile=${JSON.stringify(tile)}`
    );
    if (shot) await shot('after-garkor-ch4-thin');
    if (!(Number(garkorVb) >= 5)) {
      fail(`MM Garkor thin ch4 FAIL: mm_garkor=${garkorVb} want≥5 (learned_plan)`);
    }
    if (!(Number(mainVb) >= 5)) {
      fail(`MM thin ch4 FAIL: mm_main=${mainVb} want≥5 (completed_ch3)`);
    }
    console.log(
      `RESULT: PASS (MM thin ch4 mm_garkor=${garkorVb}≥5 mm_main=${mainVb}≥5; product Talk Garkor post-awo; SOFT awo2+garkor4)`
    );
    process.exit(0);
  }

  // --- Zoo captive + Awowogei hand-in: soft awo1 → product zoo backpack → product throne ≥2 ---
  if (fromStage === 17) {
    console.log('[mm] SOFT awo1 + amulet → product zoo captive → greegree hand-in throne ≥2');
    await cheatQuiet(page, 'setvar mm_main 4', 200);
    await cheatQuiet(page, 'setvar mm_garkor 4', 200);
    await cheatQuiet(page, 'setvar mm_zooknock 6', 200);
    await cheatQuiet(page, 'setvar mm_awowogei 1', 200); // sent_mission soft
    // Amulet only at zoo — greegree after captive (avoid inv noise / Hold side-effects)
    await giveItems(page, [['mm_amulet_of_monkey_speak', 1]]).catch(() => {});
    await page.waitForTimeout(400);

    console.log('[mm] product tele zoo stand', ZOO_STAND);
    if (!(await teleTo(page, ZOO_STAND, 2, 25_000))) fail('tele zoo failed');
    await waitSceneReady(page, 15_000);

    const wearAmZoo = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      return {
        ok: !!(
          a?.equip?.("M'speak amulet") ||
          a?.equip?.('speak amulet') ||
          a?.heldOp?.("M'speak amulet", 2) ||
          a?.heldOp?.('speak amulet', 2)
        )
      };
    });
    console.log('[mm] wear amulet (zoo)', wearAmZoo);
    await page.waitForTimeout(600);

    const npcs = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.npcs?.() ?? [])
        .filter(n => /monkey/i.test(String(n?.name ?? '')))
        .slice(0, 8)
        .map(n => ({ name: n.name, x: n.x, z: n.z, d: n.d }))
    );
    console.log('[mm] zoo monkeys', JSON.stringify(npcs));
    if (!npcs.length) fail('no Monkey NPC at Ardougne zoo');

    // Product Talk exact name "Monkey" (not "Monkey Minder") — long continues → pack id 4033 backpack
    let hasBag = false;
    for (let attempt = 0; attempt < 5 && !hasBag; attempt++) {
      const open = await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        const r = globalThis.__lc377?.reader;
        if (r?.dialogOpen?.() || r?.modalMessage?.()) return { already: true, op: false, how: 'dialog' };
        // Prefer exact name Monkey (exclude Minder / Archer / Guard)
        const list = (r?.npcs?.() ?? []).filter(
          n => String(n?.name ?? '').toLowerCase() === 'monkey'
        );
        const n = list.sort((x, y) => (x.d ?? 99) - (y.d ?? 99))[0];
        if (!n) return { already: false, op: false, how: 'no-npc' };
        const op = !!(a?.npcOp?.(n.index, 1) || a?.talkNpc?.('Monkey'));
        return { already: false, op, how: 'npc', index: n.index, d: n.d };
      });
      console.log(`[mm] zoo open attempt=${attempt}`, open);
      await page.waitForTimeout(1000);
      for (let step = 0; step < 50; step++) {
        const st = await page.evaluate(() => {
          const a = globalThis.__lc377?.actions;
          const r = globalThis.__lc377?.reader;
          const dlg = !!r?.dialogOpen?.();
          const mm = r?.modalMessage?.() || null;
          const body = typeof r?.chatBodyText === 'function' ? r.chatBodyText() : '';
          if (dlg || mm) a?.advanceDialog?.() || a?.continueDialog?.() || a?.dismissModalMessage?.();
          const inv = r?.inventory?.() ?? [];
          const bag = inv.some(i => (i?.id | 0) === 4033);
          return {
            dlg,
            mm: mm ? String(mm).slice(0, 50) : null,
            body: String(body).slice(0, 90),
            bag
          };
        });
        if (step < 4 || step % 8 === 0 || st.bag || /Ook|backpack|Escape|banana/i.test(st.body || '')) {
          console.log(`[mm] zoo step=${step}`, st);
        }
        if (st.bag) {
          hasBag = true;
          break;
        }
        await page.waitForTimeout(380);
        if (!st.dlg && !st.mm && step > 5) break;
      }
      hasBag =
        hasBag ||
        (await page.evaluate(() =>
          (globalThis.__lc377?.reader?.inventory?.() ?? []).some(i => (i?.id | 0) === 4033)
        ));
      console.log(`[mm] zoo attempt=${attempt} backpack=${hasBag}`);
    }
    if (!hasBag) {
      const inv = await page.evaluate(() =>
        (globalThis.__lc377?.reader?.inventory?.() ?? []).map(i => ({
          id: i?.id,
          name: i?.name
        }))
      );
      fail(`zoo captive FAIL: no mm_monkey_in_backpack inv=${JSON.stringify(inv)}`);
    }
    console.log('[mm] product backpack OK');
    if (shot) await shot('after-zoo-captive');

    // Throne hand-in — greegree + amulet + backpack
    await giveItems(page, [['mm_monkey_greegree_for_normal_monkey', 1]]).catch(() => {});
    await page.waitForTimeout(300);
    console.log('[mm] product tele throne for hand-in', AWO_STAND);
    if (!(await teleTo(page, AWO_STAND, 2, 25_000))) fail('tele Awowogei stand (hand-in) failed');
    await waitSceneReady(page, 15_000);

    const hold = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      return { ok: !!(a?.heldOp?.('Monkey greegree', 2) || a?.heldOp?.('greegree', 2)) };
    });
    console.log('[mm] hold greegree', hold);
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      a?.equip?.("M'speak amulet") ||
        a?.equip?.('speak amulet') ||
        a?.heldOp?.("M'speak amulet", 2) ||
        a?.heldOp?.('speak amulet', 2);
    });
    await page.waitForTimeout(500);

    let awo = 0;
    for (let attempt = 0; attempt < 5; attempt++) {
      const open = await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        const r = globalThis.__lc377?.reader;
        if (r?.dialogOpen?.() || r?.modalMessage?.()) return { already: true, op: false };
        const op =
          !!a?.opLoc?.('Awowogei', 'Talk', 16) ||
          !!a?.opLocAt?.(2802, 2765, 'Talk') ||
          !!a?.opLoc1At?.(2802, 2765);
        return { already: false, op };
      });
      console.log(`[mm] hand-in open attempt=${attempt}`, open);
      await page.waitForTimeout(900);
      for (let step = 0; step < 40; step++) {
        const st = await page.evaluate(() => {
          const a = globalThis.__lc377?.actions;
          const r = globalThis.__lc377?.reader;
          const dlg = !!r?.dialogOpen?.();
          const mm = r?.modalMessage?.() || null;
          const body = typeof r?.chatBodyText === 'function' ? r.chatBodyText() : '';
          if (dlg || mm) a?.advanceDialog?.() || a?.continueDialog?.() || a?.dismissModalMessage?.();
          return { dlg, mm: mm ? String(mm).slice(0, 40) : null, body: String(body).slice(0, 80) };
        });
        if (step < 3 || /Well done|resourceful|captive|Yes, I have/i.test(st.body || '')) {
          console.log(`[mm] hand-in step=${step}`, st);
        }
        await page.waitForTimeout(380);
        if (!st.dlg && !st.mm && step > 3) break;
      }
      awo = await getServerVarQuiet(page, 'mm_awowogei');
      if (Number(awo) >= 2) break;
    }
    awo = await getServerVarQuiet(page, 'mm_awowogei');
    const tile = await readTile(page);
    console.log(`[mm] after hand-in mm_awowogei=${awo} tile=${JSON.stringify(tile)}`);
    if (shot) await shot('after-awowogei-captive');
    if (!(Number(awo) >= 2)) {
      fail(`MM captive hand-in FAIL: mm_awowogei=${awo} want≥2 (complete_mission)`);
    }
    console.log(
      `RESULT: PASS (MM captive mm_awowogei=${awo} ≥2 complete_mission; product zoo+throne; SOFT awo1+amulet+greegree)`
    );
    process.exit(0);
  }

  // --- Awowogei envoy: soft garkor4 + greegree+amulet worn → product Talk throne → sent_mission ≥1 ---
  if (fromStage === 16) {
    console.log('[mm] SOFT garkor4 + greegree+amulet → product Talk Awowogei throne ≥1');
    await cheatQuiet(page, 'setvar mm_main 4', 200); // completed_ch2 soft
    await cheatQuiet(page, 'setvar mm_garkor 4', 300); // seek_alliance
    await cheatQuiet(page, 'setvar mm_zooknock 6', 200);
    await cheatQuiet(page, 'setvar mm_awowogei 0', 200);
    await giveItems(page, [
      ['mm_monkey_greegree_for_normal_monkey', 1],
      ['mm_amulet_of_monkey_speak', 1]
    ]).catch(() => {});
    await page.waitForTimeout(400);

    console.log('[mm] product tele throne stand', AWO_STAND);
    if (!(await teleTo(page, AWO_STAND, 2, 25_000))) fail('tele Awowogei stand failed');
    await waitSceneReady(page, 15_000);

    // Hold greegree (iop2) then wear amulet
    const hold = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      if (!a?.heldOp) return { ok: false };
      return {
        ok: !!(a.heldOp('Monkey greegree', 2) || a.heldOp('greegree', 2))
      };
    });
    console.log('[mm] hold greegree', hold);
    await page.waitForTimeout(1000);
    const wearAm = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      if (!a) return { ok: false };
      const ok =
        a.equip?.("M'speak amulet") ||
        a.equip?.('speak amulet') ||
        a.heldOp?.("M'speak amulet", 2) ||
        a.heldOp?.('speak amulet', 2);
      return { ok: !!ok };
    });
    console.log('[mm] wear amulet', wearAm);
    await page.waitForTimeout(600);

    const worn = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.equipment?.() ?? [])
        .map(i => String(i?.name ?? ''))
        .filter(Boolean)
    );
    console.log('[mm] worn', worn);
    if (!worn.some(n => /greegree/i.test(n))) {
      fail(`greegree not worn: ${JSON.stringify(worn)}`);
    }
    if (!worn.some(n => /speak|m.?speak/i.test(n))) {
      fail(`amulet not worn: ${JSON.stringify(worn)}`);
    }

    // Loc scan once — if missing, fail fast (not thrash).
    const locSnap = await page.evaluate(() => {
      const r = globalThis.__lc377?.reader;
      if (!r?.locs) return { locs: [] };
      return {
        locs: (r.locs({ name: 'Awowogei', maxDist: 16 }) ?? []).slice(0, 4).map(l => ({
          name: l?.name,
          ops: l?.ops,
          x: l?.x,
          z: l?.z,
          lx: l?.lx,
          lz: l?.lz,
          id: l?.id
        }))
      };
    });
    console.log('[mm] throne loc snap', JSON.stringify(locSnap));
    if (!locSnap.locs?.length) fail('Awowogei loc not in scene (mm_throne)');

    console.log('[mm] product Talk-to Awowogei throne (open once, advance — do not re-op mid-chat)');
    let awo = 0;
    // Long envoy chat (~15+ pages). Re-opLoc while activeScript aborts before %mm_awowogei=1.
    for (let attempt = 0; attempt < 6; attempt++) {
      const open = await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        const r = globalThis.__lc377?.reader;
        if (r?.dialogOpen?.() || r?.modalMessage?.()) {
          return { already: true, op: false };
        }
        const op =
          !!a?.opLoc?.('Awowogei', 'Talk', 16) ||
          !!a?.opLoc?.('Awowogei', '', 16) ||
          !!a?.opLocAt?.(2802, 2765, 'Talk') ||
          !!a?.opLocAt?.(2802, 2765, '') ||
          !!a?.opLoc1At?.(2802, 2765);
        return { already: false, op };
      });
      console.log(`[mm] throne open attempt=${attempt}`, open);
      await page.waitForTimeout(900);

      // Advance only — never re-click throne while chat is open.
      // Never getvar mid-dialog: CLIENT_CHEAT aborts activeScript (thrash died at step 12).
      let lastBody = '';
      let stuck = 0;
      for (let step = 0; step < 100; step++) {
        const st = await page.evaluate(() => {
          const a = globalThis.__lc377?.actions;
          const r = globalThis.__lc377?.reader;
          const dlg = !!r?.dialogOpen?.();
          const mm = r?.modalMessage?.() || null;
          const body = typeof r?.chatBodyText === 'function' ? r.chatBodyText() : '';
          if (dlg || mm) {
            a?.advanceDialog?.() || a?.continueDialog?.() || a?.dismissModalMessage?.();
          }
          return {
            dlg,
            mm: mm ? String(mm).slice(0, 60) : null,
            body: body ? String(body).slice(0, 100) : '',
            chatModal: (globalThis.__lc377?.client?.chatModalId ?? -1) | 0
          };
        });
        if (step < 4 || step % 8 === 0 || /silent|resourceful|captive|Ardougne|challenge/i.test(st.body || '')) {
          console.log(`[mm] awo step=${step}`, st);
        }
        if (st.body && st.body === lastBody) stuck++;
        else stuck = 0;
        lastBody = st.body || '';
        await page.waitForTimeout(380);
        // Closed after real progress — poll var only when chat is clear
        if (!st.dlg && !st.mm && step > 4) {
          awo = await getServerVarQuiet(page, 'mm_awowogei');
          if (Number(awo) >= 1) break;
          // Dialog closed without var — outer attempt re-opens
          break;
        }
        // Same line forever — unstick with extra continues (no getvar)
        if (stuck > 8) {
          await page.evaluate(() => {
            const a = globalThis.__lc377?.actions;
            for (let k = 0; k < 6; k++) a?.continueDialog?.();
          });
          stuck = 0;
        }
      }
      if (!(Number(awo) >= 1)) {
        awo = await getServerVarQuiet(page, 'mm_awowogei');
      }
      if (Number(awo) >= 1) break;
      await page.waitForTimeout(500);
    }
    awo = await getServerVarQuiet(page, 'mm_awowogei');
    const tile = await readTile(page);
    const wornEnd = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.equipment?.() ?? [])
        .map(i => String(i?.name ?? ''))
        .filter(Boolean)
    );
    console.log(
      `[mm] after throne mm_awowogei=${awo} tile=${JSON.stringify(tile)} worn=${JSON.stringify(wornEnd)}`
    );
    if (shot) await shot('after-awowogei-envoy');
    if (!(Number(awo) >= 1)) {
      fail(`MM Awowogei FAIL: mm_awowogei=${awo} want≥1 (sent_mission)`);
    }
    console.log(
      `RESULT: PASS (MM Awowogei mm_awowogei=${awo} ≥1 sent_mission; product throne Talk; SOFT greegree+amulet+garkor4)`
    );
    process.exit(0);
  }

  // --- Temple amulet: soft enchanted bar+mould+wool → product firewall smith + string → M'speak ---
  if (fromStage === 15) {
    console.log('[mm] SOFT enchanted bar + mould + wool → product temple firewall smith + string');
    await giveItems(page, [
      ['mm_enchanted_gold_bar', 1],
      ['mm_monkey_amulet_mould', 1],
      ['ball_of_wool', 1]
    ]).catch(() => {});
    await page.waitForTimeout(400);

    console.log('[mm] product tele temple firewall stand', TEMPLE_FIREWALL_STAND);
    if (!(await teleTo(page, TEMPLE_FIREWALL_STAND, 3, 30_000))) fail('tele temple firewall failed');
    await waitSceneReady(page, 25_000);
    // L1 denser map: allow ondemand a beat after tele
    await page.waitForTimeout(1500);

    // Diagnose scene locs (firewall type ids 4765/4766)
    const locProbe = await page.evaluate(() => {
      const r = globalThis.__lc377?.reader;
      if (!r?.locs) return { err: 'no locs' };
      const all = r.locs({ maxDist: 18 }) ?? [];
      const flame = all.filter(
        l =>
          (l.id | 0) === 4765 ||
          (l.id | 0) === 4766 ||
          /flame|firewall|pyre/i.test(String(l.name ?? ''))
      );
      return {
        tile: r.worldTile?.(),
        scene: r.sceneState?.(),
        nLocs: all.length,
        sample: all.slice(0, 12).map(l => ({
          name: l.name,
          id: l.id,
          d: l.distance,
          lx: l.lx,
          lz: l.lz,
          tc: l.typecode
        })),
        flame: flame.slice(0, 8).map(l => ({
          name: l.name,
          id: l.id,
          d: l.distance,
          lx: l.lx,
          lz: l.lz,
          tc: l.typecode
        }))
      };
    });
    console.log('[mm] loc probe', JSON.stringify(locProbe));

    const smith = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a?.useHeldOnLoc || !r) return { ok: false, reason: 'no abi' };
      const inv = r.inventory?.() ?? [];
      const bar =
        inv.find(i => /enchanted bar/i.test(String(i?.name ?? ''))) ||
        inv.find(i => /enchanted/i.test(String(i?.name ?? '')) && /bar/i.test(String(i?.name ?? '')));
      if (!bar) return { ok: false, reason: 'no bar', inv: inv.map(x => x?.name) };
      const use = { id: bar.id | 0, slot: bar.slot | 0, comId: bar.comId | 0 };
      const locs = r.locs({ maxDist: 18 }) ?? [];
      // Prefer pack type ids, then name includes
      let fw =
        locs.find(l => (l.id | 0) === 4765 || (l.id | 0) === 4766) ||
        locs.find(l => /wall of flame|flame/i.test(String(l.name ?? '')));
      // Fallback: raw World.getWall scan (reader.locs can miss walls if name/layer glitch)
      if (!fw) {
        const c = globalThis.__lc377?.client;
        const world = c?.world;
        const level = c?.minusedlevel | 0;
        const plx = c?.localPlayer?.routeX?.[0] | 0;
        const plz = c?.localPlayer?.routeZ?.[0] | 0;
        let best = null;
        if (world?.getWall) {
          for (let lx = Math.max(0, plx - 12); lx <= Math.min(103, plx + 12); lx++) {
            for (let lz = Math.max(0, plz - 12); lz <= Math.min(103, plz + 12); lz++) {
              const w = world.getWall(level, lx, lz);
              if (!w?.typecode) continue;
              const id = (w.typecode >> 14) & 0x7fff;
              if (id !== 4765 && id !== 4766) continue;
              const d = Math.max(Math.abs(lx - plx), Math.abs(lz - plz));
              if (!best || d < best.d) {
                best = { typecode: w.typecode, lx, lz, id, d, name: 'Wall of flame' };
              }
            }
          }
        }
        fw = best;
      }
      if (!fw) {
        return {
          ok: false,
          reason: 'no firewall loc in scene',
          level: globalThis.__lc377?.client?.minusedlevel,
          nLocs: locs.length,
          names: locs.slice(0, 15).map(l => `${l.name || '?'}#${l.id}`)
        };
      }
      // Object snap path (exact instance)
      let ok = a.useHeldOnLoc(use, {
        typecode: fw.typecode | 0,
        lx: fw.lx | 0,
        lz: fw.lz | 0,
        name: fw.name
      });
      if (!ok) {
        ok =
          a.useHeldOnLoc(use, 'Wall of flame', 18) ||
          a.useHeldOnLoc(use, 'flame', 18) ||
          a.useHeldOnLoc('Enchanted bar', 'Wall of flame', 18);
      }
      return {
        ok: !!ok,
        bar: bar.name,
        fw: {
          name: fw.name,
          id: fw.id,
          d: fw.d ?? fw.distance,
          lx: fw.lx,
          lz: fw.lz,
          tc: fw.typecode
        },
        level: globalThis.__lc377?.client?.minusedlevel
      };
    });
    console.log('[mm] use bar on firewall', JSON.stringify(smith));
    if (!smith?.ok) {
      if (shot) await shot('temple-firewall-miss');
      fail(`MM temple smith FAIL: useHeldOnLoc ${JSON.stringify(smith)}`);
    }

    // p_delay(2) then inv_setslot unstrung — wait for product
    let invAfterSmith = [];
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(350);
      await page.evaluate(() => {
        globalThis.__lc377?.actions?.continueDialog?.();
        globalThis.__lc377?.actions?.dismissModalMessage?.();
      });
      invAfterSmith = await page.evaluate(() =>
        (globalThis.__lc377?.reader?.inventory?.() ?? []).map(x => String(x?.name ?? '')).filter(Boolean)
      );
      if (invAfterSmith.some(n => /m.?speak|speak amulet/i.test(n))) break;
      // enchanted bar gone is also progress
      if (!invAfterSmith.some(n => /enchanted bar/i.test(n)) && i > 4) break;
    }
    console.log('[mm] inv after smith wait', invAfterSmith);

    // String unstrung M'speak with wool (opheldu either way)
    const stringed = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a?.useHeldOnHeld) return { ok: false, reason: 'no useHeldOnHeld' };
      const inv = r?.inventory?.() ?? [];
      const am =
        inv.find(i => /m.?speak|speak amulet/i.test(String(i?.name ?? ''))) || null;
      const wool = inv.find(i => /ball of wool|wool/i.test(String(i?.name ?? ''))) || null;
      if (!am || !wool) {
        return {
          ok: false,
          reason: 'missing am/wool',
          inv: inv.map(x => x?.name)
        };
      }
      const ok =
        a.useHeldOnHeld(
          { id: am.id | 0, slot: am.slot | 0, comId: am.comId | 0 },
          { id: wool.id | 0, slot: wool.slot | 0, comId: wool.comId | 0 }
        ) ||
        a.useHeldOnHeld(
          { id: wool.id | 0, slot: wool.slot | 0, comId: wool.comId | 0 },
          { id: am.id | 0, slot: am.slot | 0, comId: am.comId | 0 }
        ) ||
        a.useHeldOnHeld("M'speak amulet", 'Ball of wool') ||
        a.useHeldOnHeld('Ball of wool', "M'speak amulet");
      return { ok: !!ok };
    });
    console.log('[mm] string amulet', stringed);
    await page.waitForTimeout(1200);

    const invSnap = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.inventory?.() ?? []).map(x => String(x?.name ?? '')).filter(Boolean)
    );
    console.log('[mm] inv after amulet path', invSnap);
    const hasMspeak = invSnap.some(n => /m.?speak|speak amulet/i.test(n));
    const hasEnchanted = invSnap.some(n => /enchanted bar/i.test(n));
    const hasWool = invSnap.some(n => /wool/i.test(n));
    if (shot) await shot('after-temple-amulet');
    if (!hasMspeak) {
      fail(`MM temple amulet FAIL: no M'speak in inv; inv=${JSON.stringify(invSnap)}`);
    }
    if (hasEnchanted) {
      fail(`MM temple amulet FAIL: enchanted bar still in inv (smith no-op?); inv=${JSON.stringify(invSnap)}`);
    }
    console.log(
      `RESULT: PASS (MM temple M'speak amulet; product firewall OPLOCU; SOFT bar+mould+wool; stringed=${!hasWool}; inv has mspeak)`
    );
    process.exit(0);
  }

  // --- Garkor greegree disguise: soft speak_zooknock + normal greegree → product wear+talk → seek_alliance ≥4 ---
  if (fromStage === 14) {
    console.log('[mm] SOFT garkor2 + greegree → product Hold + Talk Garkor seek_alliance≥4');
    await cheatQuiet(page, 'setvar mm_main 3', 300);
    await cheatQuiet(page, 'setvar mm_garkor 2', 300); // speak_zooknock
    await cheatQuiet(page, 'setvar mm_zooknock 6', 200); // made_talisman (soft; product sets after real hand-in)
    await giveItems(page, [['mm_monkey_greegree_for_normal_monkey', 1]]).catch(() => {});
    await page.waitForTimeout(400);

    console.log('[mm] product tele Garkor', GARKOR);
    if (!(await teleTo(page, GARKOR, 2, 25_000))) fail('tele Garkor failed');
    await waitSceneReady(page, 15_000);

    // Hold greegree (iop2) — must be in greegree zone (Ape Atoll)
    const hold = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      if (!a?.heldOp) return { ok: false, reason: 'no heldOp' };
      const ok = a.heldOp('Monkey greegree', 2) || a.heldOp('greegree', 2);
      return { ok: !!ok };
    });
    console.log('[mm] hold greegree', hold);
    await page.waitForTimeout(1200);
    const worn = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.equipment?.() ?? [])
        .map(i => String(i?.name ?? ''))
        .filter(Boolean)
    );
    console.log('[mm] worn', worn);
    if (!worn.some(n => /greegree/i.test(n))) {
      fail(`greegree not worn after Hold: ${JSON.stringify({ hold, worn })}`);
    }

    console.log('[mm] product Talk Garkor (wearing Karamjan greegree → seek_alliance)');
    let garkorVb = 0;
    for (let i = 0; i < 48; i++) {
      await talkNpc(page, 'Garkor', ['continue', 'yes'], 40);
      await page.waitForTimeout(350);
      await page.evaluate(() => {
        globalThis.__lc377?.actions?.continueDialog?.();
        globalThis.__lc377?.actions?.dismissModalMessage?.();
      });
      garkorVb = await getServerVarQuiet(page, 'mm_garkor');
      if (Number(garkorVb) >= 4) break;
    }
    garkorVb = await getServerVarQuiet(page, 'mm_garkor');
    const tile = await readTile(page);
    console.log(`[mm] after Garkor greegree mm_garkor=${garkorVb} tile=${JSON.stringify(tile)}`);
    if (shot) await shot('after-garkor-greegree');
    if (!(Number(garkorVb) >= 4)) {
      fail(`MM Garkor greegree FAIL: mm_garkor=${garkorVb} want≥4 (seek_alliance)`);
    }
    console.log(
      `RESULT: PASS (MM Garkor greegree mm_garkor=${garkorVb} ≥4 seek_alliance; product wear+talk; SOFT garkor2+greegree)`
    );
    process.exit(0);
  }

  // --- Zooknock hand-in: soft need_items + mats → product OPNPCU → greegree ---
  if (fromStage === 13) {
    console.log('[mm] SOFT need_items + materials → product use-on Zooknock greegree');
    await cheatQuiet(page, 'setvar mm_main 3', 300);
    await cheatQuiet(page, 'setvar mm_garkor 2', 200);
    await cheatQuiet(page, 'setvar mm_zooknock 5', 300); // need_items
    // collection flags (varbit names as setvar if engine supports)
    await cheatQuiet(page, 'setvar mm_zooknock_player_is_collecting_for_amulet 1', 200);
    await cheatQuiet(page, 'setvar mm_zooknock_player_is_collecting_for_talisman 1', 200);
    await cheatQuiet(page, 'setvar mm_zooknock_has_gold_bar 0', 100);
    await cheatQuiet(page, 'setvar mm_zooknock_has_dentures 0', 100);
    await cheatQuiet(page, 'setvar mm_zooknock_has_amulet_mould 0', 100);
    await cheatQuiet(page, 'setvar mm_zooknock_has_magical_talisman 0', 100);
    await cheatQuiet(page, 'setvar mm_zooknock_has_monkey_relic 0', 100);

    console.log('[mm] SOFT dragonquest 10 + combat prep');
    await cheatQuiet(page, 'setvar dragonquest 10', 300);
    await setStats(page, ZOOK_TUNNEL_STATS);
    await giveItems(page, [...ZOOK_GEAR_GIVE]).catch(() => {});
    await page.waitForTimeout(300);
    await equipNamedKit(page, ZOOK_EQUIP_NAMES);
    await giveItems(page, [
      ...ZOOK_FOOD_GIVE,
      ['gold_bar', 1],
      ['mm_monkey_dentures', 1],
      ['mm_monkey_amulet_mould', 1],
      ['mm_monkey_talisman', 1],
      ['mm_normal_monkey_bones', 1]
    ]).catch(() => {});

    console.log('[mm] product tele Zooknock stand', ZOOKNOCK_STAND);
    if (!(await teleTo(page, ZOOKNOCK_STAND, 2, 25_000))) fail('tele Zooknock failed');
    await waitSceneReady(page, 20_000);

    // OPNPCU hand-in uses chat + p_delay(4) before inv_add. Next use-on replaces
    // activeScript and aborts p_delay → items gone, no greegree/enchanted bar.
    const invNames = async () =>
      page.evaluate(() =>
        (globalThis.__lc377?.reader?.inventory?.() ?? [])
          .map(i => String(i?.name ?? ''))
          .filter(Boolean)
      );
    const drainDialog = async (rounds = 24, gapMs = 280) => {
      for (let i = 0; i < rounds; i++) {
        await page.evaluate(() => {
          const a = globalThis.__lc377?.actions;
          a?.continueDialog?.();
          a?.dismissModalMessage?.();
        });
        await page.waitForTimeout(gapMs);
      }
    };
    /** Wait for inv match; keep draining chat so p_delay can finish. */
    const waitInvMatch = async (re, label, maxMs = 12_000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < maxMs) {
        await page.evaluate(() => {
          globalThis.__lc377?.actions?.continueDialog?.();
          globalThis.__lc377?.actions?.dismissModalMessage?.();
        });
        const inv = await invNames();
        if (inv.some(n => re.test(n))) {
          console.log(`[mm] waitInv ${label} ok`, inv.filter(n => re.test(n)));
          return inv;
        }
        await page.waitForTimeout(350);
      }
      return invNames();
    };
    const useOnZook = async (itemNeedle, { settleMs = 2200 } = {}) => {
      const ok = await page.evaluate(name => {
        const a = globalThis.__lc377?.actions;
        const r = globalThis.__lc377?.reader;
        if (!a?.useHeldOnNpc || !r) return { ok: false, reason: 'no abi' };
        const inv = r.inventory?.() ?? [];
        const want = String(name).toLowerCase();
        const it =
          inv.find(i => String(i?.name ?? '').toLowerCase() === want) ||
          inv.find(i => String(i?.name ?? '').toLowerCase().includes(want));
        if (!it) return { ok: false, reason: 'no item', name, inv: inv.map(x => x?.name) };
        const sent = a.useHeldOnNpc(
          { id: it.id | 0, slot: it.slot | 0, comId: it.comId | 0 },
          'Zooknock'
        );
        return { ok: !!sent, name: it.name, id: it.id };
      }, itemNeedle);
      console.log('[mm] useOn Zooknock', itemNeedle, ok);
      if (!ok?.ok) return ok;
      // Chat lines first, then p_delay(4) (~1.2s @ WORLD_SPEED 300) before inv_add
      await drainDialog(16, 220);
      await page.waitForTimeout(settleMs);
      await drainDialog(8, 200);
      return ok;
    };

    // Amulet path → enchanted gold bar (3rd hand-in triggers p_delay + inv_add).
    // 377 display name is "M'amulet mould" — match on "amulet mould", not "monkey amulet mould".
    for (const item of ['gold bar', 'monkey dentures', 'amulet mould']) {
      await useOnZook(item);
    }
    let invSnap = await waitInvMatch(/enchanted/i, 'enchanted gold bar', 14_000);
    console.log('[mm] inv after amulet path', invSnap);
    if (!invSnap.some(n => /enchanted/i.test(n))) {
      console.warn('[mm] warn: no enchanted gold after amulet path — continue greegree');
    }

    // Greegree path — do NOT fire until amulet p_delay finished
    await useOnZook('monkey talisman');
    await useOnZook('monkey bones', { settleMs: 3500 });
    invSnap = await waitInvMatch(/greegree/i, 'greegree', 16_000);
    console.log('[mm] inv after hand-in', invSnap);
    const hasGreegree = invSnap.some(n => /greegree/i.test(n));
    const hasEnchanted = invSnap.some(n => /enchanted/i.test(n));
    if (shot) await shot('after-zooknock-handin');
    if (!hasGreegree) {
      fail(`MM hand-in FAIL: no greegree in inv after use-on; inv=${JSON.stringify(invSnap)}`);
    }
    console.log(
      `RESULT: PASS (MM Zooknock hand-in greegree; product OPNPCU; SOFT mats+need_items; enchanted=${hasEnchanted})`
    );
    process.exit(0);
  }

  // --- Zooknock mission mid: soft garkor2 → product Talk Zooknock → mm_zooknock≥5 ---
  // Product: intro story + Garkor-sent disguise → need_items (5).
  // Tunnel: Monkey Zombie 82/98/129 — host combat prep required.
  // Stand: ZOOKNOCK_STAND (not NPC tile; never LOC 24,42 wall misread).
  if (fromStage === 12) {
    console.log('[mm] SOFT garkor2 → product Zooknock mission mm_zooknock≥5');
    await cheatQuiet(page, 'setvar mm_main 3', 400);
    await cheatQuiet(page, 'setvar mm_daero 7', 200);
    await cheatQuiet(page, 'setvar mm_garkor 2', 300); // speak_zooknock
    await cheatQuiet(page, 'setvar mm_zooknock 0', 300);
    let garkorVb = await getServerVarQuiet(page, 'mm_garkor');
    if (Number(garkorVb) !== 2) fail(`soft FROM 12 failed mm_garkor=${garkorVb}`);

    // Rune platebody: DEF 40 + dragonquest ≥ 10 (^dragon_complete)
    console.log('[mm] SOFT dragonquest 10 (DS complete → rune plate equip)');
    await cheatQuiet(page, 'setvar dragonquest 10', 400);
    console.log('[mm] prep: tunnel combat setstat', JSON.stringify(ZOOK_TUNNEL_STATS));
    await setStats(page, ZOOK_TUNNEL_STATS);
    console.log('[mm] prep: rune kit + lobster');
    await giveItems(page, [...ZOOK_GEAR_GIVE]).catch(() => {});
    await page.waitForTimeout(400);
    const eq = await equipNamedKit(page, ZOOK_EQUIP_NAMES);
    console.log('[mm] equip', JSON.stringify(eq));
    if (!eq?.worn?.some(w => String(w).toLowerCase().includes('platebody'))) {
      console.warn('[mm] rune platebody not worn — check dragonquest soft + DEF 40');
    }
    await giveItems(page, [...ZOOK_FOOD_GIVE]).catch(() => {});

    console.log(
      '[mm] product tele Zooknock stand',
      ZOOKNOCK_STAND,
      '(npc m43_142',
      ZOOKNOCK_NPC,
      ')'
    );
    if (!(await teleTo(page, ZOOKNOCK_STAND, 2, 25_000))) fail('tele Zooknock stand failed');
    await waitSceneReady(page, 20_000);
    const here = await readTile(page);
    console.log('[mm] after tele tile', JSON.stringify(here));

    console.log('[mm] product Talk Zooknock (story → need_items)');
    let zookVb = 0;
    for (let i = 0; i < 80; i++) {
      await talkNpc(page, 'Zooknock', ['continue', 'yes'], 64);
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        globalThis.__lc377?.actions?.continueDialog?.();
        globalThis.__lc377?.actions?.dismissModalMessage?.();
      });
      zookVb = await getServerVarQuiet(page, 'mm_zooknock');
      if (Number(zookVb) >= 5) break;
    }
    zookVb = await getServerVarQuiet(page, 'mm_zooknock');
    const tile = await readTile(page);
    console.log(`[mm] after Zooknock mm_zooknock=${zookVb} tile=${JSON.stringify(tile)}`);
    if (shot) await shot('after-zooknock-mission');
    if (!(Number(zookVb) >= 5)) {
      fail(`MM Zooknock FAIL: mm_zooknock=${zookVb} want≥5 (need_items)`);
    }
    console.log(
      `RESULT: PASS (MM Zooknock mm_zooknock=${zookVb} ≥5 need_items tile=${tile?.x},${tile?.z}; product talk; SOFT garkor2+combat prep; item hand-in residual)`
    );
    process.exit(0);
  }

  // --- Garkor intro mid: soft arrived_atoll → product Talk Garkor → mm_garkor≥2 ---
  // Product: [opnpc1,mm_garkor_aa] not_started → spoken → p2 → speak_zooknock (2).
  if (fromStage === 11) {
    console.log('[mm] SOFT mm_main 3 → product Garkor intro mm_garkor≥2');
    await cheatQuiet(page, 'setvar mm_main 3', 400); // arrived_atoll
    await cheatQuiet(page, 'setvar mm_daero 7', 300);
    await cheatQuiet(page, 'setvar mm_waydar 1', 200);
    await cheatQuiet(page, 'setvar mm_lumdo 3', 200); // travelled
    await cheatQuiet(page, 'setvar mm_garkor 0', 200);
    let mainVb = await getServerVarQuiet(page, 'mm_main');
    if (Number(mainVb) !== 3) fail(`soft FROM 11 failed mm_main=${mainVb}`);

    console.log('[mm] product tele Garkor', GARKOR);
    if (!(await teleTo(page, GARKOR, 2, 25_000))) fail('tele Garkor failed');
    await waitSceneReady(page, 15_000);

    console.log('[mm] product Talk Garkor (intro → speak_zooknock)');
    let garkorVb = 0;
    for (let i = 0; i < 64; i++) {
      await talkNpc(page, 'Garkor', ['continue', 'yes'], 56);
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        globalThis.__lc377?.actions?.continueDialog?.();
        globalThis.__lc377?.actions?.dismissModalMessage?.();
      });
      garkorVb = await getServerVarQuiet(page, 'mm_garkor');
      if (Number(garkorVb) >= 2) break;
    }
    garkorVb = await getServerVarQuiet(page, 'mm_garkor');
    const tile = await readTile(page);
    console.log(`[mm] after Garkor mm_garkor=${garkorVb} tile=${JSON.stringify(tile)}`);
    if (shot) await shot('after-garkor-intro');
    if (!(Number(garkorVb) >= 2)) {
      fail(`MM Garkor intro FAIL: mm_garkor=${garkorVb} want≥2 (speak_zooknock)`);
    }
    console.log(
      `RESULT: PASS (MM Garkor intro mm_garkor=${garkorVb} ≥2; product first talk; SOFT main3; Zooknock residual)`
    );
    process.exit(0);
  }

  // --- ch2 cutscene mid: soft lumdo2+waydar1 → product Waydar order → mm_main≥3 ---
  if (fromStage === 10) {
    console.log('[mm] SOFT lumdo2+waydar1 → product ch2 cutscene mm_main≥3');
    await cheatQuiet(page, 'setvar mm_main 2', 400);
    await cheatQuiet(page, 'setvar mm_daero 7', 300);
    await cheatQuiet(page, 'setvar mm_waydar 1', 300);
    await cheatQuiet(page, 'setvar mm_lumdo 2', 300); // wont_take
    await cheatQuiet(page, 'setvar mm_hangar_puzzle_complete 1', 200);
    let mainVb = await getServerVarQuiet(page, 'mm_main');
    if (Number(mainVb) !== 2) fail(`soft FROM 10 failed mm_main=${mainVb}`);

    console.log('[mm] product tele Crash Island stand', CRASH_STAND);
    if (!(await teleTo(page, CRASH_STAND, 2, 25_000))) fail('tele crash failed');
    await waitSceneReady(page, 15_000);

    console.log('[mm] product Talk Waydar → convince Lumdo path → ch2');
    for (let i = 0; i < 80; i++) {
      await talkNpc(
        page,
        'Waydar',
        [
          'cannot convince',
          'lumdo',
          'what shall',
          'recognize',
          'kingdom',
          'continue',
          'yes'
        ],
        48
      );
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        globalThis.__lc377?.actions?.continueDialog?.();
        globalThis.__lc377?.actions?.dismissModalMessage?.();
        // dismiss chapter scroll / main modal if open
        globalThis.__lc377?.actions?.closeInterface?.();
      });
      mainVb = await getServerVarQuiet(page, 'mm_main');
      if (Number(mainVb) >= 3) break;
      await page.waitForTimeout(400);
    }
    // wait tele to atoll if mid cutscene
    for (let w = 0; w < 40; w++) {
      mainVb = await getServerVarQuiet(page, 'mm_main');
      if (Number(mainVb) >= 3) break;
      await page.evaluate(() => {
        globalThis.__lc377?.actions?.continueDialog?.();
        globalThis.__lc377?.actions?.dismissModalMessage?.();
      });
      await page.waitForTimeout(400);
    }
    mainVb = await getServerVarQuiet(page, 'mm_main');
    const lumdoVb = await getServerVarQuiet(page, 'mm_lumdo');
    const tile = await readTile(page);
    console.log(
      `[mm] after ch2 mm_main=${mainVb} mm_lumdo=${lumdoVb} tile=${JSON.stringify(tile)}`
    );
    if (shot) await shot('after-mm-ch2');
    if (!(Number(mainVb) >= 3)) {
      fail(`MM ch2 FAIL: mm_main=${mainVb} want≥3 (arrived_atoll)`);
    }
    console.log(
      `RESULT: PASS (MM ch2 mm_main=${mainVb} ≥3 lumdo=${lumdoVb}; product Waydar→cutscene; SOFT lumdo2+waydar1)`
    );
    process.exit(0);
  }

  // --- Lumdo story mid: soft waydar1 → product Lumdo → mm_lumdo≥2 ---
  if (fromStage === 9) {
    console.log('[mm] SOFT waydar1 + seal → product Lumdo story ≥2');
    await cheatQuiet(page, 'setvar mm_main 2', 400);
    await cheatQuiet(page, 'setvar mm_daero 7', 300);
    await cheatQuiet(page, 'setvar mm_waydar 1', 300);
    await cheatQuiet(page, 'setvar mm_lumdo 0', 300);
    await cheatQuiet(page, 'give mm_gnome_royal_seal 1', 400);
    let lumdoVb = await getServerVarQuiet(page, 'mm_lumdo');
    if (Number(lumdoVb) !== 0) fail(`soft FROM 9 failed mm_lumdo=${lumdoVb}`);

    console.log('[mm] product tele Lumdo', LUMDO_STAND);
    if (!(await teleTo(page, LUMDO_STAND, 2, 25_000))) fail('tele Lumdo failed');
    await waitSceneReady(page, 15_000);

    console.log('[mm] product Talk Lumdo (proof + story → wont_take)');
    for (let i = 0; i < 56; i++) {
      await talkNpc(page, 'Lumdo', ['continue', 'yes'], 48);
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        globalThis.__lc377?.actions?.continueDialog?.();
        globalThis.__lc377?.actions?.dismissModalMessage?.();
      });
      lumdoVb = await getServerVarQuiet(page, 'mm_lumdo');
      if (Number(lumdoVb) >= 2) break;
    }
    lumdoVb = await getServerVarQuiet(page, 'mm_lumdo');
    const tile = await readTile(page);
    console.log(`[mm] after Lumdo mm_lumdo=${lumdoVb} tile=${JSON.stringify(tile)}`);
    if (shot) await shot('after-lumdo-story');
    if (!(Number(lumdoVb) >= 2)) {
      fail(`MM Lumdo FAIL: mm_lumdo=${lumdoVb} want≥2 (wont_take)`);
    }
    console.log(
      `RESULT: PASS (MM Lumdo mm_lumdo=${lumdoVb} ≥2; product crash story; SOFT waydar1+seal)`
    );
    process.exit(0);
  }

  // --- Waydar crash intro: soft daero7 + crash tele → product mm_waydar≥1 ---
  if (fromStage === 8) {
    console.log('[mm] SOFT crash tele + daero7 → product Waydar intro mm_waydar≥1');
    await cheatQuiet(page, 'setvar mm_main 2', 400);
    await cheatQuiet(page, 'setvar mm_daero 7', 300);
    await cheatQuiet(page, 'setvar mm_waydar 0', 300);
    await cheatQuiet(page, 'setvar mm_lumdo 0', 200);
    let waydarVb = await getServerVarQuiet(page, 'mm_waydar');
    if (Number(waydarVb) !== 0) fail(`soft FROM 8 failed mm_waydar=${waydarVb}`);

    console.log('[mm] product tele Crash Island', CRASH_STAND);
    if (!(await teleTo(page, CRASH_STAND, 2, 25_000))) fail('tele crash failed');
    await waitSceneReady(page, 15_000);

    console.log('[mm] product Talk Waydar (Where are we?)');
    for (let i = 0; i < 40; i++) {
      await talkNpc(page, 'Waydar', ['continue', 'yes'], 28);
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        globalThis.__lc377?.actions?.continueDialog?.();
        globalThis.__lc377?.actions?.dismissModalMessage?.();
      });
      waydarVb = await getServerVarQuiet(page, 'mm_waydar');
      if (Number(waydarVb) >= 1) break;
    }
    waydarVb = await getServerVarQuiet(page, 'mm_waydar');
    const tile = await readTile(page);
    console.log(`[mm] after Waydar intro mm_waydar=${waydarVb} tile=${JSON.stringify(tile)}`);
    if (shot) await shot('after-waydar-crash-intro');
    if (!(Number(waydarVb) >= 1)) {
      fail(`MM Waydar crash intro FAIL: mm_waydar=${waydarVb} want≥1`);
    }
    console.log(
      `RESULT: PASS (MM Waydar crash intro mm_waydar=${waydarVb} ≥1; product island talk; SOFT daero7+tele)`
    );
    process.exit(0);
  }

  // --- Waydar fly mid: soft daero_complete → product Yes fly → Crash Island ---
  // Product: [opnpc1,mm_waydar] daero=7 → Yes → glidermap + tele 0_45_42_13_37.
  if (fromStage === 7) {
    console.log('[mm] SOFT mm_daero 7 → product Waydar fly Crash Island');
    await cheatQuiet(page, 'setvar mm_main 2', 400);
    await cheatQuiet(page, 'setvar mm_narnode 7', 300);
    await cheatQuiet(page, 'setvar mm_daero 7', 400); // daero_complete
    await cheatQuiet(page, 'setvar mm_hangar_puzzle_complete 1', 300);
    let daeroVb = await getServerVarQuiet(page, 'mm_daero');
    if (Number(daeroVb) !== 7) fail(`soft FROM 7 failed mm_daero=${daeroVb}`);

    console.log('[mm] product tele final hangar', FINAL_HANGAR_DAERO);
    if (!(await teleTo(page, FINAL_HANGAR_DAERO, 2, 25_000))) fail('tele final hangar failed');
    await waitSceneReady(page, 15_000);

    console.log('[mm] product Talk Waydar Yes → fly crash island');
    for (let i = 0; i < 40; i++) {
      await talkNpc(page, 'Waydar', ['yes', 'wish to fly', 'fly', 'return'], 28);
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        globalThis.__lc377?.actions?.continueDialog?.();
        globalThis.__lc377?.actions?.dismissModalMessage?.();
      });
      const tile = await readTile(page);
      const tx = tile?.x | 0;
      const tz = tile?.z | 0;
      // crash island map square m45_42
      if (
        tx >= 45 * 64 &&
        tx <= 45 * 64 + 63 &&
        tz >= 42 * 64 &&
        tz <= 42 * 64 + 63
      ) {
        break;
      }
      await page.waitForTimeout(400);
    }
    // glidermap delay ~3 ticks + scene
    for (let w = 0; w < 30; w++) {
      const tile = await readTile(page);
      const tx = tile?.x | 0;
      const tz = tile?.z | 0;
      if (
        tx >= 45 * 64 &&
        tx <= 45 * 64 + 63 &&
        tz >= 42 * 64 &&
        tz <= 42 * 64 + 63
      ) {
        break;
      }
      await page.waitForTimeout(300);
    }
    const tile = await readTile(page);
    const tx = tile?.x | 0;
    const tz = tile?.z | 0;
    const onCrash =
      tx >= 45 * 64 &&
      tx <= 45 * 64 + 63 &&
      tz >= 42 * 64 &&
      tz <= 42 * 64 + 63;
    daeroVb = await getServerVarQuiet(page, 'mm_daero');
    console.log(
      `[mm] after fly mm_daero=${daeroVb} tile=${JSON.stringify(tile)} crash=${onCrash} want~${CRASH_ISLAND.x},${CRASH_ISLAND.z}`
    );
    if (shot) await shot('after-waydar-fly');
    if (!(Number(daeroVb) >= 7)) {
      fail(`MM Waydar fly FAIL: mm_daero=${daeroVb} want≥7`);
    }
    if (!onCrash) {
      fail(
        `MM Waydar fly FAIL: tile=${tx},${tz} want Crash Island ~${CRASH_ISLAND.x},${CRASH_ISLAND.z}`
      );
    }
    console.log(
      `RESULT: PASS (MM Waydar fly Crash Island tile=${tx},${tz}; product Yes fly; SOFT daero7; mm_main atoll residual)`
    );
    process.exit(0);
  }

  // --- Daero complete mid: soft reinit_complete → product hangar talk → daero_complete ≥7 ---
  // Product: [label,daero_hangar_dialogue] case reinit_complete → find Waydar → mm_daero=7.
  if (fromStage === 6) {
    console.log('[mm] SOFT mm_daero 6 → product Daero hangar orders ≥7');
    await cheatQuiet(page, 'setvar mm_main 2', 400);
    await cheatQuiet(page, 'setvar mm_narnode 7', 300);
    await cheatQuiet(page, 'setvar mm_daero 6', 400); // reinit_complete
    await cheatQuiet(page, 'setvar mm_hangar_puzzle_complete 1', 300);
    let daeroVb = await getServerVarQuiet(page, 'mm_daero');
    if (Number(daeroVb) !== 6) fail(`soft FROM 6 failed mm_daero=${daeroVb}`);

    console.log('[mm] product tele final hangar Daero', FINAL_HANGAR_DAERO);
    if (!(await teleTo(page, FINAL_HANGAR_DAERO, 2, 25_000))) fail('tele final hangar failed');
    await waitSceneReady(page, 15_000);

    console.log('[mm] product Talk Daero (reinit done → order Waydar fly)');
    for (let i = 0; i < 48; i++) {
      await talkNpc(page, 'Daero', ['continue', 'yes'], 40);
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        globalThis.__lc377?.actions?.continueDialog?.();
        globalThis.__lc377?.actions?.dismissModalMessage?.();
      });
      daeroVb = await getServerVarQuiet(page, 'mm_daero');
      if (Number(daeroVb) >= 7) break;
    }
    daeroVb = await getServerVarQuiet(page, 'mm_daero');
    const tile = await readTile(page);
    console.log(`[mm] after Daero complete mm_daero=${daeroVb} tile=${JSON.stringify(tile)}`);
    if (shot) await shot('after-daero-complete');
    if (!(Number(daeroVb) >= 7)) {
      fail(`MM Daero complete FAIL: mm_daero=${daeroVb} want≥7 (daero_complete)`);
    }
    console.log(
      `RESULT: PASS (MM Daero complete mm_daero=${daeroVb} ≥7; product hangar orders + Waydar present; SOFT daero6)`
    );
    process.exit(0);
  }

  // --- Reinit puzzle mid: soft started_reinit → product open + solve → daero ≥6 ---
  // Product: Open bunker_controlpanal → slide Move (opheld5) → hangar_cutscene → reinit_complete.
  // Do NOT soft-set mm_hangar_puzzle_complete before open — that uses the 289 "already
  // completed once" branch (init + 1-move shuffle), i.e. opens nearly solved. First-time
  // open must be complete=false → full 255-move scramble, then product solve.
  if (fromStage === 5) {
    console.log('[mm] SOFT mm_daero 5 only → product reinit open+solve ≥6 (no pre-complete bit)');
    await cheatQuiet(page, 'setvar mm_main 2', 500);
    await cheatQuiet(page, 'setvar mm_narnode 7', 400);
    await cheatQuiet(page, 'setvar mm_daero 5', 500); // started_reinit
    await cheatQuiet(page, 'setvar mm_hangar_puzzle_complete 0', 400);
    await cheatQuiet(page, 'setvar mm_hangar_cutscene_flag 0', 300);
    let daeroVb = await getServerVarQuiet(page, 'mm_daero');
    if (Number(daeroVb) !== 5) fail(`soft FROM 5 failed mm_daero=${daeroVb}`);

    console.log('[mm] product tele hangar control panel', CONTROL_PANEL);
    // stand beside panel (not on loc)
    const panelStand = { x: CONTROL_PANEL.x - 1, z: CONTROL_PANEL.z, level: 0 };
    if (!(await teleTo(page, panelStand, 2, 25_000))) fail('tele hangar panel failed');
    await waitSceneReady(page, 15_000);

    // Panel op is Operate (not Open). Once IF open: no dismiss/continue/close.
    console.log('[mm] product Operate control panel (reinit puzzle)');
    let opened = false;
    for (let i = 0; i < 16; i++) {
      const snap = await page.evaluate(([gx, gz]) => {
        const a = globalThis.__lc377?.actions;
        const r = globalThis.__lc377?.reader;
        const mainBefore = r?.modals?.()?.main ?? -1;
        let opOk = false;
        if (mainBefore === -1) {
          opOk =
            !!a?.opLocAt?.(gx, gz, 'Operate') ||
            !!a?.opLoc?.('Reinitialisation', 'Operate') ||
            !!a?.opLoc?.('Panel', 'Operate');
        }
        const main = r?.modals?.()?.main ?? -1;
        const items = r?.mainModalInvItems?.() ?? [];
        return { opOk, main, n: items.length };
      }, [CONTROL_PANEL.x, CONTROL_PANEL.z]);
      if (i === 0 || i % 3 === 0) console.log('[mm] operate panel', snap);
      await page.waitForTimeout(500);
      if (snap.main !== -1 && snap.n >= 20) {
        opened = true;
        break;
      }
      if (snap.main !== -1 && snap.n === 0) {
        await page.waitForTimeout(800);
        const n2 = await page.evaluate(
          () => (globalThis.__lc377?.reader?.mainModalInvItems?.() ?? []).length
        );
        if (n2 >= 20) {
          opened = true;
          console.log('[mm] puzzle inv arrived n=', n2);
          break;
        }
      }
    }
    if (!opened) {
      fail('MM reinit: puzzle IF never opened with pieces (use Operate)');
    }

    // RL-style solve: board from inv → IDA* → OP_HELD5 via useMenuOption (not menuAction scene gate)
    const items0 = await page.evaluate(() => globalThis.__lc377?.reader?.mainModalInvItems?.() ?? []);
    console.log('[mm] board pieces', items0.length);
    console.log('[mm] solving…');
    const tSolve0 = Date.now();
    let plan;
    try {
      plan = solveFromInvItems(items0);
    } catch (e) {
      fail(`MM reinit solver: ${e?.message || e}`);
    }
    console.log(
      `[mm] solver clicks=${plan.clicks.length} ms=${Date.now() - tSolve0} (RL id/2 + IDA*)`
    );

    const OP_HELD5 = 100;
    const SCRATCH = 499;

    async function ensurePuzzleOpen() {
      for (let k = 0; k < 8; k++) {
        const main = await page.evaluate(() => globalThis.__lc377?.reader?.modals?.()?.main ?? -1);
        if (main !== -1) {
          const n = await page.evaluate(
            () => (globalThis.__lc377?.reader?.mainModalInvItems?.() ?? []).length
          );
          if (n >= 20) return true;
        }
        await page.evaluate(([gx, gz]) => {
          globalThis.__lc377?.actions?.opLocAt?.(gx, gz, 'Operate');
        }, [CONTROL_PANEL.x, CONTROL_PANEL.z]);
        await page.waitForTimeout(700);
      }
      return false;
    }

    async function emptySlot() {
      return page.evaluate(() => {
        const items = globalThis.__lc377?.reader?.mainModalInvItems?.() ?? [];
        const filled = new Set(items.map(x => x.slot));
        for (let s = 0; s < 25; s++) if (!filled.has(s)) return s;
        return -1;
      });
    }

    // After last slide, product if_close + cutscene — do NOT re-Operate (1-move thrash loop).
    // Do not getvar mid-solve. Re-plan only while IF still open.
    for (let i = 0; i < plan.clicks.length; i++) {
      const { clickSlot, emptyTo } = plan.clicks[i];
      const mainOpen = await page.evaluate(() => globalThis.__lc377?.reader?.modals?.()?.main ?? -1);
      if (mainOpen === -1) {
        // IF closed early → solve may have completed (if_close on last piece)
        console.log(`[mm] IF closed @ move ${i + 1}/${plan.clicks.length} — treat as solve/cutscene`);
        break;
      }

      const moved = await page.evaluate(
        ([slot, opHeld5, scratch]) => {
          const client = globalThis.__lc377?.client;
          const r = globalThis.__lc377?.reader;
          const main = r?.modals?.()?.main ?? -1;
          if (main === -1 || !client) return { ok: false, reason: 'if_closed' };
          const items = r?.mainModalInvItems?.() ?? [];
          const it = items.find(x => x.slot === slot);
          if (!it) return { ok: false, reason: 'no_piece', slot, n: items.length };
          client.menuAction[scratch] = opHeld5;
          client.menuParamA[scratch] = it.id | 0;
          client.menuParamB[scratch] = it.slot | 0;
          client.menuParamC[scratch] = it.comId | 0;
          client.useMenuOption(scratch);
          return { ok: true, slot: it.slot, id: it.id, scene: client.sceneState };
        },
        [clickSlot, OP_HELD5, SCRATCH]
      );
      if (i < 5 || i % 15 === 0 || !moved.ok) {
        console.log(`[mm] move ${i + 1}/${plan.clicks.length}`, moved);
      }
      await page.waitForTimeout(520);

      const mainAfter = await page.evaluate(() => globalThis.__lc377?.reader?.modals?.()?.main ?? -1);
      if (mainAfter === -1) {
        console.log('[mm] IF closed after move (product if_close on complete)');
        break;
      }

      const empty = await emptySlot();
      if (empty !== emptyTo && empty >= 0) {
        console.log(`[mm] desync empty=${empty} want=${emptyTo} @${i + 1} — replan`);
        const itemsNow = await page.evaluate(() => globalThis.__lc377?.reader?.mainModalInvItems?.() ?? []);
        if (itemsNow.length < 20) {
          console.log('[mm] board gone with IF open — stop');
          break;
        }
        try {
          plan = solveFromInvItems(itemsNow);
          console.log('[mm] re-planned clicks=', plan.clicks.length);
          i = -1;
          continue;
        } catch (e) {
          fail(`MM reinit re-plan: ${e?.message || e}`);
        }
      }
    }
    // Stage writes on solve; cutscene still runs (~3+2+3+7 ticks) → final hangar 0_41_70_25_27.
    // Do NOT exit on daero=6 alone — that killed the client mid-cutscene (stuck at viewing 0_40_70,
    // magic tab blank). Wait for product final tele.
    const FINAL_HANGAR = {
      x: 41 * 64 + 25, // 2649
      z: 70 * 64 + 27, // 4507
      // accept whole post-reinit hangar map square
      mapMinX: 41 * 64,
      mapMaxX: 41 * 64 + 63,
      mapMinZ: 70 * 64,
      mapMaxZ: 70 * 64 + 63
    };
    const VIEW_MAP = { minX: 40 * 64, maxX: 40 * 64 + 63, minZ: 70 * 64, maxZ: 70 * 64 + 63 };
    // Prefer worldTile (attach ABI); reader.tile is not always present → null → false FAIL.
    const readTile = () =>
      page.evaluate(() => {
        const r = globalThis.__lc377?.reader;
        return r?.worldTile?.() ?? globalThis.__lc377?.worldTile?.() ?? r?.tile?.() ?? null;
      });
    console.log('[mm] waiting stage/cutscene → mm_daero≥6 + final hangar tele (0_41_70)');
    let tile = null;
    let onFinal = false;
    for (let w = 0; w < 80; w++) {
      daeroVb = await getServerVarQuiet(page, 'mm_daero');
      tile = await readTile();
      const tx = tile?.x | 0;
      const tz = tile?.z | 0;
      onFinal =
        !!tile &&
        tx >= FINAL_HANGAR.mapMinX &&
        tx <= FINAL_HANGAR.mapMaxX &&
        tz >= FINAL_HANGAR.mapMinZ &&
        tz <= FINAL_HANGAR.mapMaxZ;
      if (Number(daeroVb) >= 6 && onFinal) break;
      if (w % 8 === 0) {
        console.log(`[mm] cutscene wait ${w} daero=${daeroVb} tile=${tile ? `${tx},${tz}` : 'null'}`);
      }
      await page.waitForTimeout(400);
    }
    daeroVb = await getServerVarQuiet(page, 'mm_daero');
    tile = await readTile();
    const tx = tile?.x | 0;
    const tz = tile?.z | 0;
    onFinal =
      tx >= FINAL_HANGAR.mapMinX &&
      tx <= FINAL_HANGAR.mapMaxX &&
      tz >= FINAL_HANGAR.mapMinZ &&
      tz <= FINAL_HANGAR.mapMaxZ;
    const onView =
      tx >= VIEW_MAP.minX && tx <= VIEW_MAP.maxX && tz >= VIEW_MAP.minZ && tz <= VIEW_MAP.maxZ;
    console.log(
      `[mm] after reinit mm_daero=${daeroVb} tile=${JSON.stringify(tile)} final=${onFinal} view=${onView}`
    );
    if (shot) await shot('after-reinit-complete');
    if (!(Number(daeroVb) >= 6)) {
      fail(`MM reinit FAIL: mm_daero=${daeroVb} want≥6 (reinit_complete)`);
    }
    if (!onFinal) {
      fail(
        `MM reinit FAIL: cutscene incomplete tile=${tx},${tz} want final hangar ~${FINAL_HANGAR.x},${FINAL_HANGAR.z} (viewing platform=${onView})`
      );
    }
    console.log(
      `RESULT: PASS (MM reinit mm_daero=${daeroVb} ≥6 tile=${tx},${tz} final hangar; product panel+scramble+solve+cutscene; SOFT daero5 only)`
    );
    process.exit(0);
  }

  // --- Hangar leave mid: soft daero learnt → Leave → hangar intro → started_reinit ≥5 ---
  if (fromStage === 4) {
    console.log('[mm] SOFT mm_daero 3 → product Leave hangar + Waydar intro ≥5');
    await cheatQuiet(page, 'setvar mm_main 2', 500);
    await cheatQuiet(page, 'setvar mm_narnode 7', 400);
    await cheatQuiet(page, 'setvar mm_daero 3', 400); // learnt_mission
    await cheatQuiet(page, 'setvar mm_caranock 3', 300);
    let daeroVb = await getServerVarQuiet(page, 'mm_daero');
    if (Number(daeroVb) !== 3) fail(`soft FROM 4 failed mm_daero=${daeroVb}`);

    console.log('[mm] product tele Daero GT', DAERO_GT);
    if (!(await teleTo(page, DAERO_GT, 2, 25_000))) fail('tele Daero GT failed');
    await waitSceneReady(page, 15_000);

    // Leave… → left_grandtree (4) + tele hangar; then hangar Daero+Waydar → started_reinit (5)
    console.log('[mm] product Talk Daero Leave → hangar reinit start');
    for (let i = 0; i < 56; i++) {
      await talkNpc(
        page,
        'Daero',
        [
          'leave',
          'who is it',
          'yes',
          'work better',
          'continue',
          'journey',
          'squad',
          'caranock'
        ],
        36
      );
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        globalThis.__lc377?.actions?.continueDialog?.();
        globalThis.__lc377?.actions?.dismissModalMessage?.();
      });
      daeroVb = await getServerVarQuiet(page, 'mm_daero');
      if (Number(daeroVb) >= 5) break; // started_reinit
      // after leave tele, scene may lag — wait hangar / re-talk
      if (Number(daeroVb) >= 4 && i % 6 === 5) {
        await waitSceneReady(page, 12_000).catch(() => {});
        const tile = await page.evaluate(() => {
          const t = globalThis.__lc377?.reader?.tile?.();
          return t ?? null;
        });
        if (i % 12 === 11) console.log('[mm] hangar tile', tile, 'daero', daeroVb);
      }
    }
    daeroVb = await getServerVarQuiet(page, 'mm_daero');
    const tile = await page.evaluate(() => globalThis.__lc377?.reader?.tile?.() ?? null);
    console.log(`[mm] after hangar mm_daero=${daeroVb} tile=${JSON.stringify(tile)}`);
    if (shot) await shot('after-hangar-reinit-start');
    if (!(Number(daeroVb) >= 5)) {
      fail(`MM hangar leave FAIL: mm_daero=${daeroVb} want≥5 (started_reinit)`);
    }
    console.log(
      `RESULT: PASS (MM hangar leave mm_daero=${daeroVb} ≥5 started_reinit; product Leave+Waydar intro; SOFT daero3)`
    );
    process.exit(0);
  }

  // --- Daero orders mid: soft narnode_received + give orders → product daero ≥3 ---
  if (fromStage === 3) {
    console.log('[mm] SOFT mm_main 2 + narnode_received + orders → product Daero learnt_mission');
    await cheatQuiet(page, 'setvar mm_main 2', 500);
    await cheatQuiet(page, 'setvar mm_narnode 7', 400); // received_orders
    await cheatQuiet(page, 'setvar mm_daero 0', 400);
    await cheatQuiet(page, 'setvar mm_caranock 3', 300);
    stage = await getServerVarQuiet(page, 'mm_main');
    if (Number(stage) !== 2) fail(`soft FROM 3 failed mm_main=${stage}`);
    await page.evaluate(() => {
      const free = globalThis.__lc377?.reader?.invFree?.() ?? 0;
      if (free < 2) globalThis.__lc377?.actions?.cheat?.('~clearinv');
    });
    await cheatQuiet(page, 'give mm_narnode_orders 1', 600);

    console.log('[mm] product tele Daero GT', DAERO_GT);
    if (!(await teleTo(page, DAERO_GT, 2, 25_000))) fail('tele Daero failed');
    await waitSceneReady(page, 15_000);

    console.log('[mm] product Talk Daero → hand orders');
    let daeroVb = null;
    for (let i = 0; i < 48; i++) {
      await talkNpc(
        page,
        'Daero',
        [
          'daero',
          'orders',
          'hand',
          'tell me',
          'where',
          'journey',
          'leave',
          'yes',
          'who is it',
          'continue'
        ],
        40
      );
      await page.waitForTimeout(350);
      await page.evaluate(() => {
        globalThis.__lc377?.actions?.continueDialog?.();
        globalThis.__lc377?.actions?.dismissModalMessage?.();
      });
      daeroVb = await getServerVarQuiet(page, 'mm_daero');
      if (Number(daeroVb) >= 3) break; // learnt_mission
      if (i % 8 === 7) await teleTo(page, DAERO_GT, 1, 10_000).catch(() => {});
    }
    daeroVb = await getServerVarQuiet(page, 'mm_daero');
    stage = await getServerVarQuiet(page, 'mm_main');
    console.log(`[mm] after Daero mm_daero=${daeroVb} mm_main=${stage}`);
    if (shot) await shot('after-daero-orders');
    if (!(Number(daeroVb) >= 3)) {
      fail(`MM Daero orders FAIL: mm_daero=${daeroVb} want≥3 (learnt_mission)`);
    }
    console.log(
      `RESULT: PASS (MM Daero learnt_mission mm_daero=${daeroVb} ≥3; product hand orders; SOFT narnode7+orders; mm_main=${stage})`
    );
    process.exit(0);
  }

  // --- Narnode return mid: soft stage 2 + caranock done → product orders ---
  // Product: mm_narnode_returned → p4/p5/p6 → narnode_received_orders + mm_narnode_orders.
  // Does not advance mm_main (stays 2). Next product: Daero.
  if (fromStage === 2) {
    console.log('[mm] SOFT mm_main 2 + caranock p3 → product Narnode orders');
    await cheatQuiet(page, 'setvar mm_main 2', 500);
    await cheatQuiet(page, 'setvar mm_narnode 3', 400); // given_seal
    await cheatQuiet(page, 'setvar mm_caranock 3', 400); // p3 done
    stage = await getServerVarQuiet(page, 'mm_main');
    if (Number(stage) !== 2) fail(`soft FROM 2 failed mm_main=${stage}`);
    await page.evaluate(() => {
      const free = globalThis.__lc377?.reader?.invFree?.() ?? 0;
      if (free < 2) globalThis.__lc377?.actions?.cheat?.('~clearinv');
    });

    console.log('[mm] product tele Narnode', NARNODE);
    if (!(await teleTo(page, NARNODE, 2, 25_000))) fail('tele Narnode failed');
    await waitSceneReady(page, 15_000);

    console.log('[mm] product Talk King Narnode → orders');
    let hasOrders = false;
    let narnodeVb = null;
    for (let i = 0; i < 40; i++) {
      await talkNpc(
        page,
        'King Narnode',
        [
          'investigated',
          'shipyard',
          'caranock',
          'winds',
          'information',
          'daero',
          'yes',
          'continue'
        ],
        36
      );
      await page.waitForTimeout(350);
      await page.evaluate(() => {
        globalThis.__lc377?.actions?.continueDialog?.();
        globalThis.__lc377?.actions?.dismissModalMessage?.();
        globalThis.__lc377?.actions?.closeInterface?.();
      });
      hasOrders = await page.evaluate(() => {
        const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
        return inv.some(x => /narnode.*order|order/i.test(String(x?.name ?? '')));
      });
      narnodeVb = await getServerVarQuiet(page, 'mm_narnode');
      if (hasOrders || Number(narnodeVb) >= 7) break;
    }
    stage = await getServerVarQuiet(page, 'mm_main');
    narnodeVb = await getServerVarQuiet(page, 'mm_narnode');
    console.log(
      `[mm] after Narnode return mm_main=${stage} mm_narnode=${narnodeVb} orders=${hasOrders}`
    );
    if (shot) await shot('after-narnode-orders');
    if (!hasOrders && !(Number(narnodeVb) >= 7)) {
      fail(
        `MM Narnode return FAIL: no orders (mm_narnode=${narnodeVb} want≥7 received_orders)`
      );
    }
    console.log(
      `RESULT: PASS (MM Narnode return orders mm_narnode=${narnodeVb} orders=${hasOrders}; mm_main=${stage} stays 2; SOFT seal+caranock+GT)`
    );
    process.exit(0);
  }

  // --- shipyard seal mid: soft stage 1 + seal → product shown_seal ≥2 ---
  if (fromStage === 1) {
    console.log('[mm] SOFT mm_main 1 + royal seal → product shipyard gate ≥2');
    await cheatQuiet(page, 'setvar mm_main 1', 500);
    await cheatQuiet(page, 'setvar mm_narnode 3', 400); // given_seal
    await cheatQuiet(page, 'setvar mm_caranock 0', 400);
    stage = await getServerVarQuiet(page, 'mm_main');
    if (Number(stage) !== 1) fail(`soft FROM 1 failed got ${stage}`);
    await page.evaluate(() => {
      const free = globalThis.__lc377?.reader?.invFree?.() ?? 0;
      if (free < 2) globalThis.__lc377?.actions?.cheat?.('~clearinv');
    });
    await cheatQuiet(page, 'give mm_gnome_royal_seal 1', 600);

    console.log('[mm] product tele shipyard outside gate', SHIPYARD_OUTSIDE);
    if (!(await teleTo(page, SHIPYARD_OUTSIDE, 1, 25_000))) fail('tele shipyard failed');
    await waitSceneReady(page, 15_000);

    // Open gate west of loc → shipyardworker_gate → MM seal when mm_main==1
    // Dump nearby locs once for thrash debug
    const locDump = await page.evaluate(() => {
      const locs = globalThis.__lc377?.reader?.locs?.() ?? [];
      return locs
        .filter(l => /gate/i.test(String(l?.name ?? '')))
        .slice(0, 12)
        .map(l => ({
          name: l?.name,
          x: l?.x ?? l?.worldX,
          z: l?.z ?? l?.worldZ,
          index: l?.index,
          ops: l?.ops
        }));
    });
    console.log('[mm] nearby Gate locs', JSON.stringify(locDump));

    // Product gate: west of loc + grandtree_shipyardguard in range → shipyardworker_gate
    // → mm_shipyardworker_dialogue (mm_main==1) → seal → mm_main=2.
    // Do NOT closeInterface / re-Open while chat is open — that aborts before %mm_main=2.
    console.log('[mm] product Open Gate (seal path)');
    // Confirm seal + guard before thrash
    const preGate = await page.evaluate(() => {
      const r = globalThis.__lc377?.reader;
      const inv = (r?.inventory?.() ?? []).map(i => i?.name).filter(Boolean);
      const npcs = (r?.npcs?.() ?? [])
        .filter(n => /shipyard|worker|guard|caranock/i.test(String(n?.name ?? '')))
        .slice(0, 8)
        .map(n => ({
          name: n?.name,
          x: n?.tile?.x ?? n?.x,
          z: n?.tile?.z ?? n?.z,
          d: n?.distance
        }));
      const tile = r?.tile?.() ?? null;
      return { inv, npcs, tile };
    });
    console.log('[mm] pre-gate', JSON.stringify(preGate));
    if (!String(JSON.stringify(preGate.inv)).toLowerCase().includes('seal')) {
      fail('MM shipyard: no Gnome royal seal in inv before gate');
    }

    for (let i = 0; i < 48; i++) {
      const chatState = await page.evaluate(() => {
        const a = globalThis.__lc377?.actions;
        const r = globalThis.__lc377?.reader;
        const chat = r?.modals?.()?.chat ?? -1;
        const opts = (r?.chatOptions?.() ?? [])
          .map(o => (typeof o === 'string' ? o : o?.text))
          .filter(Boolean);
        const chatOpen = chat !== -1 || opts.length > 0;
        if (chatOpen) {
          if (opts.length) {
            const low = opts.map(o => String(o).toLowerCase());
            // GT multi fallback if MM branch missed; prefer seal/mission lines
            let j = low.findIndex(o => /mission|seal|narnode|special|glough/i.test(o));
            if (j < 0) j = 0;
            a?.chooseOption?.([opts[j]]);
          } else {
            a?.continueDialog?.();
            a?.dismissModalMessage?.();
          }
          return { chatOpen: true, chat, opts: opts.slice(0, 4) };
        }
        return { chatOpen: false, chat, opts: [] };
      });
      if (chatState.chatOpen) {
        if (i === 0 || i % 5 === 0) console.log('[mm] seal chat', chatState);
        await page.waitForTimeout(450);
        stage = await getServerVarQuiet(page, 'mm_main');
        if (Number(stage) >= 2) break;
        continue;
      }

      // Chat clear: re-stand west of gate (open-without-dialogue teleports inside)
      if (i % 4 === 0) {
        await teleTo(page, SHIPYARD_OUTSIDE, 1, 10_000).catch(() => {});
        await page.waitForTimeout(400);
      }
      const op = await page.evaluate(([gx, gz]) => {
        const a = globalThis.__lc377?.actions;
        // attach-in-page: opLocAt / opLoc — not locOp
        let ok =
          !!a?.opLocAt?.(gx, gz, 'Open') ||
          !!a?.opLocAt?.(gx, gz, '') ||
          !!a?.opLocAt?.(gx, gz + 1, 'Open') ||
          !!a?.opLoc?.('Gate', 'Open');
        return { ok, gx, gz };
      }, [SHIPYARD_GATE_LOC.x, SHIPYARD_GATE_LOC.z]);
      if (i === 0 || i % 6 === 0) console.log('[mm] opLocAt gate', op);
      await page.waitForTimeout(700);
      stage = await getServerVarQuiet(page, 'mm_main');
      if (Number(stage) >= 2) break;
    }
    stage = await getServerVarQuiet(page, 'mm_main');
    console.log(`[mm] after gate seal mm_main=${stage}`);
    if (shot) await shot('after-shipyard-seal');
    if (!(Number(stage) >= 2)) {
      fail(`MM shipyard seal FAIL: mm_main=${stage} want≥2 (shown_seal)`);
    }

    // Product Caranock winds story (varbit; does not advance mm_main)
    console.log('[mm] product tele Caranock', CARANOCK);
    if (!(await teleTo(page, CARANOCK, 2, 25_000))) fail('tele Caranock failed');
    await waitSceneReady(page, 15_000);
    for (let i = 0; i < 24; i++) {
      await talkNpc(
        page,
        'Caranock',
        ['continue', 'click here', 'yes', '10th', 'squad', 'disappear'],
        28
      );
      await page.waitForTimeout(300);
      await page.evaluate(() => {
        globalThis.__lc377?.actions?.continueDialog?.();
        globalThis.__lc377?.actions?.closeInterface?.();
      });
    }
    if (shot) await shot('after-caranock');
    console.log(
      `RESULT: PASS (MM shipyard seal mm_main=${stage} ≥2 + Caranock talk; product gate/seal; SOFT stage1+seal+GT)`
    );
    process.exit(0);
  }

  // --- default start mid ---
  await cheatQuiet(page, 'setvar mm_main 0', 400);
  await cheatQuiet(page, 'setvar mm_narnode 0', 400);

  console.log('[mm] product tele Narnode', NARNODE);
  if (!(await teleTo(page, NARNODE, 2, 25_000))) fail('tele Narnode failed');
  await waitSceneReady(page, 15_000);

  console.log('[mm] product Talk King Narnode → start mm_main≥1');
  for (let i = 0; i < 48; i++) {
    await talkNpc(
      page,
      'King Narnode',
      [
        'yes',
        'start monkey madness',
        'start',
        'ok',
        'continue',
        'click here',
        'worried',
        'what'
      ],
      36
    );
    await page.waitForTimeout(400);
    // chapter card IF
    await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      a?.continueDialog?.();
      a?.dismissModalMessage?.();
      a?.closeInterface?.();
    });
    stage = await getServerVarQuiet(page, 'mm_main');
    if (Number(stage) >= 1) break;
    if (i % 5 === 4) {
      await page.evaluate(() => {
        globalThis.__lc377?.actions?.talkNpc?.('King Narnode');
      });
    }
  }
  stage = await getServerVarQuiet(page, 'mm_main');
  const snap = await page.evaluate(() => {
    const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
    const seal = inv.some(x => /gnome royal seal/i.test(String(x?.name ?? '')));
    return { seal, inv: inv.map(x => x?.name) };
  });
  console.log(`[mm] after Narnode mm_main=${stage} seal=${snap.seal} inv=${JSON.stringify(snap.inv)}`);
  if (shot) await shot('after-mm-start');
  if (!(Number(stage) >= 1)) {
    fail(`MM start FAIL: mm_main=${stage} want≥1 (mm_started)`);
  }
  if (!snap.seal) {
    fail(`MM start FAIL: mm_main=${stage} but no Gnome royal seal (false stage / wrong path)`);
  }
  // Close leftover main IF so we do not claim pass on shoe-store thrash mess
  await page.evaluate(() => {
    const a = globalThis.__lc377?.actions;
    for (let i = 0; i < 8; i++) {
      a?.closeInterface?.();
      a?.continueDialog?.();
      a?.dismissModalMessage?.();
    }
  });
  await page.waitForTimeout(400);
  if (shot) await shot('after-mm-start-clean');
  console.log(
    `RESULT: PASS (Monkey Madness start mm_main=${stage} ≥1 + royal seal; product Narnode; SOFT grandtree160+treequest9; chapter IF=scroll not inter_199)`
  );
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
