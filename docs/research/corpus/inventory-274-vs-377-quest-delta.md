# Fixed corpus — 274 vs 377 quest folder delta

**Purpose:** Folder-level **274 ↔ local 377** delta under `scripts/quests/`, with recursive blob counts on the **forward-port residual** set (Wave 1A shared six + routequest/mm). Complements [inventory-289-vs-377-quest-delta.md](inventory-289-vs-377-quest-delta.md) (289 ladder for post-274 quests).

**Status:** Research only — **no product ports** from this note.  
**Measured:** 2026-08-08  
**Tags:** folder presence + recursive blob counts = **VERIFIED_DRAFT** until main re-runs recipes in [verify-queue.md](verify-queue.md).

---

## Method (VERIFIED_DRAFT)

| Side | How listed |
|------|------------|
| **274** | GitHub Contents/Trees API on `LostCityRS/Content` `ref=274` ≡ `git -C vendor/content ls-tree` (when `origin/274` is fetched) |
| **377** | Local walk `vendor/content/scripts/quests/` (rs2-r377 / workspace tree) |
| **274 tip pin** | `1bee0143a731685b62e16e599cfcd82593c14cfe` (branch tip at measure; tree SHAs below) |
| **Local 377 tip** | See corpus [README.md](README.md) snapshot (content SHA drifts) |

Equivalent local commands (when `origin/274` is on `vendor/content`):

```bash
export RS2_R377_ROOT=$RS2_R377_ROOT
cd "$RS2_R377_ROOT"

# folder names
git -C vendor/content ls-tree -d --name-only origin/274:scripts/quests | sort
ls -1 vendor/content/scripts/quests | sort

# only-on-274 / only-on-377
comm -23 <(git -C vendor/content ls-tree -d --name-only origin/274:scripts/quests | sort) \
         <(ls -1 vendor/content/scripts/quests | sort)
comm -13 <(git -C vendor/content ls-tree -d --name-only origin/274:scripts/quests | sort) \
         <(ls -1 vendor/content/scripts/quests | sort)

# recursive files + .rs2 under one folder
git -C vendor/content ls-tree -r --name-only origin/274:scripts/quests/quest_regicide | wc -l
git -C vendor/content ls-tree -r --name-only origin/274:scripts/quests/quest_regicide | grep -c '\.rs2$'
find vendor/content/scripts/quests/quest_regicide -type f | wc -l
find vendor/content/scripts/quests/quest_regicide -name '*.rs2' | wc -l
```

**Count convention:** **files** = recursive blobs under the folder (configs + scripts + interfaces). **`.rs2`** = script-only.

**Browse 274 tip:** https://github.com/LostCityRS/Content/tree/274/scripts/quests

---

## Headline counts

```text
CLAIM: scripts/quests has 65 folders on 274 tip, 74 on local 377; 0 274-only; 9 377-only; 65 shared names
TAG: VERIFIED_DRAFT
RECIPE: git -C vendor/content ls-tree -d --name-only origin/274:scripts/quests | wc -l  → expect 65; ls -1 vendor/content/scripts/quests | wc -l → expect 74; comm -23 (274 only) empty; comm -13 (377 only) 9 lines
PATH: docs/research/corpus/inventory-274-vs-377-quest-delta.md § Headline
```

| Side | Quest folders under `scripts/quests/` |
|------|--------------------------------------:|
| **274** | **65** (incl. `interfaces`) |
| **377** | **74** (incl. `interfaces`) |
| **Shared names** | **65** |
| **274 only** | **0** |
| **377 only** | **9** |

**Implication vs 289 delta:** 274 is a **subset** of 377 folder names. Residual work on shared names is **thickness / missing scripts**, not “folder absent.” Post-274 quests (`quest_mm`, `quest_routequest`, …) are **377-only** at the folder level and need **289** (or greenfield), not 274.

---

## 1. Folders on 274 not on 377

```text
CLAIM: No scripts/quests/* directory exists on origin/274 that is missing from local 377
TAG: VERIFIED_DRAFT
RECIPE: comm -23 <(git -C vendor/content ls-tree -d --name-only origin/274:scripts/quests | sort) <(ls -1 vendor/content/scripts/quests | sort) → empty
PATH: docs/research/corpus/inventory-274-vs-377-quest-delta.md §1
```

**None.** All 274 quest folders are present by name on local 377.

