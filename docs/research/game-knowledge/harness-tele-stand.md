# Harness tele / stand tiles — next to the loc, not on it

**Date:** 2026-08-08 (cemented; recurring thrash lesson)  
**Audience:** smokes, quest hosts, thrash loops under `tools/harness/`  
**Related:** `docs/runbooks/harness.md` (`teleTo`), `tools/harness/lib/harness.mjs`

---

## Rule (mandatory for hosts)

**`teleTo` / soft re-tele / thrash “home” tiles must target a walkable tile adjacent to the interaction loc — never the loc’s own tile when that tile is blocked by scenery.**

| Do | Don’t |
|----|--------|
| Stand **next to** altar / wall / door / chest / bank booth | Tele onto `loc` world coords that hold the scenery model |
| Keep a separate constant for **loc** vs **stand** | Reuse `^…_altar_coord` / map loc spawn as the stand tile |
| Prefer tiles proven walkable in a headed thrash log | Assume map centre = free floor |
| For rings (Flamtaer walls): stand **inside** the courtyard, op adjacent segs | Walk to `wall.wx+1` blindly (often **outside** the ring) |

Script / content coords (`^mortton_temple_altar_coord`, spawn rows, etc.) are for **loc_find / hunt / zone** — they are **not** automatic player stand anchors.

| Feature | Loc / NPC | Stand (proved) |
|---------|-----------|----------------|
| Gertrude pick-a-kitten | Gertrude **3151,3410** | **3151,3409** (south, in-house) `kitnsrv3ukx` |
| TBW Gabooty | Gabooty **2794,3065** | **2793,3065** (west) |
| TBW Rionasta | Rionasta **2782,3094** | **2781,3094** (west) `tbwprsrz68m2` |
| BF temp gauge | loc **1945,4961** | **1945,4960** (south) `bfggesrz6t0k` |
| MTA Rewards Guardian | NPC **3362,3318** L1 size-2 | **3362,3316** L1 (south; **3317** is on the NPC) `mtashsrzqxvp` |
| MTA Telekinetic portal | loc **3363,3315** L0 | **3363,3314** (south) → dest **3336,9718** `mtatksrzxcna` |
| Pest Void Knight Exchange | VK **2654,2663** | **2654,2662** (south) `pestxss08868` |
| DT Archaeological expert | NPC **3355,3333** | **3355,3334** (north; west **3354,3333** is flush on south timberwall) `dtterss4uf2o` |
| FT1 Fairy Nuff | NPC **2391,4468** | **2390,4468** (west) `ft1nuss6m3o4` (ended **2392,4466**) |
| DT village Eblis | NPC **3185,2983** | **3181,2984** W of `curtain_1528` (sand, no `o26`). **Do not** **3185,2982** (tent floor CLIP `dteblss6x6x1`) · **3185,2979** is `desertwall` **1415** |
| MD Ragnar | NPC **2765,3676** | **2764,3676** (west; not north water **2765,3677**) `mdragss7r2sc` |
| Enakhra Lazim | NPC **3191,2926** | **3190,2926** (west) `enklzss7v1k6` (ended **3195,2924**) |
| Enakhra sandstone | NPC **3191,2926** | **3191,2925** (S) `enksdssavnqd` (ended **3192,2924**) |
| BAR Dondakan | NPC **2824,10168** | **2824,10167** (S) `bardnss94vnc` (ended **2825,10167**) |
| HM Zealot | NPC **3444,3258** | **3443,3258** (W) `hmzeass8ulpj` (ended **3443,3259**) |
| RC Phingspet | NPC **3245,9868** | **3244,9868** (W) `rcsisss8ulum` (ended **3245,9868**) |
| CF east-dock Teach | NPC **3713,3497** L1 | **3712,3496** L1 `cfeasss9gedx` (ended **3713,3495** L1) |
| Garden Ellamaria | NPC **3228,3477** | **3227,3477** (W) `grelmss9ic9a` (ended **3228,3477**) |
| Ahoy Velorina | NPC **3678,3510** | **3678,3509** (S) `ahvelss9geog` |
| Ahoy Necrovarus | NPC **3660,3516** | **3660,3515** (S) `ahnecssc2r6z` (ended **3662,3516**) |
| Ahoy Old crone | NPC **3461,3558** | **3461,3557** (S) `ahcrossdbg69` (ended **3460,3557**) |
| MD cliff boulder | loc **2765,3666** | **2764,3666** (W) `mdclfssdbgef` |
| MH Jorral | NPC **2437,3347** | **2438,3347** (E, table) `mhjorssa018q` / scroll skim `mhscrssd3wj2` |
| Fossegrimen altar | loc **2626,3598** | **2625,3598** (W) `vklyrssd3wa6` |
| MH Droalak | NPC **3657,3469** | **3658,3469** (E) `mhdrossc2r1o` (ended **3657,3470**) |
| MH Melina | NPC **3674,3484** | **3674,3483** (S, indoor) `mhdrossc2r1o` |
| MH Dron | NPC **2658,3700** | **2659,3700** (E) `mhdrosscpglj` (ended **2659,3699**) |
| MH Blanin | NPC **2675,3671** | **2674,3671** (W) `mhdrosscpglj` |
| DT Eblis take | NPC **3185,2983** | **3181,2984** + Open `curtain_1528` `dttakssa01eg` (ended **3184,2983**) |
| MEP1 Eluned | NPC **2289,3145** | **2290,3145** (E) `mep1essa7z1y` (ended **2290,3145**) |
| OSF sculpture Read | loc **5808** **2621,9835** | **2620,9835** (W) `osfrdssubeec` · not on loc · not on rock piles **1803** |
| OSF sculpture Use | loc **5808** **2621,9835** | **2620,9835** (W) `osfusssunm8n` (ended **2621,9835** Use reach) |

