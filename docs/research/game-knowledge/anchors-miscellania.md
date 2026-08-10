# Game-knowledge anchors — Miscellania / Throne

**Tag default:** **VERIFIED** = pack + map + headed soft-pass 2026-08-09.  
**Quest:** Throne of Miscellania (`misc_quest`). Managing kingdom = separate unit.

## Pack NPC ids (VERIFIED)

| Id | Name |
|---:|------|
| 1373 | `misc_king_vargas` (King Vargas) |
| 1374 | `misc_ulby_doorguard` (Guard) |
| 1375 | `misc_advisor_ghrim` |
| 1371 | `misc_prince_brand` |
| 1372 | `misc_princess_astrid` |
| 1359 | `misc_queen_sigrid` (Etceteria) |

## Spawns / stands (VERIFIED)

| Who / what | Map | Tile | Stand (host tele) | Notes |
|------------|-----|------|-------------------|-------|
| **Door guard N** | m39_60 | **2505,3856** L1 | same | audience Talk |
| **Throne door** | m39_60 | **2506,3857** L1 | adjacent | `misc_ulby_throneroomdoor` |
| **King Vargas** | m39_60 | **2501,3859** L1 | same | start accept → **10**; anthem → **30** |
| **Advisor Ghrim** | m39_60 | **2499,3857** L1 | same | correct anthem **50→60**; post-complete manage stubs |
| **Prince Brand** | m39_60 | **2502,3852** L1 | same | awful anthem **40→50** |
| **Queen Sigrid** | m40_60 | **2612,3877** L1 | same | peace **10→20**, **30→40**, treaty **60→70** |
| **Derrik** (`misc_smithy`) | m39_60 | **2551,3897** L0 | same | giant nib at stage **80** + iron bar |
| Rellekka sailor | m41_57 | **2629,3693** L0 | | longboat **source-stub** (289 too) |

## Stage ladder (soft-pass truth)

| Stage | Constant | Soft entry | Product under test | Account / note |
|------:|----------|------------|--------------------|----------------|
| **10** | talked_to_king | soft Heroes **15** + Viking **10** + tele | Vargas accept | **PASS** `miscthrash1` |
| **20** | talked_to_queen | soft **10** | Sigrid peace talk | product in chain |
| **30** | queen_requests_recognition | soft **20** | Vargas anthem demand | product in chain |
| **40** | need_bard | soft **30** | Sigrid need bard | product in chain |
| **50** | prince_composed | soft **40** | Brand awful anthem | product |
| **60** | advisor_corrected | soft **50** + Awful anthem inv | Ghrim correct → Good anthem | product |
| **70** | queen_gave_treaty | soft **60** + Good anthem | Sigrid treaty | **PASS** chain `.tmp/misc-peace-70b.log` |
| **80** | gave_king_treaty | soft **70** + treaty | Vargas need pen | product |
| **90** | king_signed_treaty | soft **80** + iron_bar + logs | Derrik nib + craft pen + Vargas sign | **PASS** `.tmp/misc-pen-90a.log` |
| **100** | complete | soft affection **40** + approval **96** | Vargas ceremony | **PASS** `.tmp/misc-complete-100a.log` · dating/Managing residual **PARKED** |

## Soft prep

| Goal | Soft | Product |
|------|------|---------|
| Start ≥10 | `heroquest 15`, `viking 10`, tele door/Vargas | Guard audience + Vargas multi2 yes |

## Related

- `docs/research/port-quest-misc-289-to-377.md`
- Plan: `docs/plans/2026-08-09-misc-throne-start.md`
- Soft ledger: `docs/research/softpass.md`
