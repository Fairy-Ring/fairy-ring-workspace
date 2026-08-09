#!/usr/bin/env bash
# Stop only rs2-r377 harness Playwright smokes — never other projects.
#
# SAFE: matches absolute path under this repo only.
# UNSAFE (do not use from agents):
#   pkill -f playwright
#   pkill -f playwright-harness-profile   # substring can hit other trees
#   lsof -t -iTCP:43595 | xargs kill      # without verifying cwd/cmdline
#   kill ports used by live Server / rs2b0t (43594, etc.)
#
# Usage:
#   bash scripts/kill-harness-smoke.sh           # path-abc + script/run
#   bash scripts/kill-harness-smoke.sh --engine  # also stop THIS tree's engine only
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
# Realpath so alternate workspace folder names still match cmdline
ROOT_REAL="$(cd "$ROOT" && pwd -P 2>/dev/null || echo "$ROOT")"

kill_matching() {
  local label=$1
  shift
  local pids
  pids=$(ps aux | awk -v root="$ROOT" -v real="$ROOT_REAL" '
    BEGIN { IGNORECASE=0 }
    /awk/ { next }
    {
      line = $0
      # require absolute path under this workspace in the command line
      if (index(line, root) == 0 && index(line, real) == 0) next
      for (i = 1; i <= NF; i++) {
        # first field is USER; find command starting after PID/%CPU/…
      }
      # crude: whole line must contain one of the patterns we care about
      print
    }
  ' | while read -r line; do
    # shellcheck disable=SC2086
    echo "$line"
  done)

  # More reliable: pgrep by full path fragment + pattern
  local found=0
  while IFS= read -r pid; do
    [ -z "$pid" ] && continue
    # double-check cmdline contains our root
    local cmd
    cmd=$(ps -p "$pid" -o command= 2>/dev/null || true)
    case "$cmd" in
      *"$ROOT"*|*"$ROOT_REAL"*)
        echo "kill $label pid=$pid :: $cmd"
        kill "$pid" 2>/dev/null || true
        found=1
        ;;
    esac
  # All harness smoke hosts under this tree:
  #   path-abc-smoke, script/run, quest-*-smoke, *-smoke.mjs, cheat/login smokes
  done < <(pgrep -f "$ROOT/tools/harness/(path-abc-smoke|script/run|quest-[a-z0-9-]+-smoke|[a-z0-9-]+-smoke)\.mjs" 2>/dev/null || true)
  # also r277 symlink form / relative path invocations
  while IFS= read -r pid; do
    [ -z "$pid" ] && continue
    local cmd
    cmd=$(ps -p "$pid" -o command= 2>/dev/null || true)
    case "$cmd" in
      *rs2-r377*|*LC-rs2*|*"$ROOT"*|*"$ROOT_REAL"*)
        case "$cmd" in
          *path-abc-smoke*|*script/run.mjs*|*quest-*-smoke.mjs*|*tools/harness/*-smoke.mjs*)
            echo "kill $label pid=$pid :: $cmd"
            kill "$pid" 2>/dev/null || true
            found=1
            ;;
        esac
        ;;
    esac
  done < <(pgrep -f 'path-abc-smoke\.mjs|tools/harness/script/run\.mjs|quest-[a-z0-9-]+-smoke\.mjs|tools/harness/[a-z0-9-]+-smoke\.mjs' 2>/dev/null || true)

  # Chromium only if user-data-dir is THIS repo's profile
  local profile="$ROOT/.tmp/playwright-harness-profile"
  while IFS= read -r pid; do
    [ -z "$pid" ] && continue
    local cmd
    cmd=$(ps -p "$pid" -o command= 2>/dev/null || true)
    case "$cmd" in
      *"$profile"*)
        echo "kill chromium profile pid=$pid"
        kill "$pid" 2>/dev/null || true
        found=1
        ;;
    esac
  done < <(pgrep -f "user-data-dir=$profile" 2>/dev/null || true)

  if [ "$found" -eq 0 ]; then
    echo "no LC377 harness smoke processes matched"
  fi
}

kill_matching "harness-smoke"

if [ "${1:-}" = "--engine" ]; then
  # Only kill node whose cwd/cmdline is vendor/engine under THIS root
  while IFS= read -r pid; do
    [ -z "$pid" ] && continue
    cmd=$(ps -p "$pid" -o command= 2>/dev/null || true)
    case "$cmd" in
      *"$ROOT/vendor/engine"*|*"$ROOT_REAL/vendor/engine"*)
        echo "kill LC377 engine pid=$pid :: $cmd"
        kill "$pid" 2>/dev/null || true
        ;;
    esac
  done < <(pgrep -f 'vendor/engine.*src/app\.ts|tsx/dist/loader.*src/app\.ts' 2>/dev/null || true)
  echo "note: did not touch other engines (e.g. experiments/Server on 43594)"
fi
