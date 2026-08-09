#!/usr/bin/env bash
# export-public-workspace.sh — Decision 011 thin public tree
#
# Copies a curated subset of the private vault into DEST for a public
# GitHub remote. Does NOT rewrite private history. Does NOT flip visibility.
#
# Usage:
#   bash scripts/export-public-workspace.sh /path/to/rs2-r377-workspace-public
#   DEST=/tmp/rs2-r377-public bash scripts/export-public-workspace.sh
#
# After export: cd DEST && git init/add/commit && push to public remote.
# Review `git status` and tree size before first public push.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-${DEST:-}}"

if [[ -z "${DEST}" ]]; then
  echo "usage: $0 /path/to/public-export-dir" >&2
  echo "   or: DEST=/path/to/dir $0" >&2
  exit 2
fi

if [[ "${DEST}" == "${ROOT}" ]]; then
  echo "REFUSE: DEST must not be the private vault root" >&2
  exit 1
fi

mkdir -p "${DEST}"

echo "==> export from private vault:"
echo "    ${ROOT}"
echo "    → ${DEST}"

# --- helpers ---
copy_file() {
  local rel="$1"
  local src="${ROOT}/${rel}"
  local dst="${DEST}/${rel}"
  if [[ ! -e "${src}" ]]; then
    echo "  skip missing: ${rel}"
    return 0
  fi
  mkdir -p "$(dirname "${dst}")"
  cp -a "${src}" "${dst}"
  echo "  + ${rel}"
}

copy_dir_filtered() {
  # copy tree but skip heavy/private patterns via rsync excludes
  local rel="$1"
  shift
  local src="${ROOT}/${rel}"
  local dst="${DEST}/${rel}"
  if [[ ! -d "${src}" ]]; then
    echo "  skip missing dir: ${rel}"
    return 0
  fi
  mkdir -p "${dst}"
  rsync -a \
    --exclude '.git/' \
    --exclude 'node_modules/' \
    --exclude '.tmp/' \
    --exclude '.DS_Store' \
    --exclude '**/.DS_Store' \
    --exclude '*.png' \
    --exclude '*.jpg' \
    --exclude '*.webp' \
    --exclude '*.map' \
    "$@" \
    "${src}/" "${dst}/"
  echo "  + ${rel}/ (filtered)"
}

# --- root public surface ---
for f in \
  README.md \
  AGENT_BRIEF.md \
  AGENTS.md \
  NOTICE.md \
  LICENSE \
  CONTRIBUTING.md \
  ; do
  copy_file "${f}"
done

# PLAN.md is operator-dense — omit from thin public export (Decision 011).
# Full private COLD_START / AGENTS-OPERATOR are NOT exported.

# --- decisions (fences only; all small) ---
mkdir -p "${DEST}/docs/decisions"
for f in "${ROOT}"/docs/decisions/*.md; do
  [[ -f "$f" ]] || continue
  copy_file "docs/decisions/$(basename "$f")"
done

# --- authenticity + provenance pins (allowed research extracts) ---
copy_file "docs/research/authenticity-stance.md"
copy_file "docs/research/PROVENANCE-UPSTREAM-PINS.md"

# Optional short public README for docs/
mkdir -p "${DEST}/docs"
cat > "${DEST}/docs/README.md" <<'EOF'
# Docs (public surface)

This public tree ships a **thin** documentation set only.

| Included | Not included |
|----------|----------------|
| Decisions (fences, branding, public surface) | Session plans / thrash logs |
| Authenticity stance | Full research corpus / readiness XL |
| Root `AGENT_BRIEF.md` | Gap dumps, COLD_START, operator paths |

**Private vault** (operator) holds the full process corpus. See Decision **011**.
EOF
echo "  + docs/README.md (generated)"

# --- thin runbooks if present (isolation only preferred) ---
if [[ -d "${ROOT}/docs/runbooks" ]]; then
  mkdir -p "${DEST}/docs/runbooks"
  for name in isolation.md smoke-start.md harness.md vendor-layout.md playable.md client-ts.md; do
    if [[ -f "${ROOT}/docs/runbooks/${name}" ]]; then
      copy_file "docs/runbooks/${name}"
    fi
  done
fi

# --- scripts (automation; no secrets) ---
if [[ -d "${ROOT}/scripts" ]]; then
  copy_dir_filtered "scripts"
fi

# --- harness toys (code only; no shots) ---
if [[ -d "${ROOT}/tools" ]]; then
  copy_dir_filtered "tools" \
    --exclude '**/harness-shots/**' \
    --exclude '**/*.png' \
    --exclude '**/*.log'
fi

# --- vendor index only (not full clones) ---
if [[ -f "${ROOT}/vendor/README.md" ]]; then
  mkdir -p "${DEST}/vendor"
  copy_file "vendor/README.md"
fi

# --- cache guide only (no blobs; gitignore keeps zips out of vault git) ---
if [[ -f "${ROOT}/cache/README.md" ]]; then
  mkdir -p "${DEST}/cache"
  copy_file "cache/README.md"
fi

# --- GitHub issue templates (public invite for scoped context) ---
if [[ -d "${ROOT}/.github" ]]; then
  copy_dir_filtered ".github"
fi

# --- guardrails: refuse to copy private bulk if present as mistake ---
for bad in docs/plans docs/gap docs/context docs/superpowers docs/research/CORPUS_DIGEST.md; do
  if [[ -e "${DEST}/${bad}" ]]; then
    echo "REFUSE: private path leaked into DEST: ${bad}" >&2
    exit 1
  fi
done

# Strip absolute laptop paths from exported markdown (best-effort)
if command -v rg >/dev/null 2>&1; then
  while IFS= read -r -d '' f; do
    # macOS sed
    sed -i '' \
      -e 's|$RS2_R377_ROOT|$RS2_R377_ROOT|g' \
      -e 's|$RS2_R377_ROOT|$RS2_R377_ROOT|g' \
      "$f" 2>/dev/null || true
  done < <(find "${DEST}" -type f \( -name '*.md' -o -name '*.mjs' -o -name '*.ts' -o -name '*.sh' \) -print0 2>/dev/null)
fi

# Manifest
{
  echo "# Public export manifest"
  echo
  echo "Source private vault: (not recorded — fill at push time)"
  echo "Generated: $(date -u +%Y-%m-%dT%H:%MZ)"
  echo "Policy: Decision 011 — thin surface only"
  echo
  echo '```'
  (cd "${DEST}" && find . -type f | sort | head -500)
  echo '```'
} > "${DEST}/PUBLIC_EXPORT.md"
echo "  + PUBLIC_EXPORT.md"

echo
echo "==> export OK"
echo "    files: $(find "${DEST}" -type f | wc -l | tr -d ' ')"
echo "    size:  $(du -sh "${DEST}" | awk '{print $1}')"
echo
echo "Next:"
echo "  cd \"${DEST}\""
echo "  # review tree; init git if needed; push to public remote"
echo "  # do NOT copy docs/plans or full research back in"
echo
echo "Still private (not exported): docs/plans, docs/research (except authenticity-stance),"
echo "  docs/gap, docs/context, CORPUS_DIGEST, harness shots, vendor product trees"
