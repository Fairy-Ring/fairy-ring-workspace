# Anchors — White Wolf peak (OSF Bleemadge unwind)

**Date:** 2026-08-14  
**Product stays 377.** Hunt 289? **no**. **No product `.rs2`.**  
**Authority:** cache **657** product surface = `vendor/content/pack/` + `vendor/content/maps/m44_54.jm2` (`==== LOC ====` / `==== NPC ====` only). Formula: `world = (mapsquare << 6) + local`. **m44_54** origin **2816, 3456**.

**Cite, do not rewrite:** unwind leftover [`../osf-bleemadge-unwind-377.md`](../osf-bleemadge-unwind-377.md) · tea prefix [`../osf-bleemadge-after-gnome-377.md`](../osf-bleemadge-after-gnome-377.md) · hop leftover [`../osf-bleemadge-gnome-pilot-377.md`](../osf-bleemadge-gnome-pilot-377.md) · rematch leftover [`../osf-bleemadge-tea-rebuy-377.md`](../osf-bleemadge-tea-rebuy-377.md). Same-face / pack pin [`../osf-gnome-pilot-after-sanfew-377.md`](../osf-gnome-pilot-after-sanfew-377.md) · [`../osf-white-wolf-gnome-377.md`](../osf-white-wolf-gnome-377.md). Stand rule [`harness-tele-stand.md`](harness-tele-stand.md) — **next to** NPC, **not on**.

**Tag:** **VERIFIED** = this-pass pack / unpack / jm2 · **CANDIDATE** = host tele (MAP-free L0, not headed) · **SUBTRACT** = dest-to-White-Wolf / dest-to-Feldip / dest-to-**2847, 3499** / unlock **5825** / hawser obj.

---

## Digest

1. **`pilot_white_wolf` 3810 is unique NPC L0 2847, 3499.** `npc.pack` `3810=pilot_white_wolf` · unpack **Captain Bleemadge** · *Huzzah!* · `op1=Talk-to` · `vislevel=hide` · **no** Trade · `wanderrange` **ABSENT** (engine default **5**). jm2 **`==== NPC ====`** `0 31 43: 3810`. Bare `: 3810` in NPC sections is **unique**. Other `: 3810` is **LOC** `eadgar_storeroomdoor` on `m44_157` (`0 53 37: 3810 0 3` **before** `==== NPC ====`) — **not** this face.
2. **Stand CANDIDATE 2847, 3498 S.** MAP `0 31 42: h227 u58` · **0** loc. **Not** on NPC (`0 31 43: h237 u58`). **Not** on `gnome_glider` **187** @ **2848, 3499**. Hunt 289? **no**.
3. **Do not stand east / west / north.** East **2848, 3499** = `gnome_glider` **187** (`0 32 43: 187 10`) + icon **773** (`gnomeglider_icon3`). Unpack loc **187** *Fly Gnome Air.* · `width=4` `length=4`. West **2846, 3499** = `snow2` **560**. North **2847, 3500** = `snow2` **560**. SW **2846, 3498** = `snow3` **561**.
4. **Live Talk-to is gnome air + shipped OSF prefixes — keep.** `[opnpc1,pilot_white_wolf]` **870** → `gnome_glider.rs2`. Live `glidermap` dests stay **five** T.R.A.S.H. letters: **Gandius · Ta Quir Priw · Sindarpos · Lemanto Andra · Kar-Hewo** (`com_26`–`com_30`). **0** dest-to-Feldip. **0** dest-to-**2847, 3499**. Unwind leftover owns *did you get your T.R.A.S.H?* — **cite, do not rewrite**.
5. **Sindarpos is already the peak dest — not an invent.** `^sindarpos = 0_44_54_34_41` → **L0 2850, 3497**. `calc_gliderstart` inzones that pad. **Do not** add a sixth dest / dest-to-NPC / dest-to-Catherby / dest-to-Taverley. Fly **from** the peak uses live **Sindarpos → Ta Quir Priw** only (hub hops).
6. **`favour_gnome_glider` 5825 is Feldip scenery — STOP dest.** `loc.pack` `5825=favour_gnome_glider` · jm2 `m39_46` `==== LOC ====` `0 44 26: 5825 10 3` → **L0 2540, 2970**. **0** packed ops on this leftover. **Do not** bind unwind / tea / T.R.A.S.H. onto **5825**.
7. **Neighbors are not Bleemadge.** Same square: `pack_wolf_whiter` **142** (nearest `0 21 43` → **2837, 3499**), `wolfpack_leader_whiter` **141**, `whitewolf` **97**, `whitewolf_sentry` **96**, `icewarrior` **125**. Other pilots **3809 / 3811 / 3812 / 170** live on **other** maps. Mountain Daughter `mdaughter_white_pearl_bush` **5856** `0 33 41` → **2849, 3497** — **not** OSF. **0** second White Wolf gnome (`favour_gnome` / `osf_gnome` **ABSENT**).
8. **Do not invent dest / hawser / 5825 unlock.** T.R.A.S.H. hawser / trash / aero obj **ABSENT** `obj.pack`. Dest-to-White-Wolf / dest-to-Feldip / dest-to-**2847, 3499** = **SUBTRACT**. Unblock = tele **2847, 3498** / walk-in. Hunt 289? **no**. **No product `.rs2`.**

