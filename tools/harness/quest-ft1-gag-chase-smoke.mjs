#!/usr/bin/env node
/**
 * A Fairy Tale Part I — five GAG gardener chase after Martin=1.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-ft1-gag-chase-smoke.mjs
 *
 * Soft: setvar fairy_farmers_quest 1 (labeled). Product: five distinct
 * Talk-tos 1→6 + Martin report #5 swamp hint. Never stage 10.
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
const { username, password } = resolveAccount(rest, 'ft1gag');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const MARTIN = { stand: { x: 3077, z: 3258, level: 0 }, name: 'Martin the Master', id: 3299 };
const FIVE = [
  { name: 'Elstan', stand: { x: 3053, z: 3305, level: 0 }, want: 2 },
  { name: 'Taria', stand: { x: 2941, z: 3223, level: 0 }, want: 3 },
  { name: 'Fayeth', stand: { x: 3194, z: 3233, level: 0 }, want: 4 },
  { name: 'Dreven', stand: { x: 3181, z: 3358, level: 0 }, want: 5 },
  { name: 'Heskel', stand: { x: 3000, z: 3373, level: 0 }, want: 6 }
];

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

      const findNpc = () =>
        (r.npcs?.() ?? []).find(x =>
          String(x?.name ?? '')
            .toLowerCase()
            .includes(String(name).toLowerCase())
        );
      let ok = !!a.talkNpc?.(name);
      if (!ok) {
        const n = findNpc();
        if (n) ok = !!a.npcOp?.(n.index, 1);
      }
      await new Promise(res => setTimeout(res, 1600));
      if (!r.dialogOpen?.()) {
        const n = findNpc();
        if (n) ok = !!a.npcOp?.(n.index, 1) || ok;
        await new Promise(res => setTimeout(res, 1200));
      }

      const picks = [];
      const bodies = [];
      for (let i = 0; i < maxI; i++) {
        const body = r.chatBodyText?.() || '';
        if (body && (bodies.length === 0 || bodies[bodies.length - 1] !== body)) {
          bodies.push(body.slice(0, 240));
        }
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
        await new Promise(res => setTimeout(res, 420));
        const open = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
        if (!open && i > 24 && (picks.length || bodies.length)) break;
        if (!open && i > 40) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(24).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return {
        ok,
        noTrig: noTrig ?? null,
        picks: picks.slice(0, 12),
        bodies: bodies.slice(0, 16)
      };
    },
    [npcName, prefer, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[ft1gag] ${base} user=${username} (five GAG chase)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`ft1gag_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar fairy_farmers_quest 1', 400);

    const gagPref = ['group of advanced', 'are you a member'];
    for (const g of FIVE) {
      if (!(await teleTo(page, g.stand, 2, 25_000))) fail(`tele ${g.name} failed`);
      await waitSceneReady(page, 15_000);
      await waitTicks(page, 5);
      const seen = await page.evaluate(want => {
        const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
        const hit = npcs.find(x =>
          String(x?.name ?? '')
            .toLowerCase()
            .includes(String(want).toLowerCase())
        );
        return hit ? { id: hit.id, name: hit.name } : { names: npcs.map(x => x?.name).slice(0, 8) };
      }, g.name);
      console.log(`[ft1gag] ${g.name} npc`, JSON.stringify(seen));
      if (!seen?.name) fail(`${g.name} not next to stand: ${JSON.stringify(seen)}`);
      const talk = await talkNpc(page, g.name, gagPref, 90);
      console.log(
        `[ft1gag] ${g.name}`,
        JSON.stringify({ ok: talk.ok, noTrig: talk.noTrig, picks: talk.picks, bodies: talk.bodies })
      );
      if (shot) await shot(`gag-${g.name.toLowerCase()}`);
      if (!talk?.ok) fail(`${g.name} Talk-to failed`);
      if (talk?.noTrig) fail(talk.noTrig);
      const stage = await getServerVarQuiet(page, 'fairy_farmers_quest');
      console.log(`[ft1gag] after ${g.name} fairy_farmers_quest=${stage}`);
      if (Number(stage) !== g.want) {
        fail(`${g.name} did not write fairy_farmers_quest=${g.want} (got ${stage})`);
      }
      if (Number(stage) === 10 || Number(stage) >= 10) {
        fail('wrote fairy_farmers_quest=10 — Zanaris wall forbidden');
      }
      if (g.name === 'Elstan') {
        const martin1 = await (async () => {
          if (!(await teleTo(page, MARTIN.stand, 2, 25_000))) fail('tele Martin mid failed');
          await waitSceneReady(page, 12_000);
          await waitTicks(page, 4);
          return talkNpc(page, MARTIN.name, [], 70);
        })();
        console.log('[ft1gag] martin1', JSON.stringify({ bodies: martin1.bodies }));
        if (shot) await shot('martin-report1');
        const afterM1 = await getServerVarQuiet(page, 'fairy_farmers_quest');
        if (Number(afterM1) !== 2) fail(`Martin report wrote stage=${afterM1}`);
        const text = (martin1.bodies || []).join(' | ');
        if (!/never rains/i.test(text)) fail(`Martin report #1 missing rain dismiss: ${text}`);
      }
    }

    if (!(await teleTo(page, MARTIN.stand, 2, 25_000))) fail('tele Martin final failed');
    await waitSceneReady(page, 12_000);
    await waitTicks(page, 4);
    const martin5 = await talkNpc(page, MARTIN.name, [], 80);
    console.log('[ft1gag] martin5', JSON.stringify({ bodies: martin5.bodies }));
    if (shot) await shot('martin-report5');
    const stage = await getServerVarQuiet(page, 'fairy_farmers_quest');
    const text5 = (martin5.bodies || []).join(' | ');
    if (Number(stage) !== 6) fail(`after five gardeners stage=${stage} (want 6)`);
    if (Number(stage) >= 10) fail('claimed Zanaris decade');
    if (!/swamp/i.test(text5) && !/lumbridge/i.test(text5) && !/fairy/i.test(text5)) {
      fail(`Martin #5 swamp/fairy hint missing: ${text5}`);
    }

    console.log(
      `RESULT PASS ft1gag five GAG fairy_farmers_quest=${stage} never10 user=${username}`
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
