#!/usr/bin/env node
/**
 * Viking Lalli stew leftover — authentic golden fleece (no wool give).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-viking-lalli-stew-smoke.mjs
 *
 * Soft: viking 6, bits 0, give cabbage/potato/onion.
 * Product: Olaf start → Lalli → Askeladden rock → cauldron stew → fleece 3693.
 *
 * @see docs/plans/2026-08-13-viking-lalli-stew.md
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
const { username, password } = resolveAccount(rest, 'vikla');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const OLAF = { x: 2673, z: 3683, level: 0 };
const ASKEL = { x: 2658, z: 3660, level: 0 };
const LALLI = { x: 2770, z: 3622, level: 0 };
const LALLI_STAND = { x: 2770, z: 3621, level: 0 };
const CAULDRON = { x: 2772, z: 3623, level: 0 };
const FLEECE = 3693;
const ROCK = 3695;

async function talkNpc(page, npcName, prefer = [], iters = 64) {
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
        await new Promise(res => setTimeout(res, 340));
        if ((r.modals?.()?.chat ?? -1) === -1 && i > 8) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(24).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 12), chat: chat.slice(0, 14) };
    },
    [npcName, prefer, iters]
  );
}

async function continueThrash(page, iters = 16, ms = 260) {
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
      .map(i => ({ id: i.id, name: i.name }))
  );
}

function hasId(inv, id) {
  return (inv || []).some(i => (i.id | 0) === id);
}

async function locDump(page) {
  return page.evaluate(() => {
    const locs = globalThis.__lc377?.reader?.locs?.() ?? [];
    return locs.slice(0, 24).map(l => ({
      id: l.id,
      name: l.name,
      x: l.tile?.x ?? l.x,
      z: l.tile?.z ?? l.z,
      typecode: l.typecode
    }));
  });
}

async function useOnStew(page, useSub) {
  return page.evaluate(([u, wx, wz]) => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    if (!a?.useHeldOnLoc) return { ok: false, reason: 'no abi' };
    const locs = r?.locs?.() ?? [];
    const hit =
      locs.find(l => /lalli.?s stew/i.test(String(l.name ?? ''))) ||
      locs.find(l => (l.id | 0) === 4149) ||
      locs.find(l => (l.tile?.x ?? l.x) === wx && (l.tile?.z ?? l.z) === wz);
    if (!hit) return { ok: false, reason: 'no stew loc', n: locs.length };
    const ok =
      a.useHeldOnLoc(u, hit, 20) ||
      a.useHeldOnLoc(u, "Lalli's Stew", 20) ||
      a.useHeldOnLoc(u, 'Stew', 20);
    return { ok: !!ok, loc: { id: hit.id, name: hit.name, x: hit.tile?.x ?? hit.x, z: hit.tile?.z ?? hit.z } };
  }, [useSub, CAULDRON.x, CAULDRON.z]);
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[vik-lalli] ${base} user=${username} (stew → fleece; headed default)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`vik-lalli_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await wipeInvAndWorn(page, 'vik-lalli prep');
    await cheatQuiet(page, 'setvar viking_bits 0', 300);
    await cheatQuiet(page, 'setvar viking 6', 400);
    await giveItems(page, [
      ['cabbage', 1],
      ['potato', 1],
      ['onion', 1]
    ]);
    await waitTicks(page, 2);
    console.log('[vik-lalli] prep inv', await invSnap(page));

    if (!(await teleTo(page, OLAF, 2, 25_000))) fail('tele Olaf failed');
    await waitSceneReady(page, 15_000);
    const olaf = await talkNpc(page, 'Olaf', ['yes', 'sure', 'challenge'], 64);
    console.log('[vik-lalli] Olaf', JSON.stringify(olaf));
    if (olaf?.noTrig) fail(olaf.noTrig);
    await continueThrash(page, 16, 240);

    if (!(await teleTo(page, LALLI_STAND, 2, 25_000))) fail('tele Lalli failed');
    await waitSceneReady(page, 15_000);
    const l1 = await talkNpc(page, 'Lalli', ['other human', 'other'], 72);
    console.log('[vik-lalli] Lalli1', JSON.stringify(l1));
    if (l1?.noTrig) fail(l1.noTrig);
    await continueThrash(page, 12, 240);
    if (shot) await shot('lalli-askeladden');

    if (!(await teleTo(page, ASKEL, 2, 20_000))) fail('tele Askeladden failed');
    await waitSceneReady(page, 12_000);
    const ask = await talkNpc(page, 'Askeladden', ['rock', 'spare'], 56);
    console.log('[vik-lalli] Askeladden', JSON.stringify(ask));
    if (ask?.noTrig) fail(ask.noTrig);
    await continueThrash(page, 16, 240);
    const afterAsk = await invSnap(page);
    if (!hasId(afterAsk, ROCK)) fail(`no pet rock after Askeladden. inv=${JSON.stringify(afterAsk)}`);
    if (shot) await shot('after-rock');

    if (!(await teleTo(page, LALLI_STAND, 2, 20_000))) fail('tele Lalli2 failed');
    await waitSceneReady(page, 12_000);
    const l2 = await talkNpc(page, 'Lalli', [], 64);
    console.log('[vik-lalli] Lalli2', JSON.stringify(l2));
    if (l2?.noTrig) fail(l2.noTrig);
    await continueThrash(page, 16, 240);
    console.log('[vik-lalli] locs', JSON.stringify(await locDump(page)));

    for (const item of ['Pet rock', 'Cabbage', 'Potato', 'Onion']) {
      const u = await useOnStew(page, item);
      console.log(`[vik-lalli] use ${item} on stew`, JSON.stringify(u));
      await continueThrash(page, 10, 220);
      await waitTicks(page, 2);
    }
    if (shot) await shot('after-stew');

    const l3 = await talkNpc(page, 'Lalli', ['fleece', 'wool'], 48);
    console.log('[vik-lalli] Lalli3', JSON.stringify(l3));
    await continueThrash(page, 16, 240);
    const endInv = await invSnap(page);
    const viking = await getServerVarQuiet(page, 'viking').catch(() => null);
    console.log('[vik-lalli] end inv', endInv, 'viking', viking);
    if (shot) await shot('after-fleece');
    if (!hasId(endInv, FLEECE)) {
      fail(`no golden fleece 3693. inv=${JSON.stringify(endInv)}`);
    }
    console.log(`RESULT PASS vik-lalli user=${username} fleece=3693 viking=${viking ?? '?'} (SOFT 6; product stew)`);
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
