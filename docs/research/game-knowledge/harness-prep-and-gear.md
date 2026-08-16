# Harness prep & gear policy

**Date:** 2026-08-06  
**Audience:** agents writing `quest-*-smoke.mjs` and humans reviewing give/setstat.

## Short answer (bronze sword on Sigli)

There was **no good reason** for bronze sword + square shield with attack/strength **60**.

That was a **lazy minimal give** so the character had *something* to swing — not authentic, not optimal, and not aligned with Mort’ton/Horror which already seed **steel** + lobsters for combat floors in the same ballpark. It made Draugen (vislevel **69**) unnecessarily slow and failure-prone.

**Policy going forward:** match **gear tier to combat floor** (and **equip** it). See tables below.

---

## Rules

1. **Host prep is free (toys).** `setstat`, `give`, tele, world speed — allowed. Document in the smoke header. Give **the hop’s floor** (survive that hunt / wear that kit), **not** a listed overlay number. Kinds: [`../quest-stat-req-kinds-377.md`](../quest-stat-req-kinds-377.md) — start-hard / mid / boostable `stat(` vs unboostable `stat_base(` / combat-floor.
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
| OSF Use-on-door (Taverley dusty Gate) | ATK/STR/DEF **70** HP **99** | **adamant** scim + plate + legs + kite + shark×15 | **yes** | Poison spider vis **64**. Fresh mainland dies (`osfkdsucbgp4`). **PASS** `osfkdsucgkyh`. Soft `onesmallfavour 45` + store **16**. |
| OSF Sanfew unwind (Taverley L1) | none | none | n/a | Talk-only. Soft `onesmallfavour 31`. **PASS** `osfsustbnb3i`. |
| OSF Hammerspike return (mine) | none this hop | none | n/a | First Tip.it talk (changed mind). Soft `onesmallfavour 32`. **PASS** `osfhrstc1199`. Gang combat **later**. |
| OSF Bleemadge unwind (White Wolf) | ATK/STR/DEF **60** HP **80** | **steel** scim + plate + legs + lobster×8 | **yes** | Wolves unpack-complete. Prior FAIL `osfbustbfs12` death. Talk-only. |
| Mort’ton mid / Flamtaer residual Loar | ATK/STR **70** DEF **60** HP **80** | **adamant** scim + plate + legs + kite + lobster×20 | **yes** | Loar vis40 DEF26; multi-aggro thrash. steel@60 + food×6–8 stalled c18 hunt |
| Horror mid | ATK 60 STR 60 DEF 50 HP 70 | (see smoke) | check | Basalt / combat floor |
| TBWT | ATK/STR 50 + skill floors | quest vessels | n/a | Jogre 48 floor in comments |
| Eadgar mid | herblore/cooking/agility | quest mats | n/a | Little combat |
| Viking Manni/Swensen/Peer | none for combat | Manni kegs/bomb | n/a | No fight |
| Viking Sigli (pre-fix) | 60/60/50/50 | **bronze sword + sq + lobster×10** | **no** | **Wrong — fixed → steel kit + equip** |
| Viking Sigli (policy) | 60/60/50/50 HP≥50 | **adamant** scim + plate + legs + kite + lobster×20 | **yes** | Draugen vislevel **69**, melee def **100** — steel too slow (mid32 timeout) |
| Viking Thorvald/Koschei | 70/70/60/70 unarmed | **empty** after Peer bank; food only | n/a | `can_enter_thorvald_trial` bans weapon/armour cats. **Only soft weapon path:** `dramen_branch` + fletching `knife` → fletch **in pen** to staff (staff itself blocked at entry — `weapon_staff`). See `combat-floors-377.md` §Koschei |
| Viking Koschei form-detect | 70/70/60/70 unarmed | wipe + lobster×25 (no combat gear → skip Peer) | n/a | Dedicated `quest-viking-koschei-forms-smoke.mjs`. Eat 1–3; **stop food** on id **1293** / f3 chat (honour). Do not invent F1 watering. |
| DT village Eblis | HP **90** (bandit camp) | none | n/a | Soft `deserttreasure` 4/5/7. Tele **3181,2984** (W of curtain). Never **3185,2982** (tent-floor CLIP). Never 10. No take. |
| BAR Dondakan | HP **90** | none | n/a | Soft `fishingcompo 5` + `mcannon 11`. Tele **2824,10167**. Write **10** not **1**. Never 110. |
| HM Zealot | HP **90** (Mort Myre) | none | n/a | Tele **3443,3258**. No key. Pickpocket not this smoke. |
| RC sisters | HP **40** | none | n/a | Tele **3244,9868**. **0** write. No 2024 *'Ello*. |
| CF east-dock Teach | HP **90** | none | n/a | Soft `fever_quest 1`. Tele **3712,3496 L1**. Let's go no dest. |
| Garden Ellamaria | none | none | n/a | Tele **3227,3477**. No CoF/Farming gate this unit. |
| Ahoy Velorina | HP **90** | **Ghostspeak amulet** (wear) | **yes** | Tele **3678,3509**. Woo then wear. No Necrovarus. |
| FT1 Nuff busy | none | none | n/a | Soft `fairy_farmers_quest 6`. Tele **2390,4468**. Never 10. No symptoms IF. |
| Farming F1 potato grow | farming **1** | rake + dibber + spade + potato_seed×12 | n/a | Falador stand **3049,3307**; getvar **`farming_allotment_varp_1_0_7`** (not leftover `varbit_708`). REAL grow: `FARMING_F1_REAL_GROW=1` + `WORLD_SPEED_MS=20`. Lep **3053,3305** may wander (do not pin). |
| Viking Lalli stew | none | cabbage + potato + onion (generic) | n/a | Soft `viking` 6. Product rock from Askeladden; **do not** give fleece/wool. |
| Viking fleece spin | none | give `viking_golden_fleece` (stew already product) | n/a | Lumbridge wheel **3209,3213** L1. Rellekka wheel refuses if `viking` < 10. |
| Viking Sigmund merchant | none | coins **5000** (Askeladden) | n/a | Product full ask+reverse chain. Soft `viking` 7. Do not talk Brundt after vote (completes). |
| Viking Brundt complete | none | none | n/a | Soft `viking` 8 + bits 0. Do **not** `closeModal` — that dismisses `inter_238` **12140**. |
| Myreque swamp-boat IF | none | coins **50** | n/a | Soft `routequest` **20**. Stand **3522,3284** (not on loc **3523,3284**). Hollows boat **3498,3377**. Do not `getvar` while IF **11902** open. |
| Horror metaldoor | none | none | n/a | Soft `horrorquest` **2**. Stand **2514,4626** L1 (south of wall **2514,4627**). IF **10116**. |
| Viking mural | none | none | n/a | Stand **2634,3664** (not on mural **2634,3663**). IF **9929**. |
| Peer combo IF | none | none | n/a | Soft `viking_bits` **262144**. Stand **2630,3667** (outside door1). IF **10051**. |
| Yrsa shoestore | none | coins **500** | n/a | Soft `viking` **10**. Stand **2625,3674**. IF **9947**. |
| Flamtaer overlay | craft **20** | hammer + plank×4 + swamppaste×20 + limestone×4 | n/a | Soft `morttonquest` **50**. Courtyard **3505,3315**. Overlay **4959**. |
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
| Managing labour HARD | ATK 40 + WC 70 / mining 60 / fishing 50 | rune axe + rune pick + lobster pot | **yes** | maple/coal/rarefish intercepts; not flax |
| Managing kill −6 | ATK/STR **40** | `bronze_scimitar` | **yes** | Ragnar vislevel **1** HP **1**; stand **2517,3859** |
| Champions Lesser Demon | start ATK/STR **1** then boost **99** after slash | **none** (Larxus no weapons/armour) | n/a | overlay HP **1** · sample slash **2972** first · **PASS** `chldmsuyqn4j` |
| Regicide craft fuse | Crafting **10** | naphtha + sulphur + limestone + pot + pestle + wool×4 + leather gloves | **yes** gloves | no give fused; Al-Kharid furnace + Isafdar loom |
| Regicide still / still→fuse | Crafting **10** | tar + **coal×8** (unstackable) + sulphur + limestone + pot + pestle + wool×4 + gloves first | **yes** gloves | **Coal does not stack** (377 `[coal]` has no `stackable=`; ores never did). `give coal 20` fills inv. |

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

