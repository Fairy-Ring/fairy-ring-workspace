#!/usr/bin/env node
/**
 * Regicide craft residual — product mix/fuse to barrel_lid_fused (no give fused).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-regicide-craft-fuse-smoke.mjs
 *
 * Soft: regicide 11 + upass 10 + naphtha + raw mats.
 * Product: furnace quicklime, grind, mix, loom cloth, cloth fuse.
 * Still UI / tar collect is not this smoke.
 *
 * @see docs/plans/2026-08-12-regicide-craft-fuse.md
 */
import {
  assertEnginePackHealth,
  boot,
  cheatQuiet,
  createShotRunDir,
  fail,
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
const { username, password } = resolveAccount(rest, 'regfuse');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const FURNACE_STAND = { x: 3275, z: 3186, level: 0 };
const LOOM_STAND = { x: 2199, z: 3249, level: 0 };
const LOOM_LOC = { x: 2198, z: 3249 };

async function chatTail(page, n = 20) {
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
    return inv.map(i => ({ name: i?.name, desc: i?.desc, id: i?.id }));
  });
}

async function hasInv(page, pred) {
  const inv = await invSnap(page);
  return inv.some(pred);
}

async function useHeldOnHeld(page, a, b) {
  return page.evaluate(
    ([u, t]) => {
      const act = globalThis.__lc377?.actions;
      return { ok: !!act?.useHeldOnHeld?.(u, t) };
    },
    [a, b]
  );
}

