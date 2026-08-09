# Runbook — thin live harness (not the client)

**Boundary:** bot/harness is a **separate client product**, not a patch of pure Client-TS.  
See `docs/decisions/004-client-bot-harness-boundary.md`.

> ## Default: run headed
>
> **Harness smokes and scripts open a visible Chromium window by default.**  
> Watch the client while iterating content/scripts — headless is opt-in only.
>
> ```bash
> node tools/harness/script/run.mjs tutorial          # headed (default)
> node tools/harness/login-walk-smoke.mjs             # headed (default)
> HEADLESS=1 node tools/harness/login-walk-smoke.mjs  # headless when needed
> ```
>
> Agents: prefer headed harness runs unless the user asks for headless/CI.

## Process kill safety (mandatory for agents)

Multiple agents may run **274 Server**, **rs2b0t desktop**, and **this r377 tree** at once.

| Do | Do not |
|----|--------|
| `bash scripts/kill-harness-smoke.sh` | `pkill -f playwright` / `pkill -f playwright-harness-profile` |
| Match **absolute path** under `RS2_R377_ROOT` in cmdline | `lsof -t -iTCP:43595 \| xargs kill` without checking which tree owns it |
| Kill Chromium only if `user-data-dir=…/rs2-r377-workspace…/.tmp/playwright-harness-profile` | Touch port **43594** or `experiments/Server` |
| Leave `rs2b0t` Electron alone | Kill by short script name alone (`run.mjs`) |

Isolation ports for **this** tree only: web **81**, game **43595**, management **8899**.

## What this is

rs2b0t-style split:

| Artifact | Role |
|----------|------|
| **`/client/client.js`** | Pure 1:1 Java Client-TS — **frozen / no harness imports** |
| **`/harness/harness-client.js`** | Stock Client **+** adapter (`reader` / `actions`) — for smokes only |
| **`/harness.html`** | Page that loads harness-client (not `rs2.html`) |
| `tools/harness/client-entry.ts` | Builds harness-client |
| `tools/harness/attach-in-page.js` | Adapter (install(client, hooks)) |
| `tools/harness/lib/harness.mjs` | Playwright helpers |
| Smokes | `login-walk`, `cheat-paths`, `path-abc` (script host) |
| Scripts | `tutorial` (A only), `path-abc` (A+B+C step 1) |

Pure play: `http://127.0.0.1:81/rs2.html`  
Harness: `http://127.0.0.1:81/harness.html` — **side panel** (status / log / Start·Stop) like rs2b0t `bot.html` rail. Full BotPanel later with `vendor/rs2b0t`.

## Prerequisites

1. Engine isolation: `WEB_PORT=81`, `NODE_PRODUCTION` false (staffmodlevel **4** on login), **`NODE_DEBUG=true`**.
2. Pure client (optional for play): `vendor/client-ts` `bun run build:dev` → `public/client/`
3. **Harness client:** `bun tools/harness/build-client.mjs` → inject pure Client-TS hooks → `public/harness/harness-client.js`  
   - Also runs **deploy basemap bake** (`tools/harness/map/build-basemap.ts` → `nav/out/basemap/` → `public/harness/basemap/`). Skip with `SKIP_BASEMAP_BAKE=1`.  
   (runs `inject-client.mjs` first; pure tree untouched. **dev** names — do not use `--prod` for dig-based attach.)
4. Playwright: `cd tools/client-smoke && npm install && npx playwright install chromium`

### Cheats: setup vs force-pass

Staffmod **4** on local logins. Policy (`docs/decisions/004-…` §7):

| OK | Not OK |
|----|--------|
| `give` / `tele` / seed inv to **set up** a focused check | Claiming stage/tutorial **pass** without the real OPLOC/Talk/use-with |
| `::reload` / `::rebuild` after packing RuneScript | Using cheats inside TutorialBot to skip content proofs |
| **Test-speed cheats** (energy, selective `setstat`, `speed`, `~maxme` when appropriate) so long walks / combat floors do not thrash wall-clock | Using those cheats to **skip** the real OPLOC/Talk/use-with path under test |

**377-wip content is untrusted** until verified — see `docs/research/runescript/README.md` and `authenticity-stance.md`.

### Test-speed cheats (encouraged for harness)

Local isolation only (`NODE_PRODUCTION` false, staffmod 4). Prefer **host prep** (`cheatQuiet` in smokes) over script `decide()`.

