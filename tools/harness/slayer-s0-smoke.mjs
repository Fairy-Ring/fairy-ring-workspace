#!/usr/bin/env node
/**
 * Slayer S0 mid-gate — enable proof (assign + optional kill credit).
 *
 *   node tools/harness/slayer-s0-smoke.mjs
 *   SLAYER_S0_KILL=1 node tools/harness/slayer-s0-smoke.mjs   # also kill 1 task NPC if soft map known
 *
 * Host prep only: tele, setstat slayer 1, optional food. No setvar task force.
 * Product: engine PlayerStatEnabled[18]=true; content skill_slayer already on 377.
 *
 * @see docs/research/slayer-377-s0-enable.md
 * @see docs/plans/2026-08-07-slayer-s0-smoke-design.md
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
  waitSceneReady
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'sls0');
const wantKill =
  process.env.SLAYER_S0_KILL === '1' || process.env.SLAYER_S0_KILL === 'true';
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

/** Turael hut — m45_55 `0 51 16: 70` → 2931,3536 */
const TURAEL = { x: 2931, z: 3536, level: 0 };

/**
 * Soft kill map by %slayer_target id (slayer.constant) — do not rely on chat text.
 * Turael can assign lizards/crawlers/etc.; those are not S0b soft kills.
 */
const TARGET_SOFT = {
  1: 'monkey',
  2: 'goblin',
  3: 'rat',
  4: 'spider',
  5: 'bird',
  6: 'cow'
};

/** Soft kill tele tiles (host tele only). */
const SOFT_KILL_TILES = {
  rat: { x: 3206, z: 3209, level: 0 },
  cow: { x: 3253, z: 3267, level: 0 },
  goblin: { x: 3243, z: 3241, level: 0 },
  bird: { x: 3235, z: 3288, level: 0 },
  spider: { x: 3182, z: 3190, level: 0 },
  monkey: { x: 2756, z: 2775, level: 0 }
};

const ATTACK_NAMES = {
  rat: ['Rat', 'Giant rat'],
  cow: ['Cow', 'Cow calf'],
  goblin: ['Goblin'],
  bird: ['Chicken', 'Bird'],
  spider: ['Spider', 'Giant spider'],
  monkey: ['Monkey']
};

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

async function invHas(page, substr) {
  return page.evaluate(s => {
    const want = String(s).toLowerCase();
    return (globalThis.__lc377?.reader?.inventory?.() ?? []).some(
      i => i?.name && String(i.name).toLowerCase().includes(want)
    );
  }, substr);
}

async function slayerStat(page) {
  return page.evaluate(() => {
    const names = [
      'attack',
      'defence',
      'strength',
      'hitpoints',
      'ranged',
      'prayer',
      'magic',
      'cooking',
      'woodcutting',
      'fletching',
      'fishing',
      'firemaking',
      'crafting',
      'smithing',
      'mining',
      'herblore',
      'agility',
      'thieving',
      'slayer',
      'farming',
      'runecraft'
    ];
    const i = names.indexOf('slayer');
    return globalThis.__lc377?.reader?.stat?.(i) ?? null;
  });
}

