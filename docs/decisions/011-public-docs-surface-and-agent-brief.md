# Decision 011 — Public docs surface + token-light agent brief

**Date:** 2026-08-09  
**Status:** accepted (plan before flip; implement before/at public open)  
**Audience:** operator, agents, future public readers  
**Parents:** Decision 009 (branding) · [`docs/plans/2026-08-07-public-workspace-readiness.md`](../plans/2026-08-07-public-workspace-readiness.md)

---

## Decision

1. **Most documentation stays off the public repo.**  
   The working vault (session plans, residual thrash logs, full research corpus, gap dumps, harness shots) is **operator/private process**, not a public knowledge dump.

2. **Public open is launch-together of product trees + a thin workspace surface**, not “open the entire `docs/` tree.”

3. **Agents (especially token-light) get a curated brief**, not `COLD_START` + 70 research files + 200 plans.  
   Full corpus remains the source of truth **privately**; public/agent-facing material is a **lossy summary** with explicit “see private vault for depth.”

4. **Sharing more on request is welcome.**  
   Default thin public surface is about **practicality and tokens**, not secrecy of process.  
   Humans **or agents** may open a **GitHub issue** asking for more context on a **named** content/engine/client unit.  
   Maintainers (or tools) **pattern-match** the request, run a **smell test**, and may publish a **scoped extract** (comment, gist, small PR into public docs, or attached markdown) — not the whole vault.

---

## Why

| Problem | Effect if we ship all `docs/` |
|---------|-------------------------------|
| **Size / noise** | ~300MB+ plans tree, hundreds of markdown files, absolute laptop paths, account ids, thrash noise |
| **Token cost** | Cold agents that “read the repo” drown; accuracy bar is buried under session dumps |
| **Practicality** | Outsiders and LC readers need brand, bar, bootstrap — not Flamtaer tick logs |
| **Honesty** | Public should not imply every mid-gate thrash is finished product truth |

Session plans and residual logs remain **mandatory private discipline** (`AGENTS.md`). They do **not** need to be public for the project to be useful or citable at a high level.

---

## Two surfaces

```text
┌─────────────────────────────────────────────────────────┐
│  PRIVATE vault (this working tree / private GH)         │
│  docs/plans/*  docs/research/*  docs/gap/*              │
│  docs/context/COLD_START  AGENTS full  harness shots    │
│  = operator + full agents + residual truth              │
└─────────────────────────────────────────────────────────┘
                          │ summarize / curate
                          ▼
┌─────────────────────────────────────────────────────────┐
│  PUBLIC surface (what ships when visibility=public)     │
│  README · NOTICE · LICENSE · CONTRIBUTING               │
│  Decision 004/009/010/011 (short)                       │
│  authenticity-stance (or 1-page extract)                │
│  AGENT_BRIEF.md  (token-light)                          │
│  optional: thin runbook “how to run isolation”          │
│  tools/harness may ship; thrash logs must not           │
└─────────────────────────────────────────────────────────┘
```

Vendor public remotes (content/engine/client-ts): **README + NOTICE + LICENSE only** for docs story — no workspace corpus.

---

## What is public vs private

### Public (include at flip)

| Path / artifact | Role |
|-----------------|------|
| `README.md` | Brand, derivation, AI, bootstrap, fence |
| `NOTICE.md` · `LICENSE` · `CONTRIBUTING.md` | Legal + how to contribute |
| `docs/decisions/004-*.md` · `009-*.md` · `010-*.md` · `011-*.md` | Product fences people will argue about |
| `docs/research/authenticity-stance.md` | Accuracy bar (or a public extract if full file is too operator-specific) |
| **`AGENT_BRIEF.md`** (root or `docs/`) | **Token-light agent/human entry** — see § below |
| Optional thin `docs/runbooks/isolation.md` / bootstrap only | Ports, pack yourself, no laptop paths |
| `tools/harness/**` | Toys fence stated; no `harness-shots` |
| `scripts/` isolation helpers | As today |
| Vendor READMEs | Already launch-together |

