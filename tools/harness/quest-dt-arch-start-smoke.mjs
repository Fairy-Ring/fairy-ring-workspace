#!/usr/bin/env node
/**
 * Desert Treasure Archaeologist start-gate (fourdiamonds_indiana 1918).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-dt-arch-start-smoke.mjs
 *
 * Soft: six period-kbase quests complete (labeled). Do not setvar deserttreasure.
 * Product: Talk-to refuse (no write) → accept %deserttreasure=1 + etchings 4654.
 * No Terry / diamonds / AM.
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
const { username, password } = resolveAccount(rest, 'dtarc');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3178, z: 3042, level: 0 };
const ARCH_ID = 1918;
const ETCHINGS = 4654;

async function talkNpc(page, npcName, prefer = [], iters = 80) {
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
  console.log(`[dtarc] ${base} user=${username} (Archaeologist 1918 start-gate)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`dtarc_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    for (const c of [
      'setvar itexamlevel 9',
      'setvar desertrescue 30',
      'setvar ikov 80',
      'setvar priestperil 60',
      'setvar waterfall_quest 10',
      'setvar troll_quest 50',
      'setvar deserttreasuremain 0'
    ]) {
      await cheatQuiet(page, c, 400);
    }

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Archaeologist stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const r = globalThis.__lc377?.reader;
      const npcs = r?.npcs?.() ?? [];
      const hit = npcs.find(
        x => (x.id | 0) === id || /archaeologist/i.test(x?.name || '')
      );
      return {
        hit: hit
          ? { id: hit.id, name: hit.name, x: hit.x, z: hit.z, ops: hit.ops }
          : null,
        names: npcs.map(x => `${x?.name}@${x?.x},${x?.z}`).slice(0, 12)
      };
    }, ARCH_ID);
    console.log('[dtarc] npc', JSON.stringify(seen));
    if (shot) await shot('01-arch');
    const ok =
      (seen?.hit?.id | 0) === ARCH_ID || /archaeologist/i.test(String(seen?.hit?.name || ''));
    if (!ok) fail(`Archaeologist 1918 not next to stand: ${JSON.stringify(seen)}`);
    if (/asgarnia/i.test(String(seen?.hit?.name || ''))) {
      fail('display was Asgarnia Smith — 377 unpack is Archaeologist');
    }

    const refuse = await talkNpc(page, 'Archaeologist', ['nothing really'], 60);
    console.log('[dtarc] refuse', JSON.stringify({ ok: refuse.ok, noTrig: refuse.noTrig, picks: refuse.picks }));
    if (shot) await shot('02-refuse');
    if (refuse?.error) fail(`refuse talk abi ${refuse.error}`);
    if (!refuse?.ok) fail(`Archaeologist Talk-to failed ${JSON.stringify(refuse)}`);
    if (refuse?.noTrig) fail(refuse.noTrig);
    const afterRefuse = await getServerVarQuiet(page, 'deserttreasure');
    console.log(`[dtarc] after refuse deserttreasure=${afterRefuse}`);
    if (Number(afterRefuse) !== 0) fail(`refuse wrote deserttreasure=${afterRefuse} (want 0)`);

    const accept = await talkNpc(page, 'Archaeologist', ['do you have any quests', 'yes'], 80);
    console.log('[dtarc] accept', JSON.stringify({ ok: accept.ok, noTrig: accept.noTrig, picks: accept.picks }));
    if (shot) await shot('03-accept');
    if (!accept?.ok) fail(`Archaeologist accept Talk-to failed ${JSON.stringify(accept)}`);
    if (accept?.noTrig) fail(accept.noTrig);

    const stage = await getServerVarQuiet(page, 'deserttreasure');
    const inv = await page.evaluate(id => {
      const items = globalThis.__lc377?.reader?.inventory?.() ?? [];
      return {
        has: items.some(x => (x.id | 0) === id || /etching/i.test(x?.name || '')),
        ids: items.map(x => x.id).slice(0, 12)
      };
    }, ETCHINGS);
    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    console.log(`[dtarc] after accept deserttreasure=${stage} etchings=${JSON.stringify(inv)} tile=${JSON.stringify(tile)}`);
    if (Number(stage) !== 1) fail(`accept did not write deserttreasure=1 (got ${stage})`);
    if (!inv.has) fail(`accept did not grant etchings ${ETCHINGS}: ${JSON.stringify(inv)}`);
    if (Number(stage) >= 15) fail('claimed complete (deserttreasure>=15) — start slice only');
    if (
      !tile ||
      Math.abs((tile.x | 0) - STAND.x) > 10 ||
      Math.abs((tile.z | 0) - STAND.z) > 10 ||
      (tile.level | 0) !== 0
    ) {
      fail(`accept left Bedabin camp ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS dtarc arch=${ARCH_ID} refuse=0 accept deserttreasure=${stage} etchings=${ETCHINGS} camp=${tile.x},${tile.z} user=${username}`
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
