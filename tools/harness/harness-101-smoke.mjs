#!/usr/bin/env node
/**
 * Harness 101 — copy this file. Do not clone the vault's 160 quest smokes.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-101 \
 *     node tools/harness/harness-101-smoke.mjs
 *
 * Requires: isolation engine on :81 / :43595, harness client built
 * (`bun tools/harness/build-client.mjs`).
 *
 * Pattern (rs2b0t PR 604 / Decision 015):
 *   1. read one snapshot
 *   2. send (walk / interact) — returns immediately
 *   3. wait by naming evidence (arrived), not sleep
 *   4. long walks use travelTo (hop-split inside the loaded scene)
 *
 * Soft: tele to Lumbridge courtyard only. No quest setvar. No dest invent.
 */
import {
  assertEnginePackHealth,
  boot,
  fail,
  launchBrowser,
  mainlandAccount,
  parseArgs,
  resolveAccount,
  setWorldSpeed,
  teleTo,
  waitSceneReady,
  waitTicks,
  worldTile
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'h101');

/** Lumbridge courtyard east — stay off the castle Large door (3208 is west through it). */
const STAND = { x: 3222, z: 3218, level: 0 };
const WALK = { x: 3236, z: 3218, level: 0 };

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[h101] ${base} user=${username}`);
  console.log('[h101] copy-this template — Decision 015 / PR 604 send-then-evidence');

  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    if (!(await teleTo(page, STAND, 1, 25_000))) fail('tele Lumbridge courtyard failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 4);

    const before = await worldTile(page);
    console.log('[h101] before', before);

    const navReady = await page.evaluate(() => !!globalThis.__lc377Nav?.travelTo);
    if (!navReady) {
      fail('__lc377Nav.travelTo missing — rebuild: bun tools/harness/build-client.mjs');
    }

    const trip = await page.evaluate(async dest => {
      const nav = globalThis.__lc377Nav;
      return nav.travelTo(dest, {
        radius: 2,
        log: m => console.log('[travel]', m)
      });
    }, WALK);

    console.log('[h101] travel', JSON.stringify(trip));
    const after = await worldTile(page);
    console.log('[h101] after', after);

    if (trip?.kind !== 'arrived') {
      fail(`travel ended ${trip?.kind ?? 'null'}: ${trip?.detail ?? trip?.reason ?? ''}`);
    }
    const d = Math.max(Math.abs((after.x | 0) - WALK.x), Math.abs((after.z | 0) - WALK.z));
    if (d > 2) fail(`ended ${after.x},${after.z} — want within 2 of ${WALK.x},${WALK.z}`);

    console.log(`[h101] PASS arrived near ${WALK.x},${WALK.z} (chebyshev ${d})`);
  } finally {
    if (process.env.KEEP_OPEN !== '1') await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
