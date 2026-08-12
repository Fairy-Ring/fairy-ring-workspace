# Combat floors (rev 377 smokes)

Sources: content `_unpack/377` `vislevel` / npc configs; smoke comments; period media when cited.

| NPC / encounter | vislevel / notes | Smoke floor (setstat) | Recommended gear tier |
|-----------------|------------------|----------------------|------------------------|
| Loar shade/shadow (Mort’ton) | vislevel **40**; HP **38** ATK **45** STR **30** DEF **26** (crush); multi-aggro | ATK/STR **70** DEF **60** HP **80** | **adamant** full + kite + food×20 (steel@60 + thin food stalls residual hunt) |
| Jogre (TBWT journal) | ~48 | ATK/STR 50 | steel+ |
| Jr dagannoth / Horror mid | lighthouse | ATK 60 STR 60 DEF 50 HP 70 | steel+ / ranged 50 |
| **The Draugen** (Fremennik) | **vislevel 69**; HP/ATK/STR/DEF **60**; melee def **100** | ATK/STR 60 DEF 50 HP 50+ | **adamant** host kit (steel timeouts mid32) |
| Koschei forms 1–4 | HP 30/50/70/**255**; ATK 20/40/60/**255** (274) | ATK/STR 70 DEF 60 HP 70 unarmed (or staff in-pen) | **none** at entry — see Dramen note |
| Mother (Horror complete) | later | TBD | TBD |
| **Skeleton Hellhound** (Myreque ambush) | **vislevel 97**; 289 combat ATK **70** STR **110** DEF **100** HP **55** (crush) | ATK/STR **80** DEF **70** HP **85** | **adamant** scim + plate + legs + kite + lobster×20 |
| **Tyras guard** (Regicide old camp) | **vislevel 110**; HP/ATK/STR/DEF inject **110/85/95/100** | ATK/STR **90** DEF **80** HP **90** | **dragon scim + gilded full** + shark (soft MM+DS for equip) |
| **MM ninja guard** (`mm_monkey_guard`) | **vislevel 149**; ATK/DEF/STR/HP/magic **130** (slash) | rec. analog ATK/STR **90** DEF **85** HP **99** | **rune** (Zooknock tunnel) or **d scim + gilded** — see § MM remains |
| **MM archer** (`mm_monkey_archer` / ravine / posted) | **vislevel 86**; ATK/DEF/STR **80** HP **50** ranged **110** | rec. analog DEF **80+** HP **85**; Protect Missiles if pray **43** | rune/gilded tank; do **not** invent wiki CLs |
| **Padulah / Uodai** | **vislevel 149**; ATK/DEF/STR/HP/magic **130** (slash) | same as ninja guard | same as ninja guard |
| **Religious gorilla** (`mm_religious_guard` + trapdoor) | **vislevel 167**; ATK/STR/HP **130** DEF **200** magic **130** (crush) | rec. analog ATK/STR **90** DEF **85** HP **99** + Protect Melee | **d scim + gilded** + shark (Tyras kit; DEF **200**) |
| **Zombie monkey small** | **vislevel 82**; ATK **100** DEF/STR/HP **60** | rec. analog ATK/STR **80** DEF **70** HP **85** | **adamant**+ (hellhound band) |
| **Zombie monkey large** | **vislevel 98**; ATK **150** DEF/STR/HP **60** | same small-zombie analog | glass ATK; low DEF |
| **Zombie large guard** | **vislevel 129**; ATK **150** DEF **90** STR **110** HP **90** | rec. analog ATK/STR **90** DEF **80** HP **90** | Tyras-band kit |

### Draugen

- **Bug (mid23):** 377 unpack `[viking_draugen]` was **visual-only** (`vislevel=69`, no hitpoints/attack) → one-hit “no stats”. Fixed by porting combat from LC Content 274 `quest_viking/configs/viking.npc` into `_unpack/377/all.npc`.  
- Stats: hitpoints/attack/strength/defence **60**; high mage/range defence 500; stab/slash/crush def 100; crush style.  
- **`npc_forcemulti=^true`** (274): multi-style combat outside multiway maps. Param + `player_in_combat_check` / `npc_check_notcombat` gates ported 2026-08-06 (was skipped “param not in 377”).  
- Hunt: Hunters' talisman → butterfly → spawn → kill → charged talisman → Sigli.  
- Smoke: equip **steel** min before hunt; log inv+worn after equip.  
- **Still open:** mid26 butterfly cheb=0 without spawn — separate from forcemulti (talisman opheld / hunt).

### Koschei (Thorvald vote 5)

- Content: ladder `oploc2,viking_warrior_ladder` → pen `2_41_157_*`; forms `viking_enemy1`→`4` (combat from 274; was also visual-only in unpack).  
- **Spawn delay is authentic:** `longqueue(spawn_viking_enemy, ~random_range(20, 70), …)` after climb — ~6–21s at 300ms ticks; can feel longer under lag. Smoke must **wait**, not fail-fast. Re-enter/requeue only as last resort after ≥60s.  
- **Gear:** steel is **Sigli/Draugen only**. Peer bank must leave `worn=[]` before pen; smoke fails hard if steel remains. Optional `VIKING_KOSCHEI_DRAMEN=1`: branch+knife only (Crafting ≥31 to carve staff in pen).  
- **Random events:** pen is a **shared map**, not an instance — stock `macro_event_area` **allows** general randoms here (same as 274). Fail-teleport can yank the player out. Product must not invent a ban without period proof; see `docs/research/macro-events-instances-and-koschei-pen.md`. Harness may soft re-enter after tele.  
- Gate: `can_enter_thorvald_trial` (`viking_thorvald.rs2`) — weapon/armour **categories** in **inv or worn** block. Food OK.  
- **Peer deposit is gated on `thorvald_started`.** Harness must **accept Thorvald first**, then Peer “Ask about depositing your equipment” → “Bank your equipment”. Banking *before* accept skips deposit (no menu option).  
- mid23 FAIL `vikshe4t11`: bank skipped → steel worn → silent ladder deny → `forms=0` surface. mid24: order fix + combat pack.

#### Only “gear” allowed in: Dramen branch + knife (fletch staff **inside**)

Thorvald: *“any armour or weaponry of any kind.”* The gate is category-based, not name-based:

| Item | Allowed into pen? | Why |
|------|-------------------|-----|
| `dramen_branch` | **yes** | no weapon/armour category |
| `knife` (fletching knife) | **yes** | no weapon cat (not `weapon_thrown`) |
| `dramen_staff` | **no at entry** | `category=weapon_staff` → blocked by `inv_totalcat(…, weapon_staff)` |
| `bronze_knife` / metal knives | **no** | `weapon_thrown` |
| logs / unstrung bows / runes | **no** | explicit bans in same proc |

**Authentic workaround:** bank all combat gear → enter with **Dramen branch + knife (+ food)** → fletch staff **after** ladder (opheldu knife on branch) → wield → fight Koschei with a staff.  
You cannot pre-fletch and walk in with the staff already made.

Smoke default (mid24+): pure unarmed + food after Peer bank — no Dramen. Optional later: `VIKING_KOSCHEI_DRAMEN=1` give branch+knife post-bank, fletch in pen, equip staff.

### Monkey Madness remains (Ape Atoll)

**Do not invent OSRS combat levels.** `vislevel` and ATK/DEF/STR/HP below are **289 `quest_mm.npc` combat** injected onto **377 unpack** (models/IDs stay 377). No wiki CL column.

| Source | Path |
|--------|------|
| **289 combat** | `docs/superpowers/mm-289-src/scripts/quests/quest_mm/configs/quest_mm.npc` |
| **289 hunt** | same tree `quest_mm.hunt` (`aa_aggressive_melee` / `aa_aggressive_ranged`) |
| **377 after inject** | `vendor/content/scripts/_unpack/377/all.npc` (`[mm_monkey_guard]` … `[mm_zombie_monkey_small]`) |
| **377 hunt types** | `vendor/content/scripts/quests/quest_mm/configs/mm.hunt` (289 text); `hunt.pack` **77–79** |

Slash groups are **ATK / DEF / STR / HP** (config key order). Extra skill on the same block when present.

| Debugname | vislevel (377 = 289) | Combat (377 = 289) | 289 hunt | Style / drop |
|-----------|---------------------:|--------------------|----------|--------------|
| `mm_monkey_guard` | **149** | **130 / 130 / 130 / 130** + magic **130** | **none** (289 and 377) | slash; `mm_small_ninja_monkey_bones` |
| `mm_monkey_archer` | **86** | **80 / 80 / 80 / 50** + ranged **110** | `aa_aggressive_ranged` huntrange **6** | crush bow; same small-ninja bones |
| `mm_ravine_archer` | **86** | same 80/80/80/50 ranged **110** | ranged huntrange **15** (`attackrange=15`) | same |
| `mm_posted_archer` | **86** | same | ranged huntrange **6**; `moverestrict=nomove` | same |
| `mm_padulah` | **149** | **130 / 130 / 130 / 130** + magic **130** | `aa_aggressive_melee` huntrange **10** | slash; `mm_medium_ninja_monkey_bones` |
| `mm_uodai` | **149** | same 130s | **none** (289 and 377) | slash; medium-ninja bones |
| `mm_religious_guard` | **167** | **130 / 200 / 130 / 130** + magic **130** | melee huntrange **5** | crush; `mm_normal_gorilla_monkey_bones` |
| `mm_religious_trapdoor_guard` | **167** | same 130/200/130/130 | melee huntrange **2** | crush; `mm_bearded_gorilla_monkey_bones` |
| `mm_zombie_monkey_small` | **82** | **100 / 60 / 60 / 60** + magic **60** | melee huntrange **2** | crush; `param=undead,^true`; `mm_small_zombie_monkey_bones` |
| `mm_zombie_monkey_large` | **98** | **150 / 60 / 60 / 60** + magic **60** | melee huntrange **5** | crush; undead; `mm_large_zombie_monkey_bones` |
| `mm_zombie_monkey_large_guard` | **129** | **150 / 90 / 110 / 90** + magic **90** | melee huntrange **2** | crush; undead; large-zombie bones |

377 unpack after inject matches those combat numbers and (where 289 has them) `huntmode=` / `huntrange=`. Models stay 377 (`npc_1441`, `npc_1459`, …) — do not copy 289 `quest_mm_npc_*` names. 289 Padulah **patrol** waypoints were **not** required for this combat inject.

**Smoke floors** in the summary table are **policy analogs** (Zooknock tunnel **90/90/85/99** + rune; Tyras **90/90/80/90** + gilded; hellhound **80/80/70/85** + adamant). No remains-kill mid has landed. Do not seed a wiki “level 167 gorilla” or other OSRS CL.

Jungle Demon (`mm_demon`, vis **195**, 170s) is the **final battle**, not this remains set — see `mystic-gear-combat-params-377.md`.

#### Greegree hunt skip (`check_invcat`)

289 `quest_mm.hunt` and product `mm.hunt`:

```text
check_invcat=worn,mm_greegree,<1
```

on `[aa_aggressive_melee]` and `[aa_aggressive_ranged]` only (`[mm_guard]` has **no** invcat). Meaning: hunt the player **only if** worn `mm_greegree` count is **less than 1**. A **held greegree** should skip those hunters.

This is **not** a live-world guarantee until the hunt stack is packed and the running engine evaluates it (`HuntType` code **18** → `checkObjCat` / `invTotalCat`). Until that lands, do not treat Ape walks as safe-from-aggro and do not invent a different skip (inv-only, name-equals, OSRS “monkey greegree” ids).

`mm_monkey_guard` and `mm_uodai` have **no** `huntmode` in 289 or 377 — they are Attack-op combat shells, not greegree-gated hunters.

Stands / greegree zone: [`anchors-ape-atoll.md`](anchors-ape-atoll.md). Wave B inject note: [`../mm-waveb-config-unit-377.md`](../mm-waveb-config-unit-377.md).
