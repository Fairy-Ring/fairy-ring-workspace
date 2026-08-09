# Cache (local only — not in git)

**Never commit cache blobs to this repository.**  
`.gitignore` excludes `cache/**` except this README (and optional `.gitkeep`).

Game data for **RuneScape revision 377** (~2 May 2006) is available on the open internet via **OpenRS2**. You download it yourself into this folder (or another path your pack/engine docs use).

## OpenRS2 — use cache id **657**, not path “377”

| Field | Value |
|-------|--------|
| **RS build / revision** | **377** (~2006-05-02) |
| **OpenRS2 cache ID** | **`657`** |
| Detail page | https://archive.openrs2.org/caches/runescape/657 |
| Disk zip (classic `.dat` / `.idx`) | https://archive.openrs2.org/caches/runescape/657/disk.zip |
| Flat tar | https://archive.openrs2.org/caches/runescape/657/flat-file.tar.gz |
| Keys JSON | https://archive.openrs2.org/caches/runescape/657/keys.json |

### Critical pitfall

**Do not** use OpenRS2 path `/caches/runescape/377/` — that id is **OSRS build 44 (2014)**, not mainline RS2 rev 377.  
Always select by **build number 377** → OpenRS2 id **657**.

### Suggested local layout

```text
cache/openrs2-377/
  disk.zip              # from OpenRS2 657
  disk/cache/…          # optional extract of disk.zip
  flat-file.tar.gz      # optional
  keys.json             # optional
  SHA256SUMS.txt        # optional
```

Helper (workspace root):

```bash
bash scripts/fetch-openrs2-cache.sh
# downloads into cache/openrs2-377/ (creates dirs)
```

### Checksums (as published / measured in research)

```
5467efe75598a77f6f8d1960178cc21ad32c17613143f8aeabfcdfd23a172ed4  disk.zip
bbd89e5e4bb81a15f35525ce7da25e2e855578602b2d298f7d2885a46b0f96c1  flat-file.tar.gz
5984eac0c5c6d947241e29dd5671b81a1546cedf77e08d38438ac47029969afa  keys.json
```

Re-check on the OpenRS2 page if downloads change.

## How this relates to a running world

| Piece | Role |
|-------|------|
| **`vendor/content`** | Editable period scripts/configs (separate git) — primary for engine pack |
| **OpenRS2 657** | Authority reference for assets / missing groups; classic client-style store |
| **This workspace git** | **No** blobs — only this guide |

Lost City–style stacks pack from **content** (+ engine tools). The OpenRS2 dump is for archaeology, parity, and recovery — not something we redistribute from this repo.

## Attribution

- **OpenRS2** — cache archive hosting  
- **Jagex** — period game assets remain Jagex IP; presence on OpenRS2 does not change that  
- See root [NOTICE.md](../NOTICE.md)

## Deeper research (private vault / full tree)

Operators with the full private vault: `docs/research/cache-377.md`.  
Public thin export may only ship this README.