| Cheat | Effect | When |
|-------|--------|------|
| **`~energy`** | Full run energy + run **on** (content `[debugproc,energy]`) | Before / during long `Traversal.walkTo` legs |
| **`setstat <skill> <level>`** | Absolute skill floor | Quest reqs + practical combat (not min-only) |
| **`~maxme`** | All core skills max (level-up flood — drain dialogs) | Rare mid-quest combat smokes; not default TBWT |
| **`give` / `~item` / `~bankitem`** | Seed tools/food | After dialogs clear (`p_finduid`) |

**Gear policy:** host prep is free, but **match gear tier to combat floor** and **equip** after give. Do not seed bronze for a level-60 fight. Corpus: `docs/research/game-knowledge/harness-prep-and-gear.md`.
| **`speed <ms>`** | World tick rate (min 20ms) | **Quest e2e default 300** via `setWorldSpeed(page, 300)`; override `WORLD_SPEED_MS` |
| **`tele …`** | Map placement | Anchors / skip commute between proof steps |

Notes:

- Debugprocs use `NODE_DEBUGPROC_CHAR` (default **`~`**). Plain `energy` with no `~` is a **no-op**.
- `~energy` needs `p_finduid` — if busy, retry after modal/dialog clear.
- Pack after adding cheats: `BUILD_VERIFY=false npm run build` + restart or `::rebuild`.
- Forward-ported from Server `_test/scripts/cheats/` (`cheat_other`, `cheat_maxme`, `cheat_item`) 2026-08-04.

### TaskBot pacing (game tick)

`TaskBot` / quest / tutorial bots wait on **`Client.loopCycle`** via `reader.loopCycle()` (`Execution.delayTicks`), **not** a fixed 600 ms rs2b0t-style wall-clock loop.

| Field | Meaning |
|-------|---------|
| `loopTicks` | Client cycles after a task **execute** (default 1) |
| `idleTicks` | Client cycles when no task validated (default 1) |
| `loopDelay` | **Deprecated / ignored** |

Dialog continues also call `ChatDialog.settle` → additional `delayTicks` so server `p_delay` can run.

### Scene ready (before world ops)

| Check | Use for |
|-------|---------|
| `ingame` | Connected only — **not** ready to act |
| **`sceneState === 2`** | Maps built — **required** before Talk / walk / use-with / bot tasks |
| Host `waitSceneReady(page)` | After mainland / tele / reload / before `giveItems` |
| Browser `Game.sceneReady()` / `waitSceneReady()` | TaskBot pause, QuestBot/Tutorial/PathABC onStart, executeStep |
| Panel `state` | `ready (scene 2)` vs `ingame · scene N (wait)` |

Do **not** treat “logged in” as “can fire OPNPC.” After tele/reload, scene often dips to 1 while ondemand loads.

### Logout / relog (startup cost)

| Path | What | When |
|------|------|------|
| **Clean** | `actions.ifButton(2458)` → `logout:try_logout` → `p_logout` | Preferred for every harness relog |
| **Dirty** | `client.logout()` socket drop | Fallback only — engine may keep player online (login **5**) |

`mainlandAccount` must setvar tutorial then **relog** so side icons unlock. Most smoke wall-clock before first Talk is that relog. Host: `logoutSafe(page)` + short `RELOG_COOLDOWN_CLEAN_MS` (default **2s**) vs dirty `RELOG_COOLDOWN_MS` (default **20s**).

**Policy:** harness may grow **test tools** beyond a typical bot-script corpus (prep, thrash, clean logout). Keep them under `tools/harness/lib/*` (severable) for later rs2b0t forward-port — Decision 004 §9.

**Mid-quest item seeds** (progress debug, Death Plateau-style):

```text
waitSceneReady → give / setvar / setstat → waitSceneReady (if tele) → bot resume
```

`giveItems(page, items)` waits scene by default. Pass `{ waitScene: false }` only if you intentionally seed during rebuild (discouraged).

### Idle before OPLOC (exactmove / basalt)

| API | Use |
|-----|-----|
| `reader.playerMoving()` | exactMove window / routeLength only |
| `Game.waitIdle()` | wait until **not moving**; sticky primaryAnim ignored |
| specialCrossing `toTile` | preferred land wait for jumps |

**Do not** wait for `primaryAnim === -1` alone — some bas/ready anims never clear  
(hangs gate Open / basalt loops). Soft-timeout then proceed.

### Content edits without restarting the engine

After changing RuneScript under `vendor/content/` (this tree only):

