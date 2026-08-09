# Game knowledge corpus (rev 377 / this workspace)

**Purpose:** Durable **player-facing game knowledge** that smokes, ports, and agents reuse — levels, gear tiers, quest combat floors, anchors, era constraints.

**Not:** chat thrash. **Not:** inventing mechanics. Facts come from the authenticity ladder (`../authenticity-stance.md`).

## Maintain (mandatory)

| When | Update |
|------|--------|
| New quest mid smoke | Row in `harness-prep-and-gear.md` + combat note if fights |
| Learned NPC combat level / safe strategy | `combat-floors-377.md` |
| New tile anchors (quest-critical) | `anchors-rellekka.md` (or area file) |
| Soft/hard proof distinction | Keep gear policy consistent; soft mids → `../softpass.md`; product non-auth → `../deviations.md` |

Cold resume: agents should **read this folder** before inventing `giveItems` / `setStats` for a fight.  
Root [`AGENT_BRIEF.md`](../../../AGENT_BRIEF.md) → this folder as needed for prep/anchors.

## Files

| Doc | Contents |
|-----|----------|
| [`harness-prep-and-gear.md`](harness-prep-and-gear.md) | **Host prep policy** — setstat + give + equip; match gear to combat floor |
| [`harness-tele-stand.md`](harness-tele-stand.md) | **Tele / stand** — next to loc, not on it; Flamtaer courtyard vs altar |
| [`combat-floors-377.md`](combat-floors-377.md) | Known NPC levels / smoke combat floors |
| [`anchors-rellekka.md`](anchors-rellekka.md) | Fremennik / Rellekka tiles used by Viking smokes (workman **2655,3592** — not town z-band) |
| [`anchors-mort-myre.md`](anchors-mort-myre.md) | Cyreg **3522,3284**, Curpile **3508,3440**, Vanstrom multi **3503,3477**, hideout n54_153 |
| [`anchors-isafdar.md`](anchors-isafdar.md) | Iorwerth **2205,3252**, Tyras guards, Idris residual |
| [`anchors-ape-atoll.md`](anchors-ape-atoll.md) | Greegree zone / smoke stand **2755,2795** |
| [`../map-npc-spawns-jm2-377.md`](../map-npc-spawns-jm2-377.md) | How map NPC spawns work in `.jm2` (when present on this surface) |
| [`../corpus/README.md`](../corpus/README.md) | Measured pack/folder inventories (when present) |

## Product vs toys

| Product (`vendor/content`, engine, client) | Toys (`tools/harness`) |
|--------------------------------------------|-------------------------|
| No free gear / setstat | **Allowed** for prep only |
| Authentic combat if a real player fights | Gear should still **make sense** for the setstat floor |
| | Prep is **not** a soft-pass of quest logic |

See Decision 004 and authenticity stance § Product vs toys.
