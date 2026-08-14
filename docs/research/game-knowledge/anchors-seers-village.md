# Anchors — Seers Village (OSF vane commute)

**Date:** 2026-08-14  
**Product stays 377.** Hunt 289? **no**. **No product `.rs2`.**  
**Authority:** cache **657** product surface = `vendor/content/pack/` + `vendor/content/maps/m42_54.jm2` (`==== LOC ====` / `==== NPC ====` only). Formula: `world = (mapsquare << 6) + local`. **m42_54** origin **2688, 3456**.

**Cite, do not rewrite:** leftover vane / commute essays [`../osf-weather-vane-377.md`](../osf-weather-vane-377.md) · [`../osf-seers-after-petra-377.md`](../osf-seers-after-petra-377.md) · [`../osf-weather-vane-fix-377.md`](../osf-weather-vane-fix-377.md) · [`../osf-phantuwti-weather-377.md`](../osf-phantuwti-weather-377.md). Stand rule [`harness-tele-stand.md`](harness-tele-stand.md) — **next to** loc/NPC, **not on**.

**Tag:** **VERIFIED** = this-pass pack / unpack / jm2 · **CANDIDATE** = host tele (MAP-free / roof walk, not headed) · **UNKNOWN** = **5812 / 5835 dest** (no `[oploc1]` in `script.pack`) · **SUBTRACT** = dest invent / dest-to-roof / spawn **5813** / `inv_add` **4435**.

---

## Digest

1. **Phantuwti is unique NPC `1798` on L0 2705, 3474.** `npc.pack` `1798=favour_phantuwti_farsight` · unpack **Phantuwti Fanstuwi Farsight** · `op1=Talk-to`. jm2 **`==== NPC ====`** `0 17 18: 1798`. Bare `: 1798` elsewhere is **LOC** `dugupsoil1_squished` (`m37_73`) — **not** this face. Stand **CANDIDATE 2704, 3473** (SW; MAP `0 16 17` indoor, **0** loc). **Not** on NPC (torch **196** shares the spawn tile). **Not** on seer / chair **1088** **2704, 3474**.
2. **Vane is unique multi `5811` on L3 2702, 3476.** `loc.pack` `5811=osf_weathervane` · `multivar=weathervanefixed` · `0`=`favour_weathervane_broken` **5809** (Look / Search) · `1`=`favour_weathervane` **5810** (no ops). jm2 **`==== LOC ====`** `3 14 20: 5811 10` (unique `: 5811`). Stand **CANDIDATE 2702, 3475 L3** (S; roof `favour_low_detail_roof` **5834**). **Do not** stand on loc. **L0 2702, 3475** is house **seer 388** — different level.
3. **House commute is live `1747` / `1746` at 2715, 3470 L0↔L1.** `0 27 14: 1747 10` / `1 27 14: 1746 10`. Live `ladders.rs2` default **+1 / −1** same stack — **keep**. Other `1747` on this map (**2728, 3491** / **2747, 3493** / **2749, 3491 L1**) are **other buildings**. House west **1750 / 1749** **2699, 3476** L0↔L1 — **keep**, **not** roof.
4. **Roof stack is `5812` up + `5835` down at 2715, 3472.** `1 27 16: 5812 10 3` → **L1** · `3 27 16: 5835 22` → **L3**. Unpack: **5812** Climb-up `forceapproach=north` · **5835** Trapdoor Climb-down. **0** `[oploc1,ladder_5812]` / **0** `[oploc1,trapdoor_5835]` in `script.pack` → dest **UNKNOWN**. **Do not invent dest-to-roof.** Walk-in: live **1747** → L1 → **5812** → walk **west** on **5834** to vane stand.
5. **`favour_seer_laddertop` 5813 is pack-only.** `: 5813` **ABSENT** all maps **`==== LOC ====`**. Roof down is **5835**. **Do not spawn 5813.**
6. **Seers smith anvils are loc `2783=anvil` (not UNKNOWN).** Unpack display **Anvil** · *Used for fashioning metal items.* Live `[oplocu,anvil]` **10032** — **keep**. jm2 cluster: **`0 24 39: 2783 10` → L0 2712, 3495** · **`0 25 36: 2783 10 2` → L0 2713, 3492** · **`0 26 39: 2783 10` → L0 2714, 3495**. **Do not** dest-tele roof ↔ anvil. Walk north from house after **5835** / **1746**. Stand **next to**, not on loc (anvil tiles share torch / wall / `blacksmiths_tools` **2784**).
7. **Do not invent dest / 4435 grant.** `favour_weather_report` **4435** is packed, **not** a Seers dest and **not** granted from these tiles. Fairy **AKQ** / Seers rooftop **36** / dest-to-**2702, 3476** / dest-to-**2712, 3495** = **SUBTRACT**.
8. **House seer is not Phantuwti.** `seer` **388** · *Could do with a shave...* · live `seer.rs2` Scorpion Catcher. Same house: **2705, 3473** (S of Phantuwti) + **2702, 3475** (W). **Do not** bind OSF vane / forecast onto `[opnpc1,seer]`.

