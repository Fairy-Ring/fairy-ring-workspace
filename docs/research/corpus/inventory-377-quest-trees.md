# Fixed corpus inventory — quest trees (377 content)

**Purpose:** Know the **entire** `scripts/quests/` surface before implementing.

**Measured:** 2026-08-08 · path `vendor/content/scripts/quests/` · `.rs2` recursive counts.

**Tags:** counts are **VERIFIED**; playability = separate research/smoke.


| Folder | `.rs2` | configs* | Bucket |
|--------|-------:|---------:|--------|
| `interfaces` | 0 | 1 | PACK_OR_LOC_ONLY |
| `miniquest_abyssal` | 4 | 1 | SCRIPTED |
| `quest_100` | 0 | 1 | PACK_OR_LOC_ONLY |
| `quest_arena` | 14 | 1 | SCRIPTED |
| `quest_arthur` | 4 | 2 | SCRIPTED |
| `quest_ball` | 5 | 2 | SCRIPTED |
| `quest_barcrawl` | 1 | 2 | THIN_OR_PARTIAL |
| `quest_biohazard` | 9 | 2 | SCRIPTED |
| `quest_blackarmgang` | 3 | 2 | THIN_OR_PARTIAL |
| `quest_blackknight` | 3 | 1 | THIN_OR_PARTIAL |
| `quest_chompybird` | 11 | 2 | SCRIPTED |
| `quest_cog` | 8 | 2 | SCRIPTED |
| `quest_cook` | 2 | 2 | THIN_OR_PARTIAL |
| `quest_crest` | 8 | 2 | SCRIPTED |
| `quest_death` | 10 | 4 | SCRIPTED |
| `quest_demon` | 3 | 2 | THIN_OR_PARTIAL |
| `quest_desertrescue` | 12 | 2 | SCRIPTED |
| `quest_doric` | 2 | 1 | THIN_OR_PARTIAL |
| `quest_dragon` | 11 | 2 | SCRIPTED |
| `quest_druid` | 2 | 2 | THIN_OR_PARTIAL |
| `quest_druidspirit` | 6 | 2 | SCRIPTED |
| `quest_drunkmonk` | 2 | 2 | THIN_OR_PARTIAL |
| `quest_eadgar` | 6 | 4 | SCRIPTED |
| `quest_elemental_workshop` | 7 | 1 | SCRIPTED |
| `quest_elena` | 17 | 1 | SCRIPTED |
| `quest_fever` | 0 | 1 | PACK_OR_LOC_ONLY |
| `quest_fishingcompo` | 3 | 2 | THIN_OR_PARTIAL |
| `quest_fluffs` | 3 | 3 | THIN_OR_PARTIAL |
| `quest_gobdip` | 3 | 1 | THIN_OR_PARTIAL |
| `quest_golem` | 8 | 6 | SCRIPTED |
| `quest_grail` | 10 | 2 | SCRIPTED |
| `quest_grandtree` | 12 | 2 | SCRIPTED |
| `quest_haunted` | 2 | 3 | THIN_OR_PARTIAL |
| `quest_hazeelcult` | 10 | 3 | SCRIPTED |
| `quest_hero` | 12 | 2 | SCRIPTED |
| `quest_hetty` | 2 | 2 | THIN_OR_PARTIAL |
| `quest_horror` | 8 | 3 | SCRIPTED |
| `quest_hunt` | 7 | 2 | SCRIPTED |
| `quest_ikov` | 7 | 2 | SCRIPTED |
| `quest_imp` | 2 | 3 | THIN_OR_PARTIAL |
| `quest_itexam` | 13 | 2 | SCRIPTED |
| `quest_itgronigen` | 9 | 3 | SCRIPTED |
| `quest_itwatchtower` | 13 | 1 | SCRIPTED |
| `quest_junglepotion` | 2 | 2 | THIN_OR_PARTIAL |
| `quest_legends` | 21 | 3 | SCRIPTED |
| `quest_mcannon` | 17 | 3 | SCRIPTED |
| `quest_mm` | 1 | 3 | THIN_OR_PARTIAL |
| `quest_mortton` | 6 | 3 | SCRIPTED |
| `quest_mourning2` | 0 | 1 | PACK_OR_LOC_ONLY |
| `quest_murder` | 17 | 3 | SCRIPTED |
| `quest_priest` | 3 | 2 | THIN_OR_PARTIAL |
| `quest_priestperil` | 6 | 6 | SCRIPTED |
| `quest_prince` | 2 | 2 | THIN_OR_PARTIAL |
| `quest_rd` | 0 | 1 | PACK_OR_LOC_ONLY |
| `quest_regicide` | 4 | 1 | SCRIPTED |
| `quest_romeojuliet` | 2 | 2 | THIN_OR_PARTIAL |
| `quest_routequest` | 5 | 2 | SCRIPTED |
| `quest_runemysteries` | 2 | 4 | THIN_OR_PARTIAL |
| `quest_scorpcatcher` | 2 | 2 | THIN_OR_PARTIAL |
| `quest_seaslug` | 2 | 2 | THIN_OR_PARTIAL |
| `quest_sheep` | 2 | 2 | THIN_OR_PARTIAL |
| `quest_sheepherder` | 8 | 2 | SCRIPTED |
| `quest_squire` | 2 | 2 | THIN_OR_PARTIAL |
| `quest_tbwt` | 8 | 3 | SCRIPTED |
| `quest_totem` | 2 | 2 | THIN_OR_PARTIAL |
| `quest_tree` | 4 | 2 | SCRIPTED |
| `quest_troll` | 7 | 3 | SCRIPTED |
| `quest_troll_love` | 5 | 5 | SCRIPTED |
| `quest_upass` | 22 | 3 | SCRIPTED |
| `quest_vampire` | 3 | 2 | THIN_OR_PARTIAL |
| `quest_viking` | 21 | 4 | SCRIPTED |
| `quest_waterfall` | 9 | 1 | SCRIPTED |
| `quest_zanaris` | 4 | 2 | SCRIPTED |
| `quest_zombiequeen` | 6 | 2 | SCRIPTED |

\*configs = files with extensions loc/npc/obj/varp/varbit/constant/if/inv/param under the tree.

## Summary (VERIFIED)

| Bucket | Count |
|--------|------:|
| PACK_OR_LOC_ONLY | 5 |
| SCRIPTED | 43 |
| THIN_OR_PARTIAL | 26 |
| **Total quest folders** | **74** |

## How to use

- **SCRIPTED** + research PASS → product mid/complete residual

- **THIN_OR_PARTIAL** → often journal+one NPC; check if classic free quest already “done enough”

- **PACK_OR_LOC_ONLY** → greenfield or 289 materialize; readiness docs first

- Cross-check unit docs in `docs/research/INDEX.md` and gap `002-content-inventory.md`
