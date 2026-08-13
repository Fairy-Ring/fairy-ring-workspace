# Game-knowledge anchors — Varrock palace garden / Garden of Tranquillity

**Tag default:** **VERIFIED** = `_unpack/377` + `m50_54.jm2` and farmer maps (2026-08-12 deepen).  
**Source:** [`../making-history-garden-cache-first-377.md`](../making-history-garden-cache-first-377.md) §3 + §9.  
**Not:** start dialogue or `inter_303` list strings. Official news **VERIFIED 30 Aug 2005** (“Speak to Queen Ellamaria…”; no first-talk). Ellamaria transcript **still missing** — no `[opnpc1]` from this file.

## Start surface

| Who | Pack | Map | Tile | Notes |
|-----|-----:|-----|------|-------|
| **Ellamaria** | 2581 `queen_ellamaria` | m50_54 `0 28 21` | **3228,3477** L0 | Unique Talk-to. Tele **next to**, not onto delphinium **3225,3475+** or picnic **3229,3482**. |

**False-adjacents:** tree gardener **2341** **3226,3458** (F1 tree patch). Fountain **879** **3206/3218,3463** is **not** a `garden_*` well. Loc **884** `well` has **0** placements on `m50_54` — do not bind.

## Palace parents (first tiles)

| Parent | ID | First tile |
|--------|---:|------------|
| Delphinium | 9165 | **3225,3475** |
| Rose pink / red / white | 9176 / 9175 / 9174 | **3226 / 3229 / 3232,3471** |
| White tree | 9209 | **3229,3474** |
| Vine (9 tiles N) | 9232 | **3227,3480** → **3227,3488** |
| Snowdrop | 9223 | **3232,3479** |
| Orchid pink / yellow | 9197 / 9198 | **3229 / 3231,3486** |
| Saradomin / king statue multi | 9253 / 9252 | **3229,3479** / **3233,3487** |
| Picnic bench (no op) | 9291 | **3229,3482** |

Weeds / empty pots: **`op2=Inspect` only**. White-tree fruit: **`op1=Pick-fruit`**. Orchid multi **skips** stages 2–3.

## Off-palace (later units)

| What | Tile | Notes |
|------|------|-------|
| Falador Saradomin statue | **2965,3381** | `9250` |
| Lumbridge king / queen statue | **3231,3217** / **3231,3220** | `9251` / `9292` |
| Burthorpe vines / Bernald | **2913–2915,3534** / **2918,3534** | no vine op |
| Monastery roses Take-seed | **3048,3503+** (`9260–9262`) | **0** `[oploc1]` — do not invent yields |
| Brother Althric | **3049,3507** | later Talk-to |

## Four allotment farmers (unique)

| Farmer | Pack | Tile | Leprechaun | Site |
|--------|-----:|------|------------|------|
| Elstan | 2323 | **3053,3308** | **3053,3305** | Falador south |
| Dantaera | 2324 | **2808,3464** | **2815,3467** | Catherby |
| Kragen | 2325 | **2668,3374** | **2671,3368** | Ardougne north |
| Lyra | 2326 | **3601,3527** | **3604,3528** | W of Phasmatys |

**0** `[opnpc1,elstan]` (etc.). Leprechaun **3021** is F1 tools, not Garden.

## Leftover list IF

`inter_303` (**14606**) title *Items I need to get for King Roald's garden:* · `lj1–lj11` placeholders · **0** `if_button` / varbit binds. Do not fill from OSRS.