---

## VERIFIED tiles

| Who / what | Pack | jm2 (`m42_54`) | World | Stand | Tag |
|------------|------|----------------|-------|-------|-----|
| **Phantuwti** | NPC **1798** `favour_phantuwti_farsight` | **NPC** `0 17 18: 1798` | **L0 2705, 3474** | **CANDIDATE 2704, 3473** (SW) | **VERIFIED** spawn · stand MAP-free |
| House seer (false-adjacent) | NPC **388** `seer` | **NPC** `0 17 17: 388` · `0 14 19: 388` | **L0 2705, 3473** · **L0 2702, 3475** | **not** these (on NPC) | **VERIFIED** · **not** OSF Talk-to |
| **Vane multi** | loc **5811** `osf_weathervane` | **LOC** `3 14 20: 5811 10` | **L3 2702, 3476** | **CANDIDATE 2702, 3475 L3** (S) | **VERIFIED** unique `: 5811` |
| Roof walk (presence) | loc **5834** `favour_low_detail_roof` | `3 14 19: 5834 22 1` … `3 27 15: 5834 22 2` | L3 west from **2715, 3471** | not on vane / not on **5835** | **VERIFIED** loc · **not** dest |
| Spinning-wheel **up** | loc **1747** `ladder_1747` | **LOC** `0 27 14: 1747 10` | **L0 2715, 3470** | next to loc | **VERIFIED** · live dest **+1** **keep** |
| Spinning-wheel **down** | loc **1746** `ladder` | **LOC** `1 27 14: 1746 10` | **L1 2715, 3470** | next to loc | **VERIFIED** · live dest **−1** **keep** |
| House west **up / down** | **1750 / 1749** | `0 11 20: 1750 10 2` · `1 11 20: 1749 10 2` | **L0/L1 2699, 3476** | next to loc | **VERIFIED** · **not** roof |
| Roof **up** | loc **5812** `ladder_5812` | **LOC** `1 27 16: 5812 10 3` | **L1 2715, 3472** | next to · dest **UNKNOWN** | **VERIFIED** loc · **do not invent dest** |
| Roof **down** | loc **5835** `trapdoor_5835` | **LOC** `3 27 16: 5835 22` | **L3 2715, 3472** | **not** on trapdoor · dest **UNKNOWN** | **VERIFIED** loc · **do not invent dest** |
| Packed roof-down ladder | loc **5813** `favour_seer_laddertop` | **ABSENT** all `==== LOC ====` | — | — | **VERIFIED** pack-only · **do not spawn** |
| **Seers anvil** (vane parts) | loc **2783** `anvil` | **LOC** `0 24 39: 2783 10` | **L0 2712, 3495** | next to (not on) | **VERIFIED** |
| Seers anvil (same shop) | **2783** | `0 25 36: 2783 10 2` · `0 26 39: 2783 10` | **L0 2713, 3492** · **L0 2714, 3495** | next to | **VERIFIED** cluster |
| Spinning wheel (house L1) | loc **2644** `spinning_wheel` | `1 22 15: 2644 10 3` | **L1 2710, 3471** | next to | **VERIFIED** · **not** vane dest |

**Weather report `4435`:** packed obj only — **STOP grant** this file. **Not** a tile.

---

## Host / leftover STOP

| Do | Don’t |
|----|--------|
| Tele **2704, 3473** then Talk-to **1798** | Tele **on** **2705, 3474** / chair **2704, 3474** / seer tiles |
| Tele **2702, 3475 L3** then op vane **5811** | Tele **on** **2702, 3476** · confuse with L0 seer **2702, 3475** |
| Walk live **1747 → 5812 → west** | Invent dest-to-roof / rewrite `ladders.rs2` **1746/1747** landing onto the vane |
| Walk house → smith **2712, 3495** cluster for anvil parts | Dest-tele anvil / dest-tele **4435** / dest-tele Seers from Petra / Cromperty |
| Keep `[opnpc1,seer]` / `[oplocu,anvil]` | Spawn **5813** · grant **4435** · hunt **289** |

*Game-knowledge only. Product stays 377. Cite leftover essays; do not rewrite. Dest-to-roof / 5813 spawn / 4435 grant STOP. Hunt 289? no.*
