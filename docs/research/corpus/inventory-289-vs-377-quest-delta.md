# Fixed corpus — 289 vs 377 quest folder delta

**Purpose:** Forward-port **candidate list** for the verified r377 corpus: which `scripts/quests/` trees exist only on LostCityRS Content **`origin/289`**, only on local **377**, or are shared but **obviously thinner** on 377.

**Status:** Research only — **no product ports** from this note.  
**Measured:** 2026-08-08  
**Tags:** folder presence + recursive blob counts = **VERIFIED** (GitHub Contents/Trees API ≡ `git ls-tree`; local walk of `vendor/content/scripts/quests/`).

---

## Method (VERIFIED)

| Side | How listed |
|------|------------|
| **289** | `GET …/repos/LostCityRS/Content/contents/scripts/quests?ref=289` (dir names) + recursive `git/trees/{sha}?recursive=1` for count samples |
| **377** | Local tree `vendor/content/scripts/quests/` (rs2-r377 / 377-wip lineage) + [inventory-377-quest-trees.md](inventory-377-quest-trees.md) `.rs2` buckets |
| **Tip pin (289)** | Vendor packed-refs / prior unit audits: `b6e11d98c1542221286af3ceb63c635b6469ba0e` · browse https://github.com/LostCityRS/Content/tree/289/scripts/quests |
| **Local 377 tip** | See corpus [README.md](README.md) snapshot (content SHA drifts) |

Equivalent local commands (when `origin/289` is fetched on `vendor/content`):

```bash
git -C vendor/content ls-tree -d --name-only origin/289:scripts/quests | sort
ls -1 vendor/content/scripts/quests | sort
comm -23 <(git -C vendor/content ls-tree -d --name-only origin/289:scripts/quests | sort) \
         <(ls -1 vendor/content/scripts/quests | sort)
comm -13 <(git -C vendor/content ls-tree -d --name-only origin/289:scripts/quests | sort) \
         <(ls -1 vendor/content/scripts/quests | sort)
```

**Count convention:** **files** = recursive blobs under the folder (configs + scripts + interfaces). **`.rs2`** = script-only when cited from the 377 inventory.

---

## Headline counts

| Side | Quest folders under `scripts/quests/` |
|------|--------------------------------------:|
| **289** | **69** (incl. `interfaces`) |
| **377** | **74** (incl. `interfaces`) |
| **Shared names** | **68** |
| **289 only** | **1** |
| **377 only** | **6** |

---

## 1. Folders on 289 not on 377 (**VERIFIED**)

| Folder | Quest | 289 files | Notes |
|--------|-------|----------:|-------|
| `quest_misc` | **Throne of Miscellania** | **13** (3 cfg + 10 `.rs2`) | **Only** 289-only quest tree. Full script pack-ready on 377 (varps/varbits/NPCs/questlist already named). Unit audit: [`port-quest-misc-289-to-377.md`](../port-quest-misc-289-to-377.md). Coupled follow-on **outside** this path: `game_managing_miscellania` (minigames). |

**Tree SHA (289 tip):** `5b0b862a2ee236b75d6cf652aef6e3e17bc58c40`  
**Browse:** https://github.com/LostCityRS/Content/tree/289/scripts/quests/quest_misc

---

## 2. Folders on 377 not on 289 (**VERIFIED**)

These are **not** “289 fill” candidates. Source is cache/pack + later LC trees (274/greenfield) or era content after 289.

| Folder | Label / quest | 377 state | Why absent on 289 |
|--------|---------------|-----------|-------------------|
| `miniquest_abyssal` | Abyss miniquest | 4 `.rs2` SCRIPTED | Post-289 / 377-lineage surface |
| `quest_100` | Recipe for Disaster family | **0** `.rs2` PACK_OR_LOC_ONLY (`100.loc`) | Era **15 Mar 2006**; greenfield — [recipe-for-disaster-fan-in-377.md](../recipe-for-disaster-fan-in-377.md) |
| `quest_fever` | Cabin Fever locs (gap label Rum Deal) | **0** `.rs2` PACK_OR_LOC_ONLY | Loc stub only on 377; **0** on 289 — [wave3-stub-quests-377-inventory.md](../wave3-stub-quests-377-inventory.md) |
| `quest_golem` | The Golem | 8 `.rs2` SCRIPTED | Post-289 era quest; **not** on 289 tree |
| `quest_mourning2` | Mourning’s End Part II | **0** `.rs2` PACK_OR_LOC_ONLY | Loc stub; **0** on 289 |
| `quest_rd` | **Recruitment Drive** (not RfD) | **0** `.rs2` PACK_OR_LOC_ONLY | Loc stub; **0** on 289 — flesh from cache, not 289 |

