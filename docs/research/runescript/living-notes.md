# Living language notes

> **RuneScript manual** (Fairy Ring / rev 377) · [Index](README.md) · [Living notes](living-notes.md)

**Append every non-trivial RuneScript lesson here** (date + one line + path). Promote recurring patterns into the matching chapter (`syntax.md`, `runtime.md`, …).

## Living language notes (append here)

| Date | Lesson | Source |
|------|--------|--------|
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
