# LC-rs2 r377 (2006-05-02) — Agent Plan

**Target revision:** RuneScape client/cache **377** (historical date ~**2 May 2006** — “Return of the Wise Old Man!” era; pre–May 16 2006 engine overhaul).  
**Workspace root (only place work lives):**

```text
$RS2_R377_ROOT
```

**Directory rename note:** This tree was formerly `LC-rs2-r277-2006-05-02` (typo). Always use **`r377`** / path `LC-rs2-r377-2006-05-02`. Do not recreate or write under the old `r277` name.

---

## 0. Hard isolation rules (read first)

This project is **fully separate** from the live rs2b2t stack. Agents must treat the following as **read-only reference** unless the human explicitly says otherwise:

| Path | Role | Agent policy |
|------|------|----------------|
| `$RS2_R377_ROOT` | This project | **Read/write** — only workspace |
| `/Users/acfrazier/experiments/Server` | Live Lost City setup (~274) | **Read-only reference** |
| `/Users/acfrazier/experiments/Server/engine` | Engine-TS @ 274 | **Read-only** |
| `/Users/acfrazier/experiments/Server/content` | Content @ 274 | **Read-only** |
| `/Users/acfrazier/code/rs2b2t-engine` | Engine-TS @ 274 (same tip as Server/engine) | **Read-only** |
| `/Users/acfrazier/experiments/rs2b0t` | Bot client for live rs2b2t | **Read-only** (later: optional clone *into* this workspace) |
| `/Users/acfrazier/code/rs2b2t-engine-old` | Old dump | Ignore |

### Isolation checklist

1. **No commits, checkouts, or file edits** under `rs2b0t`, `Server`, or `rs2b2t-engine` for this project.
2. **Clone / vendor everything** under this workspace (`vendor/`, `repos/`, `cache/`, `research/`).
3. **Ports, data dirs, RSA keys, and SQLite DBs** used here must not reuse live world ports/data that would corrupt the 274 stack.
4. **Git remotes** for private forks: create *new* remotes under a private org/user for this experiment; never push AI work to `LostCityRS/*`.
5. Prefer `git worktree` or fresh clones here over modifying sibling trees.
6. Cold-resume state lives in this repo: `PLAN.md`, `docs/plans/`, `docs/gap/`, checklists — not chat-only.

### Suggested layout (create as work proceeds)

```text
LC-rs2-r377-2006-05-02/
├── PLAN.md                 # this file (source of truth for agents)
├── AGENTS.md               # short agent entrypoint + isolation rules
├── docs/
│   ├── plans/              # dated working notes (YYYY-MM-DD-*.md)
│   ├── gap/                # gap analysis outputs
│   ├── research/           # notes, citations, video timestamps
│   └── runbooks/           # how to start/stop, pack, test
├── vendor/                 # git clones (engine, content, server, clients, bot)
│   ├── Server/             # LostCityRS/Server setup shell
│   ├── engine/             # Engine-TS (377 work branch)
│   ├── content/            # Content (377 work branch)
│   ├── client-ts/          # optional Client-TS / webclient
│   ├── client-java/        # optional
│   └── rs2b0t/             # optional private clone for bot track (later)
├── cache/
│   ├── openrs2-377/        # raw 377 cache (.dat2/.idx or flat)
│   └── unpacked/           # unpack outputs / diffs
├── research/
│   ├── jars/               # 377 client JARs
│   ├── deob/               # decompiled/refactored client
│   └── media/              # screenshots, notes (no huge binaries in git)
├── scripts/                # agent automation (diff, validate, pack check)
└── .gitignore              # vendor/node_modules, cache blobs, secrets
```

Ports for **this** stack (defaults — change only in this workspace’s configs):

| Service | Suggested local port | Notes |
|---------|----------------------|--------|
| Web / cgi | **8891** | Avoid clashing with live Server `8890` / `80` |
| Game | **43595** | Live often uses `43594` |
| Management | **8899** | Live often `8898` |

---

## 1. Goals

### Primary

