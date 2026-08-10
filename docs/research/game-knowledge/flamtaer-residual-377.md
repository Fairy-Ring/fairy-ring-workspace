# Flamtaer residual — game knowledge (rev 377)

**Purpose:** Player ops truth for **Shades of Mort’ton** Flamtaer complete residual under bar §2.  
**Audience:** agents before residual thrash; not a thrash log.  
**Parents:** `flamtaer-pyre-loc-window-377.md` · `anchors-mort-myre.md` · `harness-tele-stand.md` · HARD mid-temple 50 `mtnsgsppgf`

**Pre-polish rule:** update this file when residual thrash teaches a stand/order/gate. Do not re-derive from chat.

---

## Stage ladder (`%morttonquest`)

| Stage | Constant | Product meaning | Residual note |
|------:|----------|-----------------|---------------|
| 50 | ulsquire_temple | Mid-temple HARD done | Soft entry OK for residual above |
| 55 | rebuild_temple | First wall repair | Prefer Broken wall Repair |
| 60 | can_light_altar | `repaired_p=100` walls | **Not** personal sanc ≥10% |
| 65 | created_sacred_oil | Olive on **flaming** altar | needs sanc ≥10% / raw ≥300 |
| 70 | created_pyre_logs | Oil on logs | clearinv mats if full |
| 75 | logs_on_pyre | Logs on funeral pyre | starts **49t** loc window |
| 80 | lit_pyre | Light pyre success | remains before light |
| 85 | complete | Ulsquire hand-in | after 80 |

Complete const: `^mortton_quest_complete = 85` (`quest.constant`).

---

## Three temple layers (do not collapse)

| Layer | What | Scope |
|-------|------|--------|
| **World loc** | Wall segs, Fire altar form (Broken / Fire / Flaming) | Shared map |
| **`%temple_sanctity` / `_p`** | Personal sanc; drain timer | **Player** — light/pour gates |
| **`%temple_repaired_p`** | Wall build % overlay | **Player** display / stage 60 |

| Gate | Needs |
|------|--------|
| Light Fire altar | `sanctity_p ≥ 10` (raw ≥ 300) + tinder + unlit/nofire form |
| Olive → sacred oil | flaming altar + raw ≥ 300 (mes 10%) |
| Serum 207(p) | raw ≥ 600 (mes 20%) |
| Broken → lightable altar form | world upgrade via **wall build** (`repaired_p` / try_build), not “fix altar” spam when sanc high |

**Misleading chat:** “allowed to light the holy fire altar” at stage **60** = walls done, **not** sanc ready.

---

## Anchors (host tele)

| Role | Tile | Notes |
|------|-----:|--------|
| Courtyard stand | **3505,3315** | Always tele here — never altar |
| Altar loc | **3506,3316** | `0_54_51_50_52` — unwalkable stand |
| Funeral pyre loc | **3465,3283** | m54_51 `0 9 19` temple_pyre |
| Pyre stand | **3466,3283** | adjacent |
| Loar field sample | **3474,3280** etc. | hunt when need remains; no tele-cycle |

---

## Product order (residual thrash)

### A. Rebuild (→60)

1. Soft entry ≤50 for honest continuous residual (soft 60+broken altar is invalid for complete residual).  
2. Mats: timber / limestone brick / swamp paste + hammer.  
3. Prefer **Repair** on **Broken wall** segs; sticky only while Repair/Broken.  
4. Do not sticky on finished Temple wall Reinforce-only (`repaired_p` stuck).  
5. Exit when stage ≥60 and walls full.

### B. Sacred oil (→65)

1. Earn sanc: reinforce until **≥10%** light / prefer **≥20%** pour thrash buffer.  
2. If altar **Broken**: wall Repair/reinforce until form upgrades — **not** light spam. Prefer **Broken wall** ops over Temple wall walk thrash.  
3. Light nofire → pour olive on **Flaming**.  
4. Remake oil later: same rules; **no** soft reseed sanc/`repaired_p` under bar §2.

### C. Pyre logs (→70)

1. Oil on logs (inv free enough — clear temple mats if needed).  
2. Do not soft give sacred oil / pyre logs under residual.

### D. Funeral pyre (→80) — **49 tick window**

| Order | Loc type | Action |
|-------|----------|--------|
| 1 | base **4093** | OPLOCU pyre logs → stage **75**, window starts |
| 2 | logs **4094–4099** | OPLOCU shade remains (only here) |
| 3 | bones+logs **4100** | Light (tinder / oploc1) → **80** |

