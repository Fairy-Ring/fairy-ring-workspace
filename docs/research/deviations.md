# Authenticity deviations log

Record **intentional product / platform differences** from historical May 2006 / cache truth that we **keep** (or kept) in pure trees or isolation.

**Not this file:** soft mid thrash, soft entry, “not e2e yet” — that is process stage tracking in **[`softpass.md`](softpass.md)**.

| Date | Area | Deviation | Why | Owner |
|------|------|-----------|-----|-------|
| 2026-08-03 | Ports | WEB **81**, GAME **43595** (not stock 80/43594) | Isolation from live 274; Java client requires WEB=`80+offset`, GAME=`43594+offset` with same offset | ops |
| 2026-08-03 | Ports | Was briefly WEB **8891** (wrong) | Broke CRC; fixed back to **81** | ops |
| 2026-08-04 | Content / skill guide IF | Pack root **18800** (`skill_guide` + comps 18801–18951), not 274’s **8714** | On 377 pack, **8714=`inter_183`** (occupied). Free range after TBWT scroll. **Behaviour** from 274; **id** is content-local invent. Audit: `skill-guide-377-id-audit.md` | agent |
| 2026-08-04 | Content / skill guide varp | First landing **730–731**; **remapped to 333–334** (= 274 ids) | Temp varps; 377 placeholders free — dual-branch alignment | agent |
| 2026-08-04 | Content / skill guide | Stats pack **names** `stats:com_68`… → `stats:attack`… on **same ids 8654–8672** | LC symbol names for `if_button` (matches 274); numeric ids unchanged | agent |
| 2026-08-04 | Engine | `stat_enabled` / `STAT_ENABLED=10010` | LC extension so content can read `PlayerStatEnabled` | agent |
| 2026-08-04 | Content / skill guide | Guide **unlock text** is 274/early stock | May 2006 era refresh still TODO; open/wire works | agent |
| 2026-08-05 | Nav / Horror bridge | Pack + live open L0 **2597,3608** (bridge gap) so PathFinder can step west↔east | Static lcnav ignores LocType multiloc (op 77). **Not** authentic free cross without repair — quest still needs plank `oplocu`. See `nav-multiloc-collision.md` | agent |
| 2026-08-06 | Content / Viking Swensen | Maze exit queues `complete_swensen_trial` whenever `swensen_started` (not only if Swensen in npc_find 5) | 274 gated queue on NPC proximity; wander mid-maze soft-locked vote | agent |
| 2026-08-07 | Content / macro events | ~~Koschei pen ban~~ **reverted** | Pen is **not** an instance (shared `2_41_157`). Randoms-in-instances is a separate rule | agent |
| 2026-08-07 | Content / Myreque boat | `travel_to_hollow` / hollows return tele-stub (no swamp_boatjourney IF) | IF pack residual; stage 25 still product Board/Pay path | agent |
| 2026-08-07 | Content / Curpile knockout | Delay + tele Mort’ton (no `~fade_out`/`fade_in`) | 377 tree lacks shared fade procs; product quiz stage write still authentic | agent |
| 2026-08-07 | Content / Myreque cutscene | ~~stub~~ **superseded 2026-08-08** — full cutscene ported; `chatnc_cutscene`→`chatnpc_specific`; Vanstrom NPC renames | 289 cutscene API not on 377; pack names differ | agent |
| 2026-08-08 | Content / fletching cut_logs | Port 274 sacred-oil default on `[opheldu,_category_22]` → `@create_sacred_logs` | Target cat matches before use-cat `sacred_oil` | agent |
| 2026-08-07 | Farming F1 rates | Growth interval **CANDIDATE** 4×1000t (~40 min); XP **CANDIDATE** 8/9 | OSRS/Tip.it-aligned; **not** period-primary — keep labeled until era proof | agent |

Template for new rows:

```text
| YYYY-MM-DD | subsystem | what changed | reason | agent/human |
```

If a “bug” is preserved for authenticity, note that under **research**, not here.  
If the change is only “we soft-entered mid to thrash the next gate,” use **[`softpass.md`](softpass.md)**.

## Related

- Soft mids / not-yet-e2e: [`softpass.md`](softpass.md)  
- Accuracy bar: [`authenticity-stance.md`](authenticity-stance.md)
