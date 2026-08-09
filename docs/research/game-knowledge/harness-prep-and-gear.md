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

Prefer **steel scimitar + plate** as the default mid-gate kit unless the NPC is clearly harder.

---

## Current smoke inventory (2026-08-06)

| Smoke | setstat combat | Gear given | Equip? | Notes |
|-------|----------------|------------|:------:|-------|
| Mort’ton mid | ATK/STR/DEF ~ high enough for Loar | steel scim + platebody + platelegs + lobster×20 | **yes** | Template for melee mid |
| Horror mid | ATK 60 STR 60 DEF 50 HP 70 | (see smoke) | check | Basalt / combat floor |
| TBWT | ATK/STR 50 + skill floors | quest vessels | n/a | Jogre 48 floor in comments |
| Eadgar mid | herblore/cooking/agility | quest mats | n/a | Little combat |
| Viking Manni/Swensen/Peer | none for combat | Manni kegs/bomb | n/a | No fight |
| Viking Sigli (pre-fix) | 60/60/50/50 | **bronze sword + sq + lobster×10** | **no** | **Wrong — fixed → steel kit + equip** |
| Viking Sigli (policy) | 60/60/50/50 HP≥50 | **adamant** scim + plate + legs + kite + lobster×20 | **yes** | Draugen vislevel **69**, melee def **100** — steel too slow (mid32 timeout) |
| Viking Thorvald/Koschei | 70/70/60/70 unarmed | **empty** after Peer bank; food only | n/a | `can_enter_thorvald_trial` bans weapon/armour cats. **Only soft weapon path:** `dramen_branch` + fletching `knife` → fletch **in pen** to staff (staff itself blocked at entry — `weapon_staff`). See `combat-floors-377.md` §Koschei |
| Myreque hellhound ≥85 | 80/80/70/85 | **adamant** scim + platebody + platelegs + kite + lobster×20 | **yes** | vislevel **97**; DEF **100** crush (289 port); soft `MYREQUE_FROM=80` |

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
