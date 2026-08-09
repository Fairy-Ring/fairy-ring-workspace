# Runbook — TypeScript web client (Client-TS, track → 377)

**Workspace:** `$RS2_R377_ROOT`  
**Client path:** `vendor/client-ts`  
**Upstream:** https://github.com/LostCityRS/Client-TS  
**Base branch used:** **`289`** (has `webclient: true` in Server `revInfo`; no upstream `377` TS branch)  
**Private work branch:** **`rs2-r377`** (local only — do **not** push to LostCityRS)

No game content is authored here. This runbook is clone / build / deploy / config surface for the web client against **this** isolated 377 engine.

**Paired engine:** `vendor/engine`  
**Isolation ports (this workspace):**

| Role | Value |
|------|------:|
| Web / CRC HTTP | **81** |
| Game (TCP, Java) | **43595** |
| Management | **8899** |
| Node id | **37** |
| Engine revision | **377** |

---

## 1. Clone status (as of 2026-08-03)

| Field | Value |
|-------|--------|
| Remote | `https://github.com/LostCityRS/Client-TS.git` |
| Local path | `vendor/client-ts` |
| Upstream tip cloned | branch **`289`** (`--single-branch`) |
| Work branch | **`rs2-r377`** (created from `289` tip) |
| HEAD | `bc4751da0748704307eef9e186015b08834fccf7` |
| Message | `fix: Better ClientStream logic` |
| Build system | **Bun** (`bun.lock` present) |
| Entry / module | `src/client/Client.ts` (`package.json` `"module"`) |
| Upstream README | License/ethos only — build inferred from `package.json` + `bundle.ts` |

Re-clone if missing:

```bash
export LC377_ROOT=$RS2_R377_ROOT
cd "$LC377_ROOT"
git clone --branch 289 --single-branch \
  https://github.com/LostCityRS/Client-TS.git vendor/client-ts
cd vendor/client-ts
git checkout -b rs2-r377
```

If branch `289` is missing, fall back to **`274`** (also has webclient in Server revInfo).

**Never** `git push` this work branch to `LostCityRS/*`.

---

## 2. Tree (high level)

```text
vendor/client-ts/
├── package.json          # scripts: build / build:dev; dep fflate; peer typescript
├── bun.lock
├── bundle.ts             # Bun.build + terser; embeds LOGIN_RSA* / SECURE_ORIGIN
├── rsa.ts                # optional keygen → .env LOGIN_RSAE/N (dev tool)
├── identifier.js         # terser mangling alphabet
├── tsconfig.json
├── out/                  # build products (created by build; usually gitignored locally)
│   ├── client.js
│   ├── client.js.map
│   ├── ondemandworker.js
│   ├── ondemandworker.js.map
│   ├── mapview.js
│   ├── mapview.js.map
│   └── tinymidipcm.wasm
└── src/
    ├── client/           # Client, GameShell, title, input
    ├── io/               # Packet, ClientStream (WS), OnDemand*, Isaac, prot
    ├── config/ dash3d/ graphics/ sound/ mapview/ util/ wordfilter/
    └── 3rdparty/         # tinymidipcm wasm + audio helpers (vendored in tree)
```

Submodules listed in `.gitmodules` (`3rdparty/tinymidipcm`, `bzip2-wasm`, `emsdk`) are **not** required for a normal build — wasm already lives under `src/3rdparty/tinymidipcm/`.

---

## 3. Prerequisites

| Dep | Notes |
|-----|--------|
| **Bun** | Verified `1.3.14` (`/opt/homebrew/bin/bun`) |
| Node optional | Not needed for build if Bun is present |
| Running world | `vendor/engine` with isolation `.env` (WEB **81**, NODE **43595**, rev **377**) |

Do **not** install into or start the live `Server` / `rs2b0t` trees for this project.

---

## 4. Install & build

```bash
export LC377_ROOT=$RS2_R377_ROOT
cd "$LC377_ROOT/vendor/client-ts"

bun install
bun run build          # production: minify + drop console → out/
# optional:
bun run build:dev      # no terser minify; keeps console
```

**Verified 2026-08-03:** `bun install` + `bun run build` → **success**  
Artifacts: `out/client.js` (~351 KB), `out/ondemandworker.js`, `out/mapview.js`, `out/tinymidipcm.wasm`.

Prod bundle ends with `export { … as Client }` (named ESM export). HTML must use:

```js
import { Client } from './client/client.js';
new Client(nodeid, lowmem, members);
```

### Optional RSA rebuild env

`bundle.ts` reads env at **build time** (compile-time `define`):

