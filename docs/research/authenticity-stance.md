# Authenticity stance (non-negotiable)

**Lost City is a preservation project.** This workspace (**Fairy Ring**) exists to run and study **revision 377 (~May 2006)** content carefully — not to invent a private-server flavoured rewrite.

**Do not underestimate the accuracy bar.** LC-style accuracy readers (and this project) will reject “close enough.” That fussiness is why the work is worth doing. Harness thrash is allowed; **lying about purity is not.**

### Product vs toys

| | Pure product | Toys |
|--|--------------|------|
| Paths | `vendor/client-ts`, `vendor/engine`, `vendor/content` | `tools/harness/**`, later `vendor/rs2b0t` |
| Bar | Defendable to LC accuracy readers | Iterate fast; **label** soft mids |
| Bridge | Research + [`deviations.md`](deviations.md) + [`softpass.md`](softpass.md) | Smokes may reference docs; docs must not only live in chat |

## Process stages (soft-pass is not failure)

Soft mid thrash is a **normal stage of the process**, not a moral fail. You still implement varps/varbits, pack params, and prove the client **displays and branches** on those stages.

```text
1. Config / varp / script unit → pack
2. Soft mid (softpass.md) → stage N drives content + client correctly
3. Residual / HARD e2e → claimed span without progress cheats
```

| Ledger | What goes there |
|--------|-----------------|
| **[`softpass.md`](softpass.md)** | Soft entry, soft deps, thrash that is **not yet e2e** for the full path |
| **[`deviations.md`](deviations.md)** | **Intentional** product/platform non-auth we **keep** (isolation ports, IF id remaps, candidate rates, tele-stubs in content) |

**Misclaim (still wrong):** selling soft `setvar` of the *claimed* stage as residual authenticity, or omitting a softpass row when a mid is soft.

## Rules for agents and humans

1. **Do not invent player-facing or cache-absent *content*.** No new quests, drops, mechanics, messages, IDs, or “QoL” that did not exist in the target era unless the human accepts a logged **deviation**.  
   **Client track:** do not invent client behaviour — **exact port of Client-Java 377** to TS.  
   **Internal names are LC-parity, not Jagex-or-nothing** (Decision **013**): classic 377 configs do **not** store debugnames. LC `*.pack` labels are reconstruction so scripts compile. **Rip** OSRS / 2007 / 274/289 compiler names onto in-scope ~May 2006 rows (OSRS forked RS2; they did not rename those symbols for fun). Skip clearly later content. Match the row, not the later id. Collisions still lose.
2. **Follow the research source ladder** (below). Higher rungs beat lower ones.
3. **Intentional product non-auth** → [`deviations.md`](deviations.md). **Soft mids / not-yet-e2e** → [`softpass.md`](softpass.md).
4. **Missing triggers / stubs:** leave incomplete or finish from research — do not invent filler dialogue/loot to silence `no trigger for …`.
5. **Anarchy / bot / rs2b2t patches** are out of scope until the human asks; they are not “377 authenticity.”
6. Soft harness prep never reclassifies product as “period-complete” for the skipped span — it **does** count as process progress when labeled and when product under test is real.
7. **Config unit before thrash:** when porting a quest/minigame, forward-port **obj/npc/loc behavioral params** from the ladder source onto 377 names **before** multi-minute smokes. Missing `next_obj_stage` / loc stage chains / NPC timers look like script crashes; they are pack holes. See [`port-quest-config-unit-first-377.md`](port-quest-config-unit-first-377.md).
8. **Stage-write bar (2026-08-08):** a claimed quest/skill stage is **residual/HARD PASS only if live `.rs2` wrote that stage.** Soft `setvar` of the *claimed* stage alone is not that claim — log the mid under softpass and keep working the product path.
9. **Soft-entry residual bar (highest standard — 2026-08-08):** Once a mid-gate is soft-entered (e.g. `setvar` quest to N **once** at thrash start), the path **N → target** must run **e2e without further quest progress cheats**.  
   | Allowed host | Forbidden as “product residual PASS” |
   |--------------|--------------------------------------|
   | `setstat` skill floors | Further `setvar` of quest/multi/varbits that content should write |
   | Tele between proof beats (commute) | Give **quest-specific** critical items (remains, keys, sacred oil, quest scrolls, brother-complete seeds…) |
   | Give **generic** prep (food, steel/adamant kit, coins, plain logs/tinder if not the quest product under test) | Host-seed brother/complete stages; soft reseed of overlay vars that hide pack holes |

   **If residual cannot finish under this bar, it is a product/code problem to debug.** Soft mids earlier in the ladder remain valid process stages; do not green-bar the residual span as complete.

