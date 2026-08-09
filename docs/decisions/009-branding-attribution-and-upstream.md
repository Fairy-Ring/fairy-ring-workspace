# Decision 009 — Branding, attribution, and upstream relationship

**Date:** 2026-08-06  
**Status:** accepted (cement early; apply if/when public)  
**Audience:** operators, agents, future contributors, LC / rs2b2t readers  

---

## Decision

1. **Brand distance from Lost City.**  
   If/when this workspace becomes a **public open-source** repo (at latest when r377 is feature-complete enough to share; earlier only if others want to bang on it), we **do not** present as official Lost City, LostCityRS, or “the” LC 377 tree.  
   - Use **this project’s own name**: **rs2-r377** (workspace repo target: `rs2-r377-workspace` — rename from any legacy `LC-rs2-*` identifier at public launch).  
   - **Do not** use the **LC** prefix in public brand (reads as “Lost City product”).  
   - State clearly that the stack is a **derivation** of Lost City open-source work (Engine/Content/Server lineage), **not** official Lost City.  
   - Do **not** use Lost City logos, “LostCityRS org” framing, or language that implies LC endorsement.  
   - Private GitHub under the operator is fine for backup; public launch gets a clear “independent experiment / derived from LC” README blurb.

2. **Related ecosystems (no brand appropriation; no distancing disclaimer).**  
   Maintainers also contribute in **Lost City** and **rs2b0t / rs2b2t** spaces. Public docs **credit** those projects as related work and tooling.  
   - Do **not** present rs2-r377 as “the” LC product or as official rs2b2t infrastructure.  
   - Do **not** add a special “not affiliated with rs2b2t / N64Jive unless they adopt” disclaimer — unnecessary distance. Cross-pollination is expected.  
   - On *this* fence: bot/harness is a **means to prove rev‑377 content**, not an add-on client for an already-complete 274 world (Decision **004**).  
   - Do not speak *for* other projects’ roadmaps; still welcome shared patches both ways.

3. **Shoulders of giants (mandatory acknowledgment).**  
   This stack stands on prior human (and now agent) labor, including but not limited to:  
   - **Lost City / LostCityRS** — Engine-TS, Content, Server shell, research culture  
   - **Period RuneScape** (Jagex 2004–2006 era) — the thing being preserved  
   - **OpenRS2** and cache/community archaeology  
   - **rs2b0t / rs2b2t** — bot/adapter patterns, nav, questers (tools we use and contribute to; fence still applies)  
   - **Every contributor** who filed authenticity fixes, ports, and docs — including work some call “irrelevant”  
   - **AI tools / coding agents** used **openly** on this path — same as any other tool: disclose in public README/NOTICE; credit process without anthropomorphic brand claims or “AI-washed” authenticity  

   Prefer a short **NOTICE / ACKNOWLEDGEMENTS** (and README section when public) over empty legal boilerplate.  
   Prefer **accurate technical provenance** (branch SHAs, port audits) over marketing.

4. **Best tool for the job.**  
   Use whatever advances **accurate rev 377** and honest proofs: LC branches, deob clients, harness, agents, media.  
   Speed vs upstream is a **side effect**, not a dunk: if we move faster, document *why* (isolation, mid-gates, docs discipline) without trash-talking LC process. Different goals, different routes.

5. **License (when public).**  
   Choose a license compatible with how we reuse LC-originated trees (respect upstream licenses on vendored code).  
   **Do not** relicense Lost City code as if it were original here. Workspace docs/harness may be licensed separately from vendor trees if needed — spell that out at launch.

6. **Completeness disclaimer + open contributions (2026-08-09).**  
   Maintainers **disclaim** that the stack **is** authentic, original, or complete as a finished product. Visibility or mid-gate PASSes are not a completeness stamp.  
   **Contributions from all** (humans and agents) are welcome in **good faith**. No good-faith PR is dismissed without a **clear rationale**. Mistakes are expected; the accuracy bar still applies (no invent, no soft-green authenticity). Full text: `CONTRIBUTING.md`.

---

## Rationale

- LC accuracy people will correctly reject brand confusion.  
- Operator has no guaranteed community buy-in yet; private vault first.  
- Erasing provenance would be dishonest and self-defeating for a preservation project.  
- AI/agents and thrash tools are part of how work gets done and must be **disclosed**, not hidden; product purity is still the accuracy bar (`authenticity-stance`, Decision 004, AGENTS promise).  
- Claiming “already authentic/complete” would chill fixes; disclaiming completeness invites good-faith contributions from everyone.

---

## Checklist when going public

- [x] Branding pass: public name **rs2-r377**; drop **LC** prefix; derivation stated (README/NOTICE 2026-08-09)  
- [ ] GitHub **repo rename** off legacy `LC-rs2-*` when flipping public (**workspace + content + engine + client-ts**)  
- [x] NOTICE (Lost City as primary upstream derivation; OpenRS2; rs2b0t/rs2b2t; contributors)  
- [x] Explicit “not affiliated with LostCityRS” + derivation language  
- [x] Explicit **AI use** disclosure (README + NOTICE; agents as tools, not authenticity oracle)  
- [x] License (MIT workspace) + vendor license notes  
- [x] Vendor **content / engine / client-ts** README + NOTICE (launch-together, 2026-08-09)  
- [x] Remove or scrub accidental LC trademark/logo assets (none in tree)  
- [x] **Docs surface:** thin public export + token-light brief — Decision **011** (2026-08-09); full plans/research stay private  
- [ ] Implement Decision 011 export + land `AGENT_BRIEF.md` before flip  
- [ ] Point private remotes policy (still never push to LostCityRS without explicit permission) — restate at flip  
- [ ] GH descriptions for all four repos at flip

---

## Related

- `docs/research/authenticity-stance.md`  
- `docs/decisions/004-client-bot-harness-boundary.md`  
- `docs/decisions/011-public-docs-surface-and-agent-brief.md`  
- `docs/context/collaboration-and-git.md`  
- `AGENTS.md` § promise + GitHub backup  
