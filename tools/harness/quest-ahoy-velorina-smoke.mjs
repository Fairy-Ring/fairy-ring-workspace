#!/usr/bin/env node
/**
 * Ghosts Ahoy Velorina start (ahoy_velorina 1683).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-ahoy-velorina-smoke.mjs
 *
 * Product: no-ghostspeak Woo · refuse stay 0 · Yes ahoy_questvar 0→1.
 * No Necrovarus. Soft give+equip Ghostspeak amulet.
 */
import {
  assertEnginePackHealth,
  boot,
  cheatQuiet,
  createShotRunDir,
  fail,
  getServerVarQuiet,
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
const { username, password } = resolveAccount(rest, 'ahvel');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3678, z: 3509, level: 0 };
const VEL_ID = 1683;

async function talkNpc(page, npcName, prefer = [], iters = 140) {
  return page.evaluate(
    async ([name, pref, maxI]) => {
      const h = globalThis.__lc377;
      const a = h?.actions;
      const r = h?.reader;
      if (!a || !r) return { error: 'no abi' };
      const sleep = ms => new Promise(res => setTimeout(res, ms));
      const findNpc = () =>
        (r.npcs?.() ?? []).find(x =>
          String(x?.name ?? '')
            .toLowerCase()
            .includes(String(name).toLowerCase())
        );
      const n0 = findNpc();
      let ok = n0 ? !!a.npcOp?.(n0.index, 1) : !!a.talkNpc?.(name);
      await sleep(1600);
      if (!r.dialogOpen?.()) {
        const n = findNpc();
        if (n) ok = !!a.npcOp?.(n.index, 1) || ok;
        await sleep(1200);
      }
      const picks = [];
      const bodies = [];
      let lastPickAt = -99;
      let lastContinuedBody = '';
      for (let i = 0; i < maxI; i++) {
        const body = r.chatBodyText?.() || '';
        if (body && (bodies.length === 0 || bodies[bodies.length - 1] !== body)) {
          bodies.push(body.slice(0, 240));
        }
        const raw = r.chatOptions?.() ?? [];
        if (raw.length) {
          let pick = 0;
          for (const p of pref) {
            const w = String(p).toLowerCase();
            const j = raw.findIndex(o => {
              const t = String(o?.text ?? o ?? '').toLowerCase();
              if (/matter/.test(w)) return /what is the matter/i.test(t);
              if (/scared/.test(w)) return /scared of ghosts/i.test(t);
              if (/tell me/.test(w)) return /could you tell me/i.test(t);
              if (/problem/.test(w)) return /isn.t really my problem/i.test(t);
              if (/of course/.test(w)) return /of course i will/i.test(t);
              if (/sad story/.test(w)) return /very sad story/i.test(t);
              return t.includes(w);
            });
            if (j >= 0) {
              pick = j;
              break;
            }
          }
          const comId = raw[pick]?.comId | 0;
          const label = raw[pick]?.text ?? '';
          const okPick = comId ? !!a.ifButton?.(comId) : false;
          picks.push(okPick ? `ok:${label}` : `fail:${label}`);
          lastPickAt = i;
          lastContinuedBody = '';
          await sleep(800);
          continue;
        }
        if (body && body === lastContinuedBody) {
          await sleep(300);
          const openWait = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
          if (!openWait && i > lastPickAt + 16) break;
          continue;
        }
        a.continueDialog?.();
        lastContinuedBody = body;
        await sleep(450);
        const open = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
        if (!open && i > lastPickAt + 16 && (picks.length || bodies.length)) break;
        if (!open && i > 120) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 12), bodies: bodies.slice(0, 28) };
    },
    [npcName, prefer, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[ahvel] ${base} user=${username} (Velorina 1683)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`ahvel_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setstat hitpoints 90', 300);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Velorina stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /velorina/i.test(x?.name || ''));
      return {
        hit: hit ? { id: hit.id, name: hit.name } : null,
        names: npcs.map(x => `${x?.name}:${x?.id}`).slice(0, 10)
      };
    }, VEL_ID);
    console.log('[ahvel] npc', JSON.stringify(seen));
    if (shot) await shot('01-velorina');
    if ((seen?.hit?.id | 0) !== VEL_ID && !/velorina/i.test(String(seen?.hit?.name || ''))) {
      fail(`Velorina 1683 not next to stand: ${JSON.stringify(seen)}`);
    }

    const woo = await talkNpc(page, 'Velorina', [], 40);
    console.log('[ahvel] woo', JSON.stringify(woo));
    if (shot) await shot('02-woo');
    if (!woo?.ok) fail(`Woo Talk-to failed ${JSON.stringify(woo)}`);
    const wooText = (woo.bodies || []).join(' | ');
    if (!/woooo/i.test(wooText)) fail(`ghostspeak-fail missing: ${wooText}`);
    const afterWoo = await getServerVarQuiet(page, 'ahoy_questvar');
    if (Number(afterWoo) !== 0) fail(`Woo wrote ahoy_questvar=${afterWoo}`);

    await giveItems(page, [['amulet_of_ghostspeak', 1]]);
    const worn = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      return {
        ok: !!(
          a?.equip?.('Ghostspeak amulet') ||
          a?.equip?.('ghostspeak') ||
          a?.heldOp?.('Ghostspeak amulet', 2) ||
          a?.heldOp?.('ghostspeak', 2)
        )
      };
    });
    console.log('[ahvel] wear', JSON.stringify(worn));
    await waitTicks(page, 4);

    const refuse = await talkNpc(page, 'Velorina', ['matter', 'sad story', 'problem'], 80);
    console.log('[ahvel] refuse', JSON.stringify({ ok: refuse.ok, picks: refuse.picks }));
    if (shot) await shot('03-refuse');
    if (!refuse?.ok) fail(`refuse Talk-to failed ${JSON.stringify(refuse)}`);
    if (refuse?.noTrig) fail(refuse.noTrig);
    const after0 = await getServerVarQuiet(page, 'ahoy_questvar');
    if (Number(after0) !== 0) fail(`refuse wrote ahoy_questvar=${after0}`);

    const accept = await talkNpc(page, 'Velorina', ['matter', 'sad story', 'of course'], 80);
    console.log('[ahvel] accept', JSON.stringify({ ok: accept.ok, picks: accept.picks }));
    if (shot) await shot('04-accept');
    if (!accept?.ok) fail(`accept Talk-to failed ${JSON.stringify(accept)}`);
    if (accept?.noTrig) fail(accept.noTrig);
    const aText = (accept.bodies || []).join(' | ');
    if (!/necrovarus|another way/i.test(aText)) fail(`accept briefing missing: ${aText}`);
    if (/old crone|nettle tea|ectophial/i.test(aText)) fail(`shipped later unit: ${aText}`);
    await waitTicks(page, 4);
    const stage = await getServerVarQuiet(page, 'ahoy_questvar');
    if (Number(stage) !== 1) fail(`accept did not write ahoy_questvar=1 (got ${stage})`);

    const nag = await talkNpc(page, 'Velorina', [], 40);
    console.log('[ahvel] nag', JSON.stringify({ bodies: nag.bodies }));
    if (shot) await shot('05-nag');
    const nagText = (nag.bodies || []).join(' | ');
    if (!/not yet spoken to necrovarus/i.test(nagText)) fail(`nag missing: ${nagText}`);
    const afterNag = await getServerVarQuiet(page, 'ahoy_questvar');
    if (Number(afterNag) !== 1) fail(`nag wrote ahoy_questvar=${afterNag}`);

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (!tile || Math.abs((tile.x | 0) - STAND.x) > 16 || Math.abs((tile.z | 0) - STAND.z) > 16) {
      fail(`left Phasmatys ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS ahvel velorina=${VEL_ID} woo=0 refuse=0 accept ahoy_questvar=${stage} port=${tile.x},${tile.z} user=${username}`
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
