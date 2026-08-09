# Decision 004 — Client vs bot/harness boundary

**Date:** 2026-08-03  
**Status:** accepted  
**Context:** rev 377 TS client port + eventual rs2b0t adapt + thin live harnesses

## Decision

**Client code stays pure.** Bot code and test harness code are always separate layers.

| Layer | Path | May touch Client internals? |
|-------|------|------------------------------|
| **Client (1:1 Java)** | `vendor/client-ts/src/**` (excl. nothing harness-related) | N/A — *is* the client; **no harness imports** |
| **Pure play shell** | `vendor/engine/public/rs2.html` | Loads `/client/client.js` only |
| **Harness client** | `tools/harness/client-entry.ts` → `public/harness/harness-client.js` | Pure Client-TS **+ build inject** (`.generated/Client.ts`) + adapter; **separate artifact** — see Decision 006 |
| **Harness adapter** | `tools/harness/attach-in-page.js` | `reader` / `actions` on live instance (rs2b0t pattern) |
| **Harness scripts** | `tools/harness/script/browser/**` | **No** — only `api.ts` over adapter; adapted rs2b0t TaskBots |
| **Script host (PW)** | `tools/harness/script/run.mjs` | Playwright login → `scripts.start(name)` |
| **Harness smokes** | `tools/harness/*-smoke.mjs` | Playwright → `harness.html` (thin; prefer scripts) |
| **Bot product (later)** | `vendor/rs2b0t/**` only | `ClientAdapter` only — **not required for iteration** |

## Rules

1. **No harness/bot imports inside pure Client-TS.** No `?harness` branches in `Client.ts`, no adapter install in `client.js`. Harness is a **second entry** (`tools/harness/client-entry.ts`) that *embeds* Client without editing it.
2. **Oracle for client behaviour is Client-Java 377**, not the harness, not the LC engine, not Playwright.
3. **Harness is opt-in** — `rs2.html?harness=1` loads `tools` attach script and builds `globalThis.__lc377` outside the client bundle.
4. **Prefer client `build:dev` for harness runs** — prod terser renames private methods; attach digs by name (same constraint as external adapters).
5. **Script-first, bot-later:** adapt rs2b0t **scripts + API names** onto the harness client for rapid iteration. Do **not** wait on a full `vendor/rs2b0t` product (BotHost, MultiBox, panel). Full bot vendoring is a later phase after the adapter ABI is proven.
6. **When rs2b0t is vendored:** rebind adapter to 377 client; still no bot code inlined into Client-TS. Scripts stay on the bot/harness side of the fence.

10. **rs2b0t is not the residual driver (2026-08-09).**  
    - **Now:** harness-first for r377 authenticity proofs. Harvest **patterns** from live rs2b0t (read-only); do **not** switch residual/content work to full BotHost / multibox / 274 client stack.  
    - **Later:** vendor `vendor/rs2b0t` as the **bot product** after pure freeze + content-complete enough (same neighborhood as public / debug-PR phase — before QoL Decision 010). Rebuild nav packs for 377 (005); rebind adapter only.  
    - **Upstream direction:** rs2b0t → us = patterns; us → rs2b0t = only general tools/scripts (not LC residual thrash/cheats). Never make content purity depend on BotHost.  
    - **LC for LC, bot for bot** — workspace stays glue; bot stays its own tree.
7. **Engine debug cheats — setup yes, force-pass no** (local non-prod, staffmodlevel 4).  
   - **Allowed:** seed state for a focused check (`give`, `tele`, bank fill, `::reload` after packing RuneScript, jump to a known tile before testing one door).  
   - **Not allowed:** auto-cheat inside a “tutorial complete” / stage-pass path so the proof never exercises the real OPLOCU / Talk / inv outcome.  
   Cheats still use the real client wire (`CLIENT_CHEAT`), not a forged bot protocol.

8. **Audience split (2026-08-05).**  
   - **Product (Client-TS / Engine / Content):** purity bar is **LC-grade accuracy**. Document for people who will reject “it mostly worked.”  
   - **Toys (harness / eventual rs2b0t):** play however you like **without** contaminating product trees; soft mids → `docs/research/softpass.md`; intentional product non-auth → `docs/research/deviations.md`; never sold as residual-complete without the bar.  
   - **Docs are the bridge** — not chat.

9. **Harness may outgrow a typical bot-script corpus (2026-08-08).**  
   - **OK:** test-only tools under `tools/harness/**` that a production bot would never ship (prep cheats, dirty-run lint, thrash helpers, clean logout for relog, random soft-kill, config injects).  
   - **Keep severable:** prefer plain modules (`lib/*.mjs`, attach actions, smoke hosts) with **no** hard dependency on a future BotHost/panel. When forward-porting to `vendor/rs2b0t`, copy/adapt the **tool**, not the whole smoke monofile.  
   - **Still never** put harness test tools inside pure `vendor/client-ts`.

## Rationale

- 1:1 port requires the client tree to remain a mechanical Java→TS map (`docs/plans/2026-08-03-one-to-one-ts-client.md`).
- Mixing attach/login helpers into Client creates a fork that cannot claim stock-server readiness.
- rs2b0t already solved this: only `ClientAdapter` names client fields; everything else uses the ABI.
- LC-style accuracy readers will inspect product trees harshly; toys exist so iteration speed does not force product lies.

## Anti-patterns

- Extracting “pure encoder modules” out of `doAction` “for unit tests” if that restructures the Java method map without a Java cite.
- Synthetic mouse-only smoke as the long-term agent loop (keyboard login on canvas is fragile; attach + `client.login` is the rs2b0t pattern).
- Editing live `read-only rs2b0t tree (if present)` for this workspace.

## Related

- `docs/plans/2026-08-03-rs2b0t-adapt.md`
- `docs/plans/2026-08-03-one-to-one-ts-client.md`
- `docs/runbooks/harness.md`
- `tools/harness/`
