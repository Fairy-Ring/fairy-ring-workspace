# Living language notes

> **RuneScript manual** (Fairy Ring / rev 377) · [Index](README.md) · [Living notes](living-notes.md)

**Append every non-trivial RuneScript lesson here** (date + one line + path). Promote recurring patterns into the matching chapter (`syntax.md`, `runtime.md`, …).

## Living language notes (append here)

| Date | Lesson | Source |
|------|--------|--------|
| 2026-08-16 | `if_openchat` / `openChatModal` **IfClose's main** (LC 274 same). GD crash cannot be `if_openmain(inter_234)` then `~chatnpc` — map dies (`gdcutswi9dd7` 12062 → −1). `inter_234:com_0` is a 600×400 black rect — **`if_openoverlay(inter_234)`** survives chat. Overlay is not closed. | `Player.openChatModal` · `inter_234.if` |
| 2026-08-16 | Chat heads without `if_setanim` are **dead** (frozen dummy / no talk). `chat.rs2` always `if_setplayerhead`/`if_setnpchead` **+** `if_setanim(..., split_getanim($page))`. inter_274 Both/Argh needs `split_init("<p,shock>Argh!", …)` then anim on `com_0` and `com_3`. | `gdcutswi9dd7` · `chat.rs2` |
| 2026-08-16 | GD Kelda water is visible from **2864,10176** (7042 pull, `kw0g0`/`l2l36`). **2856,10178** and **2862,10177** and **2874,10177** look-west are walls / cave mouth — not the canal. | `gdcutswkw0g0` · `gdcutswl2l36` |
| 2026-08-16 | GD palace: **L0 south colonnade is the clothes stall.** Consortium rooms are **L1**. Dest `1_44_159_*` (`gdcutswkbm5a` 2866,10197 **L1**, Purple Pewter office). L0 dest always landed in the shop. hei **720** / look **80** (Arena cage-down) shows stairs+halls, not the YT south-balcony busts. | operator 2026-08-16 |
| 2026-08-17 | GD roofs: **Java 377 matches TS.** `Client.java` `getTopLevelCutscene` is the same `>= 800` **or** `flags & 0x4 == 0` → level 3. `CAM_*` has no plane. 10184 lid is period, not a TS miss. Later OS roof-off **not** checked. | `vendor/client-java` `Client.java:6219` · `giantdwarf-boatman-cutscene-377.md` |
| 2026-08-17 | GD 2014 map+dock chat is **force-timed** — **0** “Click here to continue” (`t080`–`t145`). `~chatnpc` packs continue on `npcchat1:com_3` / `npcchat2:com_4` and `p_pausebutton`. Cutscene: `~chatnpc_page` then `if_sethide` that com + `p_delay` + `if_close`. Overlay 234 stays. | SoupRS `QY2Upo8KRbU` · `npcchat1.if` |
| 2026-08-17 | GD history **replaces** stanzas (2014 `t011`–`t032`). Same packed y on `inter_235` — hide the previous layer group, do not stack 0–8, do not `if_settext`/`if_setposition`. Timed chat: hide continue **before** `if_openchat`; Look is 3 lines → `npcchat3:com_5`. Hide-after-open left continue on the first line and killed the rest (`sxg4l68`). | `inter_235.if` · `npcchat3.if` |
| 2026-08-17 | GD Java vs TS **deepen:** `applyCutscene`, snap-on-accel≥100, `drawScene` push order, `World3D.draw` 25-tile + visBacking, LinkBelow `pushDown`, `IF_OPENOVERLAY` all match. Live cams use `0, 100` so lerp never runs. Palace busts / Red Axe canal / blue water square are **composition**, not a TS miss. | `giantdwarf-boatman-cutscene-377.md` § Java 377 vs TS |
| 2026-08-17 | GD period-video hunt: **no ≤2 May 2006 intro clip.** 2007 HyperCam = ending Consortium. 2007/08 guides skip the crash. 2012 HD Yann has busts + long canal + steamer + chatbox history (not 235). Do not loc_add steamer. | `giantdwarf-boatman-period-video-377.md` |
| 2026-08-17 | GD 2014 OSRS SoupRS `QY2Upo8KRbU` 1:20–2:35: *The Giant Dwarf* title is **top-down on 7042/7040/7031** — the body **busted apart** is the three packed locs, not rubble. History is red-on-3D (235 family). Steamer still later. Live SW full-body cam is the wrong axis. | `giantdwarf-boatman-period-video-377.md` |
| 2026-08-17 | GD roofs **468 = 377.** `ha.d` is the same `>=800` / `flags&4` lid. No cinema roof-off on the OSRS-base client. 2014 busts are not a 2007 client change. | `horizon/client-468-scene-377.md` |
| 2026-08-17 | GD roofs are **not** an FR-engine hole. Same packets → same lids on Java/TS/468. `p_telejump` sets level; `rebuildNormal` before cam flush; CAM has no plane. 10186 interiors already prove the path. Inventing a roof-off packet is a deviation. | `World.ts:1000` · `NetworkPlayer.updateMap` |
| 2026-08-16 | Cutscene roofs: no opcode. `getTopLevelCutscene` = roofs ON if `(heightmap - camY) >= 800` **or** cam tile lacks `RemoveRoof`. `camY = heightmap - hei`, so **`cam_moveto` hei ≥ 800 always shows the lid** (`jd79o`/`jnelu` h900). hei **< 800** + RemoveRoof tile. | `Client.ts` `applyCutscene` · operator *still seeing roofs* |
| 2026-08-16 | GD intro YT `q7F6sYZQbSA` 2:30–4:25: palace-**down** (not plaza facade) · history in **stanzas** (~8t + 4t gap) · Red Axe **on Kelda water** (`com_9` + `com_14`, not `com_10`) · 7042 from water looking **up** · map as **overlay 234** then Look/Amazing/hold-on · `if_openchat(inter_274)` at impact. Unique frames `docs/plans/harness-shots/gdcut_yt_q7F6sYZQbSA/`. | YT unique-frame extract · opener 2026-08-16 |
| 2026-08-16 | `if_openmain` + `if_openchat` **stack**: GD crash is `inter_234` main **and** `inter_274` chat in one frame. Sequential `if_close` between them is the wiki miss (`gqe21`). Packed `mini_statue_explodes` `delay1=275` — short `p_delay` never reaches the boat-to-plinth / explode. `if_setanim` starts it (same pattern as swamp boat). | wiki crash png · `inter_234.if` · `all.seq` |
| 2026-08-16 | Wiki `Both: Aaargh!` is packed **`inter_274`** (id **13578**): two model heads + *Both* / *Argh!*. Not two `~chatnpc`/`~chatplayer` pages. **0** pause button. `if_setplayerhead` + `if_setnpchead` replace the dummy cowl heads. Cache *Argh!* not dump *Aaargh!*. | `inter_274.if` · GD intro |
| 2026-08-16 | **No `if_setfont` / no runtime text-size op on 377.** `engine.rs2` `if_set*` is text / hide / colour / position / scroll / model / anim / heads / tab. `IF_SETTEXT` packet is component id + jagstr only (`IfSetTextEncoder`). Font is packed on the IF (`inter_235` = `b12_full`, height 13–18). That *is* wiki “large, red letters.” Clipping = string wider than the packed box (`com_9` 451×17). Split across `com_9`/`com_10`. Do **not** invent a font packet or resize the `.if`. | `engine.rs2` · `IfSetTextEncoder.ts` · `inter_235.if` |
| 2026-08-16 | `inter_235`: `com_0`…`com_8` are **layers**; `com_9`…`com_17` are **text children** (`b12_full`). `if_settext` hits the child. Title cards must `if_sethide` **all** layers (incl. `com_0`) then unhide only the title lines — a `com_9` swap with `com_0` still up is a history-line edit (`wf9lw8` Red Axe). Restore packed `com_9`/`com_10` after. | `scripts/interfaces/inter_235.if` |
| 2026-08-16 | `%giantdwarf_statue_invis = 1` **before** `if_openmain(inter_234)` blanks 7042 into empty water (`wf9lw8` Aaargh). Open the crash map first, then flip the multi. | `giantdwarf_boatman.rs2` |
| 2026-08-16 | GD intro history is packed **`inter_235`** (red overlay, `hide=yes` lines). `if_openoverlay` + `if_sethide(com_0…com_8, false)` + `p_delay`. Client overlay id **12082**. Crash map **`inter_234`** main **12062**. **Not** mesbox. | `giantdwarf_boatman.rs2` `gdcutsweomyn` |
| 2026-08-16 | `[label,music_playbyregion]` cannot be `@` jumped from inside a `[proc]`. Cutscenes use `~music_playbycoord(coord)` (`[proc,music_playbycoord]`, live pack **13552**). Mapzones stay `@music_playbyregion`. | `music.rs2` · `giantdwarf_boatman.rs2` |
| 2026-08-16 | One `[mapzone,0_x_z]` per square **world-wide**. Trawler / CW **37_148** / boardgames **34_77** / Ikov **41_153** / wildy hosts already own the trigger — add `@music_playbyregion` there, do not duplicate in `move.rs2`. | compile `already defined` |
| 2026-08-16 | `[mapzone]` music is ENGINE queue and waits on `canAccess()` (busy / delayed / protect). A cutscene `p_telejump` will not change the song until the script ends unless the cutscene itself plays music. | `music.rs2` · `Player.processEngineQueue` |
| 2026-08-16 | Walkable dest-side tile can be **indoors**. GD **2838,10200** / **2861,10190** are pub/house. Outdoor: palace door **6114** @ **2862,10199**, stand **2864,10200**; statue look from **2866,10182**. | `gdcutswc95yv` |
| 2026-08-16 | GD Boatman `gdcutswbvip3` **FAIL** (PASS retracted): `~mesbox` before city `p_telejump` plays the intro over the **mines**. Tele + `cam_*` first; then history / crash talk. Statue must be in frame. | `giantdwarf_boatman.rs2` |
| 2026-08-16 | `@name` jumps to `[label,name]`. `[proc,name]` is `~name;`. `@giantdwarf_intro_cutscene` into a proc will not compile / will not run. Restore tabs after `if_settab(null,…)` with `~initalltabs`. | `giantdwarf_boatman.rs2` `204ca4295` review |
| 2026-08-16 | Giant Dwarf **first visit** is a **city-floor cutscene** (`inter_235` + `cam_*` + statue invis + dock **2231** + Veldaban `~chatnpc_specific`), not dest-only and not the 16 Consortium rooms. Packed bits `giantdwarf_statue_invis` / `giantdwarf_cutscene_guard_visible`. **Not** mesbox. Do **not** bind Forget’s `[opnpc1,dwarf_city_black_guard_leader]`. | `giantdwarf-boatman-cutscene-377.md` |
| 2026-08-16 | Giant Dwarf **complete** Consortium cutscene is **16 static rooms** (4 per floor), not instances. 17th player: Veldaban *other important business* / meeting not started. Glimpse from Pyramid Plunder room 3. **Not** Boatman dest. Lost Tribe same-day was first instance. | operator 2026-08-16 · OSRS trivia |
| 2026-08-16 | Dest-uncited **same-level** next-to-loc is a **stand**, not the climb dest. OSF `ladder_5812` @ **2715,3472 L1** → **2715,3471 L1** is still L1. Climb-up dest is **L3** (roof / `5835` stack). House-ladder ±1 lands empty **L2**. | dest-from-our-maps §1 · operator 2026-08-16 |
| 2026-08-16 | BAR **5973** is the statue-crack commute, not Arzinian Fire. Dest-side cave is **`dwarf_cave_entrance` 5998** / ferryman **1843**. L1 **2782,10161** is a ledge over the **same** hall — visual FAIL. | `dwarfrock_tunnel.rs2` |
| 2026-08-16 | MD abseil: later-case rope on live `[oplocu,mdaughter_cliff_boulder]` — snapshot `$used`. Dest `p_telejump(0_43_57_14_15)` = **2766,3663 L0**. Lip **3664** blocked. **0** new pack (existing **12935**). | `mdaughter_cliff.rs2` `mdabssw9ywyy` |
| 2026-08-16 | OSF Drink: four `[opheld1,cup_guthix_rest_*]` `inv_del`/`inv_add` **4417→4419→4421→4423→1980**. Do **not** `@player_consume_item` without `next_obj_stage` (cup vanishes). Own file — not brew. Live pack **13317–13320**. | `osf_guthix_rest_drink.rs2` `osfdksw9u92c` |
| 2026-08-16 | Ahoy refill: `[oplocu,ahoy_ectofunctus]` snapshot `last_useitem`; only **4252** → **4251**; `anim(ectophial_pour_slime_cover, 0)` **880**. Same display **Ectophial**. Live pack **13316**. Empty already dests to **3658,3517**. | `ahoy_ectophial.rs2` `ahrefsw9pj19` |
| 2026-08-16 | Eluned later-case on live `[opnpc1,roving_female_woodelf]` — **no** second header (steals MEP1). Split `= 1` first briefing vs `>= 2` again-talk. Inline (no new `[label]` / pack row). Write **1→2** CANDIDATE, not complete. `%mourning_quest >= 1` still `@mep1_eluned_go`. | `mep1_eluned.rs2` `rove1sw9j3fk` |
| 2026-08-16 | Fenkenstrain Dr: bind **`fenk_fenkenstrain_model` 1670**, not multi **1668**. Live pack **13315** (impl 13316). Hire Braindead + Grave-digging writes `%fenk_quest` **0→1**. Dump refuse is longer than live **No.** | `fenk_dr_talk.rs2` `fendrsw96x58` |
| 2026-08-16 | Ectophial Empty: `[opheld1]` `inv_del` **4251** + `inv_add` **4252** + `anim(ahoy_ecto_teleport, 0)` **878** + dest **3658,3517 L0**. Same display name **Ectophial**. First fold kept full — FAIL. | `ahoy_ectophial.rs2` `ahectsw8imam` |
| 2026-08-16 | Ahoy pay-25: later-case on existing `[opnpc1,ahoy_ghost_captain_1]`. `inv_total` 25 `ectotoken` then `inv_del` + mes + `p_telejump(0_59_55_17_40)` = **3793,3560 L0**. Not on island captain **3792,3560**. Stay `%ahoy_questvar` **3**. **0** new pack. | `ahoy_ghost_captain.rs2` `ahp25sw82gle` |
| 2026-08-16 | CF Cross **out** `[oploc1,fever_gangplank_exit]` **11210** `p_telejump(0_57_54_61_40)` = pier **3709,3496 L0**. Already live. Old `cfgpsvucegu` smoke could PASS without out. Headed **out** is `cfxousw7wrwr`. Plank tiles **3710/3711** L1 are midair. | `fever_gangplank.rs2` |
| 2026-08-16 | CF Let's-go: existing `[opnpc1,fever_port_ship_teach]` after Yes `p_telejump(0_28_75_22_36)` = **1814,4836 L0**. Teach spawn **L1** same x,z is **not** dest. Grab stays deck. **0** new pack id. | `fever_port_ship_teach.rs2` `cflgosw7r65r` |
| 2026-08-16 | Soulbane rope Use: `[oplocu]` on climb-hole parent **13968** + vis-0 child **13969** only — **not** empty `falloff1` **13967**. Snapshot `last_useitem`, `inv_del` rope, write `%soulbane_riftrope_pres=1`. Dest stays existing `[oploc1]` Enter **3013,5243**. Live pack **13311–13313**. | `soulbane_rope.rs2` `sbropsw7l9i3` |
| 2026-08-16 | Handsand Captain: no `&&` / `\|\|` — nest `if`. Transcript `{{tbox\|pic=…}}` is `~objbox`, not `mes()`. `mes` ~80 chars truncated “drops it in his **bee**”. Live pack **13310**. NPC **3109** `m39_48` `0 55 6` = **2551,3078**. | `handsand_guard_captain.rs2` `hand1sw79xwp` |
| 2026-08-16 | Devious whetstone: `[oplocu]` loc Use — `~chatnpc_specific("Doric", doric, …)` not bare `~chatnpc` (loc has no npc pointer). Loc pack **10641** `m46_53` **2953,3451**. Live pack **13309**. | `devious_whetstone.rs2` `35e339a68` |
| 2026-08-16 | Elid Ghaslor: new `[opnpc1,elid_ghaslor]` after `%elidquest>=1`. `inv_total` then `inv_add(elid_ballad)` — do **not** retouch `elid_ballad.rs2` Read. Live pack **13308**. | `elid_ghaslor.rs2` `6f1b1bb03` |
| 2026-08-16 | Agrith Badden: map multi `agrith_badden_uzer` **2901** `multinpc=1` is **hidden at 0**. `[opnpc1,agrith_badden]` on the child cannot flip vis. Clone `4c232ed82` writes `%agrith_badden_uzer=1` on Reen **0→10**. | `agrith_reen.rs2` |
| 2026-08-16 | Lost Tribe Bob: later-case on **existing** `[opnpc1,bob]` — **do not** add a second header. Prefix shop/repair with `%lost_tribe_quest >= 1` then `~p_choice4` cellar first. First witness **1→2**. `<displayname>`. Keep `[opnpcu,bob]` `last_useitem` snapshot. | `bob.rs2` `5a026a987` |
| 2026-08-16 | Two Cats Hild: bind **`death_woman_indoors1`** (pack **1090**), not `_citizen_burthorpe`. Concrete `[opnpc1]` **steals** the category trigger — pre-start must `@citizen_burthorpe_talk` (`Hi!` + troll random), **not** `^dm_default`. First-meet is the long Transcript tree (cat via `~chatnpc_specific` + restore `npc_finduid`). Enchant is `inv_total` + `inv_del`/`inv_add` **same tick**. Missing-amulet ≠ missing-runes. New `[opnpc1]` = live pack **13298**. | `twocats_hild.rs2` · `citizen_burthrope.rs2` |
| 2026-08-16 | Review pass: orchestrator **does not** write product `.rs2`. Copy writes **and** fixes. We review + opener notes + headed smoke. Operator 2026-08-16: let them fix the code. | opener 2026-08-16 |
| 2026-08-14 | `p_delay` corrupts `last_useitem`. Snapshot `def_obj $used = last_useitem` **before** delay; branch on `$used`. Packer: *Attempt to access corrupted pointer [ last_useitem ]*. | `osf_weathervane.rs2` `@osf_vane_anvil` |
| 2026-08-14 | Loc `name` includes is not identity: `Hopper` matches **Hopper controls**. Wheat display is four types; only `wheat` / `wheat_small` / `wheat_smallest` have `[oploc2]`. Multi child `millbase_flour` needs its own `[oploc1]` (274). | `quest-cook-e2e-smoke.mjs` `cke2essxzdhq` |
| 2026-08-14 | After `chatplayer` + `npc_add`, `p_delay(1)` then `npc_find` before `~chatnpc`. `if_close` before spawn lets a smoke treat the hop as done. `npc_del` via `npc_find` after send-back. | `osf_animate_rock.rs2` `osfpfssxghh8` |
| 2026-08-14 | OSF Slagilith is script-spawn: `npc_add` birth **1804** then `npc_changetype` Attack **1802**. `npc_find` gates in-fight Read/Use. No dest. | `osf_animate_rock.rs2` `osfslssuu806` |
| 2026-08-14 | OSF scroll **Use-on-sculpture** is `[oplocu,favour_lady_in_wall]` + `last_useitem = favour_animate_rock`. Same `@label` as Read. First Use does not write or spawn. | `osf_animate_rock.rs2` `osfusssunm8n` |
| 2026-08-14 | Inventory Read of OSF `favour_animate_rock` is `[opheld1]` (`iop1=Read`). In-room vs out-of-range is `inzone` around loc **5808**, not dest. First Read does not consume and does not spawn. | `osf_animate_rock.rs2` `osfrdssubeec` |
| 2026-08-13 | Harness `chooseOption`: `want.includes(t)` makes **Don't read book** select **Read book**. Pick by `comId` / `^read\\b` vs `don't read`. | `quest-dt-arch-return-smoke.mjs` `dtretss5u394` |
| 2026-08-13 | `%npc_int` is a per-instance scratch flag (macros already use it). FT1 GAG uses it as “this gardener already gave a theory” so five Talk-tos to Elstan cannot finish the chase. Lost on respawn — not a named quest bit. | `ft1_gag.rs2` |
| 2026-08-13 | Integer `+` in an assignment needs **`calc(...)`** — bare `$a + $b` is a syntax error. | `rfd_another_cooks.rs2` pack |
| 2026-08-13 | **Unable to jump to labels from within a proc** — packer error. Prefix hooks must `@label` (and `return` on every terminal label) or keep the whole tree inside the proc with no `@`. | `dt_terry.rs2` pack |
| 2026-08-13 | LostCityRS/RuneScriptLanguage is the **VS Code extension**, not `@lostcityrs/runescript` 0.9.6 compiler; pin [`lostcity-runescriptlanguage-377.md`](lostcity-runescriptlanguage-377.md). `.cs2`/`.ls2`/`.ss2`/`.gs2` are LC later-era registrations, not 377 product. | operator ask |
| 2026-08-07 | **@JagexAsh (Mod Ash) tweets about RuneScript are absolutely authoritative** unless later contradicted; land citations in this manual | Operator policy → [README.md](README.md) § Authority |
| 2026-08-08 | Corpus campaign: residual mine → [residuals-inbox.md](residuals-inbox.md) (queue arity, softtimer vs settimer, F2P category strip, map loc ≠ script bind) | 3h research campaign |
| 2026-08-08 | Opcode usage census: top call-like sites under content scripts → [opcode-usage-census.md](opcode-usage-census.md) (**VERIFIED_DRAFT**); `obj_add`/`chatnpc`/`p_delay`/`mes` lead; `queue` dominated by duel zone grid; re-measure via `_opcode_census_measure.py` | census unit |
| 2026-08-04 | `obj` vs `namedobj` for `last_useitem` | Horror `horror_godbook.rs2` |
| 2026-08-04 | Quest title newlines need **double** backslash-n | Horror / seaslug / TBWT |
| 2026-08-04 | `send_quest_complete` 6-arg on 377 | `general/scripts/quests.rs2` |
| 2026-08-04 | No duplicate triggers; search whole tree before port | TBWT lubufu |
| 2026-08-04 | No duplicate config vs `_unpack/377` | Horror dropped re-shipped `.npc` |
| 2026-08-05 | Multi-npc: engine resolve for OP + `npc_name` | TBWT mid |
| 2026-08-05 | `if_close` + `p_delay` → harness must wait for inv/var | Tinsay vessel |
| 2026-08-05 | `setstat` silent; `advancestat` fires ADVANCESTAT | levelup.rs2 |
| 2026-08-05 | Skill guide free IF **18800+** on 377 | skill_guide |
| 2026-08-05 | Same display name, different pack ids | Karambwan vessel 3157/3159 |
| 2026-08-05 | Pack can desync HTTP versionlist → s1 hang | scene-stuck plan |
| 2026-08-07 | Multi-header `[oplocu,a][oplocu,b]@lab` binds **last only** — one `@lab` per header | Farming F1 rake |
| 2026-08-07 | `on_unequip` / any hook: **null-guard** before `oc_category` | greegree equip.rs2; `mmgsjpdz5q` |
| 2026-08-07 | `settimer` before fragile transmog side-effects; re-arm after equip | `mm_greegree.rs2` |
| 2026-08-07 | `queue(name, delay, arg)` needs **two** ints on 377 | greegree force_unequip |
| 2026-08-07 | Trail APIs: 377 `trail_puzzle_complete()` 0-arg; `give_trail_puzzle` 2-arg | `lord_iorwerth.rs2` |
| 2026-08-08 | `softtimer` vs `settimer`: NORMAL timers blocked when delayed/modal; soft may still fire | residuals-inbox; `Player.ts` |
| 2026-08-12 | `p_opnpc(2)` re-enters `[opnpc2]` after `npc_queue` applies the killing blow — `npc_stat(hitpoints)=0` there is where 289 applies Misc **−6** approval | `misc_people.rs2` · `player_melee.rs2` |
| 2026-08-12 | Regicide still: `softtimer,still_progress` at `still_total≥26` **resets** total (no naphtha). Award is only `[if_close]` while total still ≥26 — 2t window. Tar 31 + valve 26 = +2 pressure/2t (gauge moves). Tar 31 + valve 27 = net 0 (gauge parks). **`$bit > 12` → `~reset_regicide_still` + `pressure_toohigh` is a FAIL** (needle falls). | `regicide_fractionalizing_still.rs2` |
| 2026-08-12 | `loc_findallzone`/`loc_findnext` **replace** active loc. A `~proc` that scans a zone before `loc_param`/`loc_change` on the clicked loc will read the **last** zone loc (often `next_loc_stage=null`). Save `loc_coord`+`loc_type`, restore with `loc_find`. | Flamtaer `~recalc_temple_repaired_p` after 703c6181c; `mtnsqq1bke` |
| 2026-08-11 | Harness must wait full delay cycle (firstswing 5t + continue) before re-firing opLoc — new OP mid-delay replaces `Player.activeScript` | Managing M1 weed_herbs.rs2; `managsorn41j` PASS |
| 2026-08-08 | Myreque cutscene port: **no** `~chatnc_cutscene` on 377 → `~chatnpc_specific`; pack NPC renames | `routequest_vanstorm` / cutscene-80 plan |
| 2026-08-08 | Complete stage often `queue(…_complete)` after talk — smoke must wait stage/var, not modal alone | Flamtaer Ulsquire; Myreque Vanstrom |
| 2026-08-08 | Quest complete **scroll IF** can be empty/missed if thrash dismisses or shot races `mainModal=-1` | Flamtaer complete residual |
| 2026-08-09 | MM chapter cards: 377 uses **`scroll`**, not 289 `inter_199` (wrong IF = silent fail / wrong UI) | `mm_start_slice` / ch2; softpass start |
| 2026-08-09 | 377 tree often **lacks** `~fade_out` / `~fade_in` — ports use `p_delay` + `p_teleport` (document deviation) | hangar, Lumdo boat, Curpile, ch2 |
| 2026-08-09 | Hangar puzzle: product `if_close` on solve; harness that re-ops while IF closed races mid-`p_delay` cutscene | `mm_puzzle` / hangar research |
| 2026-08-09 | Stage write **before** cutscene finish is fine; smoke must wait **end tile** / tab restore, not first stage tick | reinit `mm_daero=6` mid-cutscene bug |
| 2026-08-10 | Map spawn bind: op headers use **pack type** (`mm_garkor_aa`, `mm_zooknock_aa`), not bare 289 names | `mm_garkor.rs2` / `mm_zooknock.rs2` |
| 2026-08-10 | **New OP while `p_delay`**: next OPNPC/OPNPCU replaces `activeScript` → prior script dies after `inv_del`, **before** `inv_add` | Zooknock hand-in; `.tmp/mm-handin-13b` |
| 2026-08-10 | OPNPCU hand-in pattern: `last_useitem` + `oc_param($obj, param)` + `enum(int, namedobj, …)` for greegree type | `mm_zooknock` + `mm_bones_mapping` |
| 2026-08-10 | UI display name ≠ symbol: harness needles must match **client name** (`M'amulet mould` not `monkey amulet mould`) | mid-13; harness-prep |
| 2026-08-10 | Thin residual vs full cutscene: may stage-write (`made_talisman`) without `queue(mm_ch3_cutscene)` — label deviation | `mm_zooknock` talisman_check |
| 2026-08-10 | `inv_total(worn, specific_obj)` for greegree **type** check (normal vs ninja) after `~mm_wearing_greegree` | `mm_garkor` p4 / need_correct_disguise |
| 2026-08-10 | Mid-reload pack can leave HTTP VL ≠ disk (or short VL) → s1 / missingLand even when flat file later OK | hand-in 13a VL 80204; assert VL before thrash |
| 2026-08-10 | `FileStream('data/pack', **true**)` **wipes** main_file_cache on every full pack; if pack aborts mid-way or models skip, **idx1–4 empty** → scene hollow (`missingModels`, rem=0, ver=1) while jm2 still full | PackAll.ts:40; temple m43_143 2026-08-10 |
| 2026-08-10 | OPLOCU needs loc at **post-`pushDown` plane** — pack loc level is pre-LinkBelow; land `mapl[1]&LinkBelow` shifts squares L1→L0 (Java method276). Not a TS port bug. | [`client-linkbelow-pushdown-firewall-377.md`](../client-linkbelow-pushdown-firewall-377.md) |
| 2026-08-10 | **`getvar` / new OP mid-dialog aborts `activeScript`** — long chat with deep stage write dies if thrash re-ops or getvars while modal open | MM Awowogei envoy; poll var only when chat clear |
| 2026-08-10 | Harness NPC match: **exact name** for `Monkey` (substring hits Monkey Minder) | MM zoo captive mid |
| 2026-08-10 | Thin chapter cards use **`scroll`** (not 289 `inter_199`); stage write may land **before** card closes | MM ch4 thin / ch2 pattern |
| 2026-08-10 | **Era softlocks:** Jagex often **did not** prevent bad `map_findsquare` / size-3 spawns / strand paths — 289 jungle demon comment “no size checks… unable to walk”; Idris notes “crowded tiles → watch spawn fail”. Prefer ladder script shape over inventing open-tile fixes | authenticity-stance §10; regicide-idris-spawn §8 |