| Env | Default (historical LC / 2003–2010 key) | Role |
|-----|------------------------------------------|------|
| `LOGIN_RSAE` | `58778699976184461502525193738213253649000149147835990136706041084440742975821` | Public exponent |
| `LOGIN_RSAN` | `7162900525229798032761816791230527296329313291232324290237849263501208207972894053929065636522363163621000728841182238772712427862772219676577293600221789` | Modulus |
| `SECURE_ORIGIN` | `false` | If set to a hostname, client refuses other hosts |

```bash
# Example: bake custom keys that match engine data/config/private.pem
export LOGIN_RSAE='…'
export LOGIN_RSAN='…'
bun run build
```

`rsa.ts` can generate a new pair + write `.env` (does not auto-build).

---

## 5. How networking works (critical difference vs Java)

| Concern | Java client (`vendor/client-java`) | TS web client (`vendor/client-ts`) |
|---------|-------------------------------------|-------------------------------------|
| Codebase / CRC host | `http://127.0.0.1:(portOffset + 80)` | **Same origin** as the page (`window.location`) |
| Game socket | TCP `portOffset + 43594` | **WebSocket** to `window.location.host` (web port) |
| OnDemand | TCP same game offset | Worker WS to same host |
| Isolation args | e.g. nodeid **37**, portOffset **1** → web **81**, game **43595** | Serve page from **WEB_PORT=81**; WS upgraded on that HTTP server |

Engine (`vendor/engine/src/web.ts`):

- Serves cache/CRC on HTTP paths (`/crc`, `/title`, `/config`, …).
- Upgrades WebSocket on path **`/`** and hands traffic to game + OnDemand.
- Serves static files from `public${url.pathname}` when present.

**TCP `NODE_PORT=43595` is for the Java client.** Browser TS talks **WS on WEB 81**.

---

## 6. Deploy into this workspace’s engine

**Preferred path (scripted):** build Client-TS and copy into `vendor/engine/public/client/`.

```bash
export LC377_ROOT=$RS2_R377_ROOT
cd "$LC377_ROOT"
chmod +x scripts/deploy-client-ts.sh   # once
bash scripts/deploy-client-ts.sh
```

| Step | What it does |
|------|----------------|
| `bun run build` | In `vendor/client-ts` (bakes `LOGIN_RSAE` / `LOGIN_RSAN` if set) |
| Copy | `out/client.js`, maps, `ondemandworker.js`, `tinymidipcm.wasm` → `vendor/engine/public/client/` |
| HTML | Expects existing `vendor/engine/public/rs2.html` (does not create it; warns if missing) |

**Open URL (engine must be on WEB_PORT=81):**

```text
http://127.0.0.1:81/rs2.html
```

**Verified 2026-08-03 (M1 deploy):**

| Check | Result |
|-------|--------|
| `CLIENT_VERSION` in `vendor/client-ts/src/client/Client.ts` | **`377`** (`loginout.p2(CLIENT_VERSION)`) |
| `bash scripts/deploy-client-ts.sh` | **success** → `public/client/client.js` ~351 KB |
| `GET http://127.0.0.1:81/rs2.html` | **200** |
| `GET http://127.0.0.1:81/client/client.js` | **200** |
| Live TCP **43594** | left alone (do not kill) |

### 6.1 Manual copy (equivalent to script)

```bash
export LC377_ROOT=$RS2_R377_ROOT
cd "$LC377_ROOT/vendor/client-ts" && bun run build
mkdir -p "$LC377_ROOT/vendor/engine/public/client"
cp "$LC377_ROOT/vendor/client-ts/out/client.js" \
   "$LC377_ROOT/vendor/client-ts/out/client.js.map" \
   "$LC377_ROOT/vendor/client-ts/out/ondemandworker.js" \
   "$LC377_ROOT/vendor/client-ts/out/ondemandworker.js.map" \
   "$LC377_ROOT/vendor/client-ts/out/tinymidipcm.wasm" \
   "$LC377_ROOT/vendor/engine/public/client/"
# MIDI soundfont (required for tinymidipcm; deploy-client-ts.sh copies if found):
# Prefer: client-ts/out/SCC1_Florestan.sf2, else reference Server trees, else keep existing.
# Manual: cp /path/to/SCC1_Florestan.sf2 "$LC377_ROOT/vendor/engine/public/client/"
```

Upstream Server menu “Build Web Client” does the equivalent:

```text
cwd: webclient → bun/npm build → copy webclient/out/client.js → engine/public/client/client.js
```

### 6.2 HTML shell (`rs2.html`)

Static page lives at **`vendor/engine/public/rs2.html`**. It:

1. Loads `/client/client.js` as a module  
2. Instantiates `new Client(37, false, true)` for isolation (**node id 37**, highmem, members — match engine `NODE_ID` / members world)

Shell: `vendor/engine/public/rs2.html` (served at **`http://127.0.0.1:81/rs2.html`**).

