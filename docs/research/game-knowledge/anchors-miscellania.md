# Game-knowledge anchors — Miscellania / Throne

**Tag default:** **VERIFIED** = pack + `m39_60.jm2` / `m40_60.jm2` + headed soft-pass where named. **CANDIDATE** = harness tele only, or a script comment that does not match this jm2.  
**Quest:** Throne of Miscellania (`misc_quest`). Managing labour = `area_miscellania` + skill intercepts — **not** a HARD authenticity claim (M1–M5 smokes stay SOFT).  
**World formula:** `x = (mx << 6) + localX`, `z = (mz << 6) + localZ`. m39_60 origin **2496,3840**; m40_60 origin **2560,3840**.

**Do not tele onto locs** — stand next to them ([`harness-tele-stand.md`](harness-tele-stand.md)).

## Pack NPC ids (VERIFIED)

| Id | Name |
|---:|------|
| 1373 | `misc_king_vargas` (King Vargas) |
| 1374 | `misc_ulby_doorguard` (Guard) |
| 1375 | `misc_advisor_ghrim` |
| 1371 | `misc_prince_brand` |
| 1372 | `misc_princess_astrid` |
| 1359 | `misc_queen_sigrid` (Etceteria) |
| 1395 | `misc_lumberjack` (Lumberjack Leif) |
| 1396 | `misc_miner` (Miner Magnus) |
| 1397 | `misc_fisherman` (Fisherman Frodi) |
| 1398 | `misc_gardener` (Gardener Gunnhild) |
| 1399 | `0_40_60_rarefish` (Fishing spot — Cage / Harpoon) |

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
| **Gardener Gunnhild** | m39_60 | **2525,3850** L0 | same | labour talk; find `0_39_60_29_10`; jm2 `0 29 10: 1398` |
| **Heather / Herbs labour stand** | m39_60 | loc cluster ~2525–2528,3848–3855 | **2524,3851** L0 | host stand local **28,11** free floor; **not** 2524,3849 (**oldcastlewall**) |
| Rellekka sailor | m41_57 | **2629,3693** L0 | | longboat **source-stub** (289 too) |

## Managing labour stands (2026-08-12)

Sources: 377 `vendor/content/scripts/areas/area_miscellania/*`, `maple.loc` (`width=2` `length=2`), `m39_60.jm2` / `m40_60.jm2`, [`../port-mg-managing-misc-289-to-377.md`](../port-mg-managing-misc-289-to-377.md), [`../surface-all-config-inject-377.md`](../surface-all-config-inject-377.md) § Miscellania maples. Intercept zone: `^miscellania_lower_bound`…`^miscellania_upper_bound` (`0_39_60_0_0`…`0_40_60_22_63`).

**Soft vs product:** M1 heather **PASS** `managsorn41j` is a **labeled soft** approval +1 (soft `misc_quest=100`, soft `misc_approval=90`). Wood / mine / fish labour **PASS** `manlasqu3c6d` (90→93) is product intercepts after one op each — still soft Throne 100, **not** a 0→96 grind. Flax / RT rake stay out.

**Era refuse:** flax / RT rake plots are **post-tip** (wiki 22 May 2006; RT 22 Jul 2006). **No flax rake tile** in this table. Tip labour is sickle + `misc_heather_*` (map-true) plus maple / coal / rarefish intercepts.

**Maple 2×2 rule:** loc origin is the **SW tile**. Click that tile, not canopy / grass (`4343` `viking_dugupsoil_brown_2`, `3549` `regicide_grass3`) that share the grove and have **no** Chop.

