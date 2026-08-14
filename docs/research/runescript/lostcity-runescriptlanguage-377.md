# LostCityRS/RuneScriptLanguage — pin (not crawled until 2026-08-13)

**Date:** 2026-08-13  
**Repo:** [LostCityRS/RuneScriptLanguage](https://github.com/LostCityRS/RuneScriptLanguage)  
**What it is:** VS Code / VSCodium **editor extension** for LC’s RuneScript *reconstruction* (highlight, hover, goto, rename, snippets). Marketplace `2004scape.runescriptlanguage`. MIT.  
**Tip this pass:** `main` **`d965f1e725be09aab23d7a12b0fb09f86149483a`** (Pazaz, 2026-06-28). `package.json` **0.3.4**.  
**Product stays 377.** Docs only. **Do not** clone into `vendor/` unless an operator wants the extension as a local tool.

## 0. Why it was missing

Provenance pins ([`PROVENANCE-UPSTREAM-PINS.md`](../PROVENANCE-UPSTREAM-PINS.md)) are **Content / Engine-TS / Client-TS** (plus Client-Java as 377 oracle). The RuneScript **manual** is first-principles from `engine.rs2`, `@lostcityrs/runescript` **0.9.6** (compiler, different package), and **@JagexAsh**. This repo is **IDE sugar** that indexes the workspace; it was never on the idle queue. Zero hits in `docs/` before this file.

That was a **gap**, not a verdict that the repo is useless. It encodes LC’s *file-type surface* (grammars for `.rs2` + configs + `.jm2` + later script suffixes).

## 1. What it is / is not

| Is | Is not |
|----|--------|
| Editor language support for LC content trees | Jagex internals / unpublished compiler |
| Workspace indexer (declarations, refs, hover) | Pack / bytecode / opcode semantics |
| Grammar + match types for LC dialect | Authority over Ash or 377 `engine.rs2` |
| Registers `.cs2` `.ls2` `.ss2` `.gs2` | Proof those suffixes exist on **rev 377** |

**Different from the compiler we already run:** `vendor/engine` depends on **`@lostcityrs/runescript` 0.9.6**. That is the packer. This GitHub repo is the **VS Code extension**. Do not conflate.

## 2. File-type surface (`package.json` contributes)

**377-relevant (we have these):** `.rs2`, `.obj` `.loc` `.npc` `.inv` `.seq` `.spotanim` `.mesanim` `.idk` `.hunt` `.flo`, `.varp` `.varbit` `.varn` `.vars`, `.param` `.struct` `.enum` `.dbtable` `.dbrow`, `.constant`, `.if`, `.pack` `.order`, `.opt`, `.jm2`.

**Registered here, not 377 product:** `.cs2` (ClientScript), `.ls2` `.ss2` `.gs2` (lobby/server/global). Treat as **later LC / later-era** unless 377 content grows those extensions. Do **not** invent `.cs2` on the 377 pack from this list.

## 3. How to use (if we crawl deeper)

- **Grammars** `syntaxes/*.tmLanguage.json` — what LC thinks a token is (not Ash).
- **Matchers** `src/matching/` — how they bind `~proc`, `[command]`, pack ids, loc models `_0`/`_q`.
- **Diagnostics** — LC style checks; can disagree with our 377 compiler.
- **Forum** [lostcity.rs/t/vs-code-runescript-extension/2549](https://lostcity.rs/t/vs-code-runescript-extension/2549) — feature requests, not period media.

Contradiction order: **Ash (language)** → **377 `engine.rs2` + `@lostcityrs/runescript` pack** → this extension’s grammar. Cache / calendar still govern content.

## 4. Not this file

- Installing the VSIX into operator VS Code (optional tool).
- Forking it to Fairy-Ring.
- Treating hover text as May 2006 truth.
- Full grammar dump (token-heavy). Re-open this pin if we need a matcher table.
