# Game-knowledge anchors — Isafdar / Regicide

**Tag default:** **VERIFIED** = pack + map + headed soft-pass 2026-08-08…09.  
**Purpose:** Regicide tele stands, combat, and stage ladder for smokes — **read before inventing give/setstat/tele**.

**Discipline (2026-08-09):** soft-pass RESULT → update this file **same turn** (stand tile + soft prep row). Residual polish for Isafdar waits until stands/gates below are current.

## Pack NPC ids (VERIFIED)

| Id | Name |
|---:|------|
| 1182 | `lord_iorwerth` |
| 1186 | `regicide_good_elf1` (Idris-class good elf) |
| 1187–1188 | `regicide_evil_elf1/2` |
| 1199 | `regicide_old_camp_tracker` (Elf Tracker) |
| 1200 | `regicide_old_camp_guard` (Tyras guard — soft ~npc type) |
| 1202 | `regicide_good_elf3` (**Arianwyn** — zone spawn ≥14) |
| 1204 | `regicide_tyras_guard` |
| 1203 | `regicide_tyras_camp_guard` |

## Spawns / stands (VERIFIED)

| Who / what | Map | Tile | Stand (host tele) | Notes |
|------------|-----|------|-------------------|-------|
| **Lord Iorwerth** | n34_50 | **2205,3252** L0 | same / adjacent | Mid ≥4 product Talk; **10→11** alchemy book |
| **Elf Tracker** | m35_49 | **2257,3149** L0 | adjacent | Stages **5–8** |
| **Footprints** | m35_49 | **2240–2241,3150** L0 | beside tracks | Stage **6→7** oploc |
| **Tyras guard soft fight** | — | soft ~npc | **2228,3146** L0 | Near 274 `0_34_49_52_10` spawn square; soft-pass ≥9 |
| **Dense forest → camp** | m34_49 `0 11 33: 3998` | loc **2187,3169** L0 | **2188,3168** L0 | `regicide_cross_over2_tyras_camp` angle **east=2**; exactmove **start** not loc tile |
| **Dense forest (other)** | m34_49 | e.g. 2187,3166 / 3163 | do **not** use for stage 10 | Same name “Dense forest”; only **cross_over2_tyras_camp** writes 10 |
| **Catapult** | m34_49 `0 9 47: 3976` | loc **2185,3183** | **2187,3185** | bomb path ≥12 |
| **Lazy Tyras guard** | m34_49 `0 5 48: 1205` | **2181,3184** | near catapult | rabbit bribe bit |
| **Idris arm zone** | 0_36_50 well exit | **2312,3216** L0 | same | Soft tele for ambush when stage **2** |
| **Arianwyn zone** | `0_40_51_24_32` | **2584,3296** L0 | same | stage **13** + `regicide_iorwerth_message` → product ≥14 |
| **Lathas (start / complete)** | Ardougne L1 | **2578,3293** | beside | Start ≥2; complete ≥15 with message + stage **14** |
| **Al-Kharid furnace** (`furnace1` **2781**) | m51_49 `0 8 49` | **3272,3185** SW 3×3 | **3275,3186** | limestone → quicklime; `forceapproach=east` |
| **Regicide loom** **787** | m34_50 `0 22 49` | **2198,3249** | **2199,3249** | wool×4 → cloth |
| **Fractionalizing still** **4026** | m45_50 `0 47 12` | **2927,3212** | adjacent | Rimmington; still UI residual |
| **Tar collection** **3975** | m35_48 `0 22 55` | **2262,3127** | adjacent | empty barrel → tar; still residual |

### Exactmove / dense forest (mandatory)

Content `regicide_dense_forest.rs2` requires `distance(player, $start) ≤ 1` before anim. For camp entry loc angle east:

- From south of loc: **$start = loc+(1,0,-1) → 2188,3168**
- Tele **on** 2185,3168 fails silently (stage stays 9) — proved `regsmja210` FAIL then `regsmjchf0` PASS

See also `harness-tele-stand.md` § Exactmove start tiles.

## Stage ladder (soft-pass truth)