| Who / what | Tag | Map / cite | Loc or spawn | Host tele | Notes |
|------------|-----|------------|--------------|-----------|-------|
| **King Vargas** (UI / Throne) | **VERIFIED** | m39_60 NPC `1 5 19: 1373` | **2501,3859** L1 | same / adjacent | start + complete ceremony; not a labour loc |
| **Advisor Ghrim** (manage IF) | **VERIFIED** | m39_60 NPC `1 3 17: 1375` | **2499,3857** L1 | same | post-complete `~open_manage_miscellania_interface`; M4 IF **PASS** is still SOFT entry |
| **Real maple (chop)** | **VERIFIED** loc | m39_60 LOC `0 54 24: 1307` (`mapletree`) | **SW 2550,3864** L0 | **CANDIDATE 2549,3864** (one west) | 2×2; reader Chop-down on this SW tile. Grove has more `1307` (e.g. 2541,3869 …). `leif_intercept_wood` fires for any WC inside the zone |
| **Dummy maple (Leif’s tree)** | **VERIFIED** loc | m39_60 LOC `0 54 27: 4674` (`misc_dummy_mapletree`) | **SW 2550,3867** L0 | do **not** tele here | `oploc1` → “Lumberjack Leif is already chopping that down.” 2×2 occupies ~2550–2551, 3867–3868 |
| **Lumberjack Leif** | **VERIFIED** spawn | m39_60 NPC `0 54 29: 1395`; find `0_39_60_54_29` | **2550,3869** L0 | adjacent (not on dummy) | `wanderrange=0` / `nomove`. Same tile also has loc **4343** (no Chop) |
| **Gardener Gunnhild** | **VERIFIED** | m39_60 NPC `0 29 10: 1398`; find `0_39_60_29_10` | **2525,3850** L0 | same | M1 talk + approval rating. Script comment “she is at 0,30,12” is **CANDIDATE / stale** vs this jm2 |
| **Dummy heather (Gunnhild weeding)** | **VERIFIED** loc | m39_60 LOC `0 30 11: 4675` (`misc_dummy_heather_normal`) | **2526,3851** L0 | do **not** tele | `oploc1` → “Gardener Gunnhild is already weeding that herb.” |
| **Heather / Herbs (sickle)** | **VERIFIED** stand | `misc_heather_*` cluster + M1 | cluster ~2525–2528,3848–3855 | **2524,3851** L0 | headed **PASS** `managsorn41j` (soft +1). **Not** 2524,3849 (`oldcastlewall`) |
| **Miner Magnus** | **VERIFIED** spawn | m39_60 NPC `0 30 53: 1396`; find `0_39_60_30_53` | **2526,3893** L0 | adjacent | `wanderrange=0` / `nomove` |
| **Dummy coal (Magnus mining)** | **VERIFIED** loc | m39_60 LOC `0 30 52: 4676` (`misc_dummy_coalrock1`) | **2526,3892** L0 | do **not** tele | `oploc1` → “Miner Magnus is already mining that.” |
| **Coal rock (mine)** | **VERIFIED** loc | m39_60 LOC `0 30 55: 2096` (`coalrock1`) | **2526,3895** L0 | **CANDIDATE 2525,3895** (one west) | harness comment `0_39_60_30_55`; labour HARD not PASS |
| **Fisherman Frodi** | **VERIFIED** spawn | m40_60 NPC `0 16 12: 1397`; find `0_40_60_16_12` | **2576,3852** L0 | adjacent | Etceteria mapsquare; still inside `^miscellania_*_bound` |
| **Rarefish spot** | **VERIFIED** spawn | m40_60 NPC `0 16 10: 1399` (`0_40_60_rarefish`) | **2576,3850** L0 | **CANDIDATE 2576,3851** (between spot and Frodi) | Cage / Harpoon. Other 1399 on this square: `0 12 20`, `0 17 14`, `0 22 11` |
| **Ragnar** (`misc_man_1` **1379**) | **VERIFIED** spawn | m39_60 NPC `0 22 19: 1379` | **2518,3859** L0 | **2517,3859** (one west) | Kill −6 **PASS** `mankisqv0cw2` (90→84). `wanderrange=5`. vislevel **1**, default HP **1**. Do **not** use Einar (`misc_man_2` — throne L1) |
| **Thorhild** (`misc_woman_1` **1382**) | **VERIFIED** spawn | m39_60 NPC `0 6 12: 1382` | **2502,3852** L0 | adjacent | Same −6 hook; alt if Ragnar wandered |
| **Alrik** (`misc_man_3` **1381**) | **VERIFIED** spawn | m39_60 NPC `0 18 15: 1381` | **2514,3855** L0 | adjacent | Same −6 hook |

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
- `docs/research/port-mg-managing-misc-289-to-377.md`
- `docs/research/game-knowledge/harness-tele-stand.md`
- `docs/research/map-npc-spawns-jm2-377.md`
- Plan: `docs/plans/2026-08-09-misc-throne-start.md`
- Soft ledger: `docs/research/softpass.md`
