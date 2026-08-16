# Game-knowledge anchors — Fight Pits / TzHaar corridor (377)

**Date:** 2026-08-15  
**Use:** Harness tele **next to** viewing orb **9391** / Mej-Kah **2618**, not on them. Pit dest is **EXHAUSTED** — dest-from-maps **0** row. Look-into / Pass / Talk-to are **not** dest.  
**Product stays 377.** Hunt 289? **no**. Docs only this file. **No product `.rs2`.** Word: **residual**.

**Parents (cite — do not rewrite):** XL § D.1 [`../xl-minigames-remaining-impl-377.md`](../xl-minigames-remaining-impl-377.md) · leftover HUD later [`../residual-champions-hud-later-377.md`](../residual-champions-hud-later-377.md) · dest rule [`../dest-from-our-maps-377.md`](../dest-from-our-maps-377.md) · remesure [`../dest-from-our-maps-remaining-377.md`](../dest-from-our-maps-remaining-377.md) · dest index [`../dest-cite-index-377.md`](../dest-cite-index-377.md) · stand rule [`harness-tele-stand.md`](harness-tele-stand.md) · map-only corridor [`../fight-pits-first-product-slice-377.md`](../fight-pits-first-product-slice-377.md) · city Ket pin [`../fight-pits-tzhaar-ket-first-slice-377.md`](../fight-pits-tzhaar-ket-first-slice-377.md) · orb park [`../residual-fight-pit-orb-park-377.md`](../residual-fight-pit-orb-park-377.md) · leftover **3209** [`../residual-if-stop-viewing-377.md`](../residual-if-stop-viewing-377.md) · jm2 formula [`../map-npc-spawns-jm2-377.md`](../map-npc-spawns-jm2-377.md)

**Tag:** **VERIFIED** = this-pass `loc.pack` / `npc.pack` / `_unpack/377` / `m37_80.jm2` / `m38_80.jm2` / `m44_149.jm2` · **CANDIDATE** = dest-from-maps named a dest-side tile · dest-from-maps / dest-cite-index / remesure **silent** = dest **EXHAUSTED** / occupancy **PARK**. Do **not** invent.

---

## World formula

`world = mx×64 + local`. Pit corridor `m37_80` origin **2368, 5120**. City `m38_80` origin **2432, 5120**. Volcano `m44_149` origin **2816, 9536**.

`collision.lcnav` bake (same pack dest-from-maps uses): MAP `f1` = `BLOCK_MAP_SQUARE` **0x1** (`build-collision.ts` / `lib.ts`). Loc shape **10** + default `blockwalk` = loc tile blocked. Shape **22** + `active=no` décor does **not** set floor (`changeLocCollision` GROUND_DECOR only if `active===1`). Dest-from-maps remesure **2026-08-15** printed **0** Fight Pit / **9391** / **9368** / **2480,5174** row.

---

## Corridor (first mid — map-only)

North–south line **x=2399** (local **31**). `m37_80` `==== NPC ====` is **one** row: **2618**. **0** `tzhaar_ket*` · **0** swarm **2627–2632**.

