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

6. **Prot enum tokens are Jagex identifiers, not a later rename pass.** NXT 216 debug strings and later `GameServerProtId` / `GameClientProtId` lists are the **same class of name** as 377 `ServerProt` / `ClientProt` constants. Jagex did not shuffle those labels for fun. Pattern:
   - **Same packet** → later token is the internal name. Treat it as Jagex spelling unless 377 Java/cache already printed a different word.
   - **`_V2` / `_V3`** → payload (or decoder) changed. Keep the 377 token on the 377 decoder; use the later list to *analyse* what grew.
   - **New family** (`IF_OPENTOP` / `IF_OPENSUB` vs `IF_OPENMAIN` / `IF_OPENSIDE`) → architecture change, not a synonym. 377 IF stays 377.
   - **Two namespaces** are not a rename: RuneScript command `P_LOCMERGE` vs outgoing zone id `LOC_MERGE`. Keep the script name where the engine *sends* from a script opcode.

   Those later lists stay useful for **behavior analysis** even when we do not rip the token (what split, what gained a field, which IF open model).

7. **Rip in-scope RS2-lineage debugnames.** OSRS (and the 2007 backup it forked) is an **RS2 compiler**. Names on content that existed ~May 2006 are Jagex RS2 names, not a later rename pass. **Rip them** onto the matching 377 row (prefer over an LC `name=` slug).
   - **In scope → rip.** Same loc/npc/obj/varp/script family that is on the 377 cache. Do not require a research paper per name.
   - **Out of scope → skip.** Clearly later content: post-377 quests/skills, OSRS-only, Zeah/raids, `_v2` / `_old` rework siblings, new IDs that did not exist in 377.
   - **Join on the row, not the integer.** OSRS id 4068 is not automatically 377 id 4068. Match the *thing* (display, models, map, ops, family). Then use their debugname.
   - **Collisions still lose** (point 4).
   - **NXT 216 is not a pack ledger.** That dump has engine/prot/Type tokens, not `[templewall_base]`. In-tree rip sources today: LC 274/289 pack names (already preferred) + any hashed/OSRS **pack** name table we pull. Cache `name=` slugs we already wrote stay reconstruction until replaced by a real compiler name.

8. **Date the feature before a 274/289/OSRS name hunt.** Calendar: [`rev-content-dates-377.md`](../research/rev-content-dates-377.md). Jagex internals are unpublished; leftover `.if` **title** / loc slug is the lower-rung name we actually have. Do not open 289 pack for Bank PIN (19 Sep 2005), Blast Furnace (8 Mar 2005), Farming (11 Jul 2005), or anything else whose `Update:` is after **17 Jan 2005**.

## Why

Unpack headers come from `*.pack.getById`, not from OpenRS2 657. Varp configs have no name field. Flo *does* store a cache string and LC still headers from `flo.pack`. Holding ourselves to “only Ash-leaked names” would be **stricter than LC**, which this project explicitly is not.

## Still invent (forbidden without a deviation)

New content: quests, NPCs, locs, objs, interface IDs, chat, loot, mechanics, QoL, client behaviour. New **IDs**. Soft `setvar` sold as HARD.

## Related

[`authenticity-stance.md`](../research/authenticity-stance.md) (OSRS 2007-base = last resort, does not block finishing) · [`rev-content-dates-377.md`](../research/rev-content-dates-377.md) · [`varp-unnamed-377.md`](../research/varp-unnamed-377.md) · [`nxt-osrs-216-debug-symbols.md`](../research/nxt-osrs-216-debug-symbols.md) · [`nxt-216-vs-fr-naming-audit.md`](../research/nxt-216-vs-fr-naming-audit.md) · Decision 009
