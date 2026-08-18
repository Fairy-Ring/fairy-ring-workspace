#!/usr/bin/env bash
# Pack vendor/content dbrow.dat / dbtable.dat only. Does not wipe main_file_cache.
# After this: restart the engine (dbrow is startup config) and
#   bash scripts/compile-scripts-only.sh  if scripts also changed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENGINE="${ROOT}/vendor/engine"

if [[ ! -f "${ENGINE}/tools/pack-dbrow-only.ts" ]]; then
  echo "missing ${ENGINE}/tools/pack-dbrow-only.ts" >&2
  exit 1
fi

cd "${ENGINE}"
export BUILD_SRC_DIR="${BUILD_SRC_DIR:-../content}"
npx tsx tools/pack-dbrow-only.ts
ls -l data/pack/server/dbrow.dat
