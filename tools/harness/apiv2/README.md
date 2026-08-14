# Harness apiv2 (rs2b0t PR 604 shape)

One snapshot per tick. Sends return immediately. Waiting names **evidence**, not `sleep`.  
Walker: PR 604 hop-splitter on **our 377** collision pack (Decision **015**).

```ts
import { readSnap, walk, perform, arrived, travelTo } from '../apiv2/index.ts';

const before = readSnap();
const sent = walk({ x: 3208, z: 3220, level: 0 });
// sent.sent means the client accepted the click — not that you arrived.

const out = await perform(() => walk({ x: 3208, z: 3220, level: 0 }), {
  arms: { there: arrived({ x: 3208, z: 3220, level: 0 }, 2) },
  budgetTicks: 40
});
```

Long walks: `Traversal.walkTo` **defaults to** `travelTo` (furthest in-scene click, shrink on unreachable). Doors/stairs use `WalkExecutor.crossTransport`. Pass `{ engine: 'classic' }` to force the old follower.

**Do not** copy `quest-*-smoke.mjs` from the vault into a contributor clone. Copy `harness-101-smoke.mjs`.
