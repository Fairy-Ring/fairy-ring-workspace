# NOTICE — rs2-r377 workspace

This file is attribution and provenance for the **workspace** repository
(`docs/`, `tools/harness/`, `scripts/`, top-level project files).  
It is **not** a complete license for any game asset or Lost City source tree.

## Independent project, derived from Lost City

**rs2-r377** is an independent preservation / engineering experiment.

It is a **derivation** of open work from **Lost City / LostCityRS** (and related community projects): we use and extend those codebases and ideas under their licenses, with our own process, residual bar, and branding.

**Derivation does not mean official.** This project is **not** official Lost City / LostCityRS and is **not** endorsed by Jagex Ltd.

Do **not** present this repo as “Lost City,” “LC,” or official LostCityRS work.  
See [`docs/decisions/009-branding-attribution-and-upstream.md`](docs/decisions/009-branding-attribution-and-upstream.md).

## Shoulders of giants

Work in this ecosystem depends on (non-exhaustive):

| Project / source | Role |
|------------------|------|
| **Lost City / LostCityRS** | Engine-TS, Content, Server shell, research culture, 377-era branches — **primary upstream derivation** |
| **Pinned forks (full SHA)** | Content @ `7d7719693100…` (`377-wip`); Engine-TS @ `94fcfa2d2c2f…` (`377-wip`); Client-TS @ `bc4751da0748…` (`289`) — see [`docs/research/PROVENANCE-UPSTREAM-PINS.md`](docs/research/PROVENANCE-UPSTREAM-PINS.md) |
| **Period RuneScape (Jagex)** | The 2004–2006 game being preserved; trademarks and assets remain Jagex’s |
| **OpenRS2** | Cache archaeology and revision identification (e.g. rev 377 / cache 657) |
| **rs2b0t / rs2b2t** | Related bot/adapter ecosystem we also contribute to; on *this* project, harness/bot patterns are a **means** to residual r377 proofs (Decision 004), not a 274 “complete world” product layer |
| **Contributors** | Humans who review, decide, and ship |
| **AI tools / coding agents** | Used openly for research, drafting, thrash, and patch proposals — **tools**, not authors of authenticity claims |

Prefer accurate SHAs, port audits, and residual labels over marketing claims.

## AI use

This project **uses AI** (coding agents and related tools) in day-to-day work. That is intentional and disclosed.

- AI-assisted output is subject to the same authenticity and purity rules as any other contribution.  
- Residual PASS / product claims require evidence (live content paths, logs, SHAs) — not “the model said so.”  
- See README § *AI use* and Decision 009.

## What is *not* in this git tree

- Full **content**, **engine**, and **client** clones (live under `vendor/` on disk; own remotes)  
- **OpenRS2 / packed cache** binaries — **download yourself** (public: OpenRS2 id **657** for rev 377); see [`cache/README.md`](cache/README.md). We guide; we do not ship blobs.  
- **Harness screenshot dumps** and ephemeral agent scratch (`docs/superpowers/`, `harness-shots/`)  

Those components, when used, keep their own licenses and IP notices (e.g. Lost City Content README: assets are Jagex IP, included for historical preservation in *that* project’s distribution model).

## Workspace license

Original material in this repository is offered under the **MIT License** (see [LICENSE](LICENSE)), unless a file states otherwise.

Do **not** treat MIT as covering Jagex assets or as a relicense of Lost City code.

## Contact / coordination

Do not open PRs to `LostCityRS/*` from this experiment without explicit coordination.  
Cross-pollination with Lost City, rs2b0t/rs2b2t, and related projects is normal where useful — still respect each project’s process and fences.

## Completeness disclaimer

This project does **not** claim that current content, engine, or client trees **are** authentic, original, or complete. Work is ongoing toward an accuracy bar; soft proofs must stay labeled. Contributions from **all** (humans and agents) in good faith are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
