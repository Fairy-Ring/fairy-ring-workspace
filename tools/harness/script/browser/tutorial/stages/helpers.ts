/**
 * Shared tutorial stage helpers — port of rs2b0t tutorial/stages/helpers.
 *
 * World tiles for static locs come from content map **m48_48.jm2** (mapsquare 48,48
 * base = 48*64 = 3072) + `pack/loc.pack` ids. Do not invent / guess coordinates.
 *
 * | id   | debug name           | local  | world      |
 * |------|----------------------|--------|------------|
 * | 3014 | newbie_door1         | 26,35  | 3098,3107  |
 * | 3015 | newbiegateclosedl2   | 17,20  | 3089,3092  |
 * | 3016 | newbiegateclosedr2   | 17,19  | 3089,3091  |
 * | 3017 | newbie_door2 (chef in) | 7,12 | 3079,3084  |
 * | 3018 | newbie_door3 (chef out)| 0,18 | 3072,3090  |
 * | 3019 | newbie_door4 (quest) | 14,54  | 3086,3126  |
 */
/** walkToward → classic nav pack (doors/path); tryMove only if pack missing. */
export { walkToward, doorAt, Traversal } from '../../api.ts';

/** newbie_door4 — door into quest guide hall */
export const QUEST_GUIDE_DOOR = { x: 3086, z: 3126 };

/**
 * Master Chef kitchen is **L-shaped** (screenshots docs/plans/chef-shots/):
 * - Main checkerboard room + NW wing toward exit
 * - **Door-in** (3017): east wall of main room @ 3079,3084 — approach from **outside east** (3080,3084)
 * - **Door-out** (3018): west wall of NW wing @ 3072,3090 — only after music tab
 * Never walkToward(interior) from outside: pathfinding routes *around* the L (south)
 * instead of through the door.
 */
/** newbie_door2 — east entrance into master chef house (map angle=0 west, shape wall) */
export const CHEF_DOOR_IN = { x: 3079, z: 3084 };
/**
 * Stand **same x as door**, one tile south (or north) before Open.
 * Content `check_axis` for west/east doors is true only when player.x === door.x;
 * that is passed as `$entering` to `open_and_close_door`. If false (approach from
 * pure east x=3080), server only teleports *onto* the door tile and never walks
 * through to the interior (dest = loc_coord, no door_open offset).
 */
export const CHEF_DOOR_IN_OUTSIDE = { x: 3079, z: 3083 };
/** After open_and_close with entering=true: door_open(west)=(-1,0) → 3078,3084 */
export const CHEF_DOOR_IN_INSIDE = { x: 3078, z: 3084 };
/** newbie_door3 — west exit from master chef house */
export const CHEF_DOOR_OUT = { x: 3072, z: 3090 };
/** Just inside door-out (east of west wall) */
export const CHEF_DOOR_OUT_INSIDE = { x: 3073, z: 3090 };

/**
 * Survival → chef gate (pair). Content `tut_island_survial_gate` / `_tutorial_gate`.
 * Open while still **east** of gate (x > 3089); west-of-gate Open teleports east (bounce).
 */
export const SURVIVAL_GATE = { x: 3089, z: 3091 };
export const SURVIVAL_GATE_N = { x: 3089, z: 3092 };
/** West of this x = past the survival gate toward chef. */
export const SURVIVAL_GATE_X = SURVIVAL_GATE.x;

export const MINE_Z = 9000;
