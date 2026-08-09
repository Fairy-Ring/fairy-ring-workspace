# Fixed corpus inventory — quest playability matrix (377)

**Purpose:** One row per top-level folder under `vendor/content/scripts/quests/` — tree density, complete-const presence, unit research linkage, and **documented** smoke accounts only (no invented PASSes).

**Measured:** 2026-08-07 (this write) · cross-read  
[`inventory-377-quest-trees.md`](inventory-377-quest-trees.md) ·  
[`inventory-377-quest-stages.md`](inventory-377-quest-stages.md) ·  
[`../INDEX.md`](../INDEX.md) ·  
[`../../gap/002-content-inventory.md`](../../gap/002-content-inventory.md)

**Tags:**  
- `rs2_count` / `has_complete_const` → **VERIFIED_DRAFT** (recipe below; main-thread re-measure).  
- `unit_research_doc` → path present in INDEX or corpus (link only).  
- `smoke_known` → **cited from existing docs only**; blank = no documented quest smoke PASS found.  
- Soft prep / dep soft-set is **not** a quest PASS for the dep quest.

**Path root:**  
`$RS2_R377_ROOT/vendor/content/scripts/quests/`

---

## Column definitions

| Column | Meaning |
|--------|---------|
| `folder` | Immediate child of `scripts/quests/` |
| `rs2_count` | Recursive `*.rs2` under that folder (matches tree inventory) |
| `has_complete_const` | **Y** if a top-level quest/miniquest complete constant exists in `scripts/general/configs/quest.constant` **or** in that folder’s `configs/*.constant` (incl. `^ikov_completed_*`); **N** otherwise |
| `unit_research_doc` | Dedicated unit doc(s) from `docs/research/INDEX.md` (relative to `docs/research/`); blank if only corpus inventories |
| `smoke_known` | Documented PASS account(s) + stage gate from research/plans/gap — **blank if none** |
| `notes` | Tree bucket + short playability cue (not a readiness score claim) |

**Tree buckets** (from [`inventory-377-quest-trees.md`](inventory-377-quest-trees.md)):  
`SCRIPTED` | `THIN_OR_PARTIAL` | `PACK_OR_LOC_ONLY`

---

## Matrix (all 74 folders)

