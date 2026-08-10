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
