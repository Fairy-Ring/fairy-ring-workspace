#!/usr/bin/env bash
# Remove harness / smoke test accounts from the local LC-rs2 r377 debug engine.
#
# With LOGIN_SERVER=false (this stack), logins are file saves under
#   vendor/engine/data/players/<profile>/<username>.sav
# The SQLite `account` table is usually empty but is cleaned when rows exist
# (LOGIN_SERVER=true / WEBSITE_REGISTRATION paths).
#
# Default is dry-run. Pass --apply to delete.
#
# Usage:
#   bash scripts/cleanup-test-accounts.sh              # list what would go
#   bash scripts/cleanup-test-accounts.sh --apply      # delete
#   bash scripts/cleanup-test-accounts.sh --apply --profile main
#   bash scripts/cleanup-test-accounts.sh --prefix tut --prefix sm --apply
#   bash scripts/cleanup-test-accounts.sh --all-saves --apply   # every .sav except KEEP list
#
# Compatible with macOS Bash 3.2 (no mapfile).
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENGINE="${LC377_ENGINE:-$ROOT/vendor/engine}"
DB="${LC377_SQLITE:-$ENGINE/db.sqlite}"
PROFILE="${PROFILE:-main}"
APPLY=0
ALL_SAVES=0
PREFIXES=""

# freshAccount(prefix) → prefix + base36 stamp (≤12 chars). Common harness prefixes:
# Quest smokes: edg (Eadgar), vik (Viking), mtn (Mort’ton), hfd (Horror), tbw (TBWT), …
# Also: myr (Myreque), reg (Regicide), mmg (MM greegree), sls (Slayer S0), f1p (Farming F1),
# lo (logout-clean), prb (probe thrash). Prefer --all-saves on this isolated stack for full lint.
DEFAULT_PREFIXES="tut sm lw pab scs shot inj h edg vik mtn hfd tbw adj col bss gj myr reg mmg sls f1p lo prb"

# Never delete these basenames (no .sav) even with --all-saves
KEEP="bot377 test test2 portall freshui"

usage() {
  sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply) APPLY=1; shift ;;
    --dry-run) APPLY=0; shift ;;
    --profile) PROFILE="$2"; shift 2 ;;
    --prefix) PREFIXES="${PREFIXES} $2"; shift 2 ;;
    --all-saves) ALL_SAVES=1; shift ;;
    --db) DB="$2"; shift 2 ;;
    --engine) ENGINE="$2"; shift 2 ;;
    -h|--help) usage 0 ;;
    *) echo "unknown arg: $1" >&2; usage 1 ;;
  esac
done

if [[ -z "${PREFIXES// }" ]]; then
  PREFIXES="$DEFAULT_PREFIXES"
fi

PLAYERS_DIR="$ENGINE/data/players/$PROFILE"
if [[ ! -d "$PLAYERS_DIR" ]]; then
  echo "players dir missing: $PLAYERS_DIR" >&2
  exit 1
fi

is_keep() {
  local base="$1" k
  for k in $KEEP; do
    [[ "$base" == "$k" ]] && return 0
  done
  return 1
}

matches_prefix() {
  local base="$1" p bl pl
  bl=$(printf '%s' "$base" | tr '[:upper:]' '[:lower:]')
  for p in $PREFIXES; do
    pl=$(printf '%s' "$p" | tr '[:upper:]' '[:lower:]')
    case "$bl" in
      "$pl"*) return 0 ;;
    esac
  done
  return 1
}

should_delete_save() {
  local base="$1"
  is_keep "$base" && return 1
  if [[ $ALL_SAVES -eq 1 ]]; then
    return 0
  fi
  matches_prefix "$base"
}

echo "=== LC-rs2 r377 test account cleanup ==="
echo "engine:  $ENGINE"
echo "profile: $PROFILE"
echo "sqlite:  $DB"
if [[ $APPLY -eq 1 ]]; then
  echo "mode:    APPLY"
else
  echo "mode:    DRY-RUN"
fi
if [[ $ALL_SAVES -eq 1 ]]; then
  echo "select:  all .sav except KEEP=($KEEP)"
else
  echo "select:  prefixes ($PREFIXES)*"
fi
echo

# —— .sav files ——
TO_DELETE_SAV=""
n_sav=0
# portable: null-delimited find
while IFS= read -r -d '' f; do
  bn=$(basename "$f")
  base="${bn%%.sav*}"
  if should_delete_save "$base"; then
    TO_DELETE_SAV="${TO_DELETE_SAV}${f}"$'\n'
    n_sav=$((n_sav + 1))
    echo "  sav: $bn"
  fi
done < <(find "$PLAYERS_DIR" -maxdepth 1 -type f \( -name '*.sav' -o -name '*.sav.*' \) -print0 | sort -z)

echo "player saves ($PLAYERS_DIR): $n_sav file(s) matched"
echo

# —— SQLite account rows + dependents ——
n_sql=0
SQL_USERS=""
if [[ -f "$DB" ]] && command -v sqlite3 >/dev/null 2>&1; then
  while IFS= read -r u; do
    [[ -z "$u" ]] && continue
    if should_delete_save "$u"; then
      SQL_USERS="${SQL_USERS}${u}"$'\n'
      n_sql=$((n_sql + 1))
      echo "  sql: $u"
    fi
  done < <(sqlite3 "$DB" "SELECT username FROM account ORDER BY username;" 2>/dev/null || true)
  echo "sqlite account rows: $n_sql matched (LOGIN_SERVER=false often has 0)"
else
  echo "sqlite: skip (no db or no sqlite3)"
fi
echo

if [[ $APPLY -eq 0 ]]; then
  echo "Dry-run only. Re-run with --apply to delete."
  exit 0
fi

# Apply sav deletes
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  rm -f -- "$f"
  echo "removed $f"
done <<< "$TO_DELETE_SAV"

# Apply SQL deletes
while IFS= read -r u; do
  [[ -z "$u" ]] && continue
  ue=$(printf "%s" "$u" | sed "s/'/''/g")
  id=$(sqlite3 "$DB" "SELECT id FROM account WHERE username='$ue';")
  if [[ -z "$id" ]]; then
    continue
  fi
  # Related tables — ignore errors if a table lacks the column on older schemas
  sqlite3 "$DB" <<SQL
BEGIN;
DELETE FROM account_login WHERE account_id=$id;
DELETE FROM hiscore WHERE account_id=$id;
DELETE FROM hiscore_large WHERE account_id=$id;
DELETE FROM friendlist WHERE account_id=$id OR friend_account_id=$id;
DELETE FROM ignorelist WHERE account_id=$id;
DELETE FROM session WHERE account_id=$id;
DELETE FROM account WHERE id=$id;
COMMIT;
SQL
  echo "sqlite removed account id=$id user=$u"
done <<< "$SQL_USERS"

echo
echo "Done. Saves left: $(find "$PLAYERS_DIR" -maxdepth 1 -name '*.sav' | wc -l | tr -d ' ')"
