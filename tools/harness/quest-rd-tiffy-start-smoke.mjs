#!/usr/bin/env node
/**
 * Recruitment Drive Tiffy start-gate (Wave 3 first product).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-rd-tiffy-start-smoke.mjs
 *
 * Soft deps: setvar spy 4 + druidquest 4 (labeled).
 * Product: Talk-to rd_teleporter_guy 2290 → refuse (no stage) → accept
 * writes %rd_spoke_to_tiffy + %rd_main 0→1. No instance tele. No puzzles.
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
const { username, password } = resolveAccount(rest, 'rdtif');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2996, z: 3373, level: 0 };
const TIFFY = { x: 2997, z: 3373 };
const TIFFY_ID = 2290;
const HESKEL_X = 3001;

async function talkNpc(page, npcName, prefer = [], iters = 72) {
  return page.evaluate(
    async ([name, pref, maxI]) => {
      const h = globalThis.__lc377;
      const a = h?.actions;
      const r = h?.reader;
      if (!a || !r) return { error: 'no abi' };

      const getOpts = () => {
        try {
          return (r.chatOptions?.() ?? [])
            .map(o => (typeof o === 'string' ? o : o?.text))
            .filter(Boolean);
        } catch {
          return [];
        }
      };

      let ok = !!a.talkNpc?.(name);
      if (!ok) {
        const n = (r.npcs?.() ?? []).find(x =>
          String(x?.name ?? '')
            .toLowerCase()
            .includes(String(name).toLowerCase())
        );
        if (n) ok = !!a.npcOp?.(n.index, 1);
      }
      await new Promise(res => setTimeout(res, 1200));

      const picks = [];
      for (let i = 0; i < maxI; i++) {
        const opts = getOpts();
        if (opts.length) {
          const low = opts.map(o => String(o).toLowerCase());
          let pick = 0;
          for (const p of pref) {
            const j = low.findIndex(o => o.includes(String(p).toLowerCase()));
            if (j >= 0) {
              pick = j;
              break;
            }
          }
          picks.push(opts[pick]);
          a.chooseOption?.([opts[pick]]);
        } else {
          a.continueDialog?.();
          a.dismissModalMessage?.();
        }
        await new Promise(res => setTimeout(res, 380));
        if ((r.modals?.()?.chat ?? -1) === -1 && i > 8) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(36).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 16), chat: chat.slice(0, 16) };
    },
    [npcName, prefer, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[rdtif] ${base} user=${username} (Tiffy 2290 start-gate)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`rdtif_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    for (const c of [
      'setvar spy 4',
      'setvar druidquest 4',
      'setvar recruitmentdrive 0',
      'setvar rd_rooms_tempvar 0',
      'setvar rd_rooms_tempvar2 0'
    ]) {
      await cheatQuiet(page, c, 400);
    }

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Tiffy stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(([wx, wz, id]) => {
      const r = globalThis.__lc377?.reader;
      const npcs = r?.npcs?.() ?? [];
      const hit = npcs.find(
        x => (x.x | 0) === wx && (x.z | 0) === wz || (x.id | 0) === id || /tiffy/i.test(x?.name || '')
      );
      return {
        hit: hit
          ? { id: hit.id, name: hit.name, x: hit.x, z: hit.z, ops: hit.ops }
          : null,
        names: npcs.map(x => `${x?.name}@${x?.x},${x?.z}`).slice(0, 12)
      };
    }, [TIFFY.x, TIFFY.z, TIFFY_ID]);
    console.log('[rdtif] npc', JSON.stringify(seen));
    if (shot) await shot('01-tiffy');
    const tiffyOk =
      (seen?.hit?.id | 0) === TIFFY_ID || /tiffy/i.test(String(seen?.hit?.name || ''));
    if (!tiffyOk) fail(`Sir Tiffy 2290 not next to stand: ${JSON.stringify(seen)}`);
    if ((seen?.hit?.x | 0) === HESKEL_X) fail('stood on Heskel, not Tiffy');

    const refuse = await talkNpc(page, 'Sir Tiffy', ['changed my mind', "no, i've"], 80);
    console.log('[rdtif] refuse', JSON.stringify({ ok: refuse.ok, noTrig: refuse.noTrig, picks: refuse.picks }));
    if (shot) await shot('02-refuse');
    if (refuse?.error) fail(`refuse talk abi ${refuse.error}`);
    if (!refuse?.ok) fail(`Tiffy Talk-to failed ${JSON.stringify(refuse)}`);
    if (refuse?.noTrig) fail(refuse.noTrig);
    const afterRefuseMain = await getServerVarQuiet(page, 'rd_main');
    const afterRefuseSpoke = await getServerVarQuiet(page, 'rd_spoke_to_tiffy');
    console.log(`[rdtif] after refuse rd_main=${afterRefuseMain} spoke=${afterRefuseSpoke}`);
    if (Number(afterRefuseMain) !== 0) {
      fail(`refuse wrote rd_main=${afterRefuseMain} (want 0)`);
    }
    if (Number(afterRefuseSpoke) !== 0) {
      fail(`refuse wrote rd_spoke_to_tiffy=${afterRefuseSpoke} (want 0)`);
    }

    const accept = await talkNpc(page, 'Sir Tiffy', ["yes, let's go", "let's go"], 80);
    console.log('[rdtif] accept', JSON.stringify({ ok: accept.ok, noTrig: accept.noTrig, picks: accept.picks }));
    if (shot) await shot('03-accept');
    if (!accept?.ok) fail(`Tiffy accept Talk-to failed ${JSON.stringify(accept)}`);
    if (accept?.noTrig) fail(accept.noTrig);

    const rdMain = await getServerVarQuiet(page, 'rd_main');
    const spoke = await getServerVarQuiet(page, 'rd_spoke_to_tiffy');
    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    console.log(`[rdtif] after accept rd_main=${rdMain} spoke=${spoke} tile=${JSON.stringify(tile)}`);
    if (Number(rdMain) !== 1) fail(`accept did not write rd_main=1 (got ${rdMain})`);
    if (Number(spoke) !== 1) fail(`accept did not write rd_spoke_to_tiffy=1 (got ${spoke})`);
    if (!tile || Math.abs((tile.x | 0) - STAND.x) > 8 || Math.abs((tile.z | 0) - STAND.z) > 8 || (tile.level | 0) !== 0) {
      fail(`accept teleported out of Falador Park ${JSON.stringify(tile)}`);
    }
    if (Number(rdMain) >= 2) fail('claimed complete (rd_main>=2) — start slice only');

    console.log(
      `RESULT PASS rdtif tiffy=${TIFFY_ID} refuse=0 accept rd_main=${rdMain} spoke=${spoke} park=${tile.x},${tile.z} user=${username}`
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