---

## VERIFIED tiles

| Who / what | Pack | jm2 (`m44_54` unless noted) | World | Stand | Tag |
|------------|------|------------------------------|-------|-------|-----|
| **Captain Bleemadge** | NPC **3810** `pilot_white_wolf` | **NPC** `0 31 43: 3810` | **L0 2847, 3499** | **CANDIDATE 2847, 3498** (S) | **VERIFIED** unique NPC spawn · stand MAP-free L0 |
| South stand (MAP) | — | MAP `0 31 42: h227 u58` · **0** loc | **L0 2847, 3498** | this tile | **CANDIDATE** tele |
| **Gnome glider** (no-stand) | loc **187** `gnome_glider` | **LOC** `0 32 43: 187 10` | **L0 2848, 3499** | **not** this | **VERIFIED** loc · **keep** |
| Glider icon (no-stand) | loc **773** `gnomeglider_icon3` | **LOC** `0 32 43: 773 22` | **L0 2848, 3499** | **not** this | **VERIFIED** |
| West snow (no-stand) | loc **560** `snow2` | **LOC** `0 30 43: 560 22 3` | **L0 2846, 3499** | **not** this | **VERIFIED** |
| North snow (no-stand) | loc **560** `snow2` | **LOC** `0 31 44: 560 22 1` | **L0 2847, 3500** | **not** this | **VERIFIED** |
| SW snow (no-stand) | loc **561** `snow3` | **LOC** `0 30 42: 561 22 1` | **L0 2846, 3498** | **not** this | **VERIFIED** |
| Live **Sindarpos** pad | `^sindarpos` | `0_44_54_34_41` (constant) | **L0 2850, 3497** | live T.R.A.S.H. dest **KEEP** | **VERIFIED** · **not** dest-to-NPC |
| Pearl bush (false-adjacent) | loc **5856** `mdaughter_white_pearl_bush` | **LOC** `0 33 41: 5856 10` | **L0 2849, 3497** | **not** OSF | **VERIFIED** Mountain Daughter |
| White wolf (false-adjacent) | NPC **142** `pack_wolf_whiter` | **NPC** `0 21 43: 142` | **L0 2837, 3499** | **not** Bleemadge | **VERIFIED** |
| False loc **3810** | loc **3810** `eadgar_storeroomdoor` | `m44_157` `0 53 37: 3810 0 3` **before** `==== NPC ====` | — | — | **VERIFIED** loc-only · **not** this NPC |
| Feldip OSF glider | loc **5825** `favour_gnome_glider` | `m39_46` **LOC** `0 44 26: 5825 10 3` | **L0 2540, 2970** | **STOP dest** | **VERIFIED** other map · **0** ops this leftover |

**Other `gnome_glider` 187 (not this peak):** `m46_46` `0 28 21: 187 10 1` (Gandius) · `m51_50` `0 16 11: 187 10` (Kar-Hewo). **Do not** bind unwind onto those Talk-tos / locs.

**Live `glidermap` dests (KEEP — five letters only):**

| Letter / const | Coord | World |
|----------------|-------|-------|
| **Gandius** `^gandius` | `0_46_46_27_25` | **L0 2971, 2969** |
| **Ta Quir Priw** `^ta_quir_priw` | `3_38_54_33_45` | **L3 2465, 3501** |
| **Sindarpos** `^sindarpos` | `0_44_54_34_41` | **L0 2850, 3497** |
| **Lemanto Andra** `^lemanto_andra` | `0_51_53_56_38` | **L0 3320, 3430** |
| **Kar-Hewo** `^kar_hewo` | `0_51_50_20_11` | **L0 3284, 3211** |

**Hawser / trash / aero obj:** **ABSENT** `obj.pack` — **STOP invent**. **Not** a tile.

---

## Host / leftover STOP

| Do | Don’t |
|----|--------|
| Tele **2847, 3498** then Talk-to **3810** | Tele **on** **2847, 3499** / glider **2848, 3499** / snow **2846, 3499** / **2847, 3500** |
| Keep live gnome air / `glidermap` five dests / tea **13→14** | Invent dest-to-White-Wolf / dest-to-Feldip / dest-to-**2847, 3499** / dest-to-Catherby / dest-to-Taverley |
| Treat **187** as live scenery; **Sindarpos** as live pad | Rewrite `gnome_glider.rs2` dests · unlock **5825** · add a sixth letter |
| Walk-in from Catherby / Taverley | Bind unwind onto wolves / other pilots / pearl bush / `eadgar_storeroomdoor` · hunt **289** |
| Cite `osf-bleemadge-*.md` leftovers | Invent hawser obj · claim dest commute is leftover-proven |

*Game-knowledge only. Product stays 377. Cite leftover essays; do not rewrite. Dest-to-White-Wolf / dest-to-Feldip / 5825 unlock / hawser invent STOP. Hunt 289? no.*
