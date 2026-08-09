# RuneScript manual (Fairy Ring / rev 377)

**What this is:** first-principles documentation of RuneScript + content for this workspace.  
Official public manuals do not exist — **we maintain this set**.

**Audience:** humans and agents editing `vendor/content` and engine script handlers.

## Authority: Mod Ash (@JagexAsh)

**Ashleigh Bridges (Mod Ash, [@JagexAsh](https://x.com/JagexAsh))** has discussed RuneScript extensively on Twitter/X.

| Rule | Detail |
|------|--------|
| **Weight** | Any tweet (or thread) by **@JagexAsh** that is **about RuneScript** — language semantics, how triggers work, protect/delay, queues, historical Jagex tooling, era behaviour of the script system — is **absolutely authoritative** for this project. He is the subject-matter expert and a Jagex employee. |
| **Scope** | Applies to **RuneScript / server-script semantics**, not automatically to every other game topic he mentions (quests, balance, OSRS-only systems). Prefer the tweet when it clearly addresses script/runtime behaviour. |
| **Contradiction** | Treat as truth **unless later contradicted** — ideally by a later Ash clarification, or by stronger primary evidence that explicitly supersedes that statement (document the conflict in [living-notes.md](living-notes.md)). |
| **How to use** | When citing Ash: quote or paraphrase + link/date if known; land the lesson in the matching chapter **and** a [living-notes](living-notes.md) row. Do not invent “Ash said …” from memory — recover the post when possible. |
| **vs LC / cache** | Ash on RuneScript **outranks** LC 377-wip guesswork and casual reverse-engineering for **language/runtime meaning**. Cache + period media still govern **what content existed in May 2006**; Ash does not authorize inventing post-era content. |

See also: [authenticity-stance.md](../authenticity-stance.md) (research ladder + this note).

## Read order

| # | Page | Contents |
|--:|------|----------|
| 0 | [overview.md](overview.md) | What RuneScript is; mental model (layers, events, protect, ticks) |
| 1 | [layout.md](layout.md) | Tree layout; `.rs2` vs config extensions |
| 2 | [syntax.md](syntax.md) | Headers, calls, control flow, strings, coords |
| 3 | [types.md](types.md) | Compile-time types (`obj` vs `namedobj`, …) |
| 4 | [triggers.md](triggers.md) | Ops, categories, timers, queues, zones |
| 5 | [runtime.md](runtime.md) | Delay, protect, pointers, null |
| 6 | [patterns.md](patterns.md) | Talk, inv, quest stages, use-with, multi-npc |
| 7 | [pack-and-prove.md](pack-and-prove.md) | Pack, reload, versionlist, trust ladder |
| 8 | [failures.md](failures.md) | Symptom → cause table |
| 9 | [living-notes.md](living-notes.md) | **Append lessons here** (date + one line) |
| — | [paths.md](paths.md) | Key paths; how to extend the manual |
| — | [residuals-inbox.md](residuals-inbox.md) | Unsorted residuals for later promotion |
| — | [opcode-usage-census.md](opcode-usage-census.md) | **Command-like call frequency** (top-40 + top `p_delay`/`queue` files) |

## Related (not language)

| Doc | Role |
|-----|------|
| `vendor/content/scripts/engine.rs2` | Opcode catalog (`[command,…]`) |
| `vendor/content/scripts/engine.constant` | Core `^constants` |
| `vendor/engine/src/engine/script/ServerTriggerType.ts` | Trigger enum |
| `docs/runbooks/quest-impl.md` | Quest port checklist |
| `docs/research/authenticity-stance.md` | Invent vs research ladder |
| `docs/runbooks/harness.md` | Pack / reload / cheats |

## Maintenance rule (mandatory)

When you learn something about RuneScript **syntax**, **opcodes**, **triggers**, **varps**, **chat**, or **engine↔script contracts**, same turn:

1. Prefer a durable section in the matching page above.  
2. **Always** append one row to [living-notes.md](living-notes.md).  
3. Engine TypeScript changes: document here and cite `vendor/engine/src/...`.  
4. Do **not** leave the lesson only in chat or a throwaway plan.

## Compatibility stub

Old single-file path: [`../runescript-and-content.md`](../runescript-and-content.md) (redirect only).

**Last split:** 2026-08-07.
