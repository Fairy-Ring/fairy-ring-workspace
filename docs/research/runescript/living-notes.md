# Living language notes

> **RuneScript manual** (Fairy Ring / rev 377) · [Index](README.md) · [Living notes](living-notes.md)

**Append every non-trivial RuneScript lesson here** (date + one line + path). Promote recurring patterns into the matching chapter (`syntax.md`, `runtime.md`, …).

## Living language notes (append here)

| Date | Lesson | Source |
|------|--------|--------|
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

Map/jm2 may spawn a **multi base** (`*_multinpc_*`) with `multivar` / `multinpc=` table. Concrete form holds name/ops and is what scripts bind.

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
