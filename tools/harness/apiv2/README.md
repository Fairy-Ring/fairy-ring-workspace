# Harness apiv2 (rs2b0t PR 604 shape)

One snapshot per tick. Sends return immediately. Waiting names **evidence**, not `sleep`.  
Walker: PR 604 hop-splitter on **our 377** collision pack (Decision **015**).

```ts
import { readSnap, walk, perform, arrived, travelTo, interactNpcId, takeGround, groundAppeared, itemDelta } from '../apiv2/index.ts';

const before = readSnap();
const sent = walk({ x: 3208, z: 3220, level: 0 });
// sent.sent means the client accepted the click — not that you arrived.

const out = await perform(() => walk({ x: 3208, z: 3220, level: 0 }), {
  arms: { there: arrived({ x: 3208, z: 3220, level: 0 }, 2) },
  budgetTicks: 40
});
```

Long walks: `Traversal.walkTo` **defaults to** `travelTo` (furthest in-scene click, shrink on unreachable). Doors/stairs use `WalkExecutor.crossTransport`. Pass `{ engine: 'classic' }` to force the old follower.

Combat / loot (2026-08-14): `interactNpcId(708, 'Attack')` then `perform` / `until` on `npcInCombat` · `npcCountDropped` · `groundAppeared` · `itemDelta`. Take is `takeGround(id | name)` — send, then wait `itemDelta`. In-page global: `__lc377Api` (same pattern as `__lc377Nav`).

Doors: `approachNpcId(id)` = `travelTo` the NPC (pack Open). Talk does not walk through a shut door — Sedridor **1530** @ **3108,9570**.

**Do not** copy `quest-*-smoke.mjs` from the vault into a contributor clone. Copy `harness-101-smoke.mjs`.
