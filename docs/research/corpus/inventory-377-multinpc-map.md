# Fixed corpus inventory — 377 multi-npc bases

**Purpose:** Count and sample **multi-npc map bases** on rev **377** so ports do not re-discover the TBWT footgun (op binds **concrete** form, map spawns **multi base**).

**Measured:** 2026-08-08 · primary source `vendor/content/scripts/_unpack/377/all.npc` · secondary `vendor/content/**/*.npc` · pack ids `vendor/content/pack/npc.pack`.

**Tags:** multi-base count and sample rows are **VERIFIED_DRAFT** until main-thread re-measure (see CLAIM table §5).

**Scope:** NPC multi only (`multivar` + `multinpc=`). Loc multiloc / farming patches are out of scope (see `nav-multiloc-collision.md`, farming F1).


## 1. Counts (primary = unpack)

| Metric | Value | Source |
|--------|------:|--------|
| Multi bases (`^multivar=` lines) in `all.npc` | **214** | unpack |
| `multinpc=` table rows in `all.npc` | **530** | unpack |
| `multivarbit=` on NPC | **0** | unpack (NPCs use **varp/varbit name** via `multivar=` only in this dump) |
| Extra multi base in distributed `*.npc` | **+1** `[golem_golem]` | `scripts/quests/quest_golem/configs/golem.npc` |
| Multi bases if counting all content configs | **215** | 214 + golem |

**Definition used:** one multi **base** = one NPC config block that declares `multivar=` (and usually one or more `multinpc=<stage>,<concrete>` rows). Map/jm2 spawns the **base** id; client/engine resolve to a **concrete** type from the player’s multivar value.

**Not the same as:**

| Pattern | Meaning |
|---------|---------|
| Base name contains `_multinpc_` / `_multi_` / `multi_` | Common **debugname** convention only — many bases lack these tokens (e.g. `[sinister_stranger]`, `[plaguesheep_1]`, `[lost_tribe_sigmund]`) |
| Concrete form | Named child with `name=` / ops; what scripts usually bind |
| Pack id of spawn | Map line uses **base** pack id (e.g. Tiadeche shore **2483**), not the final brother id |

**Golem note:** unpack already has multi bases that use `multivar=golem_clay` (e.g. `agrith_golem_walking`); quest file adds distinct base **`golem_golem`** (pack **1907**) with its own table → concrete `golem_broken_golem` / `golem_partially_broken_golem` / `golem_fixed_golem`. That base is **not** a line inside `all.npc`.


## 2. Sample of 20 multi bases (name + multivar)

Diverse sample across early classic, TBWT, Myreque, desert, fairy, RfD-adjacent, Swan Song. Concrete column = first/primary `multinpc=` target (not exhaustive stage map).

