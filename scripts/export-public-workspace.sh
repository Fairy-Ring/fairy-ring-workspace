#!/usr/bin/env bash
# export-public-workspace.sh — Decision 011 thin public tree
#
# Copies a curated subset of the private vault into DEST for a public
# GitHub remote. Does NOT rewrite private history. Does NOT flip visibility.
#
# Usage:
#   bash scripts/export-public-workspace.sh /path/to/fairy-ring-export
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

# Public-safe gitignore (never leave DEST without one — thin replace drops remote .git only)
if [[ -f "${ROOT}/.gitignore" ]]; then
  # Prefer a curated public ignore if present later; for now write explicit thin ignores
  :
fi
cat > "${DEST}/.gitignore" <<'EOF'
node_modules/
.tmp/
.env
*.pem
docs/plans/
docs/gap/
docs/context/
docs/superpowers/
docs/research/CORPUS_DIGEST.md
**/harness-shots/
cache/openrs2-*/
cache/unpacked/
vendor/content/
vendor/engine/
vendor/client-ts/
vendor/Server/
vendor/client-java*/
EOF
echo "  + .gitignore (public thin)"

# PLAN.md is operator-dense — omit from thin public export (Decision 011).
# Full private COLD_START / AGENTS-OPERATOR are NOT exported.

# --- decisions (fences only; all small) ---
mkdir -p "${DEST}/docs/decisions"
for f in "${ROOT}"/docs/decisions/*.md; do
  [[ -f "$f" ]] || continue
  copy_file "docs/decisions/$(basename "$f")"
done

# --- authenticity + provenance + deviations (allowed research extracts) ---
copy_file "docs/research/authenticity-stance.md"
copy_file "docs/research/PROVENANCE-UPSTREAM-PINS.md"
copy_file "docs/research/deviations.md"
copy_file "docs/research/softpass.md"

# Optional short public README for docs/
mkdir -p "${DEST}/docs"
cat > "${DEST}/docs/README.md" <<'EOF'
# Docs (contributor surface)

This tree ships a **thin** documentation set only.

| Included | Not included by default |
|----------|-------------------------|
| Decisions (fences, branding, thin surface) | Session thrash plans |
| Authenticity stance | Full readiness XL / port dumps |
| **Deviations** + **softpass** ledgers | Gap dumps / private cold-start notes |
| Root `AGENT_BRIEF.md` | Harness screenshot archives |

Need depth on a **named** unit? Open a GitHub issue — Decision **011**.
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

# Strip absolute laptop paths + legacy brand crumbs + private-vault tailoring (best-effort)
while IFS= read -r -d '' f; do
  # macOS sed; GNU sed: sed -i''
  sed -i '' \
    -e 's|/Users/acfrazier/experiments/LC-rs2-r377-2006-05-02|$RS2_R377_ROOT|g' \
    -e 's|/Users/acfrazier/experiments/LC-rs2-r277-2006-05-02|$RS2_R377_ROOT|g' \
    -e 's|/Users/acfrazier/code/rs2b2t-engine|$RS2B2T_ENGINE_REF|g' \
    -e 's|/Users/acfrazier/experiments/Server|$RS2_LIVE_SERVER_REF|g' \
    -e 's|/Users/acfrazier/experiments/rs2b0t|$RS2B0T_REF|g' \
    -e 's|export LC377_ROOT=|export RS2_R377_ROOT=|g' \
    -e 's|"$LC377_ROOT"|"$RS2_R377_ROOT"|g' \
    -e 's|\$LC377_ROOT|$RS2_R377_ROOT|g' \
    -e 's|LC-rs2-r377-2006-05-02|fairy-ring-workspace|g' \
    -e 's|LC-rs2-r277-2006-05-02|fairy-ring-workspace|g' \
    -e 's|rs2-r377-workspace|fairy-ring-workspace|g' \
    -e 's|LC-rs2-r377|rs2-r377|g' \
    -e 's|`LC377_ROOT`|`RS2_R377_ROOT`|g' \
    -e 's|https://github.com/acfrazier/FR-vault|*(maintainer process backup — not required for contributors)*|g' \
    -e 's|FR-vault (**private**)|maintainer process backup (not required)|g' \
    -e 's|private vault|full process notes (if you maintain them)|g' \
    -e 's|Private vault|Full process notes|g' \
    -e 's|operator machine|maintainer machine|g' \
    -e 's|operator call|maintainer call|g' \
    -e 's|the operator|maintainers|g' \
    -e 's|Operator / |Maintainer / |g' \
    "$f" 2>/dev/null || true
done < <(find "${DEST}" -type f \( -name '*.md' -o -name '*.mjs' -o -name '*.ts' -o -name '*.sh' -o -name '*.js' \) -print0 2>/dev/null)

# Manifest
{
  echo "# Public export manifest"
  echo
  echo "Source: contributor surface export (Decision 011)"
  echo "Generated: $(date -u +%Y-%m-%dT%H:%MZ)"
  echo "Policy: thin surface — authenticity, deviations, fences; no thrash dump"
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
echo "  # Push to fairy-ring-workspace branch rs2-r377 (not main)."
echo "  # main is the Fairy Ring hub stub only."
echo "  # do NOT copy docs/plans or full research back in"
echo
echo "Not exported: docs/plans, full research corpus (except stance/deviations/pins),"
echo "  docs/gap, docs/context, CORPUS_DIGEST, harness shots, vendor product trees"
