#!/usr/bin/env node
/**
 * Leftover tai_bwo_wannai_parcel_service **14187** from Rionasta Talk-to.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-tbw-parcel-if-smoke.mjs
 *
 * Product: Talk-to Rionasta → if_openmain leftover parcel + backpack in 7x4.
 */
import {
  assertEnginePackHealth,
  boot,
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
const { username, password } = resolveAccount(rest, 'tbwpr');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

// Rionasta multi 2531 at 0, 2782, 3094 — stand west.
const STAND = { x: 2781, z: 3094, level: 0 };
const IF_ROOT = 14187;
const PARCEL_INV = 14203; // tai_bwo_wannai_parcel_service:com_2
const LOGS = 1511;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[tbwpr] ${base} user=${username} (parcel ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`tbwpr_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await giveItems(page, [['logs', 5]]);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Rionasta stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const talked = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a || !r) return { error: 'no abi' };
      const n = (r.npcs?.() ?? []).find(x => /rionasta/i.test(x?.name || ''));
      if (!n) return { error: 'no Rionasta', names: (r.npcs?.() ?? []).map(x => x?.name).slice(0, 12) };
      const ok = !!a.npcOp?.(n.index, 1);
      return { ok, index: n.index, name: n.name };
    });
    console.log('[tbwpr] Talk-to', talked);
    if (!talked?.ok) {
      if (shot) await shot('fail-no-talk');
      fail(`Rionasta Talk-to failed ${JSON.stringify(talked)}`);
    }
    await waitTicks(page, 6);

    const open = await page.evaluate(invComId => {
      const r = globalThis.__lc377?.reader;
      const c = globalThis.__lc377Client;
      const m = r?.modals?.() ?? {};
      const main = m.main ?? c?.mainModalId ?? -1;
      const overlay = m.overlay ?? -1;
      const items = typeof r?.ifInv === 'function' ? r.ifInv(invComId) : [];
      return { main, overlay, items };
    }, PARCEL_INV);
    console.log('[tbwpr] open', JSON.stringify({ main: open.main, overlay: open.overlay, n: open.items.length, ids: open.items.slice(0, 6) }));
    if (shot) await shot(Number(open.main) === IF_ROOT ? 'pass-parcel' : 'fail-no-parcel');
    if (Number(open.main) !== IF_ROOT) {
      fail(`expected parcel main ${IF_ROOT}, got ${JSON.stringify(open)}`);
    }
    const hasLogs = open.items.some(i => i.id === LOGS);
    if (!hasLogs) {
      fail(`parcel 7x4 missing logs ${LOGS}; ids=${open.items.map(i => i.id).join(',')}`);
    }
    console.log(`RESULT PASS tbwpr main=${open.main} overlay=${open.overlay} stock=${open.items.length} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
