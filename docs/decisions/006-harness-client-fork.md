# Decision 006 — Harness hooks via build inject (not pure Client-TS edits)

**Date:** 2026-08-04  
**Status:** accepted (revised same day — inject replaces full Client.ts fork)  

## Decision

**Do not add harness/nav/debug hooks to pure `vendor/client-ts`.**  
Harness playable extensions are applied at **build time** from pure Client:

| Artifact | Role |
|----------|------|
| `vendor/client-ts` | Oracle Java 377 1:1; pure `client.js` / `rs2.html` |
| `tools/harness/inject-client.mjs` | Surgical injects into a generated Client |
| `tools/harness/.generated/Client.ts` | Generated harness Client (gitignored) |
| `tools/harness/client-fork/Canvas.ts` | Pixel-scaled canvas2d only |
| `tools/harness/build-client.mjs` | inject → bundle `harness-client.js` |

Shared types/configs still import from pure Client-TS. Only **Client (+ Canvas)** differ for harness.

## Why inject (not a maintained full fork)

- Path paint / `lastWalkPathLocal` / `onAfterWorldRender` are **not** in Java Client.
- A full copied `Client.ts` (~13k lines) drifts and forces dual maintenance.
- Inject keeps pure as the single source; rebuild fails if anchors move.

## Inject surface (keep small)

- Field: `lastWalkPathLocal`
- Methods: `onAfterWorldRender`, `projectAreaGame`
- Call sites: after `removeSprites`; tryMove trail capture
- Canvas: fork file only

## Related

- Decision 004 client vs bot/harness boundary  
- Decision 005 nav port  
- `tools/harness/client-fork/README.md`  
- `tools/harness/client-fork/HARNESS_ADDONS.md`  
