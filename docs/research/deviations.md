# Authenticity deviations log

Record **intentional product / platform differences** from historical May 2006 / cache truth that we **keep** (or kept) in pure trees or isolation.

**Not this file:** soft mid thrash, soft entry, “not e2e yet” — that is process stage tracking in **[`softpass.md`](softpass.md)**.

| Date | Area | Deviation | Why | Owner |
|------|------|-----------|-----|-------|
| 2026-08-12 | Content / Managing labour XP | Leif/Magnus award **full** gather XP (maple **100** WC, coal **50** Mining) from 289 `productexp`. **REVISIT.** | 289 can be wrong. OSRS until 30 Nov 2022 had **drastically reduced** kingdom-gather XP; 2007-base is closer to May 2006 than 2022 — last-resort inference is **reduced**, rate unknown (do not invent). Keep 289-full for now. Hunt 2026-08-13: period still silent; last-resort **0.1** appears on OSRS *Tree* Changes (pre-2022) + RS3 maple + 2009 wikia “fraction of a single XP” — **not** a product rate. | agent |
| 2026-08-12 | Content / music LOOP mes | “Music looping now enabled/disabled.” | 377 IF + `musicloop` varp are period; **mes text** cited in 274 as July 2006 (post-tip). Button behaviour is 274 loop timer + `midi_length` | agent |
| 2026-08-03 | Ports | WEB **81**, GAME **43595** (not stock 80/43594) | Isolation from live 274; Java client requires WEB=`80+offset`, GAME=`43594+offset` with same offset | ops |
| 2026-08-03 | Ports | Was briefly WEB **8891** (wrong) | Broke CRC; fixed back to **81** | ops |
| 2026-08-13 | Content / Flamtaer overlay | Name **`flamtaer_status`** moved to cache **4959** (was leftover `inter_113`). Free-ID **18962** renamed `flamtaer_status_free` unused | 289 same-id | agent |
| 2026-08-13 | Content / Yrsa shoe IF | Name **`shoestore`** moved to cache **9947** (was leftover `inter_199`). Free-ID **19049** renamed `shoestore_free` unused | 289 same-id + named comps 10038–10050 | agent |
| 2026-08-13 | Content / Peer combo IF | Name **`combolockdoor`** moved to cache **10051** (was leftover `inter_200`). Free-ID **18989** renamed `combolockdoor_free` unused | 289 same-id; scripts already used the name | agent |
| 2026-08-13 | Content / Viking mural IF | Scripts retargeted **`viking_mural` 9929**. Free-ID **`inter_185` 18971** left packed, unused | Port used leftover-named free IF; 289 opens cache-native mural | agent |
| 2026-08-13 | Content / Horror study IF | Scripts retargeted **`horror_metaldoor` 10116** (cache leftover / 289). Free-ID **`horror_door` 18952–18961** left packed, unused | Port (2026-08-04) invented 18952 because leftover was unnamed `inter_201`. Same layout. | agent |
| 2026-08-13 | Content / deposit box IF | Leftover `inter_95` **4465** named **`bank_deposit_box`**. 289 same-id is `tickets_shop:com_3` (not stolen). 274/289 never shipped a deposit IF (no loc either). Name is the 377 loc ledger slug + `bank_main`/`bank_side` family — not a third invent. | Decision **013** §7: same row/family; LC 289 is a guide, not a hole | agent |
| 2026-08-13 | Content / skill guide IF | Name **`skill_guide`** moved to cache **8714** (was leftover `inter_183`). Free-ID **18800** renamed `skill_guide_free` unused. **Four** comps stay free-ID: `levelinv2` **18934**, `com_143` **18944**, `com_146` **18947**, `com_149` **18950** — 289 slots **8848/8858/8861/8864** are 377 `inter_169:com_45–48` (Decision 013, no steal). 679–681 leftover names not renamed (289 **tanner**). | 289 same-id + leftover join | agent |
| 2026-08-04 | Content / skill guide IF | ~~Pack root **18800**~~ **superseded 2026-08-13** — name now on cache **8714** | Was free range after TBWT because leftover `inter_183` occupied 8714 | agent |
| 2026-08-04 | Content / skill guide varp | First landing **730–731**; **remapped to 333–334** (= 274 ids) | Temp varps; 377 placeholders free — dual-branch alignment | agent |
| 2026-08-04 | Content / skill guide | Stats pack **names** `stats:com_68`… → `stats:attack`… on **same ids 8654–8672** | LC symbol names for `if_button` (matches 274); numeric ids unchanged | agent |
| 2026-08-04 | Engine | `stat_enabled` / `STAT_ENABLED=10010` | LC extension so content can read `PlayerStatEnabled` | agent |
| 2026-08-04 | Content / skill guide | Guide **unlock text** is 274/early stock | May 2006 era refresh still TODO; open/wire works | agent |
| 2026-08-05 | Nav / Horror bridge | Pack + live open L0 **2597,3608** (bridge gap) so PathFinder can step west↔east | Static lcnav ignores LocType multiloc (op 77). **Not** authentic free cross without repair — quest still needs plank `oplocu`. See `nav-multiloc-collision.md` | agent |
| 2026-08-06 | Content / Viking Swensen | Maze exit queues `complete_swensen_trial` whenever `swensen_started` (not only if Swensen in npc_find 5) | 274 gated queue on NPC proximity; wander mid-maze soft-locked vote | agent |
| 2026-08-07 | Content / macro events | ~~Koschei pen ban~~ **reverted** | Pen is **not** an instance (shared `2_41_157`). Randoms-in-instances is a separate rule | agent |
| 2026-08-09 | Isolation engine | `NODE_RANDOM_EVENTS=false` (env) | Suppress `afk_event` / general+skill macros for thrash debugging only — **not** product authenticity; set `true` for real randoms | agent |
| 2026-08-07 | Content / Myreque boat | ~~tele-stub~~ **restored 2026-08-13** — leftover `inter_230`/`inter_229` renamed `swamp_boatjourney`/`_back` @ **11902**/**11898**; 289 `travel_to_hollow` + hollows return | Model symbols stay `com_i*`. No fade (377 has none). | agent |
| 2026-08-07 | Content / Curpile knockout | Delay + tele Mort’ton (no `~fade_out`/`fade_in`) | 377 tree lacks shared fade procs; product quiz stage write still authentic | agent |
| 2026-08-07 | Content / Myreque cutscene | ~~stub~~ **superseded 2026-08-08** — full cutscene ported; `chatnc_cutscene`→`chatnpc_specific`; Vanstrom NPC renames | 289 cutscene API not on 377; pack names differ | agent |
| 2026-08-08 | Content / fletching cut_logs | Port 274 sacred-oil default on `[opheldu,_category_22]` → `@create_sacred_logs` | Target cat matches before use-cat `sacred_oil` | agent |
| 2026-08-07 | Farming F1 rates | Growth interval **CANDIDATE** 4×1000t (~40 min); XP **CANDIDATE** 8/9 | OSRS/Tip.it-aligned; **not** period-primary — keep labeled until era proof | agent |
| 2026-08-10 | Content / MM Daero | Leave menu always available (no `mm_daero_option_bit_*` gate); `daero_move_hangar` delay+tele no fade; training montage skips 289 `inter_199` | 377 thin port; option bits / fade residual | agent |
| 2026-08-13 | Content / MM reinit IF | Name **`reinitialisation_puzzle`** moved to cache **11126**. Free-ID **19153** renamed `reinitialisation_puzzle_free`. Frame model still `if_mm_reinit_frame` (leftover `.if` used `com_i338`) | 289 same-id leftover join | agent |
| 2026-08-10 | Content / MM reinit IF | ~~IF free pack **19153–19158**~~ **superseded 2026-08-13** — name now on cache **11126** | Was free because leftover `inter_214` occupied 11126 | agent |
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
| 2026-08-10 | Client-TS MIDI bank | **Florestan** loaded via setSoundfont-equivalent (Java leaves bank to JVM) | Decision 012: pin XP GS proxy; not Gervill. See `012-midi-java-impl-xp-soundfont.md` | agent |
| 2026-08-10 | Client-TS MIDI (parked) | Webpage SF2 upload / multi-bank shell | Intentional deviation later; upload branch parked | agent |
| 2026-08-10 | Client-TS MIDI backend | Spessa + Web Audio instead of `javax.sound.midi` | Decision 012: stock Spessa; Jagex control plane; Florestan bank | agent |
| 2026-08-10 | Client-TS MIDI (removed) | FluidSynth / tinymidipcm multi-backend | Spike A/B only; Spessa won; dead code deleted from tree | agent |
| 2026-08-13 | Content / Managing Miscellania IF | Name **`misc_both_manage`** moved to cache **10984** (was leftover `inter_210`). Free-ID **19159** renamed `misc_both_manage_free` unused | 289 same-id leftover join | agent |
| 2026-08-12 | Content / Managing Miscellania IF | ~~Pack root **19159**~~ **superseded 2026-08-13** — name now on cache **10984** | Was free because leftover `inter_210` occupied 10984 | agent |
| 2026-08-12 | Content / Managing IF models | `model_4617`…`4626` rebound to 377 pack names (`com_i327`…); `if_north_arrow` → **`com_i155`** (same id **3039** as 289) | Packer requires named models; numeric ids unchanged | agent |
| 2026-08-12 | Content / Leif intercept XP | `leif_intercept_wood` awards **woodcutting** (289 copy-pasted `stat_advance(mining)`) | 289 typo from Magnus; chopping maple is WC. Logged so LC can revert if they want the 289 bug | agent |

Template for new rows:

```text
| YYYY-MM-DD | subsystem | what changed | reason | agent/human |
```

If a “bug” is preserved for authenticity, note that under **research**, not here.  
If the change is only “we soft-entered mid to thrash the next gate,” use **[`softpass.md`](softpass.md)**.

## Related

- Soft mids / not-yet-e2e: [`softpass.md`](softpass.md)  
- Accuracy bar: [`authenticity-stance.md`](authenticity-stance.md)