### Private (keep off public repo / do not export)

| Path / artifact | Role |
|-----------------|------|
| `docs/plans/**` | Session thrash, residual logs, account ids, fail archaeology |
| `docs/research/**` except authenticity-stance (+ maybe INDEX stub) | Full corpus, port audits, pack flags, readiness XL |
| `docs/gap/**` | Checklist dumps |
| `docs/context/COLD_START.md` · `operator-tldr.md` · full `DOC_MAP` | Operator-dense; paths; current residual pointers |
| Full `AGENTS.md` as written | Can stay private **or** ship a slim public `AGENTS.md` that only points at `AGENT_BRIEF` |
| `docs/superpowers/` · harness shots · cache-parity bins | Already gitignored |
| Absolute laptop paths in private plans | Never need public scrub if never shipped (export sed also rewrites) |

### Implementation options (pick one at flip)

| Option | How | Pros | Cons |
|--------|-----|------|------|
| **A. Public export branch / second remote** | `fairy-ring-workspace` with sparse paths only | Clean; private vault untouched | Two remotes to push |
| **B. Split at flip: thin public clone** | New repo populated by script from private | Clear boundary | Maintain export script |
| **C. Same repo, `.publicinclude` + export CI** | Build public tree in CI | Automated | Easy to leak if misconfigured |

**Recommendation:** **B or A** — private vault remains the working tree; public is an **export**, not “gitignore half of history later.” Do **not** rewrite private history solely for docs bulk.

---

## Token-light agent brief (`AGENT_BRIEF.md`)

**Target size:** ~1.5–3k tokens (roughly 800–1500 words / ~100–150 lines).  
**Audience:** coding agents and humans who must not load the full corpus.  
**Not a replacement** for private `COLD_START` when doing residual product work on the operator machine.

### Required sections (stable outline)

1. **What this is** — Fairy Ring, rev 377 focus, derivation of Lost City, not official LC  
2. **Accuracy bar** — product vs toys; residual PASS = live stage write; no soft-green  
3. **Architecture fence** — client pure / content / engine / harness toys (Decision 004)  
4. **Bootstrap** — clone workspace + vendors + cache yourself; isolation ports  
5. **Research ladder** — cache → pack → period → LC era → OSRS last; no invent  
6. **Hard rules** — never push LostCityRS; never install harness into client-ts  
7. **Corpus map (pointers only)** — “private vault has full research; public has this brief”  
8. **Current product focus (one paragraph, dated)** — e.g. Flamtaer residual; update at major milestones  
9. **AI disclosure** — tools, not authenticity oracles  

### What the brief must **not** contain

- Full stage tables for every quest  
- Account names, thrash tick logs, screenshot paths  
- Absolute laptop paths  
- “PASS” claims without HARD/SEG/DIRTY labels (link private dirt ledger when operating privately)

### Maintenance

| Event | Update |
|-------|--------|
| Public flip / brand change | README + brief same turn |
| New Decision that changes fence | Brief § fence + link decision |
| Major residual green / content-complete milestone | Brief § current focus one paragraph |
| Weekly thrash | **Do not** bloat brief — private plans only |

Optional later: **`docs/research/CORPUS_DIGEST.md`** (private) = slightly longer (~5–8k tokens) rolling summary of game-knowledge + top readiness scores, generated/updated by agents while smokes run — **still private**, feeds the public brief’s one-paragraph focus.

---

## Relationship to existing docs

| Existing | Public role after this decision |
|----------|----------------------------------|
| `AGENTS.md` | Private full rules **or** slim public pointer → `AGENT_BRIEF` |
| `docs/context/COLD_START.md` | **Private** operator/agent resume |
| `docs/research/INDEX.md` | **Private** research catalog |
| `docs/research/game-knowledge/*` | **Private** corpus; digest into brief rules only |
| `docs/plans/*` | **Private** always |
| `README.md` | Public human entry (already thin) |
| Decision 009 checklist | Add “export surface” + “AGENT_BRIEF landed” |

---

## Checklist before public flip (docs surface)

