#!/usr/bin/env bun
/**
 * Print PathFinder.walkable rings from collision.lcnav.gz.
 * Usage: bun tools/harness/nav/tools/probe-walkable.mjs x,z,level [x,z,level ...]
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PathFinder } from '../PathFinder.ts';

const here = dirname(fileURLToPath(import.meta.url));
const packPath = join(here, '../out/collision.lcnav.gz');
let pack = new Uint8Array(readFileSync(packPath));
if (pack[0] === 0x1f && pack[1] === 0x8b) {
    pack = gunzipSync(pack);
}
const pf = new PathFinder(pack);

function ring(x, z, level, r = 2) {
    console.log(`--- ${x},${z} L${level} walkable=${pf.walkable(x, z, level)} ---`);
    for (let dz = r; dz >= -r; dz--) {
        let row = '';
        for (let dx = -r; dx <= r; dx++) {
            const ok = pf.walkable(x + dx, z + dz, level);
            row += ok ? '.' : '#';
        }
        console.log(row + `  z${z + dz >= 0 ? '+' : ''}${z + dz}`);
    }
    const next = [];
    for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1]
    ]) {
        if (pf.walkable(x + dx, z + dz, level)) {
            next.push(`${x + dx},${z + dz}`);
        }
    }
    console.log(`adj walkable: ${next.join(' ') || '(none)'}`);
}

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('usage: bun probe-walkable.mjs x,z,level [...]');
    process.exit(2);
}
for (const a of args) {
    const [xs, zs, ls] = a.split(',');
    ring(Number(xs), Number(zs), Number(ls ?? 0));
}
