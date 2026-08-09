#!/usr/bin/env bash
# Build Client-TS and copy into vendor/engine/public for serving on WEB_PORT.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLIENT="$ROOT/vendor/client-ts"
ENGINE_PUB="$ROOT/vendor/engine/public"

cd "$CLIENT"
# Historical RSA defaults match Client-Java 377 and typical LC PEMs; override via env if needed.
export LOGIN_RSAE="${LOGIN_RSAE:-58778699976184461502525193738213253649000149147835990136706041084440742975821}"
export LOGIN_RSAN="${LOGIN_RSAN:-7162900525229798032761816791230527296329313291232324290237849263501208207972894053929065636522363163621000728841182238772712427862772219676577293600221789}"

bun run build

mkdir -p "$ENGINE_PUB/client"
cp -f out/client.js out/client.js.map \
      out/ondemandworker.js out/ondemandworker.js.map \
      out/tinymidipcm.wasm \
      "$ENGINE_PUB/client/" 2>/dev/null || {
  cp -f out/client.js out/ondemandworker.js out/tinymidipcm.wasm "$ENGINE_PUB/client/"
}
# map files optional
cp -f out/client.js.map out/ondemandworker.js.map "$ENGINE_PUB/client/" 2>/dev/null || true

# MIDI soundfont: tinymidipcm fetch() as sibling of client.js via import.meta.url.
# Prefer build out/, else keep existing deploy, else known local reference trees.
SF2_NAME="SCC1_Florestan.sf2"
SF2_DEST="$ENGINE_PUB/client/$SF2_NAME"
SF2_COPIED=0
for candidate in \
  "$CLIENT/out/$SF2_NAME" \
  "$ROOT/assets/$SF2_NAME" \
  "$ROOT/vendor/assets/$SF2_NAME" \
  "/Users/acfrazier/experiments/Server/engine/public/client/$SF2_NAME" \
  "/Users/acfrazier/code/rs2b2t-engine/public/client/$SF2_NAME" \
  "/Users/acfrazier/code/Server/engine/public/client/$SF2_NAME"
do
  if [[ -f "$candidate" && "$candidate" != "$SF2_DEST" ]]; then
    cp -f "$candidate" "$SF2_DEST"
    echo "Copied soundfont from $candidate"
    SF2_COPIED=1
    break
  fi
done
if [[ "$SF2_COPIED" -eq 0 && -f "$SF2_DEST" ]]; then
  echo "Keeping existing soundfont at $SF2_DEST"
elif [[ "$SF2_COPIED" -eq 0 ]]; then
  echo "warn: missing $SF2_NAME — MIDI will fail until soundfont is at $SF2_DEST" >&2
fi

# Keep rs2.html if we authored it at engine public root
if [[ ! -f "$ENGINE_PUB/rs2.html" ]]; then
  echo "warn: missing $ENGINE_PUB/rs2.html" >&2
fi

# Harness attach is tools/ only — never inside client-ts. Copy for ?harness=1 shell.
mkdir -p "$ENGINE_PUB/harness"
if [[ -f "$ROOT/tools/harness/attach-in-page.js" ]]; then
  cp -f "$ROOT/tools/harness/attach-in-page.js" "$ENGINE_PUB/harness/attach-in-page.js"
  echo "Deployed harness attach to $ENGINE_PUB/harness/"
fi

echo "Deployed client to $ENGINE_PUB/client/"
echo "Open: http://127.0.0.1:81/rs2.html  (engine must be running WEB_PORT=81)"
echo "Harness: http://127.0.0.1:81/rs2.html?harness=1  (prefer bun run build:dev for attach)"
