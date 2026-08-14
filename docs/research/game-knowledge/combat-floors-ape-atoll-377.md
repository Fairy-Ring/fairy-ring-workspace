# Combat floors — Ape Atoll / Crash Island (rev 377)

**Purpose:** setstat / kit for MM **greegree** and **remains** smokes. Do not invent OSRS combat levels.  
**Parent hub:** [`combat-floors-377.md`](combat-floors-377.md) § Monkey Madness remains (do not rewrite that file from this one).  
**Stands:** [`anchors-ape-atoll.md`](anchors-ape-atoll.md) · [`anchors-crash-island.md`](anchors-crash-island.md).

**Tag default**

| Tag | Means |
|-----|--------|
| **VERIFIED** | `vislevel` + ATK/STR/DEF/HP (when present) match **377 unpack** `_unpack/377/all.npc` **and** **289** `quest_mm.npc`; **377 id** from `vendor/content/pack/npc.pack`. Smoke floor **VERIFIED** only if a named smoke used that floor. |
| **CANDIDATE** | Policy analog (Zook / Tyras / hellhound bands). No dedicated remains-kill **quest** mid has landed. |

**Do not:** seed wiki CLs (“level 167 gorilla”, OSRS ninja/zombie CLs). Models/IDs stay **377** (`npc_1441`, `npc_1459`, …) — do not copy 289 `quest_mm_npc_*` names.

## Sources

| What | Path |
|------|------|
| 377 unpack | `vendor/content/scripts/_unpack/377/all.npc` |
| 377 ids | `vendor/content/pack/npc.pack` |
| 289 combat | `docs/superpowers/mm-289-src/scripts/quests/quest_mm/configs/quest_mm.npc` |
| 289 / product hunt | same tree `quest_mm.hunt` · product `vendor/content/scripts/quests/quest_mm/configs/mm.hunt` · `hunt.pack` **77–79** |
| Wave B inject | [`../mm-waveb-config-unit-377.md`](../mm-waveb-config-unit-377.md) |

Unpack key order is `attack` / `defence` / `strength` / `hitpoints`. Tables below are **ATK / STR / DEF / HP** (task order). Parent hub slash groups are **ATK / DEF / STR / HP** — same numbers, different order. Extra skill (`magic=` / `ranged=`) listed beside.

377 unpack after Wave B inject **matches** 289 combat on every remains / fauna / warehouse row below (spot-checked 2026-08-13).

## Smoke floor bands (policy)

From parent hub + live smokes. Setstat written **ATK / STR / DEF / HP**.

| Band | setstat | Kit | Where used |
|------|---------|-----|------------|
| Zooknock tunnel | **90 / 90 / 85 / 99** + pray **43** | **rune** scim + plate + kite + lobster×10; soft `dragonquest 10` for platebody | `quest-mm-smoke.mjs` `ZOOK_TUNNEL_STATS` — **walk** among zombies, not a remains-kill mid |
| Tyras analog | **90 / 90 / 80 / 90** + pray **99** | **rune** (surface) or **d scim + gilded** (parent high-floor) + food | `mm-surface-smoke.mjs` `kitForArcher` |
| Hellhound analog | **80 / 80 / 70 / 85** | **adamant** scim + plate + kite + lobster×20 | parent analog for small zombie; **CANDIDATE** kill |

## Remains (Wave B bones)

Slash ninja / crush gorilla / crush undead zombie. `death_drop` is the remains type.

