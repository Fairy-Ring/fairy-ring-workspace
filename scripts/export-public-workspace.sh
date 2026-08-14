#!/usr/bin/env bash
# export-public-workspace.sh — Decision 011 thin public / contributor surface
#
# SOURCE OF TRUTH = the vault tree (this repo). Export only *copies* curated
# paths into DEST. It must not invent a second public surface that diverges
# from vault hard work (softpass, deviations, runbooks, scrubbed README, …).
#
# Does NOT rewrite private history. Does NOT flip visibility.
#
# Usage:
#   bash scripts/export-public-workspace.sh /path/to/export
#   DEST=/path/to/export bash scripts/export-public-workspace.sh
#   bash scripts/export-public-workspace.sh /path/to/export --verify-only
#   bash scripts/export-public-workspace.sh /path/to/export --clean
#   bash scripts/export-public-workspace.sh /path/to/export --skip-scrub
#
# Safe DEST sync:
#   - Builds into a staging dir first
#   - Verifies docs/export/REQUIRED.txt against stage and DEST
#   - rsync into DEST without deleting DEST/.git
#   - Without --clean: incremental (won't delete extra DEST files)
#   - With --clean: mirror exactly (still keeps .git)
#
# Path scrub only (absolute /Users/… and LC377_ROOT). No language rewrites
# that mangle already-generic contributor docs.
#
# After export (DEST = fairy-ring-workspace clone on rs2-r377):
#   cd DEST && git add -A && git commit && git push origin rs2-r377

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${DEST:-}"
VERIFY_ONLY=0
CLEAN=0
SKIP_SCRUB=0

usage() {
  cat >&2 <<'EOF'
usage: export-public-workspace.sh /path/to/export-dir [options]
   or: DEST=/path/to/dir export-public-workspace.sh [options]

options:
  --verify-only   Check vault has all REQUIRED.txt sources; exit (no DEST write)
  --clean         rsync --delete into DEST (still never deletes DEST/.git)
  --skip-scrub    Do not rewrite absolute paths / LC377_ROOT in staged files
  -h, --help      This help

Source of truth is the vault. Curated list: docs/export/REQUIRED.txt
docs/README.md in the export is copied from docs/export/README.md (edit that).
EOF
  exit 2
}

ARGS=()
for arg in "$@"; do
  case "$arg" in
    --verify-only) VERIFY_ONLY=1 ;;
    --clean) CLEAN=1 ;;
    --skip-scrub) SKIP_SCRUB=1 ;;
    -h|--help) usage ;;
    -*)
      echo "unknown option: $arg" >&2
      usage
      ;;
    *) ARGS+=("$arg") ;;
  esac
done

