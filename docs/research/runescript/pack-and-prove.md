# Pack, reload, prove, trust

> **RuneScript manual** (LC-rs2 r377) · [Index](README.md) · [Living notes](living-notes.md)

## 9. Pack, reload, prove

```bash
export RS2_R377_ROOT=$RS2_R377_ROOT
cd "$RS2_R377_ROOT/vendor/engine"
BUILD_VERIFY=false npm run build
# then either restart engine, or in-game ::reload / ::rebuild (staff)
# ALWAYS after pack that rewrites client cache:
curl -s http://127.0.0.1:81/versionlist | wc -c
wc -c data/pack/client/versionlist   # must match (often 81054)
```

| Claim | Proof |
|-------|--------|
| “Talk works” | Real Talk-to → dialog / stage change |
| “Hold greegree works” | Real held op → worn |
| “Smelt works” | Real use-on furnace → product + XP path |

**Cheats** (`give`, `tele`, `setvar`) seed tests; they do **not** prove the trigger path (Decision 004).

---

## 10. Trust model (content sources)

| Tree | Trust |
|------|--------|
| `vendor/content` on `rs2-r377` | Starting pack — **verify** |
| 274 Live Server content | Read-only reference; often more complete for pre-2006 |
| 289 LC origin | Later content; era-check before port |
| Invented handlers | **Forbidden** without research ladder |

Ladder: authenticity doc → pack audit → port → pack → real-action smoke → deviations.md if non-authentic.

---
