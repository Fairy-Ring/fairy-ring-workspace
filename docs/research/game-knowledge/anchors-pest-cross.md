# Game-knowledge anchors — Pest Cross **14315** (377)

**Date:** 2026-08-15  
**Use:** Harness tele **next to** the waiting-craft gangplank, not on it. Dest after Cross is the **waiting lander** — **not** match-instance / `m41_40`.  
**Product stays 377.** Hunt 289? **no**. Docs only this file. **No product `.rs2`.**

**Parents (cite — do not rewrite):** dest index [`../dest-cite-index-377.md`](../dest-cite-index-377.md) · dest-from-maps [`../dest-from-our-maps-377.md`](../dest-from-our-maps-377.md) · remesure [`../dest-from-our-maps-remaining-377.md`](../dest-from-our-maps-remaining-377.md) · XL unit 10 [`../xl-minigames-remaining-impl-377.md`](../xl-minigames-remaining-impl-377.md) · readiness [`../pest-control-377-readiness.md`](../pest-control-377-readiness.md) · leftover plank pin [`../pest-lander-cross-plank-377.md`](../pest-lander-cross-plank-377.md) · stand rule [`harness-tele-stand.md`](harness-tele-stand.md)

**Tag:** **VERIFIED** = this-pass `loc.pack` / `pest.loc` / `m41_41.jm2` · **CANDIDATE** = dest-cite collision (2026-08-15) · leftover dest-hole “UNKNOWN” is **stale** vs dest-cite — do **not** re-park.

---

## Cross (board waiting craft)

Formula: `world = mx×64 + local`. Outpost `m41_41` origin **2624, 2624**. Game set `m41_40` origin **2624, 2560**.

| Role | Tile | Note |
|------|------|------|
| **Loc** `pest_lander_gangplank` **14315** | **2658,2639 L1** | `loc.pack` `14315=pest_lander_gangplank`. jm2 **unique** `m41_41` `1 34 15: 14315 10` (shape **10**, no angle). Unpack `pest.loc`: name **Gangplank** · *Handy for boarding the ship.* · `op1=Cross` · `active=yes` · `hillskew=yes` · `mapscene=46` · model `arhein_ship_on`. **0** `category=` · **0** dest / `board_message`. L1 MAP `h25 o42 f2`. **Do not** `teleTo` here. |
| **Stand (tele / click)** | **2657,2639 L0** | West of loc, **actualLevel** (LINK_BELOW). L1 tele here / on the plank is **midair**. `PathFinder.walkable` **true**. **Not** dest. |
| **Dest** | **2660,2640 L0** | **CANDIDATE** waiting-craft deck (boat floor occupancy + walkable). `p_telejump(0_41_41_36_16)`. Loc plane **2658,2639 L1** is midair — do not dest there. **Not** `m41_40`. |

Loc tile **is** dest because the plank is walkable (board **onto** the waiting craft). Dest-from-maps rule 4 only forbids standing **on** a `WALK_BLOCKED` loc. Harness still stands **next to** the loc to Cross.

```js
const PEST_CROSS_LOC = { x: 2658, z: 2639, level: 1 }; // 14315 loc plane — not player dest
const PEST_CROSS_STAND = { x: 2657, z: 2639, level: 0 }; // actualLevel — L1 is midair
const PEST_CROSS_DEST = { x: 2660, z: 2640, level: 0 }; // craft deck
await teleTo(page, PEST_CROSS_STAND, 2, 30_000);
```

Remesure (same pack dest-from-maps used):

```bash
bun "$RS2_R377_ROOT/tools/harness/nav/tools/probe-walkable.mjs" 2658,2639,1 2657,2639,1
```

2026-08-15 remesure: **2658,2639 L1** `walkable` **true** · adj **2657,2639** / **2659,2639**.

**0** `[oploc1,pest_lander_gangplank]` this tree (`game_pest/` = `pest.loc` + `pest_exchange.rs2` only). Click **no-op** until a later session authors Cross. Soft `teleTo` dest is a **toy**.

---

## Same craft — not dest / not this stand

