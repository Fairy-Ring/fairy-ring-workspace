# Fairy Ring

**Independent** engineering for careful historical **pre-EOC / pre-RS3** RuneScape (RS2-era) preservation: honest residual proofs, docs discipline, and pure client/content accuracy.

| | |
|--|--|
| **Public name** | **Fairy Ring** |
| **Long horizon** | RS2-era preservation **up to EOC / RS3** — same *goal* family as Lost City; different *method* |
| **This tree’s focus** | **Rev 377** / ~May 2006 (Return of the Wise Old Man era) — **current standing**, not the brand ceiling |
| **This repo** | Workspace **process**: docs, harness toys, scripts |
| **Not this repo** | Full game content, engine, or cache blobs |

Why *Fairy Ring*: rings link distant places (and times). This project links careful tools (including AI), humans, and living playable stacks. It is **not** “Lost City,” not a Jagex product name, not an official LostCityRS release.

## Derived from Lost City — not Lost City

This project is a **derivation** of open work from **Lost City / LostCityRS** (Engine-TS, Content, Server shell, research culture) and related community tooling.

**Derivation** means: we build on those trees under their licenses and our own process — **not** that we are official Lost City, own their brand, or speak for them.

| We are | We are not |
|--------|------------|
| Independent Fairy Ring experiment | Official **Lost City** / **LostCityRS** |
| Same long preservation *horizon* as LC (pre-EOC RS2) | Endorsed by LC or Jagex; “the” LC method or tree |
| Clear about provenance ([NOTICE](NOTICE.md)) | Brand frozen forever at one revision number |

We also work with **rs2b0t / rs2b2t** tooling and ideas. On *this* fence the bot/harness is a **means to an end** (prove rev‑377 content carefully) — not an add-on product for an already-complete 274 world. See Decision **004**.

**RuneScape** is a trademark of Jagex Ltd. Period assets remain Jagex IP where they exist in *other* trees — **not** redistributed from *this* git repository.

See [`docs/decisions/009-branding-attribution-and-upstream.md`](docs/decisions/009-branding-attribution-and-upstream.md).

## Purpose

**Client surfaces — purpose is choice** (pure period client, eventual bot, optional QoL happy medium): see Decision **010**.  

We share Lost City’s eventual *aim* — preserve RS2-era RuneScape carefully until the EOC/RS3 line — not necessarily their *process*.

The original is not fully recoverable as a pure object. We still work carefully. We use every good tool — **including AI** — so honest, playable stacks can exist **in human time** (to enjoy while we are here) and **outlast** a single contributor. That is **not** a completeness or perfect-authenticity claim.

**Fairy Ring** is the project. **377** is where this workspace aims to be on the other side.

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
| Thin process docs: brief, decisions, authenticity stance, **deviations log** | Full session plans / thrash dumps |
| Test harness under `tools/harness/` (Decision 004 fence) | OpenRS2 cache / packed server data **in git** |
| Automation scripts, isolation helpers | Live 274 / production worlds |
| Pointers to separate content / engine / client-ts remotes | A claim that rev 377 work is already complete |

**Honest mid-gates over green bars.** Soft mids are a **process stage** ([`docs/research/softpass.md`](docs/research/softpass.md)); intentional product non-auth is [`docs/research/deviations.md`](docs/research/deviations.md). Residual PASS means live `.rs2` wrote the stage ([`docs/research/authenticity-stance.md`](docs/research/authenticity-stance.md)).

## Start here

| Audience | Path |
|----------|------|
| **Agents (token-light)** | **[`AGENT_BRIEF.md`](AGENT_BRIEF.md)** first |
| **Agents (rules)** | **[`AGENTS.md`](AGENTS.md)** |
| **Humans / contributors** | This README · [`CONTRIBUTING.md`](CONTRIBUTING.md) · [`NOTICE.md`](NOTICE.md) |
| **Rules / fences** | [`docs/decisions/`](docs/decisions/) (004 · **009** · **010** · **011**) |
| **Intentional non-auth** | [`docs/research/deviations.md`](docs/research/deviations.md) |
| **Soft mids / not-yet-e2e** | [`docs/research/softpass.md`](docs/research/softpass.md) |
| **RuneScript manual** | [`docs/research/runescript/README.md`](docs/research/runescript/README.md) |
| **Game knowledge** | [`docs/research/game-knowledge/README.md`](docs/research/game-knowledge/README.md) |
| **Pack/folder inventories** | [`docs/research/corpus/README.md`](docs/research/corpus/README.md) |

This GitHub tree is the **contributor surface** (Decision **011**): enough to clone, bootstrap, thrash, and open evidence-backed PRs — not a dump of every private research note.

**Want more on a specific unit?** Open a **GitHub issue** (humans or agents) naming the quest/skill/client bug. Scoped extract if it passes the smell test — Decision **011**.

```bash
export RS2_R377_ROOT=/path/to/fairy-ring-workspace
cd "$RS2_R377_ROOT"
bash scripts/snapshot-status.sh   # if vendors present
```

## Bootstrap (clone → vendors → cache → run)

Like Lost City’s Server layout: **this repo is the shell**; companions and cache are fetched separately. **Cache blobs are never in git.**

1. **Clone this workspace** (branch `rs2-r377` for the rev‑377 surface).  
2. **Clone vendors** under `vendor/` (content + engine + client-ts). See [`vendor/README.md`](vendor/README.md).  
3. **Cache (download yourself):** OpenRS2 **id 657** = RS2 **build 377** — public on the internet. Guide: [`cache/README.md`](cache/README.md). Helper: `bash scripts/fetch-openrs2-cache.sh`.  
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
Later QoL client: [`docs/decisions/010-qol-client-runelite-style.md`](docs/decisions/010-qol-client-runelite-style.md) — after content thrash / pure freeze, in a debug/improve PR phase (not the ship client).

## License

- **This repository** (docs, harness, scripts authored here): [MIT](LICENSE).  
- **Vendor / Lost City–originated trees:** their upstream licenses and notices; **not** re-licensed as original work of this project.  
- **Jagex assets:** not covered by MIT; see [NOTICE](NOTICE.md).

## Status

**Visibility is not a content-complete claim.** Work is incomplete and imperfect.  
**Public brand is Fairy Ring** (rev **377** is the current focus, not a brand lock).

**PRs / review:** **Issues** welcome. **Merge is not promised** — maintainer focus is content-complete; a PR may wait or never land unless someone has time to review it properly. That may change if the project gains contributors. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

**Maintainer disclaimer:** we do **not** assert that this stack **is** authentic, original, or complete. Mistakes (human and agent) happen.

**Never push experiment work to `LostCityRS/*` without explicit permission.**
