# ADR 001 — Base work on upstream 377-wip

**Status:** Accepted (P0)  
**Date:** 2026-08-03

## Context

We need revision 377. Live stack is 274. Upstream Lost City publishes `377-wip` for Engine-TS and Content, branded “May 2, 2006”, with `ENGINE_REVISION` default 377 and rsbuf 377.x.

## Decision

All engine/content work in this workspace **starts from `origin/377-wip`**, local branch name **`rs2-r377`**.

We will **not** port 377 features onto 274 as the primary path.

## Consequences

- Faster path to a runnable 377 world.  
- Inherit whatever incompleteness 377-wip already has (document in `docs/gap/`).  
- Live 274 remains untouched.  
- Optional later: cherry-pick anarchy/rs2b2t patches **onto** `rs2-r377`, not the reverse.
