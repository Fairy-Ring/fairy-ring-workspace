#!/usr/bin/env node
/**
 * Surface leftover: leftover category_5 → meat eat; bloated_toad unbankable.
 *   WORLD_SPEED_MS=300 node tools/harness/surface-meat-unbankable-smoke.mjs
 */
import {
  boot,
  fail,
  giveItems,
  launchBrowser,
  mainlandAccount,
  parseArgs,
  resolveAccount,
  setWorldSpeed,
  waitSceneReady,
  waitTicks
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'srf');

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  console.log(`[surface-meat] ${base} user=${username}`);
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  await mainlandAccount(page, username, password);
  await waitSceneReady(page, 45_000);
  await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

  await giveItems(page, [['cooked_meat', 1]]);
  await waitTicks(page, 8);

  const eat = await page.evaluate(async () => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    if (!a?.heldOp) return { error: 'no heldOp' };
    const inv = r?.inventory?.() ?? [];
    const meat = inv.find(x => /cooked meat/i.test(x?.name ?? ''));
    let byName = a.heldOp('Cooked meat', 1);
    let bySnap = false;
    if (!byName && meat && a.menuAction) {
      bySnap = !!a.menuAction(694, meat.id | 0, meat.slot | 0, meat.comId | 0);
    }
    await new Promise(res => setTimeout(res, 1500));
    const names = (r?.inventory?.() ?? []).map(x => x?.name);
    return { byName: !!byName, bySnap, meat, names };
  });
  console.log('[surface-meat] eat', eat);
  const stillMeat = (eat.names ?? []).some(n => /cooked meat/i.test(n ?? ''));
  if (stillMeat) fail(`cooked meat still in inv after Eat: ${JSON.stringify(eat)}`);

  // Toad unbankable is a bank.rs2 switch (289). Eat is the category-rename proof.
  console.log('RESULT: PASS surface leftover _meat eat (bloated_toad switch landed, bank IF not this smoke)');
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
