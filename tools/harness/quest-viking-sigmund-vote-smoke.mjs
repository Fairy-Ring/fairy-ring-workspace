#!/usr/bin/env node
/**
 * Viking Sigmund merchant vote — residual after Olaf 6→7.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-viking-sigmund-vote-smoke.mjs
 *
 * Soft: viking 7, bits 0, coins 5000.
 * Product: Sigmund Yes → ask chain → Askeladden 5k → reverse trades → flower → viking 8.
 *
 * Do not talk Brundt after the vote (7 council votes completes the quest).
 *
 * @see docs/plans/2026-08-13-viking-sigmund-vote.md
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
  waitSceneReady,
  waitTicks,
  wipeInvAndWorn
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'viksig');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const FLOWER = 3698;
const SONG = 3699;
const BOOTS = 3700;
const HUNT_MAP = 3701;
const BOWSTRING = 3702;
const FISH = 3703;
const FISH_MAP = 3704;
const FORECAST = 3705;
const TOKEN = 3706;
const COCKTAIL = 3707;
const TAX_NOTE = 3708;
const ASK_NOTE = 3709;
const BODY_NOTE = 3710;

const NPC = {
  sigmund: { name: 'Sigmund', x: 2641, z: 3680, level: 0 },
  sailor: { name: 'Sailor', x: 2629, z: 3693, level: 0 },
  olaf: { name: 'Olaf', x: 2673, z: 3683, level: 0 },
  yrsa: { name: 'Yrsa', x: 2625, z: 3674, level: 0 },
  brundt: { name: 'Brundt', x: 2659, z: 3669, level: 0 },
  sigli: { name: 'Sigli', x: 2660, z: 3653, level: 0 },
  skul: { name: 'Skulgrimen', x: 2663, z: 3694, level: 0 },
  fisherman: { name: 'Fisherman', x: 2641, z: 3699, level: 0 },
  swensen: { name: 'Swensen', x: 2646, z: 3660, level: 0 },
  peer: { name: 'Peer', x: 2634, z: 3668, level: 0 },
  thorvald: { name: 'Thorvald', x: 2666, z: 3693, level: 0 },
  manni: { name: 'Manni', x: 2660, z: 3673, level: 0 },
  thora: { name: 'Thora', x: 2662, z: 3673, level: 0 },
  askeladden: { name: 'Askeladden', x: 2658, z: 3660, level: 0 }
};

async function talkNpc(page, npcName, prefer = [], iters = 80) {
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
        await new Promise(res => setTimeout(res, 320));
        if ((r.modals?.()?.chat ?? -1) === -1 && i > 10) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(24).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 20) };
    },
    [npcName, prefer, iters]
  );
}

async function continueThrash(page, iters = 20, ms = 260) {
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

async function invSnap(page) {
  return page.evaluate(() =>
    (globalThis.__lc377?.reader?.inventory?.() ?? [])
      .filter(i => i?.name || i?.id)
      .map(i => ({ id: i.id | 0, name: i.name }))
  );
}

function hasId(inv, id) {
  return (inv || []).some(i => (i.id | 0) === id);
}

async function visit(page, npc, prefer, tag) {
  const tile = { x: npc.x, z: npc.z, level: npc.level ?? 0 };
  if (!(await teleTo(page, tile, 2, 20_000))) fail(`tele ${tag} failed`);
  await waitSceneReady(page, 10_000);
  await waitTicks(page, 2);
  const talk = await talkNpc(page, npc.name, prefer, 88);
  console.log(`[vik-sig] ${tag}`, JSON.stringify(talk));
  if (talk?.noTrig) fail(`${tag}: ${talk.noTrig}`);
  await continueThrash(page, 24, 240);
  return talk;
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[vik-sig] ${base} user=${username} (merchant 7→8; headed default)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`vik-sig_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await wipeInvAndWorn(page, 'vik-sig prep');
    await cheatQuiet(page, 'setvar viking_bits 0', 300);
    await cheatQuiet(page, 'setvar viking 7', 400);
    await giveItems(page, [['coins', 5000]]);
    await waitTicks(page, 2);
    console.log('[vik-sig] prep', await invSnap(page));

    await visit(page, NPC.sigmund, ['yes'], 'sigmund-accept');
    if (shot) await shot('sigmund-accepted');

    const ask = [
      [NPC.sailor, 'ask-sailor'],
      [NPC.olaf, 'ask-olaf'],
      [NPC.yrsa, 'ask-yrsa'],
      [NPC.brundt, 'ask-brundt'],
      [NPC.sigli, 'ask-sigli'],
      [NPC.skul, 'ask-skul'],
      [NPC.fisherman, 'ask-fisherman'],
      [NPC.swensen, 'ask-swensen'],
      [NPC.peer, 'ask-peer'],
      [NPC.thorvald, 'ask-thorvald'],
      [NPC.manni, 'ask-manni'],
      [NPC.thora, 'ask-thora']
    ];
    for (const [npc, tag] of ask) {
      await visit(page, npc, ['merchant'], tag);
    }
    await visit(page, NPC.askeladden, ['merchant', 'yes'], 'askeladden-5k');
    let inv = await invSnap(page);
    console.log('[vik-sig] after askeladden', inv);
    if (!hasId(inv, ASK_NOTE)) {
      await visit(page, NPC.askeladden, ['merchant', 'yes'], 'askeladden-retry');
      inv = await invSnap(page);
    }
    if (!hasId(inv, ASK_NOTE)) fail(`no promissary_note2 after Askeladden. inv=${JSON.stringify(inv)}`);
    if (shot) await shot('after-askeladden');

    const reverse = [
      [NPC.thora, COCKTAIL, 'trade-thora'],
      [NPC.manni, TOKEN, 'trade-manni'],
      [NPC.thorvald, BODY_NOTE, 'trade-thorvald'],
      [NPC.peer, FORECAST, 'trade-peer'],
      [NPC.swensen, FISH_MAP, 'trade-swensen'],
      [NPC.fisherman, FISH, 'trade-fisherman'],
      [NPC.skul, BOWSTRING, 'trade-skul'],
      [NPC.sigli, HUNT_MAP, 'trade-sigli'],
      [NPC.brundt, TAX_NOTE, 'trade-brundt'],
      [NPC.yrsa, BOOTS, 'trade-yrsa'],
      [NPC.olaf, SONG, 'trade-olaf'],
      [NPC.sailor, FLOWER, 'trade-sailor']
    ];
    for (const [npc, want, tag] of reverse) {
      await visit(page, npc, ['merchant'], tag);
      inv = await invSnap(page);
      if (!hasId(inv, want)) {
        await visit(page, npc, ['merchant'], `${tag}-retry`);
        inv = await invSnap(page);
      }
      if (!hasId(inv, want)) fail(`${tag} missing obj ${want}. inv=${JSON.stringify(inv)}`);
      console.log(`[vik-sig] ${tag} ok`, inv);
    }
    if (shot) await shot('have-flower');

    const before = Number(await getServerVarQuiet(page, 'viking')) || 7;
    await visit(page, NPC.sigmund, ['yes'], 'sigmund-flower');
    let stage = Number(await getServerVarQuiet(page, 'viking')) || before;
    for (let i = 0; i < 8 && stage < 8; i++) {
      await continueThrash(page, 10, 220);
      await waitTicks(page, 2);
      stage = Number(await getServerVarQuiet(page, 'viking')) || stage;
    }
    inv = await invSnap(page);
    console.log(`[vik-sig] end viking=${stage} (from ${before}) inv=${JSON.stringify(inv)}`);
    if (shot) await shot(stage >= 8 ? 'pass' : 'fail');
    if (stage < 8) fail(`SIGMUND FAIL viking=${stage} inv=${JSON.stringify(inv)}`);
    console.log(
      `RESULT PASS vik-sig viking=${before}→${stage} (SOFT viking 7 + 5k; product merchant chain + flower)`
    );
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
