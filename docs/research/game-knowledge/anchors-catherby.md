# Anchors — Catherby (OSF Arhein weather-return)

**Date:** 2026-08-14  
**Product stays 377.** Hunt 289? **no**. **No product `.rs2`.**  
**Authority:** cache **657** product surface = `vendor/content/pack/` + `vendor/content/maps/m43_53.jm2` (`==== LOC ====` / `==== NPC ====` only). Formula: `world = (mapsquare << 6) + local`. **m43_53** origin **2752, 3392**.

**Cite, do not rewrite:** leftover return / consume essays [`../osf-arhein-weather-return-377.md`](../osf-arhein-weather-return-377.md) · [`../osf-arhein-weather-377.md`](../osf-arhein-weather-377.md) · shop-prefix pins [`../osf-arhein-after-bleemadge-next-377.md`](../osf-arhein-after-bleemadge-next-377.md) · [`../osf-arhein-after-bleemadge-377.md`](../osf-arhein-after-bleemadge-377.md). Stand **next to** NPC, **not on**.

**Tag:** **VERIFIED** = this-pass pack / unpack / jm2 · **CANDIDATE** = host tele (MAP-free L0, not headed) · **UNKNOWN** = consume (`inv_del` **4435**) · **SUBTRACT** = dest-to-Catherby / dest-to-White-Wolf / dest-to-Seers / `inv_add` **4435** / hawser obj.

---

## Digest

1. **Arhein is unique NPC `563` on L0 2803, 3430.** `npc.pack` `563=arhein` · unpack **Arhein** · *He looks fairly well-to-do.* · `op1=Talk-to` · `op3=Trade` · `vislevel=hide` · `category=shop_keeper` · `owned_shop=arheinstore` · title **Arhein Store** · `wanderrange=0` · `moverestrict=nomove`. jm2 **`==== NPC ====`** `0 51 38: 563`. Bare `: 563` is **unique** all maps. Other `: 563 10` are **LOC** `statue_king` — **not** this face.
2. **Stand CANDIDATE 2804, 3430 E.** MAP `0 52 38: h1 u50` · **0** L0 loc. Same height/underlay as the NPC tile (`0 51 38: h1 u50`). **Not** on NPC. L1 `1 52 38: 797 22` is `pier2` (ship deck) — **different level**, not the L0 stand.
3. **Do not stand west / south / north.** West **2802, 3430** = `fencing` **980** (`0 50 38: 980 1` · MAP `h1 f1 u50`). South **2803, 3429** = `woodensupport1` **1870** (`0 51 37: 1870 10 2`). North **2803, 3431** = `pier_rail` **814** (`0 51 39: 814 0`) + NPC `man` **1**. Shop icon **2803, 3432** = `general_store_icon` **2733** — **not** stand.
4. **Shop keep.** Live `[opnpc1,arhein]` **474** + Trade `[opnpc3,_shop_keeper]` — **keep**. Weather-return leftover is a **prefix** onto that shop 3-way after grant · **not** a dest · **not** a second Talk-to. **0** `[opnpcu,arhein]`.
5. **Gangplank `arhein_ship_on` 69 is presence only — not this hop dest.** `loc.pack` `69=arhein_ship_on` · unpack **Gangplank** · *Handy for boarding boats.* · `op1=Cross`. jm2 **`==== LOC ====`** `1 53 29: 69 10` → **L1 2805, 3421**. Off tiles `1 54 29: 70 10` / `1 55 29: 70 10` (`arhein_ship_off` **70**). Live `[oploc1,arhein_ship_on]` **5812** — **keep** · **not** weather-return dest.
6. **Neighbors are not Arhein.** `candle_maker` **562** `0 48 47: 562` → **L0 2800, 3439**. Dock `man` **1** on **2803, 3431** / **2805, 3428**. Bankers **494/495** further NE. **Do not** bind return / hawser onto those Talk-tos. Phantuwti **1798** / `pilot_white_wolf` **3810** live on **other** maps — walk-in, **not** dest-from here.
7. **Do not invent dest / 4435 grant / hawser.** `favour_weather_report` **4435** is packed obj only (*Weather report* · `iop1=Read` · `members=yes`) — **STOP grant** this file · **not** a tile. **0** `[opheld1,favour_weather_report]`. T.R.A.S.H. hawser / trash / aero obj **ABSENT** `obj.pack`. Dest-to-Catherby / dest-to-White-Wolf / dest-to-Seers = **SUBTRACT**. Unblock = tele **2804, 3430** / walk-in.
8. **Consume is not leftover-proven.** Compact pin [`../osf-arhein-weather-return-377.md`](../osf-arhein-weather-return-377.md) keeps `inv_del` **4435** **UNKNOWN**. This file is tiles only. Hunt 289? **no**. **No product `.rs2`.**

