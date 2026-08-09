# Opcode / command-like usage census — `vendor/content/scripts/**/*.rs2`

**Status:** **VERIFIED_DRAFT** (2026-08-08)  
**Scope:** call sites of the form `\bname\(` under `vendor/content/scripts/**/*.rs2`  
**Not:** engine bytecode, packed `script.dat`, or inventing opcodes

**Role:** Frequency map of what content *actually calls*, for runtime footgun prioritization (`p_delay`, `queue`, `oc_category`, protect via `p_finduid`, timers) and for teaching the RuneScript manual with high-signal examples.

**Related:** [residuals-inbox.md](residuals-inbox.md) · [engine.rs2](../../../vendor/content/scripts/engine.rs2) · [runtime.md](runtime.md) · [patterns.md](patterns.md) · measure helper [`_opcode_census_measure.py`](_opcode_census_measure.py)

---

## 1. Methodology (read before trusting ranks)

| Rule | Detail |
|------|--------|
| **Pattern** | `\bNAME\(` — same family as `rg -o '\b(p_delay\|queue\|mes\|…)\('` |
| **Secondary pointer** | `.mes(`, `.queue(`, `.p_delay(` **count under base name** `mes` / `queue` / `p_delay` (word boundary sits before the letter after `.`) |
| **Proc calls** | `~chatnpc(` **matches** `\bchatnpc\(` — listed as command-*like*, tagged **PROC** (not in `engine.rs2` as `[command,chatnpc]`) |
| **Unit** | This session’s greps report **matching lines** (exact when total &lt; tool cap). Multi-call lines undercount vs true **occurrence** totals (`rg -o \| wc -l`). |
| **Comments** | Live lines that still contain `name(` (including `// … name(`) are counted. |
| **engine.rs2** | Declarations use `[command,name](…)` — they do **not** create `name(` call sites, so they do not inflate counts. |
| **Tag** | **VERIFIED_DRAFT** = measured this session from tree; re-run §5 recipes after large content ports. Promote to **VERIFIED** after a full `rg -o` occurrence pass (script or shell). |

### 1.1 Cross-check vs Phase B residual seed (2026-08-08)

Earlier [residuals-inbox](residuals-inbox.md) Phase B used occurrence-style totals:

| Op | Phase B (occurrence, prior) | This session (matching lines) | Note |
|----|----------------------------:|------------------------------:|------|
| `p_delay(` | 1744 | ≥1493 | multi-call lines; tree may have drifted slightly |
| `queue(` | 776 | **559** | duel zone fan-out is line-dense (1 call/line) |
| `settimer(` | 139 | **80** | re-verify with `rg -o` |
| `softtimer(` | 48 | **20** | re-verify with `rg -o` |

**Draft policy:** Prefer **this session’s exact matching-line counts** for ranks when exact; keep Phase B as **upper-bound occurrence CANDIDATE** for delay/queue/timers until `rg -o` is re-run.

---

## 2. Top 40 command-like call sites (VERIFIED_DRAFT)

Sorted by this-session **matching-line** count.  
**Kind:** `CMD` = declared in `engine.rs2` as `[command,…]` (including secondary `.name` forms). `PROC` = content proc / helper called with `~name(` or bare name that is not an engine command.

