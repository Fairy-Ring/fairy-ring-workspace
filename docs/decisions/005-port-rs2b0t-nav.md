# Decision 005 — Port rs2b0t navigation (not invent)

**Date:** 2026-08-04  
**Status:** accepted  
**Context:** Tutorial island thrash + Lumbridge bank thrash from fire-and-forget `tryMove` / Chebyshev `walkToward` without world collision, door graph, or reach.

## Decision

**Rip navigation from rs2b0t (274-proven), rebind to the 377 harness adapter, rebuild collision/door packs from *this* content.** Do not invent a second walker.

### Upstream model (do not misread “nav v2”)

From rs2b0t `docs/NAV.md` and `docs/nav-v2/`:

> **One walker, two modes.** `classic` (default) vs `v2` is a **feature gate on a single stack**, not two engines.

| | |
|--|--|
| **Shared stack (what we port)** | `PathFinder`, `WalkExecutor`, `exec/*`, `loadTransportGraph`, `data/*`, travel catalog / specialRequires / WorldState helpers (code under `v2/` is **mostly shared**) |
| **Mode gate only** | `navEngine === 'v2'` turns on: tele catalog inject, path-scoped bank, hop logs |
| **Default for harness** | **`classic`** — no surprise spell teles / bank-for-runes |

**Do not** plan a “classic-only thin port” that strips `v2/` as if that were pre-nav-v2. Classic **today** is the shared stack with those three features **off**. Historical pre-v2 (`bce3c6e`) is an audit baseline only.

Sources: rs2b0t `docs/NAV.md` § One walker; `docs/nav-v2/README.md`; `docs/nav-v2/CLASSIC-PARITY.md`.

| Keep from rs2b0t (shared stack) | Update for 377 |
|--------------------------------|----------------|
| `PathFinder` + pack load (+ worker optional) | Rebuild `collision.lcnav.gz` from **this** engine pack maps |
| `WalkExecutor` + `exec/` door/transport | Re-derive or re-validate `doors.json` / stairs against 377 maps |
| `Traversal.walkTo` / `walkResilient` | Adapter: harness `actions` / `reader` only |
| `loadTransportGraph` + travel catalog shape | Content deltas 274→377 as needed |
| Default `navEngine: 'classic'` | Leave v2 tele/bank inject off until wanted |

## Placement (boundary)

Per **Decision 004** (client pure; bot later in `vendor/rs2b0t`):

| Phase | Where |
|-------|--------|
| **Now (harness iteration)** | `tools/harness/nav/**` (adapted copy) + pack under `tools/harness/nav/out/` or `.tmp/nav/` |
| **Later (bot product)** | Merge into `vendor/rs2b0t` when vendored; harness becomes a thin consumer |

- **Never** import nav into `vendor/client-ts`.
- Read-only reference: `read-only rs2b0t tree (if present)` (do not commit there for this project).

## Why not keep patching `walkToward`

Scene-local `tryMove` + short steps cannot:

1. Know closed gates / wall collision outside the loaded scene  
2. Plan “walk to stand → OPLOC Open → continue” as one route  
3. Cross castle doors to bank booth (current Path B stuck)

rs2b0t already solved world walking; 377 work is **data + adapter**, not algorithm.

## Non-goals (first vertical slice)

- Turning on **v2 mode** (tele inject / path-scoped bank / hop logs) by default  
- MultiBox / full BotHost settings UI  
- Fairy rings / post-era matrix  

Still **in** first slice: shared walk stack under **classic**, collision pack, doors on graph, **path paint for debug**.

## Anti-pattern: piecemeal hop patches (2026-08-04)

**Do not** burn sessions fixing one transport type at a time in a thin `WalkAlong` (`Balance` log, then `Walk-across`, then …). Upstream **rs2b0t already solved** hop execution:

| Upstream | Role |
|----------|------|
| `WalkExecutor.ts` (~1.1k lines) | Full classic follow + `handleTransport` |
| `exec/transportLoc.ts` | Loc match + action aliases + landing |
| `exec/doorCrossing.ts` | Multi-tile doors / stall open |
| `exec/specialCrossing.ts` | Dialogue/toll/item gates |

Harness currently has a **partial** port (`WalkAlong` + thin `exec/transportLoc`). Ladder Climb worked; Karamja **A wooden log / Balance** failed because matching is incomplete — that is a signal to **lift the full executor**, not to add another `if (/balance/)`.

