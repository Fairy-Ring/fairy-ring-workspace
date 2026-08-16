# Game-knowledge anchors — Mage Training Arena (377)

**Date:** 2026-08-15  
**Use:** Harness tele **next to** hall portals / Rewards / Entrance Guardian, not on the loc or size-2 NPC. Room dests are the **four shipped `p_teleport` tiles** only.  
**Product stays 377.** Hunt 289? **no**. Docs only this file. **No product `.rs2`.** Word: **residual**.

**Parents (cite — do not rewrite):** XL § D.3 [`../xl-minigames-remaining-impl-377.md`](../xl-minigames-remaining-impl-377.md) · dest index [`../dest-cite-index-377.md`](../dest-cite-index-377.md) · dest-from-maps [`../dest-from-our-maps-377.md`](../dest-from-our-maps-377.md) · remesure [`../dest-from-our-maps-remaining-377.md`](../dest-from-our-maps-remaining-377.md) · leftover chrome [`../residual-if-mta-pizazz-377.md`](../residual-if-mta-pizazz-377.md) · shop first mid [`../mta-first-product-slice-377.md`](../mta-first-product-slice-377.md) · Telekinetic leftover [`../mta-telekinetic-next-377.md`](../mta-telekinetic-next-377.md) · Alchemy Enter [`../mta-alchemist-first-slice-377.md`](../mta-alchemist-first-slice-377.md) · Alchemy look-at [`../mta-alchemy-look-377.md`](../mta-alchemy-look-377.md) · Enchantment leftover [`../mta-enchant-377.md`](../mta-enchant-377.md) · stand rule [`harness-tele-stand.md`](harness-tele-stand.md) · jm2 formula [`../map-npc-spawns-jm2-377.md`](../map-npc-spawns-jm2-377.md)

**Tag:** **VERIFIED** = this-tree `loc.pack` / `_unpack/377` / jm2 / live `mta_rooms.rs2` / headed **PASS** · **CANDIDATE** = next-to stand not yet headed, or dest-cite “keep shipped” join · **PARK** = occupancy only (not dest) · leftover dummy **9999** / **999** / **99999** / **999999** are chrome, **not** rates.

