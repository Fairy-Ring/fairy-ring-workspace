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

### 12.3 Level-up path

`stat_advance` / XP boundary → engine ADVANCESTAT → `[advancestat,skill]` → `levelup.rs2`.  
`::setstat` does **not** fire level-up scripts; `::advancestat` does.

### 12.4 Transmit vs server-only varps

| | Client reader | Server getvar |
|--|---------------|---------------|
| `transmit=yes` | Mirrors | OK for gates |
| no transmit / protect | Often stale 0 | **Authoritative** |

---
