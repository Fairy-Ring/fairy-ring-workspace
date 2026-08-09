#!/usr/bin/env bun
/**
 * Build the **harness client** (pure Client-TS + inject hooks + adapter).
 *
 * 1. `inject-client.mjs` — pure Client → tools/harness/.generated/Client.ts
 * 2. Bundle client-entry → vendor/engine/public/harness/harness-client.js
 *
 * Pure `vendor/client-ts` is never edited. No full second Client.ts to maintain.
 *
 *   bun tools/harness/build-client.mjs
 *   bun tools/harness/build-client.mjs --prod   # minify (breaks private-name digs — prefer dev)
 *
 * @see tools/harness/inject-client.mjs
 * @see docs/decisions/006-harness-client-fork.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ENTRY = path.join(ROOT, 'tools/harness/client-entry.ts');
const OUT_DIR = path.join(ROOT, 'vendor/engine/public/harness');
const CLIENT_SRC = path.join(ROOT, 'vendor/client-ts/src');
const prod = process.argv.includes('--prod');

/**
 * Resolve pure Client-TS package imports (`#/*`, `#3rdparty/*`) when harness code
 * dynamically imports MapView for basemap rebuild. Inject rewrites Client.ts; MapView
 * still uses `#/` internally.
 *
 * **Critical:** dash3d modules (ClientLocAnim, ClientPlayer) import `#/client/Client`.
 * Without aliasing, Bun bundles pure Client.ts *and* inject-generated Client → two
 * classes (`Client` + `Client2`). Live game ticks `Client2.loopCycle`; ClientLocAnim
 * reads dead `Client.loopCycle` → **all scenery anims freeze** (fires, torches, portals).
 * Probe: animFrame stuck, y unchanged. Fix: one Client module = generated harness Client.
 */
function clientTsHashPlugin() {
  const GENERATED_CLIENT = path.join(ROOT, 'tools/harness/.generated/Client.ts');
  const PURE_CLIENT = path.join(CLIENT_SRC, 'client/Client.ts');

  const tryFile = (base) => {
    const candidates = [
      base,
      base.replace(/\.js$/, '.ts'),
      base.replace(/\.js$/, '.tsx'),
      `${base}.ts`,
      `${base}.js`
    ];
    for (const c of candidates) {
      try {
        if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
      } catch {
        /* ignore */
      }
    }
    return null;
  };

  /** True if path is the pure Client.ts (any extension/normalize form). */
  const isPureClientPath = (p) => {
    if (!p) return false;
    const n = path.normalize(p);
    return (
      n === path.normalize(PURE_CLIENT) ||
      n.endsWith(`${path.sep}client${path.sep}Client.ts`) ||
      n.endsWith(`${path.sep}client${path.sep}Client.js`)
    );
  };

  return {
    name: 'client-ts-hash-imports',
    setup(build) {
      // Absolute pure Client path (rewritten imports from ClientLocAnim etc.)
      build.onResolve({ filter: /Client\.(ts|js)$/ }, (args) => {
        // Already resolving generated — leave alone
        if (args.path.includes(`${path.sep}.generated${path.sep}`) || args.path.includes('/.generated/')) {
          return null;
        }
        const resolved = path.isAbsolute(args.path)
          ? args.path
          : path.normalize(path.join(path.dirname(args.importer || ''), args.path));
        if (isPureClientPath(resolved) || isPureClientPath(args.path)) {
          if (!fs.existsSync(GENERATED_CLIENT)) {
            return { errors: [{ text: `harness generated Client missing: ${GENERATED_CLIENT}` }] };
          }
          return { path: GENERATED_CLIENT };
        }
        return null;
      });

      build.onResolve({ filter: /^#\// }, (args) => {
        const rel = args.path.slice(2); // strip "#/"
        // Force single Client identity for scenery/entity Client.loopCycle
        if (rel === 'client/Client.js' || rel === 'client/Client.ts' || rel === 'client/Client') {
          if (!fs.existsSync(GENERATED_CLIENT)) {
            return { errors: [{ text: `harness generated Client missing: ${GENERATED_CLIENT}` }] };
          }
          return { path: GENERATED_CLIENT };
        }
        const hit = tryFile(path.join(CLIENT_SRC, rel));
        if (!hit) {
          return { errors: [{ text: `client-ts #/ not found: ${args.path}` }] };
        }
        if (isPureClientPath(hit)) {
          return { path: GENERATED_CLIENT };
        }
        return { path: hit };
      });
      build.onResolve({ filter: /^#3rdparty\// }, (args) => {
        const rel = args.path.slice('#3rdparty/'.length);
        const hit = tryFile(path.join(CLIENT_SRC, '3rdparty', rel));
        if (!hit) {
          return { errors: [{ text: `client-ts #3rdparty/ not found: ${args.path}` }] };
        }
        return { path: hit };
      });
    }
  };
}