| Step | How |
|------|-----|
| Pack | `cd vendor/engine && BUILD_VERIFY=false npm run build` (varp free-IDs need verify off until reconciled) |
| Env | `BUILD_VERIFY=false` in `vendor/engine/.env` (also in `scripts/apply-isolation-config.sh`) so **startup** pack does not fail |
| In-game **`::rebuild`** | Pack+reload via DevThread (staffmod ≥ 4) |
| In-game **`::reload`** | Re-read `data/pack` only |

Success (debug): world broadcast `Loaded N scripts.`

**Load bar “Game updated - please reload page”:** usually `/config` HTTP 500 after a failed pack (`.varp checksum mismatch`), not a polite UI tip. Fix pack/`BUILD_VERIFY`, then wipe `.tmp/playwright-harness-profile` if IndexedDB still has stale CRCs. See `docs/runbooks/quest-impl.md` §7.

### Auto-run (rs2b0t `RunManager`)

Harness turns **run on** automatically while scripts run (Decision 005 pattern).

| | |
|--|--|
| Module | `tools/harness/script/browser/RunManager.ts` |
| Tick sites | `TaskBot.run` loop, `Traversal.walkTo` entry, `WalkAlong` follow loop |
| Default | on when energy ≥ **20%**, skip if main modal open (bank), always try if in combat with any energy |
| Override | `globalThis.__harnessRunPolicy = { runAuto: false }` or `{ energyMin: 40 }` (host `page.evaluate` before start) |

Does **not** invent a second toggle — uses existing `actions.setRun` / controls com_5.

```bash
export RS2_R377_ROOT=$RS2_R377_ROOT
# pure client (freeze / human play)
cd "$RS2_R377_ROOT/vendor/client-ts" && bun run build:dev
cp out/client.js out/client.js.map out/ondemandworker.js out/tinymidipcm.wasm \
  ../engine/public/client/

# harness client (smokes) — use bun (Bun.build)
cd "$RS2_R377_ROOT" && bun tools/harness/build-client.mjs
# basemap bake only: bun tools/harness/map/build-basemap.ts
# skip bake: SKIP_BASEMAP_BAKE=1 bun tools/harness/build-client.mjs
# copies attach + wasm + SF2; keep ondemandworker next to harness-client:
cp vendor/engine/public/client/ondemandworker.js* vendor/engine/public/harness/ 2>/dev/null || true
```

## Run smokes

```bash
cd "$RS2_R377_ROOT"
# All of these are headed unless HEADLESS=1
node tools/harness/login-walk-smoke.mjs
node tools/harness/cheat-paths-smoke.mjs
# Path A→B→C step 1 (script: tutorial → Lumbridge → goblin kill)
node tools/harness/path-abc-smoke.mjs --max-ms 1800000
# same script via generic host:
node tools/harness/script/run.mjs path-abc --max-ms 1800000
node tools/harness/script/run.mjs tutorial   # Path A only
# optional account:
node tools/harness/login-walk-smoke.mjs --base 'http://127.0.0.1:81/rs2.html?harness=1' test test
```

### Clean up harness test accounts

`freshAccount()` leaves `data/players/main/<user>.sav` (and optional SQLite `account` rows when `LOGIN_SERVER=true`). Wipe junk logins:

```bash
cd "$RS2_R377_ROOT"
bash scripts/cleanup-test-accounts.sh           # dry-run (default)
bash scripts/cleanup-test-accounts.sh --apply   # delete
# only some prefixes:
bash scripts/cleanup-test-accounts.sh --prefix tut --prefix sm --apply
```

Default prefixes: `tut sm lw pab scs shot inj h edg vik mtn hfd tbw …` (harness/smoke stamps).  
Always keeps: `bot377`, `test`, `test2`, `portall`, `freshui`.  
With `LOGIN_SERVER=false`, the real clutter is `.sav` files under `vendor/engine/data/players/main/`.

**Periodic (dev):** agent session may schedule `bash scripts/cleanup-test-accounts.sh --all-saves --apply` (e.g. every 2h) — safe to clobber junk on this isolated stack. Cancel via scheduler list/delete.

### Headed vs headless

| Env | Effect |
|-----|--------|
| **(default)** | **Headed** — visible browser |
| `HEADLESS=1` | Headless |
| `HEADED=0` / `false` / `no` | Headless |
| `HEADED=1` | Headed (explicit; same as default) |
| `SLOWMO=200` | Playwright slowMo ms (headed only; default 200) |

### Scene-1 hangs + smoke fail-fast

`sceneState=1` while maps/versionlist load is normal for a few seconds after tele. **Stuck forever** is usually broken versionlist (model ver=0) — see `docs/plans/2026-08-05-scene-stuck-versionlist-zero.md`.

