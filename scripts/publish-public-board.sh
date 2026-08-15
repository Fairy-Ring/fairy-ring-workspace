#!/usr/bin/env bash
# publish-public-board.sh — copy the thin 377 countdown onto org GitHub Pages
#
# Vault source: docs/export/progress/{index.html,README.md}
# Dest: Fairy-Ring/Fairy-Ring.github.io → https://fairy-ring.github.io/
#
#   bash scripts/publish-public-board.sh           # copy only
#   bash scripts/publish-public-board.sh --push    # copy + commit + push origin main
#
# Override dest: FR_PAGES_DIR=/path/to/Fairy-Ring.github.io
# Does NOT push LostCityRS. Does NOT export fairy-ring-workspace (see closeout-public.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/docs/export/progress"
PUSH=0
for arg in "$@"; do
  case "$arg" in
    --push) PUSH=1 ;;
    -h|--help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *)
      echo "unknown option: $arg" >&2
      exit 2
      ;;
  esac
done

if [[ ! -f "${SRC}/index.html" || ! -f "${SRC}/README.md" ]]; then
  echo "REFUSE: missing ${SRC}/index.html or README.md" >&2
  exit 1
fi

DEST="${FR_PAGES_DIR:-${ROOT}/../Fairy-Ring.github.io}"
if [[ ! -d "${DEST}/.git" ]]; then
  echo "==> clone Fairy-Ring/Fairy-Ring.github.io → ${DEST}"
  git clone --depth 1 https://github.com/Fairy-Ring/Fairy-Ring.github.io.git "${DEST}"
fi

echo "==> board ${SRC} → ${DEST}"
cp -a "${SRC}/index.html" "${DEST}/index.html"
cp -a "${SRC}/README.md" "${DEST}/README.md"

if [[ "${PUSH}" -eq 0 ]]; then
  echo "copied (no --push). Review:"
  git -C "${DEST}" status -sb
  exit 0
fi

cd "${DEST}"
if git diff --quiet && git diff --cached --quiet; then
  echo "Pages already match (nothing to commit)"
  git status -sb
  exit 0
fi

git add index.html README.md
git commit -m "$(cat <<'EOF'
Refresh 377 countdown board from vault export/progress.

No smoke account ids. Org Pages https://fairy-ring.github.io/
EOF
)"
git push origin HEAD
git log -1 --oneline
git status -sb
