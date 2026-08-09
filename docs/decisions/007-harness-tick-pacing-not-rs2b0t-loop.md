# Decision 007 — Harness pacing: game tick, not rs2b0t wall-clock

**Date:** 2026-08-04  
**Status:** Accepted  
**Context:** 377 is a new rev / clean tree. We port content and drive it with a thin harness; we are **not** obligated to preserve rs2b0t runtime debt.

---

## Decision

1. **In-browser bots** (`TaskBot`, quest, tutorial, path-abc) pace on **`Client.loopCycle`** exposed as `reader.loopCycle()` / `Execution.delayTicks(n)`.
2. **Do not** reintroduce fixed `loopDelay = 600` (or idle 200 ms spin) from rs2b0t `LoopingBot` / `ScriptRunner`.
3. **One intentional action per opportunity** (one Talk-to, one continue, one multi pick) then wait for ticks / dialog state — no re-click storms, no getvar spam mid-chat.
4. **Dialog paths** come from ported RuneScript (`@multiN` order in `.rs2`), not “last option wins” heuristics.
5. **Node host** (`harness.mjs` smokes) may still use wall-clock for login/relog/Playwright — that is transport, not bot intelligence. Prefer `delayUntil(ingame/dialog/tile)` over busy `waitForTimeout` when easy.

---

## Why throw it out now

- 377 harness will touch **many** quests (Wave 1 274/289 parity). Fixed timing will fight `p_delay`, multi paint, and scene load forever.
- We already have the truth signal: **client loop cycle**.
- rs2b0t product remains a **read-only** reference; this tree is free to diverge (Decision 004 fence still holds for pure Client-TS).

---

## Implementation snapshot

| Piece | Rule |
|-------|------|
| `TaskBot.run` | After each cycle: `delayTicks(loopTicks \| idleTicks)` |
| `loopDelay` | Removed / ignored |
| `ChatDialog.settle` | Extra ticks after continue/option |
| Quest `prefer` | Script-ordered multi path from content |
| Host getvar poll | Only when chat clear; low frequency |

---

## Non-goals

- Perfect event-driven bot (no loop) — still a task priority loop, just **tick-aligned**.
- Porting every rs2b0t bot feature.
- Changing pure Client-TS tick rate.

---

## Related

- `docs/decisions/004-client-bot-harness-boundary.md`
- `docs/decisions/005-port-rs2b0t-nav.md` (nav algorithms OK to port; runtime thrash is not sacred)
- `docs/runbooks/harness.md` § TaskBot pacing

## Follow-up (dialog hammer)

- `talk` opens dialog only — **does not** bulk-drain continues.
- `AdvanceDialog` is sole multi walker; min **4–5** ticks settle + **2** loopTicks.
- Act only when fingerprint ≠ last acted page.

## Continue-page uniqueness

NPC "Click to continue" pages shared fingerprint `1||` (structure only).  
`reader.chatBodyText()` walks the chat modal text lines so each page is unique;  
continue can be **1t** paced (spacebar-like) without re-firing the same line.

## After dialog: refresh stage before re-Talk

When chat closes, QuestBot runs `getvar <stageVarName>` and applies it **before**
the next Talk/OP (no re-click while stage lags). Modules set `stageVarName` +
`applyServerStage`.

## Scene ready ≠ bare `ingame`

`client.ingame` is true before maps finish (`sceneState` 0→1→**2**).  
rs2b0t-style bots that key only on login thrash OPNPC/walk while scene=1.  
Same trap for **mid-quest item seeds** (Death Plateau-style progress debug): host
fires `give` / tele / bot resumes while scene is still rebuilding → packet thrash.

| API | Meaning |
|-----|---------|
| `Game.ingame()` | Connected / not login screen (**not** “ready to act”) |
| `Game.sceneState()` | 0 / 1 building / **2 ready** |
| `Game.sceneReady()` | `ingame && sceneState===2` |
| `Game.waitSceneReady()` | Block until 2 |
| Host `waitSceneReady(page)` | Same on Playwright side |
| Panel state | `ready (scene 2)` vs `ingame · scene N (wait)` |

**Rules:**

1. **TaskBot.run** — if `!sceneReady`, **pause all tasks** (log throttle); do not validate/execute world ops.
2. **onStart** (Quest / Tutorial / PathABC) — `delayUntil(sceneReady)` before first OP.
3. **executeStep** / `menuAction` / `walkTo` — wait or soft-fail if scene≠2.
4. **Host seeds** (`giveItems`, setvar batches, stats) — default **after** `waitSceneReady`;  
   `giveItems` waits scene by default (`{ waitScene: false }` only for rare early cheats).
5. **teleTo** — after tile match, wait scene 2 before return (hostLoop / bot next act).
6. **hostLoop** — skip seed/tele while scene≠2 (same gate as TaskBot).
7. Logs say **ready (ingame + scene 2)**, not bare “logged in.”
8. **Settle = not moving**, not “primaryAnim === -1”.  
   Some ready/bas anims **never clear** to -1 (upstream lesson) — waiting on  
   anim hangs forever (outpost gate thrash).  
   `Game.waitIdle()` / `playerMoving()`: **exactMove + routeLength only**;  
   optional short anim grace then proceed.

Cheats can technically send while scene=1, but **any seed the bot will use next tick** must land after scene 2 so inv/NPC/loc lists are real.
