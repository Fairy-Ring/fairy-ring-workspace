# Agent entrypoint — rs2-r377

**Public brand:** **rs2-r377** (not “LC”; derived from Lost City open work — Decision **009**).  
**Workspace (only writable tree for this project):** local path may still use a legacy folder name.

```text
# Example operator path (do not hardcode in public docs):
# …/LC-rs2-r377-2006-05-02  or  …/rs2-r377-workspace
```

**Target:** RuneScape revision **377** (~2 May 2006).

## Isolation (mandatory)

| Path | Policy |
|------|--------|
| This directory and below | Read/write |
| `/Users/acfrazier/experiments/Server` | Read-only reference |
| `/Users/acfrazier/code/rs2b2t-engine` | Read-only reference |
| `/Users/acfrazier/experiments/rs2b0t` | Read-only reference |

- Do **not** checkout, commit, install into, or `npm start` the live 274 trees for this project.
- Clone everything under `vendor/`.
- Use isolated ports: web **8891**, game **43595**, management **8899**.
- Never push to `LostCityRS/*`.
- Authenticity: do not invent content. Research ladder in `docs/research/authenticity-stance.md` (OSRS = **last resort**, prefer early/~2007-base if used; **not RS3**).
- **Game knowledge corpus (mandatory read before inventing prep/gear/anchors):** `docs/research/game-knowledge/` — see § Game knowledge corpus below.
- **Research hub:** `docs/research/INDEX.md` (topic list); **RuneScript manual:** `docs/research/runescript/README.md`.
- **Client track:** exact-copy port of **Client-Java 377** → TS. Do not invent handlers or treat Client-TS 289 as behavioural truth (`docs/research/client-strategy-377.md`).
- **Client vs bot/harness:** Client-TS stays pure. Harness lives in `tools/harness/` only; bot later in `vendor/rs2b0t` only. Never install bot/harness hooks inside `vendor/client-ts` (`docs/decisions/004-client-bot-harness-boundary.md`).
- **Harness runs headed by default** (visible Chromium). Use `HEADLESS=1` only for CI/batch. See `docs/runbooks/harness.md`.

## The promise (LC accuracy bar + toys)

Lost City people will be **extremely** picky about accuracy. That is not a bug in them; it is the point of LC. This workspace exists to do careful rev **377** work *for that bar*, not to hand-wave “close enough.”

| Side | What it is | Freedom |
|------|------------|---------|
| **Upstream product we puppet** | `vendor/client-ts`, `vendor/engine` (Server), `vendor/content` | **Must stay pure.** Research ladder. No invent. No harness hooks in Client-TS. Content/engine fixes must be defendable to an LC reader. |
| **Toys** | `tools/harness/**`, later `vendor/rs2b0t` | Play freely: prep cheats, thrash loops, incomplete ground-take, headed smokes — **as long as** they do not leak into pure product trees and **do not** pretend a soft proof is authenticity. |
| **Bridge** | `docs/**` (plans, research, deviations, runbooks) | **Document everything** that mattered: what worked, what failed, SHAs, soft vs hard proofs, intentional deviations. Docs are how LC (and future us) can see the path without trusting chat. |

**Rules of thumb:**

1. If a change lands under `vendor/client-ts`, `vendor/content`, or `vendor/engine` — treat the audience as **LC accuracy people**. Cite sources; log deviations.  
2. If a change is only under `tools/harness` — fun is allowed; still label soft proofs (`give` remains, death tele, etc.) so nobody confuses them with product purity.  
3. Prefer **honest mid-gates** (e.g. Mort’ton kills ≥40) over green bars that force-pass content.  
4. Never push experiment work to `LostCityRS/*`; when sharing, share **docs + pure patches**, not toy contamination.

## Branding & attribution (Decision 009)

Cement early — private now, public later:

| Do | Don’t |
|----|--------|
| Own brand (**rs2-r377**); state **derivation** from Lost City open work | Present as official Lost City / LostCityRS / “LC” product |
| Credit LC, OpenRS2, rs2b0t/rs2b2t, humans, agents as tools | Erase provenance or dunk on upstream process |
| Cross-pollinate with LC / rs2b0t/rs2b2t; bot/harness = means for r377 proofs | Speak *for* other projects; treat bot as 274 “complete world” product layer |
| Use best tools (agents included); speed is a side effect | Market “faster than LC” as the mission |

