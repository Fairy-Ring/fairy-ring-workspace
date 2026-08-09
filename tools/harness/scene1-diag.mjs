#!/usr/bin/env node
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(ROOT, 'tools/client-smoke/package.json'));
const { chromium } = require('playwright');

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
page.on('console', m => {
  const t = m.text();
  if (/error|Error|fail|updated|ondemand|CRC|null|map|loaderror|loaderror/i.test(t))
    console.log('[console]', t.slice(0, 220));
});
page.on('pageerror', e => console.log('[pageerror]', String(e.message).slice(0, 200)));
page.on('response', r => {
  if (r.status() >= 400) console.log('[http]', r.status(), r.url().slice(0, 140));
});

await page.goto('http://127.0.0.1:81/harness.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!globalThis.__lc377?.ok, { timeout: 90000 });
console.log('boot ok loop', await page.evaluate(() => globalThis.__lc377?.loopCycle?.()));

await page.evaluate(() => globalThis.__lc377?.login?.('s1diag2', 'test', false));
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(2500);
  const d = await page.evaluate(() => {
    const h = globalThis.__lc377;
    const c = globalThis.__lc377Client;
    const gf = c?.mapBuildGroundFile;
    const lf = c?.mapBuildLocationFile;
    return {
      ingame: !!h?.ingame?.(),
      scene: h?.sceneState?.() ?? c?.sceneState,
      tile: h?.worldTile?.(),
      mes: (h?.loginMes?.() || '').slice(0, 80),
      loop: h?.loopCycle?.(),
      groundFiles: gf ? Array.from(gf) : null,
      locFiles: lf ? Array.from(lf) : null,
      sceneState: c?.sceneState,
      mapState: c?.mapBuildState ?? c?.rebuildSceneState,
    };
  });
  console.log(`t=${((i + 1) * 2.5).toFixed(1)}s`, JSON.stringify(d));
  if (d.scene === 2) {
    console.log('SCENE2_OK');
    break;
  }
}
await browser.close();
