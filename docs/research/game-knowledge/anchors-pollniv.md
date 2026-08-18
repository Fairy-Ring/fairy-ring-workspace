# Game-knowledge anchors — Pollnivneach / The Feud (377)

**Date:** 2026-08-17  
**Use:** Harness tele **next to** the face, **not** on the NPC. Soft `teleTo` is commute.  
**Product stays 377.** Hunt 289? **no**.

**Parents (cite — do not rewrite):** jm2 pins [`../feud-first-slice-377.md`](../feud-first-slice-377.md) · stand [`harness-tele-stand.md`](harness-tele-stand.md) · PASSed stands [`../softpass.md`](../softpass.md) · opener [`../../context/copy-agent-opener-377.md`](../../context/copy-agent-opener-377.md)

World: `m51_50` origin **3264, 3200** (Ali M only). `m52_46` origin **3328, 2944** (town). `world = mx×64 + local`. NPC section only.

**Tag:** **VERIFIED** = headed PASS · **jm2** = our `==== NPC ====` pin + loc-free cardinal.

---

## Stands

| Face | Pack | id | NPC tile | Smoke stand (next-to) | Source |
|------|------|---:|----------|-----------------------|--------|
| Ali Morrisane | `feud_ali_m` | **1862** | **3304,3211** L0 Al Kharid (`m51_50` `0 40 11`) | **3305,3211** E | jm2 + **PASS** `feud0svwntz3` |
| Drunken Ali | `feud_drunken_ali` | **1863** | **3360,2957** L0 (`m52_46` `0 32 13`) | **3359,2957** W | jm2 + **PASS** `feuddsxs4bod` |
| Ali The barman | `feud_ali_the_barman` | **1864** | **3361,2955** (`0 33 11`) | **3360,2955** W | jm2 (beer icon **2764** on NPC) |
| Ali the Kebab seller | `feud_kebabman` | **1865** | **3352,2974** (`0 24 30`) | **3353,2974** E | jm2 (W is `desertwall` **1415**) |
| Ali the Camel Man | `feud_ali_the_discount_camel_seller` | **1867** | **3350,2967** (`0 22 23`) | **3349,2967** W | jm2 + **PASS** `feudcsxsjvn4` |
| Street urchin | `feud_street_urchin` | **1868** | **3352,2958** (`0 24 14`) | **3351,2958** W | jm2 · **not** E **3353,2958** (`feud_outsidestairs_base` **6242**) |
| Street urchin | `feud_street_urchin` | **1868** | **3355,2972** (`0 27 28`) | **3355,2971** S | jm2 (NPC on `desertwall`) |
| Street urchin | `feud_street_urchin` | **1868** | **3364,2980** (`0 36 36`) | **3365,2980** E | jm2 |
| Ali the Mayor | `feud_mayor` → `feud_mayor_geom` | **1869** / **1870** | **3360,2970** (`0 32 26`) | **3361,2970** E | jm2 (1870 **0** static) |
| Ali the Hag | `feud_hag` | **1871** | **3346,2987** (`0 18 43`) | **3345,2987** W | jm2 |
| Ali the Snake Charmer | `feud_snakecharmer` | **1872** | **3354,2953** (`0 26 9`) | **3354,2954** N | jm2 + **PASS** `feudssy15w7t` (bowl **6230** @ **3355,2953**) |
| Bandit | `feud_arabian_guard2_multi` vis **41** | **1882** (concretes **1883** / **1884**) | **3356,2994** (`0 28 50`) | **3355,2994** W | jm2 + gangs **PASS** `feudgsxsdgq3` (host tele’d **on** NPC — do **not** copy) |
| Cowardly Bandit | `feud_arabian_guard_coward` | **1886** | **3359,3000** (`0 31 56`) | **3358,2998** S of rug | jm2 (NPC on `feud_rugcorner_red` **6251**; E/S `desertwall`) |
| Ali the Operator | `feud_egyptian_minder` | **1902** | **3334,2949** (`0 6 5`) | **3333,2949** W | jm2 |
| Menaphite Thug | `feud_egyptian_doorman_multi` vis **55** | **1903** (concretes **1904** / **1905**) | **3333,2952** (`0 5 8`) first pin | **3333,2951** S | jm2 + gangs **PASS** `feudgsxsdgq3` (host tele’d **3346,2954** = another **1903** pin — do **not** copy on-NPC) |

**Do not stand on** the NPC tile. Camel E **3351,2967** is `feud_bird_cage_table` **6265**. Drunken S **3360,2956** is `table` **602**. Operator S **3334,2948** is `egypt_chair` **1110**.

---

## Thug cluster (`1903` ×10)

`m52_46` NPC only. First pin is the smoke face.

| jm2 | World L0 |
|-----|----------|
| `0 5 8` | **3333,2952** |
| `0 10 2` | **3338,2946** |
| `0 10 6` | **3338,2950** |
| `0 14 14` | **3342,2958** |
| `0 16 6` | **3344,2950** |
| `0 18 1` | **3346,2945** |
| `0 18 10` | **3346,2954** |
| `0 19 17` | **3347,2961** |
| `0 23 17` | **3351,2961** |
| `0 24 7` | **3352,2951** |

---

## Not dest (this file)

Stairs / ladders / dung dests are **not** this table. Leftover `[oploc1,feud_*stairs_*]` fires `@unhandled_stairs` only (**0** `p_tele*`). Ladders **6260/6261** have **0** leftover dest. Dung locs **6257–6259** have **0** jm2. `feud_bjseller` **2548** has **0** NPC rows — **0** stand.

*Research only. Product stays 377. Hunt 289? no.*
