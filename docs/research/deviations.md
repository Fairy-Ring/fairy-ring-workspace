# Authenticity deviations log

Record **intentional** differences from historical May 2006 / cache truth.

| Date | Area | Deviation | Why | Owner |
|------|------|-----------|-----|-------|
| 2026-08-03 | Ports | WEB **81**, GAME **43595** (not stock 80/43594) | Isolation from live 274; Java client requires WEB=`80+offset`, GAME=`43594+offset` with same offset | ops |
| 2026-08-03 | Ports | Was briefly WEB **8891** (wrong) | Broke CRC; fixed back to **81** | ops |
| 2026-08-04 | Content / skill guide IF | Pack root **18800** (`skill_guide` + comps 18801–18951), not 274’s **8714** | On 377 pack, **8714=`inter_183`** (occupied). No named skill_guide IF in `_unpack/377`. Free range after TBWT scroll (same strategy as `questscroll_tbwt`). **Behaviour** from 274; **id** is content-local invent. Full audit: `docs/research/skill-guide-377-id-audit.md` | agent |
| 2026-08-04 | Content / skill guide varp | First landing **730–731**; **remapped to 333–334** (= 274 ids) | Temp varps; 377 placeholders `varp_333`/`varp_334` were free — dual-branch alignment | agent |
| 2026-08-04 | Content / skill guide | Stats pack **names** `stats:com_68`… → `stats:attack`… on **same ids 8654–8672** | Not a client-id invent — LC symbol names for `if_button` (matches 274). Numeric ids unchanged | agent |
| 2026-08-04 | Engine | `stat_enabled` / `STAT_ENABLED=10010` | LC extension so content can read `PlayerStatEnabled` (gate skill guides like Jagex “UI present / skill not live”) | agent |
| 2026-08-04 | Content / skill guide | Guide **unlock text** is 274/early stock | May 2006 era refresh still TODO; open/wire works | agent |
| 2026-08-05 | Nav / Horror bridge | Pack + live open L0 **2597,3608** (bridge gap) so PathFinder can step west↔east | Static lcnav ignores LocType multiloc (op 77); peninsula otherwise sealed. **Not** authentic free cross without repair — quest still needs both plank `oplocu`. Full write-up: `docs/research/nav-multiloc-collision.md` | agent |
| 2026-08-05 | Harness / Mort’ton smoke `mtnsgrgevp` | **One-time soft PASS to 50** used `give shade_bones1×5` after real kills (no ground-take ABI) | Test thrash — **not** a preservation proof. Seed **removed**. Superseded by authentic **`mtnsgsppgf`** via harness ground Take (Loar remains) | agent |
| 2026-08-05 | Harness / Mort’ton | Host prep: setstat combat floor, free steel/food, one start tele to Ulsquire | Prep only (same class as TBWT/Horror); path after that is real brew/Talk/Attack | agent |
| 2026-08-06 | Content / Viking Swensen | Maze exit queues `complete_swensen_trial` whenever `swensen_started` (not only if Swensen in npc_find 5) | 274 gated queue on NPC proximity; wander mid-maze soft-locked vote. Dialog still prefers NPC nearby. Double-count guarded | agent |
| 2026-08-07 | Content / macro events | ~~Koschei pen ban~~ **reverted** | Pen is **not** an instance (shared `2_41_157`). Randoms-in-instances is a separate rule. See research notes when present | agent |
| 2026-08-07 | Harness / Slayer S0b | Soft `setvar` clear + re-roll if Turael assigns non-soft task (lizards, etc.) | Special-finish monsters not S0 mid-gate; **S0a assign** is enable proof | agent |
| 2026-08-07 | Harness / Regicide start | Soft `setvar upass 10` + `regicide_quest 1` then real Lathas Talk → 2 | UP XL not Wave-1A blocker; messenger soft-seeded | agent |
| 2026-08-07 | Harness / Myreque start | Soft `setvar druidspirit 110` then real Vanstrom multi at **3503,3477** | NS soft dep; spawn is map product not npcadd | agent |
| 2026-08-07 | Harness / MM greegree | Soft give greegree + tele Ape **2755,2795** + tele Lumby leave | Product Hold + zone timer unequip; not full MM | agent |
| 2026-08-07 | Harness / Regicide mid | Soft `regicide_quest 3` (scouts) then product Iorwerth ≥4 | **Superseded** same day: product Idris path default; `REGICIDE_SKIP_IDRIS=1` keeps soft-3 | agent |
| 2026-08-07 | Harness / Regicide Idris | Soft stage **2** (mid-only) + tele **2312,3216** then product timer ambush → 3 | Authentic well entry residual; tele is labeled SOFT | agent |
| 2026-08-07 | Harness / Myreque mid | Soft steel weapons + pouch×5 + plank×3 + coins; soft stage 5 mid-only | Product Cyreg ≥15, planks ≥20, boat ≥25, palm ≥52, Curpile ≥55 | agent |
| 2026-08-07 | Content / Myreque boat | `travel_to_hollow` / hollows return tele-stub (no swamp_boatjourney IF) | IF pack residual; stage 25 still product Board/Pay path | agent |
| 2026-08-07 | Content / Curpile knockout | Delay + tele Mort’ton (no `~fade_out`/`fade_in`) | 377 tree lacks shared fade procs; product quiz stage write still authentic | agent |
| 2026-08-07 | Content / Myreque cutscene | ~~stub~~ **superseded 2026-08-08** — full cutscene ported; `chatnc_cutscene`→`chatnpc_specific`; Vanstrom NPC renames | 289 cutscene API not on 377; pack names differ | agent |
| 2026-08-08 | Harness / Myreque cutscene | Soft stage 65 + bits 31 + weapons seed; product handoff+cutscene ≥80 | Member intros product residual if proving bits | agent |
| 2026-08-08 | Harness / Myreque hellhound | Soft stage **80** + setstat/adamant/lobster; product kill → **85** (`myrsjw9quo`). Combat stats ported from 289 (unpack visual-only) | Soft ambush skips cutscene spawn; stalagmite re-summon is product | agent |
| 2026-08-08 | Harness / Myreque exit 90 | Soft stage **85**; product Veliaf multi “How do I get out of here?” → **90** (`myrsjwreex`) | Soft skips hellhound | agent |
| 2026-08-08 | Harness / Myreque wall+ladder | Soft stage **90**; product false wall **95** + ladder **97** (`myrsjwug1p`) | Soft skips exit dialogue | agent |
| 2026-08-08 | Harness / Myreque complete | Soft stage **97**; product Stranger → **105** | Soft skips wall/ladder path; first look headless — re-prove **headed** | agent |
| 2026-08-08 | Harness / Regicide tracker | Soft stage **4** + upass 10; product Elf Tracker → **5** (`regsjx7j6s` headed); pendant chain → **6** (`regsjx9ma2` headed) | Soft skips Idris/Iorwerth path to 4; zones/traps residual | agent |
| 2026-08-08 | Harness / Regicide footprints | Soft stage **6**; product Tracks Follow → **7** + tracker tips → **8** (`regsjyauc4` headed) | Soft skips walk traps; zones/traps ported but not walk-proved | agent |
| 2026-08-08 | Harness / Eadgar storeroom | Soft stage **90**; product drawers key + door → **100** (`edgsjyjl07` headed) | Soft skips scarecrow/potion chain; drawer/door product re-merge from 274 | agent |
| 2026-08-08 | Harness / Eadgar complete | Soft stage **100**; product crate goutweed + Sanfew → **110** (`edgsjz5jmm` headed) | Soft skips 50→90 chain; product take + turn-in only | agent |
| 2026-08-08 | Harness / Flamtaer ≥55 | Soft stage **50** + hammer/plank/brick/paste give; product first wall → **55** (`mtnskbodgr` headed) | Soft skips diary→shades→50 path; 28-slot kit order fixed | agent |
| 2026-08-08 | Harness / Flamtaer ≥60 | Soft stage **50** + mats/setstat; **product** rebuild → **60** `repaired_p=100` (`mtnskdlhaz`, 480 ticks) | Soft entry only; wall params + Razmire timer + thrash are product/host — not setvar 60 | agent |
| 2026-08-08 | Harness / Flamtaer ≥65 | Soft 60 + sanctity + oliveoil; product light+oil → **65** (`mtnskf4dk5` clean) | Soft entry; oil params required | agent |
| 2026-08-08 | Harness / Mort’ton **85** | Soft 65 + sacred oil/logs/remains; **SOFT** `logs_pyre`+setvar 70 (OPHELDU oil-on-logs dead); multi bits + serum for Ulsquire; product complete queue → **85** (`mtnskk40m2`) | Not authentic full path; **superseded for stage 70** same day | agent |
| 2026-08-08 | Content / fletching cut_logs | Port 274 sacred-oil default on `[opheldu,_category_22]` → `@create_sacred_logs` | Target cat matches before use-cat `sacred_oil`; without this oil-on-logs never hits mortton_pyre | agent |
| 2026-08-08 | Harness / Flamtaer ≥70 | Soft entry 65 + oil/logs give; **product** oil-on-logs → **70** (and 75 same run) `mtnskkp7gc` | No soft setvar 70 | agent |
| 2026-08-08 | Harness / Flamtaer ≥85 product residual | Soft 65 + oil/logs/remains + multi; **product** 70→85 (`mtnskks5ry`, 6 ticks) | Not hard 0→85; no soft 70; scroll IF modal residual | agent |
| *(template)* | feature | Used OSRS source X for Y | No period primary; cite early/2007-base if possible | |

