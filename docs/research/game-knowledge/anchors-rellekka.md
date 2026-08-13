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
| Peer mural | **2634,3663** L0 | loc **4179** `viking_seers_mural`; stand **2634,3664**; IF `viking_mural` **9929** |
| Peer door1 / door2 | 2631,3667 / 2636,3667 | 4165 / 4166 |
| Peer combo IF | door1 stand **2630,3667** | `combolockdoor` **10051** (soft peer bits **262144**) |
| Peer door2 **inside** unlock | 2636, 3665 | check_axis; mid20 |
| Peer L2 range/tap/scale/frozen | see smoke `PEER_L2` | m41_57 L2 |
| Sigli | 2660, 3653 | map `0 36 5: 1281` |
| Thorvald | 2666, 3693 | map `0 42 45: 1289` |
| Warrior ladder loc | **2667, 3694** | map `0 43 46: 4187` (`viking_warrior_ladder` oploc2) |
| Warrior ladder stand | **2666, 3694** | next to loc, not on it |
| Koschei pen tele | **2663, 10098** L2 | content `p_teleport(2_41_157_47_50)` |
| Honour-death land | **2667, 3692** L1 | content `1_41_57_43_44` |
| Olaf | 2673, 3683 | map `0 49 35: 1269` |
| Swaying tree loc | **2738, 3638** | `m42_56.jm2` `0 50 54: 4142` (`viking_musical_tree` Cut-branch) |
| Swaying tree stand | **2737, 3638** | next to |
| Strange altar loc | **2626, 3598** | `m41_56.jm2` `0 2 14: 4141` (`viking_lake_shrine_altar`) |
| Strange altar stand | **2626, 3597** | next to |
| Longhall stage stand | **2658, 3684** | zone `0_41_57_31_34`…`38_37` (Play enchanted lyre) |
| Backstage door | **2667, 3683** | `m41_57.jm2` `0 43 35: 4148` |
| **Yrsa** (`viking_clothing_shopkeeper` **1301**) | **2625, 3675** | `m41_57.jm2` NPC `0 1 27: 1301`; smoke stand **2625,3674** |
| Sigmund (`viking_sigmund` **1282**) | **2641, 3680** | `m41_57.jm2` `0 17 32: 1282` |
| Sailor (`viking_sailor` **1304**) | **2629, 3693** | `m41_57.jm2` `0 5 45: 1304` |
| Askeladden (`viking_askelapen` **1295**) | **2658, 3660** | `m41_57.jm2` `0 34 12: 1295` |
| **Lalli** (`viking_lalli_troll` **1270**) | **2770, 3622** | `m43_56.jm2` NPC `0 18 38: 1270` |
| Lalli cauldron loc **4149** | **2772, 3623** | `m43_56.jm2` LOC `0 20 39: 4149` |
| Lalli cave entrance **4147** | **2774, 3619** | `0 22 35: 4147` |
| Lalli stand | **2770, 3621** | next to NPC |
| Rellekka spinning wheel **4309** | **2617, 3659** | `m40_57.jm2` `0 57 11: 4309`; stand south **2617,3658**; Fremennik-complete only |
| Lumbridge spinning wheel **2644** | **3209, 3212** L1 | `m50_50.jm2` `1 9 12: 2644`; stand **3209,3213** L1 |
| Thora (`viking_longhall_barkeep` **1300**) | **2662, 3673** | `m41_57.jm2` `0 38 25: 1300` |
| Skulgrimen (`viking_weapons_salesman` **1303**) | **2663, 3694** | `m41_57.jm2` `0 39 46: 1303` |
| Fisherman (`viking_fisherman1` **1302**) | **2641, 3699** | `m41_57.jm2` `0 17 51: 1302` |
| Draugen hunt box | x 2625–2740, z 3605–3725 | talisman bearing; no Seers hop |
| Draugen spawn (content random) | map 41–42 / 56–58 forests + crabs | `spawn_draugen_butterfly` |

Longhall scenery: `viking_torch_fire` id **4192** `anim=fire` — client ground-decor anim fix 2026-08-06.
