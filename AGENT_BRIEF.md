# Fairy Ring — agent brief (token-light)

**Audience:** coding agents and humans who should not need a private research dump to start.  
**Size target:** ~1.5–3k tokens. **Lossy on purpose.**  
This repo is the **thin contributor surface** (Decision **011**): rules, fences, harness, deviations — not every session thrash log.

---

## 1. What this is

| | |
|--|--|
| **Name** | **Fairy Ring** |
| **Long horizon** | Pre-EOC / pre-RS3 **RS2-era** preservation (same *goal* family as LC; different *method*) |
| **This tree** | Focus **rev 377** (~May 2006) — current focus, **not** brand lock |
| **Relation** | **Derivation** of open Lost City / LostCityRS work — **not** official LC |
| **This workspace** | Process + harness toys + thin docs |
| **Product trees** | Separate remotes: content, engine, client-ts (branch labels may say `rs2-r377`) |

Do not present as “Lost City,” “LC,” or a Jagex product. See `NOTICE.md` and Decision **009**.

**Purpose:** original not fully recoverable; use every good tool (**including AI**) so honest stacks are **playable in human time**. Not a completeness stamp. Client surfaces (pure / bot / QoL): Decision **010** — purpose is choice.

---

## 2. Accuracy bar (non-negotiable)

| Pure product | Toys |
|--------------|------|
| `vendor/client-ts`, `vendor/content`, `vendor/engine` | `tools/harness/**` (later bot in its own tree) |
| Defendable to LC-style accuracy readers | Iterate fast; **label** soft proofs |

- **Do not invent** content, client handlers, or “close enough” dialogue/loot.  
- **PASS** for a quest/skill stage means **live `.rs2` wrote that stage** — not host `setvar` of the claimed stage.  
- Residual bar: one soft `setvar` entry → e2e with setstat/generic only; honest **FAIL**, no soft green.  
- Soft mids are a **process stage** (varps/client still real work) — log in `docs/research/softpass.md`.  
- Soft thrash sold as residual authenticity is a **misclaim** — not the same as having a soft mid.  
- Intentional product non-auth → `docs/research/deviations.md`.

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
export RS2_R377_ROOT=/path/to/fairy-ring-workspace
# clone content, engine, client-ts → vendor/  (see vendor/README.md)
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

## 7. Docs map (this surface)

| Need | Where |
|------|--------|
| Token-light rules | This file |
| Full agent rules | `AGENTS.md` |
| Authenticity bar | `docs/research/authenticity-stance.md` |
| Intentional non-auth | `docs/research/deviations.md` |
| Soft mids / not-yet-e2e | `docs/research/softpass.md` |
| RuneScript language/runtime | `docs/research/runescript/README.md` |
| Anchors / combat floors / prep | `docs/research/game-knowledge/` |
| Pack/folder inventories + rubric | `docs/research/corpus/` |
| Fences / brand / thin public policy | `docs/decisions/` (004 · 009 · 010 · 011) |
| Upstream SHAs | `docs/research/PROVENANCE-UPSTREAM-PINS.md` |
| Deeper unit notes | **Open a GitHub issue** with a named unit (Decision **011**) |

**Crumbs:** tele **next to** locs; gear matches setstat; no quest-critical give on residual claims.

---

## 8. Current focus (dated — update at milestones)

**2026-08-09:** Public open to **show work**; **Issues** welcome. **PR merge unpromised** — maintainer focus is content-complete; review/merge only if bandwidth. May change if contribs grow. Softpass = process stage.  
Brand: **Fairy Ring** (Decision **009**).