| Role | Tile | Cite | Tag |
|------|------|------|-----|
| **Loc** `viewing_orb` **9391** | **2399,5172 L0** | `loc.pack` `9391=viewing_orb`. **unique** jm2 `m37_80` `0 31 52: 9391 10`. Unpack `name=Viewing orb` · *I spy with my little eye...* · `op1=Look-into` · `anim=tzhaar_viewing_orb`. MAP `h10 u72`. **0** `dest=`. **0** `[oploc*]`. **Do not** `teleTo` here. | **VERIFIED** pack + jm2 |
| **Stand (tele / Look-into)** | **2398,5172 L0** | West of loc. MAP `0 30 52` `h10 u72` · **0** `f`. LOC only décor `9373` **22**. Fallback **2400,5172** E (`0 32 52` same MAP). **Not** dest. Look-into is **not** dest (XL § D.1). | **VERIFIED** occupancy |
| **Pit dest** | — | dest-from-maps **0** pit dest · dest-cite-index **0** row · remesure **0** row · **0** packed landing · **0** instance. Occupancy south of **9368** ≠ dest. | **EXHAUSTED** |
| **NPC** `tzhaar_fightpit_master` **2618** | **2399,5178 L0** | `npc.pack` `2618=tzhaar_fightpit_master`. Unpack `name=TzHaar-Mej-Kah` · *Another one of those mystic-types.* · `op1=Talk-to` · `vislevel=hide`. jm2 `0 31 58: 2618`. MAP `h1 u72`. **Not** leftover **TzHaar-Xil-Huz**. | **VERIFIED** spawn + unpack |
| **Stand (Talk-to)** | **2398,5178 L0** | West of NPC. MAP `0 30 58` `h10 u72`. LOC décor `9371` **22**. **Do not** stand on **2399,5178**. **Not** dest. | **VERIFIED** occupancy |
| **Hot vent (south)** `hot_vent_door_9368` **9368** | **2399,5168 L0** | `loc.pack` `9368=hot_vent_door_9368`. jm2 `0 31 48: 9368 10 2`. Unpack `name=Hot vent door` · *A barrier of heat.* · `op1=Pass`. **0** `[oploc*]`. **Do not** `teleTo` here. | **VERIFIED** |
| **Stand (Pass click)** | **2399,5169 L0** | North of **9368** (corridor). MAP `0 31 49` `h1 u72`. First-slice W/E **2398,5168** / **2400,5168** are MAP **`f1`** (`o19`) — **do not** tele. **Not** dest. | **VERIFIED** MAP · first-slice W **stale** |
| **Hot vent (north)** `hot_vent_door_9369` **9369** | **2399,5176 L0** | jm2 `0 31 56: 9369 10`. Same unpack **Pass**. | **VERIFIED** |
| **Stand (Pass click)** | **2399,5175 L0** | South of **9369** (corridor). MAP `0 31 55` `h1 u72`. First-slice W **2398,5176** has wall `scenery_9361` **0** `2`. **Not** dest. | **VERIFIED** occupancy |

```js
const PIT_ORB = { x: 2399, z: 5172, level: 0 }; // 9391 loc — do not teleTo
const PIT_ORB_STAND = { x: 2398, z: 5172, level: 0 }; // W — Look-into reach
const MEJ_KAH = { x: 2399, z: 5178, level: 0 }; // NPC 2618 — do not teleTo
const MEJ_KAH_STAND = { x: 2398, z: 5178, level: 0 };
// dest EXHAUSTED — no p_tele* pit / Pass / Look-into
await teleTo(page, PIT_ORB_STAND, 2, 30_000);
```

```bash
bun "$RS2_R377_ROOT/tools/harness/nav/tools/probe-walkable.mjs" \
  2399,5172,0 2398,5172,0 2400,5172,0 \
  2399,5178,0 2398,5178,0 \
  2399,5168,0 2398,5168,0 2399,5169,0 2399,5167,0 \
  2399,5176,0 2398,5176,0 2399,5175,0 \
  2480,5174,0 2479,5176,0 2479,5175,0 \
  2863,9571,0 2862,9571,0 2862,9572,0
```

`probe-walkable` on **2399,5167** / pit-floor **9392** tiles is **occupancy**, **not** dest. dest-from-maps remesure already ran **silent**. Do **not** remesure a pit dest.

**0** `[oploc1,viewing_orb]` / `[oploc1,hot_vent_door*]` / `[opnpc1,tzhaar_fightpit_master]` this tree. **0** `scripts/minigames/game_tzhaar/`. Clicks **no-op**. Soft `teleTo` is a **toy**.

---

## Dest (keep shipped city only — do not invent a pit tile)

Rule: packed op + dest-side room on jm2 + `PathFinder.walkable` + stand **next to** a blocked loc. Occupancy ≠ dest. Wiki `(x,z)` is **not** a cite. dest-from-maps already named a tile → **CANDIDATE**. dest-from-maps **silent** → dest **EXHAUSTED** / **PARK**.