| Env / tool | Effect |
|------------|--------|
| `SCENE_READY_MS=25000` | Cap `waitSceneReady` (default **45000**) |
| `SMOKE_BUDGET_MS=180000` | Absolute wall budget for hosts using `createSmokeBudget` |
| `SMOKE_STEP_MS=45000` | Default per-step cap for `withStepBudget` |
| `waitTileChange` | Hop detect — fail if tile static (portals/ladders) |
| `waitSceneReady` fail | Logs `ingame` / `sceneState` / tile once, returns `false` |
| `teleTo` | Retries; fails if tile OK but scene never reaches 2. **Stand next to the loc, not on it** (altars/walls often unwalkable) — [`game-knowledge/harness-tele-stand.md`](../research/game-knowledge/harness-tele-stand.md) |
| `bash scripts/kill-harness-smoke.sh` | Kills **this tree only**: `quest-*-smoke.mjs`, path-abc, script/run, Chromium harness profile |
| `bash scripts/kill-harness-smoke.sh --engine` | Also stop LC377 `vendor/engine` only (not live 274) |

**Agent rules:**

1. Quiet >~60s after hop/tele → `kill-harness-smoke.sh`, do not wait full `--max-ms`.  
2. Prefer step budgets over stacking long `waitSceneReady` in loops (maze).  
3. Scene=1 forever → versionlist size check (live vs flat pack file).  

Nav rip notes: `docs/plans/2026-08-06-nav-rip-failfast.md` (rs2b0t @ `2535397`).

### Screenshots (evidence-only)

**Prefer rs2b0t-style proofs** — shot when the host knows success/fail, not on a timer.  
Full vacuum: [`docs/research/rs2b0t-harness-test-patterns.md`](../research/rs2b0t-harness-test-patterns.md)  
(`createHarnessProof` → success / baseline / failure PNG + JSON; no periodic ticks).

LC `script/run.mjs` today:

| Env | Effect |
|-----|--------|
| **(default)** | Bridge on; end/incomplete/error + optional stage `bot.shot` |
| `SHOTS=0` | Disable all |
| `SHOT_INTERVAL_MS=0` | **Recommended** — no Node `tick-*` spam (avoids visual artifacting) |
| `SHOT_INTERVAL_MS=N` | Optional periodic ticks (debug only; not rs2b0t pattern) |
| `STALL_SHOTS=1` | One in-page `stall-*` shot after ~5s on same stage (default **off**) |

**Important:** `SHOT_INTERVAL_MS=0` used to leave **stall auto-shots** on; those also dig the WebGL canvas. Stall shots are now off unless `STALL_SHOTS=1`.

### State refresh: packet-dirty, not poll (direction)

Do **not** add more “every tick re-read inv/varp/chat/dialog” loops.  
Inbound packets already say *when* state changed. Target: dirty flags → rescan family → event (rs2b0t `producerDirty` / `pumpProducers`).  

See **`docs/decisions/008-packet-dirty-not-poll.md`**. Decision 007 = tick pacing; 008 = what wakes work.

In-page (rare mid-stage evidence):

```ts
await harnessShot('chef-door-in-fail');  // api.ts
await this.bot.shot('label');            // TaskBot
```

Output: `docs/plans/harness-shots/<runId>/` (under gitignored `docs/`).

### Browser profile (ondemand cache)

`launchBrowser()` uses a **persistent** Chromium profile (274-style) so IndexedDB
`lostcity` survives between runs. First boot is cold; later boots reuse maps/models.

| Env | Effect |
|-----|--------|
| (default) | Profile at `.tmp/playwright-harness-profile` (gitignored via `.tmp/`) |
| `HARNESS_PROFILE=/path` | Custom profile dir |
| `HARNESS_FRESH_PROFILE=1` | Wipe profile before launch (force cold) |
| `HARNESS_EPHEMERAL=1` | Old behaviour — no profile, always cold |

### Login (rs2b0t inject)

Default is **injected** `Client.login` (no title-screen typing), same as
`rs2b0t/tools/lib/harness.ts`:

```ts
// page.evaluate → __lc377.login(user, pass) → client.loginUser/Pass + void client.login(...)
```

| Env | Effect |
|-----|--------|
| **(default)** | Injected login |
| `TITLE_LOGIN=1` | Old canvas Existing User → type → Login click |

Helpers: `login()` / `loginInject()` / `loginTitleUi()` in `tools/harness/lib/harness.mjs`.

### Accounts (rs2b0t-style)

