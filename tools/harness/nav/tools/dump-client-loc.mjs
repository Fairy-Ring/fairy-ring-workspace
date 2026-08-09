import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Reader, loadLocTypes } from './lib.ts';
import { bunzip2 } from '../../io/BZip2.js';

const engine = path.resolve(fileURLToPath(import.meta.url), '../../../../../vendor/engine');
const engineDir = '/Users/acfrazier/experiments/LC-rs2-r377-2006-05-02/vendor/engine';

class JagArchive {
  constructor(src) {
    let reader = new Reader(src);
    const unpackedSize = reader.g3();
    const packedSize = reader.g3();
    if (unpackedSize === packedSize) {
      this.data = src;
      this.compressWhole = false;
    } else {
      this.data = bunzip2(src.subarray(6));
      reader = new Reader(this.data);
      this.compressWhole = true;
    }
    const fileCount = reader.g2();
    let pos = reader.pos + fileCount * 10;
    this.fileHash = [];
    this.filePackedSize = [];
    this.filePos = [];
    for (let i = 0; i < fileCount; i++) {
      this.fileHash[i] = reader.g4s();
      reader.g3();
      this.filePackedSize[i] = reader.g3();
      this.filePos[i] = pos;
      pos += this.filePackedSize[i];
    }
  }
  static genHash(name) {
    let hash = 0;
    name = name.toUpperCase();
    for (let i = 0; i < name.length; i++) hash = (hash * 61 + name.charCodeAt(i) - 32) | 0;
    return hash;
  }
  read(name) {
    const hash = JagArchive.genHash(name);
    const index = this.fileHash.indexOf(hash);
    if (index === -1) return null;
    const src = this.data.subarray(this.filePos[index], this.filePos[index] + this.filePackedSize[index]);
    return this.compressWhole ? src : bunzip2(src);
  }
}

function decodeLoc(dat) {
  const out = { ops: [null,null,null,null,null], name: null, active: -1 };
  while (dat.available > 0) {
    const code = dat.g1();
    if (code === 0) break;
    if (code === 1) {
      const c = dat.g1();
      for (let i = 0; i < c; i++) { dat.g2(); dat.g1(); }
    } else if (code === 2) out.name = dat.gjstr();
    else if (code === 3) dat.gjstr();
    else if (code === 5) {
      const c = dat.g1();
      for (let i = 0; i < c; i++) dat.g2();
    } else if (code === 14 || code === 15) dat.g1();
    else if (code === 17 || code === 18) {}
    else if (code === 19) out.active = dat.g1();
    else if ([21,22,23,25,62,64,73,74].includes(code)) {}
    else if ([24,60,61,65,66,67,68].includes(code)) dat.g2();
    else if ([28,69,75].includes(code)) dat.g1();
    else if (code === 29 || code === 39) dat.g1b();
    else if (code >= 30 && code < 39) {
      out.ops[code - 30] = dat.gjstr();
    } else if (code === 40) {
      const c = dat.g1();
      for (let i = 0; i < c; i++) { dat.g2(); dat.g2(); }
    } else if (code === 70 || code === 71 || code === 72) dat.g2s();
    else if (code === 77) {
      dat.g2(); dat.g2();
      const count = dat.g1();
      for (let i = 0; i <= count; i++) dat.g2();
    } else {
      console.warn('unknown code', code);
      break;
    }
  }
  return out;
}

const jag = new JagArchive(new Uint8Array(fs.readFileSync(path.join(engineDir, 'data/pack/client/config'))));
const locDat = jag.read('loc.dat');
const locIdx = jag.read('loc.idx');
if (!locDat || !locIdx) throw new Error('no loc in client config');

// LocType.init: idx[0]=2; for id: size=g2; idx[id+1]=offset; offset+=size
const idx = new Reader(locIdx);
const count = idx.g2();
const offsets = new Int32Array(count + 1);
let offset = 2;
offsets[0] = offset;
for (let id = 0; id < count; id++) {
  // Wait - Java style is different. Client-ts LocType.init:
  // read file LocType.ts fully
}

// Read LocType.init from source via shell
