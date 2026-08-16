# Game-knowledge anchors — Champions' Guild / Champions' Challenge (377)

**Date:** 2026-08-15  
**Use:** Harness tele **next to** Larxus, not on the NPC / not on the statue loc. Climb-down dest is the **Imp pit tile** — reuse for every remaining race.  
**Product stays 377.** Hunt 289? **no**. Docs only this file. **No product `.rs2`.** Word: **residual**.

**Parents (cite — do not rewrite):** XL § A [`../xl-minigames-remaining-impl-377.md`](../xl-minigames-remaining-impl-377.md) · Imp leftover product [`../champions-imp-product-377.md`](../champions-imp-product-377.md) · Imp leftover [`../champions-imp-377.md`](../champions-imp-377.md) · after Imp [`../champions-after-imp-377.md`](../champions-after-imp-377.md) · dest rule [`../dest-from-our-maps-377.md`](../dest-from-our-maps-377.md) · remesure [`../dest-from-our-maps-remaining-377.md`](../dest-from-our-maps-remaining-377.md) · dest index [`../dest-cite-index-377.md`](../dest-cite-index-377.md) · stand rule [`harness-tele-stand.md`](harness-tele-stand.md) · Larxus first-slice [`../champions-larxus-first-slice-377.md`](../champions-larxus-first-slice-377.md) · Imp combat ledger [`../champions-imp-combat-2007base-377.md`](../champions-imp-combat-2007base-377.md) · jm2 formula [`../map-npc-spawns-jm2-377.md`](../map-npc-spawns-jm2-377.md)

**Tag:** **VERIFIED** = headed smoke `teleTo` / Climb-down **PASS**, or this-tree `loc.pack` / `_unpack/377` / `m49_152.jm2` / `m49_52.jm2` · **CANDIDATE** = dest-cite leftover floor or packed Climb dest already shipped · **PARK** = occupancy-only (no dest). Dest-cite leftover “UNKNOWN” pit centroid is **stale** vs dest-cite / dest-from-maps — do **not** re-park **3168,9758**.

---

## World formula

`world = mx×64 + local`. Basement `m49_152` origin **3136, 9728**. Surface guild `m49_52` origin **3136, 3328**.

Leftover coords in `vendor/content/scripts/minigames/game_champion_challenge/config/champions.constant`:

| Constant | Coord | World |
|----------|-------|-------|
| `^champions_statue` | `0_49_152_48_30` | **3184,9758 L0** |
| `^champions_statue_l1` | `1_49_152_48_30` | **3184,9758 L1** |
| `^champions_imp_spawn` | `0_49_152_32_30` | **3168,9758 L0** |
| `^champions_gallery_stand` | `0_49_152_50_30` | **3186,9758 L0** |

---

## Headed smoke path (reuse every race)

Smokes: `tools/harness/quest-champions-imp-leftover-smoke.mjs` and `quest-champions-{goblin,skeleton,zombie,giant,hobgoblin,ghoul,earthwarrior,jogre,lesserdemon}-smoke.mjs`. All tele **`{ x: 3186, z: 9758, level: 0 }`**, click statue **3184,9758** loc **10557** then **10556**. Soft `give` is a **toy**. leftover **15831** / **2804** stay **closed**.

