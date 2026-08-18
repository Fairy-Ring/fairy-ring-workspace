/**
 * Pack server inv.dat + npc.dat only.
 * Does not open FileStream and does not wipe main_file_cache.
 *
 * packAll currently dies on leftover [rune_essence_table] success_message
 * (known 2026-08-17). Shop leftover is server inv + NPC params only —
 * client already has Rokuh op3=Trade.
 *
 *   cd vendor/engine && BUILD_SRC_DIR=../content npx tsx ../../scripts/pack-inv-npc-only.ts
 */
import ParamType from '#/cache/config/ParamType.js';
import Environment from '#/util/Environment.js';
import { loadDir } from '#tools/pack/NameMap.js';
import { revalidatePack } from '#tools/pack/PackFile.js';
import { packInvConfigs, parseInvConfig } from '#tools/pack/config/InvConfig.js';
import { packNpcConfigs, parseNpcConfig } from '#tools/pack/config/NpcConfig.js';
import { CONSTANTS, readConfigs, readDirTree } from '#tools/pack/config/PackShared.js';

loadDir(`${Environment.BUILD_SRC_DIR}/scripts`, '.constant', src => {
    for (let i = 0; i < src.length; i++) {
        if (!src[i] || src[i].startsWith('//')) {
            continue;
        }
        const parts = src[i].split('=');
        if (parts.length !== 2) {
            throw new Error(`Bad constant declaration on line: ${src[i]}`);
        }
        let name = parts[0].trim();
        const value = parts[1].trim();
        if (name.startsWith('^')) {
            name = name.substring(1);
        }
        CONSTANTS.set(name, value);
    }
});

const dirTree = new Set<string>();
readDirTree(dirTree, `${Environment.BUILD_SRC_DIR}/scripts`);
// Live unpack is _unpack/377. Leftover 727 dumps are reference only and
// name post-377 objs (packAll dies on them if it reaches .inv).
for (const path of [...dirTree]) {
    if (path.includes('/_unpack/727/') || path.includes('/_unpack/289/')) {
        dirTree.delete(path);
    }
}

async function main() {
    await revalidatePack();
    ParamType.load('data/pack');

    const noOp = () => {};

    await readConfigs(dirTree, '.inv', [], [], parseInvConfig, packInvConfigs, noOp, (dat, idx) => {
        dat.save('data/pack/server/inv.dat');
        idx.save('data/pack/server/inv.idx');
        dat.release();
        idx.release();
    });
    console.log('packed data/pack/server/inv.dat (no cache wipe)');

    await readConfigs(dirTree, '.npc', [], [], parseNpcConfig, packNpcConfigs, noOp, (dat, idx) => {
        dat.save('data/pack/server/npc.dat');
        idx.save('data/pack/server/npc.idx');
        dat.release();
        idx.release();
    });
    console.log('packed data/pack/server/npc.dat (no cache wipe)');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
