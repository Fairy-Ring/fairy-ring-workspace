# Anchors — Karamja gnome shipyard (MM + Grand Tree)

**Map:** `m46_47.jm2` · region base **2944,3008**  
**Quest use:** Monkey Madness seal mid (`mm_main` 1→2); Grand Tree password path (earlier).

## Gate + guard

| What | World tile | Notes |
|------|------------|--------|
| Soft stand (west of gate) | **2943,3040** L0 | `coordx(player) < loc x` required for worker dialogue |
| Fence gate (Open) | **2945,3041** / **2945,3042** | loc category `_shipyard_gate`; pack ids ~2438/2439 |
| `grandtree_shipyardguard` (npc **675**) | **2944,3040** (`0 0 32: 675`) | display name **Shipyard worker**; `wanderrange=2`; `npc_find(..., 5, 0)` |

**Gate script** (`quest_grandtree.rs2`):

```text
if (%grandtree >= ^grandtree_released_prison /*80*/) {
  if (player west of gate & shipyardguard in 5) → @shipyardworker_gate
  else → @open_shipyard_gate   // silent walk-through
} else → "The gate is locked."
```

MM branch (`shipyardworker.rs2` → `mm_shipyardworker_dialogue`): when `%mm_main = ^mm_started` (1) and inv has `mm_gnome_royal_seal` → **`%mm_main = ^mm_shown_seal` (2)** then open gate.

## Caranock

| What | World tile | Notes |
|------|------------|--------|
| G.L.O. Caranock | **2956,3025** L0 | map `0 12 17: 1427` · `mm_caranock` |
| Soft tele for talk | **2956,3025** (or adjacent) | advances `mm_caranock` 0→3; does **not** change `mm_main` |

## Soft mids (harness)

| `MM_FROM` | Soft | Product | Log |
|-----------|------|---------|-----|
| 1 | `mm_main 1` + seal | Open Gate → **2**; Talk Caranock | `.tmp/mm-shipyard-2f.log` |
| 2 | `mm_main 2` + caranock 3 | Narnode → **mm_narnode=7** orders | `.tmp/mm-narnode-orders-2a.log` |
| 3 | `mm_narnode 7` + give orders | Daero GT **2484,3486** L1 → **mm_daero=3** | `.tmp/mm-daero-3a.log` |
| 4 | `mm_daero 3` | Leave → hangar + Waydar → **mm_daero=5** | `.tmp/mm-hangar-4a.log` |
| 5 | `mm_daero 5` only (`complete` bit **0**) | Open panel + product scramble/solve → **≥6** | **OPEN** — never soft complete=1 pre-open |

- Soft always: `grandtree 160`, `treequest 9`.  
- **Harness note (FROM=1):** do not `closeInterface` while seal chat is open — aborts before stage write.  
- Softpass: [`softpass.md`](../softpass.md) 2026-08-10 rows.

## Grand Tree + hangar (related)

| What | World tile | Notes |
|------|------------|--------|
| King Narnode | **2466,3497** L0 | start + return |
| Daero (bar) | **2484,3486** L1 | `m38_54` `1 52 30: 1407` |
| Hangar tele | **2393,9892** L0 | `0_37_154_25_36` · leave path |
| Control panel | **2394,9883** L0 | `bunker_controlpanal` · reinit open |
| Hangar shot residual | **2390,9893** | PASS stage 5; **missingModels=24** — not visual-green |

## Related

- Greegree / Ape Atoll stands: [`anchors-ape-atoll.md`](anchors-ape-atoll.md)  
- MM port hunt: [`port-quest-mm-289-source-hunt.md`](../port-quest-mm-289-source-hunt.md)  
- Map NPC format: [`map-npc-spawns-jm2-377.md`](../map-npc-spawns-jm2-377.md)
