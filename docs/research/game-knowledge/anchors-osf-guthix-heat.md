# Anchors — OSF Guthix heat (bowl on range)

**Date:** 2026-08-15  
**Product stays 377.** Hunt 289? **no**. **No product `.rs2`.**  
**Authority:** cache **657** product surface = `vendor/content/pack/` + `vendor/content/maps/m46_52.jm2` (`==== LOC ====` only). Formula: `world = (mapsquare << 6) + local`. **m46_52** origin **2944, 3328**.

**Cite, do not rewrite:** brew leftover [`../osf-guthix-rest-brew-377.md`](../osf-guthix-rest-brew-377.md) · impl [`../osf-guthix-rest-brew-impl-377.md`](../osf-guthix-rest-brew-impl-377.md) · prefix leftover [`../residual-osf-next-prefix-after-dest-park-377.md`](../residual-osf-next-prefix-after-dest-park-377.md). Stand rule [`harness-tele-stand.md`](harness-tele-stand.md) — **next to** loc, **not on**.

**Tag:** **VERIFIED** = this-pass pack / unpack / jm2 / `probe-walkable.mjs` · **CANDIDATE** = host tele (not headed this pass) · **SUBTRACT** = dest invent / dest-to-range / dest-from-Sanfew / Lumbridge `cooksquestrange` **114** smoke / Taverley range invent / stew `cooking_generic` steal / POH kettle.

---

## One stand

**Tele `2989,3365,0` then Use `bowl_water` 1921 on loc `scenery_2728` 2728 @ L0 2988,3365 (`cooking_oven`). Do not stand on 2988,3365.**

Falador house west of the park. Same loc **category** live stew already heats on (`[oplocu,_cooking_oven]`). Not the stew **result**.

---

## Digest

