# Authenticity stance (non-negotiable)

**Lost City is a preservation project.** This workspace (`LC-rs2-r377`) exists to run and study **revision 377 (~May 2006)** content faithfully — not to invent a private-server flavoured rewrite.

**Do not underestimate the accuracy bar.** LC people (and this operator) will reject “close enough.” That fussiness is why the work is worth doing. Harness thrash is allowed; **lying about purity is not.**

### Product vs toys (operator promise)

| | Pure product | Toys |
|--|--------------|------|
| Paths | `vendor/client-ts`, `vendor/engine`, `vendor/content` | `tools/harness/**`, later `vendor/rs2b0t` |
| Bar | Defendable to LC accuracy reviewers | Iterate fast; label soft proofs |
| Bridge | Research + deviations + plans under `docs/` | Smokes may reference docs; docs must not only live in chat |

Full wording: `AGENTS.md` § The promise · Decision 004 rule 8.

## Rules for agents and humans

1. **Do not invent content.** No new quests, drops, mechanics, messages, or “QoL” that did not exist in the target era unless the human explicitly accepts a logged deviation.  
   **Client track:** do not invent client behaviour either — **exact port of Client-Java 377** to TS (`docs/research/client-strategy-377.md`).
2. **Follow the research source ladder** (below). Higher rungs beat lower ones.
3. **Every intentional non-authentic change** goes in `docs/research/deviations.md` (ports, isolation, debug cheats — not fake game design).
4. **Missing triggers / stubs:** leave incomplete or finish from research — do not invent filler dialogue/loot to silence `no trigger for …`.
5. **Anarchy / bot / rs2b2t patches** are out of scope until the human asks; they are not “377 authenticity.”
6. **Soft harness proofs** (give remains, mid-quest tele, force-pass stages) never reclassify product as “verified for LC” — document or do not claim.
7. **Config unit before thrash:** when porting a quest/minigame, forward-port **obj/npc/loc behavioral params** from the ladder source onto 377 names **before** multi-minute smokes. Missing `next_obj_stage` / loc stage chains / NPC timers look like script crashes; they are pack holes. See [`port-quest-config-unit-first-377.md`](port-quest-config-unit-first-377.md).
8. **Stage-write bar (2026-08-08):** a claimed quest/skill stage is **PASS only if live `.rs2` wrote that stage.** Soft `setvar` of the *claimed* stage is **DIRTY**, not proof. Cite ladder: [`historical-run-dirt-inventory.md`](historical-run-dirt-inventory.md). Hub: [`../plans/2026-08-08-promise-cleanup.md`](../plans/2026-08-08-promise-cleanup.md).
9. **Soft-entry residual bar (highest standard — 2026-08-08):** Once a mid-gate is soft-entered (e.g. `setvar` quest to N **once** at thrash start), the path **N → target** must run **e2e without further quest progress cheats**.  
   | Allowed host | Forbidden as “product residual PASS” |
   |--------------|--------------------------------------|
   | `setstat` skill floors | Further `setvar` of quest/multi/varbits that content should write |
   | Tele between proof beats (commute) | Give **quest-specific** critical items (remains, keys, sacred oil, quest scrolls, brother-complete seeds…) |
   | Give **generic** prep (food, steel/adamant kit, coins, plain logs/tinder if not the quest product under test) | Host-seed brother/complete stages; soft reseed of overlay vars that hide pack holes |

   **If residual cannot finish under this bar, it is a product/code problem to debug** — not an acceptable soft thrash. Label partial runs honestly; do not green-bar them as residual complete.

## Research source ladder (prefer top → bottom)

Use the **highest** source that actually answers the question. Do not jump to lower rungs for convenience.

### RuneScript language / runtime semantics (special case)

For **how RuneScript works** (opcodes, protect, delays, queues, timers, trigger binding, historical Jagex script behaviour):

| Priority | Source | Role |
|---------:|--------|------|
| **A** | **Mod Ash / @JagexAsh** posts about RuneScript | **Absolutely authoritative** unless later contradicted (Ash is SME + Jagex). Cite when possible; land in `docs/research/runescript/`. |
| **B** | This repo’s engine + `@lostcityrs/runescript` + packed behaviour | Implementation under test; not a free pass to invent content |
| **C** | Ladder below | Content *what* / era *what* |

