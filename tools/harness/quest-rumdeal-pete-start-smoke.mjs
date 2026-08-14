#!/usr/bin/env node
/**
 * Rum Deal start-gate — Pirate Pete (deal_pete 2825) north of Phasmatys.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-rumdeal-pete-start-smoke.mjs
 *
 * Soft: setstat period kbase floors (not Zogre). Do not setvar deal_quest.
 * Product: Talk-to refuse (no write) → keep-money accept %deal_quest 0→1.
 * No knock-out tele. Not Cabin Fever Teach.
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
const { username, password } = resolveAccount(rest, 'rdpet');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3680, z: 3536, level: 0 };
const PETE_ID = 2825;
const TEACH_Z = 3495;

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
  console.log(`[rdpet] ${base} user=${username} (Pete 2825 start-gate)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`rdpet_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    await setStats(page, {
      farming: 40,
      fishing: 50,
      prayer: 47,
      crafting: 42,
      slayer: 42
    });
    await cheatQuiet(page, 'setvar deal_quest 0', 400);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Pete stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const r = globalThis.__lc377?.reader;
      const npcs = r?.npcs?.() ?? [];
      const hit = npcs.find(
        x => (x.id | 0) === id || /pirate pete/i.test(x?.name || '')
      );
      return {
        hit: hit
          ? { id: hit.id, name: hit.name, x: hit.x, z: hit.z, ops: hit.ops }
          : null,
        names: npcs.map(x => `${x?.name}@${x?.x},${x?.z}`).slice(0, 12)
      };
    }, PETE_ID);
    console.log('[rdpet] npc', JSON.stringify(seen));
    if (shot) await shot('01-pete');
    const ok =
      (seen?.hit?.id | 0) === PETE_ID || /pirate pete/i.test(String(seen?.hit?.name || ''));
    if (!ok) fail(`Pirate Pete 2825 not next to stand: ${JSON.stringify(seen)}`);
    if ((seen?.hit?.z | 0) === TEACH_Z) fail('stood on Bill Teach, not Pete');

    const refuse = await talkNpc(page, 'Pirate Pete', ['no'], 80);
    console.log('[rdpet] refuse', JSON.stringify({ ok: refuse.ok, noTrig: refuse.noTrig, picks: refuse.picks }));
    if (shot) await shot('02-refuse');
    if (refuse?.error) fail(`refuse talk abi ${refuse.error}`);
    if (!refuse?.ok) fail(`Pete Talk-to failed ${JSON.stringify(refuse)}`);
    if (refuse?.noTrig) fail(refuse.noTrig);
    const afterRefuse = await getServerVarQuiet(page, 'deal_quest');
    console.log(`[rdpet] after refuse deal_quest=${afterRefuse}`);
    if (Number(afterRefuse) !== 0) fail(`refuse wrote deal_quest=${afterRefuse} (want 0)`);

    const accept = await talkNpc(
      page,
      'Pirate Pete',
      ['yes', 'of course', 'nonsense', 'keep the money'],
      120
    );
    console.log('[rdpet] accept', JSON.stringify({ ok: accept.ok, noTrig: accept.noTrig, picks: accept.picks }));
    if (shot) await shot('03-accept');
    if (!accept?.ok) fail(`Pete accept Talk-to failed ${JSON.stringify(accept)}`);
    if (accept?.noTrig) fail(accept.noTrig);

    const stage = await getServerVarQuiet(page, 'deal_quest');
    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    console.log(`[rdpet] after accept deal_quest=${stage} tile=${JSON.stringify(tile)}`);
    if (Number(stage) !== 1) fail(`accept did not write deal_quest=1 (got ${stage})`);
    if (
      !tile ||
      Math.abs((tile.x | 0) - STAND.x) > 10 ||
      Math.abs((tile.z | 0) - STAND.z) > 10 ||
      (tile.level | 0) !== 0
    ) {
      fail(`accept left Phasmatys dock / knock-out tele? ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS rdpet pete=${PETE_ID} refuse=0 accept deal_quest=${stage} dock=${tile.x},${tile.z} user=${username}`
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
