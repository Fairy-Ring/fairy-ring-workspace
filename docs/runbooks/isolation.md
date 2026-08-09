# Runbook — isolation rules

**Workspace:** `$RS2_R377_ROOT`  
**Purpose:** Keep the rev-377 experiment from corrupting or colliding with the live ~274 stack.

---

## 1. Forbidden paths (no writes, no checkout, no npm start)

| Path | Why |
|------|-----|
| `/Users/acfrazier/experiments/Server` | Live Lost City setup (~274) |
| `/Users/acfrazier/experiments/Server/engine` | Live engine |
| `/Users/acfrazier/experiments/Server/content` | Live content |
| `/Users/acfrazier/code/rs2b2t-engine` | Live engine tip (same family as Server/engine) |
| `/Users/acfrazier/experiments/rs2b0t` | Live bot client |
| `/Users/acfrazier/code/rs2b2t-engine-old` | Ignore |

**Allowed:** read-only reference (diff, inspect configs, copy *into* this workspace).  
**Forbidden:** `git checkout`, commits, `npm install`, `npm start`, editing configs, installing global deps “for” those trees as part of this project.

**Never push** AI or experiment work to `LostCityRS/*`. Use private remotes / private branch names (`rs2-r377`) only under this workspace.

---

## 2. Isolated ports

| Service | This project | Typical live |
|---------|-------------:|-------------:|
| Web / CRC HTTP | **81** (`80 + portOffset`) | 80 / 8890 |
| Game (node) | **43595** (`43594 + portOffset`) | 43594 |
| Management | **8899** | 8898 |
| Node id | **37** | 10 |
| Revision | **377** | 274 |
| Login (if enabled) | **43600** | 43500 |
| Logger (if enabled) | **43601** | 43501 |
| Friend (if enabled) | **45199** | 45099 |

**Java client couples web + game via one `portOffset`.** Isolation uses offset **1** → web **81**, game **43595**.  
Do **not** use `WEB_PORT=8891` with that client — CRC fetch breaks.

Keep `LOGIN_SERVER` / `FRIEND_SERVER` / `LOGGER_SERVER` **false** for simple single-process smoke.  
**2026-08-03 smoke:** pack + world ready OK; defaults `43500/43501/45099` were **EADDRINUSE** (live stack) — always set the shifted ports in `.env`.

---

## 3. Where isolation is applied

| File | Path | Role |
|------|------|------|
| `world.json` | `vendor/engine/data/config/world.json` | Nested config (ports, rev, `build.srcDir`) — used by apply script / management UI parity |
| `.env` | `vendor/engine/.env` | **What 377-wip `Environment.ts` actually reads** at process start |
| `server.json` | `vendor/Server/server.json` | Server shell revision key (`"rev": "377"`) |

Apply / refresh:

```bash
export LC377_ROOT=$RS2_R377_ROOT
cd "$LC377_ROOT"
bash scripts/apply-isolation-config.sh
# Ensure .env matches (apply script updates world.json + server.json;
# recreate .env if missing — see below)
```

### Minimal `.env` for 377-wip runtime

```bash
# vendor/engine/.env
WEB_PORT=8891
WEB_MANAGEMENT_PORT=8899
NODE_PORT=43595
NODE_ID=37
ENGINE_REVISION=377
EASY_STARTUP=true
BUILD_SRC_DIR=../content
```

Confirm defaults in code: `vendor/engine/src/util/Environment.ts`  
(`ENGINE_REVISION` default is already **377** on `rs2-r377` / `377-wip`).

---

## 4. How to verify you are not touching the live stack

### 4.1 CWD and process tree

```bash
# Must be under LC377_ROOT
pwd
# → .../LC-rs2-r377-2006-05-02/...

# Before start: confirm no accidental cd into live trees
echo "$PWD" | grep -E 'LC-rs2-r377-2006-05-02' || echo "WRONG TREE"
```

### 4.2 Snapshot script

```bash
bash scripts/snapshot-status.sh
```

Expect:

- Vendor paths only under `$LC377_ROOT/vendor/`  
- Ports **8891 / 43595 / 8899** and rev **377** in printed configs  
- No requirement to touch live Server

### 4.3 Port listeners (after start)

```bash
lsof -nP -iTCP:8891 -sTCP:LISTEN
lsof -nP -iTCP:43595 -sTCP:LISTEN
lsof -nP -iTCP:8899 -sTCP:LISTEN
# Live stack (should be unrelated; do not kill unless you own it):
# lsof -nP -iTCP:8890,43594,8898 -sTCP:LISTEN
```

### 4.4 Git hygiene

```bash
# Live trees must stay clean of your experiment commits
git -C /Users/acfrazier/experiments/Server status -sb
git -C /Users/acfrazier/code/rs2b2t-engine status -sb

# Work only shows under vendor clones here:
git -C vendor/engine status -sb
git -C vendor/content status -sb
```

### 4.5 Path litmus test

Any write path must satisfy:

```text
realpath($path) starts with $RS2_R377_ROOT
```

If not → stop.

---

## 5. Data / secrets isolation

- RSA keys under `vendor/engine/data/config/*.pem` are **local only** (gitignored).  
- Player saves / sqlite under `vendor/**/data/players`, `db.sqlite` are gitignored — do not copy live DBs in.  
- Cache blobs live under `cache/openrs2-377/` (gitignored binaries; docs in `docs/research/cache-377.md`).

---

## 6. Related docs

- [`vendor-layout.md`](vendor-layout.md) — clones and remotes  
- [`bootstrap.md`](bootstrap.md) — first start  
- [`../context/COLD_START.md`](../context/COLD_START.md) — agent entry  
- Root [`AGENTS.md`](../../AGENTS.md), [`PLAN.md`](../../PLAN.md) §0  