---

## Why it keeps biting us

1. **Scenery blocks the tile** — fire altars, walls, booths, chests: the loc’s world tile is often unwalkable or a bad stand for op reach.  
2. **`tele` lands you on that tile** — engine tele does not “nudge off” blocked squares; thrash then looks “stuck” or walks oddly.  
3. **Chasing the next Broken Wall** with `walkWorld(wx±1, wz)` without an **inside bias** runs the player around the **outside** of a ring minigame.  
4. Recurring examples in this workspace: Flamtaer altar **3506,3316** (`0_54_51_50_52`), tele-on-wall **3504,3315**, TBWT hut L0/L1 mismatch, other quest “stand on the NPC spawn”.

---

## Pattern (constants)

```js
// Product / map truth (loc, not stand)
const FLAMTAER_ALTAR = { x: 3506, z: 3316, level: 0 }; // 0_54_51_50_52 — UNWALKABLE for player

// Host stand: one free tile beside altar, inside courtyard (proved 2026-08-08 thrash)
const FLAMTAER_COURTYARD = { x: 3505, z: 3315, level: 0 };

// Geometric bias for “step toward inside” (may equal altar; never tele here if blocked)
const TEMPLE_CENTER = { x: 3506, z: 3316 };

await teleTo(page, FLAMTAER_COURTYARD, 2, 30_000); // stand
// later: opLocAt(altar) / Repair adjacent wall from inside
```

### Inside-stand for wall rings

```js
// Project wall tile → stand on the courtyard side of TEMPLE_CENTER
function insideStand(wx, wz, center) {
  let sx = wx, sz = wz;
  if (wx < center.x) sx = wx + 1;
  else if (wx > center.x) sx = wx - 1;
  if (wz < center.z) sz = wz + 1;
  else if (wz > center.z) sz = wz - 1;
  return { x: sx, z: sz };
}
```

Sticky wall target + only re-walk when `cheb(me, stand) > 1` — do not re-home every tick.

---

## Deposit box (2026-08-13)

| Role | Tile | Notes |
|------|-----:|--------|
| Smoke loc (Falador west) | **2943,3369** | `m45_52` `0 63 41`; `forceapproach=south` |
| Host stand | **2943,3368** | One tile south |
| Draynor loc (do **not** smoke here) | **3094,3240** | `m48_50` `0 22 40` — dark wizards curse/kill a fresh account (`You feel weakened.`) |

IF root **4465** `bank_deposit_box` (was leftover `inter_95`). Loc ledger slug + `bank_main`/`bank_side` family.

## Ranging Guild ticket merchant (2026-08-13)

