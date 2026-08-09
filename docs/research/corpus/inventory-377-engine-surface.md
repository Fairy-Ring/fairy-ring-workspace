# Fixed corpus inventory — 377 engine surface

**Purpose:** Snapshot of **engine runtime surface** used by this workspace (skills enable flags, isolation ports / members, RuneScript compiler version, trigger enum size, opcode handler modules). Not playability claims. No product ports.

**Measured:** 2026-08-08 · paths under `vendor/engine/` + isolation `.env` written by `scripts/apply-isolation-config.sh`.

**Tags:** all claims below are **VERIFIED_DRAFT** until main-thread re-runs the RECIPE (see [trust-but-verify.md](trust-but-verify.md) · [verify-queue.md](verify-queue.md)).

**Scope:** five fixed surfaces only — not full engine API census.


## 1. `PlayerStatEnabled` — all skills enabled

```text
CLAIM: PlayerStatEnabled is length 21; every slot is true (skills 0..20 all enabled).
TAG: VERIFIED_DRAFT
RECIPE: sed -n '1,55p' vendor/engine/src/engine/entity/PlayerStat.ts
  → enum PlayerStat has 21 members (ATTACK..RUNECRAFT);
  → line ~52: PlayerStatEnabled = [true × 21]
PATH: docs/research/corpus/inventory-377-engine-surface.md §1
```

| Index | `PlayerStat` | Enabled |
|------:|--------------|:-------:|
| 0 | ATTACK | true |
| 1 | DEFENCE | true |
| 2 | STRENGTH | true |
| 3 | HITPOINTS | true |
| 4 | RANGED | true |
| 5 | PRAYER | true |
| 6 | MAGIC | true |
| 7 | COOKING | true |
| 8 | WOODCUTTING | true |
| 9 | FLETCHING | true |
| 10 | FISHING | true |
| 11 | FIREMAKING | true |
| 12 | CRAFTING | true |
| 13 | SMITHING | true |
| 14 | MINING | true |
| 15 | HERBLORE | true |
| 16 | AGILITY | true |
| 17 | THIEVING | true |
| 18 | SLAYER | true |
| 19 | FARMING | true |
| 20 | RUNECRAFT | true |

**Source line (engine):**

```52:52:vendor/engine/src/engine/entity/PlayerStat.ts
export const PlayerStatEnabled = [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true];
```

**Adjacent (not the claim):** `PlayerStatFree` (same file L54) marks F2P-free skills; members skills (FLETCHING, HERBLORE, AGILITY, THIEVING, SLAYER, FARMING) are `false` there. Comment L51 notes Slayer S0 + Farming F1 enable history.


## 2. Isolation ports + `NODE_MEMBERS`

```text
CLAIM: Isolation .env has WEB_PORT=81, WEB_MANAGEMENT_PORT=8899, NODE_PORT=43595;
  NODE_MEMBERS is unset in .env and defaults true in Environment.ts;
  world.json node.members is true.
TAG: VERIFIED_DRAFT
RECIPE:
  grep -E '^(WEB_PORT|WEB_MANAGEMENT_PORT|NODE_PORT|NODE_MEMBERS|ENGINE_REVISION|NODE_ID)=' vendor/engine/.env
  sed -n '9,25p' vendor/engine/src/util/Environment.ts
  python3 -c "import json; w=json.load(open('vendor/engine/data/config/world.json')); print(w['web'], w['node']['port'], w['node']['members'], w['engine'])"
PATH: docs/research/corpus/inventory-377-engine-surface.md §2
```

### 2a. `vendor/engine/.env` (isolation — applied)

| Key | Value | Notes |
|-----|------:|-------|
| `ENGINE_REVISION` | **377** | |
| `WEB_PORT` | **81** | Java client `portOffset=1` → HTTP `80+1` (not 8891) |
| `WEB_MANAGEMENT_PORT` | **8899** | |
| `NODE_PORT` | **43595** | game TCP `43594+1` |
| `NODE_ID` | **37** | |
| `NODE_MEMBERS` | *(absent)* | runtime default applies |

Writer: `scripts/apply-isolation-config.sh` (rewrites `.env` + `world.json`).

### 2b. `Environment.ts` defaults (when env key missing)

| Key | Default | Line |
|-----|---------|-----:|
| `WEB_PORT` | 80 (win/darwin) / 8888 (else) | 10 |
| `WEB_MANAGEMENT_PORT` | 8898 | 14 |
| `NODE_PORT` | 43594 | 20 |
| `NODE_MEMBERS` | **true** | 22 |
| `ENGINE_REVISION` | 377 | 17 |

```22:22:vendor/engine/src/util/Environment.ts
    NODE_MEMBERS: tryParseBoolean(process.env.NODE_MEMBERS, true),
```

**Effective isolation runtime (this tree):** members world **on** (default + `world.json` `"members": true`); ports **81 / 43595 / 8899**.

### 2c. `world.json` node/web (isolation)

| Field | Value |
|-------|------:|
| `web.port` | 81 |
| `web.managementPort` | 8899 |
| `node.port` | 43595 |
| `node.id` | 37 |
| `node.members` | **true** |
| `engine.revision` | 377 |

**Doc caution:** Older plans/AGENTS still say web **8891**. That was an early isolation mistake; Java client requires `WEB_PORT = 80 + portOffset` with `portOffset=1` → **81**. See `docs/research/deviations.md` + `docs/runbooks/isolation.md`.


