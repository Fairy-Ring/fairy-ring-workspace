# Decision 009 — Branding, attribution, and upstream relationship

**Date:** 2026-08-06  
**Updated:** 2026-08-09 — public brand locked **Fairy Ring**  
**Status:** accepted  
**Audience:** operators, agents, future contributors, LC / rs2b2t readers  

---

## Decision

1. **Public brand: Fairy Ring.**  
   - **Product / project name:** **Fairy Ring**  
   - **Era target (not the brand string):** historical **RuneScape revision 377** (~2 May 2006; Return of the Wise Old Man era)  
   - **Why this name:** thematic extension of Lost City / Zanaris / fairy-network lore — rings move you between places; this project moves careful work between tools, humans, and a living playable stack. Generic compound; not “RS2”, not “LC”, not “Wise Old Man”.  
   - **GitHub targets (at rename/flip):** `fairy-ring` (thin workspace), `fairy-ring-content`, `fairy-ring-engine`, `fairy-ring-client` (or `…-client-ts`). Legacy names (`LC-rs2-*`, `rs2-r377-*`) may remain on remotes until rename.  
   - **Technical branch name** on vendor forks may stay `rs2-r377` until a deliberate branch rename — that is a **git label**, not the public brand.

2. **Brand distance from Lost City and Jagex.**  
   - Do **not** present as official Lost City, LostCityRS, or “the” LC 377 tree.  
   - Do **not** use the **LC** prefix or Lost City logos as our brand.  
   - State clearly: **derivation** of Lost City open-source work — **not** official Lost City.  
   - **RuneScape** and related marks are Jagex’s; we describe the era, we do not claim their brand.  
   - Avoid public product titles built on **RS2**, **OSRS**, **Wise Old Man / WOM**, or **Zanaris** as the *name* (lore may appear in prose).

3. **Related ecosystems (credit, don’t appropriate).**  
   Maintainers also contribute in **Lost City** and **rs2b0t / rs2b2t** spaces. Public docs **credit** those projects.  
   - Do **not** present Fairy Ring as “the” LC product or as official rs2b2t infrastructure.  
   - No special “not affiliated with rs2b2t unless they adopt” disclaimer — cross-pollination is expected.  
   - On *this* fence: bot/harness is a **means to prove rev‑377 content** (Decision **004**), not a 274 complete-world product layer.  
   - Do not speak *for* other projects’ roadmaps.

4. **Shoulders of giants (mandatory acknowledgment).**  
   Non-exhaustive: Lost City / LostCityRS; period RuneScape (Jagex); OpenRS2; rs2b0t / rs2b2t; human contributors; **AI tools / coding agents** used openly as tools (not authenticity oracles).  
   Prefer NOTICE + accurate SHAs over marketing.

5. **Best tool for the job.**  
   Whatever advances honest rev‑377 work: LC branches, deob, harness, agents, media.  
   Speed vs upstream is a **side effect**, not a dunk on LC process.

6. **Purpose (operator intent — public-safe).**  
   The original period game is not fully recoverable as a pure object; we still work carefully.  
   Use every good tool — **including AI** — so a playable, honest stack can exist **in human time** (something to enjoy while we are here) and **outlast** a single contributor.  
   That is **not** a claim of completeness or perfect authenticity.

7. **License (when public).**  
   Respect upstream licenses on vendored LC-originated trees. Do **not** relicense LC code as original Fairy Ring invention. Workspace docs/harness may be MIT separately.

8. **Completeness disclaimer + open contributions.**  
   We **disclaim** that the stack **is** authentic, original, or complete today.  
   Good-faith PRs from **all** (humans and agents) welcome; declines need **clear rationale**. Full text: `CONTRIBUTING.md`.

---

## Rationale

- “Fairy Ring” continues a Lost City / Zanaris *metaphor* without using LC or RS2 as the product name.  
- LC accuracy people will correctly reject brand confusion with LostCityRS.  
- Trademark posture: prefer invented/generic thematic names over RS2/WOM product titles (not legal advice).  
- AI disclosure + mortal-time purpose match how the work is actually done.

---

## Checklist when going public

- [x] Public name **Fairy Ring** locked (2026-08-09)  
- [x] Drop **LC** / **rs2-r377** as *public brand* (technical branch/legacy remotes may lag)  
- [ ] GitHub **repo rename** to `fairy-ring*` for launch units  
- [x] NOTICE + derivation + AI disclosure  
- [x] Vendor README/NOTICE brand pass (follow-up same session as needed)  
- [x] Thin export + AGENT_BRIEF (Decision **011**)  
- [ ] GH descriptions at flip: Fairy Ring; rev 377; derived from Lost City; not official LC/Jagex  
- [ ] Never push to LostCityRS without permission — restate at flip  

---

## Related

- `docs/research/authenticity-stance.md`  
- `docs/decisions/004-client-bot-harness-boundary.md`  
- `docs/decisions/011-public-docs-surface-and-agent-brief.md`  
- `AGENTS.md` · `AGENT_BRIEF.md` · `README.md`  
