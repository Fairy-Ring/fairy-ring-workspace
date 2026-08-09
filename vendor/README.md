# Vendor clones (rs2-r377)

These directories are **independent git clones**. The workspace product repo only tracks **this** README (not the full trees).

## Launch-together (public aim)

When this project goes public, the intent is that **workspace + content + engine + client-ts** open **together** under the **rs2-r377** brand, each with matching README/NOTICE (derivation of Lost City, not official LC, AI disclosure).

| Path | Role | Private remote today (legacy name until rename) |
|------|------|--------------------------------------------------|
| `content/` | Period content | https://github.com/acfrazier/LC-rs2-r377-content |
| `engine/` | Engine-TS fork | https://github.com/acfrazier/LC-rs2-r377-engine |
| `client-ts/` | Pure Client-TS 377 | https://github.com/acfrazier/LC-rs2-r377-client-ts |
| *(workspace root)* | Docs + harness | https://github.com/acfrazier/LC-rs2-r377-workspace |

**At flip:** rename GitHub repos off the **`LC-`** prefix → `rs2-r377-*` (or similar); flip visibility only on operator call.  
**Never** present any of these as official LostCityRS.

### Upstream pins (git history is intact)

Measured 2026-08-09 — each dirty tree still has **full Lost City commit history** (not shallow). Merge-base equals upstream tip at branch time:

| Tree | GitHub-style pin |
|------|------------------|
| content | `LostCityRS/Content@7d7719693100cc45ff187c12139e5b63b3ab21df` (`377-wip`) |
| engine | `LostCityRS/Engine-TS@94fcfa2d2c2fc5812e6d448a5e4a04fd73879fd3` (`377-wip`) |
| client-ts | `LostCityRS/Client-TS@bc4751da0748704307eef9e186015b08834fccf7` (`289`) |

Details: each `vendor/*/PROVENANCE.md` · workspace [`docs/research/PROVENANCE-UPSTREAM-PINS.md`](../docs/research/PROVENANCE-UPSTREAM-PINS.md).  
GitHub “forked from” network may be missing (independent push); **SHAs + history** are the proof.

## Private backups (acfrazier)

| Path | Local branch | Upstream `origin` (fetch only) | Private remote `private` |
|------|--------------|--------------------------------|---------------------------|
| `content/` | `rs2-r377` | LostCityRS/Content | `acfrazier/LC-rs2-r377-content` |
| `engine/` | `rs2-r377` | LostCityRS/Engine-TS | `acfrazier/LC-rs2-r377-engine` |
| `client-ts/` | `rs2-r377` | LostCityRS/Client-TS | `acfrazier/LC-rs2-r377-client-ts` |
| `client-java/` | `377` | LostCityRS/Client-Java | *(clean; re-clone from LC if needed)* |
| `Server/` | `main` | LostCityRS/Server | *(clean; re-clone from LC if needed)* |

**Policy:**

- `origin` push URL is **DISABLED** on dirty trees — never push to LostCityRS.  
- After content/engine/client work: `git -C vendor/<tree> push private rs2-r377`  
- Visibility: **private** until the coordinated public open.  
- Each dirty tree has its own **README.md** + **NOTICE.md** (rs2-r377 branding).

### Bootstrap after laptop loss

```bash
export RS2_R377_ROOT=…/rs2-r377-workspace   # or legacy LC-rs2-r377-2006-05-02 path
# product workspace already: git clone …/LC-rs2-r377-workspace (rename later)
mkdir -p "$RS2_R377_ROOT/vendor"
git clone -b rs2-r377 https://github.com/acfrazier/LC-rs2-r377-content.git "$RS2_R377_ROOT/vendor/content"
git clone -b rs2-r377 https://github.com/acfrazier/LC-rs2-r377-engine.git "$RS2_R377_ROOT/vendor/engine"
git clone -b rs2-r377 https://github.com/acfrazier/LC-rs2-r377-client-ts.git "$RS2_R377_ROOT/vendor/client-ts"
# optional clean refs:
git clone -b 377 https://github.com/LostCityRS/Client-Java.git "$RS2_R377_ROOT/vendor/client-java"
git clone https://github.com/LostCityRS/Server.git "$RS2_R377_ROOT/vendor/Server"
# then re-add origin fetch + disable push if desired
```

Live 274 trees stay read-only reference (not under `vendor/`):

- `/Users/acfrazier/experiments/Server`
- `/Users/acfrazier/code/rs2b2t-engine`
- `/Users/acfrazier/experiments/rs2b0t`

## What is *not* vendored into the workspace git

Full content/engine/client history is **not** in the workspace product repo — only this index README. That keeps the first public unit docs/process-sized while vendor forks open on the same day under their own remotes.