| folder | rs2_count | has_complete_const | unit_research_doc | smoke_known | notes |
|--------|----------:|:------------------:|-------------------|-------------|-------|
| `interfaces` | 0 | N | — | | PACK_OR_LOC_ONLY · questscroll IF only; not a quest |
| `miniquest_abyssal` | 4 | Y (`^miniquest_abyssal_complete=4` tree) | [`abyss-runecraft-377-readiness.md`](../abyss-runecraft-377-readiness.md) | | SCRIPTED · Abyss miniquest; enter/RC readiness |
| `quest_100` | 0 | N | [`recipe-for-disaster-fan-in-377.md`](../recipe-for-disaster-fan-in-377.md); [`wave3-stub-quests-377-inventory.md`](../wave3-stub-quests-377-inventory.md) | | PACK_OR_LOC_ONLY · RfD family loc; **defer** product |
| `quest_arena` | 14 | Y (`^arena_complete=14`) | — | | SCRIPTED · Fight Arena |
| `quest_arthur` | 4 | Y (`^arthur_complete=7`) | — | | SCRIPTED · Merlin’s Crystal |
| `quest_ball` | 5 | Y (`^ball_complete=7`) | — | | SCRIPTED · tree `quest_ball` |
| `quest_barcrawl` | 1 | Y (`^barcrawl_complete=2` tree) | — | | THIN_OR_PARTIAL · Alfred Grimhand miniquest |
| `quest_biohazard` | 9 | Y (`^biohazard_complete=16`) | — | | SCRIPTED · Biohazard |
| `quest_blackarmgang` | 3 | Y (`^blackarmgang_complete=4`) | — | | THIN_OR_PARTIAL · Shield of Arrav black arm |
| `quest_blackknight` | 3 | Y (`^blackknight_complete=4`) | — | | THIN_OR_PARTIAL · Black Knights’ Fortress |
| `quest_chompybird` | 11 | Y (`^chompybird_complete=65`) | — | | SCRIPTED · Big Chompy Bird Hunting |
| `quest_cog` | 8 | Y (`^quest_cog_complete=8`) | — | | SCRIPTED · Clock Tower |
| `quest_cook` | 2 | Y (`^cook_complete=2`) | — | | THIN_OR_PARTIAL · Cook’s Assistant |
| `quest_crest` | 8 | Y (`^crest_complete=11`) | — | | SCRIPTED · Family Crest |
| `quest_death` | 10 | Y (`^death_complete=80`) | [`death-plateau-377-readiness.md`](../death-plateau-377-readiness.md) | | SCRIPTED · Death Plateau; soft dep for Eadgar — **no dedicated authentic Death PASS cited** |
| `quest_demon` | 3 | Y (`^demon_complete=30`) | — | | THIN_OR_PARTIAL · Demon Slayer |
| `quest_desertrescue` | 12 | Y (`^desertrescue_complete=30`) | — | | SCRIPTED · The Tourist Trap |
| `quest_doric` | 2 | Y (`^doric_complete=100`) | — | | THIN_OR_PARTIAL · Doric’s Quest |
| `quest_dragon` | 11 | Y (`^dragon_complete=10`) | — | | SCRIPTED · Dragon Slayer |
| `quest_druid` | 2 | Y (`^druid_complete=4`) | — | | THIN_OR_PARTIAL · Druidic Ritual |
| `quest_druidspirit` | 6 | Y (`^druidspirit_complete=110`) | [`myreque-deps-nature-spirit-pip-377.md`](../myreque-deps-nature-spirit-pip-377.md) | | SCRIPTED · Nature Spirit; soft-complete used for Myreque start — **not NS smoke PASS** |
| `quest_drunkmonk` | 2 | Y (`^drunkmonk_complete=80`) | — | | THIN_OR_PARTIAL · Monk’s Friend |
| `quest_eadgar` | 6 | Y (`^eadgar_complete=110`) | [`port-quest-eadgar-274-to-377.md`](../port-quest-eadgar-274-to-377.md); [`eadgar-complete-gate-377.md`](../eadgar-complete-gate-377.md) | **start** `edgsgus7wc` (`eadgar_quest=10`); **mid** `edgsgv7v5x` (`=50`) | SCRIPTED · mid closed; complete **110** residual (drawer/door stubs) |
| `quest_elemental_workshop` | 7 | Y (`^elemental_workshop_complete=20`) | — | | SCRIPTED · Elemental Workshop I |
| `quest_elena` | 17 | Y (`^elena_complete=29`) | — | | SCRIPTED · Plague City |
| `quest_fever` | 0 | N | [`wave3-stub-quests-377-inventory.md`](../wave3-stub-quests-377-inventory.md); [`trouble-brewing-pirate-era-377.md`](../trouble-brewing-pirate-era-377.md) | | PACK_OR_LOC_ONLY · Rum Deal loc stub |
| `quest_fishingcompo` | 3 | Y (`^fishingcompo_complete=5`) | — | | THIN_OR_PARTIAL · Fishing Contest |
| `quest_fluffs` | 3 | Y (`^fluffs_complete=6`) | — | | THIN_OR_PARTIAL · Gertrude’s Cat |
| `quest_gobdip` | 3 | Y (`^gobdip_complete=6`) | — | | THIN_OR_PARTIAL · Goblin Diplomacy |
| `quest_golem` | 8 | Y (`^golem_complete=10`) | — | | SCRIPTED · The Golem |
| `quest_grail` | 10 | Y (`^grail_complete=10`) | — | | SCRIPTED · Holy Grail |
| `quest_grandtree` | 12 | Y (`^grandtree_complete=160`) | [`grand-tree-377-readiness.md`](../grand-tree-377-readiness.md) | | SCRIPTED · complete stage **160 VERIFIED** in unit doc; **no harness account cited here** |
| `quest_haunted` | 2 | Y (`^haunted_complete=3`) | — | | THIN_OR_PARTIAL · The Restless Ghost |
| `quest_hazeelcult` | 10 | Y (`^hazeelcult_complete=9`) | — | | SCRIPTED · Hazeel Cult |
| `quest_hero` | 12 | Y (`^hero_complete=15`) | — | | SCRIPTED · Heroes’ Quest; soft-set dep in Misc audit only |
| `quest_hetty` | 2 | Y (`^hetty_complete=3`) | — | | THIN_OR_PARTIAL · Witch’s Potion |
| `quest_horror` | 8 | Y (`^horror_complete=10`) | [`port-quest-horror-274-to-377.md`](../port-quest-horror-274-to-377.md); [`horror-complete-gate-377.md`](../horror-complete-gate-377.md) | **mid≥2** `hfdsgdg44f` | SCRIPTED · mid closed; complete **10** mother residual |
| `quest_hunt` | 7 | Y (`^hunt_complete=4`) | — | | SCRIPTED · tree `quest_hunt` |
| `quest_ikov` | 7 | Y (`^ikov_completed_armadyl=80` / `_lucien=90`) | — | | SCRIPTED · Temple of Ikov dual complete |
| `quest_imp` | 2 | Y (`^imp_complete=2`) | — | | THIN_OR_PARTIAL · Imp Catcher |
| `quest_itexam` | 13 | Y (`^itexam_complete=9`) | [`varrock-museum-digsite-377.md`](../varrock-museum-digsite-377.md) | | SCRIPTED · The Dig Site; mid classic design in unit doc |
| `quest_itgronigen` | 9 | Y (`^itgronigen_complete=7`) | — | | SCRIPTED · tree `quest_itgronigen` |
| `quest_itwatchtower` | 13 | Y (`^itwatchtower_complete=13`) | — | | SCRIPTED · Watchtower |
| `quest_junglepotion` | 2 | Y (`^junglepotion_complete=12`) | — | | THIN_OR_PARTIAL · Jungle Potion |
| `quest_legends` | 21 | Y (`^legends_complete=75`) | — | | SCRIPTED · Legends’ Quest (large) |
| `quest_mcannon` | 17 | Y (`^mcannon_complete=11`) | — | | SCRIPTED · Dwarf Cannon |
| `quest_mm` | 1 | Y (`^mm_complete=10`) | [`port-quest-mm-289-source-hunt.md`](../port-quest-mm-289-source-hunt.md); [`mm-greegree-377-pack-audit.md`](../mm-greegree-377-pack-audit.md) | **greegree leave-zone only** `mmgsjpjnu0` (not full MM) | THIN_OR_PARTIAL · greegree slice PASS ≠ quest mid |
| `quest_mortton` | 6 | Y (`^mortton_quest_complete=85`) | [`port-quest-mortton-274-to-377.md`](../port-quest-mortton-274-to-377.md); [`mortton-flamtaer-complete-377.md`](../mortton-flamtaer-complete-377.md) | **mid-temple=50 authentic** `mtnsgsppgf` | SCRIPTED · Flamtaer complete **85** residual |
| `quest_mourning2` | 0 | N | [`wave3-stub-quests-377-inventory.md`](../wave3-stub-quests-377-inventory.md) | | PACK_OR_LOC_ONLY · MEP2 loc |
| `quest_murder` | 17 | Y (`^murder_complete=2`) | — | | SCRIPTED · Murder Mystery |
| `quest_priest` | 3 | Y (`^priest_complete=5`) | — | | THIN_OR_PARTIAL · tree `quest_priest` (not `quest_priestperil`) |
| `quest_priestperil` | 6 | Y (`^priestperil_complete=60`) | [`myreque-deps-nature-spirit-pip-377.md`](../myreque-deps-nature-spirit-pip-377.md) | | SCRIPTED · Priest in Peril; soft-complete for Myreque — **no PiP account cited** |
| `quest_prince` | 2 | Y (`^prince_complete=110`) | — | | THIN_OR_PARTIAL · Prince Ali Rescue |
| `quest_rd` | 0 | Y (`^recruitmentdrive_complete=2`) | [`wave3-stub-quests-377-inventory.md`](../wave3-stub-quests-377-inventory.md) | | PACK_OR_LOC_ONLY · Recruitment Drive; const exists, **0 scripts** |
| `quest_regicide` | 4 | Y (`^regicide_complete=15`) | [`port-quest-regicide-274-to-377.md`](../port-quest-regicide-274-to-377.md); [`regicide-idris-spawn-377.md`](../regicide-idris-spawn-377.md); [`regicide-zones-tracker-residual-377.md`](../regicide-zones-tracker-residual-377.md) | **start soft≥2**; **mid≥4** `regsjpucjk` (SOFT scouts/Idris) | SCRIPTED (thin) · Idris/zones residual |
| `quest_romeojuliet` | 2 | Y (`^romeojuliet_complete=100`) | — | | THIN_OR_PARTIAL · Romeo & Juliet |
| `quest_routequest` | 5 | Y (`^routequest_complete=105`) | [`port-quest-routequest-289-to-377.md`](../port-quest-routequest-289-to-377.md); [`myreque-hollows-curpile-hideout-377.md`](../myreque-hollows-curpile-hideout-377.md); [`myreque-swamp-boatjourney-if-377.md`](../myreque-swamp-boatjourney-if-377.md) | **start≥5** (soft NS); **mid≥25** `myrsjqhcvh` | SCRIPTED (thin/mid) · Curpile/hideout missing product |
| `quest_runemysteries` | 2 | Y (`^runemysteries_complete=6`) | — | | THIN_OR_PARTIAL · Rune Mysteries |
| `quest_scorpcatcher` | 2 | Y (`^scorpcatcher_complete=6`) | — | | THIN_OR_PARTIAL · Scorpion Catcher |
| `quest_seaslug` | 2 | Y (`^seaslug_complete=12`) | — | | THIN_OR_PARTIAL · Sea Slug |
| `quest_sheep` | 2 | Y (`^sheep_complete=22`) | — | | THIN_OR_PARTIAL · Sheep Shearer |
| `quest_sheepherder` | 8 | Y (`^sheepherder_complete=3`) | — | | SCRIPTED · Sheep Herder |
| `quest_squire` | 2 | Y (`^squire_complete=7`) | — | | THIN_OR_PARTIAL · The Knight’s Sword |
| `quest_tbwt` | 8 | Y (`^tbwt_complete=6`) | [`port-tbwt-289-to-377.md`](../port-tbwt-289-to-377.md); [`tbwt-complete-gate-377.md`](../tbwt-complete-gate-377.md) | **mid≥6** `tbwsgm9q64` (soft brothers label) | SCRIPTED · complete live-brothers residual |
| `quest_totem` | 2 | Y (`^totem_complete=5`) | — | | THIN_OR_PARTIAL · Tribal Totem |
| `quest_tree` | 4 | Y (`^tree_complete=9`) | [`tree-gnome-village-377-readiness.md`](../tree-gnome-village-377-readiness.md) | | SCRIPTED · Tree Gnome Village; soft OK for spirit trees — **no TGV account cited** |
| `quest_troll` | 7 | Y (`^troll_complete=50` tree) | [`troll-stronghold-377-readiness.md`](../troll-stronghold-377-readiness.md) | | SCRIPTED · soft `troll_quest=50` used for Eadgar — **not Stronghold authentic PASS** |
| `quest_troll_love` | 5 | Y (`^troll_love_complete=45` tree) | — | | SCRIPTED · Troll Romance |
| `quest_upass` | 22 | Y (`^upass_complete=10`) | [`quest-upass-377-readiness.md`](../quest-upass-377-readiness.md) | | SCRIPTED · soft UP for Regicide start only — **no authentic UP smoke account** |
| `quest_vampire` | 3 | Y (`^vampire_complete=3`) | — | | THIN_OR_PARTIAL · Vampyre / Count Draynor |
| `quest_viking` | 21 | Y (`^viking_complete=10`) | [`port-quest-viking-274-to-377.md`](../port-quest-viking-274-to-377.md); [`viking-thorvald-koschei-377.md`](../viking-thorvald-koschei-377.md) | **start** `viksgw24pg`; **mid votes** … **mid37 `viking=6`** `viksj0qb8y`; LIVE Manni `viksixjio0` | SCRIPTED · forms/complete residual (forms=0 soft on mid37) |
| `quest_waterfall` | 9 | Y (`^waterfall_complete=10`) | — | | SCRIPTED · Waterfall Quest |
| `quest_zanaris` | 4 | Y (`^zanaris_complete=6`) | — | | SCRIPTED · Lost City |
| `quest_zombiequeen` | 6 | Y (`^zombiequeen_complete=15`) | — | | SCRIPTED · Shilo Village |

