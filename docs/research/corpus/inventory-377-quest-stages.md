# Fixed corpus inventory — quest complete stages + progress varps (377)

**Purpose:** Absolute complete-stage constants and progress varps from content files — no invented stage ladders.

**Measured:** 2026-08-08 · paths under  
`$RS2_R377_ROOT/vendor/content/`

**Related:**

| Doc | Role |
|-----|------|
| [`inventory-377-quest-trees.md`](inventory-377-quest-trees.md) | Folder → SCRIPTED / THIN / PACK_OR_LOC_ONLY |
| [`../wave4-pack-quest-flags-377.md`](../wave4-pack-quest-flags-377.md) | Pack-only flagships |
| `scripts/general/configs/quest.constant` | Primary complete + QP constants |
| `pack/varp.pack` | Runtime progress varp names |
| `scripts/interfaces/questlist.if` | Quest journal UI entries |

**Tags:** All numeric complete values below are **VERIFIED** from the named file.  
Tree buckets are **VERIFIED** cross-notes from [`inventory-377-quest-trees.md`](inventory-377-quest-trees.md) (folder `.rs2` inventory), not playability claims.

---

## 1. Counts (VERIFIED)

| Set | Count | Source |
|-----|------:|--------|
| `^*_complete = N` in `quest.constant` | **68** | `scripts/general/configs/quest.constant` L1–73 |
| Additional top-level `^*_complete` in quest trees | **4** | troll / troll_love / barcrawl / abyssal miniquest |
| **Total top-level quest/miniquest complete constants** | **72** | sum above |
| Sub-stage `^*_complete` (TBWT brothers + Viking trials) | **11** | per-quest `.constant` only |
| `^ikov_completed_*` (complete stages, non-`*_complete` name) | **2** | `quest.constant` L66–67 |
| Named `questlist:*` entries (not `com_*`) | **104** | `pack/interface.pack` |
| Structural `questlist:com_*` components | **26** | `com_0`…`com_24` + `com_43` |
| Total `questlist:*` pack lines | **130** | `pack/interface.pack` |
| Named `[slot]` blocks in `questlist.if` | **104** quest + **26** com = **130** | `scripts/interfaces/questlist.if` |

---

## 2. `quest.constant` — every `^*_complete = N` (VERIFIED)

Path:  
`$RS2_R377_ROOT/vendor/content/scripts/general/configs/quest.constant`