Bring a **runnable, private** Lost City–style stack to **revision 377** (engine + content + cache pipeline + at least one client), suitable for:

- Local / small multiplayer play
- Later: bot client (`rs2b0t`-style) against this 377 world

### Non-goals (for now)

- Upstream PRs or AI contributions to Lost City
- Replacing the live 274 rs2b2t production stack
- Full authenticity certification of every quest (phased; authenticity is the long game)

### Product split (when bot work starts)

| Track | Workspace subdir | Source inspiration (read-only) |
|-------|------------------|--------------------------------|
| Engine + content | `vendor/engine`, `vendor/content`, `vendor/Server` | Lost City 274 + `377-wip` branches |
| Bot client | `vendor/rs2b0t` (clone when Phase B starts) | `/Users/acfrazier/experiments/rs2b0t` |

---

## 2. Known baseline (as of plan authoring)

Facts gathered from local machines / remotes (verify again in Phase 0):

| Item | Value |
|------|--------|
| Live `Server/server.json` | `"rev": "274"` |
| Live Engine-TS tip | branch `274`, commit ~`4c95f87e` |
| Live Content tip | branch `274` |
| Engine `PlayerStat` @ 274 | Stats 0–17 + placeholders `STAT18`/`STAT19` + `RUNECRAFT`; **no Slayer enum yet** (`PlayerStatEnabled` false for 18/19) |
| Content @ 274 | Slayer **models/jingles/synths** present; **no** `scripts/skill_slayer` tree |
| Content @ 274 quests | Large set through mid-era (e.g. Legends, Regicide, etc.) — still short of full May 2006 set |
| Remote Engine branches | `377-wip`, `377-node` on `LostCityRS/Engine-TS` |
| Remote Content branch | `377-wip` on `LostCityRS/Content` |
| Local 377 cache | **Not** yet imported under this workspace |
| `rs2b2t-engine` vs `Server/engine` | Same commit tip; only minor local harness diff (`::givebank` cheat on Server copy) |

**Historical anchor:** Build **377** ≈ **2 May 2006** (wiki build number table). Construction / major post-May overhaul is **out of scope** for this revision target.

**Major content gap theme (274 → 377):** everything that shipped between late 2004 and early May 2006 that is not already complete on 274 — notably **Slayer**, **Barrows**, map expansions, many quests/interfaces, and incremental protocol/cache format changes. Treat `377-wip` as a head-start, not as finished.

---

## 3. Architecture of Lost City revision work

Lost City advances revisions roughly as:

1. **Client RE** — deob/refactor target-rev client behavior.
2. **Engine / protocol / tools** — network packets, cache pack/unpack, config formats, cycle behavior.
3. **Cache pipeline** — unpack historical 377 cache → editable content → repack with fidelity checks.
4. **Content** — RuneScript (`.rs2`), configs (`.npc`, `.obj`, `.loc`, …), maps, interfaces.
5. **Clients** — Java and/or TS/web clients matching protocol + cache.
6. **Fidelity** — authenticity testing, bug-for-bug where known.

377 is still in the **~226–377 data-tool family** (incremental changes from mid-2004 tools). The cost is mostly **content volume + protocol deltas**, not a full engine rewrite (that arrives later historically).

---

## 4. Phased plan

### Phase 0 — Workspace bootstrap & gap analysis

**Owners:** 1–2 agents  
**Depends on:** nothing  
**Exit criteria:**

- [ ] Layout under `LC-rs2-r377-2006-05-02` exists (vendor, cache, docs, scripts).
- [ ] Fresh clones of Server / Engine-TS / Content live under `vendor/` (not symlink into live trees).
- [ ] Documented baseline: 274 runnable *inside this workspace* OR documented “reference-only 274 next door.”
- [ ] `377-wip` (and `377-node` if useful) fetched and summarized.
- [ ] Gap report written to `docs/gap/000-baseline.md` with prioritized backlog.
- [ ] Pack/unpack pipeline for 377 documented in `docs/runbooks/cache-pipeline.md`.

