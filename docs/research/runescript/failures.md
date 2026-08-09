# Failure diagnosis

> **RuneScript manual** (LC-rs2 r377) · [Index](README.md) · [Living notes](living-notes.md)

## 11. Failure table (quick diagnosis)

| Symptom | Likely cause |
|---------|----------------|
| `No trigger for [opnpc1,…]` | Missing script or not reloaded |
| `No trigger for [opnpc1,*_multinpc_*]` | Multi not resolved; engine used map base type |
| Chat title `null` | `npc_name` on multi base |
| Pack `Type mismatch` | Wrong arg types/counts (obj vs namedobj, queue arity) |
| Pack `already defined` | Duplicate trigger or config debugname |
| Script stack + `oc_category` | Null obj into category/name opcode |
| Timer never fires | Never `settimer`; or NORMAL timer while always busy |
| Worn item stuck | Timer never armed; or force-unequip aborted |
| Scene stuck `sceneState=1` | versionlist HTTP ≠ flat after pack |

---