Full text: `docs/decisions/009-branding-attribution-and-upstream.md`.

## Long-running process monitoring (mandatory)

When waiting on smokes, packs, engine start, or other long shell work:

- **Do not** block for tens of minutes reading a single test/log stream (e.g. 30 min of continuous output wait).
- **Do** background the command (or let it auto-background) and **poll the shell/task for activity periodically** — short status checks, tail recent log lines, confirm the process is still alive.
- Prefer intervals on the order of **tens of seconds to a few minutes**, not one multi-tens-of-minutes wait.
- On stall (no new output, stuck scene/login, same FAIL-FAST line): inspect, intervene, or kill — do not “wait it out” hoping for a late PASS.
- **While smokes run:** **must** pull research from the idle queue — not optional polish (see below + **Parallel work**).

### Idle research queue (mandatory when blocked on tests)

If you launched a long smoke/pack/rebuild and the next product step cannot start until RESULT:

1. Open **`docs/plans/idle-research-queue.md`** (standing pull list — not chat memory).
2. Take the top **open** row (or spawn a subagent whose prompt names the deliverable path).
3. Cap **≤3** parallel research tracks; every finding lands in `docs/research/` or `docs/plans/` **same turn**.
4. Tick the queue row when the doc lands; refresh `docs/research/INDEX.md` for new units.
5. On RESULT: product fix/advance first; do not abandon a half-written research table.

**Anti-pattern (operator call-out):** acknowledging subagent completions or “still hunting…” with **no** open queue item in flight = **no ops**. Fix: queue pull or product log check, not empty ACK.

Discipline narrative: `docs/plans/2026-08-07-background-research-discipline.md`.  
Product order (after RESULT): `docs/plans/2026-08-07-content-breadth-backlog.md`.

## Parallel work / subagents (mandatory)

Main thread may **hammer** (implement, thrash, smoke). Subagents may **research and write docs** in parallel — **required** when long jobs are running and main cannot product-edit the world.

| Allowed for subagents | Not allowed without main-thread / operator |
|----------------------|---------------------------------------------|
| Read whole tree (incl. read-only live 274 refs) | Edit `vendor/client-ts`, `vendor/content`, `vendor/engine` product purity without main review |
| Write/update `docs/**` (plans, research, gap, indexes) | Soft-pass claims that reclassify product as “authentic” without evidence |
| Catalog plans, port audits, INDEX maintenance | `git push` anywhere; touch live 274 trees |
| Propose next unit / gap checkboxes | Conflicting edits to the same content pack as main |

**Rules:**

1. Prefer **explore** / **plan** (read-only) for inventory; **general-purpose** only when writing docs or isolated worktrees.  
2. Subagent outputs must **land in `docs/`** (or return a mergeable summary) — not chat-only.  
3. Main thread **owns** product tree conflicts and smoke interpretation; fold subagent findings into research/gap same session.  
4. Do not spawn unbounded fan-out; bound research tasks (e.g. “catalog 08-03 plans”, “diff Eadgar 274 tree”).  
5. Isolation still applies: writable tree is only this workspace.  
6. **While waiting on tests:** pull **`docs/plans/idle-research-queue.md`** — do not wait for the operator to re-ask for research.

## Game knowledge corpus (mandatory)

As we build an accurate **rev 377 / ~May 2006** knowledge base, agents **must use it** instead of inventing levels, gear, anchors, or combat floors.

| Path | Role |
|------|------|
| **`docs/research/game-knowledge/README.md`** | **Hub** — maintain rules + file index |
| `docs/research/game-knowledge/harness-prep-and-gear.md` | setstat / give / equip policy for smokes |
| `docs/research/game-knowledge/combat-floors-377.md` | NPC levels / safe mid-gate combat floors |
| `docs/research/game-knowledge/anchors-*.md` | Quest-critical tiles (e.g. Rellekka workman **2655,3592**) |
| `docs/research/map-npc-spawns-jm2-377.md` | How `.jm2` NPC spawns work |
| `docs/research/INDEX.md` | Full research topic list (ports, readiness, pack audits) |
| `docs/research/runescript/` | RuneScript **first-principles manual** (multi-file) + `living-notes.md`; **@JagexAsh** posts about RuneScript are authoritative (see hub § Authority) |
| `docs/research/deviations.md` | Intentional non-authentic / soft-proof rows |
| `docs/research/authenticity-stance.md` | Ladder + product vs toys |

