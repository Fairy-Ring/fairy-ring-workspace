#!/usr/bin/env node
/**
 * OSF animate-rock Read after Cromperty oxide-return. Stay 25. No dest / Slagilith / free Petra.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-osf-scroll \
 *     node tools/harness/quest-osf-scroll-read-smoke.mjs
 *
 * Soft onesmallfavour 25 + give 4428. Out-of-range then alcove 2620,9835.
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
const { username, password } = resolveAccount(rest, 'osfrd');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const OUT = { x: 2683, z: 3325, level: 0 };
const STAND = { x: 2620, z: 9835, level: 0 };
const SLAG = 1802;

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
    await sleep(800);
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
    return { ok, noTrig: noTrig ?? null, bodies: bodies.slice(0, 20), chat, inv };
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[osfrd] ${base} user=${username} (animate-rock Read)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`osfrd_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar onesmallfavour 25', 300);
    await cheatQuiet(page, 'give favour_animate_rock 1', 300);

    if (!(await teleTo(page, OUT, 2, 25_000))) fail('tele out-of-range failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-out');

    const out = await heldRead(page);
    console.log('[osfrd] out', JSON.stringify(out));
    if (shot) await shot('02-out-read');
    if (!out?.ok) fail(`out Read failed ${JSON.stringify(out)}`);
    if (out?.noTrig) fail(out.noTrig);
    const outText = [...(out.bodies || []), ...(out.chat || [])].join(' | ');
    if (!/doesn't seem to be working here/i.test(outText)) {
      fail(`out-of-range mes missing: ${outText}`);
    }
    if (/um nahi|misfire|doesn't look good|slagilith|petra|12346|remove this key/i.test(outText)) {
      fail(`out-of-range leaked in-room: ${outText}`);
    }
    if (!(out.inv || []).some(i => i.id === 4428 || /animate rock/i.test(i.name))) {
      fail(`scroll 4428 gone out-of-range ${JSON.stringify(out.inv)}`);
    }

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele alcove failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('03-alcove');

    const seen = await page.evaluate(() => {
      const locs = globalThis.__lc377?.reader?.locs?.() ?? [];
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const loc = locs.find(x => (x.id | 0) === 5808 || /sculpture/i.test(x?.name || ''));
      const slag = npcs.filter(x => (x.id | 0) === 1802 || /slagilith/i.test(x?.name || ''));
      return {
        loc: loc ? { id: loc.id, name: loc.name } : null,
        slag: slag.map(x => ({ id: x.id, name: x.name }))
      };
    });
    console.log('[osfrd] scene', JSON.stringify(seen));
    if ((seen?.loc?.id | 0) !== 5808) fail(`sculpture 5808 missing ${JSON.stringify(seen)}`);

    const inn = await heldRead(page);
    console.log('[osfrd] in', JSON.stringify(inn));
    if (shot) await shot('04-in-read');
    if (!inn?.ok) fail(`in-room Read failed ${JSON.stringify(inn)}`);
    if (inn?.noTrig) fail(inn.noTrig);
    const inText = [...(inn.bodies || []), ...(inn.chat || [])].join(' | ');
    if (!/um nahi listic|misfire|doesn't look good/i.test(inText)) {
      fail(`in-room misfire missing: ${inText}`);
    }
    if (/oh thank goodness|12346|remove this key|lamp|king.?s ransom|sedridor/i.test(inText)) {
      fail(`later leftover leaked: ${inText}`);
    }
    if (!(inn.inv || []).some(i => i.id === 4428 || /animate rock/i.test(i.name))) {
      fail(`scroll 4428 consumed ${JSON.stringify(inn.inv)}`);
    }

    const after = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      return npcs
        .filter(x => (x.id | 0) === id || /slagilith/i.test(x?.name || ''))
        .map(x => ({ id: x.id, name: x.name }));
    }, SLAG);
    console.log('[osfrd] slag', JSON.stringify(after));
    if (after.length) fail(`Slagilith spawned ${JSON.stringify(after)}`);

    const tile = await worldTile(page);
    console.log('[osfrd] tile', tile);
    if (Math.abs((tile.x | 0) - STAND.x) > 8 || Math.abs((tile.z | 0) - STAND.z) > 8) {
      fail(`dest invented ${JSON.stringify(tile)}`);
    }
    const stage = await getServerVarQuiet(page, 'onesmallfavour');
    if (Number(stage) !== 25) fail(`onesmallfavour=${stage} (want stay 25)`);

    console.log(`RESULT PASS osfrd Read stay 25 no dest no slag user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
