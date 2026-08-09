# Fixed corpus inventory — 377 pack density

**Purpose:** Fixed **cache/symbol surface** of rev **377** packs for implementers — line counts, dense-id proof, prefix families, and named substring tallies. No invent; no playability claims.

**Measured:** 2026-08-08 · path `vendor/content/pack/*.pack` · format `id=symbol` one per line · ids dense `0..N-1` ⇒ **line count = max_id + 1**.

**Tags:** line counts and family/prefix counts are **VERIFIED** against pack files this date.

**Scope:** nine packs only — `npc`, `loc`, `obj`, `varp`, `varbit`, `seq`, `spotanim`, `synth`, `category`.


## 1. Pack line totals (VERIFIED)

| Pack | File | Lines (= max_id+1) | Last line |
|------|------|-------------------:|-----------|
| npc | `npc.pack` | **3852** | `3851=swan_skeleton_training` |
| loc | `loc.pack` | **14974** | `14973=loc_14973` |
| obj | `obj.pack` | **7956** | `7955=cert_burnt_shrimp` |
| varp | `varp.pack` | **741** | `740=varp_390` |
| varbit | `varbit.pack` | **2134** | `2133=eadgar_pete_dialog_2` |
| seq | `seq.pack` | **3997** | `3996=elemental_equip_left_human_ready` |
| spotanim | `spotanim.pack` | **666** | `665=spot_665` |
| synth | `synth.pack` | **2727** | `2726=DTTD_bone_crossbow_sa` |
| category | `category.pack` | **290** | `289=runecraft_tiaras` |

**Dense-id proof:** first line is `0=…`; last line is `max_id=…`; intermediate samples continuous. No sparse holes observed in these nine packs.

**Re-verify:**

```bash
# last id → lines
for p in npc loc obj varp varbit seq spotanim synth category; do
  f="vendor/content/pack/${p}.pack"
  last=$(tail -n1 "$f")
  echo "$p  lines=$(wc -l <"$f")  last=$last"
done
```


## 2. Prefix algorithm (npc / loc top-20)

**Rule (document + apply consistently):**

1. Take symbol RHS after `=`.
2. If the symbol contains `_`, **prefix = text before the first `_`**.
3. Else if the symbol matches leading letters then digits (`man2`, `farmer1`), **prefix = leading letter run** (first-digit pattern).
4. Else prefix = whole symbol (singletons; not ranked here).

**Examples:**

| Symbol | Prefix |
|--------|--------|
| `dwarf_city_banker1` | `dwarf` |
| `dwarfrock_dondakan` | `dwarfrock` |
| `0_41_53_freshfish` | `0` |
| `man2` | `man` (digit pattern; not in top-20) |
| `regicidegeneralshopkeeper` | whole name (no `_`) |

**Method note:** Top-20 tables below count **first-`_` prefixes only** (rule 2) for symbols that contain `_`. Digit-start fish spots appear as prefix `0`. Exhaustive ranking of every singleton without `_` was not required for the large families; counts below are full greps of `=PREFIX_` (or `=0_` for fishspots).


## 3. npc.pack — top 20 prefixes by count

| Rank | Prefix | Count | Notes |
|-----:|--------|------:|-------|
| 1 | `dwarf` | 165 | mostly `dwarf_city_*`, `dwarf_rock_*` |
| 2 | `macro` | 152 | random-event / ent / hyde families |
| 3 | `mm` | 88 | Monkey Madness (`mm_*` only; not `100_mm_*`) |
| 4 | `pest` | 76 | Pest Control |
| 5 | `slayer` | 76 | masters + task monsters |
| 6 | `hundred` | 63 | Recipe for Disaster / hundred subquests |
| 7 | `viking` | 62 | Fremennik |
| 8 | `tzhaar` | 54 | Fight Cave / Pit + town |
| 9 | `death` | 51 | Death Plateau |
| 10 | `0` | 51 | coord-keyed fishing spots `0_xx_yy_*` |
| 11 | `troll` | 41 | Troll Stronghold (not `trollromance_` / `trollrescue_`) |
| 12 | `misc` | 40 | Miscellania |
| 13 | `wanted` | 34 | Wanted! |
| 14 | `goblin` | 30 | armed/unarmed soldiers etc. |
| 15 | `swan` | 30 | Swan Song (`swan_*` only; not bare `swan` / `black_swan`) |
| 16 | `mourning` | 29 | Mourning’s End |
| 17 | `horror` | 27 | Horror from the Deep |
| 18 | `enakh` | 26 | Enakhra’s Lament |
| 19 | `ahoy` | 23 | Ghosts Ahoy |
| 20 | `regicide` | 23 | `regicide_*` only (`regicidegeneralshopkeeper` excluded) |

**Near-miss / related (not top-20 as first-`_` token):** `trollromance` 14, `trollrescue` 7, `farming` 21, `cave` 23, `barrows` 14, `route` 13.


## 4. loc.pack — top 20 prefixes by count