| Constant | Value | Likely folder / surface | Tree bucket (from inventory) |
|----------|------:|-------------------------|------------------------------|
| `^runemysteries_complete` | 6 | `quest_runemysteries` | THIN_OR_PARTIAL |
| `^arena_complete` | 14 | `quest_arena` | SCRIPTED |
| `^doric_complete` | 100 | `quest_doric` | THIN_OR_PARTIAL |
| `^cook_complete` | 2 | `quest_cook` | THIN_OR_PARTIAL |
| `^romeojuliet_complete` | 100 | `quest_romeojuliet` | THIN_OR_PARTIAL |
| `^hetty_complete` | 3 | `quest_hetty` | THIN_OR_PARTIAL |
| `^priest_complete` | 5 | `quest_priest` | THIN_OR_PARTIAL |
| `^squire_complete` | 7 | `quest_squire` | THIN_OR_PARTIAL |
| `^imp_complete` | 2 | `quest_imp` | THIN_OR_PARTIAL |
| `^druid_complete` | 4 | `quest_druid` | THIN_OR_PARTIAL |
| `^gobdip_complete` | 6 | `quest_gobdip` | THIN_OR_PARTIAL |
| `^sheep_complete` | 22 | `quest_sheep` | THIN_OR_PARTIAL |
| `^fluffs_complete` | 6 | `quest_fluffs` | THIN_OR_PARTIAL |
| `^demon_complete` | 30 | `quest_demon` | THIN_OR_PARTIAL |
| `^prince_complete` | 110 | `quest_prince` | THIN_OR_PARTIAL |
| `^blackknight_complete` | 4 | `quest_blackknight` | THIN_OR_PARTIAL |
| `^haunted_complete` | 3 | `quest_haunted` | THIN_OR_PARTIAL |
| `^hunt_complete` | 4 | `quest_hunt` | SCRIPTED |
| `^drunkmonk_complete` | 80 | `quest_drunkmonk` | THIN_OR_PARTIAL |
| `^tutorial_complete` | 1000 | `scripts/tutorial/` (not under `quests/`) | n/a (tutorial) |
| `^vampire_complete` | 3 | `quest_vampire` | THIN_OR_PARTIAL |
| `^totem_complete` | 5 | `quest_totem` | THIN_OR_PARTIAL |
| `^fishingcompo_complete` | 5 | `quest_fishingcompo` | THIN_OR_PARTIAL |
| `^scorpcatcher_complete` | 6 | `quest_scorpcatcher` | THIN_OR_PARTIAL |
| `^dragon_complete` | 10 | `quest_dragon` | SCRIPTED |
| `^zanaris_complete` | 6 | `quest_zanaris` | SCRIPTED |
| `^hero_complete` | 15 | `quest_hero` | SCRIPTED |
| `^legends_complete` | 75 | `quest_legends` | SCRIPTED |
| `^blackarmgang_complete` | 4 | `quest_blackarmgang` | THIN_OR_PARTIAL |
| `^phoenixgang_complete` | 10 | Shield of Arrav (phoenix side; no separate folder) | THIN (via blackarmgang / area) |
| `^elena_complete` | 29 | `quest_elena` | SCRIPTED |
| `^seaslug_complete` | 12 | `quest_seaslug` | THIN_OR_PARTIAL |
| `^arthur_complete` | 7 | `quest_arthur` | SCRIPTED |
| `^tree_complete` | 9 | `quest_tree` | SCRIPTED |
| `^grandtree_complete` | 160 | `quest_grandtree` | SCRIPTED |
| `^waterfall_complete` | 10 | `quest_waterfall` | SCRIPTED |
| `^grail_complete` | 10 | `quest_grail` | SCRIPTED |
| `^ball_complete` | 7 | `quest_ball` | SCRIPTED |
| `^murder_complete` | 2 | `quest_murder` | SCRIPTED |
| `^hazeelcult_complete` | 9 | `quest_hazeelcult` | SCRIPTED |
| `^itgronigen_complete` | 7 | `quest_itgronigen` | SCRIPTED |
| `^junglepotion_complete` | 12 | `quest_junglepotion` | THIN_OR_PARTIAL |
| `^tbwt_complete` | 6 | `quest_tbwt` | SCRIPTED |
| `^horror_complete` | 10 | `quest_horror` | SCRIPTED |
| `^mortton_quest_complete` | 85 | `quest_mortton` | SCRIPTED |
| `^eadgar_complete` | 110 | `quest_eadgar` | SCRIPTED |
| `^biohazard_complete` | 16 | `quest_biohazard` | SCRIPTED |
| `^desertrescue_complete` | 30 | `quest_desertrescue` | SCRIPTED |
| `^regicide_complete` | 15 | `quest_regicide` | SCRIPTED |
| `^routequest_complete` | 105 | `quest_routequest` | SCRIPTED |
| `^viking_complete` | 10 | `quest_viking` | SCRIPTED |
| `^mm_complete` | 10 | `quest_mm` | THIN_OR_PARTIAL |
| `^recruitmentdrive_complete` | 2 | `quest_rd` | PACK_OR_LOC_ONLY |
| `^deserttreasure_complete` | 15 | *no* `quest_*` folder | **PACK_ONLY** (questlist + varps only) |
| `^priestperil_complete` | 60 | `quest_priestperil` | SCRIPTED |
| `^death_complete` | 80 | `quest_death` | SCRIPTED |
| `^golem_complete` | 10 | `quest_golem` | SCRIPTED |
| `^zombiequeen_complete` | 15 | `quest_zombiequeen` | SCRIPTED |
| `^upass_complete` | 10 | `quest_upass` | SCRIPTED |
| `^sheepherder_complete` | 3 | `quest_sheepherder` | SCRIPTED |
| `^mcannon_complete` | 11 | `quest_mcannon` | SCRIPTED |
| `^crest_complete` | 11 | `quest_crest` | SCRIPTED |
| `^elemental_workshop_complete` | 20 | `quest_elemental_workshop` | SCRIPTED |
| `^druidspirit_complete` | 110 | `quest_druidspirit` | SCRIPTED |
| `^quest_cog_complete` | 8 | `quest_cog` | SCRIPTED |
| `^chompybird_complete` | 65 | `quest_chompybird` | SCRIPTED |
| `^itexam_complete` | 9 | `quest_itexam` | SCRIPTED |
| `^itwatchtower_complete` | 13 | `quest_itwatchtower` | SCRIPTED |

