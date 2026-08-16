# Game-knowledge anchors — Barrows mound Dig / crypt dests (377)

**Date:** 2026-08-15  
**Use:** Harness tele **ON** each surface peak. Later Dig `p_tele*` uses the dest-cite tiles only.  
**Product stays 377.** Hunt 289? **no**. Docs only this file.

**Parents (cite — do not rewrite):** mound-dig [`../barrows-mound-dig-first-slice-377.md`](../barrows-mound-dig-first-slice-377.md) · dest remesure [`../dest-from-our-maps-remaining-377.md`](../dest-from-our-maps-remaining-377.md) · dest index [`../dest-cite-index-377.md`](../dest-cite-index-377.md) · Ahrim dest [`../barrows-crypt-dest-377.md`](../barrows-crypt-dest-377.md) · stand rule [`harness-tele-stand.md`](harness-tele-stand.md) · jm2 formula [`../map-npc-spawns-jm2-377.md`](../map-npc-spawns-jm2-377.md)

**Tag legend:** **VERIFIED** = this-pass `m55_51` / `m55_151` jm2 or `loc.pack` · **CANDIDATE** = kbase 1977 compass name-join, or dest-cite collision next-to stairs · **SUBTRACT** = after ~2 May 2006 / OSRS-only.

---

## Pairing — six Dig stands → six crypt dests

Formula: `world = mx×64+local`. Surface `m55_51` base **3520, 3264**. Crypt `m55_151` L3 base **3520, 9664**.

Mounds are **terrain** (not a Dig loc). Stand **ON** the peak. Grass **6796** `active=no` is décor. **Do not** invent a seventh dest (chest **10284** **3551,9695 L0** is **not** Dig).

**Brother-name join is CANDIDATE** (official kbase **1977** “the above map” + last-resort Strategies compass). Dest **room** names are pack **VERIFIED** (`loc.pack` **6702–6707** = `barrows_stairs_{ahrim…verac}`). Surface hill → that name is the CANDIDATE hop. Crypt rooms are **not** compass-aligned with the hills (SE Guthan hill → west crypt). Do **not** re-pair by dest-side compass.

| Brother (name **CANDIDATE**) | Compass | Peak `h` | Dig stand **ON** L0 | Crypt dest L3 | Stairs loc (blocked) | `p_tele*` |
|------------------------------|---------|---------:|---------------------|---------------|----------------------|-----------|
| **Ahrim** | centre | **85** | **3565,3289** (`0 45 25`) | **3557,9703** | **6702** **3558,9703** | `3_55_151_37_39` |
| **Dharok** | NE | **76** | **3575,3298** (`0 55 34`) | **3556,9718** | **6703** **3557,9718** | `3_55_151_36_54` |
| **Guthan** | SE | **77** | **3577,3283** (`0 57 19`) | **3535,9705** | **6704** **3534,9705** | `3_55_151_15_41` |
| **Karil** | south | **74** | **3566,3276** (`0 46 12`) | **3547,9685** | **6705** **3546,9685** | `3_55_151_27_21` |
| **Torag** | SW | **75** | **3553,3283** (`0 33 19`) | **3565,9684** | **6706** **3565,9683** | `3_55_151_45_20` |
| **Verac** | NW | **79** | **3557,3298** (`0 37 34`) | **3577,9703** | **6707** **3578,9703** | `3_55_151_57_39` |

Ahrim stand already used by Dig no-op **PASS** `brdigssjfnp1`. Dest tiles are dest-cite **CANDIDATE** (2026-08-15): `PathFinder.walkable` **true** next to the stairs loc; stairs tile **false**. Do **not** remesure a second dest per room.

---

## How each stand was picked

Highest explicit MAP `h` plateau on that hill, **u115**, **no** `f`, LOC only grass **6796**. One cell per hill (same class as Ahrim **3565,3289**). Dig **radius UNKNOWN** — these are peak stands, not an `inzone` graph.

