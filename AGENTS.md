# Agent entrypoint — Fairy Ring

**Brand:** **Fairy Ring** — independent pre-EOC **RS2-era** preservation (method differs from Lost City; long horizon similar).  
**This tree’s focus:** historical **rev 377** (~May 2006) — not a permanent brand lock to one revision.  
**Derived from** Lost City / LostCityRS open work — **not** official Lost City.  
**Start here for agents:** [`AGENT_BRIEF.md`](AGENT_BRIEF.md) (token-light). This file is the rule set.

Env root:

```bash
export RS2_R377_ROOT=/path/to/fairy-ring   # clone root (folder name may vary)
cd "$RS2_R377_ROOT"
```

---

## 1. Accuracy bar (non-negotiable)

| Product (pure) | Toys |
|----------------|------|
| `vendor/client-ts`, `vendor/content`, `vendor/engine` | `tools/harness/**` (later bot in its own tree) |
| Defendable to LC-style accuracy readers | Fast thrash; **label** soft proofs |

1. **Do not invent** content, client handlers, dialogue, or loot.  
2. **Research ladder** (top → bottom): period cache/pack → Client-Java 377 → period media → other LC branches (prefer era-check / 274) → **OSRS last resort** (not RS3).  
3. **PASS** for a quest/skill stage means **live `.rs2` wrote that stage** — not host `setvar` of the claimed stage.  
4. Residual bar: one soft entry setvar → e2e with setstat/generic only; honest **FAIL**, no soft green.  
5. Soft thrash (`give` quest-critical items, mid setvar multi, etc.) is **DIRTY** if sold as authenticity.  
6. Intentional non-auth: `docs/research/deviations.md` (when present) or label in the PR/smoke header.

Full stance: `docs/research/authenticity-stance.md` (shipped on public surface).

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

Branding: Decision **009**. Public docs surface: Decision **011**.

---

## 3. Isolation & layout

| Service | Port (isolation default) |
|---------|-------------------------:|
| Web / browser client | **81** |
| Game TCP (Java client) | **43595** |
| Management | **8899** |
| Node id / revision | **37** / **377** |

```text
vendor/content|engine|client-ts   # git clones (not monorepo blobs)
cache/                            # local OpenRS2 download only — see cache/README.md
scripts/                          # bootstrap helpers
tools/harness/                    # toys
```

**Cache:** download yourself — OpenRS2 id **657** = RS2 build **377**.  
Do **not** use OpenRS2 path id `377` (OSRS 2014). **Never commit** cache blobs.  
Helper: `bash scripts/fetch-openrs2-cache.sh`.

**Vendors:** clone under `vendor/` — see `vendor/README.md` and `docs/research/PROVENANCE-UPSTREAM-PINS.md` when present.

---

## 4. Bootstrap (clone → run)

```bash
export RS2_R377_ROOT=/path/to/rs2-r377-workspace
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

| Need | Public / thin surface | Full private vault (if you have it) |
|------|------------------------|-------------------------------------|
| Rules (short) | **`AGENT_BRIEF.md`** | same |
| Rules (this file) | **`AGENTS.md`** | same |
| Authenticity | `docs/research/authenticity-stance.md` | + full research INDEX |
| Decisions | `docs/decisions/` | same |
| Upstream SHAs | `docs/research/PROVENANCE-UPSTREAM-PINS.md` | + each vendor `PROVENANCE.md` |
| Cache download | `cache/README.md` | same |
| Operator cold resume | — | `docs/context/COLD_START.md` · `docs/context/AGENTS-OPERATOR.md` |
| Session thrash / gap | — | `docs/plans/` · `docs/gap/` · game-knowledge corpus |

**Public thin export does not ship** full `docs/plans`, research corpus, or gap dumps (Decision **011**). Request scoped context via GitHub issues — see `CONTRIBUTING.md`.

---

## 6. Working rules

### Product vs harness

1. Changes under `vendor/client-ts|content|engine` → accuracy audience; cite sources.  
2. Changes under `tools/harness` only → toys OK; **label** soft proofs.  
3. Prefer honest mid-gates over green bars.  
4. **Config unit before thrash** when porting quests: obj/npc/loc params before multi-minute smokes.

### Long jobs

- Do not block for tens of minutes on one log stream.  
- Background long smokes; poll periodically.  
- On stall (same FAIL line, stuck login): inspect or kill — do not wait it out.  
- With a **full vault**, pull idle research while waiting (`docs/plans/idle-research-queue.md`). On **public thin** surface, use issue-driven context or local notes instead.

### Documentation (when the tree has those dirs)

- Durable facts → `docs/research/` (or PR description if research tree is thin).  
- Session thrash → dated plans **only if** that corpus exists (private vault).  
- Never leave the only copy of a learning in chat.

### Git

- Small, frequent commits with clear prefixes (`docs:`, `feat(harness):`, `fix(content):`, …).  
- Never force-push `main` unless the operator asks.  
- Never point `origin` at LostCityRS for experiment push.

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

*Operators with the full private vault: also read `docs/context/AGENTS-OPERATOR.md` and `docs/context/COLD_START.md`.*  
*Public brand is **Fairy Ring** (Decision **009**); git branch names may still say `rs2-r377`.*
