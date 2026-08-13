# Game-knowledge anchors — Mort Myre / Mort’ton / Myreque path

**Tag default:** **VERIFIED** = measured from `vendor/engine/data/pack/server/maps/n*` + `npc.pack` (2026-08-08 corpus campaign).  
**Purpose:** Harness tele + combat prep for In Search of the Myreque mids.

## Pack NPC ids (VERIFIED)

| Id | Name |
|---:|------|
| 1567 | `route_cyreg_paddlehorn` |
| 1568 | `route_curpile_fyod_child` |
| 1569 | `route_veliaf_hurtz` |
| 1570–1574 | Sani, Harold, Radigad, Polmafi, Ivan |
| 1577–1581 | Vanstrom forms |
| 2020 | `multi_vanstrom_stranger_entity` (Canifis map multi) |

## Spawns (VERIFIED world tiles)

| Who | Map | Tile | Notes |
|-----|-----|------|-------|
| **Cyreg** | n55_51 | **3522,3284** L0 | Boatman; smoke mid |
| **Swamp Boaty (Mort’ton)** | m55_51 jm2 loc 6969 | **3523,3284** L0 | `route_rowboat_mortton` — Board / Board (Pay 10) |
| **Vanstrom multi** | n54_54 id 2020 | **3503,3477** L0 | Hair of the Dog; start-gate |
| **Curpile Fyod** | n54_53 id 1568 | **3508,3440** L0 | Hollows path guard / quiz (**mid ≥52**) |
| **Myreque hideout** | n54_153 | e.g. Veliaf **3506,9838** L0/L3 | Underground plane (z≈9838); members multi-level |
| **False wall** | m54_153 loc **5052** `@ 0 24 45` | **3480,9837** L0 | `thrttavernbasementfalsewall` — stage ≥90 → **95** |
| **Basement ladder** | m54_153 loc **5054** `@ 0 21 54` | **3477,9846** L0 | `thrttavernbasementladder` → **97** + tele Canifis |
| **Hellhound spawn** | script `0_54_153_50_42` | **3506,9834** L0 | Post-ambush / stalagmite re-summon |

## Flamtaer / Shades of Mort’ton (VERIFIED jm2 + residual smokes)

| What | Map / id | Tile | Notes |
|------|----------|------|-------|
| **Loar Shadow spawn sample** | m54_51 NPC **1240** `shadeshadow_level1` | **3474,3280** L0 (`0 18 16`) | 25× field spawns; wanderrange **30** |
| **Loar field cluster** | same | 3478,3307 · 3479,3283 · 3480,3271 · 3482,3302 · 3483,3283 | Harness `SHADE_FIELD_SPAWNS` residual hunt |
| **Ulsquire (afflicted)** | m54_51 `1251` | **3496,3289** L0 | Temple dialog / complete |
| **Razmire (afflicted)** | nearby multi | ~**3489,3296** | Remains hand-in mid-temple |
| **Flamtaer courtyard stand** | inside wall ring | **3505,3315** L0 | Never tele onto altar **3506,3316** |
| **Flamtaer wall ring** | m54_51 loc 4068/4079 | **3504–3508 × 3314–3318** | 15 segs. East wall **x=3508**. **3510,3317** is `rubble_1` (not Repair) |
| **Fire altar loc** | `0_54_51_50_52` | **3506,3316** L0 | Broken / Fire / Flaming forms |
| **Funeral pyre loc** | m54_51 `0 9 19` | **3465,3283** L0 | typecodes 4093→4094→4100 |
| **Funeral pyre stand** | adjacent | **3466,3283** | Stage 70–80 place/light |

**Residual Flamtaer (full ops):** [`flamtaer-residual-377.md`](flamtaer-residual-377.md) — stages 50→85, sanc vs repaired_p, 49t pyre, bar §2 checklist.

**Residual note (2026-08-09):** Loar **is** client-visible under residual (`mtnsl3j4qg` attack d=14–15). Fail was thrash tele-cycle, not empty pack. Mid-temple HARD Take: `mtnsgsppgf` remains#3396. Parked oil remake: sanc ok but **Broken altar** thrash stuck on Temple wall walk — prefer Broken wall Repair + op when cheb≤1.

## Soft prep (SOFT — label in smokes)

| Stage goal | Soft prep | Product after |
|------------|-----------|---------------|
| ≥5 start | `druidspirit 110` | Talk Vanstrom multi |
| ≥15 Cyreg | steel weapons set | Cyreg multi path |
| ≥20 repaired | pouch×5 + plank×3 | Give planks |
| ≥25 hollows | coins; boat bind | Board/Pay → `swamp_boatjourney` **11902** (no tele-stub) |
| boat IF return | soft ≥25 | hollows loc **3498,3377** → Mort’ton **3522,3284** |
| ≥52+ Curpile | tele **3508,3440** | Product quiz |
| ≥80 cutscene | FROM=65 + bits 31 + weapons | Veliaf handoff + cutscene |
| ≥85 hellhound | FROM=80 + adamant combat floor | Kill Skeleton Hellhound |
| ≥90 exit | FROM=85 | Veliaf “How do I get out of here?” |
| ≥97 wall/ladder | FROM=90 | False wall then ladder |
| ≥105 complete | FROM=97 + multi 0 | Stranger at **3503,3477** |

## Combat floor

| Encounter | Floor | Gear |
|-----------|-------|------|
| Skeleton Hellhound (ambush) | ATK/STR 80 DEF 70 HP 85 | adamant scim + plate + kite + lobster×20 — see `combat-floors-377.md` |
| Loar Shadow/Shade (Mort’ton field) | ATK/STR 60 DEF 50 HP 70 | steel scim + plate + lobster×6–20; multi-aggro |
| Ghasts / swamp | NS pouch | pouch soft seed |

## Related

- `docs/research/port-quest-routequest-289-to-377.md`
- `docs/research/myreque-hollows-curpile-hideout-377.md` (campaign deep — if landed)
- Smoke: `tools/harness/quest-myreque-smoke.mjs`
