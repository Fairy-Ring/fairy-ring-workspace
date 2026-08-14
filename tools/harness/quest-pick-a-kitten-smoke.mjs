#!/usr/bin/env node
/**
 * Gertrude (complete, no cat) → leftover pick_a_kitten **14664** (was inter_305).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-pick-a-kitten-smoke.mjs
 *
 * Soft: fluffs=6, no follower, 100 coins. Product Talk-to buy-another → if_openchat.
 * Stand next to Gertrude **3151,3410**, not on her.
 */
import {
  assertEnginePackHealth,
  boot,
  cheatQuiet,
  createShotRunDir,
  fail,
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
const { username, password } = resolveAccount(rest, 'kitn');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const NPC = { x: 3151, z: 3410, level: 0 };
const STAND = { x: 3151, z: 3409, level: 0 };
const IF_ROOT = 14664;

async function waitIdleNear(page, tile, dist = 1, iters = 50) {
  await page.evaluate(
    async ([wx, wz, d, n]) => {
      const h = globalThis.__lc377;
      for (let i = 0; i < n; i++) {
        const t = h?.worldTile?.();
        const busy = h?.reader?.busy?.() || h?.reader?.moving?.();
        if (t && Math.max(Math.abs(t.x - wx), Math.abs(t.z - wz)) <= d && !busy) break;
        await new Promise(r => setTimeout(r, 200));
      }
    },
    [tile.x, tile.z, dist, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[kitn] ${base} user=${username} (pick_a_kitten ${IF_ROOT})`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`kitn_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar fluffs 6', 400);
    await cheatQuiet(page, 'setvar follower_obj 0', 200);
    await cheatQuiet(page, 'setvar follower_uid 0', 200);
    await giveItems(page, [['coins', 100]]);
    if (!(await teleTo(page, STAND, 1, 25_000))) fail('tele Gertrude stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 4);
    await waitIdleNear(page, STAND, 1, 40);

    const open = await page.evaluate(async () => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      const n = (r?.npcs?.() ?? []).find(x => /gertrude/i.test(x?.name || ''));
      const hits = [];
      let talked = false;
      let choseYes = false;
      for (let i = 0; i < 48; i++) {
        const m0 = r?.modals?.() ?? {};
        if ((m0.chat ?? -1) === 14664) {
          return { npc: n?.name, ...m0, hits: hits.slice(-8) };
        }
        if (!talked) {
          a?.npcOp?.(n?.index, 1) || a?.talkNpc?.('Gertrude');
          talked = true;
        }
        const busy = !!(r?.busy?.() || r?.moving?.());
        const opts = (() => {
          try {
            return (r.chatOptions?.() ?? []).map(o => (typeof o === 'string' ? o : o?.text)).filter(Boolean);
          } catch {
            return [];
          }
        })();
        if (opts.length && !choseYes) {
          a.chooseOption?.(['Yes please', 'Yes', 'more kittens']);
          if (opts.some(o => /yes please|yes/i.test(o))) choseYes = true;
        } else if (!busy && !choseYes) {
          a.continueDialog?.();
          a.dismissModalMessage?.();
        } else if (!busy && choseYes && (m0.chat ?? -1) !== 14664 && (m0.chat ?? -1) > 0) {
          // Click through the "gives you another kitten" mesbox only — do not dismiss the picker.
          a.continueDialog?.();
        }
        const m = r?.modals?.() ?? {};
        hits.push({ main: m.main ?? -1, chat: m.chat ?? -1, opts: opts.slice(0, 3), busy, choseYes });
        if ((m.chat ?? -1) === 14664) return { npc: n?.name, ...m, hits: hits.slice(-8) };
        await new Promise(res => setTimeout(res, 300));
      }
      return { npc: n?.name, ...(r?.modals?.() ?? {}), hits };
    });
    console.log('[kitn] picker', JSON.stringify(open));
    if (Number(open?.chat) !== IF_ROOT) {
      if (shot) await shot('fail-no-picker');
      fail(`expected pick_a_kitten chat ${IF_ROOT}, got ${JSON.stringify(open)}`);
    }
    await waitTicks(page, 4);
    if (shot) await shot('pass-picker');
    console.log(`RESULT PASS kitn pick_a_kitten chat=${open.chat} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
