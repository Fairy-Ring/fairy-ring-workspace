# Runbook — isolation

**Workspace root:** `$RS2_R377_ROOT`  
**Purpose:** Run this rev‑377 stack without colliding with another local RS2/Lost City world.

---

## Ports (this project)

Java client couples HTTP and game via one **portOffset**:

| Service | Value | Formula |
|---------|------:|---------|
| Web / CRC HTTP | **81** | `80 + portOffset` (`portOffset=1`) |
| Game TCP | **43595** | `43594 + portOffset` |
| Management | **8899** | fixed isolation default |
| Node id | **37** | |
| Revision | **377** | |

**Do not** set `WEB_PORT=8891` with `portOffset=1` — CRC fetch breaks.

Keep login/friend/logger servers **off** for single-process smoke unless you know you need them.

Apply:

```bash
export RS2_R377_ROOT=/path/to/fairy-ring-workspace
cd "$RS2_R377_ROOT"
bash scripts/apply-isolation-config.sh
```

### Minimal `vendor/engine/.env`

```bash
WEB_PORT=81
WEB_MANAGEMENT_PORT=8899
NODE_PORT=43595
NODE_ID=37
ENGINE_REVISION=377
EASY_STARTUP=true
BUILD_SRC_DIR=../content
LOGIN_SERVER=false
FRIEND_SERVER=false
LOGGER_SERVER=false
```

Confirm defaults in `vendor/engine` env docs / `Environment.ts` when present.

---

## Other local stacks (optional)

If you also run a live 274 Server, rs2b0t, or another engine tip on the same machine:

| Do | Do not |
|----|--------|
| Point **this** project only at `$RS2_R377_ROOT/vendor/*` | `npm start` / checkout into those other trees “for” this project |
| Use isolation ports **81 / 43595 / 8899** | Bind stock **80 / 43594** if another world already owns them |
| Kill harness via project scripts under this root | Blind `pkill playwright` / kill the other world’s game port |

**Never push** experiment work to `LostCityRS/*` without explicit permission.

---

## Sanity checks

```bash
# Listening ports (macOS/Linux examples)
lsof -nP -iTCP:81 -sTCP:LISTEN
lsof -nP -iTCP:43595 -sTCP:LISTEN
lsof -nP -iTCP:8899 -sTCP:LISTEN
```

Open browser: `http://127.0.0.1:81/` (or harness URL from engine docs).

---

## Related

- `docs/runbooks/smoke-start.md` — start engine  
- `docs/runbooks/vendor-layout.md` — clones under `vendor/`  
- `cache/README.md` — OpenRS2 **657** (not path id 377)  
