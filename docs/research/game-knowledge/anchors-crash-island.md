# Game-knowledge anchors — Crash Island + MM ch2 cutscene

**Purpose:** Soft/product stands for MM after Waydar fly (before full Ape Atoll rail).  
**Era:** rev 377 / ~May 2006 · Source: 377 maps + 289 scripts (no invent).

---

## Crash Island (m45_42)

| What | World tile | Map local | Pack / content |
|------|------------|-----------|----------------|
| Fly land | **2893,2725** L0 | `0 13 37` | `waydar_fly_crash_island` |
| Waydar | **2897,2727** L0 | `0 17 39: 1408` | `mm_waydar` |
| Lumdo | **2891,2724** L0 | `0 11 36: 1419` | `mm_lumdo` |
| Lumdo return tele | **2894,2726** L0 | `0 14 38` | from atoll boat |
| Fauna (sample) | various | 1475 bird / 1477 scorpion / 1479 snake | ambient |

**Soft fly mid PASS:** `.tmp/mm-waydar-7a.log` (`mmthrash1`).

---

## Waydar return / hangar exit

| What | Tile | Coord |
|------|------|-------|
| Gnomeball pitch drop | **2393,3466** L0 | `0_37_54_25_10` |

---

## ch2 cutscene (m40_71) — “Meanwhile, Karamja…”

| What | Tile | Coord / map |
|------|------|-------------|
| Zone box | 2560–2623 × 4544–4607 | `0_40_71_0_0` … `0_40_71_63_63` |
| Viewer stand | **2596,4581** | `0_40_71_36_37` |
| Foreman cutscene | **2603,4582** | `0 43 38: 1470` → **`mm_cutscene_foreman`** |
| Caranock cutscene | **2603,4580** | `0 43 36: 1428` → **`mm_cutscene_caranock`** |

**Name remap:** 289 scripts say `mm_foreman_cutscene` / `mm_caranock_cutscene` — use 377 pack names above.

---

## Ape Atoll boat land (post-ch2)

| What | Tile | Coord |
|------|------|-------|
| ch2 end tele | **2801,2707** L0 | `0_43_42_49_19` |
| Lumdo boat land | **2802,2707** L0 | `0_43_42_50_19` |

Greegree surface zone (separate slice): [`anchors-ape-atoll.md`](anchors-ape-atoll.md).

---

## Soft thrash stands (recommended)

| Mid | Tele stand | Talk target |
|-----|------------|-------------|
| Waydar crash intro | **2894,2726** (near both) | Waydar |
| Lumdo story | **2891,2724** | Lumdo |
| ch2 order | **2894,2726** | Waydar (with Lumdo in range 10) |

---

## Related

- Research hub: [`../mm-crash-island-ch2-377.md`](../mm-crash-island-ch2-377.md)  
- Hangar / reinit: [`../mm-hangar-reinit-377.md`](../mm-hangar-reinit-377.md)  
- Prep: [`harness-prep-and-gear.md`](harness-prep-and-gear.md)