---

## 2. Folders on 377 not on 274

```text
CLAIM: Nine 377 quest folders are absent on 274 (post-274 / 377-lineage / stubs)
TAG: VERIFIED_DRAFT
RECIPE: comm -13 <(git -C vendor/content ls-tree -d --name-only origin/274:scripts/quests | sort) <(ls -1 vendor/content/scripts/quests | sort) → 9 names below; GitHub Contents ref=274 returns 404 for quest_mm and quest_routequest
PATH: docs/research/corpus/inventory-274-vs-377-quest-delta.md §2
```

| Folder | Label / quest | 377 state (files / `.rs2`) | Why absent on 274 |
|--------|---------------|---------------------------:|-------------------|
| `miniquest_abyssal` | Abyss miniquest | 5 / **4** SCRIPTED | Post-274 surface |
| `quest_100` | Recipe for Disaster family | 1 / **0** PACK_OR_LOC_ONLY | Era **15 Mar 2006** — [recipe-for-disaster-fan-in-377.md](../recipe-for-disaster-fan-in-377.md) |
| `quest_fever` | Cabin Fever / Rum Deal loc gap | 1 / **0** PACK_OR_LOC_ONLY | Loc stub — [wave3-stub-quests-377-inventory.md](../wave3-stub-quests-377-inventory.md) |
| `quest_golem` | The Golem | 14 / **8** SCRIPTED | Post-274 era quest |
| `quest_mm` | Monkey Madness | **4** / **1** THIN | **No 274 tree** (API 404); source = **289** only — [port-quest-mm-289-source-hunt.md](../port-quest-mm-289-source-hunt.md) |
| `quest_mourning2` | Mourning’s End Part II | 1 / **0** PACK_OR_LOC_ONLY | Loc stub |
| `quest_rd` | Recruitment Drive | 1 / **0** PACK_OR_LOC_ONLY | Loc stub |
| `quest_routequest` | In Search of the Myreque | **7** / **5** PARTIAL | **No 274 tree** (API 404); source = **289** — [port-quest-routequest-289-to-377.md](../port-quest-routequest-289-to-377.md) |
| `quest_troll_love` | Troll Romance | 10 / **5** SCRIPTED | Post-274 (not on 274 tip tree) |

**Do not** schedule “port from 274” for any row above. MM / routequest → **289**. Stubs → cache/greenfield.

---

## 3. Focus residuals — file / `.rs2` counts (274 vs 377)

```text
CLAIM: Focus residual thickness table (regicide, eadgar, horror, mortton, viking, tbwt shared; mm/routequest 377-only) measured from 274 recursive trees + local 377 walk
TAG: VERIFIED_DRAFT
RECIPE: for each folder F in focus set: git -C vendor/content ls-tree -r --name-only origin/274:scripts/quests/$F | wc -l and grep -c '\.rs2$'; same with find on local vendor/content/scripts/quests/$F; expect table below. For mm/routequest 274 side: ls-tree fails / empty
PATH: docs/research/corpus/inventory-274-vs-377-quest-delta.md §3
```

| Folder | Quest | 274 files | 274 `.rs2` | 377 files | 377 `.rs2` | Classification | Forward-port residual? |
|--------|-------|----------:|-----------:|----------:|-----------:|----------------|------------------------|
| `quest_regicide` | Regicide | **25** | **17** | **6** | **4** | **377 THIN · 274 FULL** | **YES — primary 274 residual** (Isafdar tree) |
| `quest_routequest` | In Search of the Myreque | **0** (absent) | **0** | **7** | **5** | **377 PARTIAL · not on 274** | **YES — 289 residual** (not 274) |
| `quest_mm` | Monkey Madness | **0** (absent) | **0** | **4** | **1** | **377 STUB · not on 274** | **YES — 289 XL** (not 274) |
| `quest_eadgar` | Eadgar’s Ruse | **13** | **6** | **10** | **6** | **377 scripts match; thinner cfg/IF** | **Residual polish** (drawer/door via troll tree; IF/npc/obj audit) |
| `quest_horror` | Horror from the Deep | **14** | **8** | **11** | **8** | **377 scripts match; thinner cfg** | **Complete residual** (mother combat / stage 10 — not bulk script fill) |
| `quest_mortton` | Shades of Mort’ton | **14** | **6** | **11** | **6** | **377 scripts match; thinner cfg** | **Flamtaer complete residual** (stages 55–85) |
| `quest_viking` | Fremennik Trials | **28** | **20** | **25** | **21** | **Near-parity scripts** (+377 shim/IF) | **Polish / complete** (not bulk 274 fill) |
| `quest_tbwt` | Tai Bwo Wannai Trio | **12** | **8** | **11** | **8** | **Near-parity** (missing bulk `.npc` on 377) | **Live-brothers residual** (not bulk fill) |

