# Fairy Ring — agent brief (token-light)

**Audience:** coding agents and humans who must not load the full private corpus.  
**Size target:** ~1.5–3k tokens. **Lossy on purpose.**  
**Private vault** (operator machine / private GH) has full plans, research, gap, residual thrash.  
**Public open** ships this brief + README/NOTICE + fences — not the whole `docs/` tree (Decision **011**).

---

## 1. What this is

| | |
|--|--|
| **Name** | **Fairy Ring** |
| **Era** | Historical RuneScape revision **377** (~2 May 2006) |
| **Relation** | **Derivation** of open Lost City / LostCityRS work — **not** official LC, not endorsed by LC or Jagex |
| **This workspace** | Process + harness toys + docs (private: full; public: thin) |
| **Product trees** | Separate remotes: content, engine, client-ts (git branch may still be `rs2-r377`) |

Do not present as “Lost City,” “LC,” or “RS2 product.” See `NOTICE.md` and Decision **009**.

**Purpose:** original period game is not fully recoverable; use every good tool (**including AI**) so something honest is **playable in human time** and can **outlast** us. Not a completeness stamp.

---

## 2. Accuracy bar (non-negotiable)

| Pure product | Toys |
|--------------|------|
| `vendor/client-ts`, `vendor/content`, `vendor/engine` | `tools/harness/**` (later bot in its own tree) |
| Defendable to LC-style accuracy readers | Iterate fast; **label** soft proofs |

- **Do not invent** content, client handlers, or “close enough” dialogue/loot.  
- **PASS** for a quest/skill stage means **live `.rs2` wrote that stage** — not host `setvar` of the claimed stage.  
- Residual bar: one soft `setvar` entry → e2e with setstat/generic only; honest **FAIL**, no soft green.  
- Soft thrash (give sacred oil, force multi bits, etc.) is **DIRTY** if sold as authenticity.

Full stance: `docs/research/authenticity-stance.md`.

---

## 3. Architecture fence (Decision 004)

```text
vendor/client-ts/   pure 1:1 Java 377 → TS — no harness hooks
vendor/content/     period RuneScript / configs
vendor/engine/      server + pack
tools/harness/      smokes, thrash, prep — not purity claims
```

- Client oracle = **Client-Java 377**, not Client-TS 289.  
- Bot/harness is a **means** to prove r377 content — not a 274 “complete world” product layer.  
- **Never** push experiment work to `LostCityRS/*` without explicit permission.  
- Harness **headed** by default (`HEADLESS=1` only for CI/batch).

---

## 4. Bootstrap (high level)

```bash
export RS2_R377_ROOT=/path/to/fairy-ring   # clone root; legacy env names may appear in old notes
# clone content, engine, client-ts → vendor/
# cache: download yourself — OpenRS2 id 657 = RS2 build 377 (NOT path …/377/)
# bash scripts/fetch-openrs2-cache.sh
bash scripts/apply-isolation-config.sh
cd vendor/engine && npm start
```

| Service | Isolation port |
|---------|---------------:|
| Web (browser / harness) | **81** |
| Game TCP (Java client) | **43595** |
| Management | **8899** |

Browser TS uses **WS on web port**, not TCP 43595.  
**Cache guide:** `cache/README.md` — public OpenRS2 links; **no blobs in git**.

---

## 5. Research ladder (no invent)

Prefer top → bottom:

1. Period cache / pack (OpenRS2 **657**)  
2. Decompiled Client-Java 377  
3. Period media (~2005–mid-2006)  
4. Other LC branches (**prefer 274 / era-check** over inventing)  
5. **OSRS last resort** — not RS3  

RuneScript **language** semantics: **@JagexAsh** posts are authoritative for how scripts work; they do not authorize inventing May 2006 *content*.

**Config unit before thrash:** port obj/npc/loc params before multi-minute smokes.

---

## 6. AI use

AI/coding agents are **tools**. Disclose use; humans own authenticity claims. Same bar for agent-authored PRs.

---

## 7. Docs map

| Need | Public / brief | Private vault (operator) |
|------|----------------|---------------------------|
| Cold product residual | This file + authenticity extract | `docs/context/COLD_START.md` |
| Session thrash | — | `docs/plans/YYYY-MM-DD-*.md` |
| Full research catalog | — | `docs/research/INDEX.md` |
| Gear / combat / tiles | crumbs below | `docs/research/game-knowledge/` |
| Public flip | Decision **011** | export script |

**Crumbs:** tele **next to** locs; gear matches setstat; no quest-critical give on residual.

---

## 8. Current focus (dated — update at milestones)

**2026-08-09:** Flamtaer / Shades of Mort’ton **residual bar §2** — soft entry 50 → product rebuild → oil → remake → pyre/Loar → complete **85**. Honest FAIL on thrash; do not soft-green.  
Public brand locked **Fairy Ring** (Decision **009**).

---

## 9. Hard don’ts

- Invent content or client ops  
- Install bot/harness into pure Client-TS  
- Push to LostCityRS without permission  
- Claim residual PASS with soft stage setvars  
- Dump private thrash logs as public “proof archive”  
- Present as official Lost City or Jagex  

---

## 9b. Maintainer disclaimer + contributions

We **disclaim** that the project **is** authentic / original / complete today.  
Good-faith PRs from **anyone** (humans and agents) welcome; declines need **clear rationale**.  
See `CONTRIBUTING.md`.

---

## 10. Need more context? Open an issue

Thin public docs are for **tokens and practicality**, not a closed vault. Named unit + smell test (Decision **011**).

---

*Maintainers: keep this file short. Bump §8 only at real milestones.*