---

## Summary counts (VERIFIED_DRAFT)

| Metric | Count | RECIPE |
|--------|------:|--------|
| Folders in matrix | **74** | `ls -1 vendor/content/scripts/quests \| wc -l` → 74 |
| Sum `rs2_count` | **469** | sum of per-folder recursive `.rs2` (tree inventory column) |
| `has_complete_const` = Y | **70** | matrix Y rows (includes tree-only + ikov dual + rd const) |
| `has_complete_const` = N | **4** | `interfaces`, `quest_100`, `quest_fever`, `quest_mourning2` |
| Folders with ≥1 INDEX unit doc | **21** | non-blank `unit_research_doc` |
| Folders with **documented** quest smoke account | **8** | eadgar, horror, mortton, mm (slice), regicide, routequest, tbwt, viking |

**Bucket cross-note** (from tree inventory, not re-derived): SCRIPTED **43** / THIN **26** / PACK_OR_LOC **5** = **74**.

CLAIM: Matrix has exactly 74 folder rows covering every top-level child of `scripts/quests/`.  
TAG: VERIFIED_DRAFT  
RECIPE: `ls -1 $RS2_R377_ROOT/vendor/content/scripts/quests | wc -l` and compare to matrix row count  
PATH: docs/research/corpus/inventory-377-playability-matrix.md

