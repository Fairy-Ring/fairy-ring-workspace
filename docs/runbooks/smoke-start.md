# Smoke start runbook (isolated r377)

## Prerequisites

- Node.js **24+**
- Clones at `vendor/engine` + `vendor/content`
- Isolation `.env` applied (see `isolation.md`)
- Ports 8891 / 8899 / 43595 free

## Steps

```bash
export LC377_ROOT=$RS2_R377_ROOT
cd "$LC377_ROOT"

# 1) Isolation env
bash scripts/apply-isolation-config.sh
# or manually create vendor/engine/.env as documented

# 2) Install + start (long-running)
cd vendor/engine
npm install
npm start
```

## Expected

| Check | Expect |
|-------|--------|
| Process stays up | no immediate crash |
| Management | `http://localhost:8899/setup` (per upstream; port overridden) |
| Web | `http://localhost:8891` |
| Game port | listening on **43595** |
| Logs | revision 377; content path `../content` |

## Smoke checklist

```text
[ ] Server process running from vendor/engine only
[ ] No writes under experiments/Server
[ ] Open setup page
[ ] Create/login local account (if registration enabled)
[ ] Enter world, walk a few tiles
[ ] Open bank (if near)
[ ] Logout and relog (save works)
[ ] Capture log excerpt → docs/plans/YYYY-MM-DD-smoke.md
```

## Failure triage

| Symptom | Check |
|---------|-------|
| EADDRINUSE | live stack still bound; change ports or stop live |
| Cannot find content | `BUILD_SRC_DIR=../content`; cwd must be `vendor/engine` |
| Pack errors | content/377-wip incomplete; save log to docs/plans |
| Wrong revision | `ENGINE_REVISION=377` in env |

## After first success

Update:

1. `docs/plans/` session status — mark smoke green  
2. `docs/gap/000-baseline.md` P0 checkboxes  
3. This runbook if ports/paths differed  
