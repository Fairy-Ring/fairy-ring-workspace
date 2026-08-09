# Fixed corpus inventory — login + music mapzone hooks (377)

**Purpose:** Measure every `settimer` / `queue` / mapzone-adjacent hook on product `login.rs2`, every **non-music** side-effect in `music/scripts/move.rs2`, and whether those procs exist on the 377 tree. Cross-note 274 music move side-effects that 377 split out of music (or still lacks).

**Status:** Research only — **no product edit**.  
**Measured:** 2026-08-08  
**Tags:** script line inventories = **VERIFIED_DRAFT** until main re-runs recipes.  
**Related unit notes:** [`../regicide-idris-spawn-377.md`](../regicide-idris-spawn-377.md) · [`../mm-greegree-377-pack-audit.md`](../mm-greegree-377-pack-audit.md)

**Paths:**

| Role | Absolute path |
|------|---------------|
| 377 login | `$RS2_R377_ROOT/vendor/content/scripts/login_logout/scripts/login.rs2` |
| 377 music move | `$RS2_R377_ROOT/vendor/content/scripts/music/scripts/move.rs2` |
| 274 music move (RO ref) | `$RS2_LIVE_SERVER_REF/content/scripts/music/scripts/move.rs2` |

---

## 0. Headline (one screen)

| Surface | 377 product today |
|---------|-------------------|
| **login `settimer`** | **4** (stat_regen, stat_boost_restore, health_regen, general_macro_events) |
| **login `queue`** | **2** (macro_event_login, follower_login) |
| **login `[mapzone,…]`** | **0** |
| **login quest-adjacent procs** | `~start_king_messenger_timer`, `~grandtree_spawn_charlie`, `~castlewars_login` — **all defined** |
| **music move non-music side-effects** | **1 only:** `~castlewars_mapzone` on `0_37_48` |
| **`~regicide_spawn_timer_idris` in music** | **absent** (zones bare music) + **proc missing** on product |
| **`greegree` in music move** | **never** (274 or 377) — greegree is timer/zone-check in `mm_greegree.rs2` |
| **274 music side-effects relocated off music on 377** | wilderness → `wilderness_zone_triggers.rs2`; ikov → `ikov_dungeon.rs2` |
| **274 music side-effects still unarmed on 377 enter** | desertheat mapzone enter; swampdecay mapzone enter; upass_trap music arm; Idris |

---

## 1. `login.rs2` — settimer / queue / mapzone

**File:** `vendor/content/scripts/login_logout/scripts/login.rs2` (123 lines; `[login,_]` L1–95 + `[proc,initalltabs]` L98–122).

### 1.1 `settimer` (VERIFIED_DRAFT)

| L | Call | Handler on 377 |
|--:|------|----------------|
| 34 | `settimer(stat_regen, 100)` | `[timer,stat_regen]` → `player/scripts/stat.rs2` |
| 35 | `settimer(stat_boost_restore, 100)` | `[timer,stat_boost_restore]` → `player/scripts/stat.rs2` |
| 37 | `settimer(health_regen, 100)` | `[timer,health_regen]` → `player/scripts/stat.rs2` |
| 39 | `settimer(general_macro_events, 500)` | `[timer,general_macro_events]` → `macro events/scripts/macro_events.rs2` |

**Count:** **4** `settimer` at login. No quest-named timers arm directly here (Regicide messenger arms **inside** `~start_king_messenger_timer`).

```text
CLAIM: login.rs2 has exactly 4 settimer calls (stat_regen, stat_boost_restore, health_regen, general_macro_events)
TAG: VERIFIED_DRAFT
RECIPE: rg -n 'settimer\(' vendor/content/scripts/login_logout/scripts/login.rs2
PATH: docs/research/corpus/inventory-377-login-music-hooks.md §1.1
```

### 1.2 `queue` (VERIFIED_DRAFT)