CLAIM: `rs2_count` column matches [`inventory-377-quest-trees.md`](inventory-377-quest-trees.md) measured recursive `.rs2` counts (re-checked via directory listing 2026-08-07).  
TAG: VERIFIED_DRAFT  
RECIPE: `for d in vendor/content/scripts/quests/*/; do echo -n "$(basename "$d") "; find "$d" -name '*.rs2' | wc -l; done`  
PATH: docs/research/corpus/inventory-377-playability-matrix.md

CLAIM: Only 4 quest folders lack any top-level complete constant in `quest.constant` or their tree: `interfaces`, `quest_100`, `quest_fever`, `quest_mourning2`.  
TAG: VERIFIED_DRAFT  
RECIPE: Cross `rg '^\^[_a-z0-9]+_complete' vendor/content/scripts/general/configs/quest.constant` + `rg '^\^[_a-z0-9]+_complete' vendor/content/scripts/quests --glob '*.constant'` against folder stems; also `^ikov_completed_*` for `quest_ikov`  
PATH: docs/research/corpus/inventory-377-playability-matrix.md

CLAIM: Documented quest-related smoke PASS accounts exist only for eadgar, horror, mortton, regicide, routequest, tbwt, viking, and mm greegree slice — no other matrix folders have accounts in gap/plans/research cites used here.  
TAG: VERIFIED_DRAFT  
RECIPE: `rg -n 'PASS.*(edgsg|hfdsg|mtnsg|regsj|myrsj|tbwsg|viks|mmgs)|mid.*PASS' docs/gap/002-content-inventory.md docs/README.md docs/plans/2026-08-0{5,6,7}*.md docs/research/*` — do not invent blanks  
PATH: docs/research/corpus/inventory-377-playability-matrix.md

