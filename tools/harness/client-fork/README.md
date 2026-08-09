# Harness client pieces (not a full Client fork)

**Pure play:** `vendor/client-ts` — Java 377 1:1, no harness hooks.

**Harness Client class:** generated at build time from pure Client:

```bash
bun tools/harness/inject-client.mjs   # alone
bun tools/harness/build-client.mjs    # inject + bundle → harness-client.js
```

Output: `tools/harness/.generated/Client.ts` (gitignored). Do **not** hand-edit it.

## What still lives here

| Path | Purpose |
|------|---------|
| `Canvas.ts` | Pixel-scaled canvas2d (`imageSmoothingEnabled = false`) |
| `HARNESS_ADDONS.md` | Inventory of injects (anchors + symbols) |
| ~~`Client.ts`~~ | **Removed** — was a full copy; inject replaces it |

Config / dash3d / io still load from **`vendor/client-ts/src`**.

## Adding a new harness hook

1. Document the pure-Client **anchor** in `HARNESS_ADDONS.md`.
2. Add a surgical replace/insert in `tools/harness/inject-client.mjs`.
3. Rebuild; if the pure anchor drifted, inject **fails loud** (no stale fork).

## Boundary

- Decision 004 — client vs bot/harness  
- Decision 006 — hooks via build inject, not edits under pure Client-TS  
