# Triggers

> **RuneScript manual** (LC-rs2 r377) · [Index](README.md) · [Living notes](living-notes.md)

## 6. Triggers in the world (what players cause)

### 6.1 Ops (most content)

Client menu order **op1…op5** maps to `opnpc1…5`, `oploc1…5`, `opheld1…5`, etc.

| Player action | Typical trigger |
|---------------|-----------------|
| Talk-to NPC | `[opnpc1,npc_debugname]` |
| Attack | often op2 / combat path |
| Open door (loc) | `[oploc1,door_type]` |
| Use item on loc | `[oplocu,loc]` or `[oplocu,_category]` |
| Use item on NPC | `[opnpcu,…]` |
| Inventory op (Eat, Hold, …) | `[opheld2,_mm_greegree]` etc. matches **iopN** |
| Wear inventory button | `[inv_button1,wornitems:worn]` |

**AP\*** triggers = approach (path until in range). **OP\*** = operate when in range. Content often only defines OP\*; engine handles approach.

### 6.2 Category triggers

```text
[opheld2,_mm_greegree]     // any obj with category=mm_greegree
[oplocu,_smithing_furnace]
```

Requires `category=…` on the config **and** a row in `category.pack`. Members-world F2P strip can clear category on members objs if `NODE_MEMBERS` is false — this project runs **members**.

### 6.3 Timers and queues

```text
settimer(mm_greegree_timer, 1);     // NORMAL timer, interval 1 tick
// [timer,mm_greegree_timer]
//   body; cleartimer(mm_greegree_timer);

softtimer(...);                     // runs even when player is "busy"
queue(force_unequip_greegree, 0, 0); // delay ticks + arg (often 0)
// [queue,force_unequip_greegree]
```

**NORMAL** timers need `canAccess()` (not delayed, no modal) to fire.  
**SOFT** timers can fire while busy.  
`queue(name, delay, arg)` arity is **`queue,int,int`** on 377 — two ints after the name.

### 6.4 Login / zones / level-up

```text
[login,_]
settimer(stat_regen, 100);
...

[mapzoneexit,0_35_49]
~clear_idris_timer;

[advancestat,attack]
@levelup(...);
```

---
