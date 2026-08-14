#!/usr/bin/env node
/**
 * Desert Treasure village Eblis take (opnpcu fd_elder_village).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-dt-eblis-take-smoke.mjs
 *
 * Soft deserttreasure 8. Use magic log + bones. fd_* increment. Stay 8.
 * Never 10 / 15. Stand west of curtain.
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
const { username, password } = resolveAccount(rest, 'dttak');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3181, z: 2984, level: 0 };
const CURTAIN = { x: 3182, z: 2984, level: 0 };
const EBLIS_ID = 1923;

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[dttak] ${base} user=${username} (Eblis take)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`dttak_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setstat hitpoints 90', 300);
    await cheatQuiet(page, 'setvar deserttreasure 8', 400);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Eblis stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const curtain = await page.evaluate(([x, z]) => {
      const a = globalThis.__lc377?.actions;
      const ok = !!a?.opLocAt?.(x, z, 'Open') || !!a?.opLoc?.('Curtain', 'Open', 8);
      return { ok };
    }, [CURTAIN.x, CURTAIN.z]);
    console.log('[dttak] curtain', JSON.stringify(curtain));
    if (!curtain?.ok) fail(`curtain Open failed ${JSON.stringify(curtain)}`);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /^eblis$/i.test(x?.name || ''));
      return { hit: hit ? { id: hit.id, name: hit.name } : null };
    }, EBLIS_ID);
    console.log('[dttak] npc', JSON.stringify(seen));
    if (shot) await shot('01-eblis');
    if (!seen?.hit) fail(`village Eblis missing ${JSON.stringify(seen)}`);

    await giveItems(page, [
      ['magic_logs', 2],
      ['bones', 1]
    ]);

    const useLog = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const inv = r?.inventory?.() ?? [];
      const logs = inv.find(i => /magic log/i.test(String(i?.name ?? '')));
      if (!logs || !a?.useHeldOnNpc) return { ok: false, err: 'no logs/abi', names: inv.map(i => i?.name) };
      return { ok: !!a.useHeldOnNpc(logs, 'Eblis'), item: logs.name };
    });
    console.log('[dttak] use log', JSON.stringify(useLog));
    if (!useLog?.ok) fail(`use magic logs failed ${JSON.stringify(useLog)}`);
    await waitTicks(page, 6);
    if (shot) await shot('02-log');
    const logsBit = await getServerVarQuiet(page, 'fd_magiclog');
    if (Number(logsBit) !== 1) fail(`fd_magiclog=${logsBit} after one log`);
    const stageAfterLog = await getServerVarQuiet(page, 'deserttreasure');
    if (Number(stageAfterLog) !== 8) fail(`log take wrote deserttreasure=${stageAfterLog}`);

    const useBones = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const inv = r?.inventory?.() ?? [];
      const bones = inv.find(i => /^bones$/i.test(String(i?.name ?? '').trim()));
      if (!bones || !a?.useHeldOnNpc) return { ok: false, err: 'no bones/abi', names: inv.map(i => i?.name) };
      return { ok: !!a.useHeldOnNpc(bones, 'Eblis'), item: bones.name };
    });
    console.log('[dttak] use bones', JSON.stringify(useBones));
    if (!useBones?.ok) fail(`use bones failed ${JSON.stringify(useBones)}`);
    await waitTicks(page, 8);
    if (shot) await shot('03-bones');
    const bonesBit = await getServerVarQuiet(page, 'fd_bones');
    if (Number(bonesBit) !== 1) fail(`fd_bones=${bonesBit}`);
    const stage = await getServerVarQuiet(page, 'deserttreasure');
    if (Number(stage) !== 8) fail(`bones take wrote deserttreasure=${stage}`);
    if (Number(stage) >= 10) fail('wrote 10+ on take');

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (!tile || Math.abs((tile.x | 0) - STAND.x) > 16 || Math.abs((tile.z | 0) - STAND.z) > 16) {
      fail(`left Bandit Camp ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS dttak eblis=${EBLIS_ID} fd_magiclog=${logsBit} fd_bones=${bonesBit} deserttreasure=${stage} never10 village=${tile.x},${tile.z} user=${username}`
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