| Debugname | 377 id | vis | ATK / STR / DEF / HP | Extra | Hunt / drop | Smoke floor | Tag |
|-----------|-------:|----:|----------------------|-------|-------------|-------------|-----|
| `mm_monkey_guard` | **1455** | **149** | **130 / 130 / 130 / 130** | magic **130**; slash; `attackbonus` 50 | **none**; `mm_small_ninja_monkey_bones` | Zook **90/90/85/99** + rune **or** d scim + gilded | stats **VERIFIED**; floor **CANDIDATE** |
| `mm_monkey_archer` | **1456** | **86** | **80 / 80 / 80 / 50** | ranged **110**; crush bow; `attackrange` 10 | `aa_aggressive_ranged` **6**; small-ninja bones | Tyras **90/90/80/90** + rune + **Protect Missiles** (pray **43+**) | stats **VERIFIED**; floor **CANDIDATE** (same combat as posted) |
| `mm_ravine_archer` | **1457** | **86** | same **80 / 80 / 80 / 50** | ranged **110**; `attackrange` **15** | ranged huntrange **15**; same bones | same archer floor; longer range | stats **VERIFIED**; floor **CANDIDATE** |
| `mm_posted_archer` | **1458** | **86** | same **80 / 80 / 80 / 50** | ranged **110**; `attackrange` 6; `moverestrict=nomove` | ranged huntrange **6**; same bones | **90/90/80/90** + rune + Protect Missiles + lobster×20 | stats **VERIFIED**; drop floor **VERIFIED** (`mm-surface-smoke` `SURFACE=drop`, `mmsursqjfdm6`) |
| `mm_padulah` | **1447** | **149** | **130 / 130 / 130 / 130** | magic **130**; slash | `aa_aggressive_melee` **10**; `mm_medium_ninja_monkey_bones` | same as ninja guard | stats **VERIFIED**; floor **CANDIDATE** |
| `mm_uodai` | **1446** | **149** | **130 / 130 / 130 / 130** | magic **130**; slash | **none**; medium-ninja bones | same as ninja guard | stats **VERIFIED**; floor **CANDIDATE** |
| `mm_religious_guard` | **1459** | **167** | **130 / 130 / 200 / 130** | magic **130**; crush; DEF **200** | melee huntrange **5**; `mm_normal_gorilla_monkey_bones` | Zook **90/90/85/99** + **Protect Melee** + d scim + gilded + shark | stats **VERIFIED**; floor **CANDIDATE** |
| `mm_religious_trapdoor_guard` | **1460** | **167** | same **130 / 130 / 200 / 130** | magic **130**; crush | melee huntrange **2**; `mm_bearded_gorilla_monkey_bones` | same gorilla floor | stats **VERIFIED**; floor **CANDIDATE** |
| `mm_zombie_monkey_small` | **1467** | **82** | **100 / 60 / 60 / 60** | magic **60**; crush; `undead` | melee huntrange **2**; `mm_small_zombie_monkey_bones` | hellhound **80/80/70/85** + adamant; tunnel **walk** uses Zook 90s | stats **VERIFIED**; kill **CANDIDATE**; tunnel kit **VERIFIED** walk |
| `mm_zombie_monkey_large` | **1465** | **98** | **150 / 60 / 60 / 60** | magic **60**; crush; undead | melee huntrange **5**; `mm_large_zombie_monkey_bones` | same small-zombie analog (glass ATK) | stats **VERIFIED**; floor **CANDIDATE** |
| `mm_zombie_monkey_large_guard` | **1466** | **129** | **150 / 110 / 90 / 90** | magic **90**; crush; undead | melee huntrange **2**; large-zombie bones | Tyras **90/90/80/90** + gilded | stats **VERIFIED**; floor **CANDIDATE** |

`mm_monkey_guard` / `mm_uodai`: Attack-op shells only — greegree does **not** gate them (no `huntmode` in 289 or 377).

Posted-archer smoke stand: harness **2754,2776** L0 next to m43_43 `0 2 26: 1458` (spawn **2754,2778**). Hunt skip at the same stand: greegree worn, HP 90→90 **PASS** `mmsursqjaj9l` (not a kill).

## Crash Island + Ape jungle fauna

Crash `m45_42` (anchors sample): **1475** bird / **1477** scorpion / **1479** snake. Same fauna also on Ape `m42_42` / `m42_43` (plus **1478** spider; ravine archers **1457** on m42_43). Greegree zone extras include crash `0_41_71` (cutscene square) — fauna combat is still these types.

| Debugname | 377 id | vis | ATK / STR / DEF / HP | Extra | Hunt | Smoke floor | Tag |
|-----------|-------:|----:|----------------------|-------|------|-------------|-----|
| `mm_jungle_bird_green` | **1475** | **11** | **10 / 10 / 10 / 10** | magic **10**; stab; **no** hunt | Attack-op only | none for greegree walk | stats **VERIFIED**; floor **CANDIDATE** if Attack-op |
| `mm_jungle_bird_blue` | **1476** | **5** | **5 / 5 / 5 / 5** | magic **5**; stab; **no** hunt | Attack-op only | none | stats **VERIFIED**; floor **CANDIDATE** |
| `mm_jungle_scorpion` | **1477** | **38** | **50 / 50 / 10 / 15** | magic **10**; stab; `attackbonus`/`strengthbonus` **100**; `poison_severity` **4** | `aa_aggressive_melee` **1** | wear greegree **or** steel **50/50/40/50+**; poison is the threat | stats **VERIFIED**; floor **CANDIDATE** |
| `mm_jungle_spider` | **1478** | **37** | **50 / 30 / 10 / 35** | magic **10**; stab; bonuses **100**; poison **4** | melee huntrange **1** | same as scorpion | stats **VERIFIED**; floor **CANDIDATE** |
| `mm_jungle_snake` | **1479** | **24** | **15 / 25 / 10 / 35** | magic **10**; crush; bonuses **100**; poison **7** | melee huntrange **1** | same; worse poison | stats **VERIFIED**; floor **CANDIDATE** |

