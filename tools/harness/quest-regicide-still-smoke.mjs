#!/usr/bin/env node
/**
 * Regicide still UI — product tar → naphtha (no give naphtha).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-regicide-still-smoke.mjs
 *
 * Soft: regicide 11 + upass 10 + barrel of coal-tar + coal.
 * Product: oplocu still, valves, coal, close at still_total≥26 → obj 3221.
 *
 * @see docs/plans/2026-08-12-regicide-still-ui.md
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
const { username, password } = resolveAccount(rest, 'regstill');
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
  console.log(`[reg-still] ${base} user=${username} (still UI naphtha; headed default)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`reg-still_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    await cheatQuiet(page, 'setvar upass 10', 200);
    await cheatQuiet(page, 'setvar regicide_quest 11', 200);
    await giveItems(page, [
      ['regicide_barrel_tar', 1],
      ['coal', 8]
    ]);
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
    await waitTicks(page, 4);
    console.log('[reg-still] pressure+ stall after 4t (expect P=4→6)');
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
      if (shot) await shot('fail');
      fail(`STILL FAIL no naphtha total=${total} inv=${JSON.stringify(inv)} chat=${JSON.stringify(prod.slice(-12))}`);
    }

    console.log(`RESULT PASS reg-still product naphtha ${NAPHTHA_ID} (SOFT stage 11 + tar/coal; no give naphtha)`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
