#!/usr/bin/env node
/**
 * OSF Slagilith spawn after animate-rock misfire. Stay 25. No dest / free Petra.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-osf-slag \
 *     node tools/harness/quest-osf-slagilith-spawn-smoke.mjs
 *
 * Soft onesmallfavour 25 + give 4428. Read in alcove 2620,9835.
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
const { username, password } = resolveAccount(rest, 'osfsl');
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

// jm2 NPC pins are 2620,9833 / 2620,9836. Size-2 client snap is SW+1,+1.
const PILE_PINS = [
  { x: 2621, z: 9834 },
  { x: 2621, z: 9837 }
];

async function slagScan(page) {
  return page.evaluate(() => {
    const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
    return npcs
      .filter(x => {
        const id = x.id | 0;
        const n = String(x?.name ?? '');
        return id === 1802 || id === 1804 || id === 1803 || id === 1801 || /slagilith|petra|rock pile/i.test(n);
      })
      .map(x => ({
        id: x.id | 0,
        name: String(x.name ?? ''),
        tile: x.tile ? { x: x.tile.x | 0, z: x.tile.z | 0, level: x.tile.level | 0 } : null
      }));
  });
}

function pileTiles(scan) {
  return (scan || []).filter(n => (n.id | 0) === 1803 || /rock pile/i.test(String(n.name ?? '')));
}

function pilesOffPin(scan) {
  const piles = pileTiles(scan);
  if (piles.length < 2) return `want 2 rock piles, got ${JSON.stringify(piles)}`;
  const leftover = PILE_PINS.map(p => ({ ...p }));
  for (const pile of piles) {
    const t = pile.tile || {};
    const i = leftover.findIndex(p => p.x === (t.x | 0) && p.z === (t.z | 0));
    if (i < 0) return `pile off pin ${JSON.stringify(piles)} want ${JSON.stringify(PILE_PINS)}`;
    leftover.splice(i, 1);
  }
  return null;
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[osfsl] ${base} user=${username} (Slagilith spawn)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`osfsl_${username}`);
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
    await waitTicks(page, 20);
    if (shot) await shot('01-alcove');

    const before = await slagScan(page);
    console.log('[osfsl] before', JSON.stringify(before));
    if (before.some(n => n.id === 1802 || n.id === 1804)) {
      fail(`Slagilith already present ${JSON.stringify(before)}`);
    }
    const pilesBefore = pilesOffPin(before);
    if (pilesBefore) fail(`hybernate wandered before cast: ${pilesBefore}`);

    const read = await heldRead(page);
    console.log('[osfsl] read', JSON.stringify(read));
    if (shot) await shot('02-read');
    if (!read?.ok) fail(`Read failed ${JSON.stringify(read)}`);
    if (read?.noTrig) fail(read.noTrig);
    const text = [...(read.bodies || []), ...(read.chat || [])].join(' | ');
    if (!/um nahi listic|misfire|doesn't look good/i.test(text)) {
      fail(`misfire missing: ${text}`);
    }
    if (/oh thank goodness|12346|remove this key|lamp|king.?s ransom/i.test(text)) {
      fail(`later leftover leaked: ${text}`);
    }

    await waitTicks(page, 20);
    const after = await slagScan(page);
    console.log('[osfsl] after', JSON.stringify(after));
    if (shot) await shot('03-spawn');
    if (!after.some(n => n.id === 1802 || n.id === 1804 || /slagilith/i.test(n.name))) {
      fail(`Slagilith 1802/1804 missing ${JSON.stringify(after)}`);
    }
    if (after.some(n => n.id === 1801 || /petra/i.test(n.name))) {
      fail(`Petra spawned ${JSON.stringify(after)}`);
    }
    const pilesAfter = pilesOffPin(after);
    if (pilesAfter) fail(`hybernate wandered after spawn: ${pilesAfter}`);

    const tile = await worldTile(page);
    console.log('[osfsl] tile', tile);
    if (Math.abs((tile.x | 0) - STAND.x) > 10 || Math.abs((tile.z | 0) - STAND.z) > 10) {
      fail(`dest invented ${JSON.stringify(tile)}`);
    }
    const stage = await getServerVarQuiet(page, 'onesmallfavour');
    if (Number(stage) !== 25) fail(`onesmallfavour=${stage} (want stay 25)`);

    console.log(`RESULT PASS osfsl spawn stay 25 no dest no petra user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
