# Decision 011 — Thin public docs surface + token-light agent brief

**Date:** 2026-08-09  
**Status:** accepted  
**Audience:** maintainers, agents, contributors  
**Parents:** Decision 009 (branding)

---

## Decision

1. **This GitHub workspace ships a thin docs surface**, not every research note or thrash log.  
2. **Product trees (content / engine / client-ts) open alongside** the thin workspace when remotes go public — not a monorepo dump of game trees into this repo.  
3. **Agents get a curated brief** (public root `AGENTS.md` from `docs/export/AGENTS.md`), not hundreds of session plans.  
4. **Sharing more on request is welcome.** Thin defaults are for **token cost and noise**, not secrecy.  
   Humans or agents may open a **GitHub issue** for a **named** content/engine/client unit.  
   Maintainers may share a **scoped extract** after a smell test — not a wholesale dump of private process notes.

5. **PR merge is unpromised** while maintainer focus is content-complete (2026-08-09).  
   Issues and discussion welcome from public open. A PR may wait or never merge unless someone has time to review properly; may change if contributors appear (`CONTRIBUTING.md`).

---

## Why

| Problem | Effect if we ship every thrash note |
|---------|--------------------------------------|
| **Size / noise** | Hundreds of markdown files bury the accuracy bar |
| **Token cost** | Cold agents that “read the repo” drown |
| **Honesty** | Public must not imply every mid-gate thrash is finished product truth |

Session thrash can stay private process. The **public surface** still carries the bar, fences, and deviations log.

---

## What ships on this surface

| Path / artifact | Role |
|-----------------|------|
| `README.md` · `NOTICE.md` · `LICENSE` · `CONTRIBUTING.md` | Brand, legal, how to contribute |
| Public `AGENTS.md` (from `docs/export/AGENTS.md`) | Token-light agent rules (vault root `AGENTS.md` stays operator-full) |
| `docs/decisions/*` | Product fences (004 · 009 · 010 · 011, …) |
| `docs/research/authenticity-stance.md` | Accuracy bar |
| **`docs/research/deviations.md`** | Intentional product/platform non-auth |
| **`docs/research/softpass.md`** | Soft mids / not-yet-e2e process ledger |
| **`docs/research/runescript/**`** | RuneScript first-principles manual |
| **`docs/research/game-knowledge/**`** | Anchors, combat floors, harness prep policy |
| **`docs/research/corpus/`** (inventories + rubric/trust) | Measured pack/folder facts; **not** verify-queue ops |
| `docs/research/PROVENANCE-UPSTREAM-PINS.md` | Upstream SHAs |
| Thin `docs/runbooks/*` | Bootstrap / isolation / harness |
| **`docs/export/progress/`** | Public 377 countdown. Server door = content-complete (maintainers e2e every quest). Org Pages `Fairy-Ring.github.io`. Vault truth is `docs/gap/003-content-complete-countdown.md` (not shipped). |
| `tools/harness/**` | Toys (no shot dumps) |
| `scripts/` | Isolation helpers |
| Vendor index README | Clone layout only |

## What does not ship here by default

| Kind | Why |
|------|-----|
| Session thrash plans, residual tick archaeology | Noise; account ids; laptop paths |
| Full readiness XL / port audits | Open an issue for a named unit instead |
| Gap checklists / cold-start operator dumps | Maintainer process |
| Harness screenshots / cache blobs | Size + policy |

---

## Public `AGENTS.md` (required shape)

This is the token-light brief. **`AGENT_BRIEF.md` was absorbed into it on 2026-08-12** after export started shipping `docs/export/AGENTS.md` instead of the vault operator file. A second short file would only duplicate this one.

1. What / era / not Lost City  
2. Accuracy bar (product vs toys; residual = live stage)  
3. Fence: client | content | engine | harness  
4. Bootstrap + isolation ports  
5. Research ladder (no invent)  
6. Never push LostCityRS; AI is a tool  
7. Docs map + **deviations** pointer  
8. Current focus (one short dated paragraph, optional)

**Do not put in the brief:** thrash tick logs, absolute machine paths, secrets, soft-green authenticity claims.

### Amendment (2026-08-12)

When Decision **011** landed, public `AGENTS.md` was going to be the huge vault operator file, so a separate `AGENT_BRIEF.md` was the token-light entry. Export later copies **`docs/export/AGENTS.md`** to public root `AGENTS.md`. That thin file already covers the brief. Keep one public rules file; do not resurrect `AGENT_BRIEF.md`.

---

## On-request context (issues) — smell test

### Invite

> Need depth on a **specific** quest, skill, pack flag, client bug, or residual claim?  
> **Open an issue** with the unit name and what you need.  
> Agents may open issues too. Scoped reply if it passes the smell test.

### Smell test (share only if all pass)

| Check | Fail if |
|-------|---------|
| **Brand** | Presented as official Lost City / LostCityRS |
| **Bar** | Soft thrash unlabeled; invent; residual PASS without live stage |
| **Scope** | “Dump all docs for X” with no named unit |
| **Hygiene** | Passwords, tokens, private emails, absolute home paths required |

### Ways to share

1. Issue comment with a short extract  
2. Gist / attached markdown  
3. Optional small PR under e.g. `docs/extracts/` later  

---

## Related

- Decision **009** — branding  
- `docs/research/authenticity-stance.md`  
- `docs/research/deviations.md` · `docs/research/softpass.md`  
- `CONTRIBUTING.md` · public `AGENTS.md`
