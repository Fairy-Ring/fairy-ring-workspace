#!/usr/bin/env node
/**
 * OSF Petra sculpture Search after Phantuwti. 16→17. Name Cromperty. No dest.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-osf-petra \
 *     node tools/harness/quest-osf-petra-search-smoke.mjs
 *
 * Soft onesmallfavour 16. Stand 2620,9835 W of loc 2621,9835 (m40_153 0 61 43: 5808).
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
const { username, password } = resolveAccount(rest, 'osfpt');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2620, z: 9835, level: 0 };
const LOC = { x: 2621, z: 9835 };

async function worldTile(page) {
  return page.evaluate(() => {
    const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
    return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[osfpt] ${base} user=${username} (Petra Search)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`osfpt_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar onesmallfavour 16', 300);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele sculpture failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-cave');

    const loc = await page.evaluate(({ x, z }) => {
      const r = globalThis.__lc377?.reader;
      const hit = typeof r?.locAt === 'function' ? r.locAt(x, z) : null;
      return hit ? { id: hit.id, name: hit.name, ops: hit.ops } : null;
    }, LOC);
    console.log('[osfpt] loc', JSON.stringify(loc));
    if ((loc?.id | 0) !== 5808) fail(`sculpture 5808 missing ${JSON.stringify(loc)}`);

    const search = await page.evaluate(async ({ x, z }) => {
      const h = globalThis.__lc377;
      const a = h?.actions;
      const r = h?.reader;
      const sleep = ms => new Promise(res => setTimeout(res, ms));
      const ok = !!(a?.opLocAt?.(x, z, 'Search') || a?.opLocAt?.(x, z, 'search'));
      const bodies = [];
      for (let i = 0; i < 40; i++) {
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
      return { ok, bodies, chat };
    }, LOC);
    console.log('[osfpt] search', JSON.stringify(search));
    if (shot) await shot('02-search');
    if (!search?.ok) fail('Search failed');
    const text = [...(search.bodies || []), ...(search.chat || [])].join(' | ');
    console.log('[osfpt] text', text);
    if (!/cromp|ardoug|belt|sculpture|life-like/i.test(text)) fail(`belt/Cromperty missing: ${text}`);
    if (/12346|remove this key|lamp|animate rock|slagilith/i.test(text)) fail(`later leftover leaked: ${text}`);

    const tile = await worldTile(page);
    console.log('[osfpt] tile', tile);
    if (Math.abs((tile.x | 0) - STAND.x) > 12 || Math.abs((tile.z | 0) - STAND.z) > 12) {
      fail(`dest invented ${JSON.stringify(tile)}`);
    }
    const stage = await getServerVarQuiet(page, 'onesmallfavour');
    if (Number(stage) !== 17) fail(`onesmallfavour=${stage} (want 17)`);

    console.log(`RESULT PASS osfpt Petra Search 16→17 stay cave user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
