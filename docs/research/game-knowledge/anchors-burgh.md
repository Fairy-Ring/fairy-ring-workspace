# Game-knowledge anchors — Burgh de Rott trek escorts (377)

**Date:** 2026-08-15  
**Use:** Harness tele **next to** Fyiona (or another escort), not on the NPC. Soft `setvar templetrek_main_var 1` is a **toy**.  
**Product stays 377.** Hunt 289? **no**. Docs only this file.

**Parents (cite — do not rewrite):** impl [`../residual-if-341-trek-start-377.md`](../residual-if-341-trek-start-377.md) · Burgh slice [`../temple-trekking-burgh-first-slice-377.md`](../temple-trekking-burgh-first-slice-377.md) · stand [`harness-tele-stand.md`](harness-tele-stand.md)

**Tag:** **VERIFIED** = headed **PASS** `tt341suu6876` or jm2 / unpack this session · **SOFT** = visibility bit.

---

## First look-at (341 smoke)

| | Tile | Note |
|--|------|------|
| **Fyiona Fray** | **3480,3241** L0 | child `templetrek_retired_soldier_easy` **3634** via multi **3633** |
| **Stand** | **3479,3241** L0 | west of NPC. Smoke also settled **3480,3242** (walk-in) |
| **Talk-to** | product | `if_openmain(choose_a_route)` **341** **PASS** `tt341suu6876` |
| **Visibility** | `%templetrek_main_var` bit **0** | **SOFT** toy. Default **0** = empty multi |

Do **not** stand on **3480,3241**. Do **not** steal `burgh_map` **18525** or `swamp_boatjourney` **11902**. Route dests **out**.

---

## Cluster (`m54_50`)

| Child (Talk-to) | Multi | World L0 | Display |
|-----------------|------:|----------|---------|
| `_child_hard` | **3623** | **3475,3235** | Smiddi Ryak |
| `_oldman_hard` | **3625** | **3476,3235** | Rolayne Twickit |
| `_woman_med` | **3627** | **3479,3237** | Jayene Kliyn |
| `_man_med` | **3629** | **3480,3237** | Valantay Eppel |
| `_retired_soldier_easy` | **3633** | **3480,3241** | **Fyiona Fray** |
| `_retired_man_easy` | **3631** | **3481,3241** | Dalcian Fang |

Easy/med/hard is **pack suffix** only. Bind concretes, **not** the six `templetrek_multi_*`.

**OUT:** Dean Vellio (**2011**) · trek sign (**24 Apr 2007**) · Hiylik (**13 Mar 2007**) · Elisabeta **3490,3241** · Cyreg **3522,3284** · Paterdomus start (UNKNOWN).
