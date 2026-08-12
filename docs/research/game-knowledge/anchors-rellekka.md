# Anchors — Rellekka / Fremennik Trials

World tiles used by `quest-viking-smoke.mjs` and content (m41_57 unless noted). Level 0 unless stated.

| Label | Tile | Source |
|-------|------|--------|
| Brundt | 2659, 3669 | smoke |
| Manni | 2660, 3673 | map `0 36 25: 1286` |
| Council workman | **2655, 3592** | `m41_56.jm2` NPC `0 31 8: 1287` (`vt_council_workmen`) — Seers→Rellekka road/bridge approach (mz **56**). **Not** market/longhall (mz 57). Live-mat3/4 wrongly scanned z≈3660–3685 / 2614,3675 — empty. Only static 1287 spawn in maps. See [`../map-npc-spawns-jm2-377.md`](../map-npc-spawns-jm2-377.md) |
| Pipe (longhall) | 2663, 3674 | map `0 39 26: 4162` |
| Swensen | 2646, 3660 | map `0 22 12: 1283` |
| Maze ladder top | 2644, 3657 | smoke |
| Maze portals | m41_156 4150–4156 | content path |
| Maze exit land | 2649, 3661 | smoke |
| Peer | 2634, 3668 | map `0 10 20: 1288` |
| Peer door1 / door2 | 2631,3667 / 2636,3667 | 4165 / 4166 |
| Peer door2 **inside** unlock | 2636, 3665 | check_axis; mid20 |
| Peer L2 range/tap/scale/frozen | see smoke `PEER_L2` | m41_57 L2 |
| Sigli | 2660, 3653 | map `0 36 5: 1281` |
| Thorvald | 2666, 3693 | map `0 42 45: 1289` |
| Olaf | 2673, 3683 | map `0 49 35: 1269` |
| **Yrsa** (`viking_clothing_shopkeeper` **1301**) | **2625, 3675** | `m41_57.jm2` NPC `0 1 27: 1301`; smoke stand **2625,3674** |
| Draugen hunt box | x 2625–2740, z 3605–3725 | talisman bearing; no Seers hop |
| Draugen spawn (content random) | map 41–42 / 56–58 forests + crabs | `spawn_draugen_butterfly` |

Longhall scenery: `viking_torch_fire` id **4192** `anim=fire` — client ground-decor anim fix 2026-08-06.
