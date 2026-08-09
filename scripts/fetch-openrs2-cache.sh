#!/usr/bin/env bash
# Fetch OpenRS2 cache id 657 (RS2 build 377) into cache/openrs2-377/.
# Does NOT commit anything. Blobs stay gitignored.
#
# Usage:
#   bash scripts/fetch-openrs2-cache.sh
#   bash scripts/fetch-openrs2-cache.sh --disk-only
#   DEST=/path/to/dir bash scripts/fetch-openrs2-cache.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${DEST:-$ROOT/cache/openrs2-377}"
BASE="https://archive.openrs2.org/caches/runescape/657"
DISK_ONLY=0
for a in "$@"; do
  case "$a" in
    --disk-only) DISK_ONLY=1 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
  esac
done

mkdir -p "$DEST"
cd "$DEST"

echo "==> OpenRS2 cache 657 (RS2 build 377) → $DEST"
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
  cat > SHA256SUMS.txt <<'EOF'
# Expected (workspace research; re-verify against OpenRS2 if needed)
5467efe75598a77f6f8d1960178cc21ad32c17613143f8aeabfcdfd23a172ed4  disk.zip
bbd89e5e4bb81a15f35525ce7da25e2e855578602b2d298f7d2885a46b0f96c1  flat-file.tar.gz
5984eac0c5c6d947241e29dd5671b81a1546cedf77e08d38438ac47029969afa  keys.json
EOF
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
