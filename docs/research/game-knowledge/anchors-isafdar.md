# Game-knowledge anchors — Isafdar / Regicide

**Tag default:** **VERIFIED** = `npc.pack` + `n34_50` / `n34_49` decode 2026-08-08.  
**Purpose:** Regicide mid tele + Idris/Iorwerth product bites.

## Pack NPC ids (VERIFIED)

| Id | Name |
|---:|------|
| 1182 | `lord_iorwerth` |
| 1186 | `regicide_good_elf1` (Idris-class good elf) |
| 1187–1188 | `regicide_evil_elf1/2` |
| 1199 | `regicide_old_camp_tracker` (Elf Tracker) |
| 1202 | `regicide_good_elf3` |
| 1204 | `regicide_tyras_guard` |

## Spawns (VERIFIED)

| Who | Map | Tile | Notes |
|-----|-----|------|-------|
| **Lord Iorwerth** | n34_50 | **2205,3252** L0 | Mid ≥4 product Talk; smoke `regsjpucjk` |
| **Elf Tracker** | n35_49 / m35_49 | **2257,3149** L0 | Map NPC **1199**; product stages **5–8** (ported 2026-08-08) |
| **Tyras guards** | n34_49 | e.g. **2182,3147** L0 | Camp approach combat |
| **Idris arm zone** | 0_36_50 well exit | **2312,3216** L0 | Soft tele for ambush when stage **2** |

## Soft prep (SOFT)

| Goal | Soft | Product |
|------|------|---------|
| Start ≥2 | `upass 10`, `regicide_quest 1` | Talk Lathas Ardougne L1 **2578,3293** |
| Mid ≥3 | stage **2** + tele Isafdar | Idris ambush timer (product) |
| Mid ≥4 | stage **3** or product Idris | Talk Iorwerth |
| Mid ≥5 | stage **4** + upass | Talk Elf Tracker **without** pendant → **5** (`regsjx7j6s`) |
| Mid ≥6 | after **5** | Iorwerth gives pendant → tracker → **6** (`regsjx9ma2`) |

## Zones (CANDIDATE — from 274 idris / greegree patterns)

Idris timer zones include mapsquares **0_35_49**, **0_35_50**, **0_36_50** (see 274 `idris.rs2` mapzoneexit). Re-verify against ported script when landed.

## Related

- `docs/research/port-quest-regicide-274-to-377.md`
- `docs/research/regicide-zones-tracker-residual-377.md` — zones + tracker residual after stage 4
- `docs/research/regicide-idris-spawn-377.md` — Idris 2→3
- Greegree zones (Ape) are **not** Isafdar — see greegree audit / anchors-ape if present
