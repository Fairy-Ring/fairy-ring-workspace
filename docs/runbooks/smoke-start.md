# Smoke start — isolated rev 377 engine

## Prerequisites

- Node.js suitable for the engine tree (see engine `package.json` / README)
- Clones at `vendor/engine` + `vendor/content` (see `vendor-layout.md`)
- Isolation applied (`isolation.md`) — ports **81** / **43595** / **8899** free
- Optional cache under `cache/openrs2-377/` — download yourself; never commit (`cache/README.md`, OpenRS2 id **657**)

## Start

```bash
export RS2_R377_ROOT=/path/to/fairy-ring-workspace
cd "$RS2_R377_ROOT"

bash scripts/apply-isolation-config.sh

cd vendor/engine
npm install   # first time
npm start     # long-running
```

## Expected

| Check | Expect |
|-------|--------|
| Process stays up | no immediate crash |
| Web | `http://127.0.0.1:81/` |
| Management | `http://127.0.0.1:8899/` (upstream setup UI, if enabled) |
| Game | listening on **43595** |
| Logs | revision **377**; content via `BUILD_SRC_DIR=../content` |

## Quick checklist

```text
[ ] Server from vendor/engine only (cwd = vendor/engine)
[ ] WEB_PORT=81 (not 8891)
[ ] Open web client / harness page
[ ] Create or login a local test account
[ ] Enter world, walk a few tiles
[ ] Logout / relog if you care about save
```

## Failure triage

| Symptom | Check |
|---------|-------|
| EADDRINUSE | another process on 81/43595/8899; stop it or change isolation carefully |
| Cannot find content | `BUILD_SRC_DIR=../content`; start from `vendor/engine` |
| Pack errors | content incomplete or pack step failed — read engine log |
| Wrong revision | `ENGINE_REVISION=377` in `.env` |
| CRC / blank client | WEB_PORT must match client portOffset (**81** for offset 1) |

## Related

- `isolation.md` · `vendor-layout.md` · `harness.md` · `client-ts.md`  
