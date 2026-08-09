# Harness addons (build inject inventory)

Pure `vendor/client-ts` is **unchanged**. Hooks are applied by
`tools/harness/inject-client.mjs` → `tools/harness/.generated/Client.ts`.

Search inject script for `HARNESS ADDON` / symbol names when pure Client drifts.

## Field

| Symbol | Purpose |
|--------|---------|
| `lastWalkPathLocal` | After successful `tryMove`, **every** local-scene tile src→dest for client-trail paint |

## Methods

| Symbol | Purpose |
|--------|---------|
| `onAfterWorldRender()` | Called after `World.renderAll` while Pix2D is areaGame — path **tile quads** |
| `projectAreaGame(sceneX, sceneZ, height)` | Project ground into 512×334 for paint |

Related **adapter-only** (no Client inject): `orbitCameraYaw` via harness
`actions.setCameraYaw` / `reader.cameraYaw` for path camera follow.

## Call sites (pure-shaped anchors)

1. **drawScene** — after `removeSprites()`, call `this.onAfterWorldRender()`
2. **tryMove start** — `this.lastWalkPathLocal = []`
3. **tryMove path rebuild** — `fullRev` every-tile trail; set `lastWalkPathLocal` on success

## Canvas.ts (fork-only file)

`imageSmoothingEnabled = false` for crisp CSS upscale. Pure `graphics/Canvas.ts` stays stock.
Inject rewrites `#/graphics/Canvas.js` → `../client-fork/Canvas.ts`.

## Recipe

```bash
bun tools/harness/inject-client.mjs   # fail if pure anchors drifted
bun tools/harness/build-client.mjs    # inject + bundle
```

Do **not** grow injects with unrelated refactors — keep patches surgical so pure
Client edits remain 1:1-auditable.