Official day [*Update: Mage Training Arena*](https://oldschool.runescape.wiki/w/Update:Mage_Training_Arena) **4 January 2006** — north of the Duel Arena. [`../residual-if-titles-377.md`](../residual-if-titles-377.md) / [`../rev-content-dates-377.md`](../rev-content-dates-377.md) still print **4 Jan 2005**; leftover chrome parent already notes official **2006**. 274/289 have **no** `pizazz` / `mta` IF roots. Hunt 289? **no**.

---

## World formula

`world = mx×64 + local`.

| Map | Origin | What |
|-----|--------|------|
| `m52_51` | **3328, 3264** | Entrance hall (north of Duel Arena) |
| `m52_150` | **3328, 9600** | Enchantment **L0** · Graveyard **L1** · Alchemy **L2** |
| `m52_151` | **3328, 9664** | Telekinetic Theatre (mazes L0–L2) |

`m52_50` LOC rows that share numeric **3096–3103** are **scenery** (`wallstandard_*`), **not** MTA NPCs. Confirm `==== NPC ====`.

---

## XL D.3 (cite — remaining rooms)

Hall Enter dests **keep** (dest-cite-index): Enchant **3364,9650 L0** · Alchemy **3363,9624 L2** · Telekinetic **3336,9718 L0** · Graveyard join exists · hall Exit **3363,3314 L0**. Shop **15944** **PASS** `mtashsrzqxvp`.

| Unit | Room | Dest | STOP |
|-----:|------|------|------|
| **28** | Telekinetic | **keep** **3336,9718** | invent statue / maze dests · rates |
| **29** | Alchemy | **keep** **3363,9624 L2** | invent alch table · cupboard dests |
| **30** | Enchantment | **keep** **3364,9650 L0** | invent orb table · pile dests |
| **31** | Graveyard | **keep** shipped hall dest (script **3363,9641 L1** — § Rooms) | invent graveyard rates · chute dests |

Hat / Magic floors later (`mta_rooms.rs2` comment). Dummy **9999** stay chrome.

---

## Dest (keep shipped — do not invent a second tile)

Rule: packed **Enter** + dest-side leftover Exit / mat on jm2 + live `p_teleport`. Occupancy ≠ dest. Wiki `(x,z)` is **not** a cite. dest-from-maps remesure table does **not** list these — dest-cite already **keep**. Do **not** remesure a second dest.

Live `vendor/content/scripts/minigames/game_mta/scripts/mta_rooms.rs2`:

| Hop | `p_teleport` | World | Overlay | dest-cite | Tag |
|-----|--------------|-------|---------|-----------|-----|
| `telekinetic_teleport` **10778** | `0_52_151_8_54` | **3336,9718 L0** | `pizazz_telekinetic` **15962** | **keep** | **VERIFIED** script + **PASS** `mtatksrzxcna` |
| `enchanters_teleport` **10779** | `0_52_150_36_50` | **3364,9650 L0** | `pizazz_enchantment` **15917** | **keep** | **VERIFIED** script |
| `alchemists_teleport` **10780** | `2_52_150_35_24` | **3363,9624 L2** | `pizazz_alchemy` **15892** | **keep** | **VERIFIED** script |
| `graveyard_teleport` **10781** | `1_52_150_35_41` | **3363,9641 L1** | `pizazz_graveyard` **15931** | **keep** shipped join (index did not print the coord) | **VERIFIED** script · dest-cite **keep** |
| `exit_teleport` **10782** (any room) | `0_52_51_35_50` | **3363,3314 L0** | overlay **null** | **keep** | **VERIFIED** script · same tile as Telekinetic stand |

Each dest sits **next to** that room’s leftover Exit (or on a no-op `magictraining_mini_mat*`). Script comment when written said dest **CANDIDATE**; dest-cite now **VERIFIED keep**. Do **not** re-park.

```js
const MTA_HALL_EXIT = { x: 3363, z: 3314, level: 0 }; // 0_52_51_35_50 — also Telekinetic stand
const MTA_TELE_DEST = { x: 3336, z: 9718, level: 0 }; // 0_52_151_8_54
const MTA_ENCH_DEST = { x: 3364, z: 9650, level: 0 }; // 0_52_150_36_50
const MTA_ALCH_DEST = { x: 3363, z: 9624, level: 2 }; // 2_52_150_35_24
const MTA_GRAVE_DEST = { x: 3363, z: 9641, level: 1 }; // 1_52_150_35_41
```

---

## Entrance hall — `m52_51`

### Door + Entrance Guardian (progress NPC)

News: *Your guide for the arena awaits you in the entrance hall.* Unpack name **Entrance Guardian**. That is the hall **progress** giver. Progress **hat** is an **obj** (`iop1=Talk-to`), not a world NPC.

| Role | Tile | Cite | Tag |
|------|------|------|-----|
| Temple door `magictraining_temple_door` **10721** | **3363,3299 L0** | LOC `0 35 35: 10721 10 3`. Unpack **Doorway** · *A doorway made of light.* · **`op1=Enter`**. | loc **VERIFIED** · dest **PARK** (hall already reachable) |
| Door stand | **3363,3300 L0** | North of loc (inside approach). First-slice §2.1. **Do not** `teleTo` **3363,3299**. | **CANDIDATE** stand · **not** dest |
| **Entrance Guardian** `magictraining_guard_entrance` **3097** | **3363,3304 L0** | NPC `0 35 40: 3097`. Unpack **Entrance Guardian** · *A guardian of the arena.* · **`op1=Talk-to`** · `vislevel=hide` · **no** `size=` (default **1**). | spawn **VERIFIED** · Talk **0** `[opnpc1]` |
| **Stand (tele / Talk-to later)** | **3363,3303 L0** | South of NPC. Alt **3362,3304** (W). **Do not** stand on **3363,3304**. | **CANDIDATE** · **not** dest |
| Progress hat objs **6885–6887** | worn / inv | `magictraining_proghat_{dull,energised,full}`. Display **Progress hat**. `iop1=Talk-to` · Wear · Destroy. Destroy → `destroy_this_object` only. | unpack **VERIFIED** · **0** world spawn · **not** dest |
| Pizzaz Hat NPC `magictraining_pizazz_hat` **3096** | **0** jm2 | Unpack **Pizzaz Hat** · *A talking Hat!* · `op1=Talk-to` · `vislevel=1`. **0** `: 3096` under `==== NPC ====` on `m52_51` / `m52_150` / `m52_151`. `m52_50` `: 3096` is **LOC** `wallstandard_melee_blue`. | **PARK** |

Sal’s **6 Jan 2006** (later **CANDIDATE**, not dest): Entrance Guardian gives the Progress hat; hat required to **Enter** teleports. Product comment parks hat / Magic floors. Smokes **must not** require the hat. Do **not** invent Talk lines (news **silent**).

```js
const MTA_ENTRANCE_GUARD = { x: 3363, z: 3304, level: 0 }; // NPC 3097 — do not teleTo
const MTA_ENTRANCE_STAND = { x: 3363, z: 3303, level: 0 }; // south
```

### Rewards Guardian (shop — not dest)

| Role | Tile | Cite | Tag |
|------|------|------|-----|
| **Rewards Guardian** `magictraining_guard_rewards` **3103** | **3362,3318 L1** size **2** | NPC `1 34 54: 3103`. Unpack **`op1=Talk-to`** · **`op4=Trade-with`** · `size=2` (occupies **3362–3363, 3318–3319**). | spawn **VERIFIED** |
| **Stand (tele / Trade-with)** | **3362,3316 L1** | South; **3317** is **on** the NPC (`quest-mta-shop-if-smoke.mjs`). first-slice §2.1 **3362,3317** is **stale**. | **VERIFIED** headed **PASS** `mtashsrzqxvp` · **not** dest |
| Shop leftover | `magic_training_arena_shop` **15944** | `[opnpc4]` → `if_openmain` + inv **347** on `com_3`. Dummy footer **99999** ×4 stay chrome. | **VERIFIED** product |

```js
const MTA_REWARDS_NPC = { x: 3362, z: 3318, level: 1 }; // 3103 size-2 — do not teleTo
const MTA_REWARDS_STAND = { x: 3362, z: 3316, level: 1 }; // south of footprint
await teleTo(page, MTA_REWARDS_STAND, 2, 30_000);
```

Stairs `magictraining_stairs_base` **10771** / `_mirror` **10775** @ **3367,3306** / **3357,3306** L0 and tops **10773** / **10776** L1 still fall through `@unhandled_stairs`. Shop smoke **soft `teleTo` L1** — toy, not a stairs dest.

L1 decorative `magictraining_hidden_portal_entrance1` **10733** @ **3363,3305** (`1 35 41`) unpack **Portal** · **0** op · **PARK**.

### Hall room portals (smoke click)

Map `m52_51` **LOC**. Unpack all four: **`op1=Enter`**. Product `[oploc1,*_teleport]` live.

| Portal | Id | jm2 | Loc | Stand | Tag |
|--------|---:|-----|-----|-------|-----|
| **Telekinetic Teleport** | **10778** | `0 35 51` | **3363,3315 L0** | **3363,3314** (S) | loc **VERIFIED** · stand + dest **PASS** `mtatksrzxcna` |
| **Enchanters Teleport** | **10779** | `0 32 54: 10779 10 3` | **3360,3318 L0** | **3361,3318** (E) | loc **VERIFIED** · stand **CANDIDATE** |
| **Alchemists Teleport** | **10780** | `0 35 57` | **3363,3321 L0** | **3363,3320** (S) | loc **VERIFIED** · stand **CANDIDATE** |
| **Graveyard Teleport** | **10781** | `0 38 54: 10781 10 1` | **3366,3318 L0** | **3365,3318** (W) | loc **VERIFIED** · stand **CANDIDATE** |

Hall decorative mats `magictraining_mini_mat{2,3,4}` **10757–10759** sit on several stand tiles. Unpack **no** name / **no** op. Same class as dest-side mats. **Not** dests.

```js
const MTA_TELE_PORTAL = { x: 3363, z: 3315, level: 0 }; // 10778
const MTA_TELE_STAND = { x: 3363, z: 3314, level: 0 };  // south — PASS mtatksrzxcna
const MTA_ENCH_PORTAL = { x: 3360, z: 3318, level: 0 }; // 10779
const MTA_ENCH_STAND = { x: 3361, z: 3318, level: 0 };  // east
const MTA_ALCH_PORTAL = { x: 3363, z: 3321, level: 0 }; // 10780
const MTA_ALCH_STAND = { x: 3363, z: 3320, level: 0 };  // south
const MTA_GRAVE_PORTAL = { x: 3366, z: 3318, level: 0 }; // 10781
const MTA_GRAVE_STAND = { x: 3365, z: 3318, level: 0 };  // west
```

---

## Rooms — dest floor only (guardians = presence)

**Do not** tele onto Guardian footprints. Look-at stands are **not** dests. Room Guardian Talk-to is unpack-only · **0** `[opnpc1]` · news **silent** · **STOP**.

### Telekinetic Theatre — `m52_151` L0 (unit 28)

| Role | Tile | Cite | Tag |
|------|------|------|-----|
| **Dest** | **3336,9718 L0** | script + smoke. Dest-tile loc `magictraining_mini_mat` **10756** `0 8 54` · **no** op. | **VERIFIED** |
| Leftover Exit | **3335,9718 L0** | `0 7 54: 10782` + `transportation_icon` **7389**. | loc **VERIFIED** · already-wired residual · **not** a new dest |
| Telekinetic Guardian **3098** | **3333,9719 L0** | NPC `0 5 55: 3098`. Unpack **Telekinetic Guardian**. | spawn **VERIFIED** · Talk **STOP** |
| Look-at stand | **3333,9718** (S) or **3334,9719** (E) | next to, not on. | **CANDIDATE** · **not** dest |

Nine other Exits + seven other Telekinetic Guardians + two Maze Guardians **3102** (L2 only) = presence **PARK** (parent `mta-telekinetic-next` §4.3). Statue obj **6888** Observe/Reset · **0** jm2 OBJ · spawn dest **UNKNOWN** · **PARK**. Do **not** steal `telegrab.rs2` `[opobjt]` as maze move.

### Enchantment Chamber — `m52_150` L0 (unit 30)

| Role | Tile | Cite | Tag |
|------|------|------|-----|
| **Dest** | **3364,9650 L0** | script. Dest-tile loc `magictraining_mini_mat2` **10757** `0 36 50`. | **VERIFIED** |
| Exit N (next to dest) | **3363,9650 L0** | `0 35 50: 10782`. Also S/W/E Exits **3363,9629** / **3353,9640** / **3374,9640**. | loc **VERIFIED** · extra Exits **not** dest |
| Enchantment Guardian **3100** | **3364,9647 L0** size **2** | NPC `0 36 47: 3100`. Footprint **3364–3365, 9647–9648**. | spawn **VERIFIED** · Talk **STOP** |
| Look-at stand | **3364,9646** (S) or **3363,9647** (W) | parent Enchant leftover. | **CANDIDATE** · **not** dest |
| Hole **10803** | **3363,9640 L0** | `0 35 40` · **`op1=Deposit`**. | loc **VERIFIED** · **PARK** dest |
| Shape piles **10799–10802** | four corners (31 locs) | **`op1=Take-from`**. Counts match Sal’s layout — **label ↔ map**, **not** a Pizazz table. Full rows: parent Enchant leftover §4.4. | loc **VERIFIED** · **PARK** dest |
| Ground `magictraining_dragonstone` **6903** | six static OBJ tiles | parent §4.7. **0** `[opobj*]`. | **PARK** dest |

### Alchemists’ Playground — `m52_150` L2 (unit 29)

| Role | Tile | Cite | Tag |
|------|------|------|-----|
| **Dest** | **3363,9624 L2** | script. MAP `2 35 24` · **0** dest loc. | **VERIFIED** |
| Exit SW / SE | **3362,9623** / **3367,9623 L2** | `2 34 23` / `2 39 23`. | loc **VERIFIED** · **not** dest |
| Alchemy Guardian **3099** | **3364,9626 L2** | NPC `2 36 26: 3099`. Unpack default **size 1**. Display **Alchemy Guardian** — do **not** invent “Alchemist Guardian.” | spawn **VERIFIED** · Talk **STOP** |
| Look-at stand | **3364,9625** (S) or **3363,9626** (W) | | **CANDIDATE** · **not** dest |
| Coin Collector **10734** | **3364,9650 L2** | `2 36 50` · **`op1=Deposit`** · `length=2`. | loc **VERIFIED** · **PARK** dest |
| Cupboards **10783…10797** (8 mapped) | west **3360,** **9632/36/40/44** · east **3369,** same z | **`op1=Search`**. Even ids **0** jm2. | loc **VERIFIED** · **PARK** dest |
| Sweeper **3298** | **3364,9638 L2** | ambient · **no** Talk-to. | **PARK** |

### Creature Graveyard — `m52_150` L1 (unit 31)

dest-cite: leftover join exists · dest next to leftover Exit · **keep** shipped · do **not** invent cupboard / Guardian dests. Script dest is that next-to-Exit tile:

| Role | Tile | Cite | Tag |
|------|------|------|-----|
| **Dest** | **3363,9641 L1** | `1_52_150_35_41`. Dest-tile loc `magictraining_mini_mat4` **10759** `1 35 41`. | **VERIFIED** script · dest-cite **keep** |
| Leftover Exit | **3363,9640 L1** | `1 35 40: 10782` + **7389**. | loc **VERIFIED** · residual · **not** a new dest |
| Graveyard Guardian **3101** | **3362,9644 L1** size **2** | NPC `1 34 44: 3101`. Footprint **3362–3363, 9644–9645**. | spawn **VERIFIED** · Talk **STOP** |
| Look-at stand | **3362,9643** (S) or **3361,9644** (W) | next to, not on. | **CANDIDATE** · **not** dest |
| Food chute **10735** | eight L1 tiles (e.g. **3362,9648** / **3365,9648**) | Unpack **Food chute** · *Somewhere to offer food.* · **`op1=Deposit`** · `width=2`. | loc **VERIFIED** · **PARK** dest |
| Bone piles **10725–10728** | many L1 rows | Unpack **Bones** · **`op1=Grab`**. HUD leftover **1–4** next to bone models are chrome — **not** an HP table. | loc **VERIFIED** · **PARK** dest |

---

## Nearby — occupancy **PARK** / not dest

| Who / loc | Tile | Why out |
|-----------|------|---------|
| Charmed Warrior **3104** | hall **3359,3304 L0** | ambient Talk-to · **0** product |
| Flying books **3094/3095** | hall **3367,3304** / **3364,3308** L0 | ambient |
| Hall L1 ghosts **3105/3106** + book | **3364,3311** / **3363,3307** / **3365,3318** L1 | ambient |
| Hall decorative statues **10736–10739** | hall | **Statue** scenery · **no** Observe/Reset · **not** maze **6888** |
| Hidden portal **10733** | **3363,3305 L1** | **0** op · **not** a room Enter |
| Stairs **10771/10775** / tops **10773/10776** | **3367,3306** / **3357,3306** | `@unhandled_stairs` · soft L1 tele is a **toy** |
| Maze Guardian **3102** | `m52_151` L2 only **3354,9679** / **3357,9707** | Talk later · **not** dest |
| Maze walls **10760–10767** | `m52_151` | `active=no` · **not** click dests |
| Other Telekinetic Exits / guards | parent leftover §4.3 | **not** dest |
| Enchantment other Exits / piles / hole / **6903** | parent leftover §4 | **not** dest |
| Alchemy cupboards / collector / sweeper | parent first-slice §3 | **not** dest |
| Graveyard chutes / bone piles | this file | **not** dest |
| `m52_50` LOC **3096–3103** | Duel Arena square | scenery ids · **not** MTA NPCs |

---

## Dummy leftover ≠ dest / ≠ rate

| Chrome | Where | Meaning |
|--------|-------|---------|
| **9999** | Alchemy / Enchantment / Graveyard HUD `com_3` | placeholder |
| **999** | Alchemy rows · Telekinetic **Solved :** | placeholder |
| **99999** | shop footer ×4 | placeholder |
| **999999** | Telekinetic total | placeholder |
| **1–4** | Graveyard bone labels | chrome beside models |

Do **not** bind dummies to `%magictraining6` **629** / varbits **1503–1509**. Leftover IFs have **no** CS1.

---

## Collision remesure (do not invent dest)

Dests are dest-cite **keep**. Headed `teleTo` already landed Rewards **3362,3316 L1** and Telekinetic stand / dest. Other stands are **CANDIDATE** next-to (same class as smoked Telekinetic). Probe to confirm walkable — **do not** pick a second dest if a loc tile is blocked:

```bash
bun "$RS2_R377_ROOT/tools/harness/nav/tools/probe-walkable.mjs" \
  3363,3303,0 3363,3304,0 3363,3299,0 \
  3362,3316,1 3362,3317,1 3362,3318,1 \
  3363,3314,0 3363,3315,0 \
  3361,3318,0 3360,3318,0 3363,3320,0 3363,3321,0 3365,3318,0 3366,3318,0 \
  3336,9718,0 3335,9718,0 \
  3364,9650,0 3363,9650,0 \
  3363,9624,2 3362,9623,2 \
  3363,9641,1 3363,9640,1
```

Pack: `tools/harness/nav/out/collision.lcnav.gz`.

---

## STOP

| Stop | Why |
|------|-----|
| **Dest invent** | Four room dests + hall Exit already shipped. Extra maze / statue / cupboard / chute / Guardian dests = invent |
| **Rates invent** | Dummy leftover counts stay. Sal’s 1-pt-per-100 / 10-orb / 5-in-a-row parked on parents as later **CANDIDATE** — this file does **not** promote them. XL D.3: rates **EXHAUSTED** |
| **Hunt 289** / flip **410** | Feature **4 Jan 2006**. Product stays **377** |
| **15831** | Champions victory parchment · never from MTA |
| **2804** | Fight Pit leftover HUD · never from MTA |
| Guardian Talk-to | **0** `[opnpc1]` · news **silent** · do not invent OSRS transcript lines |
| Progress-hat Enter gate | product later · do not add dest · smokes must not require hat |
| Steal jewelry `enchant.rs2` / item `telegrab.rs2` | **0** MTA shape / statue rows |
| Pizzaz Hat NPC **3096** as hall pin | **0** jm2 spawn |
| `teleTo` on Rewards **3362,3318** / **3362,3317** | size-2 footprint |
| Soft-pass “MTA complete” | Looked-at HUD ≠ room loop |
| Infinity enchant / rune pouch / 2018–2024 QoL | **SUBTRACT** |

**PASS later (XL D.3 units 28–31, not this file):** hall stand → Enter → dest above → leftover overlay looked-at · Exit residual → **3363,3314 L0** · **0** rate write · **15831** / **2804** closed.  
**PASS now (already shipped):** shop `mtashsrzqxvp` · Telekinetic HUD `mtatksrzxcna`.  
**PASS forbidden:** invented dest · invented rates · hat-gated Enter · Guardian Talk invent.