### Adjacent complete stages (not matching `*_complete` suffix)

| Constant | Value | Notes |
|----------|------:|-------|
| `^ikov_completed_armadyl` | 80 | Armadyl path complete; `quest_ikov` SCRIPTED |
| `^ikov_completed_lucien` | 90 | Lucien path complete; same folder |

---

## 3. Per-quest `*.constant` — additional `^*_complete` (VERIFIED)

| Constant | Value | File | Tree bucket |
|----------|------:|------|-------------|
| `^troll_complete` | 50 | `scripts/quests/quest_troll/configs/quest_troll.constant` | SCRIPTED |
| `^troll_love_complete` | 45 | `scripts/quests/quest_troll_love/configs/quest_troll_love.constant` | SCRIPTED |
| `^barcrawl_complete` | 2 | `scripts/quests/quest_barcrawl/configs/quest_barcrawl.constant` | THIN_OR_PARTIAL |
| `^miniquest_abyssal_complete` | 4 | `scripts/quests/miniquest_abyssal/configs/abyssal_miniquest.constant` | SCRIPTED |

### Sub-stage completes (not full-quest complete)

**TBWT** (`quest_tbwt/configs/quest_tbwt.constant`):

| Constant | Value |
|----------|------:|
| `^tbwt_tiadeche_complete` | 6 |
| `^tbwt_tamayu_complete` | 4 |
| `^tbwt_tinsay_complete` | 7 |
| `^tbwt_lubufu_complete` | 31 |

**Viking trials** (`quest_viking/configs/quest_viking.constant`):

| Constant | Value |
|----------|------:|
| `^swensen_complete` | 2 |
| `^reveller_complete` | 2 |
| `^sigli_complete` | 3 |
| `^thorvald_complete` | 2 |
| `^peer_complete` | 3 |
| `^olaf_complete` | 7 |
| `^sigmund_complete` | 15 |

*(Not listed as quest complete thresholds: area/minigame `^mage_arena_complete = 6`, `^trail_chart_complete = 4`, tutorial `^newbie_survival_instructor_complete = 120`.)*

---

## 4. Bucket summary for complete-constant rows

Cross-note only — from §2–3 + tree inventory:

| Bucket | Top-level complete constants |
|--------|-----------------------------:|
| SCRIPTED tree present | **42** (39 from `quest.constant` + troll + troll_love + abyssal) |
| THIN_OR_PARTIAL tree | **26** (25 from `quest.constant` + barcrawl) |
| PACK_OR_LOC_ONLY folder | **1** (`recruitmentdrive` → `quest_rd`) |
| PACK_ONLY (no quest folder) | **1** (`deserttreasure`) |
| Tutorial (outside `scripts/quests/`) | **1** (`tutorial_complete`) |
| Shared / dual-path (phoenixgang) | **1** |
| **Total top-level** | **72** |

