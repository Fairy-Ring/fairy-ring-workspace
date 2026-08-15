#!/usr/bin/env bash
# closeout-public.sh — operator-asked public nightcap
#
#   bash scripts/closeout-public.sh
#   bash scripts/closeout-public.sh --vendor   # also push FR-content/engine/client-ts if ahead
#
# Always (when asked to update public):
#   1. Thin export → fairy-ring-workspace + commit/push rs2-r377
#   2. Org Pages board → Fairy-Ring.github.io + commit/push main
#
# Before this: refresh docs/export/progress/index.html if gap 003 flipped
# (RED / SPINE / SHIP e2e walk). No smoke account ids on the board.
#
# Does NOT push LostCityRS. Vault origin is private — push that with commits,
# not from this script (unless the working tree is already clean).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDOR=0
for arg in "$@"; do
  case "$arg" in
    --vendor) VENDOR=1 ;;
    -h|--help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
    *)
      echo "unknown option: $arg" >&2
      exit 2
      ;;
  esac
done

WORKSPACE_DEST="${WORKSPACE_DEST:-${ROOT}/../fairy-ring-workspace}"
PAGES_DEST="${FR_PAGES_DIR:-${ROOT}/../Fairy-Ring.github.io}"

if [[ ! -f "${ROOT}/docs/export/progress/index.html" ]]; then
  echo "REFUSE: missing docs/export/progress/index.html — refresh the board from gap 003 first" >&2
  exit 1
fi

echo "==> closeout: thin workspace export"
bash "${ROOT}/scripts/export-public-workspace.sh" "${WORKSPACE_DEST}"
cd "${WORKSPACE_DEST}"
if git diff --quiet && git diff --cached --quiet; then
  echo "fairy-ring-workspace already matches"
else
  git add -A
  git commit -m "$(cat <<'EOF'
Thin export: public closeout (countdown + Decision 011 surface).
EOF
)"
  git push origin HEAD
fi
git log -1 --oneline

echo "==> closeout: org Pages board"
FR_PAGES_DIR="${PAGES_DEST}" bash "${ROOT}/scripts/publish-public-board.sh" --push

if [[ "${VENDOR}" -eq 1 ]]; then
  echo "==> closeout: vendor private remotes (if ahead)"
  for tree in content engine client-ts; do
    dir="${ROOT}/vendor/${tree}"
    [[ -d "${dir}/.git" ]] || continue
    if git -C "${dir}" rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
      ahead="$(git -C "${dir}" rev-list --count '@{u}..HEAD' 2>/dev/null || echo 0)"
    else
      ahead="$(git -C "${dir}" rev-list --count 'private/rs2-r377..HEAD' 2>/dev/null || echo 0)"
    fi
    if [[ "${ahead}" =~ ^[1-9] ]]; then
      echo "  push vendor/${tree} private rs2-r377 (ahead ${ahead})"
      git -C "${dir}" push private rs2-r377
    else
      echo "  vendor/${tree} not ahead"
    fi
  done
fi

echo "==> closeout OK"
echo "  workspace: ${WORKSPACE_DEST}"
echo "  pages:     ${PAGES_DEST} → https://fairy-ring.github.io/"
