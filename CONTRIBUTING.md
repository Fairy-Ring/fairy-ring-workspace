# Contributing — rs2-r377 workspace

Thanks for interest. This repo is the **workspace process layer**, not a full playable dump.

**Brand:** **rs2-r377** — independent project **derived from** Lost City open-source work; **not** official Lost City. See [NOTICE](NOTICE.md).

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
- **Review promise:** **No good-faith PR will be dismissed without a clear rationale** (what fails the bar, what would make it acceptable, or why it is out of scope).  
- **Not a free pass:** soft-greens sold as residual authenticity, inventing content, harness hooks in pure Client-TS, or pushes to `LostCityRS/*` still fail the bar — with **stated** reasons, not silence.  
- **AI PRs:** same rules as human PRs (see above); disclose if you want; honesty about soft thrash still required.

## Before you open a PR

1. Read [README](README.md), [NOTICE](NOTICE.md), and **[`AGENT_BRIEF.md`](AGENT_BRIEF.md)** (token-light rules).  
2. Read the authenticity bar: [`docs/research/authenticity-stance.md`](docs/research/authenticity-stance.md).  
3. Product purity fence: [`docs/decisions/004-client-bot-harness-boundary.md`](docs/decisions/004-client-bot-harness-boundary.md).  
4. Prefer **honest FAIL / DIRTY labels** over soft greens sold as authenticity.  
5. **AI is used here** (coding agents as tools). If you use AI on a PR, that is fine — same bar as human edits: no invent, cite sources, do not claim authenticity without residual/product evidence.

## Public vs private docs (Decision 011)

| Public surface (export) | Private vault (operator) |
|-------------------------|--------------------------|
| README, NOTICE, LICENSE, CONTRIBUTING, `AGENT_BRIEF.md` | Full `docs/plans/**` thrash |
| Decisions + authenticity-stance | Full research corpus, gap, COLD_START |
| Thin runbooks + harness **code** | `CORPUS_DIGEST.md`, harness shots |

Most session plans and readiness XL **do not** belong in PRs aimed at a public export. Export helper: `scripts/export-public-workspace.sh`.

### Requesting deeper context

We **do not mind sharing** — thin defaults are for token cost and noise, not secrecy.

1. Open an **issue** with a **named unit** (e.g. `quest_mortton` Flamtaer residual, greegree leave-zone, mesbox IF_SETTEXT).  
2. State what you need (product path, readiness, known soft labels, client SHA).  
3. **Agents may open issues** the same way.  
4. We pattern-match private notes → **smell test** (Decision **011**: brand, residual bar, scope, hygiene, no invent) → scoped reply.  
5. We will **not** zip the whole vault or soft-green authenticity claims.

## What belongs where

| Change | Where |
|--------|--------|
| Public-facing rules / brief | Root + decisions + authenticity-stance |
| Private process (plans, full research, gap) | Operator vault — not required on public remote |
| Harness smokes / thrash / prep toys | `tools/harness/` only |
| Content / engine / pure client | Separate vendor trees — **not** mixed into pure Client-TS as harness hooks |
| Soft-pass “make CI green” that skips live `.rs2` | **Rejected** for product claims |

## Bootstrap (local)

```bash
export RS2_R377_ROOT=/path/to/rs2-r377-workspace   # preferred
# export LC377_ROOT="$RS2_R377_ROOT"               # legacy alias still used in older docs
cd "$RS2_R377_ROOT"

# 1) This workspace (already cloned)

# 2) Vendors (Lost City upstream and/or your forks)
mkdir -p vendor
# git clone … vendor/engine
# git clone … vendor/content
# git clone … vendor/client-ts
# See vendor/README.md for pin layout used by the operator.

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
- Use **`$RS2_R377_ROOT`** (or legacy `$LC377_ROOT`) in new docs; avoid personal laptop paths in cold-start material.  
- Residual / mid-gate smokes: one soft stage setvar at entry is OK when labeled; mid-path quest setvar / quest-critical give = **DIRTY**.

## PR expectations

| Kind | Expectation |
|------|-------------|
| **Docs / research** | Sources + ladder; link from `docs/research/INDEX.md` if new unit (private vault) or brief extract (public) |
| **Harness** | Label soft vs residual; no claim of pure product authenticity |
| **Content / client / engine** | Cite oracle (Client-Java 377, content scripts); ship as vendor patches or clear SHAs |
| **QoL client ideas** | Decision 010 — deferred until after content-complete / public debug phase |
| **Any good-faith fix** | Reviewed; decline only with **clear rationale** (see maintainer disclaimer) |

## Communication

- Issues: prefer reproducible residual FAIL (account/run id, stage, log path) over “feels wrong.”  
- Context requests: named unit + smell test (Decision 011).  
- Cross-project work with Lost City / rs2b0t/rs2b2t is normal; don’t speak for their roadmaps (Decision 009).

## License

Contributions to this workspace are under [LICENSE](LICENSE) (MIT) unless stated otherwise.  
You confirm you have the right to submit the change and that it does not dump Jagex assets into this git tree.
