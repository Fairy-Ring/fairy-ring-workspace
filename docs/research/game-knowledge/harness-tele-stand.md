# Harness tele / stand tiles — next to the loc, not on it

**Date:** 2026-08-08 (cemented; recurring thrash lesson)  
**Audience:** smokes, quest hosts, thrash loops under `tools/harness/`  
**Related:** `docs/runbooks/harness.md` (`teleTo`), `tools/harness/lib/harness.mjs`

---

## Rule (mandatory for hosts)

**`teleTo` / soft re-tele / thrash “home” tiles must target a walkable tile adjacent to the interaction loc — never the loc’s own tile when that tile is blocked by scenery.**

| Do | Don’t |
|----|--------|
| Stand **next to** altar / wall / door / chest / bank booth | Tele onto `loc` world coords that hold the scenery model |
| Keep a separate constant for **loc** vs **stand** | Reuse `^…_altar_coord` / map loc spawn as the stand tile |
| Prefer tiles proven walkable in a headed thrash log | Assume map centre = free floor |
| For rings (Flamtaer walls): stand **inside** the courtyard, op adjacent segs | Walk to `wall.wx+1` blindly (often **outside** the ring) |

Script / content coords (`^mortton_temple_altar_coord`, spawn rows, etc.) are for **loc_find / hunt / zone** — they are **not** automatic player stand anchors.

---

## Why it keeps biting us

1. **Scenery blocks the tile** — fire altars, walls, booths, chests: the loc’s world tile is often unwalkable or a bad stand for op reach.  
2. **`tele` lands you on that tile** — engine tele does not “nudge off” blocked squares; thrash then looks “stuck” or walks oddly.  
3. **Chasing the next Broken Wall** with `walkWorld(wx±1, wz)` without an **inside bias** runs the player around the **outside** of a ring minigame.  
4. Recurring examples in this workspace: Flamtaer altar **3506,3316** (`0_54_51_50_52`), tele-on-wall **3504,3315**, TBWT hut L0/L1 mismatch, other quest “stand on the NPC spawn”.

---

## Pattern (constants)

```js
// Product / map truth (loc, not stand)
const FLAMTAER_ALTAR = { x: 3506, z: 3316, level: 0 }; // 0_54_51_50_52 — UNWALKABLE for player

// Host stand: one free tile beside altar, inside courtyard (proved 2026-08-08 thrash)
const FLAMTAER_COURTYARD = { x: 3505, z: 3315, level: 0 };

// Geometric bias for “step toward inside” (may equal altar; never tele here if blocked)
const TEMPLE_CENTER = { x: 3506, z: 3316 };

await teleTo(page, FLAMTAER_COURTYARD, 2, 30_000); // stand
// later: opLocAt(altar) / Repair adjacent wall from inside
```

### Inside-stand for wall rings

```js
// Project wall tile → stand on the courtyard side of TEMPLE_CENTER
function insideStand(wx, wz, center) {
  let sx = wx, sz = wz;
  if (wx < center.x) sx = wx + 1;
  else if (wx > center.x) sx = wx - 1;
  if (wz < center.z) sz = wz + 1;
  else if (wz > center.z) sz = wz - 1;
  return { x: sx, z: sz };
}
```

Sticky wall target + only re-walk when `cheb(me, stand) > 1` — do not re-home every tick.

---

## Flamtaer anchors (proved / soft)

| Role | Tile | Notes |
|------|-----:|--------|
| Altar loc | **3506,3316** | `^mortton_temple_altar_coord` — **not** tele target |
| Courtyard stand | **3505,3315** | SW of altar; inside ring; tele / re-tele home |
| Wall sample (rubble) | **3504,3315** | Broken Wall — op from **inside**, never tele onto |
| Thrash interior band | ~3503–3507, 3315–3318 | Logs: 3503,3315–3318 while building |
| Temple soft box | 3502–3510, 3312–3320 | Death / fail-tele re-entry check |

---

## Checklist (new smoke tele)

1. Name constants `*_LOC` / `*_ALTAR` vs `*_STAND` / `*_COURTYARD`.  
2. Headed once: after tele, screenshot + log `worldTile` — if standing “in” the scenery, offset ±1 toward free floor.  
3. For minigame rings, fix **inside** bias before writing thrash loops.  
4. Log the stand tile in the plan or `anchors-*.md` same turn.

---

## Code touchpoints

| Path | Note |
|------|------|
| `tools/harness/lib/harness.mjs` → `teleTo` | JSDoc points here |
| `tools/harness/quest-mortton-smoke.mjs` | Flamtaer courtyard thrash |
| `docs/runbooks/harness.md` | Short rule cross-link |
| `docs/research/game-knowledge/README.md` | Corpus index |

**Product trees:** unchanged — this is host / thrash discipline only.