| L | Call | Handler on 377 |
|--:|------|----------------|
| 48 | `queue(macro_event_login, 0, 0)` | `[queue,macro_event_login]` → `macro events/scripts/macro_events.rs2` |
| 87 | `queue(follower_login, 0, 0)` | `[queue,follower_login]` → `quests/quest_fluffs/scripts/pet.rs2` |

**Count:** **2**.

```text
CLAIM: login.rs2 has exactly 2 queue calls (macro_event_login, follower_login)
TAG: VERIFIED_DRAFT
RECIPE: rg -n 'queue\(' vendor/content/scripts/login_logout/scripts/login.rs2
PATH: docs/research/corpus/inventory-377-login-music-hooks.md §1.2
```

### 1.3 `[mapzone` (VERIFIED_DRAFT)

**None** in `login.rs2`.

```text
CLAIM: login.rs2 has zero [mapzone / mapzoneexit triggers
TAG: VERIFIED_DRAFT
RECIPE: rg -n '\[mapzone' vendor/content/scripts/login_logout/scripts/login.rs2  # expect empty
PATH: docs/research/corpus/inventory-377-login-music-hooks.md §1.3
```

### 1.4 All `~proc` / `@label` call sites on login (inventory)

Order as written in `[login,_]`:

| L | Call | Domain | Definition on 377 product |
|--:|------|--------|---------------------------|
| 13 | `~wilderness_level(coord)` | wilderness | **yes** — `areas/area_wilderness/scripts/wilderness_levels.rs2` |
| 41 | `~check_chest_macro_gas` | macro | **yes** — `macro events/…/macro_event_poisonous_gas.rs2` |
| 50 | `~macro_cube_login` | macro | **yes** — `login_logout/scripts/temp_placeholders.rs2` |
| 52 | `~set_pk_skull_login` | pvp | **yes** — `skill_combat/scripts/pvp/pk_skull.rs2` |
| 54 | `~set_antifire_login` | combat | **yes** — `player/…/anti_fire.rs2` |
| 56 | `~duel_arena_login` | minigame | **yes** — `minigames/game_duelarena/…` |
| 58 | `~gnomeball_login` | minigame | **yes** — `minigames/game_gnomeball/…` |
| 60 | `~trawler_login` | minigame | **yes** — `minigames/game_trawler/…` |
| 63 | `~set_poison_login` | combat | **yes** — `skill_combat/scripts/poison.rs2` |
| 65 | `~update_weight_equipment` | player | **yes** — `player/scripts/equip.rs2` |
| 66 | `~ferment_wines_login` | cooking | **yes** — `skill_cooking/…/wine.rs2` |
| 67 | `~thieving_stall_timers_login` | thieving | **yes** — `skill_thieving/…/stealing.rs2` |
| 68 | `~stat_boost_login` | stats | **yes** — `player/scripts/stat.rs2` |
| 69 | `~sa_login` | combat | **yes** — `skill_combat/…/specwep.rs2` |
| 72 | `~grandtree_spawn_charlie` | **quest** | **yes** — `quests/quest_grandtree/scripts/quest_grandtree.rs2` |
| 75 | `~in_tutorial_island(coord)` | tutorial | **yes** — `tutorial/scripts/util.rs2` |
| 76 | `~update_bas` | appearance | **yes** — `player/scripts/appearance.rs2` |
| 77 | `@start_tutorial` | tutorial | **yes** — `[label,start_tutorial]` `tutorial/scripts/tutorial.rs2` |
| 80 | `~castlewars_login` | **minigame** | **yes** — `minigames/game_castlewars/scripts/castlewars.rs2` |
| 82 | `~start_king_messenger_timer` | **quest Regicide** | **yes** — `quests/quest_regicide/scripts/regicide_kings_messenger.rs2` |
| 84 | `~initalltabs` | login local | **yes** — same file L98 |
| 85 | `~update_all(…)` | appearance | **yes** — `player/scripts/appearance.rs2` (also greegree transmog hook site) |
| 99+ | `~update_weapon_category` / `~update_questlist` | tabs | **yes** — combat / `general/scripts/quests.rs2` |