| # | Multi base (debugname) | Pack id | `multivar=` | Sample concrete(s) |
|--:|------------------------|--------:|-------------|--------------------|
| 1 | `sinister_stranger` | 226 | `fishingcompo_stranger` | `sinister_stranger0` / `sinister_stranger1` |
| 2 | `plaguesheep_1` | (prefix cluster) | `mourning_sheep_red` | `herder_plaguesheep_1` / `mourning_plaguesheep_1` |
| 3 | `ahoy_akharanu_multi` | 1687 | `ahoy_questvar` | `ahoy_akharanu` |
| 4 | `mdaughter_multi_bear` | 1811 | `mdaughter_bear_multi_state` | `mdaughter_bearman` |
| 5 | `dwarfrock_multi_dondakan` | 1836 | `dwarfrock_quest` | `dwarfrock_dondakan` (+ stage 110 → `_noaxe`) |
| 6 | `feud_arabian_guard_multi` | 1879 | `feud_npc_multi` | `feud_arabian_guard1_1` / `_2` |
| 7 | `multi_vanstrom_stranger_entity` | **2020** | `thsfm_vanstrom_hide` | `route_vanstrom_klause_sitting` / `canafis_stranger` |
| 8 | `lost_tribe_sigmund` | 2079 | `lost_tribe_quest` | `lost_tribe_sigmund_there` |
| 9 | `rcu_zammy_mage1` | (Abyss) | `abyssal_miniquest` | `rcu_zammy_mage1a` / `1b` |
| 10 | `magic_carpet_seller5_multi` | 2295 | `golem_a` | `magic_carpet_seller5` |
| 11 | **`tbwt_tiadeche_multinpc_shore`** | **2483** | **`tbwt_main`** | **`tbwt_tiadeche`** (stages 0–5); house multi → `tbwt_tiadeche_final` @ 6 |
| 12 | `tbwcu_gabooty_multinpc` | 2519 | `chat_gabooty` | `tbwcu_gabooty` / `_nosticks` |
| 13 | `multi_skippy` | 2795 | `skippy_state` | `skippy` / `damp_skippy` / `hungover_skippy` / `sober_skippy` |
| 14 | `alice_the_camel_multinpc` | 2813 | `desert_alkharid_alis_visible` | `camel` / `alice_the_camel` |
| 15 | `enakh_enakhra_multinpc` | 3136 | `enakh_enakhra_form` | `enakh_enakhra_hooded` / `_mahjarrat` |
| 16 | `ernest_multiernest` | 3289 | `haunted` | `ernest` |
| 17 | `fairy_queen_multi` | 3314 | `fairy_queen_check` | `fairy_queen` |
| 18 | `hundred_dwarf_dad_multi` | 3401 | `hundred_dwarf_multi_dad` | `hundred_dwarf_dad` / `_rohak` |
| 19 | `templetrek_multi_child_hard` | 3623 | `templetrek_npcs_visible` | `templetrek_child_hard` |
| 20 | `wom_multi` | (Swan Song) | `swansong` | `wise_old_man` (many stages → same concrete) |

**TBWT brother cluster (same multivar `tbwt_main`):** six bases —  
`tbwt_tiadeche_multinpc_{shore,house}`, `tbwt_tinsay_multinpc_{island,house}`, `tbwt_tamayu_multinpc_{jungle,house}` — all map-spawned; progress stages gate which concrete appears at which site.

**Related:** full unpack list of `multivar=` lines is re-measurable with the recipe in §5; do not treat this sample as exhaustive.


## 3. Product footgun — op binds concrete, not multi base (TBWT lesson)

### 3.1 What went wrong

| Layer | Symptom |
|-------|---------|
| Map | Spawn type = multi base (`tbwt_tiadeche_multinpc_shore`, pack **2483**) |
| Content scripts | Triggers on **concrete** only: `[opnpc1,tbwt_tiadeche]` (not `…_multinpc_shore`) |
| Engine (broken) | `getOpTrigger` used **raw spawn type** → `No trigger for [opnpc1,tbwt_tiadeche_multinpc_shore]` |
| Client (broken) | Draw/menu/name used base → **null name**, wrong model, empty ops |
| Chat | `npc_name` / `NPC_NAME` on base → modal title **`null`** |

**Smoke evidence:** `tbwsgjejip` FAIL with exact multi-base trigger string; fixed path landed mid **PASS** `tbwsgm9q64` (2026-08-05). Plans: `docs/plans/2026-08-05-tbwt-mid-multi-npc.md`. Manual: `docs/research/runescript/living-notes.md` §12.1 · `failures.md` multi row · `docs/runbooks/quest-impl.md` multi-npc.

### 3.2 Correct binding model

```text
jm2 / map spawn  →  multi BASE id  (often nameless / vislevel=1)
                         │
              multivar (player) ──► multinpc table
                         │
                         ▼
                 CONCRETE type id  →  name, ops, opnpc* scripts
```

| Layer | Must resolve multi before use |
|-------|-------------------------------|
| Client draw / mini-menu / examine | `NpcType.getMultiNpc` / `activeType` (Java `method476`) |
| Engine OP validation + trigger lookup | `Player.getOpTrigger` / `getApTrigger` |
| `npc_name` / chat title / `NPC_TYPE` | Same multi resolve as OpNpc |
| Harness `reader.npcs()` | Prefer `activeType()` names |

### 3.3 Script patterns (do not invent)

