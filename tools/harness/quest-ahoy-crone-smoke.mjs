#!/usr/bin/env node
/**
 * Ghosts Ahoy Old crone first Talk-To (after licensed return).
 *
 *   WORLD_SPEED_MS=300 HARNESS_PROFILE=.tmp/playwright-ahoy-crone \
 *     node tools/harness/quest-ahoy-crone-smoke.mjs
 *
 * Soft ahoy_questvar 3. Stay 3. No dest / porcelain / ectophial.
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
const { username, password } = resolveAccount(rest, 'ahcro');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const STAND = { x: 3461, z: 3557, level: 0 };
const CRONE_ID = 1695;

async function talkNpc(page, npcName, iters = 80) {
  return page.evaluate(
    async ([name, maxI]) => {
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
      const bodies = [];
      let lastContinuedBody = '';
      let lastPickAt = -99;
      for (let i = 0; i < maxI; i++) {
        const body = r.chatBodyText?.() || '';
        if (body && (bodies.length === 0 || bodies[bodies.length - 1] !== body)) {
          bodies.push(body.slice(0, 240));
        }
        if (r.chatOptions?.()?.length) {
          lastPickAt = i;
          await sleep(400);
          continue;
        }
        if (body && body === lastContinuedBody) {
          a.continueDialog?.();
          await sleep(400);
          const openWait = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
          if (!openWait && i > lastPickAt + 16) break;
          continue;
        }
        a.continueDialog?.();
        lastContinuedBody = body;
        await sleep(450);
        const open = !!r.dialogOpen?.() || (r.modals?.()?.chat ?? -1) !== -1;
        if (!open && i > lastPickAt + 16 && bodies.length) break;
        if (!open && i > 70) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(16).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, bodies: bodies.slice(0, 16) };
    },
    [npcName, iters]
  );
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[ahcro] ${base} user=${username} (Old crone 1695)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`ahcro_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await cheatQuiet(page, 'setvar ahoy_questvar 3', 400);
    if (!(await teleTo(page, STAND, 2, 25_000))) fail('tele crone stand failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 6);

    const seen = await page.evaluate(id => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      const hit = npcs.find(x => (x.id | 0) === id || /old crone|crone/i.test(x?.name || ''));
      return { hit: hit ? { id: hit.id, name: hit.name } : null };
    }, CRONE_ID);
    console.log('[ahcro] npc', JSON.stringify(seen));
    if (shot) await shot('01-crone');
    if ((seen?.hit?.id | 0) !== CRONE_ID && !/crone/i.test(String(seen?.hit?.name || ''))) {
      fail(`crone 1695 not next to stand: ${JSON.stringify(seen)}`);
    }

    const talk = await talkNpc(page, 'Old crone', 80);
    console.log('[ahcro] talk', JSON.stringify(talk));
    if (shot) await shot('02-tea');
    if (!talk?.ok) fail(`Talk-to failed ${JSON.stringify(talk)}`);
    if (talk?.noTrig) fail(talk.noTrig);
    const text = (talk.bodies || []).join(' | ');
    if (!/nettle tea|haunted forest/i.test(text)) fail(`tea/forest missing: ${text}`);
    if (/porcelain|enchant|haricanto|ectophial|toy boat/i.test(text)) fail(`later unit: ${text}`);
    await waitTicks(page, 4);
    const stage = await getServerVarQuiet(page, 'ahoy_questvar');
    if (Number(stage) !== 3) fail(`wrote ahoy_questvar=${stage}`);

    const tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.() ?? null);
    if (!tile || Math.abs((tile.x | 0) - STAND.x) > 16 || Math.abs((tile.z | 0) - STAND.z) > 16) {
      fail(`left shack ${JSON.stringify(tile)}`);
    }

    console.log(`RESULT PASS ahcro crone=${CRONE_ID} stay 3 port=${tile.x},${tile.z} user=${username}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