**Quest-adjacent login hooks (subset):**

| Proc | Exists | Arms what |
|------|--------|-----------|
| `~start_king_messenger_timer` | **yes** | if UP complete & regicide 0 → `settimer(spawn_kings_messenger, 400–1200)` |
| `~grandtree_spawn_charlie` | **yes** | only if in Grand Tree jail inzone |
| `~castlewars_login` | **yes** | re-enter CW game state |
| `~regicide_spawn_timer_idris` | **no** | not on login (274 also arms from **music** only) |

```text
CLAIM: login quest hooks are start_king_messenger_timer + grandtree_spawn_charlie (+ castlewars_login minigame); no Idris on login
TAG: VERIFIED_DRAFT
RECIPE: rg -n 'start_king_messenger|grandtree_spawn|regicide_spawn|castlewars_login' vendor/content/scripts/login_logout/scripts/login.rs2
PATH: docs/research/corpus/inventory-377-login-music-hooks.md §1.4
```

```text
CLAIM: [proc,start_king_messenger_timer] exists and gates on %upass complete & %regicide_quest = 0
TAG: VERIFIED_DRAFT
RECIPE: sed -n '1,4p' vendor/content/scripts/quests/quest_regicide/scripts/regicide_kings_messenger.rs2
PATH: docs/research/corpus/inventory-377-login-music-hooks.md §1.4
```

---

## 2. `music/scripts/move.rs2` — 377 product

### 2.1 Shape (VERIFIED_DRAFT)

| Metric | Value |
|--------|------:|
| File lines | **243** |
| `[mapzone,…]` entries | **~241** (recipe below) |
| `[mapzoneexit,…]` entries | **0** |
| Non-music side-effect lines | **1** (`~castlewars_mapzone`) |
| `settimer` lines | **0** |
| `~regicide_*` / `~mm_*` / greegree | **0** |

```text
CLAIM: 377 music move.rs2 has exactly one non-music proc call: ~castlewars_mapzone
TAG: VERIFIED_DRAFT
RECIPE: rg -n '~[a-zA-Z_]|settimer\(' vendor/content/scripts/music/scripts/move.rs2
# expect only L24: ~castlewars_mapzone
PATH: docs/research/corpus/inventory-377-login-music-hooks.md §2.1
```

```text
CLAIM: 377 music move.rs2 has zero mapzoneexit triggers
TAG: VERIFIED_DRAFT
RECIPE: rg -n '\[mapzoneexit' vendor/content/scripts/music/scripts/move.rs2  # empty
PATH: docs/research/corpus/inventory-377-login-music-hooks.md §2.1
```

### 2.2 Mapzone entries that call non-music procs (complete list on 377)

| Mapzone | Body | Proc exists on 377? |
|---------|------|---------------------|
| `0_37_48` | `~castlewars_mapzone;` then `@music_playbyregion(coord)` | **yes** — `[proc,castlewars_mapzone]` in `minigames/game_castlewars/scripts/castlewars.rs2` L217 |

**That is the entire non-music set on product music move.**

Related Castle Wars triggers **outside** music move (still product):

| Trigger | File | Exists |
|---------|------|--------|
| `[mapzone,0_37_148] ~castlewars_mapzone` | `castlewars.rs2` L241 | **yes** |
| `[mapzoneexit,0_37_48]` / `0_37_148` → `~castlewars_mapzoneexit` | same L243–244 | **yes** |

### 2.3 Bare music on quest-critical zones (VERIFIED_DRAFT)

These mapzones **exist** on 377 music move but are **music-only** (no quest proc):

