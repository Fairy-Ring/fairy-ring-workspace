# rs2-r377

**Independent** engineering workspace for a careful **RuneScape revision 377** stack (~2 May 2006): honest residual proofs, docs discipline, and a pure client/content accuracy bar.

| | |
|--|--|
| **Public name** | **rs2-r377** |
| **Era** | Rev **377** / ~May 2006 |
| **This repo** | Workspace **process**: docs, harness toys, scripts, plans |
| **Not this repo** | Full game content, engine, or cache blobs |

## Derived from Lost City — not Lost City

This project is a **derivation** of open work from **Lost City / LostCityRS** (Engine-TS, Content, Server shell, research culture) and related community tooling.  

**Derivation** here means: we build on those trees, ports, and ideas under their licenses and our own process — **not** that we are official Lost City, own their brand, or speak for them.

| We are | We are not |
|--------|------------|
| Independent rev‑377 experiment | Official **Lost City** / **LostCityRS** |
| Users and extenders of LC-style stacks | Endorsed by LC or Jagex |
| Clear about provenance ([NOTICE](NOTICE.md)) | “The” LC 377 tree |

We also work with **rs2b0t / rs2b2t** tooling and ideas. On *this* fence the bot/harness is a **means to an end** (prove rev‑377 content accurately) — not an add-on product for an already-complete 274 world. See Decision **004**.

**RuneScape** is a trademark of Jagex Ltd. Period assets remain Jagex IP where they exist in *other* trees — **not** redistributed from *this* git repository.

See [`docs/decisions/009-branding-attribution-and-upstream.md`](docs/decisions/009-branding-attribution-and-upstream.md).

## AI use (explicit)

We **use AI tools and coding agents** as part of normal development: research, thrash, draft docs, propose patches, run harness loops. Humans own product judgment, authenticity claims, commits, and what ships.

| True | False |
|------|--------|
| AI is a **tool** on the path (like a compiler or deob) | “Fully autonomous AI project” / unreviewed dumps |
| Agents help speed ports and residual smokes | Soft greens or invented content sold as authenticity |
| Process docs and residual labels are how work is audited | Hiding that AI was involved |

AI does **not** replace the accuracy bar: live `.rs2` stage-writes, research ladder, Decision 004 fence, and honest FAIL/DIRTY labeling still apply.

## What you get here

| Included | Not included |
|----------|----------------|
| Plans, research, gap analysis, runbooks | Full `vendor/content` / engine / client clones |
| Test harness under `tools/harness/` (Decision 004 fence) | OpenRS2 cache / packed server data |
| Automation scripts, isolation helpers | Live 274 / production worlds |
| Authenticity stance, residual bar, branding decisions | A claim that r377 is already complete |

**Honest mid-gates over green bars.** Soft thrash is labeled; residual PASS means live `.rs2` wrote the stage (see `docs/research/authenticity-stance.md`, `docs/plans/2026-08-08-promise-cleanup.md`).

## Start here

| Audience | Path |
|----------|------|
| **Agents (token-light)** | **[`AGENT_BRIEF.md`](AGENT_BRIEF.md)** first |
| **Agents (rules)** | **[`AGENTS.md`](AGENTS.md)** — generic; no laptop paths |
| **Humans (public)** | This README · [`CONTRIBUTING.md`](CONTRIBUTING.md) · [`NOTICE.md`](NOTICE.md) |
| **Operator / full vault** | [`docs/context/COLD_START.md`](docs/context/COLD_START.md) · [`docs/context/AGENTS-OPERATOR.md`](docs/context/AGENTS-OPERATOR.md) |
| **Rules / fences** | [`docs/decisions/`](docs/decisions/) (004 · 009 · **011** public docs surface) |
| **Contributing** | [`CONTRIBUTING.md`](CONTRIBUTING.md) |

**Public vs private docs:** most session plans and the full research corpus stay **private** (Decision **011**). Public open is a **thin export** + this brief — not a thrash-log dump.

**Want more on a specific unit?** Open a **GitHub issue** (humans or agents) naming the quest/skill/client bug. We will share a **scoped** extract if it passes the smell test (brand, residual honesty, no invent, scrubbed paths) — see Decision **011**.

```bash
# Preferred env name (legacy alias still accepted: LC377_ROOT)
export RS2_R377_ROOT=/path/to/rs2-r377-workspace   # your clone root
cd "$RS2_R377_ROOT"
bash scripts/snapshot-status.sh   # if vendors present
```

Historical docs may still say `RS2_R377_ROOT` or old directory names; treat them as the same root.

## Bootstrap (clone → vendors → cache → run)

Like Lost City’s Server layout: **this repo is the shell**; scripts pull companions and config. **Cache blobs are never in git.**

1. **Clone this workspace** (thin public surface or full private vault).  
2. **Clone vendors** under `vendor/` (content + engine + client-ts on branch `rs2-r377`). See [`vendor/README.md`](vendor/README.md).  
3. **Cache (download yourself):** OpenRS2 **id 657** = RS2 **build 377** — public on the internet; **not** redistributed from this repo. Guide + links: [`cache/README.md`](cache/README.md). Helper: `bash scripts/fetch-openrs2-cache.sh`.  
   - **Pitfall:** OpenRS2 path `/caches/runescape/377/` is **OSRS 2014**, not rev 377. Always use **657**.  
4. **Isolation + start:** `bash scripts/apply-isolation-config.sh` then `cd vendor/engine && npm install && npm start` (web **81**, game **43595**).  
5. **Client:** pure play via engine `public/`; optional harness after `bun tools/harness/build-client.mjs`.

Without matching vendor SHAs, mid-gate content may be missing on bare Lost City tips. That is expected.

## Architecture fence

```text
vendor/client-ts/     pure 1:1 Java 377 → TS (product purity)
vendor/content/       period content (separate git / license)
vendor/engine/        server (separate git / license)
tools/harness/        toys: smokes, thrash, prep cheats — not authenticity claims
docs/                 bridge: what worked, failed, SHAs, deviations
```

Details: [`docs/decisions/004-client-bot-harness-boundary.md`](docs/decisions/004-client-bot-harness-boundary.md).  
Later QoL client (RuneLite-style comforts): [`docs/decisions/010-qol-client-runelite-style.md`](docs/decisions/010-qol-client-runelite-style.md) — **after** content-complete / public debug phase.

## License

- **This repository** (docs, harness, scripts authored here): [MIT](LICENSE).  
- **Vendor / Lost City–originated trees:** their upstream licenses and notices; **not** re-licensed as original work of this project.  
- **Jagex assets:** not covered by MIT; see [NOTICE](NOTICE.md).

## Status

Workspace may be private or public on GitHub; **visibility is not a content-complete claim.**  
GitHub repo name may still use a legacy identifier until rename; **public brand is rs2-r377**.

**Maintainer disclaimer:** we do **not** assert that this stack **is** authentic, original, or complete. We work toward a careful accuracy bar; mistakes (human and agent) happen. **Contributions from all** are welcome in good faith — no PR dismissed without clear rationale. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

**Never push experiment work to `LostCityRS/*` without explicit permission.**