| Rank | Prefix | Count | Notes |
|-----:|--------|------:|-------|
| 1 | `loc` | **1711** | unnamed / default `loc_<id>` placeholders |
| 2 | `poh` | 561 | Player-owned house |
| 3 | `mourning` | 349 | Mourning’s End temple + mine |
| 4 | `dwarf` | 330 | Keldagrim / Between a Rock |
| 5 | `viking` | 225 | Fremennik / Rellekka |
| 6 | `ahoy` | 216 | Port Phasmatys / Ghosts Ahoy |
| 7 | `enakh` | 211 | Enakhra’s Lament |
| 8 | `mm` | 175 | Monkey Madness / Ape Atoll |
| 9 | `pest` | 170 | Pest Control island |
| 10 | `elid` | 150 | Spirits of the Elid |
| 11 | `regicide` | 146 | Isafdar / Tyras |
| 12 | `farming` | 135 | patches, shops, sheds (`=farming_*`) |
| 13 | `agility` | 131 | arena + pyramid (`agility_*`) |
| 14 | `barrows` | 122 | Barrows crypts / doors |
| 15 | `fairy` | 116 | Fairytale II / Zanaris-style |
| 16 | `cavewall` | 96 | generic cave walls (`cavewall` / `cavewall_*`) |
| 17 | `macro` | 64 | random-event rocks / maze / candlelight |
| 18 | `magictraining` | 62 | Mage Training Arena |
| 19 | `swamp` | 62 | swamp plants / cave walls |
| 20 | `champions` | 52 | Champions’ Challenge |

**Tied / near:** `misc` 52, `templetrek` 42, `desert` 39, `route` 9 pure + 1 `templetrek_route_*` mid-string if matching substring only.


## 5. Named symbol families — counts only

**Match rule:** case-sensitive **substring** of the symbol RHS (after `=`), as listed in the left column. Counts include incidental mid-string hits where noted.

| Pattern | npc | loc | obj | varp | varbit | seq | spotanim | synth | category | **Σ** |
|---------|----:|----:|----:|-----:|-------:|----:|---------:|------:|---------:|------:|
| `barrows` | 14 | 122 | 210 | 2 | 30 | 15 | 4 | 2 | 0 | **399** |
| `deserttreasure` | 10 | 20 | 0 | 3 | 1 | 15 | 2 | 0 | 0 | **51** |
| `hundred_` | 63 | 30 | 86 | 3 | 37 | 0 | 0 | 0 | 0 | **219** |
| `swan` | 32 | 0 | 4 | 2 | 15 | 25 | 2 | 6 | 0 | **86** |
| `pest` | 76 | 170 | 4 | 1 | 0 | 19 | 0 | 5 | 0 | **275** |
| `farming` | 24 | 136 | 0 | 11 | 12 | 23 | 4 | 18 | 0 | **228** |
| `mm_` | 90 | 175 | 44 | 2 | 11 | 2 | 1 | 0 | 1 | **326** |
| `route_` | 13 | 10 | 0 | 0 | 1 | 52 | 0 | 0 | 0 | **76** |
| `regicide` | 24 | 146 | 27 | 4 | 0 | 6 | 2 | 0 | 0 | **209** |
| `misc_` | 40 | 52 | 8 | 4 | 26 | 11 | 0 | 0 | 0 | **141** |

### Notes on match pollution / related names (not invent)

| Pattern | Caveats (observed) |
|---------|-------------------|
| `deserttreasure` | Does **not** match `desert_treasure_*` (underscore form). Loc also has `desert_treasure_*` and `desert_trasure_*` typos — **not** counted in the table. |
| `pest` | Includes `pestle_and_mortar` / cert (obj **2**) and `sos_pestdoor_*` (synth **2**). Pure Pest Control is mostly `pest_*`. |
| `mm_` | Includes mid-token hits: `100_mm_*` (npc **2**), `cert_mm_*` (obj), `human_mm_flyback` (seq), `vill_comm_*` (varbit **2**). First-prefix `mm` npc = **88**. |
| `route_` | Seq hits are almost all `templetrek_*route_*` (Temple Trekking). Loc includes `templetrek_route_direction`. Varbit: `burgh_route_myreque_party_visible`. |
| `farming` | Loc includes `qip_sheep_shearer_barrel_farming` (**1**). Npc includes `farmer_farming*` (**3**). |
| `swan` | Npc includes bare `swan` + `black_swan` (**2** of 32). |
| `regicide` | Npc includes `regicidegeneralshopkeeper` (no `_` after name). |


## 6. Implementer use

1. **Capacity / bounds:** use §1 line totals as fixed pack size for 377.
2. **Feature surface:** §5 family row = rough asset weight before opening configs/scripts.
3. **Naming convention:** first-`_` prefix clusters content by quest/minigame; `loc_*` mass = still-unnamed cache objects.
4. **Do not** treat substring tallies as exact quest-folder inventories — use [inventory-377-quest-trees.md](inventory-377-quest-trees.md) for scripts.


## 7. INDEX row suggestion

```markdown
| [corpus/inventory-377-pack-density.md](corpus/inventory-377-pack-density.md) | Pack line totals (9 packs) + npc/loc top-20 first-`_` prefixes + named family counts (barrows/DT/hundred_/…) | VERIFIED |
```

Also keep master inventories table in [corpus/README.md](README.md) (already listed).


## 8. Out of scope / not claimed

- Other packs (`model`, `interface`, `map`, `anim`, …) — not measured here.
- Soft-proof / smoke status of any quest or minigame.
- Whether `loc_*` IDs are used in map vs leftover.
- 289 vs 377 pack delta (separate unit if needed).
)
