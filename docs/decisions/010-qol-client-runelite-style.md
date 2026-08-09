# Decision 010 — QoL client fork (RuneLite-style comforts on pure 377)

**Date:** 2026-08-09  
**Status:** accepted as **deferred design** (do not implement until pure is frozen)  
**Audience:** operators, agents, future human play surface  

---

## Decision

1. **Pure stays period truth.**  
   `vendor/client-ts` is **RuneScape 2 as it was at a specific point in time** (rev **377** / ~May 2006): 1:1 Java oracle, no creature comforts, no modern “feels better” patches sold as authenticity.

2. **A second client artifact is allowed** for human comfort — **only on the late timeline below** (not “when pure feels okay mid-campaign”).  
   Working name: **QoL client** (path TBD: e.g. `vendor/client-qol` and/or build-time inject like Decision 006 — not edits in pure).

3. **Model: RuneLite-class client plugins, not EZscape.**  
   Because we already rewrote the client in TS, comforts that would be **client-side plugins in the Java world** (RuneLite-style) can live in the QoL artifact.  
   They must **not** turn the game into easy-mode content, invent period interactions, or soft-force product proofs.

4. **Scope filter (acceptance test for every feature):**

   | In scope | Out of scope |
   |----------|----------------|
   | Client-side **presentation / input UX** only | Anything that **changes content** or invents period behaviour |
   | Menu **entry swapping** / reorder / default-left-click among options the pure menu already has | **Quick-pay** (or similar) options that did **not** exist in period dialogue/IF |
   | Camera zoom/pitch relax, FPS, HiDPI scale | Skip quest multi lines, auto-complete stages |
   | Minimap contrast, entity name tags from **already-known** client state | New shop paths, forged packets, invented IF buttons |
   | Hotkeys that still emit **existing** ClientProt / real `doAction` | Server protocol extensions without engine work |
   | Overlays, timers, tile coords, ground-item labels | Prep cheats, give/seed, setvar sold as “QoL” |

   **Rule of thumb:**

   > If a 2006 pure client could do it with enough clicks, QoL may shorten the clicks.  
   > If a 2006 pure client could not do it at all, it is **content** (or an explicit product deviation) — not QoL.

5. **Server bounds.**  
   QoL may only act on state the client already has and packets the engine already accepts.  
   Drawing farther / clearer is fine; **inventing entities or ops outside interest range / content** is not.  
   True extended world interest radius needs **engine** work — not a client “plugin.”

6. **Fence (extends 004 / 006 / 009).**

   | Layer | Path | Job |
   |-------|------|-----|
   | **Pure** | `vendor/client-ts` | Period authenticity; LC-grade bar |
   | **Harness / bot toys** | `tools/harness/**`, later `vendor/rs2b0t` | Proof, thrash, automation — labeled softs |
   | **QoL client** | separate artifact (later) | Human comfort; **never** claimed as pure 377 |
   | **Docs** | `docs/**` | Ledger of intentional QoL divergences |

   - No QoL code in pure Client-TS.  
   - Smokes that claim product authenticity run **pure or harness-on-pure**, not QoL defaults.  
   - Branding: own name; not “official LC”; credit LC / period RS / tooling (009).

7. **When to start (timeline — operator, 2026-08-09).**  
   **Definitely after content complete.** Explicitly **after public**, in a phase that is **accepting debug / improve PRs** — not during private residual thrash, not as a parallel track to fill content gaps.

   | Order | Milestone | QoL? |
   |-------|-----------|------|
   | 1 | Pure client + content residual under promise bar | **No** |
   | 2 | Content-complete enough to **go public** (009 brand, honest README) | **No** — pure is the ship |
   | 3 | Public project **accepting debug / improve PRs** | **Then** scaffold QoL as optional artifact |
   | 4 | First QoL pack (menu swap, camera, readability…) | Under PR review; never default “the” 377 client |

   Prerequisites before first QoL code:

   - Content-complete + public gate passed (operator call).  
   - Pure labeled freeze SHA still the authenticity oracle.  
   - Scaffold: second entry + inject/fork pipeline + QoL deviation ledger.  
   - CI/docs: authenticity smokes stay pure; QoL is opt-in.

---

## Rationale

- **Authenticity and comfort are different products.** Mixing zoom/menu-swap into pure kills the promise and confuses LC-grade readers.  
- **RuneLite proves the pattern:** community lives on client-side plugins without rewriting server content. We can do the same once the TS port is the stable host.  
- **EZscape is the anti-goal:** one-click period-false paths, quest skip, auto-pay that content never offered. Those are content lies, not plugins.  
- **Harness is not QoL.** Harness may give/setvar for thrash (toys). QoL is for **human play** under honest world rules.

---

## Difficulty (once pure is frozen)

| Slice | Effort (order of magnitude) |
|-------|-----------------------------|
| Scaffold second artifact + branding + ledger | Days–1 week |
| First pack (camera, menu swap, readability) | ~1–3 weeks |
| Ongoing dual maintenance | Real tax — accept deliberately |
| Full pure Java→TS port (already in flight) | Much larger; QoL is smaller |

Prefer **inject / thin overlay** over forever-diverging full `Client.ts` copy when possible (same lesson as Decision 006).

---

## Explicit non-goals

- Shipping QoL as “the” 377 client.  
- Using QoL to green residual smokes.  
- Porting modern OSRS UX wholesale.  
- Claiming RuneLite compatibility or official Jagex/LC status.

---

## Dump notes (operator voice, 2026-08-09)

- Pure = RS2 at a specific point in time.  
- Improve *human living* with the **same authenticity**, not EZscape.  
- Backport creature comforts that would be **client-side plugins** in the Java world (ala RuneLite), because we will already have rewritten the client.  
- Menu entry swapping: fine. Quick-pay that doesn’t period-exist: not fine (content).  
- Worth writing down early so pure work stays clean.  
- **Timeline:** after content complete; after public; in a world accepting debug/improve PRs — not before.

---

## Related

- Decision 003 — Java-first exact-copy TS port  
- Decision 004 — Client vs bot/harness boundary  
- Decision 006 — Harness inject (pattern for second artifact)  
- Decision 009 — Branding / attribution  
- `docs/research/authenticity-stance.md`  
- Promise / residual bar: `docs/plans/2026-08-08-promise-cleanup.md`  

## When this graduates from deferred

Only after **content complete → public → debug/improve PR phase** (see §7).  
Then open a plan under `docs/plans/` with freeze SHA, artifact path, first feature list, and a `docs/research/qol-deviations.md` (or rows in `deviations.md`) before any code lands.
