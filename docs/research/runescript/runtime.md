# Runtime

> **RuneScript manual** (Fairy Ring / rev 377) · [Index](README.md) · [Living notes](living-notes.md)

## 7. Runtime: delay, protect, active pointers

### 7.1 Player delay

```text
p_delay(3);        // suspend this script 3 ticks; player delayed
p_arrivedelay();   // wait until finished walking to target
```

While delayed, many NORMAL timers and queues wait. Softtimers may still run.

### 7.2 Claiming protect

```text
if (p_finduid(uid) = true) {
    // protected block — p_* commands OK
    ~unequip(last_slot);
}
```

Opheld/opnpc scripts usually already run protected. **Nested** calls that lose protect are a common abort source.

### 7.3 Active NPC / secondary (`.`) commands

Scripts that talk to NPCs assume an **active NPC** pointer (set by the op).  
Commands with a **`.` prefix** (`.chatnpc`, `.npc_add`, `.huntnext`) use the **secondary** pointer — dual-NPC scenes (Idris ambush, etc.).

### 7.4 Null is real

`inv_getobj(worn, slot)` returns **null** when empty.  
**Never** pass null into `oc_category`, `oc_name`, etc. without a guard:

```text
if ($obj ! null & oc_category($obj) = mm_greegree) {
    ...
}
```

---