**When to write:**

| Event | Update |
|-------|--------|
| New mid-gate smoke with gear/stats | `harness-prep-and-gear.md` (+ combat floor if a fight) |
| New proven world tile / NPC spawn | anchors area file or `map-npc-spawns-jm2-377.md` |
| Port/readiness/unit audit | `docs/research/*-377*.md` + row in `docs/research/INDEX.md` |
| Soft vs hard proof | `deviations.md` same turn |

**Rules:** Prefer corpus + research INDEX over chat memory or OSRS invent. Extend existing files; do not fork parallel undocumented “knowledge” only in plans. Plans may link; **research is topical truth**.

## Source of truth

1. `PLAN.md` — full phased plan and backlog  
2. `docs/gap/` — gap analysis and checklists  
3. `docs/plans/` — session working notes (+ **`docs/plans/INDEX.md`** catalog)  
4. `docs/runbooks/` — how to run/pack/test  
5. `docs/README.md` — doc hub + reading order  
6. `docs/context/COLD_START.md` — 1-page agent cold start  
7. `docs/context/operator-tldr.md` — **human** start/stop + paths  
8. `docs/context/DOC_MAP.md` — topic → path (fast lookup)  
9. `docs/context/collaboration-and-git.md` — product repo vs vendor forks  
10. `docs/research/INDEX.md` — research topic list  
11. **`docs/research/game-knowledge/`** — player-facing game knowledge corpus (prep, combat, anchors)  

## Layout

```text
vendor/Server, vendor/engine, vendor/content   # clones
cache/openrs2-377/                            # raw 377 cache (OpenRS2 ID 657)
scripts/                                      # automation
```

## Documentation discipline (mandatory)

**Every non-trivial step must update `docs/plans/` or `docs/gap/`.**  
**Never leave findings only in chat** — chat is not durable across compaction or new sessions.

### What must be written (same turn as the work)

| Event | Where to write |
|-------|----------------|
| Session start / end / inventory | `docs/plans/YYYY-MM-DD-*.md` |
| **Significant implementation** (port, harness module, engine/content fix) | `docs/plans/` (what landed + how to re-run) **and** gap/research if facts change |
| **New learnings** about client / server / engine / content / RuneScript | durable research doc — **not** plan-only |
| Gap / backlog / diff facts | `docs/gap/*.md` (checkboxes) |
| How-to change | `docs/runbooks/*.md` |
| Research / sources / checksums | `docs/research/*.md` |
| **RuneScript / opcodes / triggers / multi / chat helpers** | **`docs/research/runescript/`** — hub [`README.md`](docs/research/runescript/README.md); append to [`living-notes.md`](docs/research/runescript/living-notes.md) |
| Intentional non-authentic behavior | `docs/research/deviations.md` |
| Strategy choice | `docs/decisions/*.md` (create if needed) |
| **Progress notes: what worked / what failed / next** | Active `docs/plans/YYYY-MM-DD-*.md` (tables preferred) |

### Before implementing something new

1. **Review the docs corpus first** — do not reinvent from chat memory alone.  
2. Minimum pass (pick by domain):  
   - cold start: `docs/context/COLD_START.md`  
   - active plan: latest `docs/plans/` for the track  
   - content/RuneScript: `docs/research/runescript/README.md`  
   - authenticity / port ladder: `docs/research/authenticity-stance.md` + relevant `port-*-to-377.md`  
   - **quest/minigame config unit first:** `docs/research/port-quest-config-unit-first-377.md` — **forward-port `.obj` / `.npc` / `.loc` params (and timers) from ladder source before long thrash**; do not rediscover missing `next_obj_stage` after every script error  
   - **game knowledge (gear/levels/tiles/tele):** `docs/research/game-knowledge/` (+ `harness-tele-stand.md`) + `docs/research/INDEX.md`  
   - harness: `docs/runbooks/harness.md` + `docs/decisions/004-client-bot-harness-boundary.md`  
   - gap truth: `docs/gap/000-baseline.md` / `002-content-inventory.md` as needed  
3. If a prior plan or research note already covers the approach, **link and extend it** — do not fork a parallel undocumented path.

### Content port order (mandatory pattern)

When starting or residual-completing a **quest / minigame**:

