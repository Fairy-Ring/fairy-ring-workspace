# ADR 003 — Exact-copy Java 377 → TypeScript client

**Status:** Accepted (clarified)  
**Date:** 2026-08-03

## Context

Preservation goal for this workspace: **rev 377 fidelity**. The only complete client for that rev in-tree is **Client-Java `377`**. A TS client is needed for agent iteration and later rs2b0t, but it must not become a “mostly works” fork.

Scaffolding from Client-TS 289 got us shell/deploy and partial load; post-login desync showed 289 is the wrong base for behaviour.

## Decision

**Port the entire Java 377 client to TypeScript as an exact behavioural copy.**

- Oracle: `vendor/client-java`  
- Target: `vendor/client-ts`  
- Not: evolve 289 protocol by crash-driven patches  
- Not: invent client behaviour for missing handlers  

Browser differences only where the platform requires them (canvas, WebSocket, Web Audio loading paths for the **same** assets Java uses).

## Consequences

- Large, systematic port — accepted.  
- Work is package-ordered and parity-checked against Java.  
- Content (`no trigger`) stays a separate preservation track on the server.  
- Soundfont/MIDI/etc. are in-scope only as **parity** with how the Java client ships, not as optional polish.
