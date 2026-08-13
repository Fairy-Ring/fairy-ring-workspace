#!/usr/bin/env node
/**
 * After Lalli stew: spin golden fleece → wool on a public wheel.
 * Rellekka wheel refuses until viking complete (274).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-viking-lalli-spin-smoke.mjs
 *
 * Soft: give fleece, viking 6. Product: oplocu spin + Rellekka gate.
 *
 * @see docs/plans/2026-08-13-viking-lalli-spin.md
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
  waitTicks,
  wipeInvAndWorn
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'viksp');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const RELLEKKA_WHEEL = { x: 2617, z: 3659, level: 0 };
/** forceapproach=south */
const RELLEKKA_STAND = { x: 2617, z: 3658, level: 0 };
const LUMB_WHEEL = { x: 3209, z: 3212, level: 1 };
const LUMB_STAND = { x: 3209, z: 3211, level: 1 };
const FLEECE = 3693;
const WOOL = 3694;

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

async function chatTail(page, n = 16) {
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

async function locDump(page) {
  return page.evaluate(() => {
    const locs = globalThis.__lc377?.reader?.locs?.() ?? [];
    return locs.slice(0, 20).map(l => ({
      id: l.id,
      name: l.name,
      x: l.tile?.x ?? l.x,
      z: l.tile?.z ?? l.z
    }));
  });
}

async function waitIdleNear(page, tile, dist = 1, iters = 40) {
  await page.evaluate(
    async ([wx, wz, d, n]) => {
      const h = globalThis.__lc377;
      for (let i = 0; i < n; i++) {
        const t = h?.worldTile?.();
        const busy = h?.reader?.busy?.() || h?.reader?.moving?.();
        if (t && Math.max(Math.abs(t.x - wx), Math.abs(t.z - wz)) <= d && !busy) break;
        await new Promise(r => setTimeout(r, 200));
      }
    },
    [tile.x, tile.z, dist, iters]
  );
}

async function useOnWheel(page, item, wx, wz) {
  return page.evaluate(([u, x, z]) => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    if (!a?.useHeldOnLoc) return { ok: false, reason: 'no abi' };
    const locs = r?.locs?.() ?? [];
    const hit =
      locs.find(
        l =>
          /spinning wheel/i.test(String(l.name ?? '')) &&
          Math.abs((l.tile?.x ?? l.x) - x) <= 1 &&
          Math.abs((l.tile?.z ?? l.z) - z) <= 1
      ) || locs.find(l => /spinning wheel/i.test(String(l.name ?? '')));
    if (!hit) return { ok: false, reason: 'no wheel loc', n: locs.length };
    const ok =
      a.useHeldOnLoc(u, hit, 16) ||
      a.useHeldOnLoc(u, 'Spinning wheel', 16);
    return {
      ok: !!ok,
      loc: { id: hit.id, name: hit.name, x: hit.tile?.x ?? hit.x, z: hit.tile?.z ?? hit.z }
    };
  }, [item, wx, wz]);
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[vik-spin] ${base} user=${username} (fleece→wool; headed default)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`vik-spin_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await wipeInvAndWorn(page, 'vik-spin prep');
    await cheatQuiet(page, 'setvar viking 6', 400);
    await giveItems(page, [['viking_golden_fleece', 1]]);
    await waitTicks(page, 2);
    console.log('[vik-spin] prep inv', await invSnap(page));

    if (!(await teleTo(page, RELLEKKA_STAND, 0, 20_000))) fail('tele Rellekka wheel failed');
    await waitSceneReady(page, 12_000);
    await waitIdleNear(page, RELLEKKA_STAND, 0);
    await waitTicks(page, 2);
    console.log('[vik-spin] rellekka locs', JSON.stringify(await locDump(page)));
    const refuse = await useOnWheel(page, 'Golden fleece', RELLEKKA_WHEEL.x, RELLEKKA_WHEEL.z);
    console.log('[vik-spin] Rellekka use', JSON.stringify(refuse));
    let refuseChat = [];
    for (let i = 0; i < 12; i++) {
      await waitTicks(page, 1);
      refuseChat = await chatTail(page, 16);
      if (refuseChat.some(t => /only fremenniks|nothing interesting|spin the fleece/i.test(t))) break;
    }
    console.log('[vik-spin] Rellekka chat', refuseChat);
    if (shot) await shot('rellekka-refuse');
    const gated = refuseChat.some(t => /only fremenniks/i.test(t));
    if (!gated) fail(`Rellekka wheel did not refuse. chat=${JSON.stringify(refuseChat)}`);
    if (!hasId(await invSnap(page), FLEECE)) fail('fleece consumed on refused Rellekka wheel');

    const lumbTries = [
      { x: 3209, z: 3213, level: 1 },
      { x: 3210, z: 3212, level: 1 },
      { x: 3208, z: 3213, level: 1 },
      { x: 3209, z: 3212, level: 1 }
    ];
    let spun = false;
    for (const stand of lumbTries) {
      if (!(await teleTo(page, stand, 0, 20_000))) continue;
      await waitSceneReady(page, 12_000);
      await waitIdleNear(page, stand, 0);
      await waitTicks(page, 2);
      console.log('[vik-spin] lumb stand', stand, 'locs', JSON.stringify(await locDump(page)));
      const spin = await useOnWheel(page, 'Golden fleece', LUMB_WHEEL.x, LUMB_WHEEL.z);
      console.log('[vik-spin] Lumbridge use', JSON.stringify(spin));
      for (let i = 0; i < 10; i++) {
        await waitTicks(page, 1);
        if (hasId(await invSnap(page), WOOL)) {
          spun = true;
          break;
        }
      }
      if (spun) break;
      console.log('[vik-spin] lumb chat', await chatTail(page, 8));
    }
    const spinChat = await chatTail(page, 12);
    const endInv = await invSnap(page);
    console.log('[vik-spin] after spin', endInv, spinChat);
    if (shot) await shot('after-spin');
    if (!hasId(endInv, WOOL)) fail(`no golden wool 3694. inv=${JSON.stringify(endInv)}`);
    if (hasId(endInv, FLEECE)) fail('fleece still in inv after spin');
    console.log(`RESULT PASS vik-spin user=${username} wool=3694 (SOFT fleece give + viking 6; product spin + Rellekka gate)`);
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
