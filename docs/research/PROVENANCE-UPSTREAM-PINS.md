# Upstream provenance pins (Fairy Ring product forks, branch rs2-r377)

**Date measured:** 2026-08-09  
**Purpose:** Public-facing **where did this git tree come from** — full SHAs, not marketing.  
**Policy:** Decision 009 / 011 · vendor `NOTICE.md` / `PROVENANCE.md`

## Answer: do we have enough history?

| Tree | Shallow? | Root | Upstream still in history? | Fork point style |
|------|:--------:|------|----------------------------|------------------|
| **content** | **no** | LC `5e161cbab` (2023-07-04) | **Yes** — ~1800 commits, LC authors | `rs2-r377` = `origin/377-wip` **+** local commits |
| **engine** | **no** | LC `cdf2f2d4` (2023-07-04) | **Yes** — ~1800 commits | same |
| **client-ts** | **no** | LC `e120e99` (2025-01-16) | **Yes** — ~298 commits | `rs2-r377` = `origin/289` **+** local commits |
| **workspace** | **no** | Original productize `7bff202` | N/A (docs/harness only) | Not a fork of LC source |

**Rough early tracking is fine:** the first *local* commits on `rs2-r377` are labeled `wip(rs2-r377): laptop backup snapshot 2026-08-06`. That does **not** erase upstream history — it sits **on top of** a real LostCityRS commit (merge-base = upstream tip at branch time).

**Partial clone note:** content/engine `origin` may use `blob:none` (saves disk). **Commit graph and SHAs remain**; not every historical blob is local until needed.

## Canonical pins (re-measure if upstream tips move or before a major re-export)

GitHub-style lineage strings:

| Product tree | Upstream | Branch at fork | **Full SHA (merge-base = upstream tip)** | First local commit after base |
|--------------|----------|----------------|------------------------------------------|-------------------------------|
| Content | [LostCityRS/Content](https://github.com/LostCityRS/Content) | **`377-wip`** | `7d7719693100cc45ff187c12139e5b63b3ab21df` | `4d265f2de` wip laptop snapshot 2026-08-06 |
| Engine | [LostCityRS/Engine-TS](https://github.com/LostCityRS/Engine-TS) | **`377-wip`** | `94fcfa2d2c2fc5812e6d448a5e4a04fd73879fd3` | `ad341353` wip laptop snapshot 2026-08-06 |
| Client-TS | [LostCityRS/Client-TS](https://github.com/LostCityRS/Client-TS) | **`289`** | `bc4751da0748704307eef9e186015b08834fccf7` | `8971bab` wip laptop snapshot 2026-08-06 |

### One-liners (paste into README/NOTICE)

```text
Derived from LostCityRS/Content@7d7719693100cc45ff187c12139e5b63b3ab21df (branch 377-wip).
Derived from LostCityRS/Engine-TS@94fcfa2d2c2fc5812e6d448a5e4a04fd73879fd3 (branch 377-wip).
Derived from LostCityRS/Client-TS@bc4751da0748704307eef9e186015b08834fccf7 (branch 289).
```

### Verify locally

```bash
# content — merge-base should equal origin/377-wip if still only ahead
git -C vendor/content fetch origin 377-wip
git -C vendor/content merge-base HEAD origin/377-wip
git -C vendor/content rev-parse origin/377-wip

git -C vendor/engine fetch origin 377-wip
git -C vendor/engine merge-base HEAD origin/377-wip

git -C vendor/client-ts fetch origin 289
git -C vendor/client-ts merge-base HEAD origin/289
```

If merge-base **moves** (upstream rebased) or we **merge** more LC tips later, **update this file + each vendor PROVENANCE.md** same turn.

## What GitHub will show

| Expectation | Reality |
|-------------|---------|
| “Forked from LostCityRS/…” network button | **Only if** repos were created with GitHub **Fork** UI. Our private remotes were **pushed as independent** backups — network graph may **not** auto-link. |
| Full commit history from LC root | **Yes** on content/engine/client-ts when the full `rs2-r377` history is pushed to the public remote |
| Explicit `@hash` in docs | **Yes** — PROVENANCE.md / NOTICE (this pin file) |

If GitHub does not show “forked from,” the **PROVENANCE one-liners + intact history** still prove lineage. Optional later: contact GH support or recreate as true forks (painful; not required if SHAs are documented).

## Workspace

Does **not** contain LC content/engine/client history — only `vendor/README.md` index. Provenance of product code is **in the three vendor remotes**, not the workspace export.

## Related

- Each vendor: `PROVENANCE.md` (same pins)  
- `vendor/README.md` launch-together table  
- Decision 009 branding  
