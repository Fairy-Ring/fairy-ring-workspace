#!/usr/bin/env bash
# Compile vendor/content RuneScript only. Does not PackAll / wipe cache.
# After this: in-game ::reload (not ::rebuild — rebuild is packAll).
#
#   bash scripts/compile-scripts-only.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENGINE="${ROOT}/vendor/engine"
TS="${ENGINE}/tools/compile-scripts-only.ts"

if [[ ! -d "${ENGINE}" ]]; then
  echo "missing ${ENGINE} — clone vendor/engine first" >&2
  exit 1
fi
if [[ ! -f "${TS}" ]]; then
  echo "missing ${TS} — engine compile-scripts-only entry" >&2
  exit 1
fi

cd "${ENGINE}"
export BUILD_SRC_DIR="${BUILD_SRC_DIR:-../content}"
# Must run this .ts from vendor/engine (type:module). A vault-root
# entry or `tsx -e` hits BZip2 top-level-await CJS and fails.
npx tsx tools/compile-scripts-only.ts
ls -l data/pack/server/script.dat
