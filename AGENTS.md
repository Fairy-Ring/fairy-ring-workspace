# Agent entrypoint — Fairy Ring

> **Public thin export.** Maintainer vault uses a **fuller** root `AGENTS.md` (isolation paths, idle queue, FR-vault remotes).  
> Edit **this file** for public wording; export copies it to public root as `AGENTS.md`.

**Brand:** **Fairy Ring** — independent pre-EOC **RS2-era** preservation (method differs from Lost City; long horizon similar).  
**This tree’s focus:** historical **rev 377** (~2 May 2006) — not a permanent brand lock to one revision.  
**Next target (not this pack):** **rev 410** (~26 May 2006). Product stays 377 until a 410 track is opened.  
**Derived from** Lost City / LostCityRS open work — **not** official Lost City.  
**This file is the public token-light rule set** (Decision **011**). The maintainer vault keeps a fuller root `AGENTS.md`.

Env root:

```bash
export RS2_R377_ROOT=/path/to/fairy-ring-workspace   # @ branch rs2-r377 for this tree
cd "$RS2_R377_ROOT"
```

---

## 1. Accuracy bar (non-negotiable)

| Product (pure) | Toys |
|----------------|------|
| `vendor/client-ts`, `vendor/content`, `vendor/engine` | `tools/harness/**` (later bot in its own tree) |
| Defendable to LC-style accuracy readers | Fast thrash; **label** soft proofs |

1. **Do not invent** (a dest/stat/line/% with **no RuneScape cite**). Last-resort 2007-base **is** a cite. A labeled **CANDIDATE** from leftover / pack / period / 2007-base is a **best guess**, not invent. Ship it; update when a better source appears.  
   The bar is **Lost City’s**: when period is silent, map OSRS / 2007-base and walk **backward** (minus Changes). Do not dest onto an L1 plank or into a room our 377 maps do not have.  
2. **Research ladder** (top → bottom): period cache/pack → Client-Java 377 → period media → other LC branches (prefer era-check / 274) → **OSRS last resort** (not RS3). Last resort **finishes** the in-scope unit — it does not stall. **274/289 is the usual start** for era-correct systems; **LC is not infallible** — if this tree’s research (cache, Update:, headed proof) differs, prefer that. Full: `docs/research/authenticity-stance.md`.  
   Hop notes (`docs/research/<slug>-377.md`) keep **tiles / PASS ids / cites**. Ignore process tense in those files (“docs only”, “no product”, “STOP this unit”). Live queue is the maintainer opener + gap countdown. See `docs/research/hop-note-policy-377.md`.  
3. **PASS** for a quest/skill stage means **live `.rs2` wrote that stage** — not host `setvar` of the claimed stage.  
4. Residual bar: one soft entry setvar → e2e with setstat/generic only; honest **FAIL** on the residual span, no false green.  
5. Soft mids are a **process stage** (still implement varps/client behaviour) — log in **`docs/research/softpass.md`**. Misclaim = selling soft as residual complete.  
6. Intentional product non-auth: **`docs/research/deviations.md`**.

Full stance: `docs/research/authenticity-stance.md`.

**Maintainer disclaimer:** we do **not** claim the stack **is** authentic/complete today. Good-faith PRs from **all** (humans and agents) welcome; declines need clear rationale. See `CONTRIBUTING.md`.

---

## 2. Architecture fence (Decision 004)

```text
vendor/client-ts/   pure 1:1 Java 377 → TS — no harness hooks
vendor/content/     period RuneScript / configs (separate git)
vendor/engine/      server + pack (separate git)
tools/harness/      smokes, thrash, prep — not purity claims
```

- Client oracle = **Client-Java 377**, not Client-TS 289.  
- Bot/harness is a **means** to prove r377 content — not a 274 “complete world” product layer.  
- **Never** push experiment work to `LostCityRS/*` without explicit permission.  
- Harness **headed** by default (`HEADLESS=1` only for CI/batch).

Branding: Decision **009**. Thin public surface: Decision **011**.

---

## 3. Isolation & layout

| Service | Port (isolation default) |
|---------|-------------------------:|
| Web / browser client | **81** |
| Game TCP (Java client) | **43595** |
| Management | **8899** |
| Node id / revision | **37** / **377** |

Browser TS talks **WebSocket on the web port**, not TCP 43595.

```text
vendor/content|engine|client-ts   # git clones (not monorepo blobs)
cache/                            # local OpenRS2 download only — see cache/README.md
scripts/                          # bootstrap helpers
tools/harness/                    # toys
```

