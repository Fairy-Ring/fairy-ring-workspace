# Runbook — playable client (Java, rev 377)

**Workspace:** `$RS2_R377_ROOT`  
**Client path:** `vendor/client-java`  
**Upstream:** https://github.com/LostCityRS/Client-Java (branch **`377`**)  
**Paired server:** `vendor/engine` on isolated ports (game **43595**).

No game content is authored here — this runbook only covers build/run/connect for the decompiled Java client.

---

## 1. Clone status (as of 2026-08-03)

| Field | Value |
|-------|--------|
| Remote | `https://github.com/LostCityRS/Client-Java.git` |
| Local path | `vendor/client-java` |
| Branch | **`377`** (tracks `origin/377`) |
| HEAD | `327880f6de74b40c420705bc42e4b34284885087` |
| Message | `fix: OnDemand.validate arg order (#5)` |
| Build system | Gradle 8.11.1 wrapper (`./gradlew`) |
| Target bytecode | Java 8 (`sourceCompatibility` / `targetCompatibility`) |
| Main class | `jagex2.client.Client` |
| No upstream README | Run/build inferred from `build.gradle`, CI, `Server/start.js` |

Re-clone if missing:

```bash
export RS2_R377_ROOT=/path/to/fairy-ring-workspace
cd "$RS2_R377_ROOT"
git clone --branch 377 --single-branch \
  https://github.com/LostCityRS/Client-Java.git vendor/client-java
```

If branch `377` is ever missing, list remotes and pick the closest rev branch:

```bash
git ls-remote --heads https://github.com/LostCityRS/Client-Java.git | grep 377
```

Server’s `revInfo['377-wip'].clientBranch` is **`377`** — matches this checkout.

---

## 2. Tree (high level)

```text
vendor/client-java/
├── build.gradle          # java + application plugins; mainClass = jagex2.client.Client
├── settings.gradle       # rootProject.name = rs2client
├── gradlew / gradlew.bat
├── gradle/wrapper/
├── proguard.pro / proguard.map
├── ref/remap.toml        # deob mapping reference
└── src/main/java/
    ├── jagex2/
    │   ├── client/       # Client, GameShell, ViewBox (desktop frame)
    │   ├── config/       # Loc/Npc/Obj/Seq/… type loaders
    │   ├── dash3d/       # world / entities / models
    │   ├── graphics/     # Pix*
    │   ├── io/           # Packet, OnDemand, ClientStream, Protocol
    │   ├── sound/ wordenc/ jstring/ datastruct/
    ├── sign/             # signlink (sockets, cache files, MIDI); clientversion = 377
    └── deob/             # @ObfuscatedName annotation only
```

Built artifact: `vendor/client-java/build/libs/rs2client.jar` (fat-ish jar with Main-Class).

---

## 3. Prerequisites

| Dep | Notes |
|-----|--------|
| **JDK 8+** | Project targets 8; CI builds with Temurin 8. Local smoke used Temurin **17** successfully. |
| Network once | First `./gradlew` downloads Gradle 8.11.1 + deps |
| Running world | `vendor/engine` with isolation config (see `smoke-start.md` / `isolation.md`) |

Do **not** point this client at the live 274 stack unless you intentionally want that world.

---

## 4. Build

```bash
export RS2_R377_ROOT=/path/to/fairy-ring-workspace
cd "$RS2_R377_ROOT/vendor/client-java"

./gradlew jar          # → build/libs/rs2client.jar
# optional:
./gradlew build
./gradlew proguard     # → build/libs/rs2client.rel.jar (needs ProGuard config)
```

Verified 2026-08-03: `./gradlew jar` → **BUILD SUCCESSFUL** (applet deprecation warnings only).

Upstream Server menu “Build Java Client” is the same: `./gradlew build` in the javaclient directory.

---

## 5. Run (desktop application mode)

### 5.1 CLI shape

```text
Usage: node-id, port-offset, [lowmem/highmem], [free/members], storeid
```

| Arg | Role | Isolation default | Upstream LC default |
|-----|------|-------------------|---------------------|
| `node-id` | World/node id | **`37`** (`NODE_ID`) | `10` |
| `port-offset` | Added to base game port **43594** | **`1`** → **43595** | `0` → 43594 |
| mem | `lowmem` / `highmem` | `highmem` | `highmem` |
| members | `free` / `members` | `members` | `members` |
| storeid | signlink cache store id | `32` | `32` |

Revision is **not** a CLI flag: hardcoded as `signlink.clientversion = 377` and login payload `p2(377)`.

### 5.2 Preferred: Gradle application plugin

**Isolated r377 world (this project):**

```bash
# Terminal A — engine already configured for NODE_PORT=43595
cd "$RS2_R377_ROOT/vendor/engine" && npm start

# Terminal B — Java client
cd "$RS2_R377_ROOT/vendor/client-java"
./gradlew run --args="37 1 highmem members 32"
```