## First follower (2026-08-16)

Until Two Cats `t2c0svyejlu` we had **never** spawned a pet follower in a smoke. Prior cat work only **cleared** `%follower_obj` / `%follower_uid` (pick-a-kitten `kitn`) or opened name chrome (`15192`).

**Do this** (product Drop path — kitten is visible):

```text
giveItems([['kittenobject', 1]])   // pack 1555 · display Pet kitten · category=kitten
heldOp('Pet kitten', 5)            // [opheld5,_kitten] → ~cat_drop → ~cat_spawn
```

Live result: NPC **761** `Kitten` · `npc_say("Miaow!")` · `%follower_obj` + `%follower_uid` set by `pet.rs2`. Soft `give` is **toy**. The spawn + follow is the packed kitten hook.

**Do not** start with `setvar follower_obj 1555` if Drop works — that skips `~cat_spawn` and there is no cat on the tile. Fallback only if Drop fails. Hell kitten **7583** is **not** 377 pick-stock.

Reuse this for any later hop that gates on `oc_category(%follower_obj) = kitten|cat|overgrown` (Gertrude already uses that same test).

---

## Checklist for a new combat step

- [ ] Note NPC combat level / vislevel in `combat-floors-377.md`  
- [ ] setstat floor ≥ comfortable clear (not bare minimum that fails 50%)  
- [ ] give gear tier matching floor  
- [ ] equip loop after give  
- [ ] food count for expected hits  
- [ ] one line in this table when the smoke lands  