async function useHeldOnLoc(page, item, locName, wx, wz) {
  return page.evaluate(
    ({ item, locName, wx, wz }) => {
      const act = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const loc = typeof r?.locAt === 'function' ? r.locAt(wx, wz) : null;
      const ok = loc
        ? !!act?.useHeldOnLoc?.(item, loc)
        : !!act?.useHeldOnLoc?.(item, locName, 10);
      return { ok, loc: loc ? { name: loc.name, id: loc.id, ops: loc.ops } : null };
    },
    { item, locName, wx, wz }
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[reg-fuse] ${base} user=${username} (craft fuse; headed default)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`reg-fuse_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    await cheatQuiet(page, 'setvar upass 10', 200);
    await cheatQuiet(page, 'setvar regicide_quest 11', 200);
    await cheatQuiet(page, 'setstat crafting 10', 200);
    await giveItems(page, [
      ['regicide_barrel_naphtha', 1],
      ['regicide_sulphar', 1],
      ['limestone', 1],
      ['pot_empty', 1],
      ['pestle_and_mortar', 1],
      ['ball_of_wool', 4],
      ['leather_gloves', 1]
    ]);
    await waitTicks(page, 2);
    await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      a?.equip?.('Leather gloves') || a?.equip?.('leather_gloves');
    });
    await waitTicks(page, 2);

    // --- quicklime ---
    if (!(await teleTo(page, FURNACE_STAND, 2, 25_000))) fail('tele furnace failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);
    const furn = await useHeldOnLoc(page, 'Limestone', 'Furnace', 3272, 3185);
    console.log('[reg-fuse] limestone→furnace', furn);
    let gotLime = false;
    for (let i = 0; i < 10; i++) {
      await waitTicks(page, 4);
      if (await hasInv(page, x => /quicklime/i.test(x?.name || '') && !/pot/i.test(x?.name || ''))) {
        gotLime = true;
        break;
      }
    }
    if (!gotLime) {
      fail(`no Quicklime after furnace ${JSON.stringify(await invSnap(page))} ${JSON.stringify(productChat(await chatTail(page)))}`);
    }

    // grind quicklime (pestle on quicklime; needs pot)
    let grindQ = await useHeldOnHeld(page, 'Pestle', 'Quicklime');
    console.log('[reg-fuse] pestle→quicklime', grindQ);
    if (!grindQ.ok) grindQ = await useHeldOnHeld(page, 'Quicklime', 'Pestle');
    let gotQdust = false;
    for (let i = 0; i < 8; i++) {
      await waitTicks(page, 3);
      if (await hasInv(page, x => /pot of quicklime/i.test(x?.name || ''))) {
        gotQdust = true;
        break;
      }
    }
    if (!gotQdust) {
      fail(`no Pot of quicklime ${JSON.stringify(await invSnap(page))} ${JSON.stringify(productChat(await chatTail(page)))}`);
    }

    // grind sulphur
    let grindS = await useHeldOnHeld(page, 'Pestle', 'Sulphur');
    console.log('[reg-fuse] pestle→sulphur', grindS);
    if (!grindS.ok) grindS = await useHeldOnHeld(page, 'Sulphur', 'Pestle');
    let gotSdust = false;
    for (let i = 0; i < 8; i++) {
      await waitTicks(page, 3);
      if (await hasInv(page, x => /ground sulphur/i.test(x?.name || ''))) {
        gotSdust = true;
        break;
      }
    }
    if (!gotSdust) {
      fail(`no Ground sulphur ${JSON.stringify(await invSnap(page))} ${JSON.stringify(productChat(await chatTail(page)))}`);
    }

    // mix both dusts into naphtha → Barrel bomb (unfused lid)
    let mix1 = await useHeldOnHeld(page, 'Pot of quicklime', 'Barrel of naphtha');
    console.log('[reg-fuse] quicklime→naphtha', mix1);
    if (!mix1.ok) mix1 = await useHeldOnHeld(page, 'Barrel of naphtha', 'Pot of quicklime');
    await waitTicks(page, 3);
    let mix2 = await useHeldOnHeld(page, 'Ground sulphur', 'naphtha');
    console.log('[reg-fuse] sulphur→mix', mix2);
    if (!mix2.ok) mix2 = await useHeldOnHeld(page, 'Ground sulphur', 'Barrel');
    let gotLid = false;
    for (let i = 0; i < 8; i++) {
      await waitTicks(page, 3);
      const inv = await invSnap(page);
      // unfused lid display is also "Barrel bomb" — desc has no "fused"
      if (inv.some(x => /barrel bomb/i.test(x?.name || '') && !/fused/i.test(x?.desc || ''))) {
        gotLid = true;
        break;
      }
    }
    if (!gotLid) {
      fail(`no sealed barrel lid ${JSON.stringify(await invSnap(page))} ${JSON.stringify(productChat(await chatTail(page)))}`);
    }

    // loom cloth
    if (!(await teleTo(page, LOOM_STAND, 2, 25_000))) fail('tele loom failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);
    const loom = await useHeldOnLoc(page, 'Ball of wool', 'Loom', LOOM_LOC.x, LOOM_LOC.z);
    console.log('[reg-fuse] wool→loom', loom);
    let gotCloth = false;
    for (let i = 0; i < 10; i++) {
      await waitTicks(page, 4);
      if (await hasInv(page, x => /^cloth$/i.test(String(x?.name || '')))) {
        gotCloth = true;
        break;
      }
    }
    if (!gotCloth) {
      fail(`no Cloth ${JSON.stringify(await invSnap(page))} ${JSON.stringify(productChat(await chatTail(page)))}`);
    }

    const fuse = await useHeldOnHeld(page, 'Cloth', 'Barrel bomb');
    console.log('[reg-fuse] cloth→lid', fuse);
    let gotFused = false;
    for (let i = 0; i < 8; i++) {
      await waitTicks(page, 3);
      const inv = await invSnap(page);
      // both lid and fused display "Barrel bomb"; pack id 3219 = fused
      if (inv.some(x => x?.id === 3219 || /fused barrel/i.test(x?.desc || ''))) {
        gotFused = true;
        break;
      }
    }
    if (shot) await shot(gotFused ? 'after-fuse' : 'fail');
    if (!gotFused) {
      fail(`no fused barrel ${JSON.stringify(await invSnap(page))} ${JSON.stringify(productChat(await chatTail(page)))}`);
    }

    console.log(
      `RESULT PASS reg-fuse product barrel_lid_fused (SOFT stage 11 + naphtha; no give fused)`
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