By default each smoke uses a **fresh username** + password `test`:

| Helper | Behaviour |
|--------|-----------|
| `freshAccount(prefix)` | `prefix` + base36 timestamp, max 12 chars |
| `resolveAccount(rest, prefix)` | argv user/pass → `SMOKE_USER`/`SMOKE_PASS` → fresh |

Local engine auto-creates accounts (`WEBSITE_REGISTRATION=false`). Pin only when debugging a sav:

```bash
node tools/harness/path-abc-smoke.mjs stuckuser test
SMOKE_USER=stuckuser node tools/harness/login-walk-smoke.mjs
```

### Script host (adapt rs2b0t scripts without a full bot client)

In-browser TaskBot-style runner on the harness client (sync `reader`/`actions`):

| Path | Role |
|------|------|
| `tools/harness/script/browser/api.ts` | Thin Game / Execution / Npcs / Locs / ChatDialog / TaskBot |
| `tools/harness/script/browser/tutorial/TutorialBot.ts` | Adapted stages from rs2b0t |
| `tools/harness/script/browser/register.ts` | `globalThis.__lc377.scripts.start('tutorial')` |
| `tools/harness/script/run.mjs` | Playwright: login → start script → wait |

```bash
bun tools/harness/build-client.mjs
node tools/harness/script/run.mjs tutorial              # headed by default
node tools/harness/script/run.mjs tutorial --max-ms 900000
HEADLESS=1 node tools/harness/script/run.mjs tutorial   # CI only
```

Add more scripts by registering factories in `register.ts` (same pattern as rs2b0t script library, no MultiBox/panel required).

Open manually: `http://127.0.0.1:81/rs2.html?harness=1` → console should log  
`[harness] globalThis.__lc377 attached`.

## ABI (`globalThis.__lc377`)

| Method | Notes |
|--------|--------|
| `loopCycle()` | Client static |
| `ingame()` / `sceneState()` / `loginscreen()` | stay-alive / title state |
| `worldTile()` | world + local route |
| `walkTo(lx,lz)` / `walkRel(dx,dz)` | Client `tryMove` → MOVE_* wire |
| `cheat(cmd)` | CLIENT_CHEAT **56** — `tele`, `give`, `~home`, … |
| `menuAction(act,a,b,c)` | Client `doAction` scratch slot |
| `loginDirect` | **debug only** — skip UI (not default) |

### Login = canvas title UI (not a client API)

Default `login()` in `tools/harness/lib/harness.mjs` lands real clicks on `#canvas`
(same hitboxes as `Client.titleScreenLoop` / `scripts/smoke-client-ts.mjs`):

1. Focus canvas  
2. **Existing User** `(462, 291)`  
3. Type username → Tab → type password  
4. **Login** button `(302, 321)` — Enter does **not** submit  

Do not add `startLogin` into Client-TS for bots; when `vendor/rs2b0t` is adapted later,
login goes through adapter **or** the same canvas path — client stays pure.

## Engine cheats useful with thin content

Local engine (`ClientCheatHandler` + content `[debugproc,*]`):

| Cheat | Use |
|-------|-----|
| `tele 0,50,50,22,22` | Jump mapsquare/tile (staff ≥ 2) |
| `give <obj> [n]` | Inventory seed (staff ≥ 4, non-prod) |
| `~home` / `~varrock` / … | Content debugproc teles |
| `setstat` / `advancestat` | Skills |
| `~clearinv` | Wipe pack (debugproc) |
| **`~energy`** | Full run energy + run on (**test speed** — long walks) |
| `~maxme` | Max core skills (dialog flood — use carefully) |
| `~item` / `~bankitem` | Seed inv/bank by debug name |
| `speed <ms>` | Faster world tick (dev only) |

Harness sends the body **without** requiring `::` (attach strips a leading `::` if present).  
See **Test-speed cheats** above for policy.

## What this is not

- Not a second protocol / forged packets.
- Not the full bot **product** (BotHost, MultiBox, panel, nav packs) — that is `vendor/rs2b0t` later.
- **Is** the place to adapt rs2b0t **scripts** now — `script/browser/**` + `run.mjs` — so we can iterate without waiting on that product.
- Not authority for “client is 1:1” — only convenience for bang-on loops.

## Deploy shell contract (`rs2.html`)

```js
const client = new Client(37, false, true);
if (new URLSearchParams(location.search).has('harness')) {
  const { install } = await import('/harness/attach-in-page.js');
  install(client);
}
```

No equivalent code belongs in `vendor/client-ts/src`.
