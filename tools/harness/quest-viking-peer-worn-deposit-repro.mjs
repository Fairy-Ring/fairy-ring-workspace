#!/usr/bin/env node
/**
 * Peer worn-deposit controlled repro (no engine change).
 *
 *   WORLD_SPEED_MS=300 node tools/harness/quest-viking-peer-worn-deposit-repro.mjs
 *
 * Soft: viking 1 + give/equip adamant. Product: Peer accept bank while worn.
 * Logs worn/inv before/after. Does not fail on ghost appearance (that's H1).
 *
 * @see docs/research/peer-bank-worn-deposit-377.md §8
 * @see docs/plans/2026-08-13-peer-worn-deposit-repro.md
 */
import {
  assertEnginePackHealth,
  boot,
  cheatQuiet,
  createShotRunDir,
  fail,
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
const { username, password } = resolveAccount(rest, 'vikpd');
const shotsEnabled = process.env.SHOTS !== '0' && process.env.SHOTS !== 'false';

const PEER = { x: 2634, z: 3668, level: 0 };
const KIT = [
  ['adamant_scimitar', 1],
  ['adamant_platebody', 1],
  ['adamant_platelegs', 1],
  ['adamant_full_helm', 1],
  ['adamant_kiteshield', 1]
];

async function talkNpc(page, npcName, prefer = [], iters = 72) {
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
        await new Promise(res => setTimeout(res, 320));
        if ((r.modals?.()?.chat ?? -1) === -1 && i > 10) break;
      }
      const chat = typeof r.chat === 'function' ? r.chat(24).map(c => c?.text) : [];
      const noTrig = chat.find(t => /No trigger for/i.test(String(t ?? '')));
      return { ok, noTrig: noTrig ?? null, picks: picks.slice(0, 16), chat: chat.slice(0, 16) };
    },
    [npcName, prefer, iters]
  );
}

async function snapGear(page) {
  return page.evaluate(() => {
    const r = globalThis.__lc377?.reader;
    const c = globalThis.__lc377Client;
    const inv = (r?.inventory?.() ?? []).map(i => i?.name).filter(Boolean);
    const worn = (r?.equipment?.() ?? []).map(i => i?.name).filter(Boolean);
    const bonuses = {
      stabAtk: c?.stabAtk ?? c?.player?.stabAtk,
      slashAtk: c?.slashAtk ?? c?.player?.slashAtk,
      crushAtk: c?.crushAtk ?? c?.player?.crushAtk,
      strength: c?.strengthBonus ?? c?.player?.strengthBonus
    };
    return { inv, worn, bonuses };
  });
}

async function equipKit(page) {
  return page.evaluate(async () => {
    const a = globalThis.__lc377?.actions;
    const names = ['Adamant scimitar', 'Adamant platebody', 'Adamant platelegs', 'Adamant full helm', 'Adamant kiteshield'];
    const steps = [];
    for (const n of names) {
      const ok = !!(a?.equip?.(n) || a?.heldOp?.(n, 2) || a?.heldOp?.(n, 1));
      steps.push({ n, ok });
      await new Promise(r => setTimeout(r, 400));
    }
    return steps;
  });
}

async function main() {
  await assertEnginePackHealth(base);
  console.log(`[vik-peer-worn] ${base} user=${username} (worn deposit repro; headed)`);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  let shot = null;
  if (shotsEnabled) {
    const shotDir = await createShotRunDir(`vik-peer-worn_${username}`);
    ({ shot } = await installScreenshotBridge(page, shotDir));
  }
  try {
    await mainlandAccount(page, username, password);
    await waitSceneReady(page, 90_000);
    await setWorldSpeed(page, Number(process.env.WORLD_SPEED_MS) || 300).catch(() => {});
    await wipeInvAndWorn(page, 'vik-peer-worn prep');
    await cheatQuiet(page, 'setvar viking_bits 0', 300);
    await cheatQuiet(page, 'setvar viking 1', 400);
    await setStats(page, { attack: 40, defence: 40 }).catch(() => {});
    await giveItems(page, KIT);
    const eq = await equipKit(page);
    console.log('[vik-peer-worn] equip', JSON.stringify(eq));
    await waitTicks(page, 3);
    const before = await snapGear(page);
    console.log('[vik-peer-worn] before', JSON.stringify(before));
    if (!before.worn.length) fail('adamant not worn before Peer — equip failed');
    if (shot) await shot('before-deposit');

    if (!(await teleTo(page, PEER, 2, 25_000))) fail('tele Peer failed');
    await waitSceneReady(page, 15_000);
    const talk = await talkNpc(
      page,
      'Peer',
      ['yes', 'bank your equipment', 'bank your', 'wish me to do this', 'yes'],
      80
    );
    console.log('[vik-peer-worn] talk', JSON.stringify(talk));
    if (talk?.noTrig) fail(talk.noTrig);
    await waitTicks(page, 4);
    const after = await snapGear(page);
    console.log('[vik-peer-worn] after', JSON.stringify(after));
    if (shot) await shot('after-deposit');

    const h1 = after.worn.length === 0 && before.worn.length > 0;
    const h2 = after.worn.length > 0;
    const slashAfter = after.bonuses?.slashAtk;
    const bonusesCleared =
      typeof slashAfter === 'number' ? slashAfter < 10 : null;
    console.log(
      `[vik-peer-worn] hyp wornEmpty=${h1} wornFull=${h2} bonusesCleared=${bonusesCleared} slash=${slashAfter}`
    );
    if (h2) fail(`worn still full after Peer deposit: ${JSON.stringify(after.worn)}`);
    if (!h1) fail('deposit did not empty worn');
    if (bonusesCleared === false) {
      fail(`H1 still: worn empty but slashAtk=${slashAfter} (want <10 after update_all)`);
    }
    console.log(
      `RESULT PASS vik-peer-worn user=${username} worn ${before.worn.length}→0 bonusesCleared=${bonusesCleared}`
    );
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
