#!/usr/bin/env node
/**
 * OSF Slagilith kill after spawn. 25→26. No dest / free Petra.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-osf-slagk \
 *     node tools/harness/quest-osf-slagilith-kill-smoke.mjs
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
const { username, password } = resolveAccount(rest, 'osfsk');
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
    await sleep(800);
    const bodies = [];
    for (let i = 0; i < 80; i++) {
      const body = r.chatBodyText?.() || '';
      if (body && (bodies.length === 0 || bodies[bodies.length - 1] !== body)) {
        bodies.push(body.slice(0, 240));
      }
      a.continueDialog?.();
      await sleep(350);
      const open = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
      if (!open && bodies.length && i > 6) break;
      if (!open && i > 20) break;
    }
    const chat = typeof r.chat === 'function' ? r.chat(20).map(c => String(c?.text ?? '')) : [];
    const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
    return { ok, noTrig: noTrig ?? null, bodies: bodies.slice(0, 20), chat };
  });
}

async function slagScan(page) {
  return page.evaluate(() => {
    const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
    return npcs
      .filter(x => {
        const id = x.id | 0;
        const n = String(x?.name ?? '');
        return id === 1802 || id === 1804 || id === 1801 || /slagilith|petra/i.test(n);
      })
      .map(x => ({
        id: x.id | 0,
        name: String(x.name ?? ''),
        inCombat: !!x.inCombat
      }));
  });
}

async function attackSlag(page) {
  return page.evaluate(() => {
    const a = globalThis.__lc377?.actions;
    const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
    const n = npcs.find(x => (x.id | 0) === 1802 || /slagilith/i.test(String(x?.name ?? '')));
    const named = !!a?.attackNpc?.('Slagilith');
    const op = n ? !!a?.npcOp?.(n.index, 2) : false;
    return { named, op, id: n?.id ?? null, index: n?.index ?? null };
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[osfsk] ${base} user=${username} (Slagilith kill)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`osfsk_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar onesmallfavour 25', 300);
    await cheatQuiet(page, 'give favour_animate_rock 1', 300);
    await cheatQuiet(page, 'setstat attack 80', 200);
    await cheatQuiet(page, 'setstat strength 80', 200);
    await cheatQuiet(page, 'setstat defence 80', 200);
    await cheatQuiet(page, 'setstat hitpoints 80', 200);
    await cheatQuiet(page, 'give rune_scimitar 1', 200);
    await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      return a?.equip?.('Rune scimitar') || a?.equip?.('rune scimitar') || a?.heldOp?.('Rune scimitar', 1);
    });
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele alcove failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-alcove');

    const read = await heldRead(page);
    console.log('[osfsk] read', JSON.stringify(read));
    if (shot) await shot('02-read');
    if (!read?.ok) fail(`Read failed ${JSON.stringify(read)}`);
    if (read?.noTrig) fail(read.noTrig);
    const text = [...(read.bodies || []), ...(read.chat || [])].join(' | ');
    if (!/um nahi listic|misfire|doesn't look good/i.test(text)) {
      fail(`misfire missing: ${text}`);
    }
    if (/oh thank goodness|12346|remove this key|lamp/i.test(text)) {
      fail(`later leftover leaked: ${text}`);
    }

    await waitTicks(page, 8);
    const spawned = await slagScan(page);
    console.log('[osfsk] spawned', JSON.stringify(spawned));
    if (!spawned.some(n => n.id === 1802 || n.id === 1804 || /slagilith/i.test(n.name))) {
      fail(`Slagilith missing ${JSON.stringify(spawned)}`);
    }
    if (spawned.some(n => n.id === 1801 || /petra/i.test(n.name))) {
      fail(`Petra spawned ${JSON.stringify(spawned)}`);
    }

    let dead = false;
    for (let i = 0; i < 90; i++) {
      const atk = await attackSlag(page);
      if (i === 0 || i % 8 === 0) console.log('[osfsk] atk', i, JSON.stringify(atk));
      await waitTicks(page, 2);
      const scan = await slagScan(page);
      if (!scan.some(n => n.id === 1802 || n.id === 1804)) {
        dead = true;
        console.log('[osfsk] dead', JSON.stringify(scan));
        break;
      }
    }
    if (shot) await shot('03-kill');
    if (!dead) fail('Slagilith still present after attack loop');

    const tile = await worldTile(page);
    console.log('[osfsk] tile', tile);
    if (Math.abs((tile.x | 0) - STAND.x) > 10 || Math.abs((tile.z | 0) - STAND.z) > 10) {
      fail(`dest invented ${JSON.stringify(tile)}`);
    }
    const afterKill = await slagScan(page);
    if (afterKill.some(n => n.id === 1801 || /petra/i.test(n.name))) {
      fail(`Petra spawned ${JSON.stringify(afterKill)}`);
    }
    const stage = await getServerVarQuiet(page, 'onesmallfavour');
    if (Number(stage) !== 26) fail(`onesmallfavour=${stage} (want 26)`);

    console.log(`RESULT PASS osfsk kill 25→26 no dest no petra user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