**Do not** schedule “port from 289” for the six rows above.

---

## 3. Shared names — 377 THIN / stub vs 289 FULL (obvious file-count deltas)

Only rows where the delta is **obvious from counts** (stub / partial vs full 289 tree). Classic free quests with ~2–3 `.rs2` on **both** sides are **not** listed as port candidates (similar thinness).

| Folder | Quest | 377 files (local) | 377 `.rs2` | 289 files | 289 `.rs2` | Classification | Port candidate? |
|--------|-------|------------------:|-----------:|----------:|-----------:|----------------|-----------------|
| `quest_mm` | Monkey Madness | **4** (3 cfg + 1 script) | **1** | **47** | **37** | **377 THIN / stub · 289 FULL** | **YES — XL** primary materialize |
| `quest_regicide` | Regicide | **6** (2 cfg + 4 scripts) | **4** | **24** (7 cfg + 1 IF + 16 scripts) | **16** | **377 THIN · 289 FULL** | **YES — residual fill** (also 274 ladder; see regicide research) |
| `quest_routequest` | In Search of the Myreque | **7** (2 cfg + 5 scripts) | **5** | **12** (4 cfg + 8 scripts) | **8** | **377 PARTIAL · 289 fuller** | **YES — residual** (missing e.g. `routequest_hollow`, `route_cutscene`, `routequest_myreque`, npc cfg) |
| `quest_tbwt` | Tai Bwo Wannai Trio | ~11 (3 cfg + 8 scripts) | **8** | **12** (4 cfg + 8 scripts) | **8** | **Comparable** (already ported lineage) | Residual polish only, not bulk port |
| `quest_totem` | Tribal Totem | ~4 (2 cfg + 2 scripts) | **2** | **7** (4 cfg + 1 IF + 2 scripts) | **2** | **377 thinner configs/IF** | Minor IF/config fill if era-needed |
| most free classics (`quest_cook`, `quest_hetty`, …) | — | low | 2–3 | low | 2–3 | **Both thin** (normal classic shape) | **No** bulk 289 port |

### Sampled 289 tree SHAs (tip of branch `289`)

| Folder | Tree SHA | Files |
|--------|----------|------:|
| `quest_mm` | `8bd1592d79a5f4c3018ec3a06d4d9c2067868493` | 47 |
| `quest_misc` | `5b0b862a2ee236b75d6cf652aef6e3e17bc58c40` | 13 |
| `quest_routequest` | `1f47c0837feaa7fde9bc6bc08518c7657b19915e` | 12 |
| `quest_regicide` | `f0c1c9b669ace3f678da34c9b590686d3f27e5ed` | 24 |
| `quest_tbwt` | `c8cf3d8c86a3d8d185982c6bcaba2b96e98fd7b7` | 12 |

### 377 local layout (stub / partial examples)

| Folder | Paths present (VERIFIED walk) |
|--------|-------------------------------|
| `quest_mm` | `configs/mm.loc`, `mm_greegree.obj`, `mm_greegree.param`; `scripts/mm_greegree.rs2` only |
| `quest_regicide` | `configs/quest_regicide.constant`, `.vars`; 4 scripts (`lord_iorwerth`, complete, journal, kings_messenger) — **no** `idris`, zones, still IF, darkelf, … |
| `quest_routequest` | constant + free varp; 5 scripts (complete, helpers, journal, morton, vanstorm) — **no** hollow / cutscene / myreque body |

---

## 4. Forward-port candidate table (289 → 377)

**This is the fixed-corpus candidate list.** Product order still follows readiness docs + dep graph; this table is **presence/thickness only**.

| Pri | Folder | Quest | 289 → 377 delta | Size tag | Existing unit research |
|----:|--------|-------|-----------------|----------|------------------------|
| **1** | `quest_misc` | Throne of Miscellania | **ABSENT** on 377 · 289 **13** full | **L** | [`port-quest-misc-289-to-377.md`](../port-quest-misc-289-to-377.md) · readiness **7/10** |
| **2** | `quest_mm` | Monkey Madness | 377 **4** vs 289 **47** | **XL** | [`port-quest-mm-289-source-hunt.md`](../port-quest-mm-289-source-hunt.md) · greegree slice only |
| **3** | `quest_routequest` | In Search of the Myreque | 377 **7** partial vs 289 **12** | **M–L** residual | [`port-quest-routequest-289-to-377.md`](../port-quest-routequest-289-to-377.md) · hollows/boat docs |
| **4** | `quest_regicide` | Regicide | 377 **6** thin vs 289 **24** | **L–XL** residual | Prefer 274 ladder when better; 289 still source for missing scripts ([`regicide-idris-spawn-377.md`](../regicide-idris-spawn-377.md), zones residual) |
| **5** | `quest_totem` | Tribal Totem | IF + extra cfg on 289 | **S** | Optional config/IF reconcile |
| — | Wave 3 stubs `quest_rd` / `fever` / `mourning2` / `quest_100` | RD / CF / MEP2 / RfD | **0 on 289** | L–XL greenfield | **Not** 289 ports — [wave3-stub-quests-377-inventory.md](../wave3-stub-quests-377-inventory.md) |
| — | `quest_golem` | The Golem | 377-only scripted | — | Already on 377; not a 289 candidate |
| — | Classic free quests shared | various | Similar thinness | — | **Out of bulk port queue** |

