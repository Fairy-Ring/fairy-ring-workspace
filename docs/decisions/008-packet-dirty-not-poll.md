# Decision 008 — Packet-dirty state, not constant poll

**Date:** 2026-08-05  
**Status:** Accepted (direction)  
**Context:** Harness + upstream rs2b0t both still **poll** invent, varps, chat, tile, dialog, stage every task tick / `delayUntil` spin. That is wasteful and causes thrash (re-Talk before stage lands, walk re-click while route still active, getvar spam). The server already tells us *when* state changes via s→c packets.

---

## Decision

1. **Authoritative change signal = inbound packets** (after the client has applied them).  
2. **Rescan / emit only dirty families** — not full snapshot every loop.  
3. **Bots wait on events or tick+dirty**, not wall-clock or “every cycle re-read everything.”  
4. **Host getvar / cheats** are debug/smoke only; module `decide()` must not depend on a host poll loop as the primary brain.  
5. Steal rs2b0t shape (`producerDirty` + `noteProducerPacket` + `pumpProducers` + EventBus); do **not** invent a second protocol.

---

## Why

| Poll pattern (today) | Cost / failure mode |
|----------------------|---------------------|
| `TaskBot` every `loopCycle`: re-validate all tasks, re-`takeSnapshot` | CPU + false re-act |
| `delayUntil(() => ChatDialog.isOpen())` | Spins until paint; no “packet opened dialog” wake |
| Host `getvar horrorquest` on interval / after every chat close | Race / thrash; laggy vs truth |
| Walk: re-check tile + re-`tryMove` every 2t | Click-miss thrash (see outpost plan) |
| Chat `noTriggerFor` scan full buffer | Fine if ring is append-only on MESSAGE_GAME |

rs2b0t already documented the right idea:

> The server already tells us *when* state changes via packets — so we keep a  
> cache of last snapshots and only re-diff a family after a relevant opcode.

(`rs2b0t/src/bot/events/producerDirty.ts`)

Decision **007** fixed **pacing** (game tick, not 600 ms wall clock).  
This decision fixes **what wakes work** (packet dirty, not blind re-sample).

---

## Target shape (harness)

```text
Client tcpIn / packet dispatch  (pure Client-TS — unchanged logic)
        │
        ▼  (harness inject hook only — Decision 004/006)
noteProducerPacket(ptype)   →  dirty.skills|inventory|varps|chat|… 
        │
        ▼  once per client frame / loopCycle
pumpProducers(tick)
        │  rescan only dirty families → diff → emit
        ▼
EventBus: tick | inventory.changed | varp.changed | chat.message | …
        │
        ▼
QuestBot / WalkExecutor / AdvanceDialog subscribe or poll *flags*
(not full reader walks every cycle)
```

### Dirty map (start set — expand carefully)

| Packet family (377 names) | Dirty |
|---------------------------|--------|
| `UPDATE_INV_*` | inventory |
| `UPDATE_STAT` | skills |
| `VARP_SMALL` / `VARP_LARGE` / `VARP_SYNC` | varps |
| `MESSAGE_GAME` / private | chat (+ GameMessages ring **push**, not scan-all) |
| `IF_OPEN*` / close / main modal | dialog |
| `PLAYER_INFO` / self route bits | self motion (for waitIdle) |
| `REBUILD_*` / logout | reset all |
| Loc/NPC zone updates (later) | scene entities |

Most opcodes → **null** (no work). Steady frame with no relevant packets ≈ free.

### What still runs on tick

- **One** task cycle opportunity (priority list) when something is dirty *or* a prior action is in-flight and needs settle.  
- Camera / paint optional.  
- Safety resync: rare full dirty (login, rebuild, N ticks without any packet — not every tick).

### What must stop

- Re-`decide()` + full inv/loc scan every idle tick with no dirty.  
- Host stage poll mid-action.  
- Walk re-issuing `tryMove` while route still live (click-miss) — motion settle = routeLength / exactMove events, not anim-poll thrash.  
- `delayUntil` busy-spin without yielding to “wake on dirty|tick”.

---

## Boundary rules (mandatory)

| Layer | May |
|-------|-----|
| Pure `vendor/client-ts` | Stay pure — **no** bot EventBus imports |
| Harness inject / `attach-in-page` | Hook **after** packet applied (`tcpIn` wrap or inject site) |
| `tools/harness/script/**` | Subscribe to bus; read caches |
| Node smoke host | Poll **results** (stage gate) sparingly; not drive the bot brain |

Same fence as Decision **004** / **006**.

---

## Migration (incremental — do not big-bang)

1. **P0 — Chat / GameMessages push**  
   MESSAGE_GAME → ring append + optional bus emit. Kill full-buffer rescans where easy.

2. **P0 — Inv / skills dirty**  
   Port `producerDirty` + inv/stat opcodes for 377 ServerProt.  
   `Inventory.count` reads cache; mark dirty only on UPDATE_INV_*.

3. **P1 — Varp dirty + stage**  
   Quest stage from **transmitted** varps when available; host getvar only for non-transmit smoke gates (document which).

4. **P1 — Dialog dirty**  
   IF open/close → `dialog.opened` / `dialog.closed`; AdvanceDialog wakes on that, not every tick fingerprint spam.

5. **P2 — Motion**  
   Self route / exactMove flags → `Game.waitIdle` waits event or routeLength==0 sample only after PLAYER_INFO, not blind 20t loops.

6. **P2 — WalkExecutor**  
   Follow loop: wait tick; re-click only on stall *event* (no move across N ticks *after* route finished) or CANT_REACH from chat bus — not re-tryMove while near terminal (already fixed 2026-08-05).

7. **Later — scene locs/npcs**  
   Zone packets dirty entity indexes; Locs/Npcs query cache.

Each step should **delete** a poll path, not only add bus noise.

---

## Relation to 007

| 007 | 008 |
|-----|-----|
| *When* to run the loop: `loopCycle` | *Whether* to rescan / act: packet dirty |
| Reject wall-clock 600 ms | Reject full-state poll every tick |
| Still a task priority loop | Same loop, **gated** |

Non-goal remains: pure interrupt-driven OS with no loop.  
Goal: **idle is free**; work runs on tick *and/or* dirty.

---

## Steal list (read-only rs2b0t)

| Upstream | Role |
|----------|------|
| `src/bot/events/producerDirty.ts` | opcode → families |
| `src/bot/events/producers.ts` | note + pump + diff emit |
| `src/bot/events/EventBus.ts` | typed bus |
| `src/bot/BotHost.ts` | `noteProducerPacket` from tcpIn wrap; `pumpProducers` per frame |
| `src/bot/adapter/ClientAdapter.ts` | tcpIn wrap pattern |

Map opcodes via **377** `ServerProt` / Client-TS handlers — not 289 numbers.

---

## Acceptance (directional)

- [ ] Steady idle (standing, no traffic) → no inv/varp full rescan per tick  
- [ ] Plank USE / stage change → single dirty path updates inv/stage without host getvar storm  
- [ ] Talk wait = dialog dirty or timeout, not 30s blind poll only  
- [ ] Walk click count on short path stays ~1 (no poll-driven re-tryMove)  
- [ ] Decision + runbook pointer; no pure Client imports of harness events  

---

## Related

- `docs/decisions/004-client-bot-harness-boundary.md`  
- `docs/decisions/006-harness-client-fork.md`  
- `docs/decisions/007-harness-tick-pacing-not-rs2b0t-loop.md`  
- `docs/plans/2026-08-05-outpost-wallgrill-collision.md` (click-miss thrash = poll/re-act symptom)  
- rs2b0t `src/bot/events/*` (reference only)