1. **Config unit first** — objs / npcs / locs behavioral params from 274 (or ladder), onto 377 unpack names (keep models/IDs).  
2. **Pack + engine restart.**  
3. **Then** script hooks / thrash / soft mid-gates.

Anti-pattern: smoke → `inv_setslot … -1` / stuck wall → one-line param fix → smoke again. Full text: `docs/research/port-quest-config-unit-first-377.md`.

### Progress notes (worked / did not work)

For each non-trivial thrash or smoke:

- Record **PASS / FAIL**, account or run id when known, stage/var, and one-line cause.  
- Record **what did not work** and the dead end (so the next session does not repeat it).  
- Update the active plan checklist in the **same turn** as the result — not “later when green.”

### Commits + GitHub backup (mandatory track)

**Product workspace** (this tree: docs, tools/harness, scripts, PLAN, AGENTS) **is** a git repo and is backed up to the operator’s personal GitHub.

| | |
|--|--|
| **Owner** | `acfrazier` |
| **Repo** | [`acfrazier/LC-rs2-r377-workspace`](https://github.com/acfrazier/LC-rs2-r377-workspace) |
| **Visibility** | **Private** (GitHub has no “unlisted public”; private = only you + invitees) |
| **Default branch** | `main` |
| **Remote name** | `origin` |
| **CLI** | `gh` authenticated as `acfrazier` (scopes: `repo`, …) |
| **Does not include** | Full `vendor/*` trees (content/engine/client clones) — only `vendor/README.md` |

```bash
export LC377_ROOT=$RS2_R377_ROOT
cd "$LC377_ROOT"
git status -sb
git add -A && git commit -m "…"    # when a unit lands
git push origin main               # backup off-laptop
# inspect remote:
gh repo view acfrazier/LC-rs2-r377-workspace
gh browse   # open in browser (private; must be logged in)
```

**Never:**

- `git push` to `LostCityRS/*` from this project or from `vendor/*`  
- Change `origin` to a LostCityRS URL  
- Force-push `main` unless the operator explicitly asks  

**Vendor private backups** (also under `acfrazier`, **private**):

| Local path | GitHub (remote `private`) | Branch |
|------------|---------------------------|--------|
| `vendor/content` | https://github.com/acfrazier/LC-rs2-r377-content | `rs2-r377` |
| `vendor/engine` | https://github.com/acfrazier/LC-rs2-r377-engine | `rs2-r377` |
| `vendor/client-ts` | https://github.com/acfrazier/LC-rs2-r377-client-ts | `rs2-r377` |

On those clones: `origin` = LostCityRS (**push DISABLED**); `private` = acfrazier backup.  
See `vendor/README.md` for bootstrap after laptop loss.

When a coherent unit lands:

- Prefer **small, frequent commits** + push:  
  - workspace: `git push origin main`  
  - vendor: `git -C vendor/content push private rs2-r377` (and engine / client-ts as needed)  
- Name the tree in the message (`docs:`, `feat(harness):`, `wip(content):`, …).

Rules of thumb:

- If you measured a SHA, port, file count, or decided a branch — **write it in a plan or gap doc in the same turn**.  
- If you learned how **client / engine / content / `.rs2` handlers** behave — **append the durable research doc in the same turn** (plans may link; they must not be the only copy).  
- Prefer tables, checklists, absolute paths, and full SHAs.  
- Ephemeral dumps may go under `docs/superpowers/` (gitignored); anything needed for cold resume stays under `docs/{plans,gap,research,runbooks,context}`.

**Cold resume path:** `docs/context/COLD_START.md` → **`docs/plans/2026-08-08-promise-cleanup.md`** (HARD/SEG/DIRTY honesty) → `docs/research/historical-run-dirt-inventory.md` → `docs/plans/2026-08-07-content-breadth-backlog.md` → `docs/README.md` → `docs/gap/000-baseline.md`.

**Workspace name:** always open **`LC-rs2-r377-2006-05-02`**. The path `LC-rs2-r277-…` is a legacy symlink to the same tree (typo); do not treat them as two projects.

## First commands

```bash
export LC377_ROOT=$RS2_R377_ROOT
cd "$LC377_ROOT"
bash scripts/snapshot-status.sh
bash scripts/apply-isolation-config.sh
```

See `PLAN.md` §8–10 and `docs/runbooks/` for bootstrap order.