| Mapzone | 274 music extra (ref) | 377 body |
|---------|----------------------|----------|
| `0_35_49` | `~regicide_spawn_timer_idris` | `@music_playbyregion` only (L10) |
| `0_35_50` | `~regicide_spawn_timer_idris` | music only (L11) |
| `0_36_50` | `~regicide_spawn_timer_idris` | music only (L17) |
| `0_53_52` / `0_53_53` / `0_54_52` / `0_54_53` | `~start_swampdecay_timer` | music only (L220–221, 228–229) |
| `0_49_46`…`0_52_48` desert subset | `~start_desertheat_timer` (+ sometimes `settimer(mercenary_check, 25)`) | music only |

```text
CLAIM: 377 mapzones 0_35_49, 0_35_50, 0_36_50 are music-only (no regicide_spawn)
TAG: VERIFIED_DRAFT
RECIPE: sed -n '10,17p' vendor/content/scripts/music/scripts/move.rs2
PATH: docs/research/corpus/inventory-377-login-music-hooks.md §2.3
```

---

## 3. 274 music move — quest / world side-effects (reference inventory)

**Read-only:** `$RS2_LIVE_SERVER_REF/content/scripts/music/scripts/move.rs2`  
Purpose: list side-effects that **matter for 377 quest/world parity**, not a full wilderness line dump.

### 3.1 Unique non-music call kinds (274 music)

| Kind | Symbol | Role |
|------|--------|------|
| proc | `~regicide_spawn_timer_idris` | Regicide stage 2 Idris arm |
| settimer | `settimer(upass_trap, 1)` | UP spear/spring trap soft check |
| settimer | `settimer(move_ikovtrigger, 1)` | Temple of Ikov bridge trigger |
| settimer | `settimer(mercenary_check, 25)` | Tourist Trap camp (on desert enter) |
| proc | `~wilderness_enter` / `~wilderness_exit` / `~wilderness_underground_enter` | wildy overlay + attack ops |
| proc | `~start_desertheat_timer` | desert heat on enter |
| proc | `~start_swampdecay_timer` | Mort Myre decay on enter |
| *(absent)* | greegree / `mm_*` | **not** in 274 music move either |

### 3.2 Quest / hazard mapzone arms (274) — exact zones

| Mapzone(s) | Call | 377 music? | 377 alternate host? | Proc/timer on 377 product? |
|------------|------|------------|---------------------|----------------------------|
| `0_35_49`, `0_35_50`, `0_36_50` | `~regicide_spawn_timer_idris` | **no** (bare music) | **no** | **MISSING** — no `idris.rs2`, no pack script symbols for spawn/clear |
| *(274 also has mapzoneexit clear in idris unit — not re-listed here; see idris research)* | `~clear_idris_timer` | n/a | **no** | **MISSING** |
| `0_37_151`, `0_38_151` | `settimer(upass_trap, 1)` | **zones absent** from 377 music move | **no** enter arm found | **timer body exists** — `[timer,upass_trap]` in `quest_upass/…/upass_obstacles.rs2` L179; **never armed from mapzone on 377** |
| `0_41_153` | `settimer(move_ikovtrigger, 1)` | zone not dual-hosted in music | **yes** — same arm in `quest_ikov/scripts/ikov_dungeon.rs2` L36–38 | **yes** timer + mapzone co-located with quest |
| `0_49_46`, `0_49_47`, `0_50_46`–`48`, `0_51_46`–`48`, `0_52_46`–`48` | `~start_desertheat_timer` | bare music | **partial** — exits clear in `desert_heat.rs2`; enter only from `shantay_pass.rs2` L110 (not full mapzone grid) | **proc yes**; **music enter arm no** |
| `0_51_47` (+ 274 also `0_50_?` pair with mercenary) | `settimer(mercenary_check, 25)` | bare music | **partial** — timer armed on **camp gate enter** in `quest_desertrescue.rs2` L129, not music | **timer yes** |
| `0_53_52`, `0_53_53`, `0_54_52`, `0_54_53` | `~start_swampdecay_timer` | bare music | **no** call sites of `~start_swampdecay_timer` outside its own file | **proc yes**; **never called** from any 377 mapzone |
| many wildy `0_46_55`… | `~wilderness_enter` / exit | not in music | **yes** — `areas/area_wilderness/scripts/wilderness_zone_triggers.rs2` | **yes** |