const browser = await launchBrowser();
let page = null;
try {
  page = await browser.newPage();
  page.on('console', msg => {
    const t = msg.text();
    if (/slayer|turael|error|trigger|script/i.test(t)) {
      console.log(`[browser.${msg.type()}] ${t.slice(0, 260)}`);
    }
  });

  console.log(`[slayer-s0] ${base} user=${username} kill=${wantKill}`);
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`slayer-s0_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }

  await mainlandAccount(page, username, password);
  await waitSceneReady(page, 45_000);
  await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
  const st = await setStats(page, { slayer: 1 });
  if (st?.length) console.log('[slayer-s0] setStats soft-fail', st);
  await giveItems(page, [
    ['bronze_sword', 1],
    ['lobster', 8]
  ]).catch(() => {});

  console.log('[slayer-s0] tele Turael', TURAEL);
  if (!(await teleTo(page, TURAEL, 3, 25_000))) fail('tele Turael failed');
  await waitSceneReady(page, 15_000);
  if (shot) await shot('at-turael');

  // First teach path: Who are you? → What's a slayer? → Wow, can you teach me? → Okay, great!
  let talk = await talkNpc(page, 'Turael', [
    'who are you',
    "what's a slayer",
    'wow, can you teach',
    'okay, great',
    'got any tips'
  ]);
  console.log('[slayer-s0] talk1', JSON.stringify(talk));
  if (talk?.noTrig) fail(talk.noTrig);
  await continueThrash(page, 12, 280);

  let target = await getServerVarQuiet(page, 'slayer_target');
  let count = await getServerVarQuiet(page, 'slayer_count');
  console.log(`[slayer-s0] after teach target=${target} count=${count}`);

  // Already had a task / second path
  if (!(Number(target) > 0 && Number(count) > 0)) {
    talk = await talkNpc(page, 'Turael', [
      'i need another assignment',
      'yes, please',
      'okay, great',
      'got any tips'
    ]);
    console.log('[slayer-s0] talk2 assign', JSON.stringify(talk));
    if (talk?.noTrig) fail(talk.noTrig);
    await continueThrash(page, 12, 280);
    target = await getServerVarQuiet(page, 'slayer_target');
    count = await getServerVarQuiet(page, 'slayer_count');
  }

  const gem = await invHas(page, 'enchanted gem') || (await invHas(page, 'gem'));
  const xp0 = await slayerStat(page);
  console.log(
    `[slayer-s0] S0a target=${target} count=${count} gem=${gem} slayerStat=${JSON.stringify(xp0)}`
  );
  if (!(Number(target) > 0)) fail(`S0a no slayer_target (got ${target})`);
  if (!(Number(count) > 0)) fail(`S0a no slayer_count (got ${count})`);
  if (shot) await shot('s0a-assigned');
  console.log('[slayer-s0] S0a PASS (assign)');

  if (!wantKill) {
    console.log('RESULT: PASS slayer-s0 S0a-assign-only (set SLAYER_S0_KILL=1 for kill credit)');
    process.exit(0);
  }

  // —— S0b soft kill (map by target id; soft re-roll hard Turael tasks) ——
  // SOFT: clear task + reassign up to N times if Turael gave lizard/special (labeled).
  let softKey = TARGET_SOFT[Number(target)] ?? null;
  for (let roll = 0; roll < 8 && !softKey; roll++) {
    console.log(
      `[slayer-s0] S0b soft re-roll ${roll + 1}: target=${target} not in soft map — setvar clear + reassign (SOFT)`
    );
    await cheatQuiet(page, 'setvar slayer_target 0', 400);
    await cheatQuiet(page, 'setvar slayer_count 0', 400);
    if (!(await teleTo(page, TURAEL, 3, 20_000))) fail('tele Turael re-roll failed');
    await waitSceneReady(page, 12_000);
    talk = await talkNpc(page, 'Turael', [
      'who are you',
      "what's a slayer",
      'wow, can you teach',
      'i need another assignment',
      'yes, please',
      'okay, great',
      'got any tips'
    ]);
    await continueThrash(page, 12, 280);
    target = await getServerVarQuiet(page, 'slayer_target');
    count = await getServerVarQuiet(page, 'slayer_count');
    softKey = TARGET_SOFT[Number(target)] ?? null;
    console.log(`[slayer-s0] after re-roll target=${target} count=${count} softKey=${softKey}`);
  }
  if (!softKey) {
    fail(
      `S0b: no soft task after re-rolls (last target=${target} count=${count}). S0a already proved assign.`
    );
  }

  const killTile = SOFT_KILL_TILES[softKey];
  console.log(`[slayer-s0] soft kill tele ${softKey} target=${target}`, killTile);
  if (!(await teleTo(page, killTile, 6, 25_000))) fail(`tele kill ${softKey} failed`);
  await waitSceneReady(page, 12_000);
  await page.evaluate(() => {
    const a = globalThis.__lc377?.actions;
    a?.equip?.('Bronze sword');
  });

  const countBefore = Number(count);
  const xpBefore = Number((await slayerStat(page))?.xp ?? xp0?.xp ?? 0);
  const attackNames = ATTACK_NAMES[softKey] ?? ['Goblin'];

  let killed = false;
  for (let attempt = 0; attempt < 50 && !killed; attempt++) {
    for (const name of attackNames) {
      await page.evaluate(n => globalThis.__lc377?.actions?.attackNpc?.(n), name);
    }
    await page.waitForTimeout(800);
    if (attempt % 4 === 2) {
      await page.evaluate(() => globalThis.__lc377?.actions?.eatIfNeeded?.('Lobster', 12));
    }
    const cNow = Number(await getServerVarQuiet(page, 'slayer_count'));
    if (cNow < countBefore) {
      killed = true;
      console.log(`[slayer-s0] count ${countBefore} → ${cNow}`);
    }
  }

  const xp1 = await slayerStat(page);
  const countAfter = Number(await getServerVarQuiet(page, 'slayer_count'));
  console.log(
    `[slayer-s0] S0b count ${countBefore}→${countAfter} xp ${xpBefore}→${xp1?.xp} softKey=${softKey} stat=${JSON.stringify(xp1)}`
  );
  if (shot) await shot(killed ? 's0b-kill' : 's0b-fail');

  if (!(countAfter < countBefore) && !(Number(xp1?.xp ?? 0) > xpBefore)) {
    fail(
      `S0b no kill credit (count ${countBefore}→${countAfter}, xp ${xpBefore}→${xp1?.xp}) softKey=${softKey}`
    );
  }
  console.log('RESULT: PASS slayer-s0 S0a+S0b');
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
