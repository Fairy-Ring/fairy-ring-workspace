# Fairy Ring

**Fairy Ring** is an independent project for careful historical **pre-EOC / pre-RS3 (RS2-era)** RuneScape preservation.

We share Lost City’s long *goal* — honest period stacks until the EOC/RS3 line — not necessarily their *method*.  
**Not** official Lost City / LostCityRS. **Not** endorsed by Jagex. **RuneScape** is a trademark of Jagex Ltd.

| | |
|--|--|
| **Brand** | Fairy Ring |
| **Horizon** | RS2-era → EOC boundary |
| **This repository** | Workspace **shell** (process, harness, scripts) — not a monorepo of game content |
| **Companions** | [FR-content](https://github.com/acfrazier/FR-content) · [FR-engine](https://github.com/acfrazier/FR-engine) · [FR-client-ts](https://github.com/acfrazier/FR-client-ts) |

## Why *Fairy Ring*

Rings link distant places (and times). This project links careful tools — **including AI** — humans, and living playable stacks so something honest can exist **in human time** and outlast a single contributor. That is not a completeness claim.

## Revision workspaces (branches)

Like multi-revision layouts elsewhere: **`main` is the project hub**. Each **revision line** lives on its own branch.

| Branch | Focus |
|--------|--------|
| **`main`** | This stub — brand, horizon, how to enter a revision workspace |
| **`rs2-r377`** | Active thin workspace for **revision 377** (~May 2006) — docs, harness, scripts, bootstrap |

```bash
git clone https://github.com/acfrazier/fairy-ring-workspace.git
cd fairy-ring-workspace
git checkout rs2-r377          # enter the 377 workspace surface
# then follow that branch’s README (clone FR-* vendors, cache guide, isolation, npm start)
```

Future pre-EOC revision lines can add further branches the same way (name TBD when opened).

## Getting started (377 today)

1. Clone this repo and **`git checkout rs2-r377`**.  
2. On that branch: clone companions under `vendor/` (`FR-content`, `FR-engine`, `FR-client-ts`, branch `rs2-r377`).  
3. Download OpenRS2 cache **657** yourself if needed (`cache/README.md` on the branch) — **never committed here**.  
4. `bash scripts/apply-isolation-config.sh` then start engine from `vendor/engine`.

Details live on the **revision branch**, not on `main`.

## Related

| Doc on `rs2-r377` | Role |
|-------------------|------|
| `AGENT_BRIEF.md` | Token-light agent entry |
| `AGENTS.md` | Agent rules |
| `NOTICE.md` / `CONTRIBUTING.md` | Provenance + PRs |
| Decision **009** | Branding / Fairy Ring / pre-EOC horizon |

## License

MIT for original material in this repository (see [LICENSE](LICENSE) on branch `rs2-r377`, or the copy below).  
Vendor trees keep upstream licenses. Jagex assets are not MIT and are not redistributed from this git repo.