| Rank | Matching lines | Name | Kind | Notes |
|-----:|---------------:|------|------|-------|
| 1 | ≥1773 | `obj_add` | CMD | Drop tables dominate |
| 2 | ≥1711 | `chatnpc` | PROC | Almost always `~chatnpc(`; chat helper |
| 3 | ≥1493 | `p_delay` | CMD | Protect path; Phase B occ **1744**; tool cap ≥1423 |
| 4 | ≥1455 | `mes` | CMD | Includes `.mes(` |
| 5 | ≥1321 | `inv_add` | CMD | |
| 6 | ≥1235 | `inv_del` | CMD | |
| 7 | ≥1229 | `inv_total` | CMD | |
| 8 | **1196** | `movecoord` | CMD | Ubiquitous coord math |
| 9 | **1002** | `if_settext` | CMD | UI / quest journals |
| 10 | **950** | `sound_synth` | CMD | |
| 11 | **830** | `anim` | CMD | Player + `.anim` |
| 12 | **660** | `p_teleport` | CMD | Walk-style move |
| 13 | **559** | `queue` | CMD | Phase B occ **776**; see §4 |
| 14 | **480** | `p_telejump` | CMD | Instant move (stairs/ladders) |
| 15 | **469** | `npc_say` | CMD | Overheads / combat flavour |
| 16 | **417** | `stat_advance` | CMD | XP awards |
| 17 | **372** | `oc_param` | CMD | Obj params |
| 18 | **353** | `npc_param` | CMD | Combat / death_drop |
| 19 | **282** | `loc_add` | CMD | Doors / gates / temp scenery |
| 20 | **255** | `inv_setslot` | CMD | Dose/stage swaps, boards |
| 21 | **237** | `p_finduid` | CMD | Claim protect; equip / timers |
| 22 | **234** | `npc_anim` | CMD | Combat + cutscenes |
| 23 | **173** | `npc_add` | CMD | Spawn |
| 24 | **150** | `oc_category` | CMD | **null aborts** (footgun) |
| 25 | **137** | `inzone` | CMD | Multi-call lines undercount vs `rg -o` |
| 26 | **135** | `oc_name` | CMD | Strings for mes |
| 27 | **109** | `map_findsquare` | CMD | Spawn / tele scatter |
| 28 | **109** | `spotanim_map` | CMD | Map VFX |
| 29 | **97** | `spotanim_pl` | CMD | Player VFX / specs |
| 30 | **95** | `loc_del` | CMD | Door/gate reverse |
| 31 | **82** | `cleartimer` | CMD | Timer hygiene |
| 32 | **80** | `settimer` | CMD | Phase B **139** occ |
| 33 | **80** | `facesquare` | CMD | Cutscene facing |
| 34 | **78** | `distance` | CMD | |
| 35 | **53** | `p_walk` | CMD | Path approach (hallifred maze heavy) |
| 36 | **30** | `longqueue` | CMD | Stalls / mortton / viking (incl. comments) |
| 37 | **24** | `buildappearance` | CMD | Worn rebuild |
| 38 | **20** | `softtimer` | CMD | Phase B **48** occ; boardgames |
| 39 | **20** | `weakqueue` | CMD | Mostly comments; ~8 live |
| 40 | **4** | `strongqueue` | CMD | Death + castlewars (live ≈3) |

**Not in top-40 call form (notes):** `huntnext` / `huntall` appear as **boolean properties** (`while (huntnext = true)`), not `huntnext(` — do not count as command-like calls. Bare `stat(` is common but not fully ranked here (often mixed with `stat_base` / assignments).

**Seed list (explicit request examples) — matching lines this session:**

| Name | Lines | Kind |
|------|------:|------|
| `p_delay` | ≥1493 | CMD |
| `settimer` | 80 | CMD |
| `softtimer` | 20 | CMD |
| `queue` | 559 | CMD |
| `mes` | ≥1455 | CMD |
| `inv_add` | ≥1321 | CMD |
| `inv_del` | ≥1235 | CMD |
| `chatnpc` | ≥1711 | PROC |
| `inzone` | 137 | CMD |
| `oc_category` | 150 | CMD |
| `p_finduid` | 237 | CMD |

---

## 3. Files with most `p_delay(` (matching lines)

Relative to `vendor/content/scripts/`.

