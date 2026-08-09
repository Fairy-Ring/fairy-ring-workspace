# Harness nav (rs2b0t shared stack, classic mode)

Port of rs2b0t world-walking for Fairy Ring (rev 377 focus). **One walker** — default `classic` (no tele inject).

Upstream: rs2b0t tree (read-only ref if present) `docs/NAV.md`, `docs/nav-v2/`.

## Build collision pack

```bash
export RS2_R377_ROOT=/path/to/fairy-ring-workspace
bun tools/harness/nav/tools/build-collision.ts \
  --engine "$RS2_R377_ROOT/vendor/engine" \
  --members true \
  --no-verify
# → tools/harness/nav/out/collision.lcnav(.gz)
```

Requires `fflate` (under `tools/harness/nav/`).

## Regenerate transport map (doors / stairs / ladders)

**Locs move between revs** — do not ship 274 `doors.json` / ladder edges against a 377 pack.

Tooling is adapted from rs2b0t `tools/nav/` into `tools/harness/nav/tools/`:

| Tool | Output |
|------|--------|
| `derive-doors.ts` | `data/doors.json` — openable wall placements from engine maps |
| `derive-stairs.ts` | `data/stairEdges.json` — stairs.rs2 + generic ladder locs |
| `derive-ladders.py` | merges scripted ladder hops into transports + stairs |
| `enrich-transports.py` | binds `locId` / `locX` / `locZ` / options from **377 content** maps |
| `derive-transports.sh` | runs stairs → ladders → enrich in order |

```bash
export RS2_R377_ROOT=/path/to/fairy-ring-workspace
cd "$RS2_R377_ROOT"

# 1) doors (map wall Open ops)
bun tools/harness/nav/tools/derive-doors.ts

# 2) stairs + ladders + loc metadata (needs collision pack + content)
bash tools/harness/nav/tools/derive-transports.sh
```

Defaults: `ENGINE_DIR=$RS2_R377_ROOT/vendor/engine`, `CONTENT_DIR=$RS2_R377_ROOT/vendor/content`,
pack `$RS2_R377_ROOT/tools/harness/nav/out/collision.lcnav.gz`, data `$RS2_R377_ROOT/tools/harness/nav/data/`.

**Curated** ship/gangplank/shortcut rows stay in `transports.json` and are re-enriched against 377 maps (NPC ships have no locId — expected).

Pre-regen snapshot lives under `data/.bak-pre-377-derive/` (gitignored optional).

### 2026-08-04 regen (content `rs2-r377` @ 7d7719693)

| File | Before (274 copy) | After 377 derive |
|------|-------------------|------------------|
| `doors.json` | 1059 | **2793** |
| `transports.json` | 304 | **720** (173 active; rest disabled ladder inventory) |
| `stairEdges.json` | 1032 | **1001** |

Offline smoke after regen: Lumbridge courtyard → bank L2 **ok** (cost ~58, 4 door/stair hops). Tutorial island mine/rat gates appear as doors near 3094,9502 / 3111,9518.

## Harness client

`bun tools/harness/build-client.mjs` copies the `.gz` pack to `public/harness/` and bundles:

- `PathFinder` + door/stair/transport graph (**377-derived** data)
- `walkTo` → **WalkExecutor** classic (doors, Climb, Balance/Cross, specialCrossing, multi-tile)
- Path paint: scene **tile quads** (`pathScenePaint` / `projectTileQuad`); optional hop labels (`PATH_PAINT_DOM=1`)

## Script API

```ts
import { Traversal } from '…/api.ts';
await Traversal.walkTo({ x: 3208, z: 3220 }, { radius: 2, log: m => bot.log(m) });
```

Fallback: `walkToward` if pack missing.

## Transport hops — **full classic executor landed**

`walkTo` → **`browser/WalkExecutor.ts`** (rs2b0t classic path) + `exec/*`:

| Module | Role |
|--------|------|
| `WalkExecutor.ts` | followPath, handleTransport, repath, CANT_REACH |
| `exec/transportLoc.ts` | loc match + **action synonyms** (Balance↔Cross↔Walk-across) + landing |
| `exec/doorCrossing.ts` | multi-tile Open / stall nearby door |
| `exec/specialCrossing.ts` | tolls / NPC ships / use-item (unlockQuest soft-fail) |
| `exec/questLock.ts` | blacklist dialogue |
| `shims/GameMessages.ts` | CANT_REACH via chat snapshot |

`WalkAlong.ts` is a **compat re-export** only — do not add hop `if`s there.

Classic only (no default v2 tele / bank-for-runes). Decision 005.

**Plan / status:** `docs/plans/2026-08-04-nav-full-executor-port.md`  

## Path paint (classic dual trail)

Default **on** — scene tile quads in `pathScenePaint` (fork `onAfterWorldRender`):

| Layer | Colour | Source |
|-------|--------|--------|
| **Pack / baked** | **Red** (green hops) | `PathPublish.tiles` from PathFinder dense path |
| **Client tryMove** | **Cyan** walk / **cyan+yellow checker** when run | `lastWalkPathLocal` after each accepted click |
| Click target | White outline | `clickIdx` on pack path |

Off: `?NAV_PAINT=0`. Hop labels only: `?PATH_PAINT_DOM=1` (no dots).

## Path camera follow

Port of rs2b0t `navCameraFollow` / `cameraFollow.ts`. While walking, eases orbit
yaw toward the path heading (lookahead ~12 tiles, stops at transport boundaries).

| | |
|--|--|
| Default | **ON** for harness (`?NAV_CAMERA=0` to disable) |
| Sample | each follow tick via `pathFacingYaw` |
| Ease | rAF + `onAfterWorldRender` backup |
| Adapter | `reader.cameraYaw` / `actions.setCameraYaw` |

## Offline smoke

```bash
cd tools/harness/nav && bun -e '/* PathFinder + doors/transports/stairs json */'
```

See `docs/plans/2026-08-04-nav-port-plan.md`, `docs/decisions/005-port-rs2b0t-nav.md`.