if [[ ${#ARGS[@]} -ge 1 ]]; then
  DEST="${ARGS[0]}"
fi

REQUIRED_LIST="${ROOT}/docs/export/REQUIRED.txt"
if [[ ! -f "${REQUIRED_LIST}" ]]; then
  echo "REFUSE: missing ${REQUIRED_LIST}" >&2
  echo "  (export contract — protects curated public surface)" >&2
  exit 1
fi

require_vault_sources() {
  local missing=0
  local rel
  while IFS= read -r rel || [[ -n "${rel}" ]]; do
    [[ -z "${rel}" || "${rel}" =~ ^[[:space:]]*# ]] && continue
    rel="${rel#"${rel%%[![:space:]]*}"}"
    rel="${rel%"${rel##*[![:space:]]}"}"
    [[ -z "${rel}" ]] && continue

    if [[ "${rel}" == "AGENTS.md" ]]; then
      if [[ ! -f "${ROOT}/docs/export/AGENTS.md" ]]; then
        echo "MISSING vault source: docs/export/AGENTS.md (feeds public AGENTS.md)" >&2
        missing=1
      fi
      continue
    fi
    if [[ "${rel}" == "docs/README.md" ]]; then
      if [[ ! -f "${ROOT}/docs/export/README.md" ]]; then
        echo "MISSING vault source: docs/export/README.md (feeds docs/README.md)" >&2
        missing=1
      fi
      continue
    fi
    if [[ "${rel}" == docs/progress/* ]]; then
      if [[ ! -e "${ROOT}/docs/export/progress/${rel#docs/progress/}" ]]; then
        echo "MISSING vault source: docs/export/progress/${rel#docs/progress/} (feeds ${rel})" >&2
        missing=1
      fi
      continue
    fi
    if [[ "${rel}" == "docs/research/corpus/README.md" ]]; then
      if [[ ! -f "${ROOT}/docs/export/corpus-README.md" ]]; then
        echo "MISSING vault source: docs/export/corpus-README.md (feeds corpus/README.md)" >&2
        missing=1
      fi
      continue
    fi
    if [[ "${rel}" == ".gitignore" ]]; then
      continue
    fi
    if [[ ! -e "${ROOT}/${rel}" ]]; then
      echo "MISSING vault source (required for export): ${rel}" >&2
      missing=1
    fi
  done < "${REQUIRED_LIST}"
  if [[ "${missing}" -ne 0 ]]; then
    echo "REFUSE: vault missing curated public-surface files. Fix vault first." >&2
    exit 1
  fi
}

verify_stage() {
  local stage="$1"
  local missing=0
  local rel
  while IFS= read -r rel || [[ -n "${rel}" ]]; do
    [[ -z "${rel}" || "${rel}" =~ ^[[:space:]]*# ]] && continue
    rel="${rel#"${rel%%[![:space:]]*}"}"
    rel="${rel%"${rel##*[![:space:]]}"}"
    [[ -z "${rel}" ]] && continue
    if [[ ! -e "${stage}/${rel}" ]]; then
      echo "MISSING in export stage: ${rel}" >&2
      missing=1
    fi
  done < "${REQUIRED_LIST}"

  for bad in docs/plans docs/gap docs/context docs/superpowers docs/research/CORPUS_DIGEST.md docs/research/INDEX.md; do
    if [[ -e "${stage}/${bad}" ]]; then
      echo "REFUSE: private path leaked into stage: ${bad}" >&2
      missing=1
    fi
  done
  # Research root is an allowlist. Leftover hunts / SHIP e2e findings stay in the vault.
  if [[ -d "${stage}/docs/research" ]]; then
    local extra
    extra="$(find "${stage}/docs/research" -maxdepth 1 -type f -name '*.md' \
      ! -name 'authenticity-stance.md' \
      ! -name 'deviations.md' \
      ! -name 'softpass.md' \
      ! -name 'PROVENANCE-UPSTREAM-PINS.md' \
      -print)"
    if [[ -n "${extra}" ]]; then
      echo "REFUSE: unexpected research root file(s) (leftover hunts stay vault):" >&2
      echo "${extra}" >&2
      missing=1
    fi
  fi

  if ! grep -q 'process stage' "${stage}/docs/research/softpass.md" 2>/dev/null; then
    echo "REFUSE: softpass.md missing expected framing (process stage)" >&2
    missing=1
  fi
  if grep -q 'Harness / Myreque hellhound' "${stage}/docs/research/deviations.md" 2>/dev/null; then
    echo "REFUSE: thrash soft-mid rows in deviations.md (belong in softpass.md)" >&2
    missing=1
  fi
  # Isolation runbook must not re-introduce wrong WEB_PORT example as primary
  if grep -qE '^WEB_PORT=8891' "${stage}/docs/runbooks/isolation.md" 2>/dev/null; then
    echo "REFUSE: isolation.md still documents WEB_PORT=8891 (use 81)" >&2
    missing=1
  fi
  # Private corpus ops must not leak
  for private_corpus in verify-queue.md verify-log.md verification-audit-2026-08-08.md content-complete-planning.md; do
    if [[ -e "${stage}/docs/research/corpus/${private_corpus}" ]]; then
      echo "REFUSE: private corpus ops file leaked: ${private_corpus}" >&2
      missing=1
    fi
  done

  if [[ "${missing}" -ne 0 ]]; then
    echo "REFUSE: export stage failed verification" >&2
    exit 1
  fi
  local n
  n="$(grep -cve '^[[:space:]]*$\|^[[:space:]]*#' "${REQUIRED_LIST}" || true)"
  echo "  ✓ required surface present (${n} paths)"
}

require_vault_sources
if [[ "${VERIFY_ONLY}" -eq 1 ]]; then
  echo "==> vault sources OK (${REQUIRED_LIST})"
  exit 0
fi

if [[ -z "${DEST}" ]]; then
  usage
fi

if [[ "${DEST}" == "${ROOT}" ]]; then
  echo "REFUSE: DEST must not be the private vault root" >&2
  exit 1
fi

STAGE="$(mktemp -d "${TMPDIR:-/tmp}/fairy-ring-export.XXXXXX")"
trap 'rm -rf "${STAGE}"' EXIT

echo "==> export from vault (source of truth):"
echo "    ${ROOT}"
echo "    staging → ${STAGE}"
echo "    final   → ${DEST}"
echo "    clean=${CLEAN} path_scrub=$((1 - SKIP_SCRUB))"

copy_file() {
  local rel="$1"
  local src="${ROOT}/${rel}"
  local dst="${STAGE}/${rel}"
  if [[ ! -e "${src}" ]]; then
    echo "  skip missing: ${rel}"
    return 0
  fi
  mkdir -p "$(dirname "${dst}")"
  cp -a "${src}" "${dst}"
  echo "  + ${rel}"
}

copy_dir_filtered() {
  local rel="$1"
  shift
  local src="${ROOT}/${rel}"
  local dst="${STAGE}/${rel}"
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

for f in README.md NOTICE.md LICENSE CONTRIBUTING.md; do
  copy_file "${f}"
done
# Root AGENTS.md in the vault is operator-full; public ships the thin export copy
# (same pattern as docs/README.md ← docs/export/README.md).
if [[ ! -f "${ROOT}/docs/export/AGENTS.md" ]]; then
  echo "REFUSE: missing docs/export/AGENTS.md (public thin agent rules)" >&2
  exit 1
fi
cp -a "${ROOT}/docs/export/AGENTS.md" "${STAGE}/AGENTS.md"
echo "  + AGENTS.md (from docs/export/AGENTS.md — vault root AGENTS is operator-full)"

cat > "${STAGE}/.gitignore" <<'EOF'
# --- deps / secrets / runtime ---
node_modules/
**/node_modules/
.tmp/
.env
**/.env
**/.env.local
*.pem
*.log
*.sav

# --- private process (must not land here) ---
docs/plans/
docs/gap/
docs/context/
docs/superpowers/
docs/research/CORPUS_DIGEST.md
**/harness-shots/

# --- cache / full vendor trees (clone separately) ---
cache/openrs2-*/
cache/unpacked/
vendor/content/
vendor/engine/
vendor/client-ts/
vendor/Server/
vendor/client-java*/

# --- OS / editor / junk ---
.DS_Store
**/.DS_Store
._*
**/__MACOSX/
Thumbs.db
ehthumbs.db
Desktop.ini
$RECYCLE.BIN/
*.swp
*.swo
*~
*.bak
*.orig
*.tmp
*.temp
.idea/
.vscode/
*.code-workspace
.fleet/
.history/
*.sublime-project
*.sublime-workspace
EOF
echo "  + .gitignore (public thin)"

mkdir -p "${STAGE}/docs/decisions"
for f in "${ROOT}"/docs/decisions/*.md; do
  [[ -f "$f" ]] || continue
  copy_file "docs/decisions/$(basename "$f")"
done

copy_file "docs/research/authenticity-stance.md"
copy_file "docs/research/PROVENANCE-UPSTREAM-PINS.md"
copy_file "docs/research/deviations.md"
copy_file "docs/research/softpass.md"

# RuneScript first-principles manual (public — language/runtime, not thrash logs)
if [[ -d "${ROOT}/docs/research/runescript" ]]; then
  mkdir -p "${STAGE}/docs/research/runescript"
  rsync -a \
    --exclude '.DS_Store' \
    --exclude '**/__pycache__/**' \
    --exclude '*.pyc' \
    "${ROOT}/docs/research/runescript/" "${STAGE}/docs/research/runescript/"
  echo "  + docs/research/runescript/ (manual)"
fi

# Game knowledge (anchors, combat floors, harness prep policy)
if [[ -d "${ROOT}/docs/research/game-knowledge" ]]; then
  mkdir -p "${STAGE}/docs/research/game-knowledge"
  rsync -a \
    --exclude '.DS_Store' \
    "${ROOT}/docs/research/game-knowledge/" "${STAGE}/docs/research/game-knowledge/"
  echo "  + docs/research/game-knowledge/"
fi

# Corpus public slice: inventories + method docs only (not verify-queue/log/audit)
mkdir -p "${STAGE}/docs/research/corpus"
cp -a "${ROOT}/docs/export/corpus-README.md" "${STAGE}/docs/research/corpus/README.md"
echo "  + docs/research/corpus/README.md (from docs/export/corpus-README.md)"
for f in \
  trust-but-verify.md \
  verification-rubric.md \
  inventory-377-quest-trees.md \
  inventory-377-playability-matrix.md \
  inventory-377-skills-minigames.md \
  inventory-377-quest-stages.md \
  inventory-377-pack-density.md \
  inventory-377-multinpc-map.md \
  inventory-377-engine-surface.md \
  inventory-377-login-music-hooks.md \
  inventory-377-areas.md \
  inventory-289-vs-377-quest-delta.md \
  inventory-274-vs-377-quest-delta.md \
  ; do
  if [[ -f "${ROOT}/docs/research/corpus/${f}" ]]; then
    cp -a "${ROOT}/docs/research/corpus/${f}" "${STAGE}/docs/research/corpus/${f}"
    echo "  + docs/research/corpus/${f}"
  fi
done

mkdir -p "${STAGE}/docs"
cp -a "${ROOT}/docs/export/README.md" "${STAGE}/docs/README.md"
echo "  + docs/README.md (from docs/export/README.md — edit that file in vault)"

mkdir -p "${STAGE}/docs/progress"
cp -a "${ROOT}/docs/export/progress/index.html" "${STAGE}/docs/progress/index.html"
cp -a "${ROOT}/docs/export/progress/README.md" "${STAGE}/docs/progress/README.md"
echo "  + docs/progress/ (from docs/export/progress/ — public countdown)"

if [[ -d "${ROOT}/docs/runbooks" ]]; then
  mkdir -p "${STAGE}/docs/runbooks"
  for name in isolation.md smoke-start.md harness.md vendor-layout.md playable.md client-ts.md; do
    if [[ -f "${ROOT}/docs/runbooks/${name}" ]]; then
      copy_file "docs/runbooks/${name}"
    fi
  done
fi

if [[ -d "${ROOT}/scripts" ]]; then
  copy_dir_filtered "scripts"
fi
if [[ -d "${ROOT}/tools" ]]; then
  copy_dir_filtered "tools" \
    --exclude '**/harness-shots/**' \
    --exclude '**/*.png' \
    --exclude '**/*.log'
fi
if [[ -f "${ROOT}/vendor/README.md" ]]; then
  mkdir -p "${STAGE}/vendor"
  copy_file "vendor/README.md"
fi
if [[ -f "${ROOT}/cache/README.md" ]]; then
  mkdir -p "${STAGE}/cache"
  copy_file "cache/README.md"
fi
if [[ -d "${ROOT}/.github" ]]; then
  copy_dir_filtered ".github"
fi

if [[ "${SKIP_SCRUB}" -eq 0 ]]; then
  while IFS= read -r -d '' f; do
    sed -i '' \
      -e 's|$RS2_R377_ROOT|$RS2_R377_ROOT|g' \
      -e 's|$RS2_R377_ROOT|$RS2_R377_ROOT|g' \
      -e 's|$RS2B2T_ENGINE_REF|$RS2B2T_ENGINE_REF|g' \
      -e 's|$RS2_LIVE_SERVER_REF|$RS2_LIVE_SERVER_REF|g' \
      -e 's|$RS2B0T_REF|$RS2B0T_REF|g' \
      -e 's|export RS2_R377_ROOT=|export RS2_R377_ROOT=|g' \
      -e 's|"$RS2_R377_ROOT"|"$RS2_R377_ROOT"|g' \
      -e 's|\$RS2_R377_ROOT|$RS2_R377_ROOT|g' \
      -e 's|`RS2_R377_ROOT`|`RS2_R377_ROOT`|g' \
      "$f" 2>/dev/null || true
  done < <(find "${STAGE}" -type f \( -name '*.md' -o -name '*.mjs' -o -name '*.ts' -o -name '*.sh' -o -name '*.js' \) -print0 2>/dev/null)
  echo "  + path scrub (absolute paths / LC377_ROOT only — no language rewrite)"
else
  echo "  skip path scrub (--skip-scrub)"
fi

verify_stage "${STAGE}"

{
  echo "# Public export manifest"
  echo
  echo "Source of truth: vault tree (export is a copy, not a parallel product)"
  echo "Generated: $(date -u +%Y-%m-%dT%H:%MZ)"
  echo "Policy: Decision 011 — thin surface; REQUIRED.txt enforced"
  echo
  echo '```'
  (cd "${STAGE}" && find . -type f | sort | head -500)
  echo '```'
} > "${STAGE}/PUBLIC_EXPORT.md"
echo "  + PUBLIC_EXPORT.md"

mkdir -p "${DEST}"
if [[ -d "${DEST}/.git" ]]; then
  echo "==> DEST has .git — preserving it"
fi

RSYNC_ARGS=(-a)
if [[ "${CLEAN}" -eq 1 ]]; then
  RSYNC_ARGS+=(--delete)
  echo "==> --clean: remove DEST files not in export (keeps .git)"
else
  echo "==> incremental sync (no --delete). Pass --clean for exact mirror."
fi

rsync "${RSYNC_ARGS[@]}" \
  --exclude '.git/' \
  "${STAGE}/" "${DEST}/"

verify_stage "${DEST}"

echo
echo "==> export OK"
echo "    files: $(find "${DEST}" -type f | wc -l | tr -d ' ')"
echo "    size:  $(du -sh "${DEST}" | awk '{print $1}')"
echo
echo "Vault is source of truth. Edit curated paths there, then re-export."
echo "Required list: docs/export/REQUIRED.txt"
echo
echo "Next (fairy-ring-workspace @ rs2-r377):"
echo "  cd \"${DEST}\" && git status"
echo "  git add -A && git commit && git push origin rs2-r377"