| Pattern | Example | When |
|---------|---------|------|
| **Bind concrete** (common) | `[opnpc1,tbwt_tiadeche]` | Map multi; engine must resolve |
| **Bind multi base** (rare / intentional) | pack has `[opnpc1,golem_golem]` | Script authored on the base symbol |
| **Never** add `[opnpc1,*_multinpc_*]` only to “fix” missing multi resolve | — | Hides engine/client bugs; breaks when form changes |

### 3.4 Port / harness checklist

1. Grep map spawn: base pack id or debugname (`*_multinpc_*` **or** bare name with `multivar=` in unpack).  
2. Open base block → note `multivar` and concrete symbols at current stage.  
3. Grep scripts for **concrete** `opnpc*` — not only the map name.  
4. Soft-set the multivar so the expected concrete is active before talk/use.  
5. If FAIL is `No trigger for [opnpc1,<base>]` → multi resolve, not “missing content trigger on base.”


## 4. Naming conventions observed

| Debugname fragment | Frequency / note |
|--------------------|------------------|
| `*_multinpc_*` | TBWT brothers, Enakhra, Burgh, some desert Ali |
| `*_multi` / `*_multi_*` / `multi_*` | Ahoy, Myreque Vanstrom, fairy, RfD dwarf, Swan `wom_multi` |
| **No multi token** | `sinister_stranger`, `plaguesheep_*`, `lost_tribe_sigmund`, `rcu_zammy_mage1` — still multi bases |

**Inventory rule:** count by `multivar=` presence, **not** by name regex alone.


## 5. CLAIM + RECIPE (verify-queue)

| CLAIM | TAG | RECIPE |
|-------|-----|--------|
| **214** multi bases in unpack (`multivar=` count) | VERIFIED_DRAFT | `rg -c '^multivar=' vendor/content/scripts/_unpack/377/all.npc` → expect **214** |
| **530** `multinpc=` rows in unpack | VERIFIED_DRAFT | `rg -c '^multinpc=' vendor/content/scripts/_unpack/377/all.npc` → expect **530** |
| Distributed `*.npc` adds **1** multi base (`golem_golem`) | VERIFIED_DRAFT | `rg -n '^multivar=' vendor/content --glob '*.npc'` → all.npc 214 + golem.npc 1 = **215** |
| Tiadeche shore base **2483** / multivar `tbwt_main` | VERIFIED_DRAFT | `rg -n '2483=tbwt_tiadeche_multinpc_shore' vendor/content/pack/npc.pack`; unpack block ~51818–51828 |
| Scripts bind **concrete** `tbwt_tiadeche`, not multi base | VERIFIED_DRAFT | `rg -n '\[opnpc1,tbwt_tiadeche' vendor/content/scripts` → `tbwt_tiadeche.rs2` only; no `…_multinpc_shore` opnpc header |
| Vanstrom multi base pack **2020** / `thsfm_vanstrom_hide` | VERIFIED_DRAFT | `rg -n '2020=multi_vanstrom' vendor/content/pack/npc.pack`; unpack ~43216–43221 |
| No NPC `multivarbit=` in unpack | VERIFIED_DRAFT | `rg -c '^multivarbit=' vendor/content/scripts/_unpack/377/all.npc` → **0** |

**PATH:** `docs/research/corpus/inventory-377-multinpc-map.md`


## 6. Related docs

| Doc | Role |
|-----|------|
| `docs/plans/2026-08-05-tbwt-mid-multi-npc.md` | Live FAIL→PASS multi + engine/client fixes |
| `docs/research/runescript/living-notes.md` §12.1 | Multi-npc layers |
| `docs/research/runescript/failures.md` | `*_multinpc_*` trigger diagnosis |
| `docs/runbooks/quest-impl.md` | Port checklist multi-npc |
| `docs/research/port-quest-routequest-289-to-377.md` | Vanstrom multi map tile |
| `docs/research/map-npc-spawns-jm2-377.md` | jm2 spawn format |
| `docs/research/nav-multiloc-collision.md` | Loc multiloc analogue |
| `docs/research/corpus/inventory-377-pack-density.md` | npc.pack line total **3852** |
)
