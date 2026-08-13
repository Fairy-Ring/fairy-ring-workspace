# Contributing — Fairy Ring workspace

Thanks for interest. This repo is the **workspace process layer**, not a full playable dump.

**Brand:** **Fairy Ring** — independent project **derived from** Lost City open-source work; **not** official Lost City.  
Long horizon: pre-EOC RS2-era preservation; **this tree** focuses **rev 377** (~May 2006). See [NOTICE](NOTICE.md) · Decision **009**.

## Maintainer disclaimer (read this first)

As maintainer we **do not claim** that this project **is** authentic, original, or complete today.

| We aim for | We disclaim |
|------------|-------------|
| A careful rev‑377 accuracy **bar** (honest residual proofs, no invent) | That the current trees **are** period-perfect or “done” |
| Clear soft vs product labels (HARD / SEG / DIRTY) | That every mid-gate or green bar is authenticity |
| Good-faith review of **all** contributors | Gatekeeping by pedigree (human vs agent, LC insider vs outsider) |

**Humans and agents make mistakes** — including ours. That is expected on a preservation path.

### Contributions from everyone

- **Who:** humans, coding agents, LC readers, newcomers — **all** welcome if the change is offered in **good faith**.  
- **What we look for:** does it improve the project (accuracy, honesty, tooling, docs) under the bar — not who authored it.  
- **AI PRs:** same rules as human PRs; disclose if you want; honesty about soft thrash still required.

### PR / review policy (honest — 2026-08-09)

**Maintainer focus is content-complete** under the authenticity bar. That is the priority, not a PR queue.

| | |
|--|--|
| **Issues** | Welcome (bugs, context, discussion). Prefer proof-rich reports. |
| **PRs** | Welcome as proposals / evidence. **Merge is not promised.** |
| **Merge** | **Maybe** — only if a maintainer has time to review and the change is clearly good under the bar. Silence ≠ rejection forever. |
| **Do not expect** | Fast review, review at all, or merge before content-complete work allows bandwidth. |

This may **loosen over time** if the project gains contributors or the maintainer bandwidth changes — no hard calendar. Until then, treat merge as best-effort, not a service level.

- Prefer **issues** with repro / proof (see bug template) over drive-by PR spam.  
- Bugfix PRs without human-reviewable proof will not be reviewed (see below).  
- Soft-greens sold as residual authenticity, invent, harness hooks in pure Client-TS, or pushes aimed at `LostCityRS/*` still fail the bar.

## Before you open a PR (or issue)

1. Read [README](README.md), [NOTICE](NOTICE.md), and **[`AGENTS.md`](AGENTS.md)** (token-light rules).  
2. Read the authenticity bar: [`docs/research/authenticity-stance.md`](docs/research/authenticity-stance.md).  
3. Product purity fence: [`docs/decisions/004-client-bot-harness-boundary.md`](docs/decisions/004-client-bot-harness-boundary.md).  
4. Prefer **honest FAIL / softpass labels** over soft greens sold as authenticity.  
5. **AI is used here** (coding agents as tools). Same bar as human edits: no invent, cite sources, do not claim authenticity without residual/product evidence.

## Docs on this surface (Decision 011)

This repo is intentionally **thin**: enough for bootstrap, accuracy bar, and evidence-backed PRs.

| On this tree | Ask via issue (not assumed in-tree) |
|--------------|-------------------------------------|
| README, NOTICE, LICENSE, CONTRIBUTING, `AGENTS.md` | Full session thrash logs |
| Decisions + authenticity-stance + **deviations** | Long readiness XL / unit port dumps |
| Thin runbooks + harness **code** | Harness screenshot dumps |

### Requesting deeper context

Thin defaults are for **token cost and noise**, not secrecy.

1. Open an **issue** with a **named unit** (e.g. `quest_mortton` Flamtaer residual, greegree leave-zone, mesbox IF_SETTEXT).  
2. State what you need (product path, readiness, known soft labels, client SHA).  
3. **Agents may open issues** the same way.  
4. Maintainers may share a **scoped** extract if it passes the smell test (Decision **011**: brand, residual bar, scope, hygiene, no invent).  
5. We will **not** soft-green authenticity claims without evidence.

