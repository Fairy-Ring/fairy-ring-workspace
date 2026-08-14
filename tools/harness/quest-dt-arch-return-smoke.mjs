#!/usr/bin/env node
/**
 * Desert Treasure Archaeologist return (Don't-read + Partners).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-dt-arch-return-smoke.mjs
 *
 * Soft: deserttreasure=3 + give translation 4655 (labeled).
 * Product: Read-book no write → Don't-read 3→4 → Help him 4→5 + south nag.
 * No Read IF / bartender / diamonds / AM. Display stays Archaeologist.
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
const { username, password } = resolveAccount(rest, 'dtret');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3178, z: 3042, level: 0 };
const ARCH_ID = 1918;
const TRANSLATION = 4655;

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

      const sleep = ms => new Promise(res => setTimeout(res, ms));
      const picks = [];
      const bodies = [];
      let lastPickAt = -99;
      let lastContinuedBody = '';
      for (let i = 0; i < maxI; i++) {
        const body = r.chatBodyText?.() || '';
        if (body && (bodies.length === 0 || bodies[bodies.length - 1] !== body)) {
          bodies.push(body.slice(0, 240));
        }
        let opts = getOpts();
        if (!opts.length && /have a read|what do you say\? partners/i.test(body)) {
          for (let w = 0; w < 16 && !opts.length; w++) {
            await sleep(150);
            opts = getOpts();
          }
        }
        if (opts.length) {
          // Pick by comId. Do not pass full labels into chooseOption —
          // "don't read book".includes("read book") selects Read.
          const raw = r.chatOptions?.() ?? [];
          let pick = 0;
          for (const p of pref) {
            const w = String(p).toLowerCase();
            const j = raw.findIndex(o => {
              const t = String(o?.text ?? o ?? '').toLowerCase();
              if (/don'?t read/.test(w)) return /don'?t read/.test(t);
              if (/^read/.test(w)) return /^read\b/.test(t);
              if (/don'?t help/.test(w)) return /don'?t help/.test(t);
              if (/help him/.test(w)) return /help/.test(t) && !/don'?t/.test(t);
              return t.includes(w);
            });
            if (j >= 0) {
              pick = j;
              break;
            }
          }
          const comId = raw[pick]?.comId | 0;
          const label = raw[pick]?.text ?? opts[pick];
          const okPick = comId ? !!a.ifButton?.(comId) : !!a.chooseOption?.(pref);
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
        if (!open && i > 70) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(24).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return {
        ok,
        noTrig: noTrig ?? null,
        picks: picks.slice(0, 16),
        bodies: bodies.slice(0, 20)
      };
    },
    [npcName, prefer, iters]
  );
}

async function hasTranslation(page) {
  return page.evaluate(id => {
    const items = globalThis.__lc377?.reader?.inventory?.() ?? [];
    return {
      has: items.some(x => (x.id | 0) === id || /^translation$/i.test(String(x?.name || ''))),
      ids: items.map(x => x.id).slice(0, 12)
    };
  }, TRANSLATION);
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[dtret] ${base} user=${username} (Archaeologist 1918 return)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`dtret_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    await cheatQuiet(page, 'setvar deserttreasure 3', 400);
    await cheatQuiet(page, 'give four_diamonds_translation_primer 1', 600);

    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Archaeologist stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const r = globalThis.__lc377?.reader;
      const npcs = r?.npcs?.() ?? [];
      const hit = npcs.find(
        x => (x.id | 0) === id || /archaeologist/i.test(x?.name || '')
      );
      return {
        hit: hit
          ? { id: hit.id, name: hit.name, x: hit.x, z: hit.z, ops: hit.ops }
          : null,
        names: npcs.map(x => `${x?.name}@${x?.x},${x?.z}`).slice(0, 8)
      };
    }, ARCH_ID);
    console.log('[dtret] npc', JSON.stringify(seen));
    if (shot) await shot('01-arch');
    if ((seen?.hit?.id | 0) !== ARCH_ID && !/archaeologist/i.test(String(seen?.hit?.name || ''))) {
      fail(`Archaeologist 1918 not next to stand: ${JSON.stringify(seen)}`);
    }
    if (/asgarnia/i.test(String(seen?.hit?.name || ''))) {
      fail('display was Asgarnia Smith — 377 unpack is Archaeologist');
    }

    const pre = await hasTranslation(page);
    if (!pre.has) fail(`give translation failed: ${JSON.stringify(pre)}`);

    const read = await talkNpc(page, 'Archaeologist', ['read book'], 90);
    console.log(
      '[dtret] read',
      JSON.stringify({ ok: read.ok, noTrig: read.noTrig, picks: read.picks, bodies: read.bodies })
    );
    if (shot) await shot('02-read');
    if (!read?.ok) fail(`Read-book Talk-to failed ${JSON.stringify(read)}`);
    if (read?.noTrig) fail(read.noTrig);
    await waitTicks(page, 6);
    const afterRead = await getServerVarQuiet(page, 'deserttreasure');
    const invRead = await hasTranslation(page);
    console.log(`[dtret] after read deserttreasure=${afterRead} inv=${JSON.stringify(invRead)}`);
    if (Number(afterRead) !== 3) fail(`Read book wrote deserttreasure=${afterRead} (want 3)`);
    if (!invRead.has) fail('Read book took translation — leftover IF hole must leave the book');

    const take = await talkNpc(page, 'Archaeologist', ["don't read"], 90);
    console.log(
      '[dtret] dont-read',
      JSON.stringify({ ok: take.ok, noTrig: take.noTrig, picks: take.picks, bodies: take.bodies })
    );
    if (shot) await shot('03-dont-read');
    if (!take?.ok) fail(`Don't-read Talk-to failed ${JSON.stringify(take)}`);
    if (take?.noTrig) fail(take.noTrig);
    await waitTicks(page, 8);
    const stage4 = await getServerVarQuiet(page, 'deserttreasure');
    const invTake = await hasTranslation(page);
    console.log(`[dtret] after dont-read deserttreasure=${stage4} inv=${JSON.stringify(invTake)}`);
    if (Number(stage4) !== 4) fail(`Don't-read did not write deserttreasure=4 (got ${stage4})`);
    if (invTake.has) fail('Dont-read left translation in inv');
    if (Number(stage4) >= 15) fail('claimed complete');

    const partners = await talkNpc(page, 'Archaeologist', ['help him'], 120);
    console.log(
      '[dtret] partners',
      JSON.stringify({
        ok: partners.ok,
        noTrig: partners.noTrig,
        picks: partners.picks,
        bodies: partners.bodies
      })
    );
    if (shot) await shot('04-partners');
    if (!partners?.ok) fail(`Partners Talk-to failed ${JSON.stringify(partners)}`);
    if (partners?.noTrig) fail(partners.noTrig);
    await waitTicks(page, 8);
    const stage5 = await getServerVarQuiet(page, 'deserttreasure');
    console.log(`[dtret] after partners deserttreasure=${stage5}`);
    if (Number(stage5) !== 5) fail(`Partners Yes did not write deserttreasure=5 (got ${stage5})`);
    if (Number(stage5) >= 15) fail('claimed complete');

    const nag = await talkNpc(page, 'Archaeologist', [], 70);
    console.log('[dtret] nag', JSON.stringify({ ok: nag.ok, bodies: nag.bodies }));
    if (shot) await shot('05-south-nag');
    const afterNag = await getServerVarQuiet(page, 'deserttreasure');
    if (Number(afterNag) !== 5) fail(`south nag wrote deserttreasure=${afterNag} (want 5)`);
    const nagText = (nag.bodies || []).join(' | ');
    if (!/bandit/i.test(nagText) && !/south/i.test(nagText)) {
      fail(`south nag missing bandit/south: ${nagText}`);
    }

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (
      !tile ||
      Math.abs((tile.x | 0) - STAND.x) > 12 ||
      Math.abs((tile.z | 0) - STAND.z) > 12 ||
      (tile.level | 0) !== 0
    ) {
      fail(`return left Bedabin camp ${JSON.stringify(tile)}`);
    }

    console.log(
      `RESULT PASS dtret arch=${ARCH_ID} read=3 dont-read=4 partners deserttreasure=${stage5} camp=${tile.x},${tile.z} user=${username}`
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