**Policy going forward**

1. **Classic executor landed (2026-08-04):** `tools/harness/nav/browser/WalkExecutor.ts` + `exec/{transportLoc,doorCrossing,specialCrossing,questLock}.ts` + `shims/GameMessages.ts`. `walkTo` wires through full classic stack (no piecemeal WalkAlong hops). Plan: `docs/plans/2026-08-04-nav-full-executor-port.md`.  
2. **Still forbidden:** inventing hop algorithms or one-off loc hardcodes in quest modules — fix data or extend `exec/*`.  
3. **Gaps:** specialCrossing unlockQuest/Banking; live smoke Path ABC / TBWT wooden log still operator-owned.
## Path paint (in scope now — debug)

Upstream (both classic and v2): `PathPublish` + `pathScenePaint` / `pathOverlay` / `pathPaintTheme`.

| Piece | Role | Harness note |
|-------|------|----------------|
| `PathPublish` | Session store; WalkExecutor sets active route | Port with WalkExecutor — free |
| `pathScenePaint` | Tile quads into **game surface** post-world 3D | Need post-world draw hook on **harness client only** (rs2b0t: `BotClient.onAfterWorldRender`). **Not** pure Client-TS. |
| `pathOverlay` | HTML hop labels / click outline | Mount on harness panel or `#game-stage` overlay |
| `showNavPath` | Operator toggle | Default **on** for headed path-abc/nav smokes; env `NAV_PAINT=0` to disable |

True z-buffer under models is out of scope (upstream says needs World inject). Object-hull hop highlight + path quads + labels are enough for “why did it walk there?”

## First vertical slice

1. Port shared stack (not a stripped “v1”) + pack builder pointed at `vendor/engine`  
2. Build pack; `findPath` smoke (lumb spawn → bank stand)  
3. `Traversal.walkTo` on harness adapter; Path B bank uses it  
4. Wire **path paint**: PathPublish + scene paint hook + optional HTML labels; toggle for headed runs  
5. Tutorial stage-owned OPLOC for special tut gates until door derive covers them  

## Follow-up (2026-08-09) — re-rip as upstream settles

**Not a commitment to product↔product sync.** Harness stays under `tools/harness/nav/**` until a deliberate `vendor/rs2b0t` phase.

Upstream rs2b0t nav is **actively settling** (stall ladder, door strikes, expansion budget, path-cost time, travel-corpus harness honesty, stuck-abort / sustain tools). A large slice of **maps / transports / door semantics** is shared with 377, but **revision-to-revision drift** (loc flags, multiloc, stairs, content-era edges) will keep invalidating frozen assumptions in a one-shot rip.

**Worth investigating (when 377 harness is stable enough to benefit):**

1. **Periodic re-rip inventory** of `WalkExecutor` + `exec/*` + PathFinder edge-cost / stall / door-session behaviour from a pinned rs2b0t commit — not continuous merge thrash.  
2. **Re-bake packs from *this* content** after each rip (collision, doors, stairs); never assume 274 lcnav == 377 live scene.  
3. **Diff before lift:** hop thrash and stuck families seen in 377 smokes (log Balance, gates, prison doors, dungeon egress) against current upstream fixes — only port what maps to our FAIL patterns.  
4. **Keep research-only** for bake-level issues (e.g. LocType multiloc op 77) — write-ups in `docs/research/nav-multiloc-collision.md`; do **not** maintain a parallel bake fork to push back into rs2b0t product.  
5. **Tools-only patterns** (scene-ready seed, throttled sustain, stuck abort vs path-cost) may land in rs2b0t `tools/` independently; that is **not** a product nav port.

**Operator cue:** when quest residual is blocked on walker thrash that upstream already fixed, open a short re-rip plan with **source commit + FAIL list + pack rebuild steps** — not “merge main nav.”

## Related

- `docs/plans/2026-08-04-nav-port-plan.md`  
- `docs/plans/2026-08-04-combat-pen-geometry.md`  
- `docs/plans/2026-08-06-nav-rip-failfast.md`  
- `docs/research/nav-multiloc-collision.md`  
- rs2b0t `docs/NAV.md`, `docs/nav-v2/*`  
- Decision 004 client/bot boundary  

