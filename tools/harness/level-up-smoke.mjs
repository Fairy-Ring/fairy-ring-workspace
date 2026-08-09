#!/usr/bin/env node
/**
 * Wave 1.5 — level-up IF path (combat + skilling).
 *
 * Uses authentic engine cheat `advancestat` (resets skill to 1, addXp → level,
 * enqueues ADVANCESTAT → content `levelup.rs2` chat IF + jingle + mes).
 *
 *   HEADED=1 node tools/harness/level-up-smoke.mjs
 * @see docs/plans/2026-08-04-platform-ux-after-tbwt.md
 * @see vendor/content/scripts/levelup/scripts/levelup.rs2
 */
import {
  boot,
  cheatQuiet,
  createShotRunDir,
  fail,
  installScreenshotBridge,
  launchBrowser,
  mainlandAccount,
  parseArgs,
  resolveAccount,
  waitSceneReady
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'lu');

/** Skills exercised by TBWT / path-abc — one combat, one skilling. */
const SKILLS = [
  { name: 'attack', level: 2 },
  { name: 'mining', level: 2 }
];

const browser = await launchBrowser();
/** @type {import('playwright').Page | null} */
let page = null;
try {
  page = await browser.newPage();
  page.on('console', msg => {
    const t = msg.text();
    if (/level|advancestat|error|if_open|script/i.test(t)) {
      console.log(`[browser.${msg.type()}] ${t.slice(0, 240)}`);
    }
  });

  console.log(`[level-up] ${base} user=${username}`);
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  const shotDir = await createShotRunDir(`level-up_${username}`);
  const { shot } = await installScreenshotBridge(page, shotDir);

  await mainlandAccount(page, username, password);
  await waitSceneReady(page, 45_000);
  if (shot) await shot('mainland');

  for (const { name, level } of SKILLS) {
    console.log(`[level-up] advancestat ${name} ${level}`);
    // Drain any leftover chat first
    await page.evaluate(async () => {
      const h = globalThis.__lc377;
      for (let i = 0; i < 8; i++) {
        if (h?.reader?.modals?.()?.chat === -1 && !(h?.reader?.chatDialogOpen?.())) break;
        h?.actions?.closeModal?.();
        h?.actions?.continueDialog?.();
        await new Promise(r => setTimeout(r, 200));
      }
    });

    if (!(await cheatQuiet(page, `advancestat ${name} ${level}`, 1200))) {
      fail(`advancestat ${name} not sent`);
    }

    // Wait for level-up chat IF (if_openchat) or mes in chat buffer
    const result = await page.evaluate(async skillName => {
      const h = globalThis.__lc377;
      if (!h?.reader) return { error: 'no reader' };
      const deadline = Date.now() + 12_000;
      while (Date.now() < deadline) {
        const modals = h.reader.modals?.() ?? {};
        const chatIf = modals.chat ?? -1;
        const mainIf = modals.main ?? -1;
        const chatOpen = !!h.reader.chatDialogOpen?.() || chatIf !== -1;
        const lines = typeof h.reader.chat === 'function' ? h.reader.chat(24).map(c => c?.text ?? '') : [];
        const mesHit = lines.find(t => /congratulat|level|advanced|just advanced/i.test(String(t)));
        // Level-up uses if_openchat — chat component non-null
        if (chatOpen || chatIf !== -1) {
          return {
            ok: true,
            skill: skillName,
            chatIf,
            mainIf,
            mes: mesHit ?? null,
            sample: lines.slice(0, 6)
          };
        }
        if (mesHit) {
          return { ok: true, skill: skillName, chatIf, mainIf, mes: mesHit, sample: lines.slice(0, 6) };
        }
        await new Promise(r => setTimeout(r, 200));
      }
      const lines = typeof h.reader.chat === 'function' ? h.reader.chat(16).map(c => c?.text ?? '') : [];
      return {
        ok: false,
        skill: skillName,
        chatIf: h.reader.modals?.()?.chat ?? -1,
        mainIf: h.reader.modals?.()?.main ?? -1,
        sample: lines
      };
    }, name);

    console.log(`[level-up] ${name} →`, JSON.stringify(result));
    if (shot) await shot(`${name}-${result.ok ? 'ok' : 'fail'}`);

    if (!result.ok) {
      fail(`level-up did not open for ${name}: ${JSON.stringify(result)}`);
    }

    // Close so next skill can fire a fresh IF
    await page.evaluate(async () => {
      const h = globalThis.__lc377;
      for (let i = 0; i < 12; i++) {
        h?.actions?.continueDialog?.();
        h?.actions?.closeModal?.();
        await new Promise(r => setTimeout(r, 150));
        const chatIf = h?.reader?.modals?.()?.chat ?? -1;
        if (chatIf === -1 && !h?.reader?.chatDialogOpen?.()) break;
      }
    });
  }

  console.log('RESULT: PASS (level-up attack + mining)');
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await browser.close().catch(() => {});
}
