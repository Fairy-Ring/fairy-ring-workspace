# Decision 013 — LC-parity on internal names (not Jagex-or-nothing)

**Date:** 2026-08-12  
**Status:** accepted  
**Operator:** Fairy Ring’s bar is **Lost City’s bar**, done faster. AI is a tool, not a second authenticity court.

## Decision

1. **Player-facing and cache-binary facts stay cache / period / client.**  
   Display `name=` / `desc=` / ops, models, IDs, maps, packets. Do not add quests, items, dialogue, or drops that did not exist ~May 2006.

2. **Internal identifiers are a reconstruction layer — same class as LC.**  
   Debugnames (`[mapletree]`, `%misc_last_update`), `*.pack` labels, and most `param=` / `timer=` / `owned_shop` are **not** in classic 377 configs. LC invented or recovered those so scripts compile. We may do the same when it is **sensible** and bound to a **real cache row**.

3. **Do not pretend a debugname is Jagex-internal** unless a higher rung says so (cache string, deob, Ash, hashed later-rev dump cited in research). Call it an LC-style label.

4. **Collisions still lose.** Do not steal a 377 name that already exists on another id (packer duplicate-debugname). Prefer `varp_332` until a unique name is free.

5. **Speed is not a new standard.** Prefer LC 274/289 names when they already exist and era-fit. Invent a new label only when LC left `varp_N` / `npc_N` / `loc_N` and a script needs a symbol.

## Why

Unpack headers come from `*.pack.getById`, not from OpenRS2 657. Varp configs have no name field. Flo *does* store a cache string and LC still headers from `flo.pack`. Holding ourselves to “only Ash-leaked names” would be **stricter than LC**, which this project explicitly is not.

## Still invent (forbidden without a deviation)

New content: quests, NPCs, locs, objs, interface IDs, chat, loot, mechanics, QoL, client behaviour. New **IDs**. Soft `setvar` sold as HARD.

## Related

[`authenticity-stance.md`](../research/authenticity-stance.md) · [`varp-unnamed-377.md`](../research/varp-unnamed-377.md) · Decision 009 (AI as tool)
