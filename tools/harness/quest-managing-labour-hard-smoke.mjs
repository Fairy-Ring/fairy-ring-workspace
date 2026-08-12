#!/usr/bin/env node
/**
 * Managing labour HARD — product wood / mine / fish approval (not flax).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-managing-labour-hard-smoke.mjs
 *
 * Soft: misc_quest 100, misc_approval 90, setstat attack 40 + WC/mining/fishing + tools.
 * Product: chop mapletree / mine coalrock1 / cage rarefish → each +1 approval.
 *
 * Flax / RT rake plots are post-tip (22 May 2006) — not this smoke.
 *
 * @see docs/research/port-mg-managing-misc-289-to-377.md
 * @see docs/research/game-knowledge/anchors-miscellania.md
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
  waitServerVar,
  waitTicks
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'manlab');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const MAPLE = { x: 2549, z: 3864, level: 0 }; // beside mapletree 0_39_60_54_24
const COAL = { x: 2525, z: 3895, level: 0 }; // beside coalrock1 0_39_60_30_55
const FISH = { x: 2576, z: 3851, level: 0 }; // beside 0_40_60_rarefish 0_40_60_16_10

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

async function fireLoc(page, nameRe, opRe) {
  return page.evaluate(
    ({ nameRe, opRe }) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a || !r) return { error: 'no abi' };
      const name = new RegExp(nameRe, 'i');
      const op = new RegExp(opRe, 'i');
      const locs = typeof r.locs === 'function' ? r.locs({ maxDist: 10 }) : [];
      const hit = locs.find(
        l => name.test(String(l?.name ?? '')) && (l.ops || []).some(o => o && op.test(String(o)))
      );
      let ok = false;
      if (hit && typeof a.opLoc === 'function') ok = !!a.opLoc(hit.name, opRe, 12);
      if (!ok && hit && typeof a.opLocAt === 'function') ok = !!a.opLocAt(hit.x, hit.z, opRe);
      return { ok, name: hit?.name, x: hit?.x, z: hit?.z, ops: hit?.ops, n: locs.length };
    },
    { nameRe, opRe }
  );
}

async function fireNpcOp(page, nameRe, op1based) {
  return page.evaluate(
    ({ nameRe, op1based }) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a || !r) return { error: 'no abi' };
      const re = new RegExp(nameRe, 'i');
      const n = (r.npcs?.() ?? []).find(x => re.test(x?.name || ''));
      if (!n) return { error: 'no npc', names: (r.npcs?.() ?? []).map(x => x?.name).slice(0, 12) };
      return { ok: !!a.npcOp?.(n.index, op1based), name: n.name, index: n.index };
    },
    { nameRe, op1based }
  );
}

async function labourUntilPlus(page, tag, fire, from) {
  let last = from;
  for (let attempt = 0; attempt < 10; attempt++) {
    const r = await fire();
    console.log(`[manage-lab] ${tag} fire ${attempt}`, r);
    if (!r?.ok && !r?.error) {
      await waitTicks(page, 3);
      continue;
    }
    last = await waitServerVar(page, 'misc_approval', {
      from,
      attempts: 10,
      ticksBetween: 6
    });
    const chat = await chatTail(page);
    console.log(`[manage-lab] ${tag} after wait approval=${last} (from ${from})`, chat.slice(-6));
    if (Number(last) > Number(from)) return last;
    await waitTicks(page, 4);
  }
  return last;
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[manage-lab] ${base} user=${username} (wood+mine+fish; headed default)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`manage-lab_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    await cheatQuiet(page, 'setvar misc_quest 100', 400);
    // Rune axe / rune pick require Attack 40 to Wear (chat: "attack level of 40").
    await cheatQuiet(page, 'setstat attack 40', 200);
    await cheatQuiet(page, 'setstat woodcutting 70', 200);
    await cheatQuiet(page, 'setstat mining 60', 200);
    await cheatQuiet(page, 'setstat fishing 50', 200);
    await giveItems(page, [
      ['rune_axe', 1],
      ['rune_pickaxe', 1],
      ['lobster_pot', 1]
    ]);
    await waitTicks(page, 2);

    // --- wood ---
    if (!(await teleTo(page, MAPLE, 2, 25_000))) fail('tele maple failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);
    await cheatQuiet(page, 'setvar misc_approval 90', 400);
    await waitTicks(page, 2);
    await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      a?.equip?.('Rune axe') || a?.equip?.('rune_axe');
    });
    await waitTicks(page, 3);
    const wornAxe = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.equipment?.() ?? []).some(i => /rune axe/i.test(String(i?.name ?? '')))
    );
    if (!wornAxe) fail('rune axe not worn after equip (need Attack 40)');
    const wood0 = Number(await getServerVarQuiet(page, 'misc_approval'));
    const wood1 = Number(
      await labourUntilPlus(page, 'wood', () => fireLoc(page, 'maple', 'chop'), wood0)
    );
    if (shot) await shot('after-wood');
    if (!(wood1 > wood0)) fail(`WOOD FAIL approval ${wood0}→${wood1}`);

    // --- mine ---
    if (!(await teleTo(page, COAL, 2, 25_000))) fail('tele coal failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);
    await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      a?.equip?.('Rune pickaxe') || a?.equip?.('rune_pickaxe');
    });
    await waitTicks(page, 3);
    const wornPick = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.equipment?.() ?? []).some(i => /rune pick/i.test(String(i?.name ?? '')))
    );
    if (!wornPick) fail('rune pickaxe not worn after equip (need Attack 40)');
    const mine0 = Number(await getServerVarQuiet(page, 'misc_approval'));
    const mine1 = Number(
      await labourUntilPlus(page, 'mine', () => fireLoc(page, 'rocks', 'mine'), mine0)
    );
    if (shot) await shot('after-mine');
    if (!(mine1 > mine0)) fail(`MINE FAIL approval ${mine0}→${mine1}`);

    // --- fish (Etceteria rarefish, still in miscellania bounds) ---
    if (!(await teleTo(page, FISH, 2, 25_000))) fail('tele fish failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);
    const fish0 = Number(await getServerVarQuiet(page, 'misc_approval'));
    const fish1 = Number(
      await labourUntilPlus(page, 'fish', () => fireNpcOp(page, 'fishing spot', 1), fish0)
    );
    if (shot) await shot('after-fish');
    if (!(fish1 > fish0)) fail(`FISH FAIL approval ${fish0}→${fish1}`);

    console.log(
      `RESULT PASS manage-lab HARD wood ${wood0}→${wood1} mine ${mine0}→${mine1} fish ${fish0}→${fish1} (SOFT quest 100 + stats)`
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
