# Game-knowledge anchors — Nardah / Spirits of the Elid (377)

**Date:** 2026-08-16  
**Use:** Harness tele **next to** Awusah the Mayor **3040**, not on him. Fountain / river dest is **not cited** — do **not** invent.  
**Product stays 377.** Hunt 289? **no**. Docs only this file. **No product `.rs2`.** Word: **residual**.

**Parents (cite — do not rewrite):** start [`../red-19-start-impl-377.md`](../red-19-start-impl-377.md) §12 · dest index [`../dest-cite-index-377.md`](../dest-cite-index-377.md) · dest queue [`../dest-uncited-pass-next-377.md`](../dest-uncited-pass-next-377.md) · stand rule [`harness-tele-stand.md`](harness-tele-stand.md) · jm2 [`../map-npc-spawns-jm2-377.md`](../map-npc-spawns-jm2-377.md)

**Tag:** **VERIFIED** = red-19 jm2 / pack · **CANDIDATE** = dest-from-maps named a dest-side tile · dest-cite **silent** = dest **PARK** / **do not invent**.

---

## World

`m53_45` origin **3392, 2880**. Formula `world = mx×64 + local`. NPC row `0 50 32: 3040` → **3442,2912** L0.

---

## Start (Mayor)

| Role | Tile | Cite | Tag |
|------|------|------|-----|
| **NPC** `elid_mayor` **3040** | **3442,2912 L0** | Unpack **Awusah the Mayor** · *The Mayor of Nardah.* · `op1=Talk-to`. jm2 `m53_45` `0 50 32`. | **VERIFIED** red-19 |
| **Stand (tele / Talk-to)** | **3443,2912 L0** | East of Mayor. **Not** on **3442,2912**. | **VERIFIED** occupancy |
| **Do not** | Ghaslor **3029** | Other Nardah face. Start is Mayor only. | **STOP** |
| **Do not** | Tarik `elid_mayor_guard_1` | *The mayor’s guard* · Attack. Pyramid Plunder files already **STOP** stealing him. | **STOP** |
| **Var** | `%elidquest` bits **0–6** on varp **616** `elid_main` | First write **0 → 1** CANDIDATE. Ballad Read (`elid_ballad.rs2` / `inter_327`) is **already residual** — do **not** steal. | **VERIFIED** pack |
| **Dest this start** | — | red-19: dest **none**. dest-cite **0** Nardah / fountain / river row. | **PARK** — not dest |

```js
const ELID_MAYOR = { x: 3442, z: 2912, level: 0 }; // 3040 — do not teleTo
const ELID_MAYOR_STAND = { x: 3443, z: 2912, level: 0 }; // E
await teleTo(page, ELID_MAYOR_STAND, 2, 30_000);
```

```bash
bun "$RS2_R377_ROOT/tools/harness/nav/tools/probe-walkable.mjs" \
  3442,2912,0 3443,2912,0 3442,2913,0 3441,2912,0
```

Soft `setvar elidquest` / `setvar elid_main` = **toy**. Start **PASS** `elid0svzkzn7` **0→1** · stand **3443,2912** · after Talk tile **3442,2912** (walk-to-NPC, not dest). `elid_ballad.rs2` untouched.

---

## Fountain / later dest

Mayor chat *names* a dried fountain. That is **not** a dest cite.

| Surface | Verdict |
|---------|---------|
| Fountain travel dest | dest-cite **silent** · remesure **0** Elid row · **do not invent** `p_tele*` |
| Ancestral-key dest | red-19 **STOP** |
| River dest | red-19 **STOP** |

Occupancy next to a fountain loc (if packed) is a **stand**, not dest. Measure only when dest-from-maps assigns the leftover. Do **not** hunt wiki `(x,z)`.

---

| Date | Note |
|------|------|
| 2026-08-16 | Opened for Elid start land. Fountain dest still **PARK**. |

*Research only. Product stays 377. Hunt 289? no.*