Ash on script semantics does **not** authorize inventing May 2006 **content** (dialogue, quests, drops). For product content, still use the general ladder.

Full note: [`docs/research/runescript/README.md`](runescript/README.md) § Authority.

### General content / era ladder

| Priority | Source | Role |
|---------:|--------|------|
| **1** | Lost City **`377-wip`** engine + content | **Starting tree only** — **untrusted / unverified** until checked against higher rungs (see below) |
| **2** | Historical **377 cache** (OpenRS2 id **657** = build **377**, 2006-05-02) | Authority for assets / many configs |
| **3** | **Decompiled 377 client** (Java deob in `vendor/client-java`) | Protocol, client-side constraints, UI |
| **4** | **Period media** (~2005–mid-2006): update posts, wiki archives of the era, videos/screenshots | Dialogue, behaviour, feel |
| **5** | **Other LC branches** (content/engine) — **prefer reusing LC work** | See next section. Deduplicates effort vs re-implementing from scratch. Prefer **274** (and other pre-377 LC) when 377-wip is wrong or empty |
| **6** | **OSRS — last resort only** | See OSRS section |

### 377-wip content is untrusted

`vendor/content` and `vendor/engine` track **`origin/377-wip`** (local branch `rs2-r377`). That line is a **WIP jump** to May 2006:

- Many scripts/triggers are incomplete, half-ported, or **not verified** against period evidence.
- “It is in 377-wip” is **not** proof it is correct for rev 377 or for our engine pack.
- Treat 377-wip as **working material**: run it, log failures, fix via research ladder (often port from **274** after era-check), then re-prove with real client actions.
- Engine + content mismatches (wrong loc, category OPLOCU vs type tutorial script, etc.) are expected until audited.

If still unknown after the ladder: **document the unknown** (`docs/research/` or gap note) and leave a stub / incomplete behaviour rather than inventing.

---

## Other Lost City branches (deduplicate effort)

LC maintains **multiple revision branches**. Several may be **more fleshed out** than `377-wip` for a given system (quests, skills, minigames), even when their revision number is lower or WIP.

**Do not re-author from zero** what LC already solved on another branch if it is **era-correct for May 2006**.

### Known LC rev lines (non-exhaustive; check remotes)

| Branch / rev | Approx era (LC branding) | Notes for 377 work |
|--------------|--------------------------|--------------------|
| `225` … `254` | 2004 | Earlier baseline |
| `274` | ~Nov 2004 | Live rs2b2t-adjacent tip; many authenticity fixes |
| **`289`** | ~Jan 2005 (wip in Server revInfo) | Slayer / Barrows era — often richer than 377-wip for those systems |
| **`377-wip`** | ~May 2006 | **Our base** — incomplete content, many missing triggers |
| `377-node` | older 377 experiment | Prefer **377-wip** tip over this |
| Later wip (e.g. `530-wip`) | post-377 | **Do not** pull post-May-2006 systems; only use if a snippet is proven unchanged from 2006 |

Exact branch lists: `git ls-remote` on `LostCityRS/Content` and `Engine-TS`. Fetch into **this** workspace’s vendor remotes as read-only refs; never push.

### How to use other LC branches

1. **Search** other LC content for the same trigger / quest / skill (e.g. `skill_slayer`, `no trigger` target).
2. **Era-check:** Did this behaviour exist by **~2 May 2006**? If it depends on post-377 content, skip or strip.
3. **Port, don’t wholesale-merge:** Cherry-pick scripts/configs into `vendor/content` on `rs2-r377`. Adjust IDs/pack names/opcodes if the 377 cache differs.
4. **Engine:** Prefer 377-wip engine. Only cherry-pick **logic** from other engine branches when 377-wip lacks an opcode/handler; do not merge 274/289 engine wholesale (protocol/config model differ).
5. **Cite** the source branch + commit/path in the feature’s research note.

### ⚠ LC branch tips are not pure era snapshots

**Critical:** A branch branded **274 / Nov 2004** (or **289 / Jan 2005**) is **not** a frozen historical dump. Live LC trees accumulate:

