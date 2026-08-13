#!/usr/bin/env node
/**
 * Regicide still → fuse → catapult ≥12 — no give naphtha or fused.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-regicide-still-bomb-smoke.mjs
 *
 * Soft: stage 11 + upass 10 + tar/coal/raw mats + cooked rabbit.
 * Product: still (P green) → fuse 3219 → rabbit bribe → catapult → quest 12.
 *
 * @see docs/plans/2026-08-13-regicide-still-bomb.md
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
  waitTicks
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'regsb');
const FURNACE_STAND = { x: 3275, z: 3186, level: 0 };
const LOOM_STAND = { x: 2199, z: 3249, level: 0 };
const LOOM_LOC = { x: 2198, z: 3249 };
const FUSED_ID = 3219;
const CATAPULT_STAND = { x: 2187, z: 3185, level: 0 };
const CATAPULT_LOC = { x: 2185, z: 3183 };
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STILL_STAND = { x: 2926, z: 3212, level: 0 };
const STILL_LOC = { x: 2927, z: 3212 };
const IF_ROOT = 4919;
const COM_CLOSE = 5030;
const COM_COAL = 5061;
const COM_PRESS_UP = 6174;
const COM_TAR_UP = 6176;
const NAPHTHA_ID = 3221;
/** Pressure bits 0–12. Green matches heat’s offset (heat 19–24 of 13–25). 12 is max / overflow. */
const P_GREEN_LO = 6;
const P_GREEN_HI = 10;

async function chatTail(page, n = 16) {
  return page.evaluate(k => {
    const r = globalThis.__lc377?.reader;
    try {
      return (r?.chat?.(k) ?? []).map(c => String(c?.text ?? c ?? '')).filter(Boolean).slice(-k);
    } catch {
      return [];
    }
  }, n);
}

function productChat(lines) {
  return (lines || []).filter(t => !/^(get |set )/i.test(String(t)));
}

async function invSnap(page) {
  return page.evaluate(() => {
    const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
    return inv.map(i => ({ name: i?.name, id: i?.id }));
  });
}

async function ifMain(page) {
  return page.evaluate(() => globalThis.__lc377?.reader?.modals?.()?.main ?? -1);
}

async function ifButton(page, id) {
  return page.evaluate(com => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    return { ok: !!a?.ifButton?.(com), main: r?.modals?.()?.main ?? -1 };
  }, id);
}

function pressureInGreen(p) {
  return p >= P_GREEN_LO && p <= P_GREEN_HI;
}

function decodeStill(settings) {
  const u = Number(settings) >>> 0;
  const out = { settings: Number(settings), pressure: -1, heat: -1, valve: -1, tar: -1 };
  for (let b = 0; b <= 12; b++) {
    if (u & (1 << b)) {
      out.pressure = b;
      break;
    }
  }
  for (let b = 13; b <= 25; b++) {
    if (u & (1 << b)) {
      out.heat = b;
      break;
    }
  }
  for (let b = 26; b <= 28; b++) {
    if (u & (1 << b)) {
      out.valve = b;
      break;
    }
  }
  for (let b = 29; b <= 31; b++) {
    if (u & (1 << b)) {
      out.tar = b;
      break;
    }
  }
  return out;
}

async function stillState(page) {
  return decodeStill(await getServerVarQuiet(page, 'regicide_still_settings'));
}