| Lines | File | Notes |
|------:|------|-------|
| **102** | `quests/quest_legends/scripts/quest_legends.rs2` | Cutscene / obstacle heavy |
| **80** | `quests/quest_zombiequeen/scripts/quest_zombiequeen.rs2` | Long quest script |
| **~52** | `quests/quest_horror/scripts/horror_godbook.rs2` | Preach sequences |
| **~37** | `minigames/game_agilityarena/scripts/agilityarena.rs2` | Pillar runs |
| **~30** | `quests/quest_viking/scripts/viking_hallifred.rs2` | Maze tele+delay pattern |
| **~28** | `skill_agility/scripts/shortcuts.rs2` | World shortcuts |
| **~20** | `quests/quest_troll_love/scripts/quest_troll_love.rs2` | Sled sequence |
| **~19** | `quests/quest_ikov/scripts/ikov_dungeon.rs2` | Bridge / levers |
| **~18** | `quests/quest_waterfall/scripts/quest_waterfall.rs2` | Rapids |
| **11** | `minigames/game_agilityarena/scripts/agilityarena_zones.rs2` | Zone traps |

**Quest-folder aggregates (p_delay lines):**

| Folder | Lines |
|--------|------:|
| `quests/quest_legends/` | **176** |
| `quests/quest_zombiequeen/` | **81** |
| `quests/quest_viking/` | **72** |
| `quests/quest_horror/` | **71** |
| `skill_agility/` | **58** |
| `minigames/game_agilityarena/` | **48** |

**Re-verify top files:**

```bash
export RS2_R377_ROOT=$RS2_R377_ROOT
cd "$RS2_R377_ROOT"
rg -o --no-filename '\bp_delay\(' vendor/content/scripts --glob '*.rs2' \
  | wc -l
# per-file occurrence ranking:
rg -c '\bp_delay\(' vendor/content/scripts --glob '*.rs2' \
  | sort -t: -k2 -nr | head -25
```

---

## 4. Files with most `queue(` (matching lines)

| Lines | File | Notes |
|------:|------|-------|
| **~292** | `minigames/game_duelarena/scripts/duel_arena.rs2` | **Dominates corpus:** dense `[zone,…]` / `[zoneexit,…]` → `queue(check_duel_arena_challenge_area, 0, 0)` grid |
| **3** | `minigames/game_duelarena/scripts/duel_arena_start.rs2` | disconnect queues |
| **2** | `minigames/game_duelarena/scripts/duel_arena_finish.rs2` | finish |
| **2** | `minigames/game_duelarena/scripts/duel_forfeit.rs2` | forfeit |
| **~25** | `minigames/game_trawler/**` (folder) | flood / sink / win fan-out |
| **~22** | `skill_combat/**` (folder) | damage / poison / freeze |

**Duel arena alone ≈ 53% of all `queue(` matching lines (298 / 559 in `game_duelarena/`).**

**Re-verify:**

```bash
rg -c '\bqueue\(' vendor/content/scripts --glob '*.rs2' \
  | sort -t: -k2 -nr | head -25
rg -o '\bqueue\(' vendor/content/scripts --glob '*.rs2' | wc -l
# arity reminder (engine):
rg -n '\[command,queue\]' vendor/content/scripts/engine.rs2
# → queue(queue, int delay, int arg) — two ints required
```

---

## 5. Verify-queue recipes (totals + re-measure)

### 5.1 One-shot full census (preferred)

```bash
export RS2_R377_ROOT=$RS2_R377_ROOT
cd "$RS2_R377_ROOT"
python3 docs/research/runescript/_opcode_census_measure.py
```

Helper walks all `*.rs2`, counts `\b.?name\(` tokens, ranks engine commands, prints top files for `p_delay` / `queue`.

### 5.2 Seed ops (occurrence counts, matches Phase B style)

```bash
cd "$RS2_R377_ROOT"
for op in p_delay settimer softtimer queue mes inv_add inv_del chatnpc inzone oc_category p_finduid; do
  n=$(rg -o --no-filename "\\b${op}\\(" vendor/content/scripts --glob '*.rs2' | wc -l | tr -d ' ')
  echo "$n  $op"
done | sort -nr
```

### 5.3 Top 40 engine commands only