| Hop | Dest | `p_tele*`? |
|-----|------|------------|
| Orb **9391** Look-into | — | **no** — not dest (XL § D.1) · leftover **3209** **park** (`clientcode=205` logout) |
| Vent **9368 / 9369** Pass | — | **no** — dest-from-maps **0** · `open_hot_vent_door` **9366** / `hot_vent_door` **9367** **0** jm2 · dest **EXHAUSTED** |
| Pit instance / swarms **2627–2632** | — | **no** — **0** static `==== NPC ====` on `m37_80` · dest **EXHAUSTED** |
| Volcano **9358** Enter | **2480,5174 L0** (`0_38_80_48_54`) | **keep** product `passages.rs2` — dest-from-maps / dest-cite-index **silent** · **not** a Fight Pit dest · do **not** invent a second square |
| City **9359** Enter | **2862,9572 L0** (`0_44_149_46_36`) | **keep** product — same pair · **not** pit dest |
| Cave **9356** Enter | — | **other** unit · pairing **9356→9357** **EXHAUSTED** (xl § 0 / § D.2) |

---

## City commute — not this dest / not this stand

| Role | Tile | Note |
|------|------|------|
| Volcano loc `cave_entrance_9358` **9358** | **2863,9571 L0** | `m44_149` `0 47 35: 9358 10 1`. Unpack `op1=Enter` · *A cave deep into the volcano.* `length=2` `width=3`. MAP `h37 u63`. **Do not** `teleTo` on loc. |
| Stand (Enter) | **2862,9571 L0** / **2863,9570 L0** | W MAP `0 46 35` `h29 u63` · S `0 47 34` `h34 u63`. **Not** dest. |
| City land (product dest) | **2480,5174 L0** | MAP `0 48 54` `h90 u72` · décor `9373` **22**. **keep** `passages.rs2`. **Not** pit dest. |
| City loc `cave_exit_9359` **9359** | **2479,5176 L0** | `m38_80` `0 47 56: 9359 10`. MAP `h90 f1 u72`. Unpack `op1=Enter` · *This looks like the way out.* |
| Stand (Enter out) | **2479,5175 L0** | S of loc. MAP `0 47 55` `h90 u72`. First-slice W **2478,5176** is MAP **`f1`** — **do not** tele. |
| City Ket `tzhaar_ket7` **2616** | **2479,5168 L0** · stand **2478,5168** | Attack town · **not** Pit · Ket pin only |
| Mej-Jal **2617** / Cave **9356** | **2438,5169** / **2437,5166** | Fight Cave **4 Oct 2005** · **other** unit |

---

## Nearby — occupancy **PARK** / not this dest

| Who / loc | Tile | Why out |
|-----------|------|---------|
| Inactive `scenery_9392` (same model, `active=no`) | **2384,5157** · **2388,5138** · **2398,5150** · **2409,5158** · **2411,5137** | `m37_80` five shape-**10** rows · **0** Look-into · **not** leftover View cameras · MAP `u72` occupancy ≠ dest |
| Floor south of **9368** | **2399,5167 L0** (`0 31 47` `h10 u72`) | dest-side occupancy · dest-from-maps **silent** · **PARK** |
| `minigame_start_icon` **738** | **2399,5177 L0** (`0 31 57: 738 22`) | map icon · **0** op · **not** dest |
| Corridor décor `scenery_9370–9373` | same x=2399 band | `active=no` · shape **22** · occupancy |
| Wall `scenery_9360/9361` | **2398,5168** / **2398,5176** | `active=no` · shape **0** · blocks first-slice W stands |
| `open_hot_vent_door` **9366** / `hot_vent_door` **9367** | **0** jm2 | config only · **0** pair dest |
| `tzhaar_fightpit_door_closed` / `_entrance` **11845 / 11846** | ~**2964,3358 L0** (`m46_52` `0 20 30`–`34`) | `active=no` · **0** op · neighbors `pier_shadow_on_water` **816** · **not** the Pit |
| `tzhaar_fightpit_orb` / `_orbwall*` **11979 / 11986 / 11987** | `m46_51` / `m47_52` L1–L3 | scenery · **no** Look-into · off-city band |
| `tzhaar_minigame_start_icon` **11985** | **0** jm2 | pack only |
| Pit swarms Tz-Kih / Tz-Kek / Tok-Xil **2627–2632** | **0** `m37_80` NPC | runtime **UNKNOWN** · **not** dest |
| leftover **TzHaar-Xil-Huz** | leftover **2804** `text=` only | **0** NPC `Huz` · packed `tzhaar_xil*` are **TzHaar-Xil** |
| `champions_tzhaar_champofchamps` | Champions basement throne | **not** this pit |
| Champions pit dest **3168,9758** | dest-cite leftover floor (`^champions_imp_spawn`) | **other** basement · **not** TzHaar |
| leftover parchment **15831** | `defeated_the_champion` | Champions · **not** this pit |

