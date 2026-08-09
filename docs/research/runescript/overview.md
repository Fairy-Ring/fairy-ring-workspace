# Overview — what RuneScript is

> **RuneScript manual** (Fairy Ring / rev 377) · [Index](README.md) · [Living notes](living-notes.md)

**Authority:** [@JagexAsh](https://x.com/JagexAsh) (Mod Ash) on RuneScript → absolute unless later contradicted. See [README § Authority](README.md#authority-mod-ash-jagexash).

## 0. What RuneScript is (one paragraph)

**RuneScript** is the name Jagex uses **internally** for its server-side scripting language on RS2-era worlds. In open preservation work, **Lost City’s reconstruction** of that language (compiler + runtime + content dialect) is what we actually run — also called RuneScript in LC docs and tooling. That reconstruction is honest provenance, not a rebrand of Jagex’s term.

In this project:

1. You write **source** (`.rs2` files + config files) under `vendor/content/scripts/`.  
2. The **compiler** (`@lostcityrs/runescript`, invoked by `vendor/engine` `npm run build`) turns that into **bytecode** (`script.dat` / `.idx`) plus **symbol packs** (`obj.pack`, `npc.pack`, …).  
3. The **engine** loads the bytecode and, every game tick, runs **triggers** when the player (or world) does something — Talk to an NPC, Open a door, a timer fires, login, etc.

RuneScript is **not** a general-purpose language. It is an **event language** with a **typed** symbol table, **protected** player actions, and **tick** delays. Almost all “game content” is RuneScript + configs, not TypeScript.

---

## 1. Mental model (read this before any syntax)

### 1.1 Three layers

```text
┌─────────────────────────────────────────────────────────┐
│  Client (Java / Client-TS)                              │
│  Draws world, sends OP packets (Talk, OpLoc1, Use-with) │
└───────────────────────────┬─────────────────────────────┘
                            │ network
┌───────────────────────────▼─────────────────────────────┐
│  Engine (vendor/engine TypeScript)                      │
│  Validates ops → looks up trigger → runs bytecode       │
│  Implements opcodes (mes, inv_add, p_delay, …)          │
└───────────────────────────┬─────────────────────────────┘
                            │ script.dat
┌───────────────────────────▼─────────────────────────────┐
│  Content (vendor/content)                               │
│  .rs2 handlers + .npc/.loc/.obj configs + maps          │
└─────────────────────────────────────────────────────────┘
```

If a packed script “never runs,” the bug is often **engine** (wrong type id, multi-npc not resolved, no protect) — not the `.rs2` text.

### 1.2 Event-driven, not “main()”

There is no continuous game loop in your scripts. You write **handlers**:

| You write | Engine runs it when… |
|-----------|----------------------|
| `[opnpc1,king_lathas]` | Player chooses op1 (Talk-to) on that NPC type |
| `[oplocu,_smithing_furnace]` | Player uses an item **on** a loc in that category |
| `[timer,mm_greegree_timer]` | Player timer with that name is due |
| `[proc,equip]` | Another script calls `~equip(...)` |
| `[login,_]` | A player finishes login |

### 1.3 Names become numbers at pack time

In source you write `king_lathas`, `bronze_bar`, `%regicide_quest`.  
At pack, those become **integer ids** via `*.pack` tables. If the symbol is missing → **pack error**. If the script never packs → runtime never sees it.

### 1.4 Protected access (why some commands “throw”)

Many player-mutating opcodes require **protected** script context (`p_delay`, `p_teleport`, `p_animprotect`, mesboxes that pause, etc.). The engine grants protect when:

- Running an **op** trigger from a successful player interaction, or  
- Running a **NORMAL** timer / queue with protect, or  
- After `p_finduid(uid) = true` which claims protect for that player.

If you call `oc_category($obj)` with **null** `$obj`, or a protected opcode without protect, the **script aborts** with a stack backtrace in chat (debug builds). See greegree / equip lesson §12.

### 1.5 Time is in ticks

`p_delay(3)` waits **3 world ticks** for that player (not wall-clock ms). World speed cheats change tick length; they do not change “3 ticks means 3 ticks.”

---