## What belongs where

| Change | Where |
|--------|--------|
| Rules / brief / authenticity | Root + decisions + `authenticity-stance` + **`deviations`** + **`softpass`** |
| Harness smokes / thrash / prep toys | `tools/harness/` only |
| Content / engine / pure client | Separate vendor trees — **not** mixed into pure Client-TS as harness hooks |
| Soft-pass “make CI green” that skips live `.rs2` | **Rejected** for product claims |

## Bootstrap (local)

```bash
export RS2_R377_ROOT=/path/to/fairy-ring-workspace   # preferred
# export RS2_R377_ROOT="$RS2_R377_ROOT"               # legacy alias still used in older docs
cd "$RS2_R377_ROOT"

# 1) This workspace (already cloned)

# 2) Vendors (Lost City upstream and/or your forks)
mkdir -p vendor
# git clone … vendor/engine
# git clone … vendor/content
# git clone … vendor/client-ts
# See vendor/README.md for pin layout.

# 3) Cache — download yourself; NEVER commit blobs
#    OpenRS2 id 657 = RS2 build 377 (NOT openrs2 path …/377/ — that is OSRS)
#    Links + layout: cache/README.md
bash scripts/fetch-openrs2-cache.sh   # optional helper → cache/openrs2-377/

# 4) Isolation / snapshot
bash scripts/apply-isolation-config.sh   # if present
bash scripts/snapshot-status.sh

# 5) Engine pack + start (from vendor/engine; load that tree’s .env)
# cd "$RS2_R377_ROOT/vendor/engine" && npm install && npm start

# 6) Harness client (headed by default)
# bun tools/harness/build-client.mjs
# node tools/harness/…-smoke.mjs
```

**Ports (this project’s isolation defaults):** web **81**, game **43595**, management **8899**, node id **37**, revision **377**.  
Do not point experiments at live 274 production trees.

## Hard rules

- **Never** `git push` to `LostCityRS/*` without explicit permission.  
- **Never** present this project as official Lost City / “LC.”  
- **Never** commit cache blobs (OpenRS2 downloads stay local; see `cache/README.md`), `.env`, PEM private keys, or harness screenshot dumps.  
- Use **`$RS2_R377_ROOT`** in new docs; avoid machine-specific absolute paths.  
- Residual / mid-gate smokes: one soft stage setvar at entry is OK when labeled; mid-path quest setvar / quest-critical give = **DIRTY**.

### Commit vs push (live / public)

| | |
|--|--|
| **Commits** | Stay **small and frequent** — durable units of work, not chat. |
| **Pushes** | **Only when a maintainer asks.** Vault, `FR-*`, and the public export wait. Silence on GH does not mean work stopped. |

## PR expectations

| Kind | Expectation |
|------|-------------|
| **Docs / research** | Sources + ladder; product non-auth → `deviations.md`; soft mids → `softpass.md`; deep unit notes via issue if not in-tree |
| **Harness** | Label soft vs residual; no claim of pure product authenticity |
| **Content / client / engine** | Cite oracle (Client-Java 377, content scripts); ship as vendor patches or clear SHAs |
| **Bugfix PRs** | **Not reviewed** without **sufficient proof for human review** (repro, stage/var or run id, log/shot, soft vs residual honesty, expected vs actual). Prefer the bug **issue** template. Merge still unpromised (see above). |
| **Product / docs PRs** | Merge **maybe** if review time exists; default expectation is **none** while content-complete is the focus. |
| **QoL client ideas** | Decision 010 — late; not the current focus |

## Communication

- Issues: prefer reproducible residual FAIL (account/run id, stage, log path) over “feels wrong.”  
- Context requests: named unit + smell test (Decision 011).  
- Cross-project work with Lost City / rs2b0t/rs2b2t is normal; don’t speak for their roadmaps (Decision 009).

## License

Contributions to this workspace are under [LICENSE](LICENSE) (MIT) unless stated otherwise.  
You confirm you have the right to submit the change and that it does not dump Jagex assets into this git tree.