`m37_80` pit-floor **9392** cells are occupancy. Dest-from-maps did **not** name them.

---

## STOP

| Stop | Why |
|------|-----|
| leftover Fight Pit HUD **2804** | `current_champion` · CS1 `tzhaar_fightpit_remaining` **560** · **stays closed** until a whole pit unit ([`residual-champions-hud-later-377.md`](../residual-champions-hud-later-377.md)) |
| leftover parchment **15831** | Champions `defeated_the_champion` · **not** this pit |
| leftover orb tab **3209** | `stop_viewing` · `com_5` **205** = logout · **park** · **0** `if_settab` |
| Pit dest invent | dest-from-maps **0** · dest-cite-index **0** · occupancy ≠ dest |
| Wiki `(x,z)` | dest-from-maps: our jm2 + `collision.lcnav` only |
| Tele **2398,5168** / **2478,5176** / **2964,3358** | MAP `f1` or off-city `active=no` doors |
| Invent cameras / View **0/6/7** / Xil-Huz on **2618** | leftover chrome ≠ packed name |
| `if_openoverlay(current_champion)` / soft-set **560** | leftover HUD · later / greenfield |
| Extend `passages.rs2` to **9356** / **9391** / vents | city commute is **other** loc |
| Spawn **2627–2632** / Ket on `m37_80` | **0** static · town Ket ≠ Pit |
| Hunt **289** / flip **410** | product stays **377** |
| Soft `teleTo` as authenticity | toy · label **SOFT** |

**PASS (now):** stand **2398,5172 L0** · see **9391** + Mej-Kah **2618** · Look-into / Talk-to / Pass **no-op** · leftover **2804** / **3209** / **15831** closed · dest stays a hole.  
**PASS forbidden:** boarded pit · `p_tele*` pit floor · leftover **2804** / **15831** open · `if_settab(stop_viewing)` · dest invent · Cave **9356**.

```bash
rg -n '9391=viewing_orb|9368=hot_vent_door_9368|2618=tzhaar_fightpit_master|9358=cave_entrance_9358' \
  "$RS2_R377_ROOT/vendor/content/pack/loc.pack" \
  "$RS2_R377_ROOT/vendor/content/pack/npc.pack"
rg -n '0 31 52: 9391|0 31 48: 9368|0 31 56: 9369|==== NPC ====|: 2618|: 262[7-9]|: 263[0-2]' \
  "$RS2_R377_ROOT/vendor/content/maps/m37_80.jm2"
rg -n '0 47 56: 9359|0 48 54|: 2618' "$RS2_R377_ROOT/vendor/content/maps/m38_80.jm2"
rg -n '0 47 35: 9358' "$RS2_R377_ROOT/vendor/content/maps/m44_149.jm2"
rg -n 'p_telejump\(0_38_80_48_54\)|p_telejump\(0_44_149_46_36\)' \
  "$RS2_R377_ROOT/vendor/content/scripts/general_use/scripts/passages.rs2"
test ! -d "$RS2_R377_ROOT/vendor/content/scripts/minigames/game_tzhaar" \
  && echo 'NO game_tzhaar'
```

Expect: pack **9391** / **9368** / **2618** / **9358**; corridor orb + vents + **one** NPC **2618**; city **9359** + **0** **2618**; volcano **9358**; `passages.rs2` city pair only; **no** `game_tzhaar`.

---

| Date | Note |
|------|------|
| 2026-08-15 | Pin stand **2398,5172 L0** (orb) / **2398,5178 L0** (Mej-Kah). Loc **9391** @ **2399,5172**. Pit dest **EXHAUSTED** (dest-from-maps **0**). Pass dest **EXHAUSTED**. City dest **keep** **2480,5174** / **2862,9572** (`passages.rs2`) — **not** pit dest. First-slice vent-W **2398,5168** MAP `f1` stale. leftover **2804** / **15831** / **3209** closed. Occupancy **PARK**. Hunt 289? **no**. |

*Research only. Product stays 377. Hunt 289? no.*