**Critical:** Client-TS `graphics/Canvas.ts` does `document.getElementById('canvas')`.  
The element **must** be `<canvas id="canvas" width="765" height="503">` — not `id="game"`. Wrong id → null canvas → blank page / no client.

```html
<canvas id="canvas" width="765" height="503"></canvas>
<script type="module">
  const { Client } = await import('/client/client.js');
  new Client(37, false, true); // nodeid, lowmem, members
</script>
```

Hard-refresh after HTML changes (cache).

### 6.3 Start engine (reminder)

```bash
export LC377_ROOT=$RS2_R377_ROOT
cd "$LC377_ROOT"
bash scripts/apply-isolation-config.sh
# engine .env must have WEB_PORT=81 NODE_PORT=43595 NODE_ID=37 ENGINE_REVISION=377
cd vendor/engine
# use project’s normal start path (see smoke-start.md / playable.md)
```

Do **not** kill live TCP **43594** (other stack). Isolation game TCP is **43595**; TS browser uses WS on **81**.

---

## 7. Config surface — what to edit for 377

Concrete files that control each concern:

| Concern | File(s) | What to change |
|---------|---------|----------------|
| **Client version string / login revision** | `vendor/client-ts/src/client/Client.ts` | `const CLIENT_VERSION = 377` (**set**; must match engine `ENGINE_REVISION=377` login gate via `loginout.p2(CLIENT_VERSION)`) |
| **Login revision (wire)** | same as above | Sent as `p2` after `p1(255)` in login block |
| **RSA public exponent** | Build-time: `LOGIN_RSAE` env **or** default in `vendor/client-ts/bundle.ts` | Must match engine private key’s public **e** |
| **RSA modulus** | Build-time: `LOGIN_RSAN` env **or** default in `bundle.ts` | Must match engine private key’s public **n** |
| **RSA encrypt call site** | `vendor/client-ts/src/client/Client.ts` (`rsaenc(LOGIN_RSAN, LOGIN_RSAE)`) | Uses compile-time `process.env.LOGIN_RSA*` |
| **RSA decrypt (server)** | `vendor/engine/data/config/private.pem` (+ `public.pem`) loaded in `vendor/engine/src/engine/World.ts` | Private key must match client public pair |
| **RSA helper (keygen)** | `vendor/client-ts/rsa.ts` / `vendor/engine/tools/server/rsa.ts` | Generate pairs; not used at runtime by default |
| **Server host (game WS)** | `Client.ts` login + `OnDemand.ts` / `OnDemandWorker.ts` | **`window.location.host`** — no separate host constant; page origin is host |
| **Game port (WS)** | Implicit in `window.location.host` | Web port of page (**81** here); not `NODE_PORT` |
| **Web / CRC HTTP port** | Engine `WEB_PORT` in `vendor/engine/.env` | **81** for this workspace |
| **TCP game port (Java only)** | Engine `NODE_PORT` in `.env` | **43595** (TS browser ignores TCP) |
| **Node id** | Constructor arg `new Client(nodeid, …)` from HTML / ejs | Isolation: **37** (`NODE_ID=37`) |
| **Engine revision gate** | Engine `ENGINE_REVISION` in `.env` / `Environment.ts` | **377** — rejects login if client sends other rev → response `6` |
| **Secure origin lock** | `SECURE_ORIGIN` at build + check in `Client.ts` | Optional host pin |
| **Protocol opcodes (later 289→377)** | `src/io/ClientProt.ts`, `src/io/ServerProt.ts` | Diff against Java 377 + engine `ClientGameProt` / `ServerGameProt` |

---

## 8. Milestone map (this track)

| M | Goal | Notes |
|---|------|-------|
| **M0** | Scaffold | Clone 289 → `rs2-r377`; build green; this runbook (**done 2026-08-03**) |
| **M1** | Login on 377 | `CLIENT_VERSION=377` + deploy + serve HTML (**partial 2026-08-03** — build/deploy/HTTP 200); RSA match + login response 2 still open |
| **M2** | World | Map load, walk, see entities |
| **M3** | Interact | Menus / interfaces for content playtests |
| **M4** | Harness | Headless/scripted smoke — Playwright (`scripts/smoke-client-ts.mjs`, §11) |
| **M5** | rs2b0t embed | Copy into `vendor/rs2b0t` — never edit live rs2b0t |

Oracle for protocol/UI: `vendor/client-java` branch **377** + `vendor/engine` 377-wip.

---

## 9. Isolation / policy reminders

- Writable tree only under this workspace.  
- Do **not** checkout or run clients from `/Users/acfrazier/experiments/Server`, `rs2b0t`, or `rs2b2t-engine` for this project.  
- Ports: web **81**, game **43595**, management **8899**, node **37**, rev **377**.  
- Authenticity: port from Java 377 / early sources — no invented content (`docs/research/authenticity-stance.md`).

