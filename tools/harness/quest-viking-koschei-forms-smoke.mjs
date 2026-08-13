#!/usr/bin/env node
/**
 * Viking Koschei form-detect — residual after mid37 viking=6 (forms=0 soft).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-viking-koschei-forms-smoke.mjs
 *
 * Soft: viking 5, bits 0, unarmed 70/70/60/70, wipe + lobster×25.
 * Product: Talk Thorvald Yes → climb warrior ladder → fight Koschei.
 *
 * Detector: pack ids 1290–1293 (npc_changetype) + unique form chat.
 * Name stays "Koschei the deathless" — do not count name/despawn.
 * Eat forms 1–3; stop food on form 4 (honour death is authentic vote).
 *
 * PASS: viking≥6 AND (ids ≥3 of 1290–1293, or 1290+1293, or chat f1+f2+f3).
 *
 * @see docs/plans/2026-08-13-viking-koschei-form-detect.md
 * @see docs/research/viking-thorvald-koschei-377.md
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
  setStats,
  setWorldSpeed,
  teleTo,
  waitSceneReady,
  waitTicks,
  wipeInvAndWorn
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'vikf');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const THORVALD = { x: 2666, z: 3693, level: 0 };
const LADDER_LOC = { x: 2667, z: 3694, level: 0 };
const LADDER_STAND = { x: 2666, z: 3694, level: 0 };
const FORM_IDS = [1290, 1291, 1292, 1293];
const THORVALD_STATS = {
  attack: 70,
  strength: 70,
  defence: 60,
  hitpoints: 70
};

async function talkNpc(page, npcName, prefer = [], iters = 56) {
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
      let ok = !!a.talkNpc?.(name);
      if (!ok) {
        const n = (r.npcs?.() ?? []).find(x =>
          String(x?.name ?? '')
            .toLowerCase()
            .includes(String(name).toLowerCase())
        );
        if (n) ok = !!a.npcOp?.(n.index, 1);
      }
      await new Promise(res => setTimeout(res, 1200));
      const picks = [];
      for (let i = 0; i < maxI; i++) {
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
        await new Promise(res => setTimeout(res, 380));
        if ((r.modals?.()?.chat ?? -1) === -1 && i > 8) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(24).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 16), chat: chat.slice(0, 12) };
    },
    [npcName, prefer, iters]
  );
}

async function continueThrash(page, iters = 16, ms = 280) {
  await page.evaluate(
    async ([n, d]) => {
      const a = globalThis.__lc377?.actions;
      for (let i = 0; i < n; i++) {
        a?.continueDialog?.();
        a?.dismissModalMessage?.();
        await new Promise(r => setTimeout(r, d));
      }
    },
    [iters, ms]
  );
}

async function walkNear(page, tile, dist = 1) {
  await page.evaluate(
    async ([wx, wz, d]) => {
      const h = globalThis.__lc377;
      h?.actions?.walkWorld?.(wx, wz);
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 200));
        const t = h?.worldTile?.();
        if (t && Math.max(Math.abs(t.x - wx), Math.abs(t.z - wz)) <= d) break;
      }
    },
    [tile.x, tile.z, dist]
  );
}

async function opLoc(page, nameSub, actionSub = '') {
  return page.evaluate(
    ([n, a]) => globalThis.__lc377?.actions?.opLoc?.(n, a, 16) ?? false,
    [nameSub, actionSub]
  );
}

async function opLocAt(page, tile, actionSub = '') {
  return page.evaluate(
    ([wx, wz, act]) => globalThis.__lc377?.actions?.opLocAt?.(wx, wz, act) ?? false,
    [tile.x, tile.z, actionSub]
  );
}

async function invNames(page) {
  return page.evaluate(() =>
    (globalThis.__lc377?.reader?.inventory?.() ?? []).map(i => i?.name).filter(Boolean)
  );
}

async function wornNames(page) {
  return page.evaluate(() =>
    (globalThis.__lc377?.reader?.equipment?.() ?? []).map(i => i?.name).filter(Boolean)
  );
}

async function snapKos(page) {
  return page.evaluate(() => {
    const h = globalThis.__lc377;
    const r = h?.reader;
    const list = r?.npcs?.() ?? [];
    const kos =
      list.find(n => {
        const id = n?.id | 0;
        return (id >= 1290 && id <= 1293) || /koschei|deathless/i.test(n?.name ?? '');
      }) || null;
    return {
      me: h?.worldTile?.() ?? r?.worldTile?.() ?? null,
      kos: kos
        ? {
            id: kos.id | 0,
            name: kos.name,
            index: kos.index,
            x: kos.tile?.x ?? kos.x,
            z: kos.tile?.z ?? kos.z
          }
        : null,
      npcs: list.slice(0, 16).map(n => ({ id: n.id, name: n.name })),
      chat: (r?.chat?.(20) ?? []).map(c => String(c?.text ?? c ?? '')).filter(Boolean)
    };
  });
}

function noteChat(lines, seen) {
  for (const raw of lines || []) {
    const t = String(raw);
    if (/some idea of combat|not hold back so much this time/i.test(t)) seen.add('f1');
    if (/fight for real|Impressive start/i.test(t)) seen.add('f2');
    if (/hold back no longer|lose your prayer/i.test(t)) seen.add('f3');
    if (/Incredible|defeat ME|passed the trial/i.test(t)) seen.add('f4');
    if (/still alive somehow|how BRAVE|The death was your own/i.test(t)) seen.add('honour');
  }
}

function formEvidence(idsSeen, chatSeen) {
  const ids = [...idsSeen].filter(id => id >= 1290 && id <= 1293).sort((a, b) => a - b);
  const idOk = ids.length >= 3 || (ids.includes(1290) && ids.includes(1293));
  const chatOk = chatSeen.has('f1') && chatSeen.has('f2') && chatSeen.has('f3');
  return { ids, idOk, chatOk, ok: idOk || chatOk };
}

function productChat(lines) {
  return (lines || []).filter(t => !/^(get |set |give |speed )/i.test(String(t)));
}

async function attackKos(page, kos) {
  return page.evaluate(info => {
    const a = globalThis.__lc377?.actions;
    if (!a) return { error: 'no abi' };
    if (info?.index != null && a.npcOp?.(info.index, 2)) {
      return { ok: true, via: 'npcOp', index: info.index, id: info.id };
    }
    const named =
      a.attackNpc?.('Koschei the deathless') || a.attackNpc?.('Koschei');
    return { ok: !!named, via: 'attackNpc', id: info?.id ?? null };
  }, kos);
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[vik-forms] ${base} user=${username} (Koschei 1290–1293; headed default)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`vik-forms_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await wipeInvAndWorn(page, 'vik-forms prep');
    await cheatQuiet(page, 'setvar viking_bits 0', 300);
    await cheatQuiet(page, 'setvar viking 5', 400);
    const statFail = await setStats(page, THORVALD_STATS);
    if (statFail?.length) console.log('[vik-forms] setStats soft-fail', statFail);
    await giveItems(page, [['lobster', 25]]);
    await waitTicks(page, 2);

    const inv0 = await invNames(page);
    const worn0 = await wornNames(page);
    console.log(`[vik-forms] prep inv=${JSON.stringify(inv0)} worn=${JSON.stringify(worn0)}`);
    const banned = [...inv0, ...worn0].filter(n =>
      /scim|plate|helm|shield|sword|dagger|mace|axe|bow|staff|spear|armour|chain|adamant|mithril|rune|steel|bronze|iron/i.test(
        String(n)
      )
    );
    if (banned.length) fail(`prep still has banned gear: ${JSON.stringify(banned)}`);

    if (!(await teleTo(page, THORVALD, 2, 25_000))) fail('tele Thorvald failed');
    await waitSceneReady(page, 15_000);
    await waitTicks(page, 3);
    const thTalk = await talkNpc(page, 'Thorvald', ['yes', 'prepared', 'battle', 'vote'], 72);
    console.log('[vik-forms] talk Thorvald', JSON.stringify(thTalk));
    if (thTalk?.noTrig) fail(thTalk.noTrig);
    await continueThrash(page, 20, 280);
    if (shot) await shot('thorvald-accepted');

    const enterPen = async tag => {
      if (!(await teleTo(page, LADDER_STAND, 1, 15_000))) fail('tele warrior ladder failed');
      await walkNear(page, LADDER_STAND, 0);
      const climb =
        (await opLocAt(page, LADDER_LOC, 'Climb')) ||
        (await opLoc(page, 'Ladder', 'Climb')) ||
        (await opLocAt(page, LADDER_LOC, 'down'));
      console.log(`[vik-forms] climb=${climb} (${tag})`);
      await continueThrash(page, 12, 280);
      await waitTicks(page, 4);
      let tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
      if (!tile || (tile.z ?? 0) < 5000) {
        await opLoc(page, 'Ladder', 'Climb').catch(() => {});
        await continueThrash(page, 16, 280);
        await page
          .waitForFunction(
            () => {
              const t = globalThis.__lc377?.worldTile?.();
              return t && (t.z > 5000 || (t.level ?? 0) >= 2);
            },
            undefined,
            { timeout: 20_000 }
          )
          .catch(() => {});
        tile = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
      }
      return tile;
    };

    let pen = await enterPen('first');
    console.log('[vik-forms] pen', JSON.stringify(pen));
    if (!pen || (pen.z ?? 0) < 5000) {
      fail(
        `pen not entered. inv=${JSON.stringify(await invNames(page))} worn=${JSON.stringify(await wornNames(page))}`
      );
    }
    if (shot) await shot('pen');

    const idsSeen = new Set();
    const chatSeen = new Set();
    let spawned = false;
    for (let w = 0; w < 90 && !spawned; w++) {
      await waitTicks(page, 2);
      await continueThrash(page, 4, 120);
      const snap = await snapKos(page);
      noteChat(snap.chat, chatSeen);
      if (snap.kos?.id && FORM_IDS.includes(snap.kos.id)) idsSeen.add(snap.kos.id);
      if (w % 10 === 0 || snap.kos) {
        console.log(
          `[vik-forms] spawn wait ${w}s kos=${JSON.stringify(snap.kos)} npcs=${JSON.stringify(snap.npcs)}`
        );
      }
      if (snap.kos) {
        spawned = true;
        break;
      }
      if (w === 60) {
        console.log('[vik-forms] no Koschei after 60s — one re-enter (last resort)');
        await opLoc(page, 'Ladder', 'Climb').catch(() => {});
        await continueThrash(page, 12, 280);
        await waitTicks(page, 3);
        pen = await enterPen('requeue');
        console.log('[vik-forms] re-enter', JSON.stringify(pen));
      }
    }
    if (!spawned) {
      fail(`no Koschei after spawn wait. ids=[${[...idsSeen]}] chat=[${[...chatSeen]}]`);
    }

    const maxFightMs = 420_000;
    const t0 = Date.now();
    let stage = Number(await getServerVarQuiet(page, 'viking')) || 5;
    let lastIdLog = 0;
    let honourMode = false;

    while (Date.now() - t0 < maxFightMs && stage < 6) {
      await continueThrash(page, 6, 180);
      const here = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
      if (!here || (here.z ?? 0) < 5000) {
        stage = Number(await getServerVarQuiet(page, 'viking')) || stage;
        if (stage >= 6) {
          console.log('[vik-forms] left pen after vote', JSON.stringify(here), `viking=${stage}`);
          break;
        }
        console.log('[vik-forms] left pen mid-fight (random tele?) — re-enter', JSON.stringify(here));
        pen = await enterPen('mid-fight-recover');
        if (!pen || (pen.z ?? 0) < 5000) fail(`pen lost mid-fight: ${JSON.stringify(here)}`);
        await waitTicks(page, 8);
        continue;
      }

      const snap = await snapKos(page);
      noteChat(snap.chat, chatSeen);
      if (snap.kos?.id && FORM_IDS.includes(snap.kos.id)) {
        if (!idsSeen.has(snap.kos.id)) {
          console.log(`[vik-forms] NEW form id=${snap.kos.id} (seen ${[...idsSeen, snap.kos.id].join(',')})`);
        }
        idsSeen.add(snap.kos.id);
      }
      if (chatSeen.size && Date.now() - lastIdLog > 8_000) {
        lastIdLog = Date.now();
        console.log(
          `[vik-forms] ids=[${[...idsSeen].sort().join(',')}] chat=[${[...chatSeen]}] kos=${JSON.stringify(snap.kos)}`
        );
      }

      honourMode = idsSeen.has(1293) || chatSeen.has('f3') || chatSeen.has('f4');
      if (!snap.kos) {
        stage = Number(await getServerVarQuiet(page, 'viking')) || stage;
        if (stage >= 6) break;
        await waitTicks(page, 2);
        continue;
      }
      if (snap.kos.x != null) await walkNear(page, { x: snap.kos.x, z: snap.kos.z }, 1);
      const fire = await attackKos(page, snap.kos);
      if (fire && !fire.ok) console.log('[vik-forms] attack miss', fire);

      for (let f = 0; f < 40; f++) {
        await page.waitForTimeout(350);
        await continueThrash(page, 2, 80);
        const inner = await snapKos(page);
        noteChat(inner.chat, chatSeen);
        if (inner.kos?.id && FORM_IDS.includes(inner.kos.id)) {
          if (!idsSeen.has(inner.kos.id)) {
            console.log(`[vik-forms] NEW form id=${inner.kos.id}`);
          }
          idsSeen.add(inner.kos.id);
        }
        honourMode = idsSeen.has(1293) || chatSeen.has('f3') || chatSeen.has('f4');
        if (f % 5 === 4) {
          stage = Number(await getServerVarQuiet(page, 'viking')) || stage;
          if (stage >= 6) break;
        }
        if (f % 6 === 0) await attackKos(page, inner.kos || snap.kos);
        if (!honourMode && f % 4 === 2) {
          await page.evaluate(() => globalThis.__lc377?.actions?.eatIfNeeded?.('Lobster', 12));
        }
        const stillHere = await page.evaluate(() => {
          const t = globalThis.__lc377?.worldTile?.();
          return t && (t.z ?? 0) > 5000;
        });
        if (!stillHere) break;
        if (!inner.kos) break;
      }
      stage = Number(await getServerVarQuiet(page, 'viking')) || stage;
    }

    for (let i = 0; i < 12 && stage < 6; i++) {
      await continueThrash(page, 8, 250);
      await waitTicks(page, 2);
      const snap = await snapKos(page);
      noteChat(snap.chat, chatSeen);
      stage = Number(await getServerVarQuiet(page, 'viking')) || stage;
    }

    const ev = formEvidence(idsSeen, chatSeen);
    const endTile = await page.evaluate(() => globalThis.__lc377?.worldTile?.());
    const endChat = productChat((await snapKos(page)).chat);
    console.log(
      `[vik-forms] end viking=${stage} ids=[${ev.ids.join(',')}] chat=[${[...chatSeen]}] ` +
        `idOk=${ev.idOk} chatOk=${ev.chatOk} tile=${JSON.stringify(endTile)}`
    );
    console.log('[vik-forms] product chat', endChat.slice(-10));
    if (shot) await shot(stage >= 6 && ev.ok ? 'pass' : 'fail');

    if (stage < 6) {
      fail(
        `product vote miss viking=${stage} ids=[${ev.ids}] chat=[${[...chatSeen]}] tile=${JSON.stringify(endTile)}`
      );
    }
    if (!ev.ok) {
      fail(
        `FORM-DETECT FAIL viking=${stage} (product vote ok) ids=[${ev.ids}] chat=[${[...chatSeen]}] — need 1290→1293 or f1+f2+f3`
      );
    }
    console.log(
      `RESULT PASS vik-forms viking=${stage} ids=[${ev.ids.join(',')}] chat=[${[...chatSeen]}] ` +
        `(SOFT viking 5; product Thorvald+pen; form-detect ${ev.idOk ? 'ids' : 'chat'})`
    );
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