#### 0.1 Bootstrap tasks (agent checklist)

```text
[ ] Create dirs: vendor/ cache/ research/ docs/{plans,gap,research,runbooks} scripts/
[ ] Write AGENTS.md with isolation rules + “cwd must be this repo”
[ ] .gitignore: node_modules, data/players, *.sav, cache blobs, .env, RSA private keys
[ ] Clone into vendor/ (shallow OK for first pass):
      - LostCityRS/Server          → vendor/Server
      - LostCityRS/Engine-TS       → vendor/engine   (branch 274 + fetch 377-wip, 377-node)
      - LostCityRS/Content         → vendor/content  (branch 274 + fetch 377-wip)
[ ] Do NOT use git submodule pointing at ../../Server — independent clones only
[ ] server.json / world.json inside vendor: revision + ports unique to this workspace
[ ] npm/bun install only under vendor/* in this tree
```

#### 0.2 Gap analysis tasks

```text
[ ] git log / rev-list --left-right origin/274...origin/377-wip for engine and content
[ ] diff --stat and path-prefix histograms → docs/gap/
[ ] Catalog engine: protocol handlers, PlayerStat, login revision checks, pack tools
[ ] Catalog content: skill_* dirs, minigames, quests missing vs known 2005–2006 list
[ ] List 377-wip TODOs / incomplete features from commit messages and README fragments
[ ] Produce prioritized backlog: P0 tools/protocol, P1 cache, P2 bot-critical content, P3 full authenticity
```

#### 0.3 Research corpus (local first)

```text
[ ] Download 377 cache into cache/openrs2-377/ (OpenRS2 archive preferred)
[ ] 377 client JAR(s) → research/jars/
[ ] Notes from update lists / wiki build 377 → docs/research/
[ ] Optional: snapshot notes from live 274 content for merge strategies (copy files in, never edit live)
```

**Agent deliverable template** (`docs/gap/000-baseline.md`):

```markdown
# Gap: 274 → 377
## Engine delta (files / subsystems)
## Content delta (skills, quests, maps, interfaces)
## 377-wip already has
## 377-wip missing / broken
## Cache tool status
## Recommended work order
## Open questions for human
```

---

### Phase 1 — Engine, protocol & tools (P0)

**Owners:** core/engine agent(s)  
**Depends on:** Phase 0 clones + gap report  
**Exit criteria:**

- [ ] `ENGINE_REVISION` / `world.json` revision **377** accepted at login for matching client.
- [ ] Client ↔ server handshake and core game packets work for a 377 client (or 377-wip client target).
- [ ] Pack pipeline builds content profile without fatal errors.
- [ ] Unpack → pack round-trip validation scripts exist under `scripts/` for critical archives.
- [ ] Unit/smoke: world starts, player logs in, moves, opens bank (minimum).

#### 1.1 Engine task breakdown

| ID | Task | Success criteria | Notes |
|----|------|------------------|-------|
| E1 | Branch strategy | `vendor/engine` on private branch e.g. `rs2-r377` based on `377-wip` or 274+port | Prefer rebasing anarchy patches *later*; start clean LC |
| E2 | Revision gate | Login accepts 377; rejects wrong rev with clear log | See `World.ts` rev read + `Environment.engine.revision` |
| E3 | Protocol audit | Packet encode/decode matches deob client for used opcodes | Work under `src/network/game/{client,server}/` |
| E4 | Stats / save | Slayer (and any new stats) in `PlayerStat`, save/load compatible | 274 has STAT18/19 placeholders |
| E5 | Config types | Any new config opcodes/formats between 274–377 handled | Diff `src/cache/config` vs 377-wip |
| E6 | Pack tools | `tools/pack/*` and `tools/unpack/*` work on 377 data | Bit-identical where possible |
| E7 | Script runtime | RuneScript opcodes needed by 377 content present | `@lostcityrs/runescript` version pin documented |
| E8 | Smoke world | `npm start` / Server start script boots this workspace’s world | Ports from isolation table |