**Horizon:** public thrash **before** content-complete — [`../plans/2026-08-09-horizon-public-then-content.md`](../plans/2026-08-09-horizon-public-then-content.md).

- [x] Choose export option **B-style** + `scripts/export-public-workspace.sh` (2026-08-09; dry-run OK)  
- [x] Author **`AGENT_BRIEF.md`**  
- [x] Private **`docs/research/CORPUS_DIGEST.md`** for denser local agents  
- [x] Confirm public tree has **no** `docs/plans/`, **no** full research dump, **no** harness-shots (dry-run)  
- [x] README “Start here” points to brief + CONTRIBUTING, not COLD_START  
- [x] CONTRIBUTING: public vs private + bugfix proof bar (2026-08-09)  
- [x] Thin export remote: `acfrazier/fairy-ring-workspace` **private** for review (2026-08-09)  
- [x] Bugfix issue template (proof for human review) — **2026-08-09**  

- [ ] Operator review; then visibility public (+ vendors) on call  
- [x] Vendor READMEs already thin (done 2026-08-09)  
- [ ] Never claim public docs = full authenticity proof archive  


---

## On-request context (issues) — smell test

### Invite (public README / CONTRIBUTING / AGENT_BRIEF)

> Need depth on a **specific** quest, skill, pack flag, client bug, or residual claim?  
> **Open an issue** with the unit name and what you need (e.g. “Flamtaer sanctity mesbox — product path only”).  
> Agents may open issues too. We will share a **scoped** note if it passes the smell test below.

### Pattern-match the request

| Input | Action |
|-------|--------|
| Named unit (`quest_mortton`, greegree, IF_SETTEXT, …) | Map to private research / plan / gap rows |
| Vague “dump all docs” / “full COLD_START” | **Decline** or point at AGENT_BRIEF + authenticity-stance |
| Soft-green claim fishing (“prove complete with soft setvar”) | Share **honest** HARD/SEG/DIRTY labels only |
| Secrets / accounts / absolute laptop paths | **Strip** before any share |

### Smell test (must pass before publish)

| Check | Pass if |
|-------|---------|
| **Brand** | Fairy Ring derivation language; not “official Lost City” |
| **Bar** | Soft thrash labeled DIRTY/SEG; no invent; residual PASS only if live stage |
| **Scope** | One unit or one bug class — not entire plans tree |
| **Hygiene** | No passwords, tokens, private emails required; scrub `/Users/…` |
| **Noise** | No raw 500-line thrash tick dumps unless asked as debug paste |
| **IP** | No cache blobs / Jagex asset dumps; cite ladder for content facts |
| **Purity** | Product patches vs harness toys clearly separated |
| **AI** | Agent-drafted extracts still human-reviewable for authenticity claims |

### Share shapes (prefer smallest)

1. Issue comment with 5–20 line extract + links to public fences  
2. Short markdown attached / gist (`research-extract-*.md`)  
3. Small PR into **public** tree under e.g. `docs/extracts/` (optional later)  
4. Decline + pointer to ladder if we have no defendable note yet  

### Operator / agent checklist when fulfilling an issue

```text
1. Identify unit → private INDEX / CORPUS_DIGEST / plan row
2. Draft extract (facts + SHAs/accounts only if useful; scrub paths)
3. Smell test table mentally (brand, bar, scope, hygiene, noise, IP, purity)
4. Post scoped reply; do not zip the vault
5. Optional: promote stable extract into public docs if often requested
```

---

## Non-goals

- Deleting private plans/research (still mandatory for residual discipline)  
- Making agents dumber on the operator machine (private vault stays rich)  
- Shipping a second “wiki” of every quest readiness score publicly  
- Marketing speed vs Lost City  
- Refusing all deep questions (we **prefer** issue-driven share over silent walls)

---

## Related

- Decision 009 branding  
- `docs/research/authenticity-stance.md`  
- `docs/plans/2026-08-07-public-workspace-readiness.md`  
- `docs/plans/idle-research-queue.md` (private process; not a public artifact)
