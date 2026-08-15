# Game-knowledge anchors — Soul's Bane rage enter (377)

**Date:** 2026-08-15  
**Use:** Harness tele **next to** the roped rift, not on it. Soft `setvar soulbane_riftrope_pres 1` is a **toy**.  
**Product stays 377.** Hunt 289? **no**. Docs only this file.

**Parents (cite — do not rewrite):** impl [`../residual-if-15100-room-dest-377.md`](../residual-if-15100-room-dest-377.md) · dest [`../dest-from-our-maps-377.md`](../dest-from-our-maps-377.md) · stand [`harness-tele-stand.md`](harness-tele-stand.md)

**Tag:** **VERIFIED** = headed **PASS** `sbragsuuf0on` · **CANDIDATE** = dest-cite collision · **SOFT** = rope-on bit.

---

## Rage enter (15100 smoke)

| | Tile | Note |
|--|------|------|
| **Roped rift** | **3310,3452** L0 | jm2 parent `soulbane_falloff2_rope_multi` **13968**. Reader reports **13968**, not child **13970** |
| **Stand** | **3309,3452** L0 | west of rift. **Not** on the loc |
| **Dest** | **3013,5243** L0 | **CANDIDATE** walkable east of rack **3012,5243**. `p_teleport(0_47_81_5_59)` |
| **Overlay** | `rage_level` **15100** | title **Rage level.** + dummy pips. **PASS** `sbragsuuf0on` |

Empty rifts around Launa (`soulbane_falloff1` **13967** and siblings) are **not** this join. 2007-base: cannot jump down without the rope.

---

## Nearby — not this overlay

| Who / loc | Tile | Why out |
|-----------|------|---------|
| **Launa** multi **3638** | **3309,3453** · stand **3308,3453** | start Talk-to, **not** HUD |
| Lobby `soulbane_rope_down` **14000** | **3297,9823** | overworld +6400 lobby, **not** rage |
| Confusion door **13907** | **3055,5205** | other room |
| Rack **13993** | **3012,5243** | presence / later Take-from. **Not** dest |
| Journal `questlist:soulbane` **15098** | — | stay closed this slice |

**OUT:** pip hide / Angry-* combat / 40 Attack XP / Tolna voice / confusion-fear-hope chain.