async function useTarOnStill(page) {
  return page.evaluate(({ wx, wz }) => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    const loc = typeof r?.locAt === 'function' ? r.locAt(wx, wz) : null;
    const ok = loc
      ? !!a?.useHeldOnLoc?.('Barrel of coal-tar', loc)
      : !!a?.useHeldOnLoc?.('Barrel of coal-tar', 'Fractionalizing still', 10);
    return { ok, loc: loc ? { name: loc.name, id: loc.id, ops: loc.ops } : null };
  }, STILL_LOC);
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[reg-sb] ${base} user=${username} (still→fuse→bomb ≥12; headed default)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`reg-sb_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    await cheatQuiet(page, 'setvar upass 10', 200);
    await cheatQuiet(page, 'setvar regicide_quest 11', 200);
    await cheatQuiet(page, 'setstat crafting 10', 200);
    // Coal is not stackable (377 unpack; ores never stacked). 8 slots is enough for the still.
    await giveItems(page, [
      ['leather_gloves', 1],
      ['regicide_barrel_tar', 1],
      ['regicide_sulphar', 1],
      ['limestone', 1],
      ['pot_empty', 1],
      ['pestle_and_mortar', 1],
      ['ball_of_wool', 4],
      ['cooked_rabbit', 1],
      ['coal', 8]
    ]);
    await waitTicks(page, 2);
    await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      a?.equip?.('Leather gloves') || a?.equip?.('leather_gloves');
    });
    await waitTicks(page, 2);

    if (!(await teleTo(page, STILL_STAND, 2, 25_000))) fail('tele still failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);

    const use = await useTarOnStill(page);
    console.log('[reg-still] tar→still', use);
    let main = -1;
    for (let i = 0; i < 12; i++) {
      await waitTicks(page, 2);
      main = Number(await ifMain(page));
      if (main === IF_ROOT) break;
    }
    console.log('[reg-still] IF after open', main, productChat(await chatTail(page, 8)));
    if (main !== IF_ROOT) {
      if (shot) await shot('fail-no-if');
      fail(`still IF not open main=${main} want ${IF_ROOT} inv=${JSON.stringify(await invSnap(page))}`);
    }
    if (shot) await shot('if-open');

    // Authentic: tar regulator full first so pressure needle (bits 0–12) *rises*.
    // Venting first (old smoke) nets 0 and the gauge never leaves bit 0.
    console.log('[reg-still] tar+1', await ifButton(page, COM_TAR_UP));
    await waitTicks(page, 1);
    console.log('[reg-still] tar+2', await ifButton(page, COM_TAR_UP));
    await waitTicks(page, 1);

    // No getvar on the way up — ::getvar is slower than 2t and the needle
    // walks 4→8→12 before stall lands. +2 per 2t from 0: wait 4t (P=4) then vent.
    // One more fire during the click → P=6, in green.
    await waitTicks(page, 6);
    console.log('[reg-still] pressure+ stall after 6t (expect P=6→8)');
    await ifButton(page, COM_PRESS_UP);
    await waitTicks(page, 2);
    let st = await stillState(page);
    console.log('[reg-still] after stall', st);
    if (shot) await shot('pressure-stalled');
    if (st.valve === 26 && st.tar === 29 && st.pressure === 0) {
      fail('STILL FAIL pressure overflow reset (settings back to init 0/13/26/29)');
    }
    if (st.pressure >= 12) {
      fail(`STILL FAIL pressure ${st.pressure} (too high / overflow)`);
    }
    if (!pressureInGreen(st.pressure)) {
      fail(`STILL FAIL pressure ${st.pressure} not in green ${P_GREEN_LO}–${P_GREEN_HI}`);
    }

    // 3 coal close together → heat 13→19 without a 4-coal overflow reset.
    // 2 coal peaks at ~18; 4 coal overshoots 25 and reset_regicide_still (needle falls).
    for (let i = 0; i < 3; i++) {
      console.log('[reg-still] prime coal', i, await ifButton(page, COM_COAL));
      await waitTicks(page, 1);
    }

    let hit = 0;
    for (let step = 0; step < 20; step++) {
      await waitTicks(page, 2);
      st = await stillState(page);
      const total = Number(await getServerVarQuiet(page, 'regicide_still_total'));
      let coal = { skipped: true };
      // One coal cannot climb 16→19 (decay at those idx). Two close together can.
      if (st.heat >= 0 && st.heat <= 18) {
        coal = await ifButton(page, COM_COAL);
        await waitTicks(page, 1);
        await ifButton(page, COM_COAL);
      }
      console.log(`[reg-still] tick ${step}`, { total, ...st, coal });
      if (st.valve === 26 && st.tar === 29 && st.pressure === 0) {
        if (shot) await shot('fail-pressure');
        fail('STILL FAIL pressure overflow reset mid-cook');
      }
      if (!pressureInGreen(st.pressure)) {
        if (shot) await shot('fail-pressure');
        fail(`STILL FAIL pressure left green P=${st.pressure} want ${P_GREEN_LO}–${P_GREEN_HI}`);
      }
      if (total >= 26) {
        hit = total;
        break;
      }
      if (total >= 24) {
        await waitTicks(page, 2);
        hit = Number(await getServerVarQuiet(page, 'regicide_still_total'));
        break;
      }
    }

    const closed = await ifButton(page, COM_CLOSE);
    console.log('[reg-still] close after total', hit, closed);
    await waitTicks(page, 4);
    if (shot) await shot('after-close');

    const inv = await invSnap(page);
    const got = inv.some(x => x?.id === NAPHTHA_ID || /naphtha/i.test(x?.name || ''));
    const total = Number(await getServerVarQuiet(page, 'regicide_still_total'));
    const prod = productChat(await chatTail(page, 16));
    console.log('[reg-still] after', { got, total, inv, prod: prod.slice(-10) });

    if (!got) {
      if (shot) await shot('fail-still');
      fail(`STILL FAIL no naphtha total=${total} inv=${JSON.stringify(inv)} chat=${JSON.stringify(prod.slice(-12))}`);
    }
    console.log('[reg-sf] still PASS naphtha', inv);

    async function hasInv(pred) {
      const cur = await invSnap(page);
      return cur.some(pred);
    }
    async function useHeldOnHeld(a, b) {
      return page.evaluate(
        ([u, t]) => ({ ok: !!globalThis.__lc377?.actions?.useHeldOnHeld?.(u, t) }),
        [a, b]
      );
    }
    async function useHeldOnLoc(item, locName, wx, wz) {
      return page.evaluate(
        ({ item, locName, wx, wz }) => {
          const act = globalThis.__lc377?.actions;
          const r = globalThis.__lc377?.reader;
          const loc = typeof r?.locAt === 'function' ? r.locAt(wx, wz) : null;
          const ok = loc
            ? !!act?.useHeldOnLoc?.(item, loc)
            : !!act?.useHeldOnLoc?.(item, locName, 10);
          return { ok, loc: loc ? { name: loc.name, id: loc.id } : null };
        },
        { item, locName, wx, wz }
      );
    }

    if (!(await teleTo(page, FURNACE_STAND, 2, 25_000))) fail('tele furnace failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);
    console.log('[reg-sf] limestone→furnace', await useHeldOnLoc('Limestone', 'Furnace', 3272, 3185));
    let ok = false;
    for (let i = 0; i < 10; i++) {
      await waitTicks(page, 4);
      if (await hasInv(x => /quicklime/i.test(x?.name || '') && !/pot/i.test(x?.name || ''))) {
        ok = true;
        break;
      }
    }
    if (!ok) fail(`no Quicklime ${JSON.stringify(await invSnap(page))}`);

    let r = await useHeldOnHeld('Pestle', 'Quicklime');
    if (!r.ok) r = await useHeldOnHeld('Quicklime', 'Pestle');
    console.log('[reg-sf] pestle→quicklime', r);
    ok = false;
    for (let i = 0; i < 8; i++) {
      await waitTicks(page, 3);
      if (await hasInv(x => /pot of quicklime/i.test(x?.name || ''))) {
        ok = true;
        break;
      }
    }
    if (!ok) fail(`no Pot of quicklime ${JSON.stringify(await invSnap(page))}`);

    r = await useHeldOnHeld('Pestle', 'Sulphur');
    if (!r.ok) r = await useHeldOnHeld('Sulphur', 'Pestle');
    console.log('[reg-sf] pestle→sulphur', r);
    ok = false;
    for (let i = 0; i < 8; i++) {
      await waitTicks(page, 3);
      if (await hasInv(x => /ground sulphur/i.test(x?.name || ''))) {
        ok = true;
        break;
      }
    }
    if (!ok) fail(`no Ground sulphur ${JSON.stringify(await invSnap(page))}`);

    r = await useHeldOnHeld('Pot of quicklime', 'Barrel of naphtha');
    if (!r.ok) r = await useHeldOnHeld('Barrel of naphtha', 'Pot of quicklime');
    console.log('[reg-sf] dust→naphtha', r);
    await waitTicks(page, 3);
    r = await useHeldOnHeld('Ground sulphur', 'naphtha');
    if (!r.ok) r = await useHeldOnHeld('Ground sulphur', 'Barrel');
    console.log('[reg-sf] sulphur→mix', r);
    ok = false;
    for (let i = 0; i < 8; i++) {
      await waitTicks(page, 3);
      if ((await invSnap(page)).some(x => /barrel bomb/i.test(x?.name || ''))) {
        ok = true;
        break;
      }
    }
    if (!ok) fail(`no sealed lid ${JSON.stringify(await invSnap(page))}`);

    if (!(await teleTo(page, LOOM_STAND, 2, 25_000))) fail('tele loom failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);
    console.log('[reg-sf] wool→loom', await useHeldOnLoc('Ball of wool', 'Loom', LOOM_LOC.x, LOOM_LOC.z));
    ok = false;
    for (let i = 0; i < 10; i++) {
      await waitTicks(page, 4);
      if (await hasInv(x => /^cloth$/i.test(String(x?.name || '')))) {
        ok = true;
        break;
      }
    }
    if (!ok) fail(`no Cloth ${JSON.stringify(await invSnap(page))}`);

    console.log('[reg-sf] cloth→lid', await useHeldOnHeld('Cloth', 'Barrel bomb'));
    ok = false;
    for (let i = 0; i < 8; i++) {
      await waitTicks(page, 3);
      if ((await invSnap(page)).some(x => x?.id === FUSED_ID)) {
        ok = true;
        break;
      }
    }
    if (shot) await shot(ok ? 'after-fuse' : 'fail');
    if (!ok) fail(`no fused 3219 ${JSON.stringify(await invSnap(page))}`);
    console.log('[reg-sb] fuse PASS', await invSnap(page));

    if (!(await teleTo(page, CATAPULT_STAND, 2, 25_000))) fail('tele catapult failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);

    let rabbitOk = false;
    for (let i = 0; i < 16; i++) {
      const br = await page.evaluate(([cx, cz]) => {
        const a = globalThis.__lc377?.actions;
        const rdr = globalThis.__lc377?.reader;
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
        a?.setSideTab?.(3);
        const inv = rdr?.inventory?.() ?? [];
        const rabbit = inv.find(x => /cooked rabbit/i.test(String(x?.name ?? '')));
        const me = rdr?.worldTile?.() || { x: cx, z: cz };
        const guards = (rdr?.npcs?.() ?? [])
          .filter(n => /tyras guard/i.test(String(n?.name ?? '')))
          .map(n => {
            const nx = n.tile?.x ?? n.wx ?? n.x;
            const nz = n.tile?.z ?? n.wz ?? n.z;
            const d =
              nx != null ? Math.max(Math.abs(me.x - nx), Math.abs(me.z - nz)) : 99;
            return { n, d, nx, nz };
          })
          .sort((a, b) => a.d - b.d);
        const g = guards[0]?.n;
        if (!rabbit) return { ok: false, reason: 'no-rabbit' };
        if (!g) return { ok: false, reason: 'no-guard' };
        if (guards[0].d > 1 && guards[0].nx != null) {
          a?.walkWorld?.(guards[0].nx, guards[0].nz);
          return { ok: false, reason: 'walk', d: guards[0].d };
        }
        return {
          ok: !!a?.useHeldOnNpc?.(
            { id: rabbit.id, slot: rabbit.slot, comId: rabbit.comId },
            g.index
          ),
          d: guards[0].d,
          name: g.name
        };
      }, [CATAPULT_STAND.x, CATAPULT_STAND.z]);
      console.log('[reg-sb] rabbit-on-guard', br);
      await page.evaluate(async () => {
        const a = globalThis.__lc377?.actions;
        for (let k = 0; k < 12; k++) {
          a?.continueDialog?.();
          a?.dismissModalMessage?.();
          await new Promise(r => setTimeout(r, 280));
        }
      });
      await waitTicks(page, 2);
      if (!(await hasInv(x => /cooked rabbit/i.test(x?.name || '')))) {
        rabbitOk = true;
        break;
      }
    }
    if (!rabbitOk) fail('rabbit bribe FAIL: cooked rabbit still in inv');

    let stage = 0;
    for (let i = 0; i < 20; i++) {
      stage = Number(await getServerVarQuiet(page, 'regicide_quest'));
      if (stage >= 12) break;
      const u = await page.evaluate(([cx, cz]) => {
        const a = globalThis.__lc377?.actions;
        const rdr = globalThis.__lc377?.reader;
        a?.continueDialog?.();
        a?.setSideTab?.(3);
        const inv = rdr?.inventory?.() ?? [];
        const bomb = inv.find(x => x?.id === 3219 || /barrel bomb/i.test(String(x?.name ?? '')));
        const locs = rdr?.locs?.({ maxDist: 12 }) ?? [];
        const cat =
          locs.find(l => /^catapult$/i.test(String(l?.name ?? ''))) || rdr?.locAt?.(cx, cz);
        if (!bomb) return { ok: false, reason: 'no-bomb' };
        if (!cat) return { ok: false, reason: 'no-catapult' };
        const snap =
          cat.typecode != null
            ? { typecode: cat.typecode | 0, lx: cat.lx | 0, lz: cat.lz | 0, name: cat.name }
            : cat.name;
        return {
          ok: !!a?.useHeldOnLoc?.({ id: bomb.id, slot: bomb.slot, comId: bomb.comId }, snap, 14),
          cat: cat.name
        };
      }, [CATAPULT_LOC.x, CATAPULT_LOC.z]);
      if (i % 3 === 0 || u?.ok) console.log('[reg-sb] bomb-on-catapult', u);
      await waitTicks(page, 4);
    }
    stage = Number(await getServerVarQuiet(page, 'regicide_quest'));
    if (shot) await shot(stage >= 12 ? 'after-bomb' : 'fail');
    if (!(stage >= 12)) {
      fail(`catapult FAIL quest=${stage} want≥12 inv=${JSON.stringify(await invSnap(page))}`);
    }
    console.log(
      `RESULT PASS reg-sb still+fuse+bomb quest=${stage} (SOFT stage 11; no give naphtha/fused)`
    );
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
