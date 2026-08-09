# Vendor clones (Fairy Ring)

These directories are **independent git clones**. The workspace product repo only tracks **this** README (not the full trees).

## Launch-together

**Fairy Ring** companions (brand name; not a monorepo dump of game trees):

| Path | Role | GitHub |
|------|------|--------|
| `content/` | Period content | https://github.com/acfrazier/FR-content |
| `engine/` | Engine-TS fork | https://github.com/acfrazier/FR-engine |
| `client-ts/` | Pure Client-TS | https://github.com/acfrazier/FR-client-ts |
| *(this workspace)* | Docs + harness process | https://github.com/acfrazier/fairy-ring-workspace |

**Never** present any of these as official LostCityRS.

### Upstream pins (git history intact)

| Tree | GitHub-style pin |
|------|------------------|
| content | `LostCityRS/Content@7d7719693100cc45ff187c12139e5b63b3ab21df` (`377-wip`) |
| engine | `LostCityRS/Engine-TS@94fcfa2d2c2fc5812e6d448a5e4a04fd73879fd3` (`377-wip`) |
| client-ts | `LostCityRS/Client-TS@bc4751da0748704307eef9e186015b08834fccf7` (`289`) — branch label `rs2-r377` is this project’s 377-focus line |

Details: each `vendor/*/PROVENANCE.md` · workspace `docs/research/PROVENANCE-UPSTREAM-PINS.md`.

## Branches

| Path | Working branch | Notes |
|------|----------------|--------|
| content | **`rs2-r377`** | From LC Content `377-wip` |
| engine | **`rs2-r377`** | From LC Engine-TS `377-wip` |
| client-ts | **`rs2-r377`** | From LC Client-TS **`289`** tip; behavioural oracle remains Client-Java 377 |

## Clone layout

```bash
export RS2_R377_ROOT=/path/to/fairy-ring-workspace
mkdir -p "$RS2_R377_ROOT/vendor"
git clone -b rs2-r377 https://github.com/acfrazier/FR-content.git "$RS2_R377_ROOT/vendor/content"
git clone -b rs2-r377 https://github.com/acfrazier/FR-engine.git "$RS2_R377_ROOT/vendor/engine"
git clone -b rs2-r377 https://github.com/acfrazier/FR-client-ts.git "$RS2_R377_ROOT/vendor/client-ts"
```

Optional clean refs from Lost City upstream (read-only research):

```bash
git clone -b 377 https://github.com/LostCityRS/Client-Java.git "$RS2_R377_ROOT/vendor/client-java"
git clone https://github.com/LostCityRS/Server.git "$RS2_R377_ROOT/vendor/Server"
```

**Policy:**

- On experiment forks: LostCityRS `origin` push should stay **disabled**.  
- Push work to **your** remotes as configured for this project.  
- Each dirty tree has README / NOTICE / PROVENANCE when present.

## What is *not* in the workspace git

Full content/engine/client history is **not** in the workspace product repo — only this index README.
