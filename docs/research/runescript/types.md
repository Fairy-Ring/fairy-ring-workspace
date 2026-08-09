# Types

> **RuneScript manual** (Fairy Ring / rev 377) · [Index](README.md) · [Living notes](living-notes.md)

## 5. Types (compile-time, strict)

The compiler is **strongly typed**. Common types:

| Type | Typical values | Notes |
|------|----------------|-------|
| `int` | literals, stats, counts | |
| `boolean` | compare results, `^true`/`^false` | |
| `string` | `"…"` | |
| `coord` | literals, `movecoord` | |
| `obj` | `last_useitem`, dynamic inv | **≠** `namedobj` |
| `namedobj` | `bronze_bar`, `cake` | Pack symbol constant |
| `npc` / `loc` / `inv` / `component` | pack symbols | |
| `seq` / `spotanim` / `synth` / `category` | pack symbols | |
| `proc` / `label` / `queue` / `timer` | script symbols | |

**Footgun:** `last_useitem` is **`obj`**. Do not declare `(namedobj $x)` for use-with procs unless you convert carefully.

```text
// ERROR if last_useitem (obj) passed to namedobj param
[proc,example](namedobj $x)
// OK
[proc,example](obj $x)
```

---
