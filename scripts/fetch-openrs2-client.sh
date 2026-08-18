#!/usr/bin/env bash
# Fetch an OpenRS2 *game client* (not cache) into research/jars/<build>/.
# Blobs stay gitignored. Does not deob.
#
# Usage:
#   bash scripts/fetch-openrs2-client.sh 410
#   bash scripts/fetch-openrs2-client.sh 410 --unpack   # needs JDK 8 unpack200
#   bash scripts/fetch-openrs2-client.sh 418            # pack200 32186
#   bash scripts/fetch-openrs2-client.sh 419            # pack200 32184
#   bash scripts/fetch-openrs2-client.sh 422            # packclass 32244 (no pack200/jar)
#   bash scripts/fetch-openrs2-client.sh 468            # jar 31163 (OSRS-base / 10 Aug 2007 cache)
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
# Prefer pack200 (410/413/414/418/419) or the large unpacked jar (412).
# 422 is packclass-only on the catalog — pin that; do not invent a jar.
# Loaders are not the deob target.
case "$BUILD" in
  410)
    GAME_ID=32256
    LOADERS=(31737 33229)
    FORMAT=pack200
    DOC="docs/research/client-410-openrs2-32256.md"
    ;;
  412)
    GAME_ID=32963
    LOADERS=(31728 32961)
    FORMAT=jar
    DOC="docs/research/client-412-openrs2-32963.md"
    ;;
  413)
    GAME_ID=33773
    LOADERS=(31722 33223)
    FORMAT=pack200
    DOC="docs/research/client-413-openrs2-33773.md"
    ;;
  414)
    GAME_ID=32210
    LOADERS=(33226 31730)
    FORMAT=pack200
    DOC="docs/research/client-414-openrs2-32210.md"
    ;;
  418)
    GAME_ID=32186
    LOADERS=(33232 31639)
    FORMAT=pack200
    DOC="docs/research/client-418-openrs2-32186.md"
    ;;
  419)
    GAME_ID=32184
    LOADERS=(31742)
    FORMAT=pack200
    DOC="docs/research/client-419-openrs2-32184.md"
    ;;
  422)
    GAME_ID=32244
    LOADERS=(33198 31638)
    FORMAT=packclass
    DOC="docs/research/horizon/client-422-openrs2-32244.md"
    ;;
  468)
    # OSRS-base family. Cache OpenRS2 633 = 2007-08-10. Client catalog 2007-08-08.
    # Prefer the already-unpacked game jar (31163). pack200 32141 is the twin stream.
    GAME_ID=31163
    LOADERS=(31131 31850 33083)
    FORMAT=jar
    DOC="docs/research/horizon/client-468-openrs2-31163.md"
    PACK200_ID=32141
    ;;
  *)
    echo "unknown build $BUILD (known: 410, 412, 413, 414, 418, 419, 422, 468)." >&2
    exit 2
    ;;
esac

PACK200_ID="${PACK200_ID:-}"
if [[ "$FORMAT" == "packclass" ]]; then
  GAME_FILE="client-${BUILD}-packclass.dat"
elif [[ "$BUILD" == "468" ]]; then
  # Catalog already-unpacked game jar. Do not reuse the 412 pack200.dat filename.
  GAME_FILE="client-${BUILD}.jar.dat"
else
  # 412 is already a JAR; filename is a script convention, not a format claim.
  GAME_FILE="client-${BUILD}-pack200.dat"
fi

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

fetch "$GAME_ID" "$GAME_FILE"
if [[ -n "$PACK200_ID" ]]; then
  fetch "$PACK200_ID" "client-${BUILD}-pack200.dat"
fi
for id in "${LOADERS[@]}"; do
  fetch "$id" "loader-${BUILD}-${id}.jar.dat"
done
# Catalog jar is already a ZIP. Copy to the name extract_strings / CFR expect.
if [[ "$FORMAT" == "jar" ]]; then
  if [[ ! -f "client-${BUILD}.jar" ]]; then
    cp "$GAME_FILE" "client-${BUILD}.jar"
    echo "  copied $GAME_FILE → client-${BUILD}.jar"
  fi
fi

if [[ "$UNPACK" -eq 1 ]]; then
  if [[ "$FORMAT" != "pack200" ]]; then
    echo "cannot --unpack format=$FORMAT (build $BUILD). Leave $GAME_FILE on disk." >&2
    echo "Do not invent a jar/unpack path for this format." >&2
    exit 3
  fi
  python3 "$ROOT/scripts/unpack-openrs2-pack200.py" \
    "$GAME_FILE" -o "client-${BUILD}.pack200"
  UNPACK200="${UNPACK200:-}"
  if [[ -z "$UNPACK200" ]]; then
    UNPACK200=$(find "$ROOT/research/deob/tools" -name unpack200 -type f 2>/dev/null | head -1 || true)
  fi
  if [[ -z "$UNPACK200" ]] || [[ ! -x "$UNPACK200" ]]; then
    echo "need JDK 8 unpack200 (Java 14+ removed it). Leaving pack200 on disk." >&2
    echo "  UNPACK200=/path/to/jdk8/bin/unpack200 $0 $BUILD --unpack" >&2
    exit 3
  fi
  "$UNPACK200" "client-${BUILD}.pack200" "client-${BUILD}.jar"
  echo "==> jar $(wc -c < "client-${BUILD}.jar") bytes"
fi

echo
echo "Loaders (${LOADERS[*]:-none}) are signed Jagex *applets*, not the game client."
echo "Game blob is $GAME_FILE (OpenRS2 ${GAME_ID}, format=${FORMAT})."
if [[ "$FORMAT" == "pack200" ]]; then
  echo "Unwrap: --unpack → client-${BUILD}.pack200 → client-${BUILD}.jar"
fi
echo "See $DOC"
