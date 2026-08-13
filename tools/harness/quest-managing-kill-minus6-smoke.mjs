#!/usr/bin/env node
/**
 * Managing kill −6 — product Attack a Miscellania subject drops approval.
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-managing-kill-minus6-smoke.mjs
 *
 * Soft: misc_quest 100, misc_approval 90, setstat Attack 40 + bronze scim.
 * Product: Attack Ragnar (misc_man_1) → approval −6 (90→84) + misc_killed.
 *
 * Flax / dating / Etceteria subjects (no −6) are not this smoke.
 *
 * @see docs/research/port-mg-managing-misc-289-to-377.md
 * @see docs/research/game-knowledge/anchors-miscellania.md
 * @see docs/plans/2026-08-12-managing-kill-minus6.md
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
const { username, password } = resolveAccount(rest, 'mankill');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

// Ragnar spawn 2518,3859 — stand one west, not on him.
const RAGNAR_STAND = { x: 2517, z: 3859, level: 0 };

async function chatTail(page, n = 16) {
  return page.evaluate(k => {
    const r = globalThis.__lc377?.reader;
    try {
      return (r?.chat?.(k) ?? []).map(c => String(c?.text ?? c ?? '')).filter(Boolean).slice(-k);
    } catch {
      return [];
    }
  }, n);
}

function productChat(lines) {
  return (lines || []).filter(t => !/^(get |set )/i.test(String(t)));
}

async function snapNpcs(page) {
  return page.evaluate(() => {
    const r = globalThis.__lc377?.reader;
    const me = r?.worldTile?.() ?? null;
    const npcs = (r?.npcs?.() ?? []).map(n => ({
      name: n?.name,
      index: n?.index,
      id: n?.id,
      x: n?.x,
      z: n?.z,
      ops: n?.ops
    }));
    return { me, npcs: npcs.slice(0, 24) };
  });
}

async function fireAttackRagnar(page) {
  return page.evaluate(() => {
    const a = globalThis.__lc377?.actions;
    const r = globalThis.__lc377?.reader;
    if (!a || !r) return { error: 'no abi' };
    const n = (r.npcs?.() ?? []).find(x => /ragnar/i.test(x?.name || ''));
    if (!n) {
      return {
        error: 'no ragnar',
        names: (r.npcs?.() ?? []).map(x => x?.name).filter(Boolean).slice(0, 16)
      };
    }
    const me = r.worldTile?.();
    const d =
      me && n.x != null ? Math.max(Math.abs(me.x - n.x), Math.abs(me.z - n.z)) : null;
    return {
      ok: !!a.npcOp?.(n.index, 2),
      name: n.name,
      index: n.index,
      id: n.id,
      ops: n.ops,
      npc: { x: n.x, z: n.z },
      me,
      d
    };
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[manage-kill] ${base} user=${username} (Ragnar −6; headed default)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`manage-kill_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});

    await cheatQuiet(page, 'setvar misc_quest 100', 400);
    await cheatQuiet(page, 'setstat attack 40', 200);
    await cheatQuiet(page, 'setstat strength 40', 200);
    await giveItems(page, [['bronze_scimitar', 1]]);
    await waitTicks(page, 2);

    if (!(await teleTo(page, RAGNAR_STAND, 2, 25_000))) fail('tele Ragnar failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);
    await cheatQuiet(page, 'setvar misc_approval 90', 400);
    await waitTicks(page, 2);

    await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      a?.equip?.('Bronze scimitar') || a?.equip?.('bronze_scimitar');
    });
    await waitTicks(page, 3);

    const worn = await page.evaluate(() =>
      (globalThis.__lc377?.reader?.equipment?.() ?? []).map(i => i?.name).filter(Boolean)
    );
    console.log('[manage-kill] worn', worn);
    const snap0 = await snapNpcs(page);
    console.log('[manage-kill] scene', JSON.stringify(snap0));

    const from = Number(await getServerVarQuiet(page, 'misc_approval'));
    let last = from;
    let sawSwing = false;
    let fireLog = null;

    for (let attempt = 0; attempt < 8; attempt++) {
      if (!sawSwing) {
        fireLog = await fireAttackRagnar(page);
        console.log(`[manage-kill] fire ${attempt}`, fireLog);
        if (fireLog?.error === 'no ragnar' && attempt === 0) {
          // wander 5 — one retry after a short wait, no spam
          await waitTicks(page, 8);
          fireLog = await fireAttackRagnar(page);
          console.log('[manage-kill] fire retry', fireLog);
        }
        if (fireLog?.error) fail(`no Attack target: ${JSON.stringify(fireLog)}`);
      } else {
        console.log(`[manage-kill] hold p_opnpc ${attempt}`);
      }
      for (let w = 0; w < 6; w++) {
        await waitTicks(page, 8);
        const prod = productChat(await chatTail(page, 24));
        if (prod.some(t => /oi!|rahr!|no!|grr!|aargh|gonner|done for|uggh/i.test(t))) {
          sawSwing = true;
        }
        if (w % 2 === 1) {
          last = Number(await getServerVarQuiet(page, 'misc_approval'));
          if (Number(last) === Number(from) - 6) {
            if (shot) await shot('after-kill');
            console.log(`[manage-kill] PASS ${from}→${last}`, prod.slice(-8));
            console.log(
              `RESULT PASS manage-kill −6 ${from}→${last} (SOFT quest 100; product Attack Ragnar)`
            );
            process.exit(0);
          }
        }
      }
      const prod = productChat(await chatTail(page, 24));
      last = Number(await getServerVarQuiet(page, 'misc_approval'));
      console.log(`[manage-kill] after wait approval=${last} (from ${from})`, prod.slice(-8));
      if (Number(last) === Number(from) - 6) {
        if (shot) await shot('after-kill');
        console.log(
          `RESULT PASS manage-kill −6 ${from}→${last} (SOFT quest 100; product Attack Ragnar)`
        );
        process.exit(0);
      }
      sawSwing = prod.some(t => /oi!|rahr!|no!|grr!|aargh|gonner|done for|uggh/i.test(t));
    }

    const snap1 = await snapNpcs(page);
    const prod = productChat(await chatTail(page, 24));
    if (shot) await shot('fail');
    fail(
      `KILL FAIL approval ${from}→${last} worn=${JSON.stringify(worn)} scene=${JSON.stringify(snap1)} chat=${JSON.stringify(prod.slice(-12))}`
    );
  } catch (e) {
    console.error(e);
    fail(String(e?.message || e));
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
