# Vendor clones (rs2-r377)

These directories are **independent git clones**. The workspace product repo only tracks **this** README (not the full trees).

## Launch-together

**Workspace + content + engine + client-ts** open as companion remotes under brand **rs2-r377** (not a monorepo dump of game trees).

| Path | Role | GitHub (target brand name) |
|------|------|----------------------------|
| `content/` | Period content | `acfrazier/rs2-r377-content` |
| `engine/` | Engine-TS fork | `acfrazier/rs2-r377-engine` |
| `client-ts/` | Pure Client-TS | `acfrazier/rs2-r377-client-ts` |
| *(workspace)* | Docs + harness (thin) | `acfrazier/rs2-r377-workspace` |

**Note:** Private remotes may still use a legacy `rs2-r377-*` GitHub name until rename at public flip. Same trees; brand is **rs2-r377**.

**Never** present any of these as official LostCityRS.

### Upstream pins (git history intact)

| Tree | GitHub-style pin |
|------|------------------|
| content | `LostCityRS/Content@7d7719693100cc45ff187c12139e5b63b3ab21df` (`377-wip`) |
| engine | `LostCityRS/Engine-TS@94fcfa2d2c2fc5812e6d448a5e4a04fd73879fd3` (`377-wip`) |
| client-ts | `LostCityRS/Client-TS@bc4751da0748704307eef9e186015b08834fccf7` (`289`) |

Details: each `vendor/*/PROVENANCE.md` · workspace `docs/research/PROVENANCE-UPSTREAM-PINS.md`.

## Clone layout

| Path | Local branch | Upstream `origin` (fetch only) |
|------|--------------|--------------------------------|
| `content/` | `rs2-r377` | LostCityRS/Content |
| `engine/` | `rs2-r377` | LostCityRS/Engine-TS |
| `client-ts/` | `rs2-r377` | LostCityRS/Client-TS |
| `client-java/` (optional) | `377` | LostCityRS/Client-Java |
| `Server/` (optional) | `main` | LostCityRS/Server |

**Policy:**

- `origin` push to LostCityRS should stay **disabled** on experiment forks.  
- Push your work to **your** remotes only.  
- Each dirty tree has its own README / NOTICE / PROVENANCE.

### Bootstrap

```bash
export RS2_R377_ROOT=/path/to/rs2-r377-workspace
mkdir -p "$RS2_R377_ROOT/vendor"
# Prefer brand names once remotes are renamed; until then substitute your fork URLs:
git clone -b rs2-r377 https://github.com/acfrazier/rs2-r377-content.git "$RS2_R377_ROOT/vendor/content" \
  || git clone -b rs2-r377 https://github.com/acfrazier/rs2-r377-content.git "$RS2_R377_ROOT/vendor/content"
git clone -b rs2-r377 https://github.com/acfrazier/rs2-r377-engine.git "$RS2_R377_ROOT/vendor/engine" \
  || git clone -b rs2-r377 https://github.com/acfrazier/rs2-r377-engine.git "$RS2_R377_ROOT/vendor/engine"
git clone -b rs2-r377 https://github.com/acfrazier/rs2-r377-client-ts.git "$RS2_R377_ROOT/vendor/client-ts" \
  || git clone -b rs2-r377 https://github.com/acfrazier/rs2-r377-client-ts.git "$RS2_R377_ROOT/vendor/client-ts"
```

Optional clean refs from Lost City upstream (read-only research):

```bash
git clone -b 377 https://github.com/LostCityRS/Client-Java.git "$RS2_R377_ROOT/vendor/client-java"
git clone https://github.com/LostCityRS/Server.git "$RS2_R377_ROOT/vendor/Server"
```

Live 274 production trees (if any on your machine) stay **read-only reference** — not under this `vendor/` layout for day-to-day work.

## What is *not* in the workspace git

Full content/engine/client history is **not** in the workspace product repo — only this index README. That keeps the public unit docs/process-sized while vendor forks open as companions.
