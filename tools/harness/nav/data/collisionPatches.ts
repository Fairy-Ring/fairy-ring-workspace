/**
 * Harness-only post-load collision pack patches.
 *
 * Prefer authentic transport hops (doors, agility locs) over inventing walk
 * gaps through solid walls. See `docs/plans/2026-08-05-outpost-wallgrill-collision.md`.
 *
 * Exit dir bits: N=1<<0 E=1<<1 S=1<<2 W=1<<3 NE=1<<4 SE=1<<5 SW=1<<6 NW=1<<7
 * Wall nibble:   N=1 E=2 S=4 W=8
 */
import type { PathFinder } from '../PathFinder.ts';

const EXIT_E = 1 << 1;
const EXIT_W = 1 << 3;
const WALL_E = 2;
const WALL_W = 8;

/**
 * Horror broken bridge gap: L0 2597,3608 is unwalkable and seals the lighthouse
 * peninsula (768 tiles) from the east pier. Pack has no pure-walk detour;
 * live USELOC on the right half CANT_REACH from the left stand.
 *
 * Open the single gap tile so A* / client can step west↔east after the left
 * plank is fixed (quest still requires both halves via content vars).
 * Not a substitute for Obstacle pipe / wallgrill (do not reopen those).
 */
export function applyCollisionPatches(finder: PathFinder): void {
    const x = 2597;
    const z = 3608;
    const level = 0;
    finder.setWalkable(x, z, level, true);
    finder.clearWallBits(x, z, level, WALL_E | WALL_W);
    finder.clearWallBits(x - 1, z, level, WALL_E);
    finder.clearWallBits(x + 1, z, level, WALL_W);
    finder.orExitMask(x, z, level, EXIT_E | EXIT_W);
    finder.orExitMask(x - 1, z, level, EXIT_E);
    finder.orExitMask(x + 1, z, level, EXIT_W);
}
