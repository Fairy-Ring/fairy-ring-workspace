# Game knowledge corpus (rev 377 / this workspace)

**Purpose:** Durable **player-facing game knowledge** that smokes, ports, and agents reuse — levels, gear tiers, quest combat floors, anchors, era constraints.

**Not:** chat thrash. **Not:** inventing mechanics. Facts come from the authenticity ladder (`../authenticity-stance.md`).

## Maintain (mandatory)

| When | Update |
|------|--------|
| New quest mid smoke | Row in `harness-prep-and-gear.md` + combat note if fights |
| Learned NPC combat level / safe strategy | `combat-floors-377.md` |
| New tile anchors / exactmove start | `anchors-*.md` + `harness-tele-stand.md` if stand rule is general |
| Equip gates (quest + level) | `harness-prep-and-gear.md` § Equip gates |
| Soft/hard proof distinction | soft mids → `../softpass.md`; product non-auth → `../deviations.md` |

**Same-turn rule (restored 2026-08-09):** soft-pass or residual **RESULT/FAIL** that teaches a stand, kit, or equip gate → update this folder **before** “onto next.” Softpass ledger is process stage; **this folder is player ops truth.**

**Phase 2 precondition:** expand this corpus for the unit’s stands/gates **before** residual bar §2 polish thrash on that unit (Flamtaer, Horror mother, etc.). Soft-pass mids may continue when the next tile is already here or is itself the corpus update.

**Not this folder:** pack/folder inventories → `../corpus/` (measured IDs only).

Cold resume: agents should **read this folder** before inventing `giveItems` / `setStats` for a fight.

## Files

| Doc | Contents |
|-----|----------|
| [`harness-prep-and-gear.md`](harness-prep-and-gear.md) | **Host prep policy** — setstat + give + equip; match gear to combat floor |
| [`harness-tele-stand.md`](harness-tele-stand.md) | **Tele / stand** — next to loc, not on it; Flamtaer courtyard vs altar |
| [`combat-floors-377.md`](combat-floors-377.md) | Known NPC levels / smoke combat floors — **MM remains** vis/ATK–HP from 289 `quest_mm.npc` + 377 unpack (not OSRS CLs) |
| [`anchors-rellekka.md`](anchors-rellekka.md) | Fremennik / Rellekka tiles used by Viking smokes (workman **2655,3592** — not town z-band) |
| [`anchors-mort-myre.md`](anchors-mort-myre.md) | Cyreg **3522,3284**, Curpile **3508,3440**, Vanstrom multi **3503,3477**, hideout n54_153 |
| [`flamtaer-residual-377.md`](flamtaer-residual-377.md) | **Flamtaer residual ops** — stages 50→85, sanc/repaired_p, 49t pyre, bar §2 checklist |
| [`anchors-isafdar.md`](anchors-isafdar.md) | Iorwerth **2205,3252**, Tyras guards, Idris residual |
| [`anchors-miscellania.md`](anchors-miscellania.md) | Vargas **2501,3859** L1; maple SW **2550,3864** vs dummy **2550,3867**; Gunnhild / heather stand **2524,3851**; labour VERIFIED vs CANDIDATE |
| [`anchors-ape-atoll.md`](anchors-ape-atoll.md) | Greegree zone / smoke stand **2755,2795**; MM remains vis pointer + greegree hunt skip |
| [`anchors-crash-island.md`](anchors-crash-island.md) | MM Crash Island fly land **2893,2725**; Lumdo/Waydar; ch2 cutscene m40_71 |
| [`anchors-karamja-shipyard.md`](anchors-karamja-shipyard.md) | MM seal gate **2945,3041**, stand **2943,3040**, guard **2944,3040**, Caranock **2956,3025** |
| [`anchors-outpost.md`](anchors-outpost.md) | Making History: Jorral **2437,3347** (next-to, not on rug); later Melina/Droalak/Dron/Blanin |
| [`anchors-varrock-garden.md`](anchors-varrock-garden.md) | Garden: Ellamaria **3228,3477**; palace patches; four farmers (Elstan **3053,3308** …) |
| [`anchors-wanted-ahoy.md`](anchors-wanted-ahoy.md) | Tiffy **2997,3373** (RD hub); Velorina **3678,3510** (Ahoy). Period media still blocks `[opnpc1]` |
| [`../map-npc-spawns-jm2-377.md`](../map-npc-spawns-jm2-377.md) | How map NPC spawns work in `.jm2` (when present on this surface) |
| [`../corpus/README.md`](../corpus/README.md) | Measured pack/folder inventories (when present) |

## Product vs toys

| Product (`vendor/content`, engine, client) | Toys (`tools/harness`) |
|--------------------------------------------|-------------------------|
| No free gear / setstat | **Allowed** for prep only |
| Authentic combat if a real player fights | Gear should still **make sense** for the setstat floor |
| | Prep is **not** a soft-pass of quest logic |

See Decision 004 and authenticity stance § Product vs toys.
