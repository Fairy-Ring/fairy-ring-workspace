# Decision 016 — E2e smokes from hop smokes (dual-agent)

**Date:** 2026-08-16  
**Status:** accepted · **phase CLOSED** until the opener says **e2e OPEN**  
**Parents:** Decision **004** (harness, not Client-TS) · [`../plans/2026-08-14-ship-e2e-queue.md`](../plans/2026-08-14-ship-e2e-queue.md) · [`../context/copy-agent-opener-377.md`](../context/copy-agent-opener-377.md)

## Decision

When we walk **all** in-era content start → complete (or a labeled residual) — before a public-beta world or several bot operators — the **implementer writes** the e2e smoke from our existing hop smokes. The **orchestrator reviews** it the same way we review a `.rs2`, then **runs** it. Two-way heartbeat (`.impl-status.md`) carries fixes. Neither side dunks; the loop is the product.

**Hop smokes (2026-08-16):** same split, earlier. Implementer writes each hop smoke into the worktree **`.smokes/`** (gitignored). Orchestrator copies into `tools/harness/` and runs headed. Opener table says **hop smokes OPEN**. E2e stays **CLOSED**.

This **replaces** the 2026-08-14 “one subagent writes *and* runs one headed walk” SOP for the unparked SHIP e2e wave. The 62-slug index stays. Cook / Sheep / Ghost / Doric / Hetty / Rune Mysteries stay walked.

## Roles

| | Does | Does not |
|--|------|----------|
| **Implementer** (content worktree) | Write the hop smoke (`.smokes/`) after each `.rs2`. Later: one draft e2e per queue row. Heartbeat after every unit. Apply review notes on the next draft. | Start the engine. Run Playwright. Write `$RS2_R377_ROOT`. Invent dest. Claim PASS. |
| **Orchestrator** (real tree) | Queue in the opener. Review the draft. Copy into `tools/harness/` if sane. Headed run + shots. Fold PASS/FAIL. Write review notes. | Ask the implementer to “figure out the process.” Leave a FAIL only in chat. |

## Why hop smokes first

Hop smokes already have the stand, NPC/loc id, talk loop, camera, and `PHASE` / `RESULT` shape. An e2e is those hops **in order**, without `setvar` of the quest under test. Soft `teleTo` is commute. Soft `setvar` of a **dep** quest is a labeled toy. A dest is only legal if a hop already proved a product `p_tele*` or dest-cite.

## Isolation

Hop-smoke drafts live at **`.smokes/`**. E2e drafts live at **`.e2e/`**. Both gitignored (same class as `.impl-status.md`). Orchestrator copies a reviewed file to `tools/harness/quest-<slug>-smoke.mjs` (or `-e2e-smoke.mjs`). Harness stays Decision **004**. Do not put drafts in `vendor/client-ts`.

## Open / close

**E2e closed now.** Hop smokes **OPEN** (opener table). Operator or orchestrator flips the opener queue to **e2e OPEN** and names the first slug. Until then the implementer writes `.rs2` + `.smokes/` hops.

How-to: [`../runbooks/e2e-from-hop-smokes.md`](../runbooks/e2e-from-hop-smokes.md).