**Questlist entries with no `^*_complete` in measured constants** (pack/UI only from this inventory — non-exhaustive of every missing script):  
`swansong`, `wanted`, `mourning2`, `misc`, `fairy_farmers`, `hauntedmine`, `creatureoffenkenstrain`, `roving_elves`, `ahoy`, `onesmallfavour`, `mdaughter`, `dwarfrock`, `feud`, `ics_little`, `tog`, `zogre`, `giantdwarf`, `lost_tribe`, `mourning`, `forget`, `garden`, `deal`, `soulbane`, `twocats`, `agrith`, `makinghistory`, `ratcatch`, `elid`, `devious`, `handsand`, `enakh`, `fever`, `hundred_main`, `myreque_2`, `rag`, …  
→ See Wave 4 / readiness docs; do not invent complete values.

---

## 5. Progress-looking varps in `pack/varp.pack` (name match)

Path:  
`$RS2_R377_ROOT/vendor/content/pack/varp.pack`

**Method:** Include varps whose names match a quest stem, `*quest*`, known complete-constant stem, or documented quest multi/bits. Exclude pure skill/combat/option/music/prayer/shop/macro placeholders unless the name is quest-specific.

### 5a. Classic / scripted-line mains (sample of primary progress varps)

| ID | Name | Ties to complete const (if any) |
|---:|------|--------------------------------|
| 0 | `mcannon` | `^mcannon_complete` |
| 5 | `grail` | `^grail_complete` |
| 10 | `cogquest` | `^quest_cog_complete` |
| 11 | `fishingcompo` | `^fishingcompo_complete` |
| 14 | `arthur` | `^arthur_complete` |
| 17 | `arenaquest` | `^arena_complete` |
| 26 | `ikov` | `^ikov_completed_*` |
| 29 | `cookquest` | `^cook_complete` |
| 30 | `drunkmonkquest` | `^drunkmonk_complete` |
| 31 | `doricquest` | `^doric_complete` |
| 32 | `haunted` | `^haunted_complete` |
| 60 | `sheepherderquest` | `^sheepherder_complete` |
| 62 | `goblinquest` | `^gobdip_complete` |
| 63 | `runemysteries` | `^runemysteries_complete` |
| 65 | `waterfall_quest` | `^waterfall_complete` |
| 67 | `hetty` | `^hetty_complete` |
| 68 | `biohazard` | `^biohazard_complete` |
| 71 | `hunt` | `^hunt_complete` |
| 75 | `scorpcatcher` | `^scorpcatcher_complete` |
| 77 | `barcrawl` | `^barcrawl_complete` |
| 80 | `druidquest` | `^druid_complete` |
| 107 | `prieststart` | `^priest_complete` |
| 111 | `treequest` | `^tree_complete` |
| 112 | `itgronigen` | `^itgronigen_complete` |
| 116 | `zombiequeen` | `^zombiequeen_complete` |
| 122 | `squire` | `^squire_complete` |
| 130 | `spy` | *(plague/elena related)* |
| 131–133 | `itexamlevel` / `itexam_errands` / `itexam_bits` | `^itexam_complete` |
| 139 | `legendsquest` | `^legends_complete` |
| 144 | `rjquest` | `^romeojuliet_complete` |
| 145 | `phoenixgang` | `^phoenixgang_complete` |
| 146 | `blackarmgang` | `^blackarmgang_complete` |
| 147 | `zanaris` | `^zanaris_complete` |
| 148 | `crestquest` | `^crest_complete` |
| 150 | `grandtree` | `^grandtree_complete` |
| 159 | `seaslugquest` | `^seaslug_complete` |
| 160 | `imp` | `^imp_complete` |
| 161 | `upass` | `^upass_complete` |
| 165 | `elenaquest` | `^elena_complete` |
| 175 | `junglepotion` | `^junglepotion_complete` |
| 176 | `dragonquest` | `^dragon_complete` |
| 178 | `vampire` | `^vampire_complete` |
| 179 | `sheep` | `^sheep_complete` |
| 180 | `fluffs` | `^fluffs_complete` |
| 188 | `heroquest` | `^hero_complete` |
| 192 | `murderquest` | `^murder_complete` |
| 197 | `desertrescue` | `^desertrescue_complete` |
| 200 | `totemquest` | `^totem_complete` |
| 212 | `itwatchtower` | `^itwatchtower_complete` |
| 219 | `death` | `^death_complete` |
| 222 | `demonstart` | `^demon_complete` |
| 223 | `hazeelcultquest` | `^hazeelcult_complete` |
| 226 | `ballquest` | `^ball_complete` |
| 273 | `princequest` | `^prince_complete` |
| 281 | `tutorial` | `^tutorial_complete` |
| 293 | `chompybird` | `^chompybird_complete` |
| 299 | `elemental_workshop_bits` | `^elemental_workshop_complete` |
| 302 | `priestperil` | `^priestperil_complete` |
| 306 | `mortmyre` | *(Nature Spirit / Myreque dep surface)* |
| 307 | `druidspirit` | `^druidspirit_complete` |
| 314 | `death_equiproom` | Death Plateau progress colour |
| 315 | `death_map` | Death Plateau map stage |
| 317 | `troll_quest` | `^troll_complete` |
| 320 | `tbwt_main` | `^tbwt_complete` |
| 328 | `regicide_quest` | `^regicide_complete` |
| 335 | `eadgar_quest` | `^eadgar_complete` |
| 339 | `morttonquest` | `^mortton_quest_complete` |
| 347 | `viking` | `^viking_complete` |
| 352 | `deephorror` | `^horror_complete` |
| 359 | `misc_quest` | Throne of Miscellania (no complete const in §2) |
| 365 | `mm_main` | `^mm_complete` |
| 382 | `hauntedmine` | pack-only Haunted Mine |
| 385 | `troll_love` | `^troll_love_complete` |
| 387 | `routequest` | `^routequest_complete` |
| 399 | `fenk_quest` | Creature of Fenkenstrain |
| 402 | `roving_elves_quest` | Roving Elves |
| 416 | `onesmallfavour` | One Small Favour |
| 423 | `mdaughter_var` | Mountain Daughter |
| 433 | `dwarfrock_main` | Between a Rock… |
| 435 | `main_feud_var` | The Feud |
| 437 | `golem_quest` | `^golem_complete` |
| 440 | `deserttreasuremain` | `^deserttreasure_complete` |
| 445 | `main_ics_var` | Icthlarin's Little Helper |
| 455 | `zombie_ogre` | Zogre Flesh Eaters surface |
| 465 | `lost_tribe` | Lost Tribe |
| 482 | `giantdwarf_main` | The Giant Dwarf |
| 492 | `abyssal_miniquest` | `^miniquest_abyssal_complete` |
| 496 | `recruitmentdrive` | `^recruitmentdrive_complete` |
| 517 | `mourning_quest` | Mourning's End Part I |
| 521 | `forget_main_var` | Forgettable Tale… |
| 553 | `garden_varp_1` | Garden of Tranquillity |
| 568 | `twocats_varbit` | A Tail of Two Cats |
| 571 | `quest_wanted` | Wanted! |
| 574 | `mourning_quest_part2` | Mourning's End Part II |
| 600 | `deal_quest` | Rum Deal |
| 602 | `agrith_quest_varp` | Shadow of the Storm / Agrith |
| 604 | `makinghistory` | Making History |
| 607 | `main_ratcatch_var` | Ratcatchers |
| 616 | `elid_main` | Spirits of the Elid |
| 622 | `devious_base` | Devious Minds |
| 635 | `handsand` | The Hand in the Sand |
| 641–643 | `enakh_*` | Enakhra's Lament |
| 655 | `fever_quest` | Cabin Fever |
| 678–684 | `100intro` / `100council` / `hundred_*` / `100_*` | Recipe for Disaster |
| 704 | `myreque_2_main_var` | In Aid of the Myreque |
| 709 | `soulbane` | A Soul's Bane |
| 714 | `rag_quest` | Rag and Bone Man |
| 723 | `swansong_quest` | Swan Song |
| 725–728 | `tbwt_tiadeche` / `tbwt_tinsay` / `tbwt_tamayu` / `tbwt_lubufu` | TBWT brother stages |

