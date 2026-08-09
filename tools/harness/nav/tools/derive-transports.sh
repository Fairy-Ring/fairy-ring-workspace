#!/bin/sh
# Regenerate transport graph data for LC-rs2-r377 from this engine + content.
#
# Order matches rs2b0t tools/nav/derive-transports.sh:
#   1. derive-stairs.ts  → stairEdges.json (stairs.rs2 + generic ladder locs)
#   2. derive-ladders.py → merge scripted ladders into transports + stairs
#   3. enrich-transports.py → bind locId/locX/locZ/options from 377 content maps
#
# doors.json is separate (derive-doors.ts) — re-run when wall locs move.
#
# Usage (from repo root):
#   export LC377_ROOT=$RS2_R377_ROOT
#   bash tools/harness/nav/tools/derive-transports.sh
#   # optional: also doors
#   bun tools/harness/nav/tools/derive-doors.ts
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../../../.." && pwd)
NAV="$ROOT/tools/harness/nav"
ENGINE_DIR=${ENGINE_DIR:-"$ROOT/vendor/engine"}
CONTENT_DIR=${CONTENT_DIR:-"$ROOT/vendor/content"}
PACK_PATH=${NAV_PACK_PATH:-"$NAV/out/collision.lcnav.gz"}
DATA_DIR=${NAV_DATA_DIR:-"$NAV/data"}

if [ ! -d "$ENGINE_DIR/data/pack/server" ]; then
    echo "ENGINE_DIR missing pack: $ENGINE_DIR" >&2
    exit 2
fi
if [ ! -d "$CONTENT_DIR/scripts" ]; then
    echo "CONTENT_DIR missing scripts: $CONTENT_DIR" >&2
    exit 2
fi
if [ ! -f "$PACK_PATH" ]; then
    echo "collision pack missing: $PACK_PATH" >&2
    echo "build first: bun tools/harness/nav/tools/build-collision.ts --engine $ENGINE_DIR --out $PACK_PATH" >&2
    exit 2
fi

echo "== derive-stairs (engine=$ENGINE_DIR content=$CONTENT_DIR pack=$PACK_PATH) =="
bun "$NAV/tools/derive-stairs.ts" \
    --engine "$ENGINE_DIR" \
    --content "$CONTENT_DIR" \
    --pack "$PACK_PATH" \
    --data-dir "$DATA_DIR" \
    --out "$DATA_DIR/stairEdges.json"

echo "== derive-ladders =="
python3 "$NAV/tools/derive-ladders.py" \
    --engine "$ENGINE_DIR" \
    --content "$CONTENT_DIR" \
    --pack "$PACK_PATH" \
    --data-dir "$DATA_DIR"

echo "== enrich-transports =="
python3 "$NAV/tools/enrich-transports.py" \
    --content "$CONTENT_DIR" \
    --data-dir "$DATA_DIR"

echo "done. data in $DATA_DIR"
ls -la "$DATA_DIR/doors.json" "$DATA_DIR/transports.json" "$DATA_DIR/stairEdges.json" 2>/dev/null || true
