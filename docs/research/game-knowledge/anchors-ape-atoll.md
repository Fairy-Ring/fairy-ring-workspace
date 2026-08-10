# Game-knowledge anchors — Ape Atoll (greegree slice)

**Purpose:** MM greegree vertical slice harness (not full Monkey Madness).

## Greegree zone (VERIFIED content script)

From product `mm_greegree.rs2` `~mm_greegree_zone` (289-era zones):

| Zone | Coord box (content literal) |
|------|-----------------------------|
| Ape surface | `0_42_42_0_0` … `2_43_43_63_63` |
| Extras | `0_42_142`, `0_43_143`, Ardougne zoo strip, crash `0_41_71` |

Smoke stand (VERIFIED product): **2755,2795** L0 (mapsquare 43,43 local ~43,43).

## Garkor / ch2 land (VERIFIED soft mids 2026-08-10)

| What | Tile | Notes |
|------|------|--------|
| ch2 boat land | **2801,2707** L0 | `0_43_42_49_19` |
| Garkor (`mm_garkor_aa`) | **2805,2762** L0 | m43_43 `0 53 10: 1411` |
| Lumdo on atoll (boat) | **2803,2707** L0 | m43_42 `0 51 19: 1419` |
| Zooknock NPC | **2804,9145** L0 | **m43_142** NPC `0 52 57: 1425` `mm_zooknock_aa` (+ bunkwicket/waymottin nearby) |
| Zooknock **stand** | **2804,9144** L0 | one south of NPC — free floor |
| Awowogei throne (`mm_throne` 4771) | **2802,2765** L0 | m43_43 `0 50 13: 4771 10`; op **Talk-to** |
| Awowogei **stand** | **2802,2764** L0 | one south; soft mid `MM_FROM=16` PASS |
| Ardougne zoo monkey | **2601,3276** L0 | m40_51 `0 41 12: 1463` `mm_zoo_monkey`; stand **2601,3275**; `MM_FROM=17` PASS |
| Backpack obj | pack **4033** | `mm_monkey_in_backpack` client name **Monkey** |
| ~~wrong wall~~ | ~~2776,9194~~ | m43_143 **LOC** `0 24 42: 1425` — not NPC |
| ~~wrong square~~ | ~~2804,9208~~ | m43_143 (map 143) — Zooknock is on **142** |

## Soft / product

| Soft | Product |
|------|---------|
| give greegree, tele zone, tele Lumby leave | Hold (heldOp 2), leave-zone force unequip |

Account **PASS:** `mmgsjpjnu0` (leave-zone). Content `b548d4ce9` / later greegree fixes.

## Related

- `docs/research/mm-greegree-377-pack-audit.md`
- `docs/research/runescript/residuals-inbox.md` (null oc_category, settimer order)
