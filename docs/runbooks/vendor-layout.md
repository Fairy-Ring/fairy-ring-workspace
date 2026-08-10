# Runbook — vendor layout

**Workspace:** `$RS2_R377_ROOT`  
**Layout:** Product repos are normal git clones under `vendor/`. Workspace git holds process/docs/harness only. Index: root [`vendor/README.md`](../../vendor/README.md).

---

## 1. Layout

```text
vendor/
├── engine/        # Fairy-Ring/FR-engine — server + pack/unpack
├── content/       # Fairy-Ring/FR-content — RuneScript, configs, maps
├── client-ts/     # Fairy-Ring/FR-client-ts — pure web client (oracle: Client-Java 377)
├── client-java/   # optional research — LostCityRS Client-Java branch 377
└── Server/        # optional research — LostCityRS Server shell (not required for smoke)
```

Pins: `docs/research/PROVENANCE-UPSTREAM-PINS.md`. Typical remotes: `origin` = LostCityRS (push disabled), `private` = Fairy-Ring.

---

## 2. Per-repo identity

### `vendor/engine` — Engine-TS

| Field | Value |
|-------|--------|
| Public remote | [Fairy-Ring/FR-engine](https://github.com/Fairy-Ring/FR-engine) (`private`) |
| Upstream fetch | `https://github.com/LostCityRS/Engine-TS.git` (`origin`, push disabled) |
| Working branch | **`rs2-r377`** |
| Upstream base pin | `94fcfa2d2c2fc5812e6d448a5e4a04fd73879fd3` (`377-wip`) |

**Role:** Runtime (`src/`), pack (`tools/pack`), unpack (`tools/unpack`), network protocol, SQLite/login helpers.

**Config:**

- Code defaults: `src/util/Environment.ts` — `ENGINE_REVISION` default **377**, game port default 43594 until overridden.  
- Isolation: `data/config/world.json` + `.env` (see `docs/runbooks/isolation.md`).  
- Content sibling: `BUILD_SRC_DIR=../content` → `vendor/content`.

### `vendor/content` — Content

| Field | Value |
|-------|--------|
| Public remote | [Fairy-Ring/FR-content](https://github.com/Fairy-Ring/FR-content) (`private`) |
| Upstream fetch | `https://github.com/LostCityRS/Content.git` (`origin`, push disabled) |
| Working branch | **`rs2-r377`** |
| Upstream base pin | `7d7719693100cc45ff187c12139e5b63b3ab21df` (`377-wip`) |

**Role:** Editable game data: `scripts/` (RuneScript + configs), `maps/`, `models/`, `pack/`, audio/sprites/textures.

**Notable on 377-wip vs 274:**

- `scripts/skill_slayer/` present (configs + NPC scripts).  
- Barrows **models** present; **no** `scripts/**/barrow*` tree yet.  
- Minigames include castlewars, trawler, boardgames, pest, etc. — **no** barrows minigame folder.

### `vendor/Server` — Server shell

| Field | Value |
|-------|--------|
| Remote | `https://github.com/LostCityRS/Server.git` |
| Branch | **`main`** |
| HEAD | `0b6a0cb7d11667be0828ccec95ef02057763b768` |
| Last commit | `chore: Updated revision list` (2026-07-08) |

**Role:** Higher-level launcher (`start.js`) that prompts for a revision key, writes `server.json`, and clones engine/content/clients as **siblings** named `engine` / `content` (home-rolled submodules, no pin SHAs).

For rev key `377-wip`, Server would clone:

| Component | Branch |
|-----------|--------|
| engine | `377-wip` |
| content | `377-wip` |
| Java client | `377` (`clientBranch`) |
| Web client | not listed for this rev entry |

**Day-to-day smoke does not use Server’s nested clones.** Engine + content are sibling checkouts on `rs2-r377`:

```bash
cd vendor/engine && npm install && npm start
```

### `vendor/client-java` — Client-Java

| Field | Value |
|-------|--------|
| Remote | `https://github.com/LostCityRS/Client-Java.git` |
| Local branch | **`377`** (tracks `origin/377`) |
| HEAD | `327880f6de74b40c420705bc42e4b34284885087` |
| Last commit | `fix: OnDemand.validate arg order (#5)` |
| Build | `./gradlew jar` / `./gradlew run` (Java 8 target) |
| Main class | `jagex2.client.Client` |

**Role:** Research decompile of the original RS2 Java client for rev **377**. Desktop launch via `main(node-id, port-offset, highmem|lowmem, free|members, storeid)`.

**Isolation launch** (game on **43595**):

```bash
cd vendor/client-java
./gradlew run --args="37 1 highmem members 32"
```

Full detail: [`playable.md`](playable.md) (ports, RSA vs `vendor/engine/data/config/private.pem`).

### `vendor/client-java-289` — Client-Java worktree (289 only)

| Field | Value |
|-------|--------|
| How | `git worktree` from `vendor/client-java` → `origin/289` |
| HEAD | `6834c7255f559db5f1702b8b0e5e7286a7d61244` (`feat: Initial (dirty) deob`) |
| Role | **Left side of 289→377 deob delta** for Client-TS migration (not the behaviour oracle) |

Delta map: [`docs/plans/2026-08-03-java-289-to-377-delta.md`](../plans/2026-08-03-java-289-to-377-delta.md).  
Size CSV: [`docs/plans/289-vs-377-serverprot-sizes.csv`](../plans/289-vs-377-serverprot-sizes.csv).

---

## 3. How Server relates to engine / content

```text
                    LostCityRS/Server (launcher)
                              │
              clones/updates by branch name "rev"
                     ┌────────┴────────┐
                     ▼                 ▼
              Engine-TS            Content
              (protocol+tools)     (scripts+assets)
                     │                 │
                     └────────┬────────┘
                              ▼
                      runnable world
```

| Concern | Engine | Content | Server |
|---------|--------|---------|--------|
| Protocol / cycle | ✓ | | |
| Pack/unpack tools | ✓ | | |
| RuneScript / configs | | ✓ | |
| Maps / models / pack IDs | | ✓ | |
| Revision picker / clone orchestration | | | ✓ |
| `npm start` world process | ✓ | consumed as `../content` | optional wrapper |

Matching rule: **same revision family** for engine + content branches. Here both track `377-wip` via local `rs2-r377`.

---

## 4. Branch naming policy

| Name | Where | Push? |
|------|--------|-------|
| `origin/274` | Upstream production family | N/A (read) |
| `origin/377-wip` | Upstream WIP for May 2006 | **Do not push AI work here** |
| `origin/377-node` | Engine-only node experiment | Read |
| **`rs2-r377`** | Local private work branches | Only to **private** remotes if any |

Never force-push or PR accidental AI dumps to LostCityRS.

---

## 5. Verify remotes and SHAs

```bash
export RS2_R377_ROOT=$RS2_R377_ROOT
bash "$RS2_R377_ROOT/scripts/snapshot-status.sh"

for d in engine content Server client-java; do
  echo "=== vendor/$d ==="
  git -C "$RS2_R377_ROOT/vendor/$d" remote -v
  git -C "$RS2_R377_ROOT/vendor/$d" status -sb
  git -C "$RS2_R377_ROOT/vendor/$d" log -1 --oneline
done
```

---

## 6. Related

- [`isolation.md`](isolation.md)  
- [`bootstrap.md`](bootstrap.md)  
- [`playable.md`](playable.md) — Java client build/run/RSA  
- [`../plans/2026-08-03-vendor-clones.md`](../plans/2026-08-03-vendor-clones.md)  