### 274 tree SHAs (tip `1bee0143…`)

| Folder | Tree SHA | Files / `.rs2` |
|--------|----------|---------------:|
| `quest_regicide` | `603bb93f6c916bb1323695e03f923c668de1084c` | 25 / 17 |
| `quest_eadgar` | `ade3cac407a52c488ffe80379bb9855f9fab4d54` | 13 / 6 |
| `quest_horror` | `a7f160b3a6b0e5bd3a5ec702b0704a3c5c8117ba` | 14 / 8 |
| `quest_mortton` | `6656a29bc98d196d9a8321bba5eca2c6e629aee3` | 14 / 6 |
| `quest_viking` | `bcb913a5e487db41a03626d4fac444be95a8f07b` | 28 / 20 |
| `quest_tbwt` | `c6ea0d03d38b46729f3f1eeef7c0109be32416e2` | 12 / 8 |

### 377 local layouts (focus)

| Folder | Paths present (local walk) |
|--------|----------------------------|
| `quest_regicide` | `configs/quest_regicide.constant`, `.vars`; scripts: `lord_iorwerth`, `quest_regicide_complete`, `regicide_journal`, `regicide_kings_messenger` only |
| `quest_routequest` | constant + free `quest_routequest_myreque_bits.varp`; 5 scripts (complete, helpers, journal, morton, vanstorm) — **no** hollow / cutscene / myreque body |
| `quest_mm` | `mm.loc`, `mm_greegree.obj`, `mm_greegree.param`, `mm_greegree.rs2` only |
| `quest_eadgar` | 4 configs (no IF / bulk npc·obj); all **6** 274 script basenames |
| `quest_horror` | 3 configs (no loc·npc·obj); all **8** 274 script basenames |
| `quest_mortton` | 5 configs (no npc·obj·varbit); all **6** 274 script basenames |
| `quest_viking` | 2 configs + `combolockdoor.if` + **377-only** `shoestore.if` + **21** `.rs2` incl. `viking_377_shims.rs2` |
| `quest_tbwt` | 3 configs (no bulk `.npc`); all **8** 274 script basenames |

---

## 4. Forward-port residual table (274 ladder + 289 redirects)

```text
CLAIM: Primary 274 residual among focus set is quest_regicide (25→6 files, 17→4 .rs2); eadgar/horror/mortton/viking/tbwt are script-parity or complete-gate polish; mm + routequest are 289-only (absent on 274)
TAG: VERIFIED_DRAFT
RECIPE: Re-measure §3 counts; cross-check missing 274 regicide script basenames via: git -C vendor/content ls-tree -r --name-only origin/274:scripts/quests/quest_regicide | grep '\.rs2$'; vs ls vendor/content/scripts/quests/quest_regicide/scripts/
PATH: docs/research/corpus/inventory-274-vs-377-quest-delta.md §4
```

**This is the fixed-corpus residual list for the 274 ladder.** Product order still follows readiness docs + dep graph; table is **presence/thickness only**.