10. **Softlocks and “bugs” are often period-accurate (2026-08-10):** At this era Jagex **did not** systematically prevent softlocks or awkward spawns. Content that fails to place a size-3 NPC, lands a demon on an unwalkable tile, or strands a player if they mis-click was frequently **shipped behaviour**, not a 377-engine defect to “fix.”  
    | Prefer | Avoid (unless logged deviation) |
    |--------|----------------------------------|
    | Ladder source script shape (`map_findsquare` + `^map_findsquare_lineofwalk` as written) | Inventing open-tile hardcodes “so the mid always greens” |
    | 289/274 comments that admit bad spawns (“no size checks…”) | Quietly hardening product to modern QoL |
    | Soft harness: open tele / re-seed **labelled** when thrash needs a clear board | Claiming product softlock-proof as authenticity |

    **Pedantic but load-bearing:** what looks like a bug to us may be the way it behaved. Research first; only deviate when the operator accepts a **deviations.md** row.

11. **Preserve period “incorrect” behaviour for now (operator preference 2026-08-10):** Default product bar is **period match**, not modern correctness. If behaviour seems wrong but ladder sources say that is how it worked (or how the ported scripts act), **keep it** in the pure product trees.  
    | Track | Role |
    |-------|------|
    | **Preservation (default now)** | `vendor/content` / engine / client stay period-shaped; softlocks and awkward spawns stay unless evidence says otherwise |
    | **Bugfix / live fork (later, optional)** | Explicit branch or pack for a **deployed live server** may harden softlocks, open-tile spawns, QoL — **only** when we choose that product; log every change in `deviations.md` (or a live-fork ledger) and do **not** silently fold “fixes” into the preservation default |

    Harness toys may always work around softlocks for thrash. That is not a licence to rewrite product “so players cannot softlock” on the preservation track.

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
| **2** | Historical **377 cache** (OpenRS2 id **657** = build **377**, 2006-05-02) | Authority for **377 product** assets / many configs. **Next-rev** dump: OpenRS2 **1254** = build **410** (2006-05-26) in `cache/openrs2-410/` — idle / 410 track only |
| **3** | **Decompiled 377 client** (Java deob in `vendor/client-java`) | Protocol, client-side constraints, UI |
| **4** | **Period media** (~2005–mid-2006): Jagex **Update:** news (OSRS wiki *Historical updates* **and** [runescape.wiki](https://runescape.wiki) pages marked “copied verbatim” from the RS site), era videos/screenshots | **Release day** is RS2-accurate from those posts. The **news body** is period. The rest of either modern wiki (walkthrough, reqs, later mechanics) is **not**. See § RS3 wiki below. |
| **5** | **Other LC branches** (content/engine) — **prefer reusing LC work** | See next section. Deduplicates effort vs re-implementing from scratch. Prefer **274** (and other pre-377 LC) when 377-wip is wrong or empty |
| **6** | **OSRS 2007-base** (Aug 2007 RS2 backup + wiki Changes) | **Last resort** on this ladder — not a stall. When 1–5 do not answer, take 2007-base (minus later Changes) and **finish** the in-scope unit. **Not** modern OSRS. |

### 377-wip content is untrusted

`vendor/content` and `vendor/engine` track **`origin/377-wip`** (local branch `rs2-r377`). That line is a **WIP jump** to May 2006:

- Many scripts/triggers are incomplete, half-ported, or **not verified** against period evidence.
- “It is in 377-wip” is **not** proof it is correct for rev 377 or for our engine pack.
- Treat 377-wip as **working material**: run it, log failures, fix via research ladder (often port from **274** after era-check), then re-prove with real client actions.
- Engine + content mismatches (wrong loc, category OPLOCU vs type tutorial script, etc.) are expected until audited.

If still unknown after rungs **1–5**: last-resort **2007-base** (OSRS section) and complete the in-scope unit. Leave a stub only when the thing is **out of scope** or **modern OSRS**. Last resort does **not** mean “block finishing.” Do not invent a third script.

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
| Later wip (e.g. `530-wip`) | post-377 | **Do not** pull post-May-2006 systems into **377 product**; only use if a snippet is proven unchanged from 2 May 2006 |
| **410** (next target) | ~26 May 2006 | Decision **014**. Post–16 May overhaul + Royal Trouble. **Not** this pack. Construction is **412**. |

Exact branch lists: `git ls-remote` on `LostCityRS/Content` and `Engine-TS`. Fetch into **this** workspace’s vendor remotes as read-only refs; never push.

### How to use other LC branches

1. **Search** other LC content for the same trigger / quest / skill (e.g. `skill_slayer`, `no trigger` target).
2. **Era-check:** Did this behaviour exist by **~2 May 2006**? If it depends on post-377 content, skip or strip.
3. **Port, don’t wholesale-merge:** Cherry-pick scripts/configs into `vendor/content` on `rs2-r377`. Adjust IDs/pack names/opcodes if the 377 cache differs.
4. **Engine:** Prefer 377-wip engine. Only cherry-pick **logic** from other engine branches when 377-wip lacks an opcode/handler; do not merge 274/289 engine wholesale (protocol/config model differ).
5. **Cite** the source branch + commit/path in the feature’s research note.

### 274/289 is the usual start — LC is not infallible (operator 2026-08-13)

For systems that **existed by May 2006**, **start from 274/289** (script shape, params, titles). That is still the correct default. It is **not** a veto of our own work.

Lost City people (and LC agents) **also make mistakes**: stub reward strings, 289-full rates, leftover IF copy, comments that guess. When **this tree’s research** disagrees — 377 cache, Client-Java, period **Update:** / screenshots, or a headed proof we already landed — **prefer that research**. Cite both. Do **not** “win” by inventing a third script.

| Prefer | When |
|--------|------|
| **274/289** | Era-correct system; we have **no** conflicting cache/period/our-doc evidence |
| **Our research** | Cache, period media, or a landed `docs/research/` / headed PASS **contradicts** 274/289 |
| **Neither** | Higher rungs silent — last-resort 2007-base, then finish |

Worked example: 377 `inter_238` 6th arg. 274 `send_quest_complete` has **no** reward lines. LC 377 stubs (`"3 Quest Points"`) duplicated `com_9`. We filled lines from **this file’s** `stat_advance` / `inv_add` ([`quest-complete-scroll-377.md`](quest-complete-scroll-377.md)) — not from inventing OSRS scroll prose, and not from treating the 274 5-arg hole as “no rewards exist.”

Same class: Managing labour 289-full 100/50 is shipped **REVISIT**; period rate still unknown — do not invent 0.1 just because later OSRS said so.

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

## OSRS as last resort (does not block finishing)

**OSRS is out of scope as a design target.** We are not building modern OSRS. Rung **6** stays **last resort** — climb 1–5 first (cache, client, Update: posts, LC 274/289).

Last resort means **use it when the higher rungs do not answer**, then **finish the unit**. It does **not** mean park the quest until a May 2006 video appears.

OSRS launched from a **known-good RS2 backup (~August 2007)**. That is still RS2, ~15 months after our tip. Some media for the **May 2006 → Aug 2007** window does not exist. Inventing a third script is worse than taking 2007-base.

### The window

| When | What to do |
|------|------------|
| On the **377 cache** / Java client / official **Update:** post | That is May 2006. Use it. |
| Documented change **in** May 2006–Aug 2007 | Prefer the **earlier** RS2 line if we have it; else note the window and take 2007-base. |
| Higher rungs silent | **Last resort:** 2007-base (transcript / early OSRS) **minus** wiki **Changes** after Aug 2007 / OSRS-only. Complete the in-scope content. Cite 2007-base. |
| Modern OSRS (2013+ systems, reworks, QoL, new options) | **Out.** Subtract via Changes. Do not ship it as 377. |

Same catch as dialogue, for most things (reqs, mid steps, leftover IF meaning). Release **days** stay on the Update: posts.

### Method (not a research paper)

1. Rungs 1–5 first.
2. Then `Transcript:<Quest>` + quest/NPC **Changes**.
3. Drop rows after the 2007 backup (and anything clearly OSRS-only).
4. If a Change sits in the 2006–2007 window and we have no earlier source, keep 2007-base and say so.
5. Do **not** invent a third version. Do **not** treat the modern walkthrough box (stamina, fairy rings, League notes) as 377.

### When last-resort 2007-base is used, always

1. **Cite** transcript / page + which Changes you subtracted (or “no Change row, 2007-base”).
2. Land it in `docs/research/` for that unit. If we *know* it is post-2-May-2006 RS2, one line in [`deviations.md`](deviations.md).
3. Prefer last-resort 2007-base over a hole. Prefer a hole over **2013+** OSRS.

### RS3 wiki (`runescape.wiki`) — history index, not RS3 data

Operator 2026-08-13: we are **not** using RS3 game data. We **are** allowed to read that wiki for **historical references** (shared RS2 lineage; their change lists are often longer than OSRS).

| Use | Do not use |
|-----|------------|
| `Update:…` pages marked **copied verbatim** from the RS site (same rung **4** as OSRS Historical updates) | Article **body** (yield calculators, Invention, ultracompost, tool belt, Vinesweeper, 120 Farming) |
| `==Update history==` dated rows as an **index** — follow the linked `Update:` / patch note | Shipping an RS3 ninja/QoL as 377 (e.g. 18 Jul 2022 “leps and farmers remain in place”) |
| Confirm a change **existed on the live RS2→RS3 tree** and **when** it landed | Treating wikified history bullets as verbatim Jagex (RS:HIP: text *may* be rewritten; “some updates may not be included”) |

**Method:** climb 1–5; open the RS3 article’s history table; keep only dates in scope (≤2 May 2006 product, or ≤Aug 2007 last-resort window); open the linked official post. Subtract later Changes the same way as OSRS.

**After ~August 2007:** this tree stays on the **original RS2 road** (410, then later revs). OSRS forks there. `runescape.wiki` **Update history** becomes the better Change index for that road. Still not RS3 systems.

Worked: Tool Leprechaun — OSRS pinned wander **23 May 2013**; RS3 live tree pinned **18 Jul 2022**. Both are **after** 2007-base. 377 product keeps wander (engine default). [`farming-tool-leprechaun-377.md`](farming-tool-leprechaun-377.md).

### What not to take from modern OSRS

- QoL, interfaces, pathfinding, drop tables, or economy from post-2007 redesigns  
- “Because that’s how OSRS does it now” without a Changes check  
- Entire systems that did not exist in May 2006 (or by the 2007 backup, if we are filling the window)  
- Walkthrough req boxes / stamina / fairy rings as May 2006 truth without era-check  

---

## What “playable” means here

A stack you can log into and **observe** behaviour so humans can **find and fix fidelity gaps** — including harvesting `no trigger for …` into a backlog — not a finished product.

## Related

- `docs/research/deviations.md` — intentional product/platform non-auth  
- `docs/research/softpass.md` — soft mids / not-yet-e2e process ledger  
- `docs/runbooks/playable.md` — when present  
- `AGENTS.md` / `docs/export/AGENTS.md` — working rules (vault vs public)  