```text
CLAIM: 274 music arms ~regicide_spawn_timer_idris on exactly three mapzones 0_35_49/50 and 0_36_50
TAG: VERIFIED_DRAFT
RECIPE: rg -n 'regicide_spawn_timer_idris' $RS2_LIVE_SERVER_REF/content/scripts/music/scripts/move.rs2
PATH: docs/research/corpus/inventory-377-login-music-hooks.md §3.2
```

```text
CLAIM: 377 product has zero matches for regicide_spawn / clear_idris / idris under scripts/
TAG: VERIFIED_DRAFT
RECIPE: rg -n 'regicide_spawn|clear_idris|idris' vendor/content/scripts --glob '*.rs2'
# expect empty
PATH: docs/research/corpus/inventory-377-login-music-hooks.md §3.2
```

```text
CLAIM: ~start_swampdecay_timer is defined on 377 but never called outside swamp_decay.rs2
TAG: VERIFIED_DRAFT
RECIPE: rg -n 'start_swampdecay_timer' vendor/content/scripts --glob '*.rs2'
# expect only [proc,…] definition
PATH: docs/research/corpus/inventory-377-login-music-hooks.md §3.2
```

```text
CLAIM: ~start_desertheat_timer is only invoked from shantay_pass.rs2 on 377 (not music enter)
TAG: VERIFIED_DRAFT
RECIPE: rg -n 'start_desertheat_timer' vendor/content/scripts --glob '*.rs2'
PATH: docs/research/corpus/inventory-377-login-music-hooks.md §3.2
```

---

## 4. Greegree — not a music-mapzone hook

| Question | Answer |
|----------|--------|
| Does 274 music `move.rs2` call greegree? | **No** |
| Does 377 music `move.rs2` call greegree? | **No** |
| How greegree leave-zone works on 377 | `[timer,mm_greegree_timer]` polls `~mm_greegree_zone(coord)`; out-of-zone → `queue(force_unequip_greegree)` |
| Product files | `quests/quest_mm/scripts/mm_greegree.rs2` — procs `mm_greegree_zone`, `mm_greegree_transmogrify`, `mm_wearing_greegree`, `force_unequip_greegree` |
| Equip path | `~update_all` / hold op → transmog + timer arm (not music) |

```text
CLAIM: greegree zone leave is timer-based (mm_greegree_timer), not music mapzone
TAG: VERIFIED_DRAFT
RECIPE: rg -n 'mm_greegree|greegree' vendor/content/scripts/music/scripts/move.rs2  # empty; then sed -n '46,51p' vendor/content/scripts/quests/quest_mm/scripts/mm_greegree.rs2
PATH: docs/research/corpus/inventory-377-login-music-hooks.md §4
```

---

## 5. Proc existence matrix (377 product)