---

## VERIFIED tiles

| Who / what | Pack | jm2 (`m43_53`) | World | Stand | Tag |
|------------|------|----------------|-------|-------|-----|
| **Arhein** | NPC **563** `arhein` | **NPC** `0 51 38: 563` | **L0 2803, 3430** | **CANDIDATE 2804, 3430** (E) | **VERIFIED** unique spawn · stand MAP-free L0 |
| East stand (MAP) | — | MAP `0 52 38: h1 u50` · **0** L0 loc | **L0 2804, 3430** | this tile | **CANDIDATE** tele |
| West fence (no-stand) | loc **980** `fencing` | **LOC** `0 50 38: 980 1` | **L0 2802, 3430** | **not** this | **VERIFIED** |
| South support (no-stand) | loc **1870** `woodensupport1` | **LOC** `0 51 37: 1870 10 2` | **L0 2803, 3429** | **not** this | **VERIFIED** |
| North rail + man (no-stand) | loc **814** `pier_rail` · NPC **1** `man` | **LOC** `0 51 39: 814 0` · **NPC** `0 51 39: 1` | **L0 2803, 3431** | **not** this | **VERIFIED** |
| Shop icon (no-stand) | loc **2733** `general_store_icon` | **LOC** `0 51 40: 2733 22 3` | **L0 2803, 3432** | **not** this | **VERIFIED** |
| L1 pier over east (not stand) | loc **797** `pier2` | **LOC** `1 52 38: 797 22` | **L1 2804, 3430** | **not** L0 stand | **VERIFIED** other level |
| **Gangplank on** | loc **69** `arhein_ship_on` | **LOC** `1 53 29: 69 10` | **L1 2805, 3421** | presence only | **VERIFIED** loc · **not** this hop dest |
| Gangplank off | loc **70** `arhein_ship_off` | `1 54 29: 70 10` · `1 55 29: 70 10` | **L1 2806/2807, 3421** | presence only | **VERIFIED** · **not** dest |
| Candle maker (false-adjacent) | NPC **562** `candle_maker` | **NPC** `0 48 47: 562` | **L0 2800, 3439** | **not** Arhein | **VERIFIED** · **not** OSF return |
| Dock man (other) | NPC **1** `man` | **NPC** `0 53 36: 1` | **L0 2805, 3428** | **not** Arhein | **VERIFIED** |
| False loc **563** | loc **563** `statue_king` | other maps `: 563 10` **before** `==== NPC ====` | — | — | **VERIFIED** loc-only · **not** this NPC |

**Weather report `4435`:** packed obj only — **STOP grant** this file. **Not** a tile. **Hawser obj:** **ABSENT** — **STOP invent**.

---

## Host / leftover STOP

| Do | Don’t |
|----|--------|
| Tele **2804, 3430** then Talk-to **563** | Tele **on** **2803, 3430** / fence **2802, 3430** / support **2803, 3429** / rail+man **2803, 3431** |
| Keep live shop / Trade / crate / ship / trail / **14→15** | Invent dest-to-Catherby / dest-to-White-Wolf / dest-to-Seers / dest-to-Feldip |
| Treat **69** as live scenery only | Use gangplank as weather-return dest / rewrite `[oploc1,arhein_ship_on]` |
| Show **4435** only after grant leftover | `inv_add` **4435** · invent hawser / trash / aero obj · claim `inv_del` leftover-proven |
| Walk-in from Seers / White Wolf | Bind return onto `candle_maker` / `man` / bankers · hunt **289** |

*Game-knowledge only. Product stays 377. Cite leftover essays; do not rewrite. Dest-to-Catherby / dest-to-White-Wolf / dest-to-Seers / 4435 grant / hawser invent STOP. Hunt 289? no.*