## 3. `ScriptProvider.COMPILER_VERSION`

```text
CLAIM: ScriptProvider.COMPILER_VERSION === 27 (script.dat version gate).
TAG: VERIFIED_DRAFT
RECIPE: rg -n 'COMPILER_VERSION' vendor/engine/src/engine/script/ScriptProvider.ts
  → expect "public static readonly COMPILER_VERSION = 27;"
PATH: docs/research/corpus/inventory-377-engine-surface.md §3
```

```12:12:vendor/engine/src/engine/script/ScriptProvider.ts
    public static readonly COMPILER_VERSION = 27;
```

Load path: `parse()` reads `version = dat.g4s()` and fatals if `version !== ScriptProvider.COMPILER_VERSION` (L49–51). Content pack must be built with a matching RuneScript compiler.


## 4. `ServerTriggerType` enum entry count

```text
CLAIM: ServerTriggerType has 151 named enum members; numeric values span 0..167 with intentional gaps.
TAG: VERIFIED_DRAFT
RECIPE: rg -c '^\s+[A-Z][A-Z0-9_]+\s*=' vendor/engine/src/engine/script/ServerTriggerType.ts
  → expect 151
  tail -n 20 vendor/engine/src/engine/script/ServerTriggerType.ts
  → last member AI_DESPAWN = 167
PATH: docs/research/corpus/inventory-377-engine-surface.md §4
```

| Metric | Value |
|--------|------:|
| Named enum members | **151** |
| Lowest value | `PROC = 0` |
| Highest value | `AI_DESPAWN = 167` |
| Gaps | yes (e.g. 22–23, 29–30, 50–51, 57–58, 78–79, 85–86, 106–107, 113–115 between family blocks) |

File: `vendor/engine/src/engine/script/ServerTriggerType.ts` (enum L1–163; namespace `toString` is not a member).


## 5. Script opcode handler modules (`*Ops.ts`)

```text
CLAIM: vendor/engine/src/engine/script/handlers/ contains exactly 16 *Ops.ts files (list below).
TAG: VERIFIED_DRAFT
RECIPE: ls vendor/engine/src/engine/script/handlers/*Ops.ts | xargs -n1 basename | sort
  → 16 names matching table
PATH: docs/research/corpus/inventory-377-engine-surface.md §5
```

| # | File |
|--:|------|
| 1 | `CoreOps.ts` |
| 2 | `DbOps.ts` |
| 3 | `DebugOps.ts` |
| 4 | `EnumOps.ts` |
| 5 | `InvOps.ts` |
| 6 | `LocConfigOps.ts` |
| 7 | `LocOps.ts` |
| 8 | `NpcConfigOps.ts` |
| 9 | `NpcOps.ts` |
| 10 | `NumberOps.ts` |
| 11 | `ObjConfigOps.ts` |
| 12 | `ObjOps.ts` |
| 13 | `PlayerOps.ts` |
| 14 | `ServerOps.ts` |
| 15 | `StringOps.ts` |
| 16 | `StructOps.ts` |

**Count:** **16** `*Ops.ts` under `vendor/engine/src/engine/script/handlers/`. Directory also has no non-Ops handlers at measurement time (handlers dir = these 16 only).


## Quick re-verify (all five)

```bash
export RS2_R377_ROOT=$RS2_R377_ROOT
cd "$RS2_R377_ROOT"

# §1 PlayerStatEnabled
sed -n '51,54p' vendor/engine/src/engine/entity/PlayerStat.ts

# §2 ports + members
grep -E '^(WEB_PORT|WEB_MANAGEMENT_PORT|NODE_PORT|NODE_MEMBERS|ENGINE_REVISION|NODE_ID)=' vendor/engine/.env || true
sed -n '17,24p' vendor/engine/src/util/Environment.ts
python3 -c "import json; w=json.load(open('vendor/engine/data/config/world.json')); print('web',w['web']); print('node.port',w['node']['port'],'members',w['node']['members'])"

# §3 compiler version
rg -n 'COMPILER_VERSION' vendor/engine/src/engine/script/ScriptProvider.ts

# §4 trigger enum
rg -c '^\s+[A-Z][A-Z0-9_]+\s*=' vendor/engine/src/engine/script/ServerTriggerType.ts

# §5 Ops handlers
ls vendor/engine/src/engine/script/handlers/*Ops.ts | wc -l
ls vendor/engine/src/engine/script/handlers/*Ops.ts | xargs -n1 basename | sort
```


## Out of scope (this unit)

- Opcode numeric ranges inside each `*Ops.ts`
- Full `ScriptOpcode` enum census
- Content-side skill enable vs engine flag interaction beyond enable array
- Live process bind proof (`lsof`) — ops runbook territory


## Related

| Doc | Role |
|-----|------|
| [trust-but-verify.md](trust-but-verify.md) | VERIFIED_DRAFT protocol |
| [verify-queue.md](verify-queue.md) | Main-thread re-measure rows |
| [../deviations.md](../deviations.md) | WEB 81 vs 8891 history |
| [../../runbooks/isolation.md](../../runbooks/isolation.md) | Port isolation how-to |
| [inventory-377-skills-minigames.md](inventory-377-skills-minigames.md) | Content skill script density |
