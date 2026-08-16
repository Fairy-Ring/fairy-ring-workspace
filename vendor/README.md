# Vendor trees (Fairy Ring)

Local checkouts of the product repos (and optional research clones).  
The **workspace** git tracks process/docs/harness only — full content/engine/client history lives in their own remotes. This file is the index the workspace keeps in git.

## Product trees

| Path | Repo | Branch | Role |
|------|------|--------|------|
| `content/` | [Fairy-Ring/FR-content](https://github.com/Fairy-Ring/FR-content) | `rs2-r377` | Period RuneScript, configs, maps |
| `engine/` | [Fairy-Ring/FR-engine](https://github.com/Fairy-Ring/FR-engine) | `rs2-r377` | Server, pack/unpack, protocol |
| `client-ts/` | [Fairy-Ring/FR-client-ts](https://github.com/Fairy-Ring/FR-client-ts) | `rs2-r377` | Pure browser client (Java 377 → TS) |
| *(workspace root)* | [Fairy-Ring/fairy-ring-workspace](https://github.com/Fairy-Ring/fairy-ring-workspace) | `rs2-r377` | Docs, harness toys, isolation scripts |

**Not** official LostCityRS. Brand: **Fairy Ring**.

### Why `vendor/`?

Folder name only — “checked out beside the workspace,” not a monorepo and not npm-style vendoring. Each path is a normal git clone with its own remotes.

### Upstream lineage (pins)

| Tree | Upstream pin |
|------|----------------|
| content | `LostCityRS/Content@7d7719693100cc45ff187c12139e5b63b3ab21df` (`377-wip`) |
| engine | `LostCityRS/Engine-TS@94fcfa2d2c2fc5812e6d448a5e4a04fd73879fd3` (`377-wip`) |
| client-ts | `LostCityRS/Client-TS@bc4751da0748704307eef9e186015b08834fccf7` (`289`) — our line is `rs2-r377`; behavioural oracle remains Client-Java 377 |

Details: each `vendor/*/PROVENANCE.md` · workspace `docs/research/PROVENANCE-UPSTREAM-PINS.md`.

## Clone

```bash
export RS2_R377_ROOT=/path/to/fairy-ring-workspace
mkdir -p "$RS2_R377_ROOT/vendor"
git clone -b rs2-r377 https://github.com/Fairy-Ring/FR-content.git "$RS2_R377_ROOT/vendor/content"
git clone -b rs2-r377 https://github.com/Fairy-Ring/FR-engine.git "$RS2_R377_ROOT/vendor/engine"
git clone -b rs2-r377 https://github.com/Fairy-Ring/FR-client-ts.git "$RS2_R377_ROOT/vendor/client-ts"
```

Optional research clones (not required for smoke):

```bash
git clone -b 377 https://github.com/LostCityRS/Client-Java.git "$RS2_R377_ROOT/vendor/client-java"
git clone https://github.com/LostCityRS/Server.git "$RS2_R377_ROOT/vendor/Server"
```

## Remotes (typical)

| Remote | Points at | Push |
|--------|-----------|------|
| `origin` | LostCityRS upstream | **disabled** |
| `private` | `Fairy-Ring/FR-*` (**public**; name is a leftover) | product push — do this when a unit lands |

Never push experiment work to `LostCityRS/*` without permission.