| Hill | Peak cells (local) | World plateau | Stand cell | Why this cell |
|------|--------------------|---------------|------------|---------------|
| Ahrim **h85** | `45,24–26` · `46,24–25` (`46,26` is **h84** rim) | **3565–3566, 3288–3290** | `45,25` | Centre of west column. **Not** Old Man `45,24`. |
| Dharok **h76** | `55–56, 34–35` | **3575–3576, 3298–3299** | `55,34` | SW of the 2×2 peak. |
| Guthan **h77** | `57–58, 19` | **3577–3578, 3283** | `57,19` | West of the two-tile ridge. |
| Karil **h74** | `46–47 × 11–13` | **3566–3567, 3275–3277** | `46,12` | West-centre of the 2×3. |
| Torag **h75** | `33–34 × 18–20` | **3553–3554, 3282–3284** | `33,19` | West-centre of the 2×3. |
| Verac **h79** | `36,34` · `37,33–35` · `38,34` | **3556–3558, 3297–3299** | `37,34` | Centre of the plus. |

Only NPC on `m55_51` mounds: `barrows_oldman` **2024** @ `0 45 24` = **3565,3288**. Other five stands have **0** NPC rows.

Dest-side (already measured — occupancy here is cite, not a new dest):

| Dest | jm2 cell | MAP | LOC on dest tile | Relation to stairs |
|------|----------|-----|------------------|--------------------|
| Ahrim **3557,9703** | `3 37 39` | **u103** | **0** | W of **6702** |
| Dharok **3556,9718** | `3 36 54` | **u103** | **0** | W of **6703** |
| Guthan **3535,9705** | `3 15 41` | **u103** | soil **6813** `22` (décor) | E of **6704** |
| Karil **3547,9685** | `3 27 21` | **u103** | soil **6813** `22` | E of **6705** |
| Torag **3565,9684** | `3 45 20` | **u103** | **0** | N of **6706** |
| Verac **3577,9703** | `3 57 39` | **u103** | soil **6812** `22` (décor) | W of **6707** |

Soil **6812/6813** is `active=no` ground décor. Dest-cite already accepted those three next-to tiles. Do **not** swap Verac back to occupancy **UNKNOWN**.

---

## Do not stand / do not dest

| Tile | Why |
|------|-----|
| **3565,3288** | Old Man **2024** spawn — not Dig |
| Stairs **3558,9703** / **3557,9718** / **3534,9705** / **3546,9685** / **3565,9683** / **3578,9703** L3 | Loc tiles · walkable **false** |
| Chest **3551,9695 L0** | Reward room · **not** a Dig dest |
| `barrows_dugupsoil_*` **6801–6803** ~**3567–3575, 3308–3314** | North of the fence · not Dig |
| Sign **6835** **3564,3316** · tome **4707** **3571,3312** | Examine / Read · not Dig |
| Ahrim rim **3566,3290** (`46,26` **h84**) | Not the **h85** peak |

Harness-tele-stand (next-to blocked loc) does **not** apply to mounds. Official start is **on the hill**.

---

## STOP

- Invent a **seventh** dest, a second dest in any room, or a wiki `(x,z)`.  
- Pair hills by dest-side compass (Guthan SE surface is **not** Verac’s east crypt).  
- Dig loc on grass **6796** / soil **6801–6803**.  
- Six-mound `inzone` / `distance<=1` as 377 truth (radius **UNKNOWN**).  
- Open leftover **4535** on Dig.  
- `[opnpc1,barrows_oldman]` as start.  
- Hunt **274/289**. Product stays **377**.

---

| Date | Note |
|------|------|
| 2026-08-15 | Six peak stands from `m55_51` heightfield + parent census. Dest side = dest-cite six only. Name join **CANDIDATE**. |
| 2026-08-15 | Ahrim Climb-up **6702** dest **3565,3289 L0** planted **PASS** `brclmsv5gq0b`. Inverse of Dig. leftover **4535** closed. |
| 2026-08-15 | Other-5 Climb-up **6703–6707** planted **PASS** `br5clsv5rv5u`. leftover **4535** closed. |