### 5b. Companion / multi / bits varps (quest-adjacent name match)

Non-exhaustive but measured IDs from the same pack file:

`mcannonmulti`, `ikov_dungeon`, `sheepherdervar`, `waterfall_golrie_and_puzzle`, `bioerrand`, `biodummy`, `legends_bits`, `crest_spells_levers_gauntlets`, `dragonquestvar`, `murder_poisonproof_progress`, `murder_evidence`, `murdersus`, `desertrescue_map_mechanisms`, `itwatchtower_bits`, `hazeelcult_valves`, `hazeelcult_side`, `prince_keystatus`, `priestperil_mausoleum`, `druidspirit_bits`, `death_bits`, `troll_varbit`, `regicide_bits`, `regicide_still_*`, `morttonmulti`, `viking_bits`, `routequestmulti`, `routequest_myreque_bits`, `fenk_flags`, `roving_elves_bits`, `ahoy_varbits_1`, `onesmallfavourmulti`, `feud_var_multi`, `deserttreasurevarbit`, `deserttreasurevarbit2`, `ics_little_multi`, `mourning_quest_bits`, `mourning_quest_beams*`, `mourning_quest_vert_beams*`, `mourning_quest_beam_cross*`, `quest_wanted2`, `deal_var`, `ratcatch_var_multi`, `fever_cannon_var`, `fever_extra_var`, `fever_storage_var`, `myreque2_multivar`, `myreque2_extravar`, `soulbane2`, `rag_bone_2`, `swansong_temp`, `tbwt_flags`, `eadgar_bits`, `eadgar_grain`, `eadgar_chickens`, `misc_varbit_*`, `mm_gnomes`, `fairytale_multi`, `hauntedmine_bits`.

