import {
  assertEnginePackHealth, boot, giveItems,
  launchBrowser, mainlandAccount, parseArgs, resolveAccount,
  setWorldSpeed, teleTo, waitSceneReady, fail
} from './lib/harness.mjs';

const { base } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount([], 'mm');
const origin = (base || 'http://127.0.0.1:81').replace(/\/harness\.html.*$/, '');
await assertEnginePackHealth(origin);
const browser = await launchBrowser();
const context = browser.contexts ? browser : null;
const page = browser.newPage ? await browser.newPage() : await browser.contexts()[0].newPage();
await page.goto(`${origin}/harness.html`, { waitUntil: 'domcontentloaded' });
await boot(page);
await mainlandAccount(page, username, password);
await setWorldSpeed(page, 300);
await giveItems(page, [['mm_enchanted_gold_bar',1],['mm_monkey_amulet_mould',1]]);
const STAND = { x: 2810, z: 9191, level: 1 };
if (!(await teleTo(page, STAND, 3, 30000))) fail('tele');
await waitSceneReady(page, 25000);
await page.waitForTimeout(2000);

const dump = await page.evaluate(() => {
  const c = globalThis.__lc377?.client;
  const r = globalThis.__lc377?.reader;
  const world = c?.world;
  const level = c?.minusedlevel | 0;
  const wallsFw = [];
  let wallCount = 0;
  let wallIds = {};
  if (!world) return { err: 'no world', level };
  for (let lx = 0; lx < 104; lx++) {
    for (let lz = 0; lz < 104; lz++) {
      try {
        const w = world.getWall?.(level, lx, lz);
        if (w?.typecode) {
          wallCount++;
          const id = (w.typecode >> 14) & 0x7fff;
          wallIds[id] = (wallIds[id] || 0) + 1;
          if (id === 4765 || id === 4766) wallsFw.push({ lx, lz, id, tc: w.typecode });
        }
      } catch {}
    }
  }
  // L0 scan too
  let wallsFw0 = [];
  for (let lx = 0; lx < 104; lx++) {
    for (let lz = 0; lz < 104; lz++) {
      try {
        const w = world.getWall?.(0, lx, lz);
        if (w?.typecode) {
          const id = (w.typecode >> 14) & 0x7fff;
          if (id === 4765 || id === 4766) wallsFw0.push({ lx, lz, id });
        }
      } catch {}
    }
  }
  return {
    level,
    tile: r?.worldTile?.(),
    wallCountL: wallCount,
    wallsFw,
    wallsFw0,
    topWallIds: Object.entries(wallIds).sort((a,b)=>b[1]-a[1]).slice(0,15),
    baseX: c?.mapBuildBaseX,
    baseZ: c?.mapBuildBaseZ,
    lowMem: c?.constructor?.lowMem ?? globalThis.__lc377?.client?.constructor?.lowMem
  };
});
console.log(JSON.stringify(dump, null, 2));
await browser.close();