| Role | Tile | Cite | Tag |
|------|------|------|-----|
| **Larxus** NPC `champions_doorman` **3050** | **3187,9758 L0** | `m49_152` NPC `0 51 30: 3050`. Unpack `name=Larxus` · *Not the smartest of butlers.* · `op1=Talk-to` · `vislevel=hide`. `npc.pack` `3050=champions_doorman`. | **VERIFIED** spawn + unpack |
| **Stand (tele / Use-scroll)** | **3186,9758 L0** | West of Larxus. Same cell as `^champions_gallery_stand`. Headed **PASS** `chimpsuhe94u` · Goblin `chgobsuv984e` · Skeleton `chsklsuvewz2` · Zombie `chzomsuvmbe6`. Fallback **3187,9757** (S) is first-slice only — smokes do **not** use it. | **VERIFIED** headed |
| **Statue trap loc** | **3184,9758** | `loc.pack` `10556=champions_statue_trap` · `10557=champions_statue_trap_open`. Unpack `op1=Open` / `op1=Climb-down`. jm2 static row is **L1** `1 48 30: 10556 10 1`. Live headed loc is **L0** (same x,z) — product `loc_find` tries `^champions_statue` then `^champions_statue_l1`. **10557** is runtime `loc_change` (**0** jm2). | **VERIFIED** pack + jm2 + live L0 |
| **Pit dest / spawn** | **3168,9758 L0** | `[oploc1,champions_statue_trap_open]` `p_telejump(^champions_imp_spawn)`. dest-from-maps remesure: `PathFinder.walkable` **true** (open floor `0 32 30: h30 u124`). dest-cite leftover pit-loc centroid. Reuse Imp for every remaining race. **0** static `==== NPC ====` **3062**. | **CANDIDATE** dest · **VERIFIED** walkable + headed Climb |
| **Gallery dest** (Climb-up **10554**) | **3186,9758 L0** | `[oploc1,champions_arenaladder]` `p_telejump(^champions_gallery_stand)`. Packed Climb-up + dest-side gallery room + headed `teleTo` same tile. **Not** a second pit. | **CANDIDATE** dest · tile **VERIFIED** as stand |

```js
const LARXUS = { x: 3186, z: 9758, level: 0 }; // stand — not on NPC 3187,9758
const STATUE = { x: 3184, z: 9758 };           // loc 10556/10557 — do not teleTo
const PIT = { x: 3168, z: 9758, level: 0 };    // dest after Climb-down — reuse Imp
await teleTo(page, LARXUS, 2, 25_000);
```

```bash
bun "$RS2_R377_ROOT/tools/harness/nav/tools/probe-walkable.mjs" \
  3186,9758,0 3187,9758,0 3184,9758,0 3184,9758,1 3168,9758,0 3183,9758,0
```

Remesure already on dest-from-maps remaining: **3168,9758 L0** `walkable` **true**. Do **not** remesure a second pit dest.

---

## Dest (keep shipped — do not invent a second tile)

Rule: packed op + dest-side room on jm2 + `PathFinder.walkable` + stand **next to** a blocked loc. Occupancy ≠ dest. Wiki `(x,z)` is **not** a cite.

| Hop | Dest | `p_tele*`? |
|-----|------|------------|
| Statue **10557** Climb-down | **3168,9758 L0** (`^champions_imp_spawn`) | **yes** CANDIDATE — dest-cite + remesure + Imp **PASS** `chimpsuhe94u`. Do **not** re-park. Do **not** invent a second pit. |
| Arena ladder **10554** Climb-up | **3186,9758 L0** (`^champions_gallery_stand`) | **yes** CANDIDATE — leftover constant + packed Climb-up. Same tile as Larxus stand. |
| Surface trapdoor **10558** | dest-cite leftover pair **3190,9758 L1** (next to **10560**) · product also shipped generic `z±6400` (lands **3190,9755 L0**) | **yes** CANDIDATE on dest-cite — **not** a Challenge smoke dest (smokes `teleTo` basement). Prefer pair **3190,9758 L1** if rewriting. Do **not** invent a third square. |
| Leftover statue pair **10556** ↔ **10554** | loc tiles **3184,9758 L1** ↔ **3183,9758 L0** | dest-cite same class as **10558**. Product Climb-down already hops to the **pit**, not onto **10554**. Do **not** re-park. Do **not** swap pit dest to **3183,9758**. |

---

## Nearby — occupancy **PARK** / not this dest

