# Decision 010 — Client surfaces: purpose is **choice**

**Date:** 2026-08-09  
**Updated:** 2026-08-09 — purpose-is-choice (pure / bot / QoL)  
**Status:** accepted as **architecture + deferred QoL design** (QoL code after pure freeze / public debug phase)  
**Audience:** maintainers, agents, contributors, future human play surface  

---

## Purpose (drive this home)

Fairy Ring preserves period **content and engine behaviour**. It does **not** dictate a single way to sit in front of the game.

**The purpose of multiple client surfaces is choice.**

| Path | Who it’s for | Tradeoff |
|------|----------------|----------|
| **Pure period client** | People who want the barebones **2006-era** ported client and will deal with the pitfalls and setbacks that entails | Full period friction; authenticity surface for proofs |
| **Bot / harness client** (eventual product bot; harness today) | People who want automation, thrash, residual proof, multi-account tooling | Power and speed; **toys** unless labeled; never “the” authenticity claim by default |
| **QoL client** (happy medium — later) | People who are **30+** (or anyone) and want less RSI / less busywork without rewriting period content | Comforts that **do not fundamentally break how period content functioned** |

**More power to you** on all three. None of these paths is second-class *as a way to play*; only **content authenticity claims** stay strict (pure/harness residual bar).

Examples of **in-scope QoL** (illustrative, not a ship list): click-to-center compass, in-game world map UX, shift-drop, menu entry defaults among options that already exist — **client-side** comforts, not EZscape content.

---

## Decision

1. **Pure stays period truth.**  
   `vendor/client-ts` is **RuneScape 2 as it was at a specific point in time** (this tree: rev **377** / ~May 2006): 1:1 Java oracle, no creature comforts sold as authenticity.  
   Choosing pure means accepting period UI/input friction. That choice is **respected**, not mocked.

2. **Bot / harness is a first-class *tooling* path.**  
   Harness today (`tools/harness/**`); eventual bot product later (`vendor/rs2b0t` or successor).  
   Used for residual proofs, thrash, automation. Soft prep stays **labeled**.  
   Choosing the bot path is **valid** — not a moral failure and not a substitute for pure when claiming product authenticity.

3. **A QoL client artifact is allowed** for human comfort — **on the late timeline below**.  
   Working name: **QoL client** (path TBD: e.g. `vendor/client-qol` and/or build-time inject like Decision 006 — **not** edits in pure).  
   Aimed at a **happy medium**: modern-enough input and presentation without changing how period scripts, combat, and economy behave.

4. **Model: RuneLite-class client plugins, not EZscape.**  
   Comforts that would be **client-side plugins** in the Java world live in the QoL artifact.  
   They must **not** invent period interactions, auto-complete content, or soft-force product proofs.

5. **Scope filter (acceptance test for every QoL feature):**

   | In scope | Out of scope |
   |----------|----------------|
   | Client-side **presentation / input UX** only | Anything that **changes content** or invents period behaviour |
   | Click-to-center compass, readable world map, shift-drop (if pure could drop with enough clicks) | Skip quest multi lines, auto-complete stages |
   | Menu **entry swapping** / default-left-click among options the pure menu already has | **Quick-pay** (or similar) that did **not** exist in period dialogue/IF |
   | Camera zoom/pitch relax, FPS, HiDPI scale | New shop paths, forged packets, invented IF buttons |
   | Hotkeys that still emit **existing** ClientProt / real `doAction` | Server protocol extensions without engine work |
   | Overlays, timers, tile coords, ground-item labels from **already-known** client state | Prep cheats, give/seed, setvar sold as “QoL” |

   **Rule of thumb:**

   > If a period pure client could do it with enough clicks, QoL may shorten the clicks.  
   > If a period pure client could not do it at all, it is **content** (or an explicit product deviation) — not QoL.

6. **Server bounds.**  
   QoL may only act on state the client already has and packets the engine already accepts.  
   Drawing farther / clearer is fine; **inventing entities or ops outside interest range / content** is not.  
   True extended world interest radius needs **engine** work — not a client “plugin.”