### 12.1 Multi-npc / multi-loc (detail)

Map/jm2 may spawn a **multi base** (`*_multinpc_*`) with `multivar` / `multinpc=` table. Concrete form holds name/ops and is what scripts bind. Engine indexes `multinpc[state]` — holes pack as **65535**. BAR `dwarfrock_quest` table is **0/10/20…/110**; write **1** hid Dondakan (`bardnss8tydf`). First visible start write is **10**.

| Layer | Must use |
|-------|----------|
| Client draw / menu | Active multi type |
| Engine OP validation | Multi-resolve before op strings |
| Trigger lookup | Multi-resolved type id |
| `npc_name` / chat title | Multi-resolved (else title **`null`**) |

Engine: `Player.getOpTrigger`, `OpNpcHandler`, `NpcOps` NPC_NAME.  
Harness: `reader.npcs()` should prefer active type names.

### 12.2 Mid-script delay race

```text
inv_del(...);
if_close;
p_delay(3);
inv_add(...);   // only after delay
```

Between `if_close` and `inv_add`, inv/stage may look “failed.” **Wait** for item or server var; do not thrash the same op.

**Harder failure (2026-08-10 Zooknock OPNPCU):** a **new** player op (second use-on NPC, talk, walk-op) while suspended replaces `Player.activeScript`. The first script never resumes → materials gone, rewards never added. Harness must drain chat, wait ≥ `p_delay` ticks, then gate on inv/var before the next OP. Product code should assume clients can interrupt; authentic scripts still use this pattern widely.

### 12.3 Level-up path

`stat_advance` / XP boundary → engine ADVANCESTAT → `[advancestat,skill]` → `levelup.rs2`.  
`::setstat` does **not** fire level-up scripts; `::advancestat` does.

### 12.4 Transmit vs server-only varps

| | Client reader | Server getvar |
|--|---------------|---------------|
| `transmit=yes` | Mirrors | OK for gates |
| no transmit / protect | Often stale 0 | **Authoritative** |

---
