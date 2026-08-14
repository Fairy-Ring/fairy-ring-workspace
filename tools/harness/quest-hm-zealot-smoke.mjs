#!/usr/bin/env node
/**
 * Haunted Mine Zealot start (saradominist_zealot 1528).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-hm-zealot-smoke.mjs
 *
 * Product: Zamorak refuse stay 0 · Saradomin + What-quest hauntedmine 0→1.
 * Re-talk stay 1. No key grant. Pickpocket not this smoke.
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
const { username, password } = resolveAccount(rest, 'hmzea');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3443, z: 3258, level: 0 };
const ZEALOT_ID = 1528;

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
              if (/zamorak/.test(w)) return /zamorak/i.test(t);
              if (/didn.t want|didnt want/.test(w)) return /didn.t want to talk/i.test(t);
              if (/saradomin/.test(w)) return /follow the path of saradomin/i.test(t);
              if (/seeking/.test(w)) return /seeking challenges/i.test(t);
              if (/what quest/.test(w)) return /what quest is that then/i.test(t);
              if (/must be going/.test(w)) return /must be going/i.test(t);
              if (/explain/.test(w)) return /explain the history/i.test(t);
              if (/borrow/.test(w)) return /borrow your key/i.test(t);
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
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 16), bodies: bodies.slice(0, 36) };
    },
    [npcName, prefer, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[hmzea] ${base} user=${username} (Zealot 1528)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`hmzea_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setstat hitpoints 90', 300);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Zealot stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(
        x => (x.id | 0) === id || /^zealot$/i.test(x?.name || '')
      );
      return {
        hit: hit ? { id: hit.id, name: hit.name } : null,
        names: npcs.map(x => `${x?.name}:${x?.id}`).slice(0, 10)
      };
    }, ZEALOT_ID);
    console.log('[hmzea] npc', JSON.stringify(seen));
    if (shot) await shot('01-zealot');
    if ((seen?.hit?.id | 0) !== ZEALOT_ID && !/^zealot$/i.test(String(seen?.hit?.name || ''))) {
      fail(`Zealot 1528 not next to stand: ${JSON.stringify(seen)}`);
    }

    const refuse = await talkNpc(page, 'Zealot', ['zamorak', "didn't want"], 70);
    console.log('[hmzea] refuse', JSON.stringify({ ok: refuse.ok, noTrig: refuse.noTrig, picks: refuse.picks }));
    if (shot) await shot('02-refuse');
    if (!refuse?.ok) fail(`Zamorak Talk-to failed ${JSON.stringify(refuse)}`);
    if (refuse?.noTrig) fail(refuse.noTrig);
    const after0 = await getServerVarQuiet(page, 'hauntedmine');
    if (Number(after0) !== 0) fail(`Zamorak wrote hauntedmine=${after0}`);

    const accept = await talkNpc(
      page,
      'Zealot',
      ['saradomin', 'seeking', 'what quest', 'must be going'],
      160
    );
    console.log('[hmzea] accept', JSON.stringify({ ok: accept.ok, picks: accept.picks, bodies: accept.bodies }));
    if (shot) await shot('03-accept');
    if (!accept?.ok) fail(`accept Talk-to failed ${JSON.stringify(accept)}`);
    if (accept?.noTrig) fail(accept.noTrig);
    const aText = (accept.bodies || []).join(' | ');
    if (!/mort ridge|treus dayth|salve/i.test(aText)) fail(`history missing: ${aText}`);
    if (/here is (the|my) key|inv_add/i.test(aText)) fail(`granted key: ${aText}`);
    await waitTicks(page, 4);
    const stage = await getServerVarQuiet(page, 'hauntedmine');
    if (Number(stage) !== 1) fail(`accept did not write hauntedmine=1 (got ${stage})`);

    const nag = await talkNpc(page, 'Zealot', ['explain', 'must be going'], 100);
    console.log('[hmzea] nag', JSON.stringify({ picks: nag.picks }));
    if (shot) await shot('04-nag');
    const afterNag = await getServerVarQuiet(page, 'hauntedmine');
    if (Number(afterNag) !== 1) fail(`nag wrote hauntedmine=${afterNag}`);

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (
      !tile ||
      Math.abs((tile.x | 0) - STAND.x) > 16 ||
      Math.abs((tile.z | 0) - STAND.z) > 16
    ) {
      fail(`left Zealot ridge ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS hmzea zealot=${ZEALOT_ID} refuse=0 accept hauntedmine=${stage} ridge=${tile.x},${tile.z} user=${username}`
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
