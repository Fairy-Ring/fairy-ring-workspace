#!/usr/bin/env node
/**
 * Ghosts Ahoy Velorina after Necro refuse (another way).
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-ahoy-vel2 \
 *     node tools/harness/quest-ahoy-velorina-after-necro-smoke.mjs
 *
 * Product: soft ahoy_questvar 2 + ghostspeak · another-way 2→3 · shack
 * vision · no dest / crone / ectophial.
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

async function talkNpc(page, npcName, prefer = [], iters = 80) {
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
              if (/where/.test(w)) return /where this woman/i.test(t);
              if (/dead/.test(w)) return /dead already/i.test(t);
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
        if (!open && i > 80) break;
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
  console.log(`[ahv2] ${base} user=${username} (Velorina after Necro)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`ahv2_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setstat hitpoints 90', 300);
    await cheatQuiet(page, 'setvar ahoy_questvar 2', 400);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Velorina stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /velorina/i.test(x?.name || ''));
      return {
        hit: hit ? { id: hit.id, name: hit.name } : null,
        names: npcs.map(x => `${x?.name}:${x?.id}`).slice(0, 8)
      };
    }, VEL_ID);
    console.log('[ahv2] npc', JSON.stringify(seen));
    if (shot) await shot('01-velorina');
    if ((seen?.hit?.id | 0) !== VEL_ID && !/velorina/i.test(String(seen?.hit?.name || ''))) {
      fail(`Velorina 1683 not next to stand: ${JSON.stringify(seen)}`);
    }

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
    console.log('[ahv2] wear', JSON.stringify(worn));
    await waitTicks(page, 4);

    const first = await talkNpc(page, 'Velorina', ['where'], 80);
    console.log('[ahv2] first', JSON.stringify({ ok: first.ok, picks: first.picks, bodies: first.bodies }));
    if (shot) await shot('02-after');
    if (!first?.ok) fail(`after-Necro Talk-to failed ${JSON.stringify(first)}`);
    if (first?.noTrig) fail(first.noTrig);
    const fText = (first.bodies || []).join(' | ');
    if (!/feared as much|another way|wooden shack/i.test(fText)) fail(`another-way missing: ${fText}`);
    if (/nettle tea|ectophial|old crone/i.test(fText)) fail(`shipped later unit: ${fText}`);
    await waitTicks(page, 4);
    const after = await getServerVarQuiet(page, 'ahoy_questvar');
    if (Number(after) !== 3) fail(`did not write ahoy_questvar=3 (got ${after})`);

    const nag = await talkNpc(page, 'Velorina', ['dead'], 50);
    console.log('[ahv2] nag', JSON.stringify({ picks: nag.picks, bodies: nag.bodies }));
    if (shot) await shot('03-nag');
    const nText = (nag.bodies || []).join(' | ');
    if (!/friend of mine|next world/i.test(nText)) fail(`dead-already missing: ${nText}`);
    const afterNag = await getServerVarQuiet(page, 'ahoy_questvar');
    if (Number(afterNag) !== 3) fail(`nag wrote ahoy_questvar=${afterNag}`);

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (!tile || Math.abs((tile.x | 0) - STAND.x) > 16 || Math.abs((tile.z | 0) - STAND.z) > 16) {
      fail(`left Phasmatys ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS ahv2 velorina=${VEL_ID} ahoy_questvar=${after} port=${tile.x},${tile.z} user=${username}`
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
