#!/usr/bin/env node
/**
 * Fairy Tale I Martin start-gate (martin_the_master_farmer 3299).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-ft1-martin-start-smoke.mjs
 *
 * Product: Talk-to refuse (no write) → accept %fairy_farmers_quest=1 (never 10).
 * Pickpocket op3 must stay. No symptoms IF. No Tanglefoot.
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
const { username, password } = resolveAccount(rest, 'ft1ma');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3077, z: 3258, level: 0 };
const MARTIN_ID = 3299;
const SYMPTOMS_IF = 18164;

async function talkNpc(page, npcName, prefer = [], iters = 90) {
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
  console.log(`[ft1ma] ${base} user=${username} (Martin 3299 start-gate)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`ft1ma_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar fairytale_multi 0', 400);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Martin stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const r = globalThis.__lc377?.reader;
      const npcs = r?.npcs?.() ?? [];
      const hit = npcs.find(
        x => (x.id | 0) === id || /martin the master/i.test(x?.name || '')
      );
      return {
        hit: hit
          ? { id: hit.id, name: hit.name, x: hit.x, z: hit.z, ops: hit.ops }
          : null,
        names: npcs.map(x => `${x?.name}@${x?.x},${x?.z}`).slice(0, 12)
      };
    }, MARTIN_ID);
    console.log('[ft1ma] npc', JSON.stringify(seen));
    if (shot) await shot('01-martin');
    const ok =
      (seen?.hit?.id | 0) === MARTIN_ID || /martin the master/i.test(String(seen?.hit?.name || ''));
    if (!ok) fail(`Martin 3299 not next to stand: ${JSON.stringify(seen)}`);
    const ops = seen?.hit?.ops ?? [];
    if (!ops.some(o => /pickpocket/i.test(String(o || '')))) {
      fail(`Martin lost Pickpocket op: ${JSON.stringify(ops)}`);
    }

    const refuse = await talkNpc(page, 'Martin the Master', ['hope you can sort', 'by yourself'], 70);
    console.log('[ft1ma] refuse', JSON.stringify({ ok: refuse.ok, noTrig: refuse.noTrig, picks: refuse.picks }));
    if (shot) await shot('02-refuse');
    if (refuse?.error) fail(`refuse talk abi ${refuse.error}`);
    if (!refuse?.ok) fail(`Martin Talk-to failed ${JSON.stringify(refuse)}`);
    if (refuse?.noTrig) fail(refuse.noTrig);
    const afterRefuse = await getServerVarQuiet(page, 'fairy_farmers_quest');
    console.log(`[ft1ma] after refuse fairy_farmers_quest=${afterRefuse}`);
    if (Number(afterRefuse) !== 0) fail(`refuse wrote fairy_farmers_quest=${afterRefuse} (want 0)`);

    const accept = await talkNpc(page, 'Martin the Master', ['anything i can help', 'yes'], 90);
    console.log('[ft1ma] accept', JSON.stringify({ ok: accept.ok, noTrig: accept.noTrig, picks: accept.picks }));
    if (shot) await shot('03-accept');
    if (!accept?.ok) fail(`Martin accept Talk-to failed ${JSON.stringify(accept)}`);
    if (accept?.noTrig) fail(accept.noTrig);

    const stage = await getServerVarQuiet(page, 'fairy_farmers_quest');
    const overlay = await page.evaluate(() => {
      const m = globalThis.__lc377?.reader?.modals?.() ?? {};
      return m.overlay ?? m.main ?? -1;
    });
    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    console.log(`[ft1ma] after accept fairy_farmers_quest=${stage} overlay=${overlay} tile=${JSON.stringify(tile)}`);
    if (Number(stage) !== 1) fail(`accept did not write fairy_farmers_quest=1 (got ${stage})`);
    if (Number(stage) >= 10) fail('wrote decade room (10+) — Zanaris wall/guard must stay closed');
    if (Number(overlay) === SYMPTOMS_IF) fail('opened leftover fairy_queen_symptoms from Martin Talk-to');
    if (
      !tile ||
      Math.abs((tile.x | 0) - STAND.x) > 10 ||
      Math.abs((tile.z | 0) - STAND.z) > 10 ||
      (tile.level | 0) !== 0
    ) {
      fail(`accept left Draynor market ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS ft1ma martin=${MARTIN_ID} refuse=0 accept fairy_farmers_quest=${stage} stand=${tile.x},${tile.z} user=${username}`
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