| Role | Tile | Notes |
|------|-----:|--------|
| NPC spawn | **2659,3429** | `m41_53` NPC **694** `0 35 37` (also **2659,3431**) |
| Host stand | **2658,3429** | One tile west |

IF root **11942** `tickets_shop` (was leftover `inter_232`). Not 289 id **4461**.

## Al-Kharid bank (2026-08-13)

| Role | Tile | Notes |
|------|-----:|--------|
| Open booth `bankbooth` **2213** | **3268,3166** | `m51_49` `0 4 30`; line **3268,3164–3169** (3165/3170 = closed **2215**) |
| Banker (behind counter) | **3267,3166** | `kharidbanker*` `0 3 30` — **not** a stand |
| Host stand | **3269,3166** | One tile **east** (lobby). **Never** tele **3268,3164** (that *is* the booth / wall) |

Booth `Use` (`oploc1`) finds the teller and `@talk_to_banker`. Teller Talk is **AP** + `p_aprange(2)` — you cannot be adjacent.

## Al-Kharid tanner (2026-08-13)

| Role | Tile | Notes |
|------|-----:|--------|
| Ellis spawn | **3276,3193** | `m51_49` NPC **2824** `0 12 57` |
| Host stand | **3275,3193** | One tile west |

IF root **14670** `tanner` (was leftover `inter_306`). Trade = op3. Not 289 id **679**.

## Al-Kharid furnace (2026-08-13)

| Role | Tile | Notes |
|------|-----:|--------|
| Loc `furnace1` | **3272,3185** | `m51_49` LOC **2781** `0 8 49`; `forceapproach=east` |
| Host stand | **3275,3186** | East of 3×3 footprint |

IF root **13782** `silver_casting` (was leftover `inter_282`). Name from leftover title. PIN/289 not involved.

## Flamtaer anchors (proved / soft)

| Role | Tile | Notes |
|------|-----:|--------|
| Altar loc | **3506,3316** | `^mortton_temple_altar_coord` — **not** tele target |
| Courtyard stand | **3505,3315** | SW of altar; inside ring; tele / re-tele home |
| Wall sample (rubble) | **3504,3315** | Broken Wall — op from **inside**, never tele onto |
| Thrash interior band | ~3503–3507, 3315–3318 | Logs: 3503,3315–3318 while building |
| Temple soft box | 3502–3510, 3312–3320 | Death / fail-tele re-entry check |

---

## Exactmove / squeeze start tiles (2026-08-09)

Some product paths (`p_exactmove` after `distance(coord, $start) > 1 → return`) **silently no-op** if the player is not on the computed **$start** tile.

| Loc | Loc tile | Host **start** stand | FAIL mode |
|-----|----------|----------------------|-----------|
| Regicide dense forest camp entry (`regicide_cross_over2_tyras_camp`, angle east) | **2187,3169** | **2188,3168** | Tele 2185,3168 → Enter spam → stage stays 9 (`regsmja210`) |
| Same name “Dense forest” nearby | 2187,3166 / 3163 | **not** camp-entry | Wrong loc type never writes stage 10 |

**Rule:** when porting agility-style loc scripts, log **loc_coord + loc_angle → $start** in anchors **before** thrash loops. Do not thrash “any Dense forest within 12 tiles.”

---

## Checklist (new smoke tele)

1. Name constants `*_LOC` / `*_ALTAR` vs `*_STAND` / `*_COURTYARD` / exactmove `*_START`.  
2. Headed once: after tele, screenshot + log `worldTile` — if standing “in” the scenery, offset ±1 toward free floor.  
3. For minigame rings, fix **inside** bias before writing thrash loops.  
4. For exactmove/squeeze: compute $start from angle; prove distance ≤ 1.  
5. Log the stand tile in the plan or `anchors-*.md` **same turn** as PASS/FAIL.

---

## Code touchpoints

| Path | Note |
|------|------|
| `tools/harness/lib/harness.mjs` → `teleTo` | JSDoc points here |
| `tools/harness/quest-mortton-smoke.mjs` | Flamtaer courtyard thrash |
| `docs/runbooks/harness.md` | Short rule cross-link |
| `docs/research/game-knowledge/README.md` | Corpus index |

**Product trees:** unchanged — this is host / thrash discipline only.