// Inject harness hooks into a generated Client (from pure TS)
const inject = spawnSync('bun', [path.join(ROOT, 'tools/harness/inject-client.mjs')], {
  cwd: ROOT,
  stdio: 'inherit'
});
if (inject.status !== 0) {
  console.error('[harness] inject-client failed');
  process.exit(inject.status ?? 1);
}

const result = await Bun.build({
  entrypoints: [ENTRY],
  outdir: OUT_DIR,
  naming: 'harness-client.js',
  target: 'browser',
  format: 'esm',
  sourcemap: 'external',
  minify: prod,
  plugins: [clientTsHashPlugin()],
  define: {
    'process.env.SECURE_ORIGIN': JSON.stringify(process.env.SECURE_ORIGIN ?? 'false'),
    'process.env.LOGIN_RSAE': JSON.stringify(
      process.env.LOGIN_RSAE ??
        '58778699976184461502525193738213253649000149147835990136706041084440742975821'
    ),
    'process.env.LOGIN_RSAN': JSON.stringify(
      process.env.LOGIN_RSAN ??
        '7162900525229798032761816791230527296329313291232324290237849263501208207972894053929065636522363163621000728841182238772712427862772219676577293600221789'
    ),
    'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString())
  }
});

if (!result.success) {
  console.error('[harness] build failed');
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

// Copy attach-in-page.js for optional standalone use / debugging
fs.copyFileSync(
  path.join(ROOT, 'tools/harness/attach-in-page.js'),
  path.join(OUT_DIR, 'attach-in-page.js')
);

// MIDI assets next to harness-client.js — tinymidipcm fetches via import.meta.url
// (same origin path as the bundle: /harness/… not /client/…)
function copyBeside(name, candidates) {
  const dst = path.join(OUT_DIR, name);
  for (const src of candidates) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      return src;
    }
  }
  console.warn(`[harness] missing ${name} (MIDI may be silent)`);
  return null;
}

copyBeside('tinymidipcm.wasm', [
  path.join(ROOT, 'vendor/client-ts/out/tinymidipcm.wasm'),
  path.join(ROOT, 'vendor/engine/public/client/tinymidipcm.wasm')
]);

// Soundfont required for SFX-adjacent music (scape_main etc.)
copyBeside('SCC1_Florestan.sf2', [
  path.join(ROOT, 'vendor/engine/public/client/SCC1_Florestan.sf2'),
  path.join(ROOT, 'vendor/client-ts/out/SCC1_Florestan.sf2'),
  path.join(ROOT, 'assets/SCC1_Florestan.sf2')
]);

// Collision pack for world walker (classic PathFinder)
const packGz = path.join(ROOT, 'tools/harness/nav/out/collision.lcnav.gz');
if (fs.existsSync(packGz)) {
  fs.copyFileSync(packGz, path.join(OUT_DIR, 'collision.lcnav.gz'));
  console.log(`[harness] collision pack → ${path.join(OUT_DIR, 'collision.lcnav.gz')}`);
} else {
  console.warn('[harness] missing tools/harness/nav/out/collision.lcnav.gz — run: bun tools/harness/nav/tools/build-collision.ts');
}