CLAIM: Complete-stage values cited in `has_complete_const` match [`inventory-377-quest-stages.md`](inventory-377-quest-stages.md) §2–3.  
TAG: VERIFIED_DRAFT  
RECIPE: `sed -n '1,73p' vendor/content/scripts/general/configs/quest.constant`; `rg -n 'complete' vendor/content/scripts/quests/quest_troll/configs vendor/content/scripts/quests/quest_troll_love/configs vendor/content/scripts/quests/quest_barcrawl/configs vendor/content/scripts/quests/miniquest_abyssal/configs`  
PATH: docs/research/corpus/inventory-377-playability-matrix.md

---

## Smoke citation index (docs only — no new PASSes)

| folder | Account / gate | Source |
|--------|----------------|--------|
| `quest_eadgar` | `edgsgus7wc` start=10; `edgsgv7v5x` mid=50 | `docs/gap/002-content-inventory.md` §5.4 / §12; `docs/README.md` |
| `quest_horror` | `hfdsgdg44f` mid≥2 | gap §12 complete residual table; plan dual e2e |
| `quest_mortton` | `mtnsgsppgf` mid-temple=50 authentic | gap §5.4; `docs/plans/2026-08-05-port-quest-mortton.md` |
| `quest_regicide` | `regsjpucjk` mid≥4 product Iorwerth (soft scouts) | gap §12; `docs/plans/2026-08-07-port-quest-regicide.md` |
| `quest_routequest` | `myrsjqhcvh` mid≥25; start routequest=5 soft NS | gap §12; breadth backlog |
| `quest_tbwt` | `tbwsgm9q64` mid≥6 soft brothers | gap §12; `port-tbwt-289-to-377.md` |
| `quest_viking` | `viksj0qb8y` mid37 viking=6; LIVE Manni `viksixjio0`; ladder `viksgw24pg`… | gap §5.4; `docs/plans/2026-08-06-port-quest-viking.md` |
| `quest_mm` | `mmgsjpjnu0` greegree Hold+leave-zone **only** | gap §12; session dump |