| Who / loc | Tile | Why out |
|-----------|------|---------|
| Inactive `pest_lander_gangplank_inactive` **14316** | **2659,2639 L1** | jm2 `1 35 15: 14316 10` · `active=no` · **0** op · remesure walkable adj · **not** dest · **not** stand |
| Climb `pest_lander_ladder` **14314** | **2660,2639 L0** | jm2 `0 36 15: 14314 10 2` · `op1=Climb` · *A ladder out of the lander craft.* · dest **EXHAUSTED** this pass |
| Boat floors `pest_lander_boat_floor_*` **14256/14257** | **2660–2663, 2638–2643 L0** | `m41_41` waiting-craft body · **0** op · occupancy |
| L0 under plank | **2658,2639 L0** / **2659,2639 L0** | MAP `o6 f1` water |
| L1 N/S of plank | **2658,2640** / **2658,2638 L1** | MAP `h25 f1` · **0** `o42` · remesure did **not** list as adj walkable |
| Alt pier W-south / W-north | **2657,2638** / **2657,2640 L1** | same pier `o42` + **9541** · fallback only |
| Squire `pest_squire_lander` **3802** | **2658,2647 L0** · stand **2659,2647** | Talk-to pin · **not** Cross |
| Exchange VK **3786** | **2654,2663 L0** · stand **2654,2662** | **PASS** `pestxss08868` · keep · **not** dest |
| Island floors **14256/14257** | ~**2656–2659, 2609–2614 L0** | `m41_40` **0** **14314/14315** · **0** `==== NPC ====` · occupancy ≠ match start |
| Island floor sample | **2656,2609 L0** | remesure walkable · **not** Cross dest · **not** match start |
| Glow **14310** | **2656,2592 L0** (`m41_40` `0 32 32`) | scenery · **0** op · **not** dest |
| Sarim ship **14304/14305** | `m47_50` | other Cross · **STOP** this file |
| Island ship **14306/14307** | `m41_41` **2660/2661,2676 L1** | return pair later |

`m41_40` has **MAP** + **LOC** only. **0** plank ids. Engine has **0** instance. Match dest **EXHAUSTED**.

Do **not** attach `category=gangplank_*` (Entrana `ship_to_entrana_on` has it; lander does **not**). Charter `+1` height invents dest.

---

## STOP

| Stop | Why |
|------|-----|
| **Instance invent** (`%pest_instance` **718**) | `varp.pack` `718=pest_instance` · unpack body **empty** · engine **0** instance |
| **HUD `current_champion` 2804** | Fight Pit leftover (`tzhaar_fightpit_remaining`) · never from Pest / Champions basement |
| **Parchment `defeated_the_champion` 15831** | Champions leftover · Imp shipped without it · **not** Pest |
| `m41_40` tele / `p_tele*` **2656,2609** as match | occupancy ≠ dest · **0** dest-side **14315** |
| Write `bits_2086` / varp **719** | leftover **18691** `com_91` is **display** |
| 3-boat / 25-cap / 5-min / Void kit / 6 Jun HUD | **SUBTRACT** / other units |
| Hunt **289** / flip **410** | product stays **377** |

**PASS (XL unit 10):** stand **2657,2639 L0** · Cross **14315** · land **2660,2640 L0** planted (L1 plank was midair) · Exchange still opens · **0** instance write · **2804** / **15831** closed · `pestcsv4qcb8` / `pestcsv4w4th`.  
**PASS now:** loc **14315** visible from stand; click **no-op**. **PASS forbidden:** boarded game · island tele · instance / **2804** / **15831**.

```bash
rg -n '14315=pest_lander_gangplank' "$RS2_R377_ROOT/vendor/content/pack/loc.pack"
rg -n '1 34 15: 14315|1 35 15: 14316|0 36 15: 14314|==== NPC ====' \
  "$RS2_R377_ROOT/vendor/content/maps/m41_41.jm2"
rg -n '==== NPC ====|: 14315|: 14314|: 14256' \
  "$RS2_R377_ROOT/vendor/content/maps/m41_40.jm2"
```

Expect: pack **14315**; outpost plank/ladder; `m41_40` **no** NPC header and **no** **14314/14315**.

---

| Date | Note |
|------|------|
| 2026-08-15 | Pin loc **14315** @ **2658,2639 L1**. Dest **CANDIDATE** same tile (waiting craft). Stand **2657,2639 L1**. Match instance **EXHAUSTED**. **STOP** **718** / **2804** / **15831**. Hunt 289? **no**. |

*Research only. Product stays 377. Hunt 289? no.*