| Must | Must not |
|------|----------|
| Remains ready **before** logs-on if possible | Remains on base 4093 (false ok:true) |
| Re-make logs if window clears | Soft setvar 80 |
| Walk while sticky; tele commute only | Tele every place tick (burns window) |
| Hunt Loar only when logs-stage + no remains | Hunt after remains click burned window |

### E. Complete (→85)

Ulsquire path after lit pyre (80). Product dialog / remains hand-in — thrash after 80.

---

## Bar §2 residual policy (toys)

| Allowed | Forbidden for residual PASS |
|---------|------------------------------|
| Soft **one** entry stage (e.g. FROM=65/75) labeled | Mid-path setvar quest stage |
| setstat / generic food / steel-adamant kit | give sacred oil / pyre logs / remains |
| Soft tele stands | Soft reseed sanc / repaired_p mid-path |
| Product remake oil at temple | Soft 85 setvar complete |

---

## Harness checklist — bounded residual (prefer FROM=75 TO=85)

```text
[ ] residualMode true (FROM set, not SOFT_THRASH=1)
[ ] stage entry labeled; inv: olive, tinder, mats, combat kit, free slots
[ ] sanc ≥10% before light; broken altar → wall Repair (Broken segs first)
[ ] oil → pyre logs → pyre stand 3466,3283
[ ] remains in inv OR hunt Loar before logs-on
[ ] logs-on → remains-on within 49t → light → stage ≥80
[ ] Ulsquire → stage ≥85
[ ] RESULT line + update this file if thrash taught new stand/order
```

**Bounded smoke (recommended next thrash):**

```bash
MORTTON_FROM=75 MORTTON_TO=85 SMOKE_MODE=thrash \
  node tools/harness/quest-mortton-smoke.mjs --max-ms 600000
# log: .tmp/mortton-residual-75-85.log
```

Continuous 50→85 is longer; do SEG residual first.

### RESULT 2026-08-09 evening — FAIL `mtnthrash1`

| Item | Detail |
|------|--------|
| Log | `.tmp/mortton-residual-75-85.log` |
| End | stage **75**, ticks=122, never left temple-oil remake |
| Hang | `walk-wall-broken-altar` / `wall-for-broken-altar` on **Temple wall** while **Broken Fire altar**; sanc already **23%/713** |
| Dirt | worn **Hooded cloak** (Castle Wars) — steal failed; wipe fix landed **after** this run (`c1c27bc`) |
| Dialog | `chat:368` open often during thrash (blocks ops) |

### Product fix 2026-08-09 (content) — broken altar un-break same tick

| Bug | `try_build_temple` checked `%temple_repaired_p = 100` **before** overlay recompute (queue next-tick). Soft entry / shade-break left **Broken Fire altar** with full walls → reinforce earned sanc but never upgraded altar. |
| Fix | `~recalc_temple_repaired_p` proc (same formula as overlay) called **before** altar fix in `try_build_temple`; overlay queue uses same proc. |
| File | `vendor/content/scripts/minigames/game_mortton/scripts/flamtaer_temple.rs2` |
| Prove | residual 75→85 after pack+engine restart — `.tmp/mortton-residual-75-85b.log` |

---

## Related research (depth)

| Doc | Role |
|-----|------|
| `flamtaer-pyre-loc-window-377.md` | 49t product + cleanup bugs |
| `docs/plans/2026-08-08-flamtaer-residual-bar2.md` | Fail account archaeology |
| `combat-floors-377.md` | Loar floor |
| Soft 85 DIRTY | `softpass.md` / deviations if claimed |

## Loar multi-aggro during wall rebuild (2026-08-09)

Sticky wall `p_oploc(3)` **dies under combat**. Soft entry stage 75 with Broken Fire altar
looks like “sanc crawls, altar stays Broken” when thrash tries to fight the field.

**Never try to kill-all Loar** — courtyard multi is 15–25 and re-aggros forever.

| Do | Don’t |
|----|--------|
| **Flee south** (`3505,3288`) until `inCombat` false | Attack Loar during rebuild thrash |
| Short **build windows** → courtyard wall Repair | residualGo courtyard while combat |
| Eat when HP low; top off lobster | Clear-to-zero field |
| Fail-fast if no build window / broken-altar stall | Burn full max-ms |

Harness: `templeOilAggroGate` + flee-then-build (`quest-mortton-smoke.mjs`).