---

## 10. Related docs

| Doc | Role |
|-----|------|
| [`docs/plans/2026-08-03-client-ts-scaffold.md`](../plans/2026-08-03-client-ts-scaffold.md) | M0 SHA, build result, config inventory |
| [`docs/plans/2026-08-03-client-ts-m1.md`](../plans/2026-08-03-client-ts-m1.md) | M1 deploy status, HTTP checks, open items |
| [`docs/plans/2026-08-03-playwright-smoke.md`](../plans/2026-08-03-playwright-smoke.md) | Playwright smoke run results |
| [`docs/research/client-strategy-377.md`](../research/client-strategy-377.md) | Why TS is prioritized; M0–M5 |
| [`docs/decisions/002-prioritize-ts-client.md`](../decisions/002-prioritize-ts-client.md) | ADR |
| [`docs/runbooks/playable.md`](./playable.md) | Java client (oracle) |
| [`docs/runbooks/isolation.md`](./isolation.md) | Ports / forbidden paths |
| [`docs/runbooks/smoke-start.md`](./smoke-start.md) | Engine start |

---

## 11. Playwright smoke (TS client vs engine :81)

Headless Chromium opens the deployed shell, collects console + pageerrors, waits for `#canvas` and non-black / past-loading signal, optionally types login credentials via keyboard, then settles ~20s watching for **T1/T2** protocol deaths and uncaught errors.

### 11.1 One-time install (workspace-local only)

Playwright lives under **`tools/client-smoke/`** — not in live `rs2b0t` / `Server`, and not required inside `vendor/client-ts` for builds.

```bash
export LC377_ROOT=$RS2_R377_ROOT
cd "$LC377_ROOT/tools/client-smoke"
npm install
npx playwright install chromium
```

### 11.2 Prerequisites each run

| Check | How |
|-------|-----|
| Engine on **WEB_PORT=81** | `lsof -iTCP:81 -sTCP:LISTEN` or `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:81/rs2.html` → **200** |
| Client deployed | `bash scripts/deploy-client-ts.sh` (prod) **or** `bun run build:dev` + copy for console progress/T1/T2 strings |
| Live **43594** | Do **not** kill (other stack). Isolation game TCP is **43595**; browser uses WS on **81**. |

Start engine if needed:

```bash
export LC377_ROOT=$RS2_R377_ROOT
cd "$LC377_ROOT"
bash scripts/apply-isolation-config.sh
cd vendor/engine && npm start
# leave running; do not stop live 43594
```

### 11.3 Run smoke

```bash
export LC377_ROOT=$RS2_R377_ROOT
cd "$LC377_ROOT"
node scripts/smoke-client-ts.mjs
# or: cd tools/client-smoke && npm run smoke
```

| Env | Default | Meaning |
|-----|---------|---------|
| `SMOKE_URL` | `http://127.0.0.1:81/rs2.html` | Page under test |
| `SMOKE_LOAD_MS` | `60000` | Max wait to leave loading / see canvas content |
| `SMOKE_SETTLE_MS` | `20000` | Watch window for T1/T2 + pageerrors after load/login |
| `SMOKE_REPORT_MS` | `45000` | Extra console-only watch when no login credentials |
| `SMOKE_USER` / `SMOKE_PASS` | empty | If set, click canvas + keyboard type user/tab/pass/enter |
| `SMOKE_HEADED` | unset | Set `1` to show the browser window |

Optional login attempt:

```bash
SMOKE_USER=bot SMOKE_PASS=bot node scripts/smoke-client-ts.mjs
```

### 11.4 Exit codes / what is checked

| Exit | Meaning |
|-----:|---------|
| **0** | Past loading (canvas non-black or progress logs); **no** T1/T2; **no** uncaught `pageerror`; no `loaderror` text |
| **1** | Load timeout, loaderror, T1/T2, pageerror, or engine unreachable |
| **2** | Playwright not installed under `tools/client-smoke` |

**Note:** production `bun run build` **drops `console.*`**, so T1/T2 may not appear on the console even if the client hits those paths. For protocol debug, deploy **`bun run build:dev`** then re-copy artifacts (or run `deploy-client-ts.sh` after a local dev build of `out/`). Pixel sample still works on prod builds (`putImageData` → `getImageData`).

### 11.5 Paths

| Path | Role |
|------|------|
| `scripts/smoke-client-ts.mjs` | Smoke entrypoint |
| `tools/client-smoke/package.json` | Isolated `playwright` dep |
| `vendor/engine/public/rs2.html` | Shell under test |
| `docs/plans/2026-08-03-playwright-smoke.md` | Captured run output / verdict |
