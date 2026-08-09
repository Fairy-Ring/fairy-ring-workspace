# Content patterns

> **RuneScript manual** (LC-rs2 r377) · [Index](README.md) · [Living notes](living-notes.md)

## 8. Content patterns you will write constantly

### 8.1 Minimal Talk script

```text
[opnpc1,some_npc]
~chatplayer("<p,neutral>Hello.");
~chatnpc("<p,happy>Hello, traveller.");
if (%some_quest = 0) {
    %some_quest = 1;
    ~send_quest_progress(questlist:some, %some_quest, ^some_complete);
}
```

### 8.2 Multi-choice (labels)

Content uses `@multi` / option labels (see shared chat procs). Harness must pick options in **content order**, not “last option wins.”

### 8.3 Inventories

```text
inv_total(inv, bronze_bar)      // count in backpack
inv_add(inv, bronze_bar, 1);
inv_del(inv, bronze_bar, 1);
inv_getobj(worn, ^wearpos_rhand);
inv_moveitem(worn, inv, $obj, $count);
inv_freespace(inv)
```

Display **name** can collide (two “Monkey greegree”, two “Karambwan vessel”). Scripts and harness must prefer **debugname / pack id**.

### 8.4 Quest stages

```text
// .constant
^regicide_spoken_lathas = 2
^regicide_spoken_iorwerth = 4

// .rs2
%regicide_quest = ^regicide_spoken_lathas;
~send_quest_progress(questlist:regicide, %regicide_quest, ^regicide_complete);
```

Gate harness on **server** var when `transmit=no` (`getServerVarQuiet`), not client-only varp.

### 8.5 Use-with

```text
[opheldu,item_a]
// or type-specific
[oplocu,furnace]
if (last_useitem = bronze_bar) {
    ...
}
```

### 8.6 Multi-npc / multi-loc (contract)

Map may spawn a **multi base** type; scripts bind the **concrete** type. Engine must multi-resolve before trigger lookup and `npc_name`. If chat title is the string `null`, fix engine multi — do not invent titles in content. Full table: historical § multi-npc notes in living appendix / TBWT plans.

---
