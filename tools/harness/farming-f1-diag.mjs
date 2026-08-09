import {
  boot, cheatQuiet, giveItems, launchBrowser, mainlandAccount,
  parseArgs, resolveAccount, setStats, setWorldSpeed, teleTo, waitSceneReady,
  getServerVarQuiet
} from './lib/harness.mjs';

const { base, rest } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount(rest, 'fdg');
const STAND = { x: 3049, z: 3307, level: 0 };
const PATCH = { x: 3050, z: 3307, level: 0 };

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await boot(page);
  await mainlandAccount(page, username, password);
  await waitSceneReady(page, 45000);
  await setWorldSpeed(page, 300).catch(()=>{});
  await setStats(page, { farming: 1 }).catch(()=>{});
  await giveItems(page, [['rake',1],['dibber',1],['spade',1],['potato_seed',12]]);
  await teleTo(page, STAND, 3, 25000);
  await waitSceneReady(page, 15000);

  const snap = async () => page.evaluate(([wx,wz]) => {
    const r = globalThis.__lc377?.reader;
    return r?.locAt?.(wx,wz) ?? r?.locs?.({maxDist:12})?.find(l => l.id===8550) ?? null;
  }, [PATCH.x, PATCH.z]);

  await cheatQuiet(page, 'setvar varbit_708 3', 400);
  let loc = await snap();
  const plant = await page.evaluate(async (s) => {
    const ok = globalThis.__lc377?.actions?.useHeldOnLoc('Potato seed', s);
    await new Promise(r => setTimeout(r, 4000));
    return { ok, tile: globalThis.__lc377?.reader?.worldTile?.() };
  }, loc);
  console.log('A plant adjacent after soft weed', plant, 'stage', await getServerVarQuiet(page, 'varbit_708'));

  await cheatQuiet(page, 'setvar varbit_708 0', 400);
  loc = await snap();
  const rake = await page.evaluate(async (s) => {
    const ok = globalThis.__lc377?.actions?.useHeldOnLoc('Rake', s);
    await new Promise(r => setTimeout(r, 6000));
    return { ok, tile: globalThis.__lc377?.reader?.worldTile?.() };
  }, loc);
  console.log('B rake adjacent weeds', rake, 'stage', await getServerVarQuiet(page, 'varbit_708'));

  await teleTo(page, PATCH, 3, 15000);
  await waitSceneReady(page, 10000);
  await cheatQuiet(page, 'setvar varbit_708 0', 400);
  loc = await snap();
  const rakeOn = await page.evaluate(async (s) => {
    const ok = globalThis.__lc377?.actions?.useHeldOnLoc('Rake', s);
    await new Promise(r => setTimeout(r, 6000));
    return { ok, tile: globalThis.__lc377?.reader?.worldTile?.() };
  }, loc);
  console.log('C rake ON patch weeds', rakeOn, 'stage', await getServerVarQuiet(page, 'varbit_708'));

  await cheatQuiet(page, 'setvar varbit_708 3', 400);
  loc = await snap();
  const plantOn = await page.evaluate(async (s) => {
    const ok = globalThis.__lc377?.actions?.useHeldOnLoc('Potato seed', s);
    await new Promise(r => setTimeout(r, 4000));
    return { ok, tile: globalThis.__lc377?.reader?.worldTile?.() };
  }, loc);
  console.log('D plant ON patch after soft weed', plantOn, 'stage', await getServerVarQuiet(page, 'varbit_708'));
} finally {
  await browser.close().catch(()=>{});
}