**Cache:** download yourself — OpenRS2 id **657** = RS2 build **377**.  
Do **not** use OpenRS2 path id `377` (OSRS 2014). **Never commit** cache blobs.  
Helper: `bash scripts/fetch-openrs2-cache.sh`.

**Vendors:** clone under `vendor/` — see `vendor/README.md` and `docs/research/PROVENANCE-UPSTREAM-PINS.md`.

---

## 4. Bootstrap (clone → run)

```bash
export RS2_R377_ROOT=/path/to/fairy-ring-workspace
cd "$RS2_R377_ROOT"
# 1) clone content, engine, client-ts → vendor/  (branch rs2-r377)
# 2) bash scripts/fetch-openrs2-cache.sh          # optional local cache
# 3) bash scripts/apply-isolation-config.sh
# 4) cd vendor/engine && npm install && npm start
# 5) pure client via engine public/; harness: bun tools/harness/build-client.mjs
bash scripts/snapshot-status.sh   # when vendors present
```

Details: `README.md`, `CONTRIBUTING.md`, `docs/runbooks/` (when present).

---

## 5. What agents should open

| Need | Path |
|------|------|
| Rules (this file) | **`AGENTS.md`** |
| Authenticity | `docs/research/authenticity-stance.md` |
| Hop notes vs queue | `docs/research/hop-note-policy-377.md` |
| Intentional non-auth | `docs/research/deviations.md` |
| Soft mids / not-yet-e2e | `docs/research/softpass.md` |
| RuneScript language/runtime | `docs/research/runescript/README.md` |
| Anchors / combat floors / prep | `docs/research/game-knowledge/` |
| Pack/folder inventories + rubric | `docs/research/corpus/` |
| Decisions | `docs/decisions/` |
| Upstream SHAs | `docs/research/PROVENANCE-UPSTREAM-PINS.md` · vendor `PROVENANCE.md` |
| Cache download | `cache/README.md` |
| Deeper unit research | **GitHub issue** with a named unit (Decision **011**) |

This surface does **not** ship full session plans or the entire research corpus. Prefer issues for scoped context over inventing missing docs.

---

## 6. Working rules

### Product vs harness

1. Changes under `vendor/client-ts|content|engine` → accuracy audience; cite sources.  
2. Changes under `tools/harness` only → toys OK; **label** soft proofs.  
3. Prefer honest mid-gates over green bars.  
4. **Config unit before thrash** when porting quests: obj/npc/loc params before multi-minute smokes.  
5. **Crumbs:** tele **next to** locs; gear matches setstat; no quest-critical `give` on residual claims.

### Long jobs

- Do not block for tens of minutes on one log stream.  
- Background long smokes; poll periodically.  
- On stall (same FAIL line, stuck login): inspect or kill — do not wait it out.

### Documentation

- Intentional non-auth → **`docs/research/deviations.md`**; soft mids → **`docs/research/softpass.md`** same turn.  
- **RuneScript** (opcodes, triggers, delay/protect, multi, chat helpers, pack/runtime contracts) → same turn append **`docs/research/runescript/living-notes.md`**; promote recurring patterns into `runtime.md` / `patterns.md` / `failures.md`.  
- Durable facts → research notes or PR description.  
- Never leave the only copy of a learning in chat.

### Git

- **Commits stay frequent.** Small commits with clear prefixes (`docs:`, `feat(harness):`, `fix(content):`, …). Chat is not a backup.  
- **Only `FR-vault` is private.** Push it with the commits.  
- **`FR-content` / `FR-engine` / `FR-client-ts` are public** (remote name `private` is a leftover). Push `rs2-r377` when a coherent unit lands.  
- Thin `fairy-ring-workspace` only when the export surface changed or a maintainer asked this turn.  
- Never force-push shared branches unless maintainers explicitly ask.  
- Never point `origin` at LostCityRS for experiment push.  
- Never push to `LostCityRS/*`.

### AI

AI/coding agents are **tools**. Disclose use; humans own authenticity claims. Same bar for agent-authored PRs.

---

## 7. Hard don’ts

- Invent content or client ops  
- Install harness/bot hooks into pure Client-TS  
- Push to `LostCityRS/*` without permission  
- Claim residual PASS with soft stage setvars  
- Commit cache blobs, `.env`, secrets, or harness shot dumps  
- Present this project as official Lost City  

---

*Public brand is **Fairy Ring** (Decision **009**); git branch names may still say `rs2-r377`.*
