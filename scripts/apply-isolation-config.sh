#!/usr/bin/env bash
# Apply isolated ports + revision for this workspace only.
# Does not touch live Server / rs2b2t-engine / rs2b0t.
#
# Java client couples HTTP and game ports via the same portOffset:
#   HTTP  = portOffset + 80
#   game  = portOffset + 43594
# With client args "37 1 highmem members 32" → WEB=81, GAME=43595.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENGINE_DIR="${ROOT}/vendor/engine"
ENV_FILE="${ENGINE_DIR}/.env"
WORLD_JSON="${ENGINE_DIR}/data/config/world.json"
SERVER_JSON="${ROOT}/vendor/Server/server.json"

if [[ ! -d "${ENGINE_DIR}" ]]; then
  echo "missing ${ENGINE_DIR} — clone vendor/engine first" >&2
  exit 1
fi

mkdir -p "${ENGINE_DIR}/data/config"

cat > "${ENV_FILE}" <<'EOF'
# Isolation config for rs2-r377 — Java client portOffset=1
# HTTP = 80+1=81, game = 43594+1=43595. Do not set WEB_PORT=8891.

EASY_STARTUP=true
ENGINE_REVISION=377
WEB_PORT=81
WEB_MANAGEMENT_PORT=8899
NODE_PORT=43595
NODE_ID=37
NODE_DEBUG=true
# Debug thrash: suppress genie/MOM/swarm/skill macros (afk_event). Default true in engine.
# Set NODE_RANDOM_EVENTS=true for authentic randoms. Isolation-only — not product authenticity.
NODE_RANDOM_EVENTS=false
BUILD_SRC_DIR=../content
BUILD_STARTUP=true
# TBWT (and other) free-ID varp appends change authentic CRC — keep pack working until reconciled.
BUILD_VERIFY=false
LOGIN_SERVER=false
LOGIN_PORT=43600
FRIEND_SERVER=false
FRIEND_PORT=45199
LOGGER_SERVER=false
LOGGER_PORT=43601
EOF
echo "wrote ${ENV_FILE}"

python3 - <<'PY' "${WORLD_JSON}"
import json, sys
path = sys.argv[1]
cfg = {
    "easyStartup": True,
    "website": {"registration": True},
    "web": {
        "port": 81,
        "allowedOrigin": "",
        "managementPort": 8899,
    },
    "engine": {"revision": 377},
    "node": {
        "id": 37,
        "port": 43595,
        "members": True,
        "autoSubscribeMembers": True,
        "xpRate": 1,
        "production": False,
        "minimumWealthValueEvent": 10,
        "debug": True,
        "debugProfile": False,
        "clientRoutefinder": True,
        "profile": "main",
        "maxConnected": 1000,
        "debugProcChar": "~",
        "hopTime": 45000,
        "rateLimitAddressLogin": 30,
        "rateLimitDeviceLogin": 5,
    },
    "login": {"enabled": False, "host": "localhost", "port": 43600},
    "friend": {"enabled": False, "host": "localhost", "port": 45199},
    "logger": {"enabled": False, "host": "localhost", "port": 43601},
    "db": {
        "backend": "sqlite",
        "host": "localhost",
        "port": 3306,
        "user": "root",
        "pass": "password",
        "name": "lostcity",
        "verbose": False,
    },
    "build": {
        "verbose": False,
        "startup": True,
        "verify": True,
        "verifyFolder": True,
        "verifyPack": True,
        "liveReload": True,
        "srcDir": "../content",
    },
}
with open(path, "w") as f:
    json.dump(cfg, f, indent=4)
    f.write("\n")
print(f"wrote {path}")
PY

if [[ -d "${ROOT}/vendor/Server" ]]; then
  printf '%s\n' '{' '  "rev": "377"' '}' > "${SERVER_JSON}"
  echo "wrote ${SERVER_JSON}"
fi

echo "Isolation config applied: web=81 game=43595 mgmt=8899 rev=377 node_id=37"
echo "Client: ./gradlew run --args=\"37 1 highmem members 32\""
echo "Next: cd vendor/engine && npm start"
