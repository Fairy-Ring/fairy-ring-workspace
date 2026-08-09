# Source layout and file types

> **RuneScript manual** (LC-rs2 r377) · [Index](README.md) · [Living notes](living-notes.md)

## 2. Source layout

```text
vendor/content/
  scripts/                 # all RuneScript + most configs
    engine.rs2             # opcode declarations (do not invent opcodes here)
    engine.constant        # ^true, ^false, core constants
    player/ quests/ skill_* / areas/ …
    _unpack/377/           # cache dumps (all.obj, all.npc, …) — research + pack input
  maps/                    # .jm2 land + n/l/o map sections after pack
  pack/                    # name→id after pack (script.pack, obj.pack, …)
  models/ synth/ …

vendor/engine/
  tools/pack/Build.ts      # packer entry
  data/pack/               # runtime cache the World loads
  .env                     # BUILD_SRC_DIR=../content
```

**Isolation:** only edit under  
`$RS2_R377_ROOT`  
(not live 274 trees).

---

## 3. File types

| Extension | Role |
|-----------|------|
| **`.rs2`** | Scripts: triggers, procs, labels, queues, timers |
| **`.constant`** | Compile-time `^name = int` (or empty string) |
| **`.varp` / `.varbit`** | Player variables (scope, bits, transmit) |
| **`.loc` / `.npc` / `.obj`** | Entity type definitions |
| **`.if`** | Interface layouts → symbols `root:comp` |
| **`.param` / `.struct` / `.dbrow` / `.enum`** | Data tables / params |
| **`.inv`** | Inventory definitions (`inv`, `worn`, …) |
| **maps `.jm2` / `nXX_ZZ`** | Terrain and static spawns |

Configs are **not** free-form code. Each `[debugname]` block packs into a typed row. **Duplicate** `[debugname]` across `_unpack/377` and a product config → pack **ERROR**. Prefer rebinding **existing** unpack names; only add configs for symbols missing on 377.

---