#### 1.2 Reference locations (in *cloned* engine)

```text
vendor/engine/src/util/WorldConfig.ts     # revision default
vendor/engine/src/engine/World.ts         # login revision check
vendor/engine/src/engine/entity/PlayerStat.ts
vendor/engine/src/network/game/**         # protocol
vendor/engine/tools/pack/**              # build pipeline
vendor/engine/tools/unpack/**            # cache extract
vendor/engine/data/config/world.json     # local config (ports!)
```

#### 1.3 Agent workflow for engine PRs

1. One concern per branch under `vendor/engine` (`feat/r377-protocol-…`).
2. Every PR note: research source (deob line, 377-wip commit, cache CRC).
3. Do not “fix” authenticity with modern QoL unless behind a clearly named local flag.
4. Human review required for protocol and save-format changes.

---

### Phase 2 — Cache & data pipeline

**Owners:** tools agent + content agent  
**Depends on:** Phase 1 pack tools usable  
**Exit criteria:**

- [ ] Full 377 cache imported under `cache/openrs2-377/`.
- [ ] Unpack produces editable trees merged into `vendor/content` strategy (document merge rules).
- [ ] Rebuild pack verifies CRCs / sizes for critical indices (scripted).
- [ ] Map + model load in client without missing-group storms for starter areas.

#### 2.1 Tasks

```text
[ ] Document OpenRS2 cache id / source URL and checksum in docs/research/cache-377.md
[ ] scripts/fetch-cache.sh (or documented manual steps) — no secrets in git
[ ] Unpack configs, maps, models, interfaces as separate steps with logs
[ ] Diff unpacked 377 vs content 274 / 377-wip → docs/gap/001-cache-diff.md
[ ] Merge strategy: “377 cache is authority for assets; RuneScript authenticity from research + 377-wip”
[ ] Validation: scripts/validate-pack.ts comparing pack output to reference cache groups
```

#### 2.2 Fidelity policy

- Prefer **historical cache bytes** for binary assets (models, maps, sprites) when conflict.
- Prefer **reviewed RuneScript** for behavior (cache does not contain server scripts).
- Record every intentional deviation in `docs/research/deviations.md`.

---

### Phase 3 — Content implementation

**Owners:** many content agents in parallel  
**Depends on:** Phase 2 world loads with 377 assets; Phase 1 stats/protocol stable enough  
**Exit criteria (staged):**

| Stage | Bar |
|-------|-----|
| 3a Bot-critical | Banks, shops, combat, key gathering spots, pathing locs work |
| 3b Skills | Slayer end-to-end (masters, tasks, XP, equipment checks) |
| 3c Minigames | Barrows runnable; other 2005 minigames as prioritized |
| 3d Quests | Quests added 2005–early 2006 not already complete on baseline |
| 3e Polish | Messages, edge cases, bug-for-bug vs research corpus |

#### 3.1 Parallel tracks (assign one agent or team per track)

| Track | Scope examples | Content paths (typical) |
|-------|----------------|-------------------------|
| T-skills | Slayer full; combat/skilling deltas | `scripts/skill_slayer`, combat scripts |
| **T-platform** | **After TBWT:** level-up, skill guides, HUD/mes polish | `levelup/`, `levelrequire/`, controls, general mes |
| T-barrows | Crypt, tunnels, rewards, prayer drain | `scripts/minigames/…`, maps, NPCs |
| T-quests | New/updated quests 2005–2006-05 | `scripts/quests/quest_*` |
| T-maps | New areas, dungeon links, wilderness gfx if in rev | `maps/`, loc spawns |
| T-npcs-drops | Spawns, drop tables, shops | `scripts/npc`, drop tables, shop |
| T-interfaces | Any IF / varp / sidebar changes | `scripts/interfaces`, pack interface |
| T-economy | Shops, prices if era-changed | shop configs |

**Wave 1.5 (platform UX):** insert after TBWT is good enough, before XL quests — `docs/plans/2026-08-04-platform-ux-after-tbwt.md`.

