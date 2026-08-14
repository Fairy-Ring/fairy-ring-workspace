#!/usr/bin/env node
/**
 * Desert Treasure Terry etchings handoff (archaeological_expert 619).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-dt-terry-handoff-smoke.mjs
 *
 * Soft: Digsite complete + deserttreasure=1 + give etchings (labeled).
 * Product: DT=0 Digsite Talk-to unchanged → take etchings 1→2 → grant translation 2→3.
 * No Read / Don't-read / Partners / diamonds / AM.
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
const { username, password } = resolveAccount(rest, 'dtter');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

// North of expert (3355,3333). West 3354,3333 is flush on the south timberwall.
const STAND = { x: 3355, z: 3334, level: 0 };
const EXPERT_ID = 619;
const ETCHINGS = 4654;
const TRANSLATION = 4655;

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
      const chat = typeof r.chat === 'function' ? r.chat(48).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return {
        ok,
        noTrig: noTrig ?? null,
        picks: picks.slice(0, 16),
        bodies: bodies.slice(0, 16),
        chat: chat.slice(0, 12)
      };
    },
    [npcName, prefer, iters]
  );
}

async function invSnap(page) {
  return page.evaluate(
    ([etch, trans]) => {
      const items = globalThis.__lc377?.reader?.inventory?.() ?? [];
      return {
        etchings: items.some(x => (x.id | 0) === etch || /etching/i.test(x?.name || '')),
        translation: items.some(
          x => (x.id | 0) === trans || /^translation$/i.test(String(x?.name || ''))
        ),
        ids: items.map(x => x.id).slice(0, 16)
      };
    },
    [ETCHINGS, TRANSLATION]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[dtter] ${base} user=${username} (Archaeological expert 619 handoff)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`dtter_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    for (const c of [
      'setvar itexamlevel 9',
      'setvar deserttreasuremain 0'
    ]) {
      await cheatQuiet(page, c, 400);
    }

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Exam Centre stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const r = globalThis.__lc377?.reader;
      const npcs = r?.npcs?.() ?? [];
      const hit = npcs.find(
        x =>
          (x.id | 0) === id || /archaeological expert/i.test(x?.name || '')
      );
      return {
        hit: hit
          ? { id: hit.id, name: hit.name, x: hit.x, z: hit.z, ops: hit.ops }
          : null,
        names: npcs.map(x => `${x?.name}@${x?.x},${x?.z}`).slice(0, 12)
      };
    }, EXPERT_ID);
    console.log('[dtter] npc', JSON.stringify(seen));
    if (shot) await shot('01-expert');
    const ok =
      (seen?.hit?.id | 0) === EXPERT_ID ||
      /archaeological expert/i.test(String(seen?.hit?.name || ''));
    if (!ok) fail(`Archaeological expert 619 not next to stand: ${JSON.stringify(seen)}`);
    if (/terry balando/i.test(String(seen?.hit?.name || ''))) {
      fail('display was Terry Balando — 377 unpack is Archaeological expert');
    }

    const digsite = await talkNpc(page, 'Archaeological expert', ['no thanks'], 70);
    console.log(
      '[dtter] digsite0',
      JSON.stringify({
        ok: digsite.ok,
        noTrig: digsite.noTrig,
        picks: digsite.picks,
        bodies: digsite.bodies
      })
    );
    if (shot) await shot('02-digsite0');
    if (digsite?.error) fail(`digsite talk abi ${digsite.error}`);
    if (!digsite?.ok) fail(`Digsite Talk-to failed ${JSON.stringify(digsite)}`);
    if (digsite?.noTrig) fail(digsite.noTrig);
    const text0 = [...(digsite.bodies || []), ...(digsite.picks || []), ...(digsite.chat || [])].join(
      ' | '
    );
    if (/Hello, are you Terry Balando/i.test(text0)) {
      fail('DT=0 stole Digsite Talk-to (Terry handoff fired)');
    }
    const digsiteHit =
      /How goes the archaeology/i.test(text0) ||
      /Glad to hear it/i.test(text0) ||
      /no thanks/i.test(text0) ||
      /checking out/i.test(text0) ||
      /digsite/i.test(text0);
    if (!digsiteHit) {
      fail(`DT=0 Digsite complete greeting missing: ${text0}`);
    }
    const after0 = await getServerVarQuiet(page, 'deserttreasure');
    console.log(`[dtter] after digsite0 deserttreasure=${after0}`);
    if (Number(after0) !== 0) fail(`Digsite Talk-to wrote deserttreasure=${after0} (want 0)`);

    await cheatQuiet(page, 'setvar deserttreasure 1', 400);
    await cheatQuiet(page, 'give four_diamonds_etchings 1', 600);
    const preTake = await invSnap(page);
    console.log('[dtter] pre-take', JSON.stringify(preTake));
    if (!preTake.etchings) fail(`give etchings failed: ${JSON.stringify(preTake)}`);

    const take = await talkNpc(page, 'Archaeological expert', [], 100);
    console.log(
      '[dtter] take',
      JSON.stringify({ ok: take.ok, noTrig: take.noTrig, bodies: take.bodies })
    );
    if (shot) await shot('03-take');
    if (!take?.ok) fail(`take Talk-to failed ${JSON.stringify(take)}`);
    if (take?.noTrig) fail(take.noTrig);
    const stage2 = await getServerVarQuiet(page, 'deserttreasure');
    const afterTake = await invSnap(page);
    console.log(`[dtter] after take deserttreasure=${stage2} inv=${JSON.stringify(afterTake)}`);
    if (Number(stage2) !== 2) fail(`take did not write deserttreasure=2 (got ${stage2})`);
    if (afterTake.etchings) fail(`take left etchings in inv: ${JSON.stringify(afterTake)}`);
    if (afterTake.translation) fail(`take granted translation too early: ${JSON.stringify(afterTake)}`);

    const grant = await talkNpc(page, 'Archaeological expert', [], 80);
    console.log(
      '[dtter] grant',
      JSON.stringify({ ok: grant.ok, noTrig: grant.noTrig, bodies: grant.bodies })
    );
    if (shot) await shot('04-grant');
    if (!grant?.ok) fail(`grant Talk-to failed ${JSON.stringify(grant)}`);
    if (grant?.noTrig) fail(grant.noTrig);
    const stage3 = await getServerVarQuiet(page, 'deserttreasure');
    const afterGrant = await invSnap(page);
    console.log(`[dtter] after grant deserttreasure=${stage3} inv=${JSON.stringify(afterGrant)}`);
    if (Number(stage3) !== 3) fail(`grant did not write deserttreasure=3 (got ${stage3})`);
    if (!afterGrant.translation) {
      fail(`grant did not give translation ${TRANSLATION}: ${JSON.stringify(afterGrant)}`);
    }
    if (Number(stage3) >= 15) fail('claimed complete (deserttreasure>=15) — handoff only');

    const nag = await talkNpc(page, 'Archaeological expert', [], 60);
    console.log('[dtter] nag', JSON.stringify({ ok: nag.ok, noTrig: nag.noTrig, chat: nag.chat }));
    if (shot) await shot('05-nag');
    const afterNag = await getServerVarQuiet(page, 'deserttreasure');
    if (Number(afterNag) !== 3) fail(`nag wrote deserttreasure=${afterNag} (want 3)`);

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (
      !tile ||
      Math.abs((tile.x | 0) - STAND.x) > 10 ||
      Math.abs((tile.z | 0) - STAND.z) > 10 ||
      (tile.level | 0) !== 0
    ) {
      fail(`handoff left Exam Centre ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS dtter expert=${EXPERT_ID} digsite0=0 take=2 grant deserttreasure=${stage3} translation=${TRANSLATION} exam=${tile.x},${tile.z} user=${username}`
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
