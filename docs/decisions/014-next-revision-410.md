# ADR 014 — Next revision target is 410 (after 377)

**Status:** Accepted  
**Date:** 2026-08-13  
**Operator:** set next target to **410** (~**26 May 2006**) after current **377**.

## Decision

| Layer | Revision | Date | Role |
|-------|---------:|------|------|
| **Current product** | **377** | ~2 May 2006 | Live engine / content / Client-TS. Isolation ports unchanged. |
| **Next target** | **410** | OpenRS2 **2006-05-26** (wiki table **25 May 2006**) | Horizon after 377 residuals. Idle research + cache on disk **now**. |

Do **not** flip `ENGINE_REVISION`, login, or pack to 410 in this workspace until 377 product is intentionally frozen and a 410 track is opened.

## Why 410 (not 402 / 412)

| Build | Date | Why not / why yes |
|------:|------|-------------------|
| **402** | 16 May 2006 | Engine-overhaul day. **No** OpenRS2 live-en dump in the archive (gap 377 → 410). |
| **410** | 25/26 May 2006 | First post-overhaul **complete-enough** OpenRS2 cache (**id 1254**). Includes **Royal Trouble** (22 May). |
| **412** | 31 May 2006 | **PLAYER-OWNED HOUSES** / Construction. After 410. Do not pull POH into the 410 target. |

## Cliff (must not hand-wave)

16 May 2006 **“Game engine upgraded!”** sits **between** 377 and 410.

| 377 (now) | 410 (next) |
|-----------|------------|
| Classic `main_file_cache.dat` + `idx0`–`idx4` | JS5 `main_file_cache.dat2` + `idx0`–`idx11` + `idx255` |
| OpenRS2 **11** archives | OpenRS2 **12** archives |
| XTEA **0** | Maps archive keys **2 / 26** valid |
| Client-Java / Client-TS **377** protocol | New client + pack pipeline (not a revision-byte bump) |

410 work is a **new generation**, not `ENGINE_REVISION=410` on the 377 tree.

## Client pin (OpenRS2 32256)

Game client is **not** the two linked JARs. Those are **loaders** (31737 / 33229). Game code is [clients/32256](https://archive.openrs2.org/clients/32256) (Jagex-wrapped Pack200). Local: `research/jars/410/`. Notes: [`../research/horizon/client-410-openrs2-32256.md`](../research/horizon/client-410-openrs2-32256.md).

**Do not** open `rs2-r410` on Client-TS / content / engine yet. Deob into `research/deob/410/` first. LC Client-Java has no `410` branch.

## Cache pin

| Field | Value |
|-------|--------|
| OpenRS2 id | **1254** |
| Local path | `cache/openrs2-410/` (gitignored blobs) |
| Fetch | `bash scripts/fetch-openrs2-cache.sh 410` |
| Research | [`../research/horizon/cache-410.md`](../research/horizon/cache-410.md) · [`../research/horizon/revision-410-horizon.md`](../research/horizon/revision-410-horizon.md) |

## Consequences

- 377 authenticity bar unchanged (Swan Song era; refuse Construction **on 377**).  
- Idle queue may cache-diff 657 vs 1254 and inventory Royal Trouble / Pest Control 16 May / pinball+evil-twin randoms.  
- Public brand stays **Fairy Ring** / current `rs2-r377` branch until a 410 track exists.  
- Do not invent 410 scripts on the 377 content pack.