#### 3.2 Content agent Definition of Done (per feature)

```text
[ ] Scripts + configs compile/pack clean
[ ] Manual or bot smoke steps listed in docs/runbooks/feature-<name>.md
[ ] Messages/behavior checked against at least one research source (video, update post, deob)
[ ] No edits outside vendor/content (and engine only if opcode missing — then hand off to engine agent)
[ ] Deviations logged
```

#### 3.3 Bot-priority content (when Phase B is active)

Prioritize what bots need first:

1. Banks / GE-era N/A (no GE in 377) — bank booths and areas
2. Combat training spots + giants/dragons used by existing scripts
3. Gathering: wood, fish, mine, craft, RC
4. Quest requirements for AIOQuester ports
5. Slayer masters + task monsters
6. Barrows run path

Map these to concrete IDs after gap analysis (item/npc/loc IDs **will change** vs 274 — never hardcode from memory without pack files).

---

### Phase 4 — Clients (**TS prioritized**)

**Owners:** client agent(s)  
**Depends on:** Engine boot + known ports (done). Content can parallelize after TS login.  
**Exit criteria:**

- [x] Java client logs into this 377 world (oracle path).
- [ ] **TS client logs into this 377 world** (primary iteration path).
- [ ] TS walk + basic interact (enough to playtest / harness).
- [ ] RSA / ports documented for both clients.

#### 4.0 Why TS is early (not “later”)

There is **no easy Java test harness** for agent-speed iteration (AWT desktop).  
**rs2b0t needs TS anyway.** Decision: **rip the bandaid** — build TS 377 now.  
See `docs/decisions/002-prioritize-ts-client.md` and `docs/research/client-strategy-377.md`.

| Client | Role |
|--------|------|
| **Client-Java `377`** | Oracle + occasional human play (`vendor/client-java`) |
| **Client-TS (port of Java 377)** | **Primary** — mechanical port from `vendor/client-java`; keep browser shell |

#### 4.1 Tasks

```text
[x] Clone Client-Java 377 → vendor/client-java (oracle)
[x] Scaffold Client-TS shell + deploy to :81/rs2.html
[ ] Java-first port: io (Packet alts, ServerProt 377 sizes) + stay-ingame
[ ] Port config unpack (IfType/Component, etc.) from Java
[ ] Port packet dispatch / scene from Java until walk works
[ ] M4 automated smoke; then content playtests via browser
[ ] Document: docs/runbooks/client-ts.md + client-strategy-377.md
```

See ADR `docs/decisions/003-java-first-ts-port.md`.

---

### Phase 5 — Integration, testing, polish

**Owners:** research/validation agent + all track leads  
**Depends on:** Phases 1–4 minimum path  
**Exit criteria:**

- [ ] Smoke checklist green (login, move, fight, bank, logout, save/relogin).
- [ ] Regression notes for known 274 features that must not regress.
- [ ] Performance acceptable for local / small multiplayer.
- [ ] `docs/research/unknowns.md` lists remaining gaps honestly.

#### 5.1 Test matrix (expand over time)

| Area | Automated | Manual / research |
|------|-----------|-------------------|
| Login + revision | script | — |
| Pack verify | script | — |
| Pathing sample tiles | optional | yes |
| Slayer task cycle | later bot | video compare |
| Barrows run | later bot | video compare |
| Quest steps | partial | update notes |

---

### Phase 6 — Packaging (this workspace only)

```text
[ ] Single entry: scripts/start-r377.sh wrapping vendor/Server start with correct rev
[ ] Docker optional — only if it does not touch live Server docker
[ ] README.md: what this is (community/AI-assisted private 377 experiment), how to run, isolation warning
[ ] Version tag e.g. r377-2006-05-02-wip.N
```

---

## 5. Phase B — Bot client (rs2b0t)

**Still fully inside this workspace** (`vendor/rs2b0t`), not the live bot tree.  
**B0 (TS client) is pulled forward into Phase 4** — do not wait for “all content done.”

