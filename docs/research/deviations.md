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
| 2026-08-09 | Isolation engine | `NODE_RANDOM_EVENTS=false` (env) | Suppress `afk_event` / general+skill macros for thrash debugging only — **not** product authenticity; set `true` for real randoms | agent |
| 2026-08-07 | Content / Myreque boat | `travel_to_hollow` / hollows return tele-stub (no swamp_boatjourney IF) | IF pack residual; stage 25 still product Board/Pay path | agent |
| 2026-08-07 | Content / Curpile knockout | Delay + tele Mort’ton (no `~fade_out`/`fade_in`) | 377 tree lacks shared fade procs; product quiz stage write still authentic | agent |
| 2026-08-07 | Content / Myreque cutscene | ~~stub~~ **superseded 2026-08-08** — full cutscene ported; `chatnc_cutscene`→`chatnpc_specific`; Vanstrom NPC renames | 289 cutscene API not on 377; pack names differ | agent |
| 2026-08-08 | Content / fletching cut_logs | Port 274 sacred-oil default on `[opheldu,_category_22]` → `@create_sacred_logs` | Target cat matches before use-cat `sacred_oil` | agent |
| 2026-08-07 | Farming F1 rates | Growth interval **CANDIDATE** 4×1000t (~40 min); XP **CANDIDATE** 8/9 | OSRS/Tip.it-aligned; **not** period-primary — keep labeled until era proof | agent |
| 2026-08-10 | Content / MM Daero | Leave menu always available (no `mm_daero_option_bit_*` gate); `daero_move_hangar` delay+tele no fade; training montage skips 289 `inter_199` | 377 thin port; option bits / fade residual | agent |
| 2026-08-10 | Content / MM reinit IF | IF free pack **19153–19158** (289 used **11126** = 377 `inter_214`); frame model named `if_mm_reinit_frame` not raw `model_4695` | ID collision + packer name rules | agent |
| 2026-08-10 | Content / MM hangar cutscene | `hangar_cutscene` / bunker tele: delay+tele, no `~fade_out`/`~fade_in` | 377 tree lacks shared fade procs (same class as Myreque boat) | agent |
| 2026-08-10 | Content / MM reinit stage write | `%mm_daero = reinit_complete` on **solve** (not only cutscene end) | 289 end-only write soft-locked if cutscene aborted; durable stage preferred | agent |
| 2026-08-10 | Content / MM hangar login rescue | `~mm_hangar_login` finishes viewing-map (`0_40_70`) → final hangar if puzzle complete | 289 has ch2–4 login rescues only; hangar mid-cutscene disconnect left magic blank / wrong tile | agent |
| 2026-08-10 | Content / MM Waydar fly | Fly tele + glidermap only; **no** `mm_main = arrived_atoll` on fly | Stage write is ch2 cutscene end (authentic) | agent |
| 2026-08-10 | Content / MM ch2 cutscene | `scroll` not `inter_199`; no fade; NPC names `mm_cutscene_foreman`/`mm_cutscene_caranock`; missing-NPC path still writes `mm_main=3` | 377 IF/pack names + soft-lock fix (289 silent no-op if NPC missing) | agent |
| 2026-08-10 | Content / MM Lumdo boat | delay+tele, no `~fade_out`/`~fade_in` | 377 lacks shared fade | agent |
| 2026-08-10 | Content / MM Garkor | Op bound to **`mm_garkor_aa`** (map spawn); late cases mesbox residual (Zooknock/Awowogei/ch4) | 377 pack has no `mm_garkor` type name; full 289 path residual | agent |
| 2026-08-10 | Content / MM Zooknock hand-in | Soft mats + `need_items` flags; product OPNPCU greegree + enchanted bar; **no** ch3 cutscene after talisman (289 residual) | ch3 cutscene residual | agent |
| 2026-08-10 | Content / MM ch3 after greegree | Thin stage write `%mm_zooknock=made_talisman` + `%mm_main=completed_ch2` after greegree inv_add — **no** full ch3 cutscene / Waydar–Caranock map | 289 queues `mm_ch3_cutscene` | agent |
| 2026-08-10 | Content / MM Garkor p4 | Correct Karamjan greegree → `seek_alliance` | ch4 cutscene residual | agent |
| 2026-08-10 | Content / MM Awowogei envoy | Thin `mm_throne` Talk → `mm_awowogei=sent_mission`; advisors dual-NPC path; no aa_summon_guards on human approach (mesbox residual) | 289 full guards | agent |
| 2026-08-10 | Content / MM zoo captive | Thin zoo Talk + throne hand-in / oplocu; no backpack timer chatter, banana trail clue, or jungle free-release zones | 289 full `mm_zoo_monkey` flavour | agent |
| 2026-08-10 | Content / MM ch4 thin | Garkor post-awo: stage write `completed_ch3` + `learned_plan` + scroll chapter card; **no** Waydar/Caranock cutscene map | 289 `@mm_ch4_cutscene` full dialogue | agent |
| 2026-08-10 | Content / MM jungle demon spawn (candidate) | If product uses **fixed arena tiles** instead of 289 `map_findsquare(coord, 5, 10, lineofwalk)` to force a green mid — that is a **QoL harden**, not proven era behaviour (289 even notes no size checks / bad walks) | Prefer restore ladder shape; soft tele open only in harness | agent |
| 2026-08-10 | Content / MM final battle thin | Squad `npc_add` list + `mm_finalbattle_cleanup` AI timers (leave arena / logout → `npc_del`); **no** full gnome combat AI / camera pan | 289 full `mm_demon` AI residual | agent |
| 2026-08-10 | Content / mystic gear combat params | 377 unpack mystic robes had **no** magic attack/def; filled era OSRS-classic bonuses for thrash/product wear | Unpack gap; defendable May-2006 shape | agent |
| 2026-08-10 | Engine / appearance headicons 377 | `generateAppearance` wrote `0xff/0xff` for pk/prayer icons — fixed encode from content bitmask | Was always no overhead; client already dual-s8 | agent |
| 2026-08-10 | Content / hunt.pack IDs | Renumbered hunt modes 0…n−1 so `cowardly=3` matches packed HuntType (was pack id 80 → null hunt NPE) | Pack/load id mismatch | agent |
| 2026-08-10 | ~~Client / MM temple firewall plane~~ | **Retracted as bug** — see research | **Authentic** LinkBelow + `World.pushDown` (Java method276): pack L1 → scene L0 | agent |

Template for new rows:

```text
| YYYY-MM-DD | subsystem | what changed | reason | agent/human |
```

If a “bug” is preserved for authenticity, note that under **research**, not here.  
If the change is only “we soft-entered mid to thrash the next gate,” use **[`softpass.md`](softpass.md)**.

## Related

- Soft mids / not-yet-e2e: [`softpass.md`](softpass.md)  
- Accuracy bar: [`authenticity-stance.md`](authenticity-stance.md)
