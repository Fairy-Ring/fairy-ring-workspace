# Game-knowledge anchors — Devious Minds / Paterdomus (377)

**Date:** 2026-08-16  
**Use:** Harness tele **next to** hooded monk **3075**, not on him, **never** on dead multi **3076**.  
**Product stays 377.** Hunt 289? **no**. Docs only this file. **No product `.rs2`.** Word: **residual**.

**Parents (cite — do not rewrite):** start [`../red-19-start-impl-377.md`](../red-19-start-impl-377.md) §13 · dest index [`../dest-cite-index-377.md`](../dest-cite-index-377.md) · dest queue [`../dest-uncited-pass-next-377.md`](../dest-uncited-pass-next-377.md) · stand rule [`harness-tele-stand.md`](harness-tele-stand.md) · jm2 [`../map-npc-spawns-jm2-377.md`](../map-npc-spawns-jm2-377.md)

**Tag:** **VERIFIED** = red-19 jm2 / pack · dest-cite **silent** = dest **PARK**. Copy owns the product unit. This tree does **not** implement Devious.

---

## World

`m53_54` origin **3392, 3456**. NPC row `0 14 36: 3074` → **3406,3492** L0 (map multi base).

---

## Start (hooded monk)

| Role | Tile | Cite | Tag |
|------|------|------|-----|
| **Map multi** `devious_monk_hooded` **3074** → vis `devious_monk_hooded_visable` **3075** | **3406,3492 L0** | Unpack **Monk** · *A hooded monk.* · `op1=Talk-to`. jm2 `m53_54` `0 14 36: 3074`. | **VERIFIED** red-19 |
| **Stand (tele / Talk-to)** | **3407,3492 L0** | East of monk. **Not** on **3406,3492**. | **VERIFIED** occupancy |
| **Dead multi** `devious_monk` vis **3076** | same tile when bit set | Varbit `devious_monk` bits **27–28** on varp **622** `devious_base`. **0** = hooded. **1** = dead. **Never write 1** on the start hop. | **STOP** |
| **Var** | `%devious_main` bits **0–7** | First write **0 → 1** CANDIDATE. | **VERIFIED** pack |
| **Trigger** | `[opnpc1,devious_monk_hooded_visable]` | File (copy): `quest_devious/scripts/devious_monk.rs2` | — |
| **Dest this start** | — | red-19: dest **none**. dest-cite **0** Paterdomus / Entrana / orb row. | **PARK** |

```js
const DEVIOUS_MONK = { x: 3406, z: 3492, level: 0 }; // 3075 vis — do not teleTo
const DEVIOUS_MONK_STAND = { x: 3407, z: 3492, level: 0 }; // E
// never setvar devious_monk 1
await teleTo(page, DEVIOUS_MONK_STAND, 2, 30_000);
```

```bash
bun "$RS2_R377_ROOT/tools/harness/nav/tools/probe-walkable.mjs" \
  3406,3492,0 3407,3492,0 3406,3493,0 3405,3492,0
```

Soft `setvar devious_main` = **toy**. Soft `setvar devious_monk 1` is **wrong** (shows Dead Monk).

---

## Later dest (not this start)

| Surface | Verdict |
|---------|---------|
| Entrana dest | red-19 **STOP** · dest-cite silent · **do not invent** |
| Orb dest | red-19 **STOP** |
| Tiffy splice | **STOP** — Wanted / RD hub is [`anchors-wanted-ahoy.md`](anchors-wanted-ahoy.md) |

Doric whetstone (mithril 2h) is a **later** case after start **1**. Not dest.

---

| Date | Note |
|------|------|
| 2026-08-16 | Opened for next RED after Elid. Hooded **3075** · never dead **3076**. |

*Research only. Product stays 377. Hunt 289? no.*