| Pri | Folder | Quest | 274 → 377 delta | Size tag | Source ladder | Existing unit research |
|----:|--------|-------|-----------------|----------|---------------|------------------------|
| **1** | `quest_regicide` | Regicide | 377 **6**/4 vs 274 **25**/17 | **L–XL residual** | **274** | [`port-quest-regicide-274-to-377.md`](../port-quest-regicide-274-to-377.md) · [`regicide-idris-spawn-377.md`](../regicide-idris-spawn-377.md) · [`regicide-zones-tracker-residual-377.md`](../regicide-zones-tracker-residual-377.md) |
| **2** | `quest_mm` | Monkey Madness | 377 **4**/1 · **0** on 274 | **XL materialize** | **289 only** | [`port-quest-mm-289-source-hunt.md`](../port-quest-mm-289-source-hunt.md) · greegree slice |
| **3** | `quest_routequest` | Myreque I | 377 **7**/5 · **0** on 274 | **M–L residual** | **289 only** | [`port-quest-routequest-289-to-377.md`](../port-quest-routequest-289-to-377.md) · hollows/boat |
| **4** | `quest_eadgar` | Eadgar’s Ruse | scripts **6=6**; missing IF + bulk cfg | **S–M complete residual** | 274 (done scripts) | [`port-quest-eadgar-274-to-377.md`](../port-quest-eadgar-274-to-377.md) · [`eadgar-complete-gate-377.md`](../eadgar-complete-gate-377.md) |
| **5** | `quest_horror` | Horror from the Deep | scripts **8=8** | **S complete residual** | 274 (done scripts) | [`port-quest-horror-274-to-377.md`](../port-quest-horror-274-to-377.md) · [`horror-complete-gate-377.md`](../horror-complete-gate-377.md) |
| **6** | `quest_mortton` | Shades of Mort’ton | scripts **6=6** | **S–M Flamtaer residual** | 274 (done scripts) | [`port-quest-mortton-274-to-377.md`](../port-quest-mortton-274-to-377.md) · [`mortton-flamtaer-complete-377.md`](../mortton-flamtaer-complete-377.md) |
| **7** | `quest_viking` | Fremennik Trials | ~parity scripts (+shim) | **S polish** | 274 (mostly done) | [`port-quest-viking-274-to-377.md`](../port-quest-viking-274-to-377.md) · koschei / peer bank |
| **8** | `quest_tbwt` | Tai Bwo Wannai Trio | scripts **8=8** | **S live-brothers residual** | 274/289 lineage | [`port-tbwt-289-to-377.md`](../port-tbwt-289-to-377.md) · [`tbwt-complete-gate-377.md`](../tbwt-complete-gate-377.md) |

### Regicide 274 scripts still missing on 377 (basename set)

```text
CLAIM: 377 lacks these 274 regicide script basenames: idris, koftik, prif_city_guard, quest_regicide (main), regicide_alchemy, regicide_arandar_gate_guard, regicide_camp_tracker, regicide_darkelf, regicide_fractionalizing_still, regicide_general_hining, regicide_tyras_lazy_guard, regicide_zones, regicidegeneralshopkeeper, tyras_guard
TAG: VERIFIED_DRAFT
RECIPE: git -C vendor/content ls-tree -r --name-only origin/274:scripts/quests/quest_regicide | grep '\.rs2$' | xargs -n1 basename | sort; ls vendor/content/scripts/quests/quest_regicide/scripts | sort; set-diff → 14 missing (377 has quest_regicide_complete instead of quest_regicide.rs2)
PATH: docs/research/corpus/inventory-274-vs-377-quest-delta.md §4 regicide missing
```

| 274 script | Role (short) | On 377? |
|------------|--------------|---------|
| `idris.rs2` | Isafdar scout ambush 2→3 | **No** |
| `regicide_zones.rs2` | woodspring / tripwire / pitfall timers | **No** |
| `regicide_camp_tracker.rs2` | Elf Tracker post-4 | **No** |
| `quest_regicide.rs2` | traps, dense forest, catapult, craft, Arianwyn, complete body | **No** (377 has split `quest_regicide_complete.rs2` only) |
| `regicide_fractionalizing_still.rs2` | still UI / naphtha | **No** |
| `regicide_alchemy.rs2` | Big Book o' Bangs | **No** |
| `tyras_guard.rs2` / `regicide_tyras_lazy_guard.rs2` | camp guards / rabbit | **No** |
| `regicide_darkelf.rs2` | elf warrior AI | **No** |
| `regicide_arandar_gate_guard.rs2` | Arandar gates | **No** |
| `koftik.rs2` | Well of Voyage caveguide | **No** |
| `prif_city_guard.rs2` | Prifddinas gate block | **No** |
| `regicide_general_hining.rs2` / `regicidegeneralshopkeeper.rs2` | Tyras camp NPCs | **No** |
| `lord_iorwerth.rs2` | Lord Iorwerth | **Yes** |
| `regicide_journal.rs2` | journal | **Yes** |
| `regicide_kings_messenger.rs2` | start messenger | **Yes** |

Also missing on 377 tree (configs/IF): `quest_regicide.varp`, `.loc`, `.npc`, `.obj`, `regicide.inv`, `regicide_still.if` — prefer **pack authority** over blind bulk copy; script residual is the product bite.

