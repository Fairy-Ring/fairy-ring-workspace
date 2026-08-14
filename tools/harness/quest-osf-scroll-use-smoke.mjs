#!/usr/bin/env node
/**
 * OSF animate-rock Use-on-sculpture after grant. Stay 25. No dest / Slagilith / free Petra.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-osf-scroll-use \
 *     node tools/harness/quest-osf-scroll-use-smoke.mjs
 *
 * Soft onesmallfavour 25 + give 4428. Stand 2620,9835. Use on loc 5808.
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
const { username, password } = resolveAccount(rest, 'osfus');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2620, z: 9835, level: 0 };
const LOC = { x: 2621, z: 9835, level: 0 };
const SLAG = 1802;

async function worldTile(page) {
  return page.evaluate(() => {
    const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
    return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
  });
}

async function drain(page) {
  return page.evaluate(async () => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    const sleep = ms => new Promise(res => setTimeout(res, ms));
    const bodies = [];
    for (let i = 0; i < 80; i++) {
      const body = r.chatBodyText?.() || '';
      if (body && (bodies.length === 0 || bodies[bodies.length - 1] !== body)) {
        bodies.push(body.slice(0, 240));
      }
      if (r.chatOptions?.()?.length) {
        a.continueDialog?.();
        await sleep(400);
        continue;
      }
      a.continueDialog?.();
      await sleep(350);
      const open = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
      if (!open && bodies.length && i > 6) break;
      if (!open && i > 16) break;
    }
    const chat = typeof r.chat === 'function' ? r.chat(20).map(c => String(c?.text ?? '')) : [];
    const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
    const inv = (r.inventory?.() ?? []).map(i => ({
      id: i?.id | 0,
      name: String(i?.name ?? '')
    }));
    return { noTrig: noTrig ?? null, bodies: bodies.slice(0, 20), chat, inv };
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[osfus] ${base} user=${username} (animate-rock Use)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`osfus_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar onesmallfavour 25', 300);
    await cheatQuiet(page, 'give favour_animate_rock 1', 300);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele alcove failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-alcove');

    const seen = await page.evaluate(() => {
      const locs = globalThis.__lc377?.reader?.locs?.() ?? [];
      const loc = locs.find(x => (x.id | 0) === 5808 || /sculpture/i.test(x?.name || ''));
      return { loc: loc ? { id: loc.id, name: loc.name } : null };
    });
    console.log('[osfus] loc', JSON.stringify(seen));
    if ((seen?.loc?.id | 0) !== 5808) fail(`sculpture 5808 missing ${JSON.stringify(seen)}`);

    const use = await page.evaluate(({ locX, locZ }) => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      if (!a?.useHeldOnLoc) return { error: 'no useHeldOnLoc' };
      const locAt = typeof r?.locAt === 'function' ? r.locAt(locX, locZ) : null;
      const ok = locAt
        ? !!a.useHeldOnLoc('Animate rock scroll', locAt) ||
          !!a.useHeldOnLoc('animate rock', locAt)
        : !!a.useHeldOnLoc('Animate rock scroll', 'Sculpture', 10) ||
          !!a.useHeldOnLoc('animate rock', 'Sculpture', 10);
      return { ok, loc: locAt ? { id: locAt.id, name: locAt.name } : null };
    }, { locX: LOC.x, locZ: LOC.z });
    console.log('[osfus] use', JSON.stringify(use));
    if (!use?.ok) fail(`Use-on-sculpture failed ${JSON.stringify(use)}`);
    await waitTicks(page, 4);
    const talk = await drain(page);
    console.log('[osfus] talk', JSON.stringify(talk));
    if (shot) await shot('02-use');
    if (talk?.noTrig) fail(talk.noTrig);
    const text = [...(talk.bodies || []), ...(talk.chat || [])].join(' | ');
    if (!/um nahi listic|misfire|doesn't look good/i.test(text)) {
      fail(`in-room misfire missing: ${text}`);
    }
    if (/oh thank goodness|12346|remove this key|lamp|king.?s ransom|sedridor/i.test(text)) {
      fail(`later leftover leaked: ${text}`);
    }
    if (!(talk.inv || []).some(i => i.id === 4428 || /animate rock/i.test(i.name))) {
      fail(`scroll 4428 consumed ${JSON.stringify(talk.inv)}`);
    }

    const slag = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      return npcs
        .filter(x => (x.id | 0) === id || /slagilith/i.test(x?.name || ''))
        .map(x => ({ id: x.id, name: x.name }));
    }, SLAG);
    console.log('[osfus] slag', JSON.stringify(slag));
    if (slag.length) fail(`Slagilith spawned ${JSON.stringify(slag)}`);

    const tile = await worldTile(page);
    console.log('[osfus] tile', tile);
    if (Math.abs((tile.x | 0) - STAND.x) > 8 || Math.abs((tile.z | 0) - STAND.z) > 8) {
      fail(`dest invented ${JSON.stringify(tile)}`);
    }
    const stage = await getServerVarQuiet(page, 'onesmallfavour');
    if (Number(stage) !== 25) fail(`onesmallfavour=${stage} (want stay 25)`);

    console.log(`RESULT PASS osfus Use stay 25 no dest no slag user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