| Who / loc | Tile | Why out |
|-----------|------|---------|
| Larxus NPC tile | **3187,9758 L0** | Do **not** `teleTo` on the NPC |
| Inert statue `champions_statue` **10555** | **3182,9758 L1** (`1 46 30`) | `active=no` · **0** op |
| Arena ladder loc **10554** | **3183,9758 L0** (`0 47 30`) | Climb-up **from** here · unpack `forceapproach=south` · **not** Climb-down dest |
| Portcullis **10553** | **3181,9758 L0** (`0 45 30`) | `op1=Open` gate · **not** dest |
| Surface trapdoor **10558** | **3190,3355 L0** (`m49_52` `0 54 27: 10558 22`) | Guild access loc · **not** smoke stand |
| Basement ladder **10560** | **3190,9758 L1** (`1 54 30`) | Surface return loc · dest-cite pair |
| Mystery `*_champofchamps` **3051–3056** | throne ring (e.g. **3051** **3168,9765**) | Ambient · **0** Talk-to · **not** fights · occupancy **PARK** |
| Pit scenery **10538/10539** | L1 gallery / rail band | leftover `active=no` · **0** `dest=` · occupancy **PARK** |
| Imp banner root **10573** | **3170,9777 L1** | leftover `multivar` · **not** dest |
| Bank chest **10562** | **0** `m49_152` LOC | dest / loot **EXHAUSTED** (xl-minigames A.3) |
| `championdoor` | guild floor | Classic **32 QP** entry · **not** Challenge dest |
| Leon D'Cour `champions_human` **3067** | **0** static NPC | **later / EXHAUSTED** · **STOP** dest invent |

Race champions (`champions_imp` **3062** …) spawn at runtime from `npc_add` around `^champions_imp_spawn`. **0** static pit rows.

---

## STOP

| Stop | Why |
|------|-----|
| leftover parchment **15831** | Victory chrome · Imp + later races shipped **closed** (titles as `mes` only) |
| leftover Fight Pit HUD **2804** | `tzhaar_fightpit_remaining` · **never** from this basement |
| Leon dest invent | A.3 later / EXHAUSTED · **0** static spawn · **0** period dest |
| Second pit tile | dest-cite: matching **3168,9758** only |
| Wiki `(x,z)` | dest-from-maps: our jm2 + `collision.lcnav` only |
| Hunt **289** / flip **410** | product stays **377** |
| Soft `give` / `teleTo` as authenticity | toy · label **SOFT** |
| `championdoor` / Dad / TzHaar-Xil-Huz as this mid | other surfaces |

**PASS (headed, already):** stand **3186,9758** · Use-scroll Larxus · statue **10557** Climb-down · land **3168,9758** · kill · leftover **15831** / **2804** closed.  
**PASS forbidden:** leftover **15831** / **2804** open · dest invent · Leon dest.

```bash
rg -n '3050=champions_doorman|10556=champions_statue_trap|10557=champions_statue_trap_open' \
  "$RS2_R377_ROOT/vendor/content/pack/npc.pack" \
  "$RS2_R377_ROOT/vendor/content/pack/loc.pack"
rg -n '0 51 30: 3050|1 48 30: 10556|0 47 30: 10554|1 54 30: 10560' \
  "$RS2_R377_ROOT/vendor/content/maps/m49_152.jm2"
rg -n '0 54 27: 10558' "$RS2_R377_ROOT/vendor/content/maps/m49_52.jm2"
```

Expect: pack **3050** / **10556** / **10557**; basement Larxus + statue L1 + arena ladder + **10560**; surface **10558**. NPC section **0** **3062**.

---

| Date | Note |
|------|------|
| 2026-08-15 | Pin stand **3186,9758 L0**. Statue loc **3184,9758** (**10556/10557**, live **L0**). Pit dest **CANDIDATE 3168,9758 L0** (reuse Imp). Gallery dest **CANDIDATE** `^champions_gallery_stand` **3186,9758 L0**. Occupancy **PARK**. **STOP** **15831** / **2804** / Leon dest invent. Hunt 289? **no**. |

*Research only. Product stays 377. Hunt 289? no.*
