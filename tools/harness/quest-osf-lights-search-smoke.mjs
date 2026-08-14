#!/usr/bin/env node
/**
 * OSF landing-light Search after Gnormadium. Stay 21. Uncut sapphire. No dest / flip.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-osf-lights \
 *     node tools/harness/quest-osf-lights-search-smoke.mjs
 *
 * Soft onesmallfavour 21. Stand 2545,2968 S of south sapphire 2545,2969.
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
const { username, password } = resolveAccount(rest, 'osflt');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2545, z: 2968, level: 0 };
const LIGHT = { x: 2545, z: 2969 };

async function worldTile(page) {
  return page.evaluate(() => {
    const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
    return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[osflt] ${base} user=${username} (OSF lights Search)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`osflt_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar onesmallfavour 21', 300);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele lights failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-strip');

    const loc = await page.evaluate(({ x, z }) => {
      const locs = globalThis.__lc377?.reader?.locs?.() ?? [];
      const hits = locs.filter(l => (l.x | 0) === x && (l.z | 0) === z);
      const r = globalThis.__lc377?.reader;
      const at = r?.locAt?.(x, z);
      return {
        at: at ? { id: at.id, typecode: at.typecode, lx: at.lx, lz: at.lz, name: at.name, ops: at.ops } : null,
        hits: hits.map(l => ({ id: l.id, name: l.name, ops: l.ops, typecode: l.typecode, lx: l.lx, lz: l.lz }))
      };
    }, LIGHT);
    console.log('[osflt] loc', JSON.stringify(loc));
    if (!loc?.at && !(loc?.hits || []).length) fail(`light loc missing at ${LIGHT.x},${LIGHT.z}`);

    const search = await page.evaluate(async ({ x, z }) => {
      const h = globalThis.__lc377;
      const a = h?.actions;
      const r = h?.reader;
      const sleep = ms => new Promise(res => setTimeout(res, ms));
      // Multi parent 5823 has empty ops in the reader; Search is packed op5 (OP_LOC5=1071).
      const OP_LOC5 = 1071;
      const at = r?.locAt?.(x, z);
      const listed = (r?.locs?.() ?? []).find(l => (l.x | 0) === x && (l.z | 0) === z && (l.id | 0) === 5823)
        || (r?.locs?.() ?? []).find(l => (l.x | 0) === x && (l.z | 0) === z);
      const hit = at || listed;
      let ok = false;
      if (hit && a?.menuAction && hit.typecode != null) {
        ok = !!a.menuAction(OP_LOC5, hit.typecode, hit.lx, hit.lz);
      }
      if (!ok) {
        ok = !!(a?.opLocAt?.(x, z, 'Search') || a?.opLocAt?.(x, z, 'search') || a?.opLocAt?.(x, z, ''));
      }
      const bodies = [];
      for (let i = 0; i < 50; i++) {
        const body = r?.chatBodyText?.() || '';
        if (body && (bodies.length === 0 || bodies[bodies.length - 1] !== body)) {
          bodies.push(body.slice(0, 280));
        }
        a?.continueDialog?.();
        await sleep(350);
        const open = !!r?.dialogOpen?.() || (r?.modals?.()?.chat ?? -1) !== -1;
        if (!open && bodies.length && i > 6) break;
      }
      const chat = typeof r?.chat === 'function' ? r.chat(16).map(c => String(c?.text ?? '')) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      const inv = (r?.inventory?.() ?? []).map(i => ({
        id: i?.id | 0,
        name: String(i?.name ?? '')
      }));
      return {
        ok,
        noTrig: noTrig ?? null,
        bodies,
        chat,
        inv,
        hit: hit ? { id: hit.id, typecode: hit.typecode, lx: hit.lx, lz: hit.lz, ops: hit.ops } : null
      };
    }, LIGHT);
    console.log('[osflt] search', JSON.stringify(search));
    if (shot) await shot('02-search');
    if (!search?.ok) fail(`Search failed ${JSON.stringify(search)}`);
    if (search?.noTrig) fail(search.noTrig);
    const text = [...(search.bodies || []), ...(search.chat || [])].join(' | ');
    if (!/uncut sapphire|landing light/i.test(text)) fail(`uncut missing: ${text}`);
    if (/12346|remove this key|lamp|comfy|animate rock|all the landing lights/i.test(text)) {
      fail(`later leftover leaked: ${text}`);
    }
    const inv = search.inv || [];
    if (!inv.some(i => i.id === 1623 || /uncut sapphire/i.test(i.name))) {
      fail(`uncut sapphire 1623 missing ${JSON.stringify(inv)}`);
    }

    const tile = await worldTile(page);
    console.log('[osflt] tile', tile);
    if (Math.abs((tile.x | 0) - STAND.x) > 12 || Math.abs((tile.z | 0) - STAND.z) > 12) {
      fail(`dest invented ${JSON.stringify(tile)}`);
    }
    const stage = await getServerVarQuiet(page, 'onesmallfavour');
    if (Number(stage) !== 21) fail(`onesmallfavour=${stage} (want 21)`);

    console.log(`RESULT PASS osflt lights Search stay 21 user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
