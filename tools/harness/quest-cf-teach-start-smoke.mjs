#!/usr/bin/env node
/**
 * Cabin Fever inn start-gate — Bill Teach (fever_teach 3155).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-cf-teach-start-smoke.mjs
 *
 * Soft: setvar hunt 4 (Pirate’s Treasure). Skills setstat to CANDIDATE floors.
 * Do not setvar deal_quest (Rum Deal writers missing).
 * Product: Talk-to refuse (no write) → accept %fever_quest 0→1. No gangplank.
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
  setStats,
  setWorldSpeed,
  teleTo,
  waitSceneReady,
  waitTicks
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'cftch');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3678, z: 3495, level: 0 };
const TEACH_ID = 3155;
const VELORINA_Z = 3510;

async function talkNpc(page, npcName, prefer = [], iters = 100) {
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
  console.log(`[cftch] ${base} user=${username} (Teach 3155 start-gate)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`cftch_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    await setStats(page, { agility: 42, crafting: 45, smithing: 50, ranged: 40 });
    for (const c of ['setvar hunt 4', 'setvar fever_quest 0']) {
      await cheatQuiet(page, c, 400);
    }

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Teach stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const r = globalThis.__lc377?.reader;
      const npcs = r?.npcs?.() ?? [];
      const hit = npcs.find(
        x => (x.id | 0) === id || /bill teach/i.test(x?.name || '')
      );
      return {
        hit: hit
          ? { id: hit.id, name: hit.name, x: hit.x, z: hit.z, ops: hit.ops }
          : null,
        names: npcs.map(x => `${x?.name}@${x?.x},${x?.z}`).slice(0, 12)
      };
    }, TEACH_ID);
    console.log('[cftch] npc', JSON.stringify(seen));
    if (shot) await shot('01-teach');
    const ok =
      (seen?.hit?.id | 0) === TEACH_ID || /bill teach/i.test(String(seen?.hit?.name || ''));
    if (!ok) fail(`Bill Teach 3155 not next to stand: ${JSON.stringify(seen)}`);
    if ((seen?.hit?.z | 0) === VELORINA_Z) fail('stood on Velorina, not Teach');

    const refuse = await talkNpc(page, 'Bill Teach', ['no thanks', 'quite dangerous'], 80);
    console.log('[cftch] refuse', JSON.stringify({ ok: refuse.ok, noTrig: refuse.noTrig, picks: refuse.picks }));
    if (shot) await shot('02-refuse');
    if (refuse?.error) fail(`refuse talk abi ${refuse.error}`);
    if (!refuse?.ok) fail(`Teach Talk-to failed ${JSON.stringify(refuse)}`);
    if (refuse?.noTrig) fail(refuse.noTrig);
    const afterRefuse = await getServerVarQuiet(page, 'fever_quest');
    console.log(`[cftch] after refuse fever_quest=${afterRefuse}`);
    if (Number(afterRefuse) !== 0) fail(`refuse wrote fever_quest=${afterRefuse} (want 0)`);

    const accept = await talkNpc(
      page,
      'Bill Teach',
      ['always wanted', 'man of my word', 'woman of my word', 'yes, i am'],
      120
    );
    console.log('[cftch] accept', JSON.stringify({ ok: accept.ok, noTrig: accept.noTrig, picks: accept.picks }));
    if (shot) await shot('03-accept');
    if (!accept?.ok) fail(`Teach accept Talk-to failed ${JSON.stringify(accept)}`);
    if (accept?.noTrig) fail(accept.noTrig);

    const stage = await getServerVarQuiet(page, 'fever_quest');
    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    console.log(`[cftch] after accept fever_quest=${stage} tile=${JSON.stringify(tile)}`);
    if (Number(stage) !== 1) fail(`accept did not write fever_quest=1 (got ${stage})`);
    if (
      !tile ||
      Math.abs((tile.x | 0) - STAND.x) > 10 ||
      Math.abs((tile.z | 0) - STAND.z) > 10 ||
      (tile.level | 0) !== 0
    ) {
      fail(`accept left Phasmatys inn square ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS cftch teach=${TEACH_ID} refuse=0 accept fever_quest=${stage} park=${tile.x},${tile.z} user=${username}`
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