| Stage | Constant | Soft entry | Product under test | Account / note |
|------:|----------|------------|--------------------|----------------|
| 2 | spoken_lathas | soft upass 10 | Talk Lathas | start-gate |
| 3 | spoken_scouts | soft 2 + Isafdar | Idris ambush | idris product |
| 4 | spoken_iorwerth | soft 3 or product Idris | Talk Iorwerth | `regsjpucjk` |
| 5 | spoken_tracker | soft 4 | Tracker no pendant | |
| 6 | shown_pendant | soft 5 | Iorwerth pendant + tracker | |
| 7 | found_footprints | soft 6 | Footprints oploc | |
| 8 | spoken_tracker2 | soft 6→7→8 | Tracker tips | |
| **9** | defeated_guard | soft **8** + ~npc once | Guard death → queue | `regsmj37q7` gilded+d scim |
| **10** | entered_camp | soft **9** + agi 56 | Dense forest Enter | `regsmjchf0` stand **2188,3168** |
| **11** | spoken_iorwerth2 | soft **10** | Talk Iorwerth → alchemy book | **PASS** `regsmjkgb6` |
| **12** | killed_tyras | soft **11** + rabbit + fused barrel | lazy guard bribe + catapult bomb | **PASS** `regthrash1` (`.tmp/regicide-bomb-12b.log`) |
| **13** | reported_iorwerth | soft **12** | Talk Iorwerth → message | **PASS** `regthrash1` (`.tmp/regicide-report-13b.log`) |
| **14** | spoken_arianwyn | soft **13** + message | zone `0_40_51_24_32` dialogue | **PASS** `regthrash1` (`.tmp/regicide-arianwyn-14a.log`) |
| **15** | complete | soft **14** + message | Talk Lathas → complete | **PASS** `regthrash1` (`.tmp/regicide-complete-15a.log`) |

## Soft prep (SOFT)

| Goal | Soft | Product |
|------|------|---------|
| Start ≥2 | `upass 10`, optional `regicide_quest 1` | Talk Lathas |
| Mid ≥4 | stage 3 or product Idris | Talk Iorwerth |
| Mid ≥5–8 | staged FROM | Tracker / footprints / tips |
| Mid ≥9 | stage **8**, combat floor, soft ~npc **once** | Guard death (no re-~npc) |
| Mid ≥10 | stage **9**, agi **56**, tele **2188,3168** | Enter dense camp loc only |
| Mid ≥11 | stage **10** | Talk Iorwerth → book + stage 11 (`regsmjkgb6`) |
| Mid ≥12 | stage **11**, give `cooked_rabbit` + `regicide_barrel_lid_fused`, tele **2187,3185** | rabbit on lazy Tyras guard → bomb on Catapult (**2185,3183**) |
| Mid ≥13 | stage **12**, tele **2205,3252** | Talk Iorwerth → scroll + stage 13 |
| Mid ≥14 | stage **13**, give `regicide_iorwerth_message`, tele **2584,3296** | product zone Arianwyn dialogue → 14 |
| Complete ≥15 | stage **14**, give message, tele **2578,3293** L1 | Talk King Lathas → complete queue |
| Guard kit | setstat 90/90/80/90; `mm_main 10` + `dragonquest 10` | d scim + full gilded + sharks — `harness-prep-and-gear.md` |

## Combat floor (pointer)

Tyras guard vislevel **110** — see `combat-floors-377.md`. Soft ~npc uses `regicide_old_camp_guard` with combat inject on 377 unpack.

## Zones (CANDIDATE)

Idris timer zones include mapsquares **0_35_49**, **0_35_50**, **0_36_50**. Trap walk residual: `regicide-zones-tracker-residual-377.md`.

## Related

- `docs/research/port-quest-regicide-274-to-377.md`
- `docs/research/regicide-zones-tracker-residual-377.md`
- `docs/research/regicide-idris-spawn-377.md`
- `docs/research/gear-trail-gilded-params-377.md` — gilded params + equip gates
- Soft ledger: `docs/research/softpass.md`
