# Harness prep & gear policy

**Date:** 2026-08-06  
**Audience:** agents writing `quest-*-smoke.mjs` and humans reviewing give/setstat.

## Short answer (bronze sword on Sigli)

There was **no good reason** for bronze sword + square shield with attack/strength **60**.

That was a **lazy minimal give** so the character had *something* to swing — not authentic, not optimal, and not aligned with Mort’ton/Horror which already seed **steel** + lobsters for combat floors in the same ballpark. It made Draugen (vislevel **69**) unnecessarily slow and failure-prone.

**Policy going forward:** match **gear tier to combat floor** (and **equip** it). See tables below.

---

## Rules

1. **Host prep is free (toys).** `setstat`, `give`, tele, world speed — allowed. Document in the smoke header.
2. **Prep is not proof.** Still walk authentic quest ops (talk, use-on, portal hops). Do not `setvar` vote progress to skip fights unless the plan explicitly marks a soft gate.
3. **Gear matches setstat.**
   - Combat ~40–50 → steel full / scim + plate + food  
   - Combat ~60–70 → steel or **mithril/adamant** + more food  
   - Boss / multi-aggro (shades, dagannoth later) → err high (steel min; adamant ok for smoke)
4. **Always equip** after give (`actions.equip` / Wear/Wield). Items left in inv do not help.
5. **Food scales with risk.** 10 lobsters is thin for multi-aggro; Mort’ton uses 20.
6. **Quest-req items stay authentic.** Karambwan vessel, diary, serum mats, etc. are not “upgraded.”
7. **Name gear in pack debugnames** (`steel_scimitar`, not display strings) for `give`. Equip may use display names (`Steel scimitar`).

---

## Tier cheatsheet (era-correct metals, smoke-friendly)

| Tier | Typical setstat ATK/STR | Give (debugname) | Equip (display) |
|------|------------------------:|------------------|-----------------|
| Bronze | 1–20 | avoid for mid quests | — |
| Steel | 40–60 | scim, platebody, platelegs, kiteshield, med/full helm, lobster×15–25 | Steel * |
| Mithril | 50–70 | same pattern | Mithril * |
| Adamant | 60–75+ | same pattern | Adamant * |
| Rune | 70–85 | `rune_scimitar` + plate set | Rune * |
| **Flair high floor** | 85–99 | **`dragon_scimitar`** + **`rune_*_goldplate`** (gilded) + shark | Dragon scim / Gilded * |
| Barrows (tank thrash) | 70+ | when combat params injected | not for DPS yet |

Prefer **steel scimitar + plate** as the default mid-gate kit unless the NPC is clearly harder.  
**High setstat ⇒ match gear** (do not seed adamant with ATK 90). Gilded = rune def after param inject (`gear-trail-gilded-params-377.md`).

---

## Current smoke inventory (2026-08-06)