### B0 — TypeScript 377 client → see Phase 4

Primary track. Milestones M0–M4 in `docs/research/client-strategy-377.md`.

### B1 — Embed 377 client in rs2b0t (after TS M2–M3)

```text
[ ] Clone rs2b0t into vendor/rs2b0t (independent of live tree)
[ ] Swap embedded client to vendor/client-ts (377)
[ ] ClientAdapter + RSA + isolation ports
[ ] MultiBox / deploy paths workspace-only
```

### B2 — API surface (`@rs2b0t/api`)

```text
[ ] Audit ClientAdapter reader/actions against 377 client shape
[ ] Skills API: Slayer level/XP/enabled
[ ] Interfaces / varps / menu ops deltas
[ ] Item/NPC/loc catalogs regenerated from 377 pack
[ ] Rebuild collision pack + door/transport graph from 377 maps
[ ] Helpers: Slayer masters, Barrows, new banks/shops
```

### B3 — Scripts

```text
[ ] Port existing ~70 scripts; fix broken assumptions (IDs, locs, requirements)
[ ] Add SlayerBot, BarrowsRunner, etc., as content lands
[ ] Keep wire-identical principle: menuAction/doAction/tryMove only
```

### B4 — Integration

```text
[ ] Multi-bot local test against vendor 377 engine
[ ] Anti-cheat / anarchy flags only if this fork intentionally includes them — re-apply as explicit patches on vendor/engine, never by editing live engine
```

---

## 6. Agent roles & workflow

| Role | Responsibility | Primary paths |
|------|----------------|---------------|
| Architect / engine | Protocol, pack tools, revision, save format | `vendor/engine` |
| Cache / tools | Unpack, validate, merge assets | `cache/`, `scripts/`, pack tools |
| Content (N agents) | Quests, skills, spawns | `vendor/content` |
| Client | Java/TS client match | `vendor/client-*` |
| Bot (later) | API + scripts | `vendor/rs2b0t` |
| Research / QA | Corpus, authenticity checks, gap docs | `docs/`, `research/` |

### Rules of engagement

1. **Local research first** (`research/`, `docs/`, deob, cache), then web if needed.
2. **Small branches**, testable smoke steps, written rationale.
3. **No upstream Lost City PRs** from this work.
4. **Citation habit:** link 377-wip commit, deob method, or video timestamp in PR/docs.
5. **Shared backlog:** update `docs/gap/` checkboxes when items complete or defer.
6. **Human gate:** protocol, economy-breaking drops, and “feels like 2006” judgment.

### Success criteria language for tasks

Prefer:

- “Login packet revision field must equal 377 and match `Environment.engine.revision`.”
- “Slayer skill appears in stats interface; `PlayerStatEnabled[Slayer] === true`; XP drop on task kill.”
- “Pack group X CRC matches reference cache or documented deviation.”

Avoid:

- “Make Slayer work” without smoke steps.

---

## 7. Risks & scope control

| Risk | Mitigation |
|------|------------|
| Content volume 2004→2006 huge | Parallel content agents; stage 3a→3e; bot-priority first |
| 377-wip incomplete / stale | Gap analysis; do not assume merge is free |
| Contaminating live 274 stack | Isolation rules; separate ports/data; no shared writable paths |
| ID renumbering breaks bots | Regenerate catalogs from pack; no hardcoded 274 IDs in new bot clone |
| Authenticity bottleneck | Research agent + media corpus; accept staged fidelity |
| Engine harder than content | Stabilize protocol/tools before mass content |
| Legal / ToS / distribution | Private research; no claim of official Lost City; no redistributing copyrighted cache if policy forbids — human decides distribution |

**Timeline reality:** months of agent + human effort. First milestone is **login + move on 377 cache**, not full game completion.

---

## 8. Concrete first week (ordered)

Do these **only under** `LC-rs2-r377-2006-05-02`:

