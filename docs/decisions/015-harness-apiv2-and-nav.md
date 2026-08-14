# Decision 015 — Harness apiv2 + PR 604 traveller

**Date:** 2026-08-14  
**Status:** accepted  
**Parents:** Decision **004** (client vs harness) · Decision **005** (377 collision, not 274 graph) · Decision **011** (thin public surface)  
**Upstream:** [rs2b2t/rs2b0t#604](https://github.com/rs2b2t/rs2b0t/pull/604) (open) — `do-not-touch/apiv2`

## Decision

The contributor harness surface is **one observation per tick, send that returns immediately, wait by naming evidence**, plus the **PR 604 hop-splitting traveller**. It lives under `tools/harness/` only. Pure Client-TS stays untouched.

We do **not** import their 274 content graph, wasm pathfinder bundle, or BotHost. Collision / doors / stairs stay **377-derived** (`tools/harness/nav/out/collision.lcnav.gz`, Decision **005**).

| Steal | Keep ours |
|-------|-----------|
| One snapshot → query (`ReadContext`) | 377 pack + `PathFinder` |
| Send vs confirm (`interact` / `walk` then `perform` / `until`) | `handleTransport` for doors / stairs / exactmove |
| Evidence helpers (`arrived`, `said`, `itemDelta`, `optionGone`) | Isolation ports, Playwright host |
| Traveller: furthest in-scene click, shrink reach on `unreachable`, scene-ready wait | Existing 169 vault smokes (WalkExecutor default) |

**Adopt now (2026-08-14):** `Traversal.walkTo` defaults to `travelTo` (PR 604 hop-splitter + 377 pack + `WalkExecutor.crossTransport` for doors/stairs). WalkExecutor remains the fallback when travel ends non-arrived, and `opts.engine: 'classic'` forces it. Nested special-crossing walks still call `WalkExecutor.walkTo` so we do not recurse.

## Public export

Decision **011** no longer ships every `quest-*-smoke.mjs`. Public tree gets:

- `tools/harness/lib/` · `attach-in-page.js` · build / client-entry  
- `tools/harness/nav/` (walker + 377 pack, no shot dumps)  
- `tools/harness/apiv2/`  
- **`tools/harness/harness-101-smoke.mjs`** — the copy-this template  

Vault keeps the quest-smoke pile. Contributors clone FR-content for the world and this workspace for the harness API.

## Non-goals this pass

- Vendoring `do-not-touch/apiv2` wholesale  
- Chat sequence numbers / mapFlag (`said` / `serverRefused` are best-effort until attach grows those)  
- Deleting WalkExecutor (it is the door/stair executor + fallback)  
- BotHost / MultiBox  

## Related

- `tools/harness/apiv2/`  
- `tools/harness/harness-101-smoke.mjs`  
- `docs/runbooks/harness.md`  