### 5c. Explicit non-quest (do not treat as quest progress)

Examples of names that appear near quests in the pack but are **not** quest-stage mains:  
`qp` (quest points total), `prayer0`…`prayer17`, `option_*`, `musicmulti_*`, `com_*` combat, `shop*`, `trail_status` (clues), `farming_*`, `castlewars_*`, `boardgames_*`, `slayer_*`, `tzhaar_*`, `trawler*`, `barrows*`, `pest_instance`, bare `varp_N` placeholders.

---

## 6. Questlist interface entry count (VERIFIED)

| Measure | Count | How measured |
|---------|------:|--------------|
| Named quest slots in `questlist.if` | **104** | `[name]` blocks excluding `com_*` |
| `com_*` UI/layer components | **26** | `com_0`–`com_24`, `com_43` |
| `questlist:*` lines in `interface.pack` | **130** | same split: 104 named + 26 com |
| Root interface id | `638=questlist` | `pack/interface.pack` |

**Display name source (partial enum):**  
`scripts/general/configs/quest.enum` `[quest_names_enum]` has vals **0–53** only (classic set through Priest in Peril) — **not** a full 104-name table.

---

## 7. Sample mid-PASS units (documented harness/research — not complete claims)

These are **mid-gate** results already written in plans/research. Complete-stage values are from §2; mid stages are smoke evidence, often SOFT-labeled.

