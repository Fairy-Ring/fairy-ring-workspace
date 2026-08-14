#!/usr/bin/env node
/**
 * One Small Favour jungle-forester mahogany hop.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-osf-forester-smoke.mjs
 *
 * Soft: onesmallfavour=1. Product: refuse stay 1 → accept 1→2 + blunt
 * axe 4415. Legends "What do you do" still works. Never 12346.
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
const { username, password } = resolveAccount(rest, 'osffo');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

// Research CANDIDATE west of NPC 2863,2941 — first N tele 2863,2942 is vine-blocked.
const STAND = { x: 2862, z: 2941, level: 0 };
const FORESTER_IDS = new Set([401, 402]);
const AXE = 4415;

async function talkNpc(page, npcName, prefer = [], iters = 90) {
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
      await sleep(1800);
      if (!r.dialogOpen?.()) {
        const n = findNpc();
        if (n) ok = !!a.npcOp?.(n.index, 1) || ok;
        await sleep(1400);
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
              if (/mahogany/.test(w)) return /mahogany/.test(t);
              if (/take your axe|i'll take|ill take/.test(w)) return /take your axe|sharpen/.test(t);
              if (/okay, thanks|ok thanks/.test(w)) return /okay, thanks|ok thanks/.test(t) && !/take/.test(t);
              if (/what do you do/.test(w)) return /what do you do/.test(t);
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
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 12), bodies: bodies.slice(0, 20) };
    },
    [npcName, prefer, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[osffo] ${base} user=${username} (jungle forester mahogany)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`osffo_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar onesmallfavour 1', 400);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele forester stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(ids => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(
        x => ids.includes(x.id | 0) || /jungle forester/i.test(x?.name || '')
      );
      return {
        hit: hit ? { id: hit.id, name: hit.name } : null,
        names: npcs.map(x => `${x?.name}:${x?.id}`).slice(0, 10)
      };
    }, [...FORESTER_IDS]);
    console.log('[osffo] npc', JSON.stringify(seen));
    if (shot) await shot('01-forester');
    if (!seen?.hit || (!FORESTER_IDS.has(seen.hit.id | 0) && !/jungle forester/i.test(seen.hit.name || ''))) {
      fail(`Jungle Forester not next to stand: ${JSON.stringify(seen)}`);
    }

    const refuse = await talkNpc(page, 'Jungle Forester', ['mahogany', 'okay, thanks'], 80);
    console.log('[osffo] refuse', JSON.stringify({ ok: refuse.ok, picks: refuse.picks, bodies: refuse.bodies }));
    if (shot) await shot('02-refuse');
    if (!refuse?.ok) fail(`refuse Talk-to failed ${JSON.stringify(refuse)}`);
    if (refuse?.noTrig) fail(refuse.noTrig);
    const afterRefuse = await getServerVarQuiet(page, 'onesmallfavour');
    if (Number(afterRefuse) !== 1) fail(`refuse wrote onesmallfavour=${afterRefuse}`);

    const accept = await talkNpc(page, 'Jungle Forester', ['mahogany', 'take your axe'], 90);
    console.log('[osffo] accept', JSON.stringify({ ok: accept.ok, picks: accept.picks, bodies: accept.bodies }));
    if (shot) await shot('03-accept');
    if (!accept?.ok) fail(`accept Talk-to failed ${JSON.stringify(accept)}`);
    if (accept?.noTrig) fail(accept.noTrig);
    const aText = (accept.bodies || []).join(' | ');
    if (!/shanks|axe/i.test(aText)) fail(`accept missing Shanks/axe: ${aText}`);
    await waitTicks(page, 6);
    const stage = await getServerVarQuiet(page, 'onesmallfavour');
    const inv = await page.evaluate(id => {
      const items = globalThis.__lc377?.reader?.inventory?.() ?? [];
      return {
        axe: items.some(x => (x.id | 0) === id || /blunt axe/i.test(x?.name || '')),
        ids: items.map(x => x.id).slice(0, 12)
      };
    }, AXE);
    console.log(`[osffo] after accept onesmallfavour=${stage} inv=${JSON.stringify(inv)}`);
    if (Number(stage) !== 2) fail(`accept did not write onesmallfavour=2 (got ${stage})`);
    if (!inv.axe) fail(`accept did not grant blunt axe ${AXE}: ${JSON.stringify(inv)}`);

    const legends = await talkNpc(page, 'Jungle Forester', ['what do you do'], 70);
    console.log('[osffo] legends', JSON.stringify({ picks: legends.picks, bodies: legends.bodies }));
    if (shot) await shot('04-legends');
    const lText = (legends.bodies || []).join(' | ');
    if (!/civilisation|what do you do|wood|jungle/i.test(lText + (legends.picks || []).join(' '))) {
      fail(`Legends body missing after hop: ${lText}`);
    }
    const afterLegends = await getServerVarQuiet(page, 'onesmallfavour');
    if (Number(afterLegends) !== 2) fail(`Legends re-talk wrote onesmallfavour=${afterLegends}`);

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (
      !tile ||
      Math.abs((tile.x | 0) - STAND.x) > 16 ||
      Math.abs((tile.z | 0) - STAND.z) > 16
    ) {
      fail(`left Shilo south belt ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS osffo refuse=1 accept onesmallfavour=${stage} axe=${AXE} belt=${tile.x},${tile.z} user=${username}`
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