Template for new rows:

```text
| YYYY-MM-DD | subsystem | what changed | reason | agent/human |
```

If a “bug” is preserved for authenticity, note that under **research**, not here.

**Run / account / PASS-claim dirt** (HARD vs soft-entry vs retracted): tracked in the full research corpus when present (`historical-run-dirt-inventory.md` on private trees). Not every soft row is repeated here.

## Farming F1 potato (2026-08-07)

| Item | Status |
|------|--------|
| Growth stage interval | **CANDIDATE** 1000 ticks (~10 min @ 0.6s) × 4 = 40 min total — OSRS/Tip.it-aligned; **not** period-primary (`farming.constant` `^farming_potato_stage_ticks`) |
| Plant/harvest XP | **CANDIDATE** 8 / 9 (tenths 80/90) — community |
| Soft smoke | Soft fullygrown only (`setvar varbit_708 10`); **product** rake 0→3 + plant; stand **beside** patch not on loc (`f1psjiov7d`) |
| Multi-life harvest (indices 10–12) | **F1 stub** — one potato then clear to weeded |
| Watering / disease / compost / farmer pay | Not implemented |
| Client skill name for farming index | Shows `-unused-` on harness reader — pack/UI residual, not F1 block |

Product scripts: `vendor/content/scripts/skill_farming/scripts/farming_potato.rs2`. Engine `PlayerStatEnabled[19]=true`.
