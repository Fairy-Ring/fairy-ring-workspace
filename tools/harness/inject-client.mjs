#!/usr/bin/env bun
/**
 * Build harness Client **from pure Client-TS** by surgical injects.
 *
 * Pure tree stays Java 1:1 (`vendor/client-ts`). We do **not** maintain a second
 * full Client.ts — this script copies pure → applies small harness blocks →
 * rewrites imports for the harness bundle.
 *
 *   bun tools/harness/inject-client.mjs
 *   bun tools/harness/build-client.mjs   # calls inject first
 *
 * Anchors must match pure Client (1 occurrence each). If pure drifts, this fails
 * loud instead of silently shipping a stale fork.
 *
 * @see docs/decisions/006-harness-client-fork.md
 * @see tools/harness/client-fork/HARNESS_ADDONS.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PURE = path.join(ROOT, 'vendor/client-ts/src/client/Client.ts');
const OUT_DIR = path.join(ROOT, 'tools/harness/.generated');
const OUT = path.join(OUT_DIR, 'Client.ts');
const PURE_SRC = path.join(ROOT, 'vendor/client-ts/src');

function fail(msg) {
  console.error(`[inject-client] ${msg}`);
  process.exit(1);
}

function once(hay, needle, label) {
  const i = hay.indexOf(needle);
  if (i < 0) fail(`anchor missing: ${label}\n  ${JSON.stringify(needle.slice(0, 80))}`);
  if (hay.indexOf(needle, i + 1) >= 0) fail(`anchor not unique: ${label}`);
  return i;
}

function insertAfter(hay, needle, insert, label) {
  const i = once(hay, needle, label);
  return hay.slice(0, i + needle.length) + insert + hay.slice(i + needle.length);
}

function replaceOnce(hay, needle, repl, label) {
  once(hay, needle, label);
  return hay.replace(needle, repl);
}

/** Rewrite `#/…` and `#3rdparty/…` to relative imports under vendor/client-ts/src. */
function rewriteImports(src) {
  // Canvas: harness pixel-scaled canvas (Decision 006)
  src = src.replace(
    /from '#\/graphics\/Canvas\.js'/g,
    "from '../client-fork/Canvas.ts'"
  );

  src = src.replace(/from '#3rdparty\/([^']+)'/g, (_m, p) => {
    return `from '../../../vendor/client-ts/src/3rdparty/${p}'`;
  });

  src = src.replace(/from '#\/([^']+)'/g, (_m, p) => {
    // strip trailing .js for TS resolution under bun
    const rel = p.replace(/\.js$/, '.js');
    return `from '../../../vendor/client-ts/src/${rel}'`;
  });

  return src;
}

let src = fs.readFileSync(PURE, 'utf8');

// ── 1. Field: lastWalkPathLocal ───────────────────────────────────────────
src = insertAfter(
  src,
  '    private minimapFlagZ: number = 0;\n',
  `
    /** Harness/nav: last tryMove path in local scene tiles (src→dest). Pure client has no equivalent. */
    lastWalkPathLocal: { x: number; z: number }[] = [];
`,
  'field lastWalkPathLocal (after minimapFlagZ)'
);

// ── 2. Methods: onAfterWorldRender + projectAreaGame (before drawScene) ───
src = insertAfter(
  src,
  '    private drawScene(): void {',
  '',
  'drawScene method (pre-insert check)'
);
// insert *before* drawScene
src = replaceOnce(
  src,
  '    private drawScene(): void {',
  `    /**
     * Harness-only: after World.renderAll while Pix2D is bound to areaGame.
     * Pure Client-TS has no hook — paint / bot tools live only on the harness build.
     */
    protected onAfterWorldRender(): void {
        // no-op; pathScenePaint may patch instance
    }

    /**
     * Project scene-local ground (fine coords) into areaGame pixels.
     * Valid during onAfterWorldRender (viewport bound). Returns null if behind camera.
     */
    projectAreaGame(sceneX: number, sceneZ: number, height: number = 0): { x: number; y: number } | null {
        this.projectFromGround(sceneX, sceneZ, height);
        if (this.projectX === -1 || this.projectY === -1) {
            return null;
        }
        return { x: this.projectX, y: this.projectY };
    }

    private drawScene(): void {`,
  'inject onAfterWorldRender + projectAreaGame'
);

