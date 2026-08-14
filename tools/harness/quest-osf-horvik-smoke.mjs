#!/usr/bin/env node
/**
 * OSF Horvik prefix after Seth. 8→9. Consume 3 steel_bar. Keep shop.
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-osf-horvik \
 *     node tools/harness/quest-osf-horvik-smoke.mjs
 *
 * Soft onesmallfavour 8 + give steel_bar 3. Stand 3228,3438 W of 3229,3438.
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
const { username, password } = resolveAccount(rest, 'osfhv');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3228, z: 3438, level: 0 };
const HORVIK_ID = 549;

async function worldTile(page) {
  return page.evaluate(() => {
    const t = globalThis.__lc377?.reader?.worldTile?.() ?? {};
    return { x: t.x | 0, z: t.z | 0, level: t.level | 0 };
  });
}

async function invHasSteel(page) {
  return page.evaluate(() => {
    const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
    return inv.some(x => /steel bar/i.test(String(x?.name ?? x?.debugname ?? '')));
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[osfhv] ${base} user=${username} (Horvik OSF)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`osfhv_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar onesmallfavour 8', 300);
    await giveItems(page, [['steel_bar', 3]]);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele Horvik shop failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);
    if (shot) await shot('01-shop');

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /horvik/i.test(x?.name || ''));
      return { hit: hit ? { id: hit.id, name: hit.name } : null };
    }, HORVIK_ID);
    console.log('[osfhv] npc', JSON.stringify(seen));
    if ((seen?.hit?.id | 0) !== HORVIK_ID) fail(`Horvik 549 missing ${JSON.stringify(seen)}`);

    const talk = await page.evaluate(async () => {
      const h = globalThis.__lc377;
      const a = h?.actions;
      const r = h?.reader;
      if (!a || !r) return { error: 'no abi' };
      const sleep = ms => new Promise(res => setTimeout(res, ms));
      const findNpc = () =>
        (r.npcs?.() ?? []).find(x => /horvik/i.test(String(x?.name ?? '')));
      const n0 = findNpc();
      let ok = n0 ? !!a.npcOp?.(n0.index, 1) : !!a.talkNpc?.('Horvik');
      await sleep(1600);
      if (!r.dialogOpen?.()) {
        const n = findNpc();
        if (n) ok = !!a.npcOp?.(n.index, 1) || ok;
        await sleep(1200);
      }
      const bodies = [];
      const picks = [];
      for (let i = 0; i < 160; i++) {
        const body = r.chatBodyText?.() || '';
        if (body && (bodies.length === 0 || bodies[bodies.length - 1] !== body)) {
          bodies.push(body.slice(0, 240));
        }
        const raw = r.chatOptions?.() ?? [];
        if (raw.length) {
          const prefer = [/chicken cages/i, /good turn/i];
          let j = -1;
          for (const re of prefer) {
            j = raw.findIndex(o => re.test(String(o?.text ?? o ?? '')));
            if (j >= 0) break;
          }
          if (j < 0) j = 0;
          const comId = raw[j]?.comId | 0;
          const label = raw[j]?.text ?? '';
          const okPick = comId ? !!a.ifButton?.(comId) : false;
          picks.push(okPick ? `ok:${label}` : `fail:${label}`);
          await sleep(800);
          continue;
        }
        a.continueDialog?.();
        await sleep(400);
        const open = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
        if (!open && bodies.length && i > 16) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => String(c?.text ?? '')) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks, bodies: bodies.slice(0, 40) };
    });
    console.log('[osfhv] talk', JSON.stringify(talk));
    if (shot) await shot('02-talk');
    if (!talk?.ok) fail(`Talk-to failed ${JSON.stringify(talk)}`);
    if (talk?.noTrig) fail(talk.noTrig);
    const text = (talk.bodies || []).join(' | ');
    if (!/seth|steel bars|herbal tincture|breathing salts|pigeon/i.test(text)) {
      fail(`Horvik hop missing: ${text}`);
    }
    if (/tassie|12346|remove this key|lamp/i.test(text)) fail(`later leftover leaked: ${text}`);

    if (await invHasSteel(page)) fail('steel bars still in inv (want consume 3)');

    const tile = await worldTile(page);
    console.log('[osfhv] tile', tile);
    if (Math.abs((tile.x | 0) - STAND.x) > 10 || Math.abs((tile.z | 0) - STAND.z) > 10) {
      fail(`dest invented ${JSON.stringify(tile)}`);
    }
    const stage = await getServerVarQuiet(page, 'onesmallfavour');
    if (Number(stage) !== 9) fail(`onesmallfavour=${stage} (want 9)`);

    console.log(`RESULT PASS osfhv Horvik 8→9 stay shop user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
