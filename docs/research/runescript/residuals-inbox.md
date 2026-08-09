# RuneScript residuals inbox

**Role:** Unsorted / semi-sorted findings for later promotion into `docs/research/runescript/*.md` chapters.  
**Do not** treat this as the teaching manual — use [README.md](README.md) + chapters for that.  
**Append** freely during research; promote clear patterns to `living-notes.md` + the matching chapter.

## Schema

| Date | Topic | Tag | Evidence (path:line or measure) | Promote to? | Notes |
|------|-------|-----|----------------------------------|-------------|-------|
| | | VERIFIED/CANDIDATE | | living-notes / syntax / runtime / … | |

## Seed rows (known product footguns — re-measure to promote)

| Date | Topic | Tag | Evidence | Promote to? | Notes |
|------|-------|-----|----------|-------------|-------|
| 2026-08-07 | Multi-header `[oplocu,a][oplocu,b]@lab` binds **last** only | VERIFIED | farming F1; dump session | syntax.md | one `@lab;` per header |
| 2026-08-07 | `oc_category(null)` aborts script | VERIFIED | equip.rs2 greegree on_unequip; mmgsjpdz5q chat | runtime.md | null-guard before oc_* |
| 2026-08-07 | `queue(name, delay, arg)` needs **two** ints | VERIFIED | greegree pack error; engine.rs2 queue command | syntax.md | |
| 2026-08-07 | settimer before fragile transmog side-effects | VERIFIED | mm_greegree.rs2 | patterns.md | |
| 2026-08-07 | Trail: 377 `trail_puzzle_complete` 0-arg; `give_trail_puzzle` 2-arg | VERIFIED | lord_iorwerth port | living-notes | 274 had more args |
| 2026-08-07 | Map loc type ≠ script bind name (boat) | VERIFIED | route_rowboat_mortton 6969 vs route_rowboat | patterns.md | Myreque hollows |

## Inbox (agents append below)

| Date | Topic | Tag | Evidence | Promote to? | Notes |
|------|-------|-----|----------|-------------|-------|
| 2026-08-08 | `queue` arity = delay + arg | VERIFIED | `engine.rs2:379` `[command,queue](queue, int, int)` | syntax.md | greegree pack fail if one int |
| 2026-08-08 | softtimer vs settimer | VERIFIED | `engine.rs2:351` soft; `:359` set; Player.ts:954 SOFT \|\| canAccess | runtime.md | NORMAL blocked when busy/modal |
| 2026-08-08 | F2P strips members obj category | VERIFIED | `ObjType.ts:67` `category=-1` if !NODE_MEMBERS | runtime.md | isolation members world OK |
| 2026-08-08 | p_finduid claims protect path | VERIFIED | `engine.rs2:88` | runtime.md | equip/on_unequip pattern |
| 2026-08-08 | Map loc type ≠ script bind | VERIFIED | Myreque `route_rowboat_mortton` 6969 vs `route_rowboat` | patterns.md | always check jm2 type |
| 2026-08-08 | Ash: engine change without runescript diff | CANDIDATE | @JagexAsh 2024-10-28 (post 1850898594…) behaviour change may be engine not RS files | living-notes | semantics: engine can move under scripts |

### Phase B corpus metrics (2026-08-08 main, VERIFIED counts)

| Metric | Count | Path |
|--------|------:|------|
| `settimer(` calls | 139 | content `*.rs2` |
| `softtimer(` calls | 48 | content `*.rs2` |
| `queue(` calls | 776 | content `*.rs2` |
| `p_delay(` calls | 1744 | content `*.rs2` |
| `script.pack` lines | 11469 | `vendor/content/pack/script.pack` |
| `[opnpc1,` in script.pack | 724 | pack |
| Stacked multi-header `][` same line | 0 | (modern content uses one header per line / `@label`) |

**Footgun still open:** `equip.rs2` / `death.rs2` still call `oc_category(inv_getobj(...))` without null-guard on rhand — same class as greegree (VERIFIED lines 270–271, 83).

### Wave 2 B3 / Wave 1 agents — continue append

### Opcode usage census (2026-08-08, VERIFIED_DRAFT)

Full table: [opcode-usage-census.md](opcode-usage-census.md). Matching-line totals under `vendor/content/scripts/**/*.rs2` (`\bname(`). Promote after main-thread `rg -o` / `_opcode_census_measure.py`.

| Date | Topic | Tag | Evidence | Promote to? | Notes |
|------|-------|-----|----------|-------------|-------|
| 2026-08-08 | Opcode usage census top-40 (matching lines) | VERIFIED_DRAFT | [opcode-usage-census.md](opcode-usage-census.md) §2 | living-notes / patterns | `obj_add`/`chatnpc`/`p_delay`/`mes` lead; ranks 1–40 filled |
| 2026-08-08 | `queue` density = duel zone grid | VERIFIED_DRAFT | `duel_arena.rs2` ~292/559 lines; folder ~298/559 (~53%) | patterns.md | `[zone]`/`[zoneexit]` → `queue(check_duel_arena_challenge_area, 0, 0)` |
| 2026-08-08 | `p_delay` density = Legends + Zombie Queen | VERIFIED_DRAFT | `quest_legends.rs2` 102; `quest_zombiequeen.rs2` 80 | runtime.md | cutscene timing; folder aggregates §3 |
| 2026-08-08 | Phase B vs session line undercount | CANDIDATE | p_delay 1744→≥1493; queue 776→559; settimer 139→80; softtimer 48→20 | census §1.1 | re-run `rg -o` occurrence pass |
| 2026-08-08 | Measure script for re-verify | VERIFIED | `_opcode_census_measure.py` | paths.md | preferred one-shot census |
| 2026-08-08 | `npc_say` mid-top (**469** lines) | VERIFIED_DRAFT | census rank 15 | patterns.md | overheads ≠ `~chatnpc` |
| 2026-08-08 | `huntnext` not `huntnext(` | VERIFIED_DRAFT | `while (huntnext = true)` property form | syntax.md | not in call census |

**Footgun still open:** `equip.rs2` / `death.rs2` still call `oc_category(inv_getobj(...))` without null-guard on empty rhand — same class as greegree (`oc_category` rank 24 / **150** lines).
