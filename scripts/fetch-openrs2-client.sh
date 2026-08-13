#!/usr/bin/env bash
# Fetch an OpenRS2 *game client* (not cache) into research/jars/<build>/.
# Blobs stay gitignored. Does not deob.
#
# Usage:
#   bash scripts/fetch-openrs2-client.sh 410
#   bash scripts/fetch-openrs2-client.sh 410 --unpack   # needs JDK 8 unpack200
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD=""
UNPACK=0
for a in "$@"; do
  case "$a" in
    --unpack) UNPACK=1 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    ''|*[!0-9]*)
      echo "unknown arg: $a" >&2
      exit 2
      ;;
    *) BUILD="$a" ;;
  esac
done

if [[ -z "$BUILD" ]]; then
  echo "usage: $0 <build> [--unpack]" >&2
  exit 2
fi

# game client id + linked loaders (OpenRS2 /clients/<id>)
case "$BUILD" in
  410)
    GAME_ID=32256
    LOADERS=(31737 33229)
    ;;
  *)
    echo "unknown build $BUILD (known: 410). Set OPENRS2_CLIENT_ID=…" >&2
    exit 2
    ;;
esac

DEST="${DEST:-$ROOT/research/jars/${BUILD}}"
BASE="https://archive.openrs2.org/clients"
mkdir -p "$DEST"
cd "$DEST"

echo "==> OpenRS2 client ${GAME_ID} (RS2 build ${BUILD}) → $DEST"
echo "    NEVER commit these files (research/jars/ is gitignored)"
echo

fetch() {
  local id="$1" out="$2"
  if [[ -f "$out" ]]; then
    echo "  skip (exists): $out"
    return 0
  fi
  echo "  get $out"
  curl -fL --retry 3 --retry-delay 2 -o "$out.partial" "${BASE}/${id}.dat"
  mv "$out.partial" "$out"
}

fetch "$GAME_ID" "client-${BUILD}-pack200.dat"
i=0
for id in "${LOADERS[@]}"; do
  fetch "$id" "loader-${BUILD}-${id}.jar.dat"
  i=$((i + 1))
done

if [[ "$UNPACK" -eq 1 ]]; then
  python3 "$ROOT/scripts/unpack-openrs2-pack200.py" \
    "client-${BUILD}-pack200.dat" -o "client-${BUILD}.pack200"
  UNPACK200="${UNPACK200:-}"
  if [[ -z "$UNPACK200" ]]; then
    UNPACK200=$(find "$ROOT/research/deob/tools" -name unpack200 -type f 2>/dev/null | head -1 || true)
  fi
  if [[ -z "$UNPACK200" ]] || [[ ! -x "$UNPACK200" ]]; then
    echo "need JDK 8 unpack200 (Java 14+ removed it)." >&2
    echo "  UNPACK200=/path/to/jdk8/bin/unpack200 $0 $BUILD --unpack" >&2
    exit 3
  fi
  "$UNPACK200" "client-${BUILD}.pack200" "client-${BUILD}.jar"
  echo "==> jar $(wc -c < "client-${BUILD}.jar") bytes"
fi

echo
echo "Loaders 31737/33229 are signed Jagex *applets*, not the game client."
echo "Game code is client-${BUILD}-pack200.dat → --unpack → client-${BUILD}.jar"
echo "See docs/research/client-410-openrs2-32256.md"