| Unit | Complete const / value | Sample mid-PASS evidence | Source docs |
|------|------------------------|--------------------------|-------------|
| Shades of Mort’ton | `^mortton_quest_complete = 85` | Start 5; mid-early 15; mid-kill 40; mid-temple **50 PASS** (`mtnsgsppgf`) | plans `2026-08-05-port-quest-mortton.md`; research `mortton-flamtaer-complete-377.md` |
| Tai Bwo Wannai Trio | `^tbwt_complete = 6` | Mid **`tbwt_main=6` PASS** (`tbwsgm9q64`); complete residual open | plans `2026-08-05-tbwt-mid-multi-npc.md`; research `tbwt-complete-gate-377.md` |
| Horror from the Deep | `^horror_complete = 10` | Mid **≥2 PASS** | plans backlog / `horror-complete-gate-377.md` |
| Eadgar's Ruse | `^eadgar_complete = 110` | Mid **PASS** (complete residual later) | research `eadgar-complete-gate-377.md`; backlog |
| Fremennik Trials | `^viking_complete = 10` | Mid chain: Swensen≥3, Peer≥4, Sigli≥5, Thorvald **viking=6** mid37 PASS | plans `2026-08-06-session-dump-end.md`, `2026-08-07-content-breadth-backlog.md` |
| Regicide | `^regicide_complete = 15` | Start ≥2 PASS; mid ≥4 PASS (`regsjpucjk`); SOFT scouts | plans `2026-08-07-regicide-start-gate-smoke.md` |
| In Search of the Myreque | `^routequest_complete = 105` | Start ≥5 + mid ≥25 hollows PASS (`myrsjqhcvh`) | backlog `2026-08-07-content-breadth-backlog.md` |
| Death Plateau | `^death_complete = 80` | Full SCRIPTED tree; progress via `%death_equiproom` | research `death-plateau-377-readiness.md` |
| Underground Pass | `^upass_complete = 10` | Soft complete used as Regicide dep (labeled SOFT) | regicide start smoke policy |
| Grand Tree | `^grandtree_complete = 160` | Complete value VERIFIED; soft/product residual smokes | research `grand-tree-377-readiness.md` |

**Do not** promote mid-PASS to “complete PASS” without a separate complete smoke RESULT.

---

## 8. How to re-verify

```bash
export RS2_R377_ROOT=$RS2_R377_ROOT

# Complete constants (quest.constant + quest trees)
rg -n '^\^[A-Za-z0-9_]+_complete\s*=' \
  "$RS2_R377_ROOT/vendor/content/scripts/general/configs/quest.constant" \
  "$RS2_R377_ROOT/vendor/content/scripts/quests"

# Questlist named entries
rg -n '^questlist:' "$RS2_R377_ROOT/vendor/content/pack/interface.pack" | wc -l
rg -n '^\[[a-z0-9_]+\]' "$RS2_R377_ROOT/vendor/content/scripts/interfaces/questlist.if" | wc -l

# Quest-looking varps
rg -n 'quest|treasure|favour|swan|wanted|mourning|myreque|regicide|eadgar|mortton|viking|tbwt|desert|rd|misc|ahoy|feud|enakh|fever|hundred|soulbane|rag_' \
  "$RS2_R377_ROOT/vendor/content/pack/varp.pack"
```

---

## 9. Gaps / non-claims

1. **No invented complete values** for pack-only questlist rows without constants.  
2. **Tree bucket ≠ playable:** SCRIPTED means `.rs2` files exist; authenticity/smoke is separate.  
3. **Varp list is name-heuristic** — multi/bits may hold flags not linear stages.  
4. **Ikov** uses `^ikov_completed_armadyl` / `^ikov_completed_lucien`, not `*_complete`.  
5. **`^troll_complete` lives only** in `quest_troll.constant` (not duplicated in `quest.constant`); `quest.constant` has `^troll_questpoints = 1` only.  
6. **QP constants** (`^*_questpoints`) are adjacent in `quest.constant` L75–138 — out of scope for complete-stage table; do not confuse with complete stage N.

---

**Return summary:** **72** top-level `^*_complete` constants (68 in `quest.constant` + 4 per-quest); **104** named questlist entries; sample mid-PASS units: Mort’ton 50, TBWT 6, Horror ≥2, Eadgar mid, Viking 6, Regicide 2/4, Myreque 25.