7. **Fence (extends 004 / 006 / 009).**

   | Layer | Path | Job |
   |-------|------|-----|
   | **Pure** | `vendor/client-ts` | Period authenticity; LC-grade content bar |
   | **Harness / bot** | `tools/harness/**`, later bot tree | Proof, thrash, automation — labeled softs |
   | **QoL client** | separate artifact (later) | Human comfort; **never** claimed as pure period UI |
   | **Docs** | `docs/**` | Ledger of intentional QoL divergences |

   - No QoL code in pure Client-TS.  
   - Smokes that claim product authenticity run **pure or harness-on-pure**, not QoL defaults.  
   - Branding: Fairy Ring; not “official LC”; credit LC / period RS / tooling (009).

8. **When to start QoL code (timeline).**  
   **Public thrash does not wait on content-complete.**  
   **QoL code** still waits for a **later** debug/improve phase — not as a parallel track to fill content gaps, and not as the ship client at first open.

   | Order | Milestone | QoL code? |
   |-------|-----------|-----------|
   | 1 | **Public open** (thin surface + vendors; Issues; merge unpromised) | **No** — pure + harness are the ship |
   | 2 | **Content-complete thrash** (maintainer focus) | **No** |
   | 3 | **More review bandwidth** / debug-improve (if/when) | **Then** scaffold QoL as optional artifact |
   | 4 | First QoL pack (compass center, map, shift-drop, menu swap, …) | Under PR review; never default “the” period client |

   Prerequisites before first QoL code:

   - Public remotes open enough for external PRs.  
   - Content thrash far enough that a pure freeze SHA is a deliberate authenticity oracle.  
   - Scaffold: second entry + inject/fork pipeline + QoL deviation ledger.  
   - CI/docs: authenticity smokes stay pure; QoL is opt-in.

---

## Rationale

- **Authenticity and comfort and automation are different products.** Mixing zoom/menu-swap into pure kills the promise; forbidding all comfort forever ignores adults who want RSI-friendly play on honest content.  
- **Choice is the point:** barebones 2006 client, bot client, or happy-medium QoL — all legitimate *ways in*. Content bar stays one.  
- **RuneLite proves the pattern:** community lives on client-side plugins without rewriting server content.  
- **EZscape is the anti-goal:** period-false paths, quest skip, auto-pay content never offered.  
- **Harness is not QoL.** Harness may give/setvar for thrash (toys). QoL is for **human play** under honest world rules.

---

## Difficulty (once pure is frozen)

| Slice | Effort (order of magnitude) |
|-------|-----------------------------|
| Scaffold second artifact + branding + ledger | Days–1 week |
| First pack (compass, map, shift-drop, camera, menu swap) | ~1–3 weeks |
| Ongoing dual maintenance | Real tax — accept deliberately |
| Full pure Java→TS port (already in flight) | Much larger; QoL is smaller |

Prefer **inject / thin overlay** over forever-diverging full `Client.ts` copy when possible (same lesson as Decision 006).

---

## Explicit non-goals

- Shipping QoL as “the only” Fairy Ring client.  
- Shaming pure or bot players.  
- Using QoL to green residual smokes.  
- Porting modern OSRS UX wholesale.  
- Claiming RuneLite compatibility or official Jagex/LC status.

---

## Notes (voice of the decision)

- Pure = RS2 at a specific point in time — pitfalls included; **more power to you**.  
- Bot = eventual full tooling path; **more power to you**.  
- QoL = RSI-aware happy medium; compass center, world map, shift-drop, etc., without breaking period content function; **more power to you**.  
- Purpose is **choice**, not a single orthodoxy of how you sit at the keyboard.  
- Timeline for QoL **code**: after content thrash / pure freeze; debug/improve PR phase.

---

## Related

- Decision 003 — Java-first exact-copy TS port  
- Decision 004 — Client vs bot/harness boundary  
- Decision 006 — Harness inject (pattern for second artifact)  
- Decision 009 — Branding (Fairy Ring; pre-EOC horizon)  
- `docs/research/authenticity-stance.md`  
- Promise / residual bar: `docs/plans/2026-08-08-promise-cleanup.md`  

## When QoL graduates from deferred

Only after **public → content-complete thrash / pure freeze → debug/improve PR phase** (see §8).  
Then open a plan under `docs/plans/` with freeze SHA, artifact path, first feature list, and a `docs/research/qol-deviations.md` (or rows in `deviations.md`) before any code lands.
