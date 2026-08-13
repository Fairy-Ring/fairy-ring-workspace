#!/usr/bin/env node
/**
 * Viking Olaf / Bard vote — residual after Koschei form-detect.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-viking-olaf-vote-smoke.mjs
 *
 * Soft: viking 6, WC/Craft 40 Fletch 25, give axe+knife+raw_shark+golden_wool.
 * Product: Talk Olaf Yes → Cut-branch → carve → string → altar → Play stage → 7.
 *
 * Lalli stew / flax / F1 watering are not this smoke.
 *
 * @see docs/plans/2026-08-13-viking-olaf-vote.md
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
  waitSceneReady,
  waitTicks,
  wipeInvAndWorn
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'vikol');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const OLAF = { x: 2673, z: 3683, level: 0 };
const TREE_LOC = { x: 2738, z: 3638, level: 0 };
const TREE_STAND = { x: 2737, z: 3638, level: 0 };
const ALTAR_LOC = { x: 2626, z: 3598, level: 0 };
const ALTAR_STAND = { x: 2626, z: 3597, level: 0 };
const STAGE_STAND = { x: 2658, z: 3684, level: 0 };
const BRANCH = 3692;
const UNSTRUNG = 3688;
const STRUNG = 3689;
const ENCHANTED = 3690;

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

async function opLocAt(page, tile, actionSub = '') {
  return page.evaluate(
    ([wx, wz, act]) => globalThis.__lc377?.actions?.opLocAt?.(wx, wz, act) ?? false,
    [tile.x, tile.z, actionSub]
  );
}

async function opLoc(page, nameSub, actionSub = '') {
  return page.evaluate(
    ([n, a]) => globalThis.__lc377?.actions?.opLoc?.(n, a, 16) ?? false,
    [nameSub, actionSub]
  );
}

async function invSnap(page) {
  return page.evaluate(() =>
    (globalThis.__lc377?.reader?.inventory?.() ?? [])
      .filter(i => i?.name || i?.id)
      .map(i => ({ id: i.id, name: i.name }))
  );
}

async function chatTail(page, n = 20) {
  return page.evaluate(k => {
    try {
      return (globalThis.__lc377?.reader?.chat?.(k) ?? [])
        .map(c => String(c?.text ?? c ?? ''))
        .filter(Boolean)
        .slice(-k);
    } catch {
      return [];
    }
  }, n);
}

function hasId(inv, id) {
  return (inv || []).some(i => (i.id | 0) === id);
}

function hasName(inv, re) {
  return (inv || []).some(i => re.test(String(i.name ?? '')));
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

async function playLyre(page) {
  return page.evaluate(() => {
    const a = globalThis.__lc377?.actions;
    a?.setSideTab?.(3);
    return (
      a?.heldOp?.('Enchanted lyre', 1) ||
      a?.heldOp?.('enchanted lyre', 1) ||
      false
    );
  });
}

async function locDump(page) {
  return page.evaluate(() => {
    const locs = globalThis.__lc377?.reader?.locs?.() ?? [];
    return locs.slice(0, 20).map(l => ({
      id: l.id,
      name: l.name,
      x: l.tile?.x ?? l.x,
      z: l.tile?.z ?? l.z,
      ops: l.ops
    }));
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[vik-olaf] ${base} user=${username} (Bard 6→7; headed default)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`vik-olaf_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await wipeInvAndWorn(page, 'vik-olaf prep');
    await cheatQuiet(page, 'setvar viking_bits 0', 300);
    await cheatQuiet(page, 'setvar viking 6', 400);
    const statFail = await setStats(page, {
      woodcutting: 40,
      crafting: 40,
      fletching: 25
    });
    if (statFail?.length) console.log('[vik-olaf] setStats soft-fail', statFail);
    await giveItems(page, [
      ['bronze_axe', 1],
      ['knife', 1],
      ['raw_shark', 1],
      ['viking_golden_wool', 1]
    ]);
    await waitTicks(page, 2);
    console.log('[vik-olaf] prep inv', await invSnap(page));

    if (!(await teleTo(page, OLAF, 2, 25_000))) fail('tele Olaf failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);
    const talk = await talkNpc(page, 'Olaf', ['yes', 'sure', 'challenge'], 72);
    console.log('[vik-olaf] talk Olaf', JSON.stringify(talk));
    if (talk?.noTrig) fail(talk.noTrig);
    await continueThrash(page, 24, 280);
    if (shot) await shot('olaf-accepted');

    if (!(await teleTo(page, TREE_STAND, 1, 20_000))) fail('tele swaying tree failed');
    await waitSceneReady(page, 12_000);
    await walkNear(page, TREE_STAND, 0);
    await waitTicks(page, 2);
    let chopped = false;
    for (let i = 0; i < 6 && !chopped; i++) {
      const cut =
        (await opLocAt(page, TREE_LOC, 'Cut')) ||
        (await opLoc(page, 'Swaying tree', 'Cut')) ||
        (await opLoc(page, 'Swaying', 'branch'));
      console.log(`[vik-olaf] cut ${i}`, cut);
      await continueThrash(page, 8, 200);
      await waitTicks(page, 4);
      const inv = await invSnap(page);
      chopped = hasId(inv, BRANCH) || hasName(inv, /branch/i);
      if (!chopped && i === 2) {
        console.log('[vik-olaf] tree locs', JSON.stringify(await locDump(page)));
      }
    }
    if (!chopped) fail(`no Branch after Cut-branch. inv=${JSON.stringify(await invSnap(page))}`);
    console.log('[vik-olaf] after cut', await invSnap(page));
    if (shot) await shot('after-cut');

    let carved = false;
    for (let i = 0; i < 4 && !carved; i++) {
      const ok = await useHeldOnHeld(page, 'Knife', 'Branch');
      console.log(`[vik-olaf] carve ${i}`, ok);
      await continueThrash(page, 8, 200);
      await waitTicks(page, 3);
      const inv = await invSnap(page);
      carved = hasId(inv, UNSTRUNG) || hasName(inv, /unstrung lyre/i);
    }
    if (!carved) fail(`no Unstrung lyre. inv=${JSON.stringify(await invSnap(page))}`);

    let strung = false;
    for (let i = 0; i < 4 && !strung; i++) {
      const ok =
        (await useHeldOnHeld(page, 'Golden wool', 'Unstrung lyre')) ||
        (await useHeldOnHeld(page, 'wool', 'lyre'));
      console.log(`[vik-olaf] string ${i}`, ok);
      await continueThrash(page, 6, 200);
      await waitTicks(page, 3);
      const inv = await invSnap(page);
      strung = hasId(inv, STRUNG) || (hasName(inv, /^lyre$/i) && !hasName(inv, /unstrung/i));
    }
    if (!strung) fail(`no Lyre after wool. inv=${JSON.stringify(await invSnap(page))}`);
    console.log('[vik-olaf] after string', await invSnap(page));
    if (shot) await shot('after-string');

    if (!(await teleTo(page, ALTAR_STAND, 1, 20_000))) fail('tele Strange altar failed');
    await waitSceneReady(page, 12_000);
    await walkNear(page, ALTAR_STAND, 0);
    await waitTicks(page, 2);
    let enchanted = false;
    for (let i = 0; i < 6 && !enchanted; i++) {
      const ok =
        (await useHeldOnLoc(page, 'Raw shark', 'Strange altar')) ||
        (await useHeldOnLoc(page, 'shark', 'altar'));
      console.log(`[vik-olaf] offer ${i}`, ok);
      await continueThrash(page, 16, 250);
      await waitTicks(page, 4);
      const inv = await invSnap(page);
      enchanted = hasId(inv, ENCHANTED) || hasName(inv, /enchanted lyre/i);
      if (!enchanted && i === 2) {
        console.log('[vik-olaf] altar locs', JSON.stringify(await locDump(page)));
        console.log('[vik-olaf] offer chat', await chatTail(page, 12));
      }
    }
    if (!enchanted) fail(`no Enchanted lyre. inv=${JSON.stringify(await invSnap(page))}`);
    console.log('[vik-olaf] after offer', await invSnap(page));
    if (shot) await shot('after-offer');

    if (!(await teleTo(page, STAGE_STAND, 1, 20_000))) fail('tele longhall stage failed');
    await waitSceneReady(page, 12_000);
    await walkNear(page, STAGE_STAND, 0);
    await waitTicks(page, 2);
    const here = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
    console.log('[vik-olaf] stage tile', here);
    const played = await playLyre(page);
    console.log('[vik-olaf] play', played);
    await continueThrash(page, 8, 200);

    let stage = Number(await getServerVarQuiet(page, 'viking')) || 6;
    for (let i = 0; i < 40 && stage < 7; i++) {
      await continueThrash(page, 6, 200);
      await waitTicks(page, 3);
      if (i % 6 === 5) await playLyre(page);
      stage = Number(await getServerVarQuiet(page, 'viking')) || stage;
      const chat = await chatTail(page, 12);
      if (i % 5 === 0) console.log(`[vik-olaf] wait ${i} viking=${stage}`, chat.slice(-6));
      if (chat.some(t => /Bard's Trial|completed the Bard/i.test(t))) {
        await waitTicks(page, 4);
        stage = Number(await getServerVarQuiet(page, 'viking')) || stage;
      }
    }

    const endInv = await invSnap(page);
    const endChat = await chatTail(page, 16);
    console.log(`[vik-olaf] end viking=${stage} inv=${JSON.stringify(endInv)} chat=${JSON.stringify(endChat.slice(-10))}`);
    if (shot) await shot(stage >= 7 ? 'pass' : 'fail');
    if (stage < 7) {
      fail(`OLAF FAIL viking=${stage} tile=${JSON.stringify(here)} inv=${JSON.stringify(endInv)}`);
    }
    console.log(
      `RESULT PASS vik-olaf viking=${stage} (SOFT viking 6 + wool/shark; product cut/carve/string/altar/play)`
    );
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
