# ADR 002 — Prioritize TypeScript client for 377

**Status:** Accepted  
**Date:** 2026-08-03

## Context

- Engine + Java client can talk (barebones playable path).
- Content is largely incomplete (`no trigger for …`); long-term target includes **rs2b0t** (TS-embedded client).
- There is **no** LostCityRS Client-TS branch for 377.
- Day-to-day iteration is agent-heavy; Java desktop is a weak harness (Gradle/AWT, hard to automate).
- Engine `NODE_DEBUG_SOCKET` helps headless bots slightly but does not replace a real client.

## Decision

**Move the TypeScript 377 client to a primary track now**, not a late “after all content” phase.

- **Java client** remains the **oracle** and optional human reference.  
- **TS client** becomes the **default iteration surface** for login/world/interact harness and future bots.  
- Content work continues in parallel once TS can login/walk (or still via Java if needed).

## Approach

Incremental port: start from LC **Client-TS 289 or 274** (or vendored rs2b0t client), evolve to **377** using Java deob + engine protocol as truth. See `docs/research/client-strategy-377.md`.

## Consequences

- Large upfront client engineering cost (accepted).  
- Faster agent loops and a path to rs2b0t.  
- Risk of drifting from Java behaviour — mitigate with oracle diffs and authenticity ladder.  
- Do not invent game rules in the client port.
