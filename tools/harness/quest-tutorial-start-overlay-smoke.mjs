#!/usr/bin/env node
/**
 * Fresh Tutorial Island start: leftover overlay tutorial_island_progress **8680**.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-tutorial-start-overlay-smoke.mjs
 *
 * Does **not** mainland-skip. Product: @start_tutorial → player_kit **3559**
 * + ~set_tutorial_progress → if_openoverlay leftover. Accept design → overlay
 * stays. The leftover yellow chevron (com_25 model com_i311) is **not** the
 * world hint arrow and is **not** supposed to vanish for the bar.
 */
import {
  assertEnginePackHealth,
  boot,
  createShotRunDir,
  fail,
  installScreenshotBridge,
  launchBrowser,
  login,
  parseArgs,
  resolveAccount,
  setWorldSpeed,
  waitSceneReady,
  waitTicks
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'tutst');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const IF_ROOT = 8680;
const DESIGN = 3559;
const OVERLAY_VARP = 406; // tutorial_progress_overlay

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[tutst] ${base} user=${username} (start overlay ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`tutst_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    if (!(await login(page, username, password))) fail('login did not reach ingame');
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await page.evaluate(() => globalThis.__lc377?.actions?.advanceDialog?.()).catch(() => {});
    await waitTicks(page, 4);

    const before = await page.evaluate(() => {
      const m = globalThis.__lc377?.reader?.modals?.() ?? {};
      const t = globalThis.__lc377?.reader?.worldTile?.() ?? null;
      return { main: m.main ?? -1, overlay: m.overlay ?? -1, tile: t };
    });
    console.log('[tutst] post-login', JSON.stringify(before));
    if (shot) await shot('01-design');
    if (Number(before.main) !== DESIGN) {
      fail(`expected player_kit main ${DESIGN} on fresh start, got ${JSON.stringify(before)}`);
    }

    const accepted = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      return !!(a?.designAccept?.() || a?.ifButton?.(3651));
    });
    console.log('[tutst] designAccept', accepted);
    if (!accepted) {
      if (shot) await shot('fail-no-accept');
      fail('player_kit Accept did not fire');
    }

    const seen = await page.evaluate(async ([wantOv, wantDesign, varp]) => {
      const r = globalThis.__lc377?.reader;
      const hits = [];
      for (let i = 0; i < 40; i++) {
        const m = r?.modals?.() ?? {};
        const v = typeof r?.varp === 'function' ? r.varp(varp) : null;
        hits.push({ main: m.main ?? -1, ov: m.overlay ?? -1, v });
        if ((m.overlay ?? -1) === wantOv && (m.main ?? -1) !== wantDesign) {
          return { overlay: m.overlay, main: m.main, varp: v, hits: hits.slice(-8) };
        }
        await new Promise(res => setTimeout(res, 250));
      }
      const last = hits.at(-1) ?? {};
      return { overlay: last.ov ?? -1, main: last.main ?? -1, varp: last.v ?? null, hits };
    }, [IF_ROOT, DESIGN, OVERLAY_VARP]);
    console.log('[tutst] after-accept', JSON.stringify(seen));
    if (shot) await shot(Number(seen.overlay) === IF_ROOT ? 'pass-start-overlay' : 'fail-no-overlay');
    if (Number(seen.overlay) !== IF_ROOT) {
      fail(`expected leftover overlay ${IF_ROOT} after design, got ${JSON.stringify(seen)}`);
    }
    console.log(
      `RESULT PASS tutst overlay=${seen.overlay} main=${seen.main} varp406=${seen.varp} user=${username}`
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
