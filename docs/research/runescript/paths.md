# Paths and how to extend

> **RuneScript manual** (Fairy Ring / rev 377) · [Index](README.md) · [Living notes](living-notes.md)

## 13. Key paths (bookmark)

| What | Path |
|------|------|
| Opcode catalog | `vendor/content/scripts/engine.rs2` |
| Core constants | `vendor/content/scripts/engine.constant` |
| Trigger enum | `vendor/engine/src/engine/script/ServerTriggerType.ts` |
| Trigger lookup | `vendor/engine/src/engine/script/ScriptProvider.ts` |
| Player protect / timers | `vendor/engine/src/engine/entity/Player.ts` |
| Compiler package | `@lostcityrs/runescript` **0.9.6** (packer — not the VS Code extension) |
| LC editor extension | [LostCityRS/RuneScriptLanguage](https://github.com/LostCityRS/RuneScriptLanguage) — pin [`lostcity-runescriptlanguage-377.md`](lostcity-runescriptlanguage-377.md) |
| Content inventory | `docs/gap/002-content-inventory.md` |
| Quest checklist | `docs/runbooks/quest-impl.md` |
| Pack / reload | `docs/runbooks/harness.md`, §9 above |
| Opcode call census (re-measure) | `docs/research/runescript/opcode-usage-census.md` · helper `docs/research/runescript/_opcode_census_measure.py` |

---

## 14. How to extend this manual

1. **New opcode behaviour** → short subsection + row in §12.  
2. **New footgun from a port** → §12 row first; promote to §4–8 if recurrent.  
3. **Do not** duplicate full opcode lists — point at `engine.rs2`.  
4. Keep examples **copy-pasteable** from this tree’s content.

*This is the manual. When it is wrong, fix the manual in the same turn as the content.*