| Symbol | Needed by | On 377 product? | Where / note |
|--------|-----------|-----------------|--------------|
| `settimer` targets from login | login | **yes** | stat / macro timers |
| `queue` targets from login | login | **yes** | macro_event_login, follower_login |
| `start_king_messenger_timer` | login | **yes** | `regicide_kings_messenger.rs2` |
| `grandtree_spawn_charlie` | login | **yes** | `quest_grandtree.rs2` |
| `castlewars_login` | login | **yes** | `castlewars.rs2` |
| `castlewars_mapzone` | music `0_37_48` | **yes** | `castlewars.rs2` L217 |
| `regicide_spawn_timer_idris` | 274 music | **NO** | missing with `idris.rs2` |
| `clear_idris_timer` | 274 idris exits | **NO** | missing |
| `timer spawn_idris` | 274 idris | **NO** | missing (not in script.pack as product source) |
| `timer upass_trap` | 274 music arm | **yes body** | `upass_obstacles.rs2` — **arm missing** from mapzone |
| `timer move_ikovtrigger` | 274 music / 377 ikov | **yes** | armed in `ikov_dungeon.rs2` mapzone |
| `timer mercenary_check` | 274 music / 377 gate | **yes** | armed on camp gate, not music |
| `start_desertheat_timer` | 274 music enter | **yes proc** | enter arm incomplete vs 274 grid |
| `start_swampdecay_timer` | 274 music enter | **yes proc** | **zero call sites** on 377 |
| `wilderness_enter/exit/underground` | 274 music | **yes** | relocated to `wilderness_zone_triggers.rs2` |
| `mm_greegree_zone` / timer | greegree slice | **yes** | not music |

---

## 6. Port / residual bite list (from this inventory only)

| Priority | Gap | Fix surface (when product wants it) |
|----------|-----|-------------------------------------|
| **P0 quest** | Idris stage 2→3 never arms | Port `idris.rs2` + three music mapzone enters (+ exits/clear); see unit research |
| **P1 hazard** | Mort Myre swamp decay never starts on enter | Call `~start_swampdecay_timer` on music (or area) mapzones `0_53_52/53`, `0_54_52/53` |
| **P1 hazard** | Desert heat only from Shantay path | Re-arm `~start_desertheat_timer` on desert mapzone enters (274 list) |
| **P2 UP** | `upass_trap` timer never mapzone-armed | Add music (or upass) mapzone enter for `0_37_151` / `0_38_151` if those zones are in-era on 377 maps |
| **done-ish** | Ikov bridge timer | Already on quest mapzone |
| **done-ish** | Wilderness enter/exit | Split file, not missing |
| **done** | Greegree leave | Not music; product timer path exists |
| **done** | Regicide messenger on login | Product has hook |

---

## 7. Method notes

- Counts are from **source** `.rs2` under `vendor/content` (and RO Server 274), not runtime pack script id dumps, except existence cross-checks against `pack/script.pack` for greegree/timers where noted.
- 377 intentionally **split** some 274 music side-effects into area/quest files (wildy, ikov). Treat “not in music” ≠ “missing” unless no alternate host.
- Castle Wars is the **only** deliberate non-music hook retained **inside** 377 `music/scripts/move.rs2`.

---

## 8. CLAIM board (for verify-queue)

```text
CLAIM: login settimer count = 4; queue count = 2; mapzone count = 0
TAG: VERIFIED_DRAFT
RECIPE: rg -n 'settimer\(|queue\(|\[mapzone' vendor/content/scripts/login_logout/scripts/login.rs2
PATH: docs/research/corpus/inventory-377-login-music-hooks.md

CLAIM: music move non-music side-effects = only ~castlewars_mapzone on 0_37_48
TAG: VERIFIED_DRAFT
RECIPE: rg -n '~|settimer\(' vendor/content/scripts/music/scripts/move.rs2
PATH: docs/research/corpus/inventory-377-login-music-hooks.md

CLAIM: regicide Idris spawn proc + music arms absent on 377; greegree not a music hook
TAG: VERIFIED_DRAFT
RECIPE: rg -n 'regicide_spawn|clear_idris|greegree|mm_greegree' vendor/content/scripts/music/scripts/move.rs2; rg -n '\[proc,regicide_spawn' vendor/content/scripts
PATH: docs/research/corpus/inventory-377-login-music-hooks.md

CLAIM: swampdecay + desertheat enter arms missing from 377 music (procs exist)
TAG: VERIFIED_DRAFT
RECIPE: rg -n 'start_swampdecay_timer|start_desertheat_timer' vendor/content/scripts --glob '*.rs2'
PATH: docs/research/corpus/inventory-377-login-music-hooks.md
```