1. **Confirm path** — workspace is `…/LC-rs2-r377-2006-05-02` (not `r277`).
2. **Scaffold** layout + `AGENTS.md` + `.gitignore`.
3. **Clone** Server, Engine-TS, Content into `vendor/` with `274` + remote `377-wip` fetched.
4. **Configure** unique ports + `revision: 377` (or dual profiles: `274-ref` vs `377-dev`).
5. **Import** 377 cache into `cache/openrs2-377/`.
6. **Gap analysis** agent → `docs/gap/000-baseline.md`.
7. **Engine agent** bases private branch on `377-wip` (or ports critical commits onto 274 — choose in gap report; document choice).
8. **Smoke** world start; capture logs in `docs/plans/`.
9. **Only then** schedule content and bot tracks.

---

## 9. Backlog seed (refine after Phase 0)

### P0 — Blockers

- [ ] Workspace isolation scaffold
- [ ] Vendor clones + branch strategy decision (`377-wip` base vs port-forward)
- [ ] 377 cache import + pack/unpack path
- [ ] Login revision + client match
- [ ] PlayerStat Slayer wiring

### P1 — Playable core

- [ ] Starter areas map integrity
- [ ] Bank / shop / combat loops
- [ ] Interface/stat panel for new skills
- [ ] Save/load with new stats

### P2 — Signature 2005–2006 systems

- [ ] Slayer complete
- [ ] Barrows complete
- [ ] High-priority quests from gap list

### P3 — Breadth & bots

- [ ] Remaining quests/minigames
- [ ] rs2b0t vendor clone + API audit
- [ ] Script port wave 1
- [ ] Collision/nav rebuild

### P4 — Polish

- [ ] Authenticity pass per system
- [ ] Performance
- [ ] Packaging + runbooks

---

## 10. Commands cheatsheet (agents)

All commands assume:

```bash
export LC377_ROOT=$RS2_R377_ROOT
cd "$LC377_ROOT"
```

```bash
# Clones (example)
git clone https://github.com/LostCityRS/Server.git vendor/Server
git clone https://github.com/LostCityRS/Engine-TS.git vendor/engine
git clone https://github.com/LostCityRS/Content.git vendor/content
git -C vendor/engine fetch origin 377-wip 377-node
git -C vendor/content fetch origin 377-wip

# Never
# cd /Users/acfrazier/experiments/Server && git checkout 377-wip   # FORBIDDEN for this project
# cd /Users/acfrazier/experiments/rs2b0t && …                      # FORBIDDEN until explicit Phase B in vendor/
```

Reference-only inspection of live 274:

```bash
# OK: read-only
git -C /Users/acfrazier/experiments/Server/content log -1 --oneline
# NOT OK: checkout, commit, npm start that writes into live data/
```

---

## 11. Document maintenance

| Doc | Owner | When to update |
|------|-------|----------------|
| `PLAN.md` | architect | Phase exits, strategy changes |
| `docs/gap/*.md` | gap/research agents | After every analysis pass |
| `docs/plans/YYYY-MM-DD-*.md` | any | End of session / large dumps |
| `docs/research/deviations.md` | all | Any intentional non-authentic behavior |
| `docs/runbooks/*` | whoever made it work | When start/pack steps change |

Per local plan-docs rule: **write plans to disk early** so cold resume does not require re-triage from chat.

---

## 12. Open decisions (human)

Resolve during/after Phase 0; record answers in `docs/gap/000-baseline.md`:

1. Base branch: pure `377-wip` vs 274 + cherry-picks vs `377-node`?
2. Include rs2b2t anarchy patches (RSA rotation, logout timer, multi-log, anti-cheat) in *this* fork, or pure LC 377 first?
3. Cache distribution policy (keep cache gitignored only)?
4. When to start Phase B (bot) relative to Slayer/Barrows?
5. Private git hosting for `vendor/*` forks?

---

## 13. One-line mission

**Build a private, fully isolated r377 (2006-05-02) Lost City–style stack under `LC-rs2-r377-2006-05-02`, using 274 and `377-wip` as read-only references, then optionally layer a vendored bot client — without touching the live rs2b2t 274 world.**
