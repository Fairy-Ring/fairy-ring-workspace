# Syntax

> **RuneScript manual** (Fairy Ring / rev 377) · [Index](README.md) · [Living notes](living-notes.md)

## 4. Syntax (from first principles)

### 4.1 Comments and blocks

```text
// line comment

[opnpc1,king_lathas]
// body until next top-level [header]
~chatnpc("<p,neutral>Hello.");
return;
```

A **script unit** starts with a header in square brackets. One file may contain many units.

### 4.2 Headers (script kinds)

| Header form | Meaning |
|-------------|---------|
| `[proc,name]` | Callable procedure — `~name` / `~name(args)` **returns** |
| `[label,name]` | Jump target — `@name` / `@name(args)` **does not return** |
| `[opnpc1,type]` | Player op1 on NPC **type** |
| `[opnpc1,_category]` | Player op1 on any NPC with that **category** (`_` prefix) |
| `[oploc1,…]` / `[oplocu,…]` | Loc ops / use-item-on-loc |
| `[opheld1…5,…]` / `[opheldu,…]` | Inventory held ops / use-on |
| `[opobj…]` | Ground object ops |
| `[if_button,root:comp]` | Interface button |
| `[inv_button1,inv:comp]` | Inventory button (e.g. worn unequip) |
| `[timer,name]` | Player timer body |
| `[softtimer,name]` | Soft timer (can run while busy) |
| `[queue,name]` | Queued script body |
| `[login,_]` / `[logout,_]` | Login / logout |
| `[mapzone,0_mx_mz]` / `[zone,…]` | Enter map square / fine zone |
| `[mapzoneexit,…]` / `[zoneexit,…]` | Leave |
| `[advancestat,attack]` | On level-up for that skill |
| `[walktrigger,…]` | Walk trigger |
| `[command,name](args)(rets)` | **Only** in `engine.rs2` — declares an opcode |
| `[debugproc,name]` | Staff/debug entry |

**Type beats category beats global** (`ScriptProvider.getByTrigger`):  
exact type trigger → else category → else global (`_`).

### 4.3 Multi-header bind (footgun)

You may see:

```text
[oplocu,patch_a][oplocu,patch_b]
@rake_label;
```

On this compiler/runtime, **only the last header** reliably binds that body. **Correct:**

```text
[oplocu,patch_a] @rake_label;
[oplocu,patch_b] @rake_label;

[label,rake_label]
// shared body
```

(Farming F1 rake lesson, 2026-08-07.)

### 4.4 Calls and jumps

| Syntax | Semantics |
|--------|-----------|
| `~proc` / `~proc(a, b)` | Call proc; resume after it returns |
| `@label` / `@label(a)` | Jump; **no** return |
| `return;` / `return(value);` | Leave current unit (and return value from proc) |

Proc **signatures must match** call sites (arg count and types). Shared helpers (`~send_quest_complete`, `~chatnpc`, …) differ between 274 and 377 — **diff the target tree**.

### 4.5 Locals, constants, varps

| Form | Scope |
|------|--------|
| `def_int $x` / `def_obj $o` / `def_coord $c` / … | Local (must `def_` before use) |
| `^regicide_spoken_lathas` | Compile-time constant from `.constant` |
| `%regicide_quest` | Player **varp** (progress, flags, …) |
| `coord` | Active player coord (in player scripts) |
| `uid` | Active player uid |
| `last_slot` / `last_useitem` / `last_useslot` | Set by engine for held/use-with ops |

```text
def_int $n = inv_total(inv, bronze_bar);
if ($n < 1) {
    mes("You need a bronze bar.");
    return;
}
```

### 4.6 Control flow

```text
if (cond) {
    ...
} else if (cond2) {
    ...
} else {
    ...
}

switch_int(%regicide_quest) {
    case ^regicide_received_message :
        ...
    case ^regicide_spoken_lathas, ^regicide_spoken_scouts :
        ...
    case default :
        ...
}

while ($i < 10) {
    $i = add($i, 1);
}
```

**Comparisons** use `=`, `!`, `<`, `>`, `<=`, `>=`.  
**Logic** uses `&` (and) `|` (or). Parenthesize freely.

Booleans: `^true` / `^false` (see `engine.constant`). Prefer `= true` / `= ^true` as content already does.

**Arithmetic** is mostly via commands, not infix:

```text
$x = add($a, $b);
$y = sub($a, $b);
$z = calc(100 - $a);   // expression form where supported
```

### 4.7 Strings

```text
mes("You clear the weeds.");
~chatnpc("<p,neutral>Hello, <displayname()>.");
~chatnpc("<p,neutral>Line one.|Line two.");   // | = soft break in many chat helpers
```

| In file | Meaning |
|---------|---------|
| `"…"` | String literal |
| `\|` in chat | Soft line break (common) |
| `\\n` (two backslashes + `n`) | Real newline inside quest-complete titles etc. |
| Single `\n` | **Syntax error** |
| `\'` | Apostrophe inside some strings |

Chat colour / emotion tags: `"<p,neutral>…"`, `"<p,angry>…"`, etc. (shared chat procs).

### 4.8 Coords

Literal form: **`level_mapX_mapZ_localX_localZ`**

```text
0_50_50_20_20     // Lumbridge-ish: level 0, mapsquare (50,50), local (20,20)
// world X = mapX*64 + localX  →  50*64+20 = 3220
// world Z = mapZ*64 + localZ
```

Helpers:

```text
coord                 // active player
movecoord($c, dx, dy, dz)
coordx($c) / coordz($c) / coordy($c)   // y = level
inzone($from, $to, $pos)
```

Map NPCs: engine `n{mx}_{mz}` packs place static spawns (e.g. Lord Iorwerth **2205,3252** on n34_50).

---