CLAIM: Smoke citation index accounts above appear in cited docs; this matrix does not assert new smoke results.  
TAG: VERIFIED_DRAFT  
RECIPE: `rg -n 'edgsgv7v5x|hfdsgdg44f|mtnsgsppgf|regsjpucjk|myrsjqhcvh|tbwsgm9q64|viksj0qb8y|mmgsjpjnu0' docs/gap/002-content-inventory.md`  
PATH: docs/research/corpus/inventory-377-playability-matrix.md

---

## Playability reading guide

| If you need… | Prefer rows… |
|--------------|--------------|
| Active product residual | Folders with smoke_known + complete residual research (eadgar/horror/mortton/tbwt/viking/regicide/routequest) |
| Soft-dep only (do not claim quest PASS) | `quest_troll`, `quest_death`, `quest_druidspirit`, `quest_priestperil`, `quest_upass` as used by Wave 1 smokes |
| Greenfield / pack-only under quests/ | `quest_100`, `quest_fever`, `quest_mourning2`, `quest_rd` (const only), `quest_mm` thin |
| Classic free quests unsmoked | Most THIN_OR_PARTIAL with complete const but blank smoke_known |

**Related corpus:**  
[`inventory-377-quest-trees.md`](inventory-377-quest-trees.md) ·  
[`inventory-377-quest-stages.md`](inventory-377-quest-stages.md) ·  
[`inventory-289-vs-377-quest-delta.md`](inventory-289-vs-377-quest-delta.md) ·  
[`README.md`](README.md)

---

## How to re-measure (main thread)

```bash
export RS2_R377_ROOT=$RS2_R377_ROOT
Q="$RS2_R377_ROOT/vendor/content/scripts/quests"

# 1) folder count
ls -1 "$Q" | wc -l   # expect 74

# 2) per-folder rs2
for d in "$Q"/*/; do
  printf '%-28s %3d\n' "$(basename "$d")" "$(find "$d" -name '*.rs2' | wc -l | tr -d ' ')"
done | sort

# 3) complete const stems
rg -n '^\^[_a-z0-9]+_complete\s*=' \
  "$RS2_R377_ROOT/vendor/content/scripts/general/configs/quest.constant"
rg -n '^\^[_a-z0-9]+_complete\s*=' \
  "$Q" --glob '*.constant'
rg -n '^\^ikov_completed_' \
  "$RS2_R377_ROOT/vendor/content/scripts/general/configs/quest.constant"

# 4) smoke accounts — re-read gap only; do not invent
rg -n 'edgsg|hfdsg|mtnsg|regsj|myrsj|tbwsg|viks|mmgsj' \
  "$RS2_R377_ROOT/docs/gap/002-content-inventory.md"
```
