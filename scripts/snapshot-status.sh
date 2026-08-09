#!/usr/bin/env bash
# Print vendor branch/SHA + isolation ports for cold-resume agents.
# Safe: read-only except reading config files under this workspace.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== rs2-r377 snapshot ==="
echo "date:    $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "root:    $ROOT"
echo "cwd:     $(pwd)"
echo

print_repo() {
  local name="$1"
  local path="$2"
  echo "--- $name ($path) ---"
  if [[ ! -d "$path" ]]; then
    echo "  MISSING"
    echo
    return
  fi
  if [[ ! -d "$path/.git" && ! -f "$path/.git" ]]; then
    echo "  not a git checkout"
    echo
    return
  fi
  local branch sha short msg track
  branch="$(git -C "$path" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
  sha="$(git -C "$path" rev-parse HEAD 2>/dev/null || echo '?')"
  short="$(git -C "$path" rev-parse --short HEAD 2>/dev/null || echo '?')"
  msg="$(git -C "$path" log -1 --pretty=format:'%s' 2>/dev/null || echo '?')"
  track="$(git -C "$path" status -sb 2>/dev/null | head -1 || true)"
  echo "  branch:  $branch"
  echo "  HEAD:    $sha"
  echo "  short:   $short"
  echo "  subject: $msg"
  echo "  status:  $track"
  git -C "$path" remote -v 2>/dev/null | sed 's/^/  remote:  /' || true
  echo
}

print_repo "engine"  "$ROOT/vendor/engine"
print_repo "content" "$ROOT/vendor/content"
print_repo "Server"  "$ROOT/vendor/Server"

echo "--- isolation ports (expected) ---"
echo "  web:         8891"
echo "  game:        43595"
echo "  management:  8899"
echo "  node id:     37"
echo "  revision:    377"
echo

WORLD_JSON="$ROOT/vendor/engine/data/config/world.json"
ENV_FILE="$ROOT/vendor/engine/.env"
SERVER_JSON="$ROOT/vendor/Server/server.json"

echo "--- config files ---"
if [[ -f "$WORLD_JSON" ]]; then
  echo "  world.json: present"
  if command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY' "$WORLD_JSON"
import json, sys
p = sys.argv[1]
with open(p) as f:
    c = json.load(f)
web = c.get("web", {})
node = c.get("node", {})
eng = c.get("engine", {})
print(f"    web.port={web.get('port')}  managementPort={web.get('managementPort')}")
print(f"    node.port={node.get('port')}  node.id={node.get('id')}")
print(f"    engine.revision={eng.get('revision')}")
print(f"    build.srcDir={c.get('build', {}).get('srcDir')}")
print(f"    easyStartup={c.get('easyStartup')}")
PY
  fi
else
  echo "  world.json: MISSING ($WORLD_JSON)"
fi

if [[ -f "$ENV_FILE" ]]; then
  echo "  .env: present (377-wip Environment.ts reads this)"
  grep -E '^(WEB_PORT|WEB_MANAGEMENT_PORT|NODE_PORT|NODE_ID|ENGINE_REVISION|BUILD_SRC_DIR|EASY_STARTUP)=' "$ENV_FILE" 2>/dev/null | sed 's/^/    /' || true
else
  echo "  .env: MISSING — 377-wip will use Environment.ts defaults (game port 43594, web 80 on macOS)"
fi

if [[ -f "$SERVER_JSON" ]]; then
  echo "  server.json: $(tr -d '\n' < "$SERVER_JSON")"
else
  echo "  server.json: MISSING"
fi
echo

echo "--- cache ---"
CACHE="$ROOT/cache/openrs2-377"
if [[ -d "$CACHE" ]]; then
  du -sh "$CACHE" 2>/dev/null | sed 's/^/  /'
  for f in disk.zip flat-file.tar.gz keys.json SHA256SUMS.txt; do
    if [[ -e "$CACHE/$f" ]]; then
      ls -lh "$CACHE/$f" | awk '{print "  " $5, $9}'
    else
      echo "  missing $f"
    fi
  done
  if [[ -d "$CACHE/disk/cache" ]]; then
    echo "  disk/cache: extracted"
  else
    echo "  disk/cache: not extracted"
  fi
else
  echo "  cache/openrs2-377: MISSING"
fi
echo

echo "--- forbidden live trees (must not be CWD) ---"
for p in \
  ${LIVE_SERVER_REF:-} \
  ${RS2B2T_ENGINE_REF:-} \
  ${RS2B0T_REF:-}
do
  if [[ "$PWD" == "$p"* ]]; then
    echo "  FAIL: cwd is under $p"
  else
    echo "  ok: not under $p"
  fi
done
echo

echo "=== end snapshot ==="
