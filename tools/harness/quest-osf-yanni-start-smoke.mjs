#!/usr/bin/env node
/**
 * One Small Favour Yanni start-gate (shiloantiques 515).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-osf-yanni-start-smoke.mjs
 *
 * Product: Talk-to refuse (no write) → antiques quote still works →
 * accept %onesmallfavour 0→1. No forester. No leftover 12346.
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
const { username, password } = resolveAccount(rest, 'osfya');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 2834, z: 2985, level: 0 };
const YANNI_ID = 515;

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
  console.log(`[osfya] ${base} user=${username} (Yanni 515 OSF start)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`osfya_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar onesmallfavour 0', 400);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Yanni stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const r = globalThis.__lc377?.reader;
      const npcs = r?.npcs?.() ?? [];
      const hit = npcs.find(
        x => (x.id | 0) === id || /yanni/i.test(x?.name || '')
      );
      return {
        hit: hit
          ? { id: hit.id, name: hit.name, x: hit.x, z: hit.z, ops: hit.ops }
          : null,
        names: npcs.map(x => `${x?.name}@${x?.x},${x?.z}`).slice(0, 12)
      };
    }, YANNI_ID);
    console.log('[osfya] npc', JSON.stringify(seen));
    if (shot) await shot('01-yanni');
    const ok =
      (seen?.hit?.id | 0) === YANNI_ID || /yanni/i.test(String(seen?.hit?.name || ''));
    if (!ok) fail(`Yanni 515 not next to stand: ${JSON.stringify(seen)}`);

    const refuse = await talkNpc(page, 'Yanni', ['interesting to do', 'bigger fish'], 80);
    console.log('[osfya] refuse', JSON.stringify({ ok: refuse.ok, noTrig: refuse.noTrig, picks: refuse.picks }));
    if (shot) await shot('02-refuse');
    if (refuse?.error) fail(`refuse talk abi ${refuse.error}`);
    if (!refuse?.ok) fail(`Yanni Talk-to failed ${JSON.stringify(refuse)}`);
    if (refuse?.noTrig) fail(refuse.noTrig);
    const afterRefuse = await getServerVarQuiet(page, 'onesmallfavour');
    console.log(`[osfya] after refuse onesmallfavour=${afterRefuse}`);
    if (Number(afterRefuse) !== 0) fail(`refuse wrote onesmallfavour=${afterRefuse} (want 0)`);

    const shop = await talkNpc(page, 'Yanni', ['antiques business', 'yes please'], 80);
    console.log('[osfya] shop', JSON.stringify({ ok: shop.ok, noTrig: shop.noTrig, picks: shop.picks }));
    if (shot) await shot('03-shop');
    if (!shop?.ok) fail(`Yanni antiques quote failed ${JSON.stringify(shop)}`);
    if (shop?.noTrig) fail(shop.noTrig);
    const afterShop = await getServerVarQuiet(page, 'onesmallfavour');
    if (Number(afterShop) !== 0) fail(`shop path wrote onesmallfavour=${afterShop}`);

    const accept = await talkNpc(
      page,
      'Yanni',
      ['interesting to do', 'see you in a tick', "i'll get going"],
      100
    );
    console.log('[osfya] accept', JSON.stringify({ ok: accept.ok, noTrig: accept.noTrig, picks: accept.picks }));
    if (shot) await shot('04-accept');
    if (!accept?.ok) fail(`Yanni accept Talk-to failed ${JSON.stringify(accept)}`);
    if (accept?.noTrig) fail(accept.noTrig);

    const stage = await getServerVarQuiet(page, 'onesmallfavour');
    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    console.log(`[osfya] after accept onesmallfavour=${stage} tile=${JSON.stringify(tile)}`);
    if (Number(stage) !== 1) fail(`accept did not write onesmallfavour=1 (got ${stage})`);
    if (
      !tile ||
      Math.abs((tile.x | 0) - STAND.x) > 10 ||
      Math.abs((tile.z | 0) - STAND.z) > 10 ||
      (tile.level | 0) !== 0
    ) {
      fail(`accept left Shilo antiques square ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS osfya yanni=${YANNI_ID} refuse=0 shop=0 accept onesmallfavour=${stage} stand=${tile.x},${tile.z} user=${username}`
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
