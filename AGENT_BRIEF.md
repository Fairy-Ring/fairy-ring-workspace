# rs2-r377 — agent brief (token-light)

**Audience:** coding agents and humans who must not load the full private corpus.  
**Size target:** ~1.5–3k tokens. **Lossy on purpose.**  
**Private vault** (operator machine / private GH) has full plans, research, gap, residual thrash.  
**Public open** ships this brief + README/NOTICE + fences — not the whole `docs/` tree (Decision **011**).

---

## 1. What this is

| | |
|--|--|
| **Name** | **rs2-r377** |
| **Era** | RuneScape revision **377** (~2 May 2006) |
| **Relation** | **Derivation** of open Lost City / LostCityRS work — **not** official LC, not endorsed by LC or Jagex |
| **This workspace** | Process + harness toys + docs (private: full; public: thin) |
| **Product trees** | Separate remotes: content, engine, client-ts (branch `rs2-r377`) |

Do not present as “Lost City” or “LC product.” See `NOTICE.md` and Decision **009**.

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

Full stance (private or extract): `docs/research/authenticity-stance.md`.

---

## 3. Architecture fence (Decision 004)

```text
vendor/client-ts/   pure 1:1 Java 377 → TS — no harness hooks
vendor/content/     period RuneScript / configs
vendor/engine/      server + pack
tools/harness/      smokes, thrash, prep cheats — not purity claims
```

- Client oracle = **Client-Java 377**, not Client-TS 289, not the harness.  
- Bot = **harness-first** for r377 proofs; full rs2b0t later, separate tree.  
- Never push experiment work to `LostCityRS/*` without explicit permission.

---

## 4. Bootstrap (high level)

```bash
export RS2_R377_ROOT=/path/to/workspace   # legacy docs may say LC377_ROOT
# clone workspace + vendor content/engine/client-ts (rs2-r377)
# cache: OpenRS2 rev 377 / id 657 — never commit blobs
bash scripts/apply-isolation-config.sh
cd vendor/engine && npm start
```

| Service | Isolation port |
|---------|---------------:|
| Web (browser / harness) | **81** |
| Game TCP (Java client) | **43595** |
| Management | **8899** |

Browser TS uses **WS on web port**, not TCP 43595. Details: private runbooks.

---

## 5. Research ladder (no invent)

Prefer top → bottom:

1. Period cache / pack (OpenRS2 657)  
2. Decompiled Client-Java 377  
3. Period media (~2005–mid-2006)  
4. Other LC branches (**prefer 274 / era-check** over inventing)  
5. **OSRS last resort** — not RS3  

RuneScript **language** semantics: **@JagexAsh** posts are authoritative for how scripts work; they do not authorize inventing May 2006 *content*.

**Config unit before thrash:** port obj/npc/loc params before multi-minute smokes.

---

## 6. AI use

AI/coding agents are **tools** (research, thrash, draft patches). Humans own authenticity claims and what ships. Disclose AI on public README/NOTICE. The model is not an oracle for residual PASS.

---

## 7. Docs map (what to open when)

| Need | Public / brief | Private vault (operator) |
|------|----------------|---------------------------|
| Cold product residual | This file + authenticity extract | `docs/context/COLD_START.md` |
| Session thrash / FAIL archaeology | — | `docs/plans/YYYY-MM-DD-*.md` |
| Full research catalog | — | `docs/research/INDEX.md` |
| Gear / combat floors / tiles | One-liners below | `docs/research/game-knowledge/` |
| Idle while smoke runs | — | `docs/plans/idle-research-queue.md` |
| Public flip | Decision **011** | export script (not full vault) |

**Game-knowledge crumbs (not full corpus):**

- Tele **next to** locs, not onto them (temple courtyard vs altar).  
- Prep: setstat + generic gear matching combat floor; no quest-critical give on residual.  
- Anchors live in private `anchors-*.md` (e.g. workman **2655,3592** for Viking).

---

## 8. Current focus (dated — update at milestones)

**2026-08-09:** Flamtaer / Shades of Mort’ton **residual bar §2** — soft `morttonquest=50` once → product rebuild → oil → pyre/remains → complete **85**. First oil product proven; remake-after-clearinv and Loar/pyre thrash still harness-sensitive. Mesbox open-then-settext product fix landed. **Do not** soft-green complete.

Next product after residual green: content-breadth backlog (private plans). QoL client (Decision **010**) only after content-complete + public + debug phase.

---

## 9. Hard don’ts

- Invent content or client ops  
- Install bot/harness into pure Client-TS  
- Push to LostCityRS without permission  
- Claim residual PASS with soft stage setvars  
- Dump private thrash logs as public “proof archive”  
- Confuse this project with official Lost City  

---

## 9b. Maintainer disclaimer + contributions

We **disclaim** that the project **is** authentic / original / complete today — the bar is a **goal**, not a finished stamp.  
Humans and agents err. **Good-faith PRs from anyone** are welcome; declines come with **clear rationale**, not silence.  
Same bar for AI-authored patches. Details: `CONTRIBUTING.md`.

---

## 10. Need more context? Open an issue

Thin public docs are for **tokens and practicality**, not a closed vault.

| Do | Don’t |
|----|--------|
| Open a GitHub **issue** naming the **unit** (quest, skill, client bug, residual claim) | Demand a full private plans dump |
| Ask for product path, SHAs, readiness, known DIRTY/SEG labels | Ask for soft-green authenticity without labels |
| Agents may open issues too | Post secrets, cache blobs, or laptop paths |

Maintainers **pattern-match** → run a **smell test** (brand, residual bar, scope, hygiene, no invent) → share a **scoped** extract (comment / short note). Details: Decision **011** § *On-request context*.

---

*Maintainers: keep this file short. Put depth in the private vault. Bump §8 only at real milestones.*
