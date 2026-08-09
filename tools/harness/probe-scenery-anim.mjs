#!/usr/bin/env node
/**
 * Probe longhall fire ClientLocAnim + AnimFrame state.
 *   HARNESS_PROFILE=.tmp/probe-anim-profile node tools/harness/probe-scenery-anim.mjs
 */
import {
  boot,
  launchBrowser,
  mainlandAccount,
  parseArgs,
  resolveAccount,
  teleTo,
  waitSceneReady,
  setWorldSpeed
} from './lib/harness.mjs';

const { base } = parseArgs(process.argv.slice(2));
const { username, password } = resolveAccount([], 'prbf');
const browser = await launchBrowser();
const page = await browser.newPage();

function probe() {
  return page.evaluate(() => {
    const client = globalThis.__lc377Client;
    if (!client) return { err: 'no client' };
    const lp = client.localPlayer;
    if (!lp) return { err: 'no player' };

    const stx = (lp.x >> 7) | 0;
    const stz = (lp.z >> 7) | 0;
    const level = client.currentLevel ?? 0;
    const world = client.world;
    const squares = world?.squares;
    if (!squares) {
      return { err: 'no squares', worldKeys: world ? Object.keys(world) : null, stx, stz, level };
    }

    // Access LocType / SeqType / AnimFrame via global hooks if possible
    // harness may not export them; dig from ClientLocAnim instances
    const hits = [];
    for (let dx = -16; dx <= 16; dx++) {
      for (let dz = -16; dz <= 16; dz++) {
        const x = stx + dx;
        const z = stz + dz;
        if (x < 0 || z < 0) continue;
        const tile = squares[level]?.[x]?.[z];
        if (!tile) continue;

        const models = [];
        if (tile.groundDecor?.model) models.push(['gd', tile.groundDecor.model]);
        if (tile.decor?.model) models.push(['decor', tile.decor.model]);
        if (tile.wall?.model1) models.push(['wall1', tile.wall.model1]);
        if (tile.wall?.model2) models.push(['wall2', tile.wall.model2]);
        for (let i = 0; i < (tile.spriteCount ?? 0); i++) {
          const s = tile.sprites?.[i];
          if (s?.model) models.push([`sprite${i}`, s.model]);
        }

        for (const [kind, m] of models) {
          const isCLA =
            m &&
            (typeof m.getTempModel === 'function' ||
              m.animFrame != null ||
              m.anim != null ||
              m.index != null);
          if (!isCLA && !m?.constructor?.name) continue;
          const row = {
            kind,
            tile: [x, z],
            ctor: m?.constructor?.name,
            index: m?.index,
            shape: m?.shape,
            angle: m?.angle,
            animFrame: m?.animFrame,
            animCycle: m?.animCycle,
            hasAnim: !!m?.anim,
            numFrames: m?.anim?.numFrames,
            loops: m?.anim?.loops,
            frameIds: m?.anim?.frames ? Array.from(m.anim.frames) : null,
            delay0: m?.anim?.getDelay?.(0) ?? null,
            hasGetTemp: typeof m?.getTempModel === 'function',
            hasPointNormal: !!m?.pointNormal
          };
          if (row.hasAnim || row.hasGetTemp || row.index != null) hits.push(row);
        }
      }
    }

    // Deep probe first ClientLocAnim-like
    let deep = null;
    outer: for (let dx = -16; dx <= 16; dx++) {
      for (let dz = -16; dz <= 16; dz++) {
        const tile = squares[level]?.[stx + dx]?.[stz + dz];
        if (!tile) continue;
        const candidates = [
          tile.groundDecor?.model,
          tile.decor?.model,
          ...(Array.from({ length: tile.spriteCount ?? 0 }, (_, i) => tile.sprites?.[i]?.model))
        ].filter(Boolean);
        for (const m of candidates) {
          if (typeof m.getTempModel !== 'function') continue;
          if (!m.anim && m.animFrame == null && m.index == null) continue;

          const fr0 = m.animFrame;
          const mod0 = m.getTempModel();
          const fr1 = m.animFrame;
          // wait via busy loop simulation - caller waits real time between probes
          const y0 = mod0?.pointY ? Array.from(mod0.pointY.slice(0, 12)) : null;
          const frameIds = m.anim?.frames ? Array.from(m.anim.frames) : null;

          // Try to see if AnimFrame slots exist - via animate side effect
          // LocType list via index
          deep = {
            index: m.index,
            shape: m.shape,
            angle: m.angle,
            fr0,
            fr1,
            animCycle: m.animCycle,
            stillHasAnim: !!m.anim,
            numFrames: m.anim?.numFrames,
            loops: m.anim?.loops,
            frameIds,
            delays: m.anim
              ? Array.from({ length: m.anim.numFrames || 0 }, (_, i) => m.anim.getDelay(i))
              : null,
            y0,
            mod0pts: mod0?.numPoints ?? null,
            mod0minY: mod0?.minY ?? null
          };
          break outer;
        }
      }
    }

    // LocType via reader locs for Fire
    const fireLocs = (globalThis.__lc377?.reader?.locs?.({ maxDist: 20 }) ?? []).filter(l =>
      /fire|torch/i.test(l?.name ?? '')
    );

    // Try __lc377 hooks locList for anim field
    const locMeta = [];
    for (const id of [4192, 4265, 4266]) {
      try {
        // not on hooks fully - try client
        const lt = globalThis.__lc377_hooks?.locList?.(id);
        locMeta.push({ id, lt: lt ? { name: lt.name, anim: lt.anim } : null });
      } catch (e) {
        locMeta.push({ id, err: String(e) });
      }
    }

    let loopCycle = null;
    try {
      loopCycle = client.constructor.loopCycle;
    } catch {
      /* */
    }

    return {
      stx,
      stz,
      level,
      loopCycle,
      hitCount: hits.length,
      hits: hits.slice(0, 40),
      deep,
      fireLocs: fireLocs.slice(0, 20),
      locMeta,
      tileKeys: (() => {
        const t = squares[level]?.[stx]?.[stz];
        return t ? Object.keys(t) : null;
      })()
    };
  });
}

try {
  console.log(`[probe] ${base} user=${username}`);
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await boot(page);
  await mainlandAccount(page, username, password);
  await waitSceneReady(page, 60_000);
  await setWorldSpeed(page, 300);
  // Longhall centre fire
  if (!(await teleTo(page, { x: 2660, z: 3673, level: 0 }, 3, 30_000))) {
    throw new Error('tele fail');
  }
  await waitSceneReady(page, 30_000);
  await page.waitForTimeout(3000);

  const a = await probe();
  console.log('T0', JSON.stringify(a, null, 2));

  await page.waitForTimeout(2000);
  const b = await probe();
  console.log(
    'T1',
    JSON.stringify(
      {
        loopCycle: b.loopCycle,
        deep: b.deep,
        hitsWithAnim: (b.hits || []).filter(h => h.hasAnim).slice(0, 15)
      },
      null,
      2
    )
  );

  // If we have deep with frameIds, wait more and compare y
  if (b.deep?.frameIds) {
    await page.waitForTimeout(3000);
    const c = await probe();
    console.log(
      'T2',
      JSON.stringify(
        {
          deep: c.deep,
          yChanged: b.deep?.y0 && c.deep?.y0 ? !b.deep.y0.every((v, i) => v === c.deep.y0[i]) : null
        },
        null,
        2
      )
    );
  }

  console.log('RESULT: PROBE_DONE');
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close().catch(() => {});
}