Crash / greegree **walk** smokes (`mm-greegree-smoke`, Waydar/Lumdo mids) do **not** need a kill floor if **worn** `mm_greegree` (hunters below). Do not treat that as product-safe until hunt decode is packed **and** running — Wave B hunt skip is a headed smoke, not a hard authenticity proof.

## Warehouse / dungeon (Ape)

Not remains bones, but they hunt `aa_aggressive_melee` (greegree skip) and sit on Ape maps (warehouse spiders **1473** on m43_43).

| Debugname | 377 id | vis | ATK / STR / DEF / HP | Extra | Hunt / drop | Smoke floor | Tag |
|-----------|-------:|----:|----------------------|-------|-------------|-------------|-----|
| `mm_warehouse_spider` | **1473** | **1** | HP **2** only — **no** `attack=` / `strength=` / `defence=` in 377 or 289 | slash; `poison_severity` **7** | melee huntrange **1**; `death_drop=null` | any mid kit; poison **7** | stats **VERIFIED** (HP-only); floor **CANDIDATE** |
| `mm_skeleton` | **1471** | **142** | **180 / 90 / 110 / 110** | magic **110**; slash; `attackrange` 15; undead | melee huntrange **16**; `mm_skeleton_bones` | Zook **90/90/85/99** (glass ATK **180**) | stats **VERIFIED**; floor **CANDIDATE** |

## Not this remains set

| Debugname | 377 id | vis / combat | Why not a remains floor |
|-----------|-------:|--------------|-------------------------|
| `mm_kruk` | **1441** | vis **149**; 130s + magic 130 | Talk-to only (`op1`); **no** `op2=Attack`, **no** hunt, **no** `death_drop` |
| `mm_duke` / `mm_oipuis` / `mm_uyoro` / `mm_ouhai` | **1442–1445** | same 130s (377 = 289) | Attack-op; **no** hunt; **no** `death_drop` — do not treat as remains sources |
| `mm_elder_guard_1` / `_2` | **1461** / **1462** | `vislevel=hide`; **no** ATK/STR/DEF/HP | `huntmode=mm_guard` (pack **79**) — **no** `check_invcat`; blockers, not a combat floor |
| `mm_sleeping_monkey_guard` | **1451** | hide; no combat keys | Talk-to / jail timer |
| transmog `mm_transmogrification_*` | **1480–1492** | vis **1**; no combat | Player greegree appearance only |
| `mm_demon` | **1472** | vis **195**; **170 / 170 / 170 / 170** + magic **170** | **Final battle**, not remains. **No** `[mm_demon]` in 377 `all.npc`; combat is 289 `quest_mm.npc` + product `npc/configs/demons.npc` (keep 289 shape: **no** huntmode). See [`../mystic-gear-combat-params-377.md`](../mystic-gear-combat-params-377.md). Floor **CANDIDATE**. |

## Greegree hunt skip

289 / product `[aa_aggressive_melee]` and `[aa_aggressive_ranged]` (`hunt.pack` **77** / **78**):

```text
check_invcat=worn,mm_greegree,<1
```

Hunt the player **only if** worn `mm_greegree` count is **< 1**. `[mm_guard]` has **no** invcat.

`mm_monkey_guard` and `mm_uodai` have **no** `huntmode` — Attack-op only.

Do not invent a different skip (inv-only, name-equals, OSRS greegree ids).

## Soft / product

| Soft (toys) | Product |
|-------------|---------|
| setstat / give / tele; `setvar dragonquest 10` so rune platebody equips; Protect Missiles/Melee via `if_button` | Combat params on unpack; hunt `check_invcat`; `death_drop` remains |
| `mm-surface-smoke` drop bones | Not a quest remains-kill mid |

Prep policy: [`harness-prep-and-gear.md`](harness-prep-and-gear.md) (Zook **90/90/85/99** + rune; surface drop kit above).