**Stock Lost City ports (game 43594):**

```bash
./gradlew run --args="10 0 highmem members 32"
# or zero args (same defaults: 10 0 highmem members 32):
./gradlew run
```

That matches `vendor/Server/start.js` “Run Java Client” for non-225 revs.

### 5.3 Jar launch

```bash
cd "$RS2_R377_ROOT/vendor/client-java"
./gradlew jar
java -cp build/libs/rs2client.jar jagex2.client.Client 37 1 highmem members 32
```

### 5.4 Host / localhost

Desktop `main()` calls:

```java
signlink.startpriv(InetAddress.getLocalHost());
```

Sockets open against that address (typically your machine’s LAN/hostname IP, which still reaches a server bound to `0.0.0.0`).

Relevant client ports:

| Channel | Formula | Isolation (`portOffset=1`) |
|---------|---------|----------------------------|
| Game login / play | `portOffset + 43594` | **43595** |
| OnDemand | `portOffset + 43594` | **43595** |
| JAGGRAB (title `field196` toggle) | hard-coded **43595** | **43595** (lucky match when offset=1) |
| Fake codebase URL (CRC HTTP) | `http://127.0.0.1:(portOffset+80)` | **port 81** — engine `WEB_PORT` **must** match |

Engine:

- **`WEB_PORT`** must equal **`80 + portOffset`** (CRC `/crc` over HTTP). Isolation: **81**.
- **`NODE_PORT`** must equal **`43594 + portOffset`** (game + on-demand TCP). Isolation: **43595**.

**Do not** set `WEB_PORT=8891` with `portOffset=1` — client will never fetch CRCs.

---

## 6. RSA keys

### 6.1 How login RSA works

Client encrypts the login block with **hardcoded** public constants in `Client.java`:

| Constant | Role | Value (decimal, current 377 branch) |
|----------|------|--------------------------------------|
| `LOGIN_RSAN` | modulus \(n\) | `7162900525229798032761816791230527296329313291232324290237849263501208207972894053929065636522363163621000728841182238772712427862772219676577293600221789` |
| `LOGIN_RSAE` | public exponent \(e\) | `58778699976184461502525193738213253649000149147835990136706041084440742975821` |

Call site: `Packet.rsaenc(LOGIN_RSAN, LOGIN_RSAE)` → `modPow(e, n)`.

Engine decrypts with **`vendor/engine/data/config/private.pem`** (`World.ts` loads PEM at boot; `Packet.rsadec(priv)`).

### 6.2 Match against this workspace’s keys

Checked 2026-08-03 against `vendor/engine/data/config/private.pem`:

| Check | Result |
|-------|--------|
| `private.pem` modulus \(n\) == `LOGIN_RSAN` | **Yes** |
| `private.pem` publicExponent \(e\) == `LOGIN_RSAE` | **Yes** |

So **no client edit is required** for login against the current engine keypair.  
`public.pem` is the companion public file (engine tooling / docs); the **authoritative decrypt key is `private.pem`**. Client does not read the PEM files — it only uses the two BigInteger constants.

### 6.3 If keys are regenerated

```bash
cd "$RS2_R377_ROOT/vendor/engine"
# generates data/config/{public,private}.pem and prints TS-style n/e:
npx tsx tools/server/rsa.ts
# (or whatever npm script wraps that file in your branch)
```

Then **update the Java client** so:

- printed **modulus** → `LOGIN_RSAN`
- printed **exponent** → `LOGIN_RSAE`

Mismatch symptoms: engine path comments “RSA error” → reply opcode **6** (out of date / fail), login fails.

`.pem` files are gitignored in this workspace (see root `.gitignore`). Do not commit private keys.

---

## 7. Play checklist (Java path)

```text
[ ] Isolation .env applied (NODE_PORT=43595, ENGINE_REVISION=377, NODE_ID=37)
[ ] vendor/engine npm start healthy (smoke-start.md)
[ ] vendor/client-java branch 377; ./gradlew jar or run
[ ] Launch with port-offset 1 (not 0) so client hits 43595
[ ] Title screen loads; create/login account if registration enabled
[ ] Enter world, walk tiles
[ ] If RSA fail (opcode 6): re-check private.pem vs LOGIN_RSAN/E
[ ] Capture notes → a short note / PR description
```

---

## 8. Related

- [`isolation.md`](isolation.md) — ports / forbidden paths  
- [`smoke-start.md`](smoke-start.md) — engine start  
- [`vendor-layout.md`](vendor-layout.md) — vendor inventory  
- Engine README “Client” section — points at Client-Java + example `10 0 highmem members 32`  
- `vendor/Server/start.js` — `Run Java Client` / `Build Java Client` menu actions  