```bash
# extract command names from engine.rs2, then count each (slow but pure shell):
rg -o '\[command,\.?([A-Za-z_][A-Za-z0-9_*]*)\]' -r '$1' vendor/content/scripts/engine.rs2 \
  | sed 's/^\.//' | sort -u > /tmp/rs2-cmds.txt
# then loop or use the Python helper (faster)
```

### 5.4 Spot-checks for footguns

```bash
# oc_category without null guard (class of greegree / equip bugs)
rg -n 'oc_category\(' vendor/content/scripts --glob '*.rs2' | head
# p_finduid protect claim sites
rg -n 'p_finduid\(' vendor/content/scripts --glob '*.rs2' | wc -l
# softtimer vs settimer ratio
rg -o '\bsofttimer\(' vendor/content/scripts --glob '*.rs2' | wc -l
rg -o '\bsettimer\(' vendor/content/scripts --glob '*.rs2' | wc -l
```

### 5.5 When to re-run

| Event | Action |
|-------|--------|
| Large quest/minigame port | Re-run §5.1; update top-40 + top files if ranks move |
| New duel/zone fan-out pattern | Re-check `queue` file ranking |
| Pack / tree SHA change | Note SHA + date in living-notes |

---

## 6. Residuals-inbox summary (for promotion)

Copy-ready rows for [residuals-inbox.md](residuals-inbox.md):

| Date | Topic | Tag | Evidence | Promote to? | Notes |
|------|-------|-----|----------|-------------|-------|
| 2026-08-08 | Opcode usage census top-40 (matching lines) | VERIFIED_DRAFT | [opcode-usage-census.md](opcode-usage-census.md) §2 | living-notes / patterns | `obj_add`/`chatnpc`/`p_delay`/`mes` lead |
| 2026-08-08 | `queue` density = duel zone grid | VERIFIED_DRAFT | `duel_arena.rs2` ~292/559 lines | patterns.md | zone/zoneexit fan-out |
| 2026-08-08 | `p_delay` density = Legends + Zombie Queen | VERIFIED_DRAFT | `quest_legends.rs2` 102; `quest_zombiequeen.rs2` 80 | runtime.md | cutscene timing |
| 2026-08-08 | Phase B vs session line undercount | CANDIDATE | p_delay 1744→≥1493; queue 776→559 | census §1.1 | re-run `rg -o` |
| 2026-08-08 | Measure script for re-verify | VERIFIED | `_opcode_census_measure.py` | paths.md | |

**Footgun still open (unchanged):** `equip.rs2` / `death.rs2` `oc_category(inv_getobj(…))` without null-guard on empty rhand — same class as greegree (see residuals seed).

---

## 7. Takeaways for implementers

1. **`p_delay` is the content timing backbone** — any harness/smoke that races mid-dialogue must wait ticks, not wall-clock alone.  
2. **`queue` is not rare combat glue only** — **minigame zone grids** can outnumber quest complete queues; arity remains **delay + arg**.  
3. **`oc_category` is mid-frequency but high-severity** (~150 lines) — null aborts; always guard.  
4. **`p_finduid` (~237)** is the standard re-claim of protect after timers/NPC AI.  
5. **`chatnpc` is a PROC**, not an engine opcode — still the second densest “call-like” pattern; teach under patterns/chat, not engine catalog.  
6. **Do not invent opcodes** — if a name is not in `engine.rs2` / not a packed proc, it will not pack.

---

## 8. Maintenance

| When | Update |
|------|--------|
| Full `rg -o` remeasure lands | Flip §2 counts to **VERIFIED**; drop Phase B dual column if aligned |
| New top file | §3 / §4 tables |
| New engine command heavily used | Rank + kind |
| Lesson for manual | [living-notes.md](living-notes.md) one-liner + promote chapter |

**Last measured:** 2026-08-08 · tree: this workspace `vendor/content/scripts` · tag **VERIFIED_DRAFT**.