// ── 3. Call site: after removeSprites ─────────────────────────────────────
src = replaceOnce(
  src,
  '        this.world?.removeSprites();\n        this.draw2DEntityElements();',
  '        this.world?.removeSprites();\n        this.onAfterWorldRender();\n        this.draw2DEntityElements();',
  'onAfterWorldRender call after removeSprites'
);

// ── 4. tryMove: clear trail at start ──────────────────────────────────────
src = replaceOnce(
  src,
  '    private tryMove(srcX: number, srcZ: number, dx: number, dz: number, tryNearest: boolean, locWidth: number, locLength: number, locAngle: number, locShape: number, forceapproach: number, type: number): boolean {\n        const collisionMap: CollisionMap | null = this.collision[this.minusedlevel];',
  '    private tryMove(srcX: number, srcZ: number, dx: number, dz: number, tryNearest: boolean, locWidth: number, locLength: number, locAngle: number, locShape: number, forceapproach: number, type: number): boolean {\n        this.lastWalkPathLocal = [];\n        const collisionMap: CollisionMap | null = this.collision[this.minusedlevel];',
  'tryMove clear lastWalkPathLocal'
);

// ── 5. tryMove: full-tile path for client-trail paint ─────────────────────
src = replaceOnce(
  src,
  `        length = 0;
        this.routeX[length] = x;
        this.routeZ[length++] = z;

        let dir: number = this.dirMap[CollisionMap.index(x, z)];
        let next: number = dir;
        while (x !== srcX || z !== srcZ) {
            if (next !== dir) {
                dir = next;
                this.routeX[length] = x;
                this.routeZ[length++] = z;
            }

            if ((next & DirectionFlag.EAST) !== 0) {
                x++;
            } else if ((next & DirectionFlag.WEST) !== 0) {
                x--;
            }

            if ((next & DirectionFlag.NORTH) !== 0) {
                z++;
            } else if ((next & DirectionFlag.SOUTH) !== 0) {
                z--;
            }

            next = this.dirMap[CollisionMap.index(x, z)];
        }

        if (length > 0) {
            bufferSize = Math.min(length, 25); // max number of turns in a single pf request
            length--;

            const startX: number = this.routeX[length];
            const startZ: number = this.routeZ[length];

            // Java 377 tryMove: size then p2_alt3(x) p1(ctrl) p2_alt3(z) then p1(dx) p1_alt3(dz)
            // (289 had ctrl before coords and plain p2/p1 — engine MoveClickDecoder rejects that shape)
            if (type === 0) {
                this.out.p1Enc(ClientProt.MOVE_GAMECLICK);
                this.out.p1(bufferSize + bufferSize + 3);
            } else if (type === 1) {
                this.out.p1Enc(ClientProt.MOVE_MINIMAPCLICK);
                this.out.p1(bufferSize + bufferSize + 3 + 14);
            } else if (type === 2) {
                this.out.p1Enc(ClientProt.MOVE_OPCLICK);
                this.out.p1(bufferSize + bufferSize + 3);
            }

            this.out.p2_alt3(startX + this.mapBuildBaseX);
            this.out.p1(this.keyHeld[5] === 1 ? 1 : 0);
            this.out.p2_alt3(startZ + this.mapBuildBaseZ);

            this.minimapFlagX = this.routeX[0];
            this.minimapFlagZ = this.routeZ[0];

            for (let i: number = 1; i < bufferSize; i++) {
                length--;
                this.out.p1(this.routeX[length] - startX);
                this.out.p1_alt3(this.routeZ[length] - startZ);
            }

            return true;
        }

        return type !== 1;
    }`,
  `        length = 0;
        this.routeX[length] = x;
        this.routeZ[length++] = z;

        // HARNESS ADDON: every-tile path dest→src for client-trail paint (rs2b0t lastWalkPathLocal).
        // Packet still uses corner-compressed routeX/routeZ only.
        const fullRev: { x: number; z: number }[] = [{ x, z }];

        let dir: number = this.dirMap[CollisionMap.index(x, z)];
        let next: number = dir;
        while (x !== srcX || z !== srcZ) {
            if (next !== dir) {
                dir = next;
                this.routeX[length] = x;
                this.routeZ[length++] = z;
            }

            if ((next & DirectionFlag.EAST) !== 0) {
                x++;
            } else if ((next & DirectionFlag.WEST) !== 0) {
                x--;
            }

            if ((next & DirectionFlag.NORTH) !== 0) {
                z++;
            } else if ((next & DirectionFlag.SOUTH) !== 0) {
                z--;
            }

            fullRev.push({ x, z });
            next = this.dirMap[CollisionMap.index(x, z)];
        }

        if (length > 0) {
            bufferSize = Math.min(length, 25); // max number of turns in a single pf request
            length--;

            const startX: number = this.routeX[length];
            const startZ: number = this.routeZ[length];

            // Java 377 tryMove: size then p2_alt3(x) p1(ctrl) p2_alt3(z) then p1(dx) p1_alt3(dz)
            // (289 had ctrl before coords and plain p2/p1 — engine MoveClickDecoder rejects that shape)
            if (type === 0) {
                this.out.p1Enc(ClientProt.MOVE_GAMECLICK);
                this.out.p1(bufferSize + bufferSize + 3);
            } else if (type === 1) {
                this.out.p1Enc(ClientProt.MOVE_MINIMAPCLICK);
                this.out.p1(bufferSize + bufferSize + 3 + 14);
            } else if (type === 2) {
                this.out.p1Enc(ClientProt.MOVE_OPCLICK);
                this.out.p1(bufferSize + bufferSize + 3);
            }

            this.out.p2_alt3(startX + this.mapBuildBaseX);
            this.out.p1(this.keyHeld[5] === 1 ? 1 : 0);
            this.out.p2_alt3(startZ + this.mapBuildBaseZ);

            this.minimapFlagX = this.routeX[0];
            this.minimapFlagZ = this.routeZ[0];

            for (let i: number = 1; i < bufferSize; i++) {
                length--;
                this.out.p1(this.routeX[length] - startX);
                this.out.p1_alt3(this.routeZ[length] - startZ);
            }

            // src→dest inclusive (fullRev is dest→src). Used by pathScenePaint client trail.
            this.lastWalkPathLocal = fullRev.slice().reverse();
            return true;
        }

        this.lastWalkPathLocal = [];
        return type !== 1;
    }`,
  'tryMove fullRev lastWalkPathLocal'
);

// Banner at top
src =
  `/**
 * GENERATED — do not edit.
 * Pure source: vendor/client-ts/src/client/Client.ts
 * Inject: tools/harness/inject-client.mjs
 * Re-run: bun tools/harness/build-client.mjs
 */
` + src;

src = rewriteImports(src);

// Sanity: pure markers must not remain for Canvas
if (src.includes("from '#/") || src.includes('#3rdparty')) {
  fail('import rewrite left unresolved #/ or #3rdparty imports');
}
if (!src.includes('lastWalkPathLocal')) fail('missing lastWalkPathLocal after inject');
if (!src.includes('onAfterWorldRender()')) fail('missing onAfterWorldRender after inject');
if (!fs.existsSync(path.join(PURE_SRC, 'client/Client.ts'))) fail('pure Client missing');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, src);
console.log(`[inject-client] wrote ${OUT} (${src.split('\n').length} lines from pure)`);