| Smoke | setstat combat | Gear given | Equip? | Notes |
|-------|----------------|------------|:------:|-------|
| Mort’ton mid / Flamtaer residual Loar | ATK/STR **70** DEF **60** HP **80** | **adamant** scim + plate + legs + kite + lobster×20 | **yes** | Loar vis40 DEF26; multi-aggro thrash. steel@60 + food×6–8 stalled c18 hunt |
| Horror mid | ATK 60 STR 60 DEF 50 HP 70 | (see smoke) | check | Basalt / combat floor |
| TBWT | ATK/STR 50 + skill floors | quest vessels | n/a | Jogre 48 floor in comments |
| Eadgar mid | herblore/cooking/agility | quest mats | n/a | Little combat |
| Viking Manni/Swensen/Peer | none for combat | Manni kegs/bomb | n/a | No fight |
| Viking Sigli (pre-fix) | 60/60/50/50 | **bronze sword + sq + lobster×10** | **no** | **Wrong — fixed → steel kit + equip** |
| Viking Sigli (policy) | 60/60/50/50 HP≥50 | **adamant** scim + plate + legs + kite + lobster×20 | **yes** | Draugen vislevel **69**, melee def **100** — steel too slow (mid32 timeout) |
| Viking Thorvald/Koschei | 70/70/60/70 unarmed | **empty** after Peer bank; food only | n/a | `can_enter_thorvald_trial` bans weapon/armour cats. **Only soft weapon path:** `dramen_branch` + fletching `knife` → fletch **in pen** to staff (staff itself blocked at entry — `weapon_staff`). See `combat-floors-377.md` §Koschei |
| Myreque hellhound ≥85 | 80/80/70/85 | **adamant** scim + platebody + platelegs + kite + lobster×20 | **yes** | vislevel **97**; DEF **100** crush (289 port); soft `MYREQUE_FROM=80` |
| Regicide Tyras guard ≥9 | 90/90/80/90 | **d scim + full gilded** + shark×12 | **yes** | soft `mm_main 10` + `dragonquest 10`; product death write; soft ~npc once |
| Regicide camp enter ≥10 | agi **56** | none combat | n/a | stand **2188,3168** only — see anchors-isafdar |
| MM start ≥1 | none | none | n/a | soft GT 160 + treequest 9; tele Narnode **2466,3497** |
| MM shipyard seal ≥2 | none | soft give `mm_gnome_royal_seal` | n/a | soft `mm_main 1`; stand **2943,3040**; do not close chat mid-seal — [`anchors-karamja-shipyard.md`](anchors-karamja-shipyard.md) |
| MM hangar leave ≥5 | none | none | n/a | soft `mm_daero 3`; Leave at Daero GT; hangar **missingModels** residual OK for stage |
| MM reinit ≥6 | none | none | n/a | soft `mm_daero 5` only; **never** soft `mm_hangar_puzzle_complete 1` before open (nearly-solved branch) — [`mm-hangar-reinit-377.md`](../mm-hangar-reinit-377.md) |
| MM Daero complete ≥7 | none | none | n/a | soft `mm_daero 6`; tele final hangar **2648,4514** |
| MM Waydar fly Crash Island | none | none | n/a | soft `mm_daero 7`; tele hangar; Yes fly → **2893,2725** |
| MM Waydar crash intro (next) | none | none | n/a | soft daero7 + tele crash; product Talk Waydar → `mm_waydar=1` — [`mm-crash-island-ch2-377.md`](../mm-crash-island-ch2-377.md) |
| MM Lumdo ≥2 (next) | none | soft give `mm_gnome_royal_seal` | n/a | soft waydar1; tele Lumdo **2891,2724** |
| MM ch2 → main≥3 | none | seal optional | n/a | soft lumdo2; Talk Waydar Lumdo-order path; cutscene NPC names **mm_cutscene_*** |
| MM Garkor intro ≥2 | none | none | n/a | soft `mm_main 3`; tele **2805,2762**; product Talk → `mm_garkor=2` |
| MM Zooknock ≥5 (tunnel) | **90/90/85/99** + pray 43 | **rune scim+plate+kite** + lobster×10; equip | **yes** | soft garkor2 + **`dragonquest 10`** (rune plate); stand **2804,9144** (NPC **2804,9145** m43_142); not m43_143 LOC wall |
| MM Zooknock hand-in (greegree) | same as tunnel | + soft give: `gold_bar`, `mm_monkey_dentures`, `mm_monkey_amulet_mould` (UI **M'amulet mould**), `mm_monkey_talisman`, `mm_normal_monkey_bones` | **yes** | product OPNPCU only; **wait** chat + `p_delay(4)` before next use-on (else inv_del without greegree); mould needle = `amulet mould` not `monkey amulet mould` |
| MM Garkor greegree ≥4 | none | soft give `mm_monkey_greegree_for_normal_monkey` (Karamjan only) | **yes** Hold iop2 | soft garkor2; tele **2805,2762**; product Hold+Talk → `seek_alliance`; wrong greegree type → need_correct_disguise only |
| MM temple M'speak | none | soft `mm_enchanted_gold_bar` + `mm_monkey_amulet_mould` + `ball_of_wool` | n/a | tele **2810,9191 L0** (not L1); product OPLOCU bar→Wall of flame + string; UI **M'speak amulet** |

---

## Equip gates (smoke seed — label soft quest vars)

Wield/Wear often needs **level + quest**. `give` alone does not equip.

| Item (debugname) | Level | Quest / var (soft) | Notes |
|------------------|------:|--------------------|-------|
| `dragon_scimitar` | ATK 60 | `%mm_main ≥ 10` (`^mm_complete`) | `tier60` `levelrequire_mm_quest_attack` |
| `rune_platebody` / `_gold` / `_goldplate` / god plates | DEF 40 | `%dragonquest ≥ 10` (`^dragon_complete`) | platebody only; legs/helm/kite DEF only |
| Other gilded (`rune_*_goldplate`) | DEF 40 | — | params inject 2026-08-09 — `gear-trail-gilded-params-377.md` |
| Barrows weapons/armour | 70 ATK/STR/DEF | — | **params thin on 377** — do not seed for DPS yet |
| Plain rune scim / plate | ATK/DEF 40 | platebody DS | safe mid-high floor kit |

**Policy:** high setstat ⇒ match gear tier (not adamant @ 90). Flair (gilded + d scim) is fine if equip gates are soft-labeled.

---

## Why not “max gear always”?

- Keeps smokes somewhat realistic for debugging damage/ticks.  
- Still **toys**: if a fight is flaky, **raise tier** (adamant) rather than inventing soft-pass content.  
- Never use gear as an excuse to skip authentic steps.

---

## Checklist for a new combat step

- [ ] Note NPC combat level / vislevel in `combat-floors-377.md`  
- [ ] setstat floor ≥ comfortable clear (not bare minimum that fails 50%)  
- [ ] give gear tier matching floor  
- [ ] equip loop after give  
- [ ] food count for expected hits  
- [ ] one line in this table when the smoke lands  