### Coupled 289 surfaces (not under `scripts/quests/` but travel/kingdom)

| Path (289) | Role | With which quest? |
|------------|------|-------------------|
| `scripts/interfaces/misc_shipjourney.if` | Rellekka ↔ island | `quest_misc` |
| `scripts/minigames/game_managing_miscellania/` | Managing Miscellania | **Follow-on** after Throne complete |
| Swamp boat IF / models | Myreque travel | `quest_routequest` — see boatjourney research (377 may already have IFs as `inter_*`) |

---

## 5. Full 289 folder set (alphabetical, VERIFIED)

`interfaces`, `quest_arena`, `quest_arthur`, `quest_ball`, `quest_barcrawl`, `quest_biohazard`, `quest_blackarmgang`, `quest_blackknight`, `quest_chompybird`, `quest_cog`, `quest_cook`, `quest_crest`, `quest_death`, `quest_demon`, `quest_desertrescue`, `quest_doric`, `quest_dragon`, `quest_druid`, `quest_druidspirit`, `quest_drunkmonk`, `quest_eadgar`, `quest_elemental_workshop`, `quest_elena`, `quest_fishingcompo`, `quest_fluffs`, `quest_gobdip`, `quest_grail`, `quest_grandtree`, `quest_haunted`, `quest_hazeelcult`, `quest_hero`, `quest_hetty`, `quest_horror`, `quest_hunt`, `quest_ikov`, `quest_imp`, `quest_itexam`, `quest_itgronigen`, `quest_itwatchtower`, `quest_junglepotion`, `quest_legends`, `quest_mcannon`, **`quest_misc`**, `quest_mm`, `quest_mortton`, `quest_murder`, `quest_priest`, `quest_priestperil`, `quest_prince`, `quest_regicide`, `quest_romeojuliet`, `quest_routequest`, `quest_runemysteries`, `quest_scorpcatcher`, `quest_seaslug`, `quest_sheep`, `quest_sheepherder`, `quest_squire`, `quest_tbwt`, `quest_totem`, `quest_tree`, `quest_troll`, `quest_troll_love`, `quest_upass`, `quest_vampire`, `quest_viking`, `quest_waterfall`, `quest_zanaris`, `quest_zombiequeen`.

**Count:** 69.

---

## 6. Full 377 folder set (alphabetical, VERIFIED)

All 289 names **except** `quest_misc`, **plus**:

`miniquest_abyssal`, `quest_100`, `quest_fever`, `quest_golem`, `quest_mourning2`, `quest_rd`.

**Count:** 74. Per-folder `.rs2` buckets: [inventory-377-quest-trees.md](inventory-377-quest-trees.md).

---

## 7. How to use (product turn)

1. **Materialize / bulk port from 289:** only rows in §4 with **YES** and an existing unit doc.  
2. **Do not** invent scripts for Wave 3 stubs from 289 — folders are **absent** there.  
3. **Regicide / Myreque residuals:** prefer already-open residual docs (Idris, hollows, boat IF) over blind full-tree overwrite.  
4. **MM:** greegree slice is partial; full 289 tree is the only LC script source (274 has **no** `quest_mm`).  
5. Re-verify with `git ls-tree` after any `git fetch origin 289` if tip SHA drifts past `b6e11d98…`.

---

## Cross-links

| Doc | Role |
|-----|------|
| [inventory-377-quest-trees.md](inventory-377-quest-trees.md) | 377-only thickness buckets |
| [verification-rubric.md](verification-rubric.md) | VERIFIED / CANDIDATE / SOFT |
| [wave3-stub-quests-377-inventory.md](../wave3-stub-quests-377-inventory.md) | 377-only stubs ≠ 289 |
| [port-quest-misc-and-myreque-289-source.md](../port-quest-misc-and-myreque-289-source.md) | Wave 1B dual hunt |
| [port-quest-mm-289-source-hunt.md](../port-quest-mm-289-source-hunt.md) | MM 47-file tree |
| [../INDEX.md](../INDEX.md) | Research hub |

**No product ports performed for this inventory.**
