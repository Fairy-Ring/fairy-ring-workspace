#!/usr/bin/env bash
# Fetch an OpenRS2 RS2 cache into cache/openrs2-<build>/.
# Does NOT commit anything. Blobs stay gitignored.
#
# Usage:
#   bash scripts/fetch-openrs2-cache.sh           # 377 / OpenRS2 657
#   bash scripts/fetch-openrs2-cache.sh 410       # 410 / OpenRS2 1254
#   bash scripts/fetch-openrs2-cache.sh 412       # 412 / OpenRS2 1221
#   bash scripts/fetch-openrs2-cache.sh 413       # 413 / OpenRS2 1386
#   bash scripts/fetch-openrs2-cache.sh 414       # 414 / OpenRS2 231
#   bash scripts/fetch-openrs2-cache.sh 418       # 418 / OpenRS2 1658
#   bash scripts/fetch-openrs2-cache.sh 419       # 419 / OpenRS2 1656
#   bash scripts/fetch-openrs2-cache.sh 422       # 422 / OpenRS2 1193
#   bash scripts/fetch-openrs2-cache.sh --disk-only
#   DEST=/path/to/dir OPENRS2_ID=1254 bash scripts/fetch-openrs2-cache.sh 410
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="${BUILD:-377}"
DISK_ONLY=0
for a in "$@"; do
  case "$a" in
    --disk-only) DISK_ONLY=1 ;;
    -h|--help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    ''|*[!0-9]*)
      echo "unknown arg: $a" >&2
      exit 2
      ;;
    *) BUILD="$a" ;;
  esac
done

case "$BUILD" in
  377) DEFAULT_ID=657 ;;
  410) DEFAULT_ID=1254 ;;
  412) DEFAULT_ID=1221 ;;
  413) DEFAULT_ID=1386 ;;
  414) DEFAULT_ID=231 ;;
  418) DEFAULT_ID=1658 ;;
  419) DEFAULT_ID=1656 ;;
  422) DEFAULT_ID=1193 ;;
  *)
    echo "unknown build $BUILD (known: 377, 410, 412, 413, 414, 418, 419, 422). Set OPENRS2_ID=… explicitly." >&2
    if [[ -z "${OPENRS2_ID:-}" ]]; then
      exit 2
    fi
    DEFAULT_ID=""
    ;;
esac

OPENRS2_ID="${OPENRS2_ID:-$DEFAULT_ID}"
DEST="${DEST:-$ROOT/cache/openrs2-${BUILD}}"
BASE="https://archive.openrs2.org/caches/runescape/${OPENRS2_ID}"

mkdir -p "$DEST"
cd "$DEST"

echo "==> OpenRS2 cache ${OPENRS2_ID} (RS2 build ${BUILD}) → $DEST"
echo "    Detail: $BASE"
echo "    NEVER commit these files to git (see cache/README.md)"
echo

fetch() {
  local url="$1" out="$2"
  if [[ -f "$out" ]]; then
    echo "  skip (exists): $out"
    return 0
  fi
  echo "  get $out"
  curl -fL --retry 3 --retry-delay 2 -o "$out.partial" "$url"
  mv "$out.partial" "$out"
}

fetch "$BASE/disk.zip" "disk.zip"
if [[ "$DISK_ONLY" -eq 0 ]]; then
  fetch "$BASE/flat-file.tar.gz" "flat-file.tar.gz"
  fetch "$BASE/keys.json" "keys.json"
fi

if [[ ! -f SHA256SUMS.txt ]]; then
  case "$BUILD" in
    377)
      cat > SHA256SUMS.txt <<'EOF'
# OpenRS2 657 = RS2 377. Re-verify against OpenRS2 if downloads change.
5467efe75598a77f6f8d1960178cc21ad32c17613143f8aeabfcdfd23a172ed4  disk.zip
bbd89e5e4bb81a15f35525ce7da25e2e855578602b2d298f7d2885a46b0f96c1  flat-file.tar.gz
5984eac0c5c6d947241e29dd5671b81a1546cedf77e08d38438ac47029969afa  keys.json
EOF
      ;;
    410)
      cat > SHA256SUMS.txt <<'EOF'
# OpenRS2 1254 = RS2 410. Measured 2026-08-13.
cbac2b89c893673bf2bc5ccd1fc8af73a702a67deda282cb1b773670fc30d47b  disk.zip
37f229e13047e7a480d5a4d61ee8830d0cb1a6122b345985586c27b3daad7a80  flat-file.tar.gz
cf82943d4afd17b31273e998ae3632cd768dcf89de188de473a622554e74a002  keys.json
EOF
      ;;
  esac
fi

if command -v shasum >/dev/null 2>&1; then
  echo "==> checksum (disk.zip)"
  shasum -a 256 disk.zip | tee disk.zip.sha256
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum disk.zip | tee disk.zip.sha256
fi

echo
echo "==> done. Optional extract:"
echo "    mkdir -p disk && unzip -n disk.zip -d disk"
echo "    # flat: tar -xzf flat-file.tar.gz"
echo
echo "Engine pack still uses vendor/content (BUILD_SRC_DIR=../content)."
echo "This cache is the OpenRS2 authority reference — see cache/README.md"