### Outside-tree 274 hooks (regicide — do not forget)

| Path (274) | Role |
|------------|------|
| `areas/area_ardougne_east/scripts/king_lathas.rs2` | start / complete hand-in |
| `login_logout/login.rs2` | messenger timer |
| `music/scripts/move.rs2` | Idris spawn timer on Isafdar music zones |
| `skill_smithing/.../smelting.rs2` | `regicide_heat_quicklime` |
| `skill_crafting/.../stringing.rs2` | barrel lid |
| `quest_biohazard/scripts/chemist.rs2` | naphtha / chemist chat |

---

## 5. Full 274 folder set (alphabetical, VERIFIED_DRAFT)

`interfaces`, `quest_arena`, `quest_arthur`, `quest_ball`, `quest_barcrawl`, `quest_biohazard`, `quest_blackarmgang`, `quest_blackknight`, `quest_chompybird`, `quest_cog`, `quest_cook`, `quest_crest`, `quest_death`, `quest_demon`, `quest_desertrescue`, `quest_doric`, `quest_dragon`, `quest_druid`, `quest_druidspirit`, `quest_drunkmonk`, `quest_eadgar`, `quest_elemental_workshop`, `quest_elena`, `quest_fishingcompo`, `quest_fluffs`, `quest_gobdip`, `quest_grail`, `quest_grandtree`, `quest_haunted`, `quest_hazeelcult`, `quest_hero`, `quest_hetty`, `quest_horror`, `quest_hunt`, `quest_ikov`, `quest_imp`, `quest_itexam`, `quest_itgronigen`, `quest_itwatchtower`, `quest_junglepotion`, `quest_legends`, `quest_mcannon`, `quest_mortton`, `quest_murder`, `quest_priest`, `quest_priestperil`, `quest_prince`, `quest_regicide`, `quest_romeojuliet`, `quest_runemysteries`, `quest_scorpcatcher`, `quest_seaslug`, `quest_sheep`, `quest_sheepherder`, `quest_squire`, `quest_tbwt`, `quest_totem`, `quest_tree`, `quest_troll`, `quest_upass`, `quest_vampire`, `quest_viking`, `quest_waterfall`, `quest_zanaris`, `quest_zombiequeen`.

**Count:** 65.

```text
CLAIM: Full 274 scripts/quests folder list is exactly the 65 names in §5 (no quest_mm, quest_routequest, quest_misc, …)
TAG: VERIFIED_DRAFT
RECIPE: git -C vendor/content ls-tree -d --name-only origin/274:scripts/quests | sort | diff -u - docs/research/corpus/inventory-274-vs-377-quest-delta.md §5 list (or comm against pasted list)
PATH: docs/research/corpus/inventory-274-vs-377-quest-delta.md §5
```

---

## 6. Full 377 folder set (alphabetical)

All 274 names, **plus** the nine in §2.

**Count:** 74. Per-folder `.rs2` buckets: [inventory-377-quest-trees.md](inventory-377-quest-trees.md).

---

## 7. How to use (product turn)

1. **Bulk residual from 274:** only rows where 377 is **THIN** vs 274 — today that is **`quest_regicide`** among the focus set.  
2. **Do not** hunt 274 for `quest_mm` or `quest_routequest` — folders **absent** (404); use **289** inventory.  
3. **Eadgar / Horror / Mort’ton / Viking / TBWT:** scripts largely already ported; product work is **complete gates**, harness hosts, and outside-tree merges — not re-copy of whole trees.  
4. Prefer residual unit docs (Idris, zones, hollows, Flamtaer) over blind full-tree overwrite.  
5. Re-verify after `git fetch origin 274` if tip drifts past `1bee0143…`.

---

## Cross-links

| Doc | Role |
|-----|------|
| [inventory-289-vs-377-quest-delta.md](inventory-289-vs-377-quest-delta.md) | 289 ladder (misc, MM, routequest) |
| [inventory-377-quest-trees.md](inventory-377-quest-trees.md) | 377-only thickness buckets |
| [verification-rubric.md](verification-rubric.md) | VERIFIED / CANDIDATE / SOFT |
| [verify-queue.md](verify-queue.md) | Main-thread re-measure recipes |
| [../INDEX.md](../INDEX.md) | Research hub |

**No product ports performed for this inventory.**