// Deploy basemap bake (rs2b0t gen:basemap equivalent) — terrain + Key/multi/free/labels overlays.
// Skip with SKIP_BASEMAP_BAKE=1 for fast client-only rebuilds.
const basemapSrc = path.join(ROOT, 'tools/harness/nav/out/basemap');
const basemapBakeScript = path.join(ROOT, 'tools/harness/map/build-basemap.ts');
if (process.env.SKIP_BASEMAP_BAKE === '1') {
  console.log('[harness] SKIP_BASEMAP_BAKE=1 — reusing existing basemap assets');
} else if (fs.existsSync(basemapBakeScript)) {
  console.log('[harness] baking worldmap basemap (MapView → nav/out/basemap)…');
  const bake = spawnSync('bun', [basemapBakeScript, '--revision', '377'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env
  });
  if (bake.status !== 0) {
    console.error('[harness] basemap bake failed');
    process.exit(bake.status ?? 1);
  }
} else {
  console.warn('[harness] missing tools/harness/map/build-basemap.ts');
}

const basemapDst = path.join(OUT_DIR, 'basemap');
if (fs.existsSync(path.join(basemapSrc, 'worldmap-basemap.manifest.json'))) {
  fs.mkdirSync(basemapDst, { recursive: true });
  // Replace deploy basemap fully (avoid stale fingerprinted PNGs).
  if (fs.existsSync(basemapDst)) {
    for (const name of fs.readdirSync(basemapDst)) {
      fs.unlinkSync(path.join(basemapDst, name));
    }
  }
  for (const name of fs.readdirSync(basemapSrc)) {
    if (name === 'worldmap.jag') continue; // served from /harness/worldmap.jag
    fs.copyFileSync(path.join(basemapSrc, name), path.join(basemapDst, name));
  }
  console.log(`[harness] basemap → ${basemapDst} (${fs.readdirSync(basemapDst).length} files)`);
} else {
  console.warn(
    '[harness] missing tools/harness/nav/out/basemap/worldmap-basemap.manifest.json — map picker falls back to collision dots'
  );
}

// worldmap.jag for live MapView Rebuild (map picker) — pure client downloads /worldmap.jag
// by default; we also serve under /harness/ for the bake path.
const jagCandidates = [
  path.join(ROOT, 'tools/harness/nav/out/worldmap.jag'),
  path.join(ROOT, 'vendor/engine/data/pack/mapview/worldmap.jag'),
  path.join(ROOT, 'cache/worldmap.jag'),
  path.join(process.env.HOME || '', 'code/rs2b2t-engine/data/pack/mapview/worldmap.jag'),
  path.join(process.env.HOME || '', 'experiments/rs2b0t/out/worldmap.jag')
];
const jagDst = path.join(OUT_DIR, 'worldmap.jag');
let jagCopied = false;
for (const src of jagCandidates) {
  if (src && fs.existsSync(src)) {
    fs.copyFileSync(src, jagDst);
    // Also public root if engine serves it (MapView default downloadUrl)
    const rootPublic = path.join(ROOT, 'vendor/engine/public/worldmap.jag');
    try {
      fs.copyFileSync(src, rootPublic);
    } catch {
      /* optional */
    }
    console.log(`[harness] worldmap.jag → ${jagDst} (from ${src})`);
    jagCopied = true;
    break;
  }
}
if (!jagCopied) {
  console.warn(
    '[harness] missing worldmap.jag — map picker Rebuild will fail until placed under tools/harness/nav/out/ or engine mapview pack'
  );
}

console.log(`[harness] built ${path.join(OUT_DIR, 'harness-client.js')} (prod=${prod})`);