1. **Live stew / kettle loc type is category, not stew product.** Stew *cook* is `uncooked_stew` → `stew` via `[oplocu,_cooking_oven]` / `[oplocu,_cooking_fire]` → `@attempt_cook_item` → `cooking_generic_stew` (XP **1170**, burn `burnt_stew`). **0** kettle heat in `skill_cooking`. POH `poh_kettle_*` / `poh_stove_*_kettle` is Construction after **377** — **SUBTRACT**. Copy **`lc_category(loc_type) = cooking_oven` or `cooking_fire`**. **Do not** add a `cooking_generic` row for `bowl_water` (that would steal stew cook / burn / XP).
2. **Use-bowl-on-range is `oplocu`, not stew inv mix.** Live `[opheldu,bowl_water]` is flour / clay / skins / Ahoy nettles / stew *ingredients* only. Heat click is Use **1921** on the loc → `[oplocu,_cooking_oven]` (today *You can't cook that.* until the leftover prefix). **Do not** rewrite stew.rs2.
3. **Pick is Falador generic `scenery_2728` 2728.** Unpack `cooking_sources.loc`: display **Range** · *Ideal for cooking on.* · `length=2` · `forceapproach=east` · **`category=cooking_oven`**. `loc.pack` `2728=scenery_2728`. jm2 **`==== LOC ====`** `0 44 37: 2728 10` → **L0 2988, 3365**. `range_icon` **2772** on **2988, 3366** (shape **22**, not stand).
4. **Stand CANDIDATE 2989, 3365 E.** `probe-walkable.mjs`: loc **2988,3365** `walkable=false` · stand **2989,3365** `walkable=true`. MAP both indoor `o123 f4`. Stand tile loc `scenery_11751` **11751** is floor deco (`blockwalk=no` · `active=no`). **Not** on the range. **Not** west **2987,3365** (MAP no indoor overlay — outside / wall). **Not** north **2988,3366** (icon + 2-length occupancy).
5. **Taverley near Sanfew has 0 packed range / fire.** Sanfew **454** unique **L1 2897, 3426** (`m45_53` NPC `1 17 34: 454`) · stand leftover **2897, 3427** L1. `m45_53` / `m45_54` / `m45_52` **`==== LOC ====`** have **0** `2728–2732` / **114** / `cooking_oven` / `cooking_fire`. Shelf `cookingshelfempty` **1023** is **not** heat. **Do not invent** a Taverley range. **Do not** dest-from-Sanfew.
6. **Do not smoke Lumbridge `cooksquestrange` 114 @ 3212, 3215.** Live `[oplocu,cooksquestrange]` is **stubbed** (Cook's Assistant intercept; `@attempt_cook_item` commented). Ahoy cook already used generic **2728** for that reason (**PASS** `ahteassj97qg` Varrock **3219,3388** — same category, **not** this pick). `newbierange` **3039** has **0** `category=`.
7. **Do not invent dest.** Unblock = tele **2989, 3365** / walk-in. Soft `setvar onesmallfavour 13` + `give bowl_water` = **toy**. Heat leftover writes **0** varp.
8. **Hunt 289? no.** Product stays **377**. **No product `.rs2`.**

---

## VERIFIED tiles

| Who / what | Pack | jm2 | World | Stand | Tag |
|------------|------|-----|-------|-------|-----|
| **Falador house range (THIS pick)** | loc **2728** `scenery_2728` · cat **`cooking_oven`** | `m46_52` **LOC** `0 44 37: 2728 10` | **L0 2988, 3365** | **CANDIDATE 2989, 3365** (E) | **VERIFIED** loc · stand probe-walkable |
| Range icon (no-stand) | loc **2772** `range_icon` | `0 44 38: 2772 22` | **L0 2988, 3366** | **not** this | **VERIFIED** |
| Floor deco on stand | loc **11751** `scenery_11751` | `0 45 37: 11751 22 3` | **L0 2989, 3365** | this tile · `blockwalk=no` | **VERIFIED** |
| Sanfew (false-adjacent) | NPC **454** `sanfew` | `m45_53` **NPC** `1 17 34: 454` | **L1 2897, 3426** | leftover **2897, 3427** L1 · **0** range on sheet | **VERIFIED** · **not** heat dest |
| Lumbridge cook-o-matic (do not smoke) | loc **114** `cooksquestrange` | `m50_50` **LOC** `0 12 15: 114 10 2` | **L0 3212, 3215** | **not** this heat | **VERIFIED** · `[oplocu]` stub |
| Varrock west (same category, not this pick) | **2728** | `m50_52` `0 19 60: 2728 10 1` | **L0 3219, 3388** | Ahoy used **3221,3388** (on `cookingshelves` **1013**; `teleTo` r=2) | **VERIFIED** loc · **not** this stand |

**Kettle:** **0** live heat script. POH kettle locs **SUBTRACT**.

---

## Live loc check (copy, do not steal stew)

| Live | What it is | Heat leftover copies? |
|------|------------|------------------------|
| `[oplocu,_cooking_oven]` | `cooking.rs2` → `@attempt_cook_item` | **Yes** — category / this trigger |
| `[oplocu,_cooking_fire]` | same; firearrow prefix first | **Yes** — category `cooking_fire` |
| `cooking_generic_stew` | `uncooked_stew` → `stew` / `burnt_stew` | **No** — stew **result** |
| `[opheldu,bowl_water]` stew cases | potato / meat → incomplete stew | **No** — inv mix, not heat |
| `[oplocu,cooksquestrange]` | Cook's Assistant stub | **No** — do not smoke **114** |
| POH kettle / stove | Construction after **377** | **No** |

Packed category debugnames for the generic range family: `scenery_2728`–`scenery_2731` (`cooking_oven`). Fires: `scenery_2724`–`scenery_2727` / `scenery_2732` (`cooking_fire`). This stand uses **`scenery_2728`**.

---

## Host / leftover STOP

| Do | Don’t |
|----|--------|
| Tele **2989, 3365** then Use **1921** on **2728** | Tele **on** **2988, 3365** / icon **2988, 3366** / shelves / walls |
| Copy `_cooking_oven` / `_cooking_fire` category | Steal stew `cooking_generic` / rewrite `stew.rs2` / add tea to `brew_potion.rs2` |
| Soft **13** + give **1921** as **toy** | Invent dest-to-range / dest-from-Sanfew / Taverley range spawn |
| Walk-in from Falador west bank | Smoke **114** / `newbierange` / POH kettle · hunt **289** |

*Game-knowledge only. Product stays 377. Cite brew leftovers; do not rewrite. Dest invent / stew steal / 114 smoke / Taverley range invent STOP. Hunt 289? no.*