- Later authenticity fixes  
- Content for systems that **shipped after** that brand date (e.g. **Slayer 26 Jan 2005**, **Farming 11 Jul 2005**)  
- Incomplete or speculative rows (skill-guide unlocks, inv stocks, comments like “derived from 2007 clientscript”)  
- Pack leftovers (`skill_guide_slayer_*`, `skill_guide_farming_*` inv **names** without handlers or era proof)

**Do not treat “it is in 274” as “it is 2004-correct.”** Especially avoid:

| Anti-pattern | Why |
|--------------|-----|
| Porting **Slayer/Farming skill-guide tables**, unlock lists, or “View guide” data from 274 because inv/pack names exist | Those skills **did not exist in late 2004**; tables may be post-hoc LC fill |
| Using 274 skill-guide **unlock lines** as May 2006 truth | Often early/2004-shaped; may miss 2005–06 unlocks or invent intermediate junk |
| Bulk-copying `_test` / debug / pack stubs as game design | Dev aids, not authenticity |
| Inferring era from **pack name presence** alone | Cache/pack can reserve IDs before scripts are real |

**Steer research instead:**

1. Ask: **when did this system ship?** (e.g. Slayer / Farming release dates).  
2. Prefer **377 cache + period media** for “what the player saw in May 2006.”  
3. Use **274/289 only as structure** (how LC wired IF_BUTTON / dbrow shape), then **era-diff** row content.  
4. For post-2004 skills on 377: research **that skill’s era**, not “whatever 274 skill_guide.inv listed.”  
5. Gate incomplete systems with engine flags (`PlayerStatEnabled` / `stat_enabled`) rather than shipping anachronistic guide bodies.

Skill-guide lesson (2026-08-04): open/wire from 274 was fine; **guide row content** and **S/F inv families in pack** are not automatic era truth — see `docs/research/skill-guide-client-server.md`.

### Why this matters

`377-wip` is a **WIP jump** to May 2006. Parallel LC work on **289**, **274**, etc. may already have high-quality scripts for systems that shipped *before* 377. Reusing that work (after era-check) is the main way to **deduplicate** vs re-researching every quest from videos alone.

### “No trigger for xyz”

That message is **engine debug**: the client action reached the server, but **no RuneScript trigger** is registered. Treat each as a **content gap** (implement from ladder), not a client no-op and not a free pass to invent handlers.

---

## OSRS as last resort

**OSRS is out of scope as a design target.** We are not building OSRS, modern or otherwise.

Lost City (and this project) may still need OSRS **occasionally** when no 2004–2006 primary source answers a concrete question (e.g. certain combat/stat edge cases, obscure formula behaviour) — the same situation LC has hit before.

### When OSRS is allowed

- **Only after** rungs 1–5 have been tried and failed for that specific decision.
- Prefer evidence from **early OSRS / close to the 2007 backup base**, not post–significant redesigns (e.g. avoid citing modern rebalances, new skill reworks, or post-update wiki as if they were 2006).
- May 2006 is **much closer** to OSRS’s 2007 foundation than to today’s game — that is why early OSRS can be *informative*, not because “OSRS = truth for 377.”

### When OSRS is used, always

1. **Cite** what was used (wiki page + date/revision if possible, or “early OSRS / ~2007-base assumption”).
2. **Log** under `docs/research/` for that feature, and if behaviour is knowingly non-2006, also `docs/research/deviations.md`.
3. **Prefer “unknown / incomplete”** over an OSRS answer that clearly post-dates major changes.

### What not to take from OSRS

- QoL, interfaces, pathfinding, drop tables, or economy from post-2007 redesigns  
- “Because that’s how OSRS does it now” without checking era  
- Entire systems that did not exist in May 2006  

---

## What “playable” means here

A stack you can log into and **observe** behaviour so humans can **find and fix fidelity gaps** — including harvesting `no trigger for …` into a backlog — not a finished product.

## Related

- `docs/gap/000-baseline.md` — known holes  
- `docs/runbooks/playable.md` / `docs/context/operator-tldr.md`  
- `docs/research/deviations.md`  
- `PLAN.md`  
