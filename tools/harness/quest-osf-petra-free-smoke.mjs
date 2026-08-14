#!/usr/bin/env node
/**
 * OSF free Petra after Slagilith kill. 26→27. Second Read + script-spawn 1801.
 * No dest / 12346 / lamps / Phantuwti unwind.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-osf-petraf \
 *     node tools/harness/quest-osf-petra-free-smoke.mjs
 */
import {
  assertEnginePackHealth,
  boot,
  cheatQuiet,
  createShotRunDir,
  fail,
  getServerVarQuiet,
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
const { username, password } = resolveAccount(rest, 'osfpf');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2620, z: 9835, level: 0 };

async function worldTile(page) {
  return page.evaluate(() => {
    const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
    return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
  });
}

async function heldRead(page) {
  return page.evaluate(async () => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    if (!a?.heldOp) return { error: 'no heldOp' };
    const sleep = ms => new Promise(res => setTimeout(res, ms));
    const ok =
      a.heldOp('Animate rock scroll', 1) ||
      a.heldOp('animate rock', 1) ||
      a.useHeld?.('Animate rock scroll');
    await sleep(1200);
    const bodies = [];
    for (let i = 0; i < 180; i++) {
      const body = r.chatBodyText?.() || '';
      if (body && (bodies.length === 0 || bodies[bodies.length - 1] !== body)) {
        bodies.push(body.slice(0, 240));
      }
      a.continueDialog?.();
      await sleep(400);
      const open = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
      const joined = bodies.join(' | ');
      if (!open && /thank goodness|released me|gloomy wall/i.test(joined) && i > 16) break;
      if (!open && i > 80) break;
    }
    const chat = typeof r.chat === 'function' ? r.chat(24).map(c => String(c?.text ?? '')) : [];
    const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
    return { ok, noTrig: noTrig ?? null, bodies: bodies.slice(0, 24), chat };
  });
}

async function petraScan(page) {
  return page.evaluate(() => {
    const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
    return npcs
      .filter(x => {
        const id = x.id | 0;
        const n = String(x?.name ?? '');
        return id === 1801 || id === 1802 || id === 1804 || /petra|slagilith/i.test(n);
      })
      .map(x => ({ id: x.id | 0, name: String(x.name ?? '') }));
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[osfpf] ${base} user=${username} (free Petra)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`osfpf_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar onesmallfavour 26', 300);
    await cheatQuiet(page, 'give favour_animate_rock 1', 300);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele alcove failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-alcove');

    const before = await petraScan(page);
    console.log('[osfpf] before', JSON.stringify(before));
    if (before.some(n => n.id === 1801 || /petra/i.test(n.name))) {
      fail(`Petra already present ${JSON.stringify(before)}`);
    }

    const read = await heldRead(page);
    console.log('[osfpf] read', JSON.stringify(read));
    if (shot) await shot('02-read');
    if (!read?.ok) fail(`Read failed ${JSON.stringify(read)}`);
    if (read?.noTrig) fail(read.noTrig);
    const text = [...(read.bodies || []), ...(read.chat || [])].join(' | ');
    if (!/thank goodness|released me|gloomy wall/i.test(text)) {
      fail(`free chat missing: ${text}`);
    }
    if (/misfire|doesn't look good|12346|remove this key|lamp|weather vane|i've released petra/i.test(text)) {
      fail(`later leftover leaked: ${text}`);
    }

    await waitTicks(page, 4);
    const after = await petraScan(page);
    console.log('[osfpf] after', JSON.stringify(after));
    if (after.some(n => n.id === 1801 || /petra/i.test(n.name))) {
      fail(`Petra lingered after send-back ${JSON.stringify(after)}`);
    }
    if (after.some(n => n.id === 1802 || n.id === 1804 || /slagilith/i.test(n.name))) {
      fail(`Slagilith spawned ${JSON.stringify(after)}`);
    }

    const tile = await worldTile(page);
    console.log('[osfpf] tile', tile);
    if (Math.abs((tile.x | 0) - STAND.x) > 10 || Math.abs((tile.z | 0) - STAND.z) > 10) {
      fail(`dest invented ${JSON.stringify(tile)}`);
    }
    const stage = await getServerVarQuiet(page, 'onesmallfavour');
    if (Number(stage) !== 27) fail(`onesmallfavour=${stage} (want 27)`);

    console.log(`RESULT PASS osfpf free Petra 26→27 no dest user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
