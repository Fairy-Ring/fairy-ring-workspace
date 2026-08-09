#!/usr/bin/env bash
# Inventory Client-Java origin/289 vs origin/377 (no merge base — two-dot diff).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CJ="$ROOT/vendor/client-java"
cd "$CJ"
git fetch origin 289 377 -q
echo "=== stat ==="
git diff --stat origin/289 origin/377 | tail -5
echo
echo "=== top files by churn ==="
git diff --numstat origin/289 origin/377 | awk -F'\t' '
  $1=="-" { next }
  { print ($1+$2), $1, $2, $3 }
' | sort -nr | head -40
echo
echo "=== by jagex2 package ==="
git diff --numstat origin/289 origin/377 -- 'src/main/java/jagex2/**' | awk -F'\t' '
  $1=="-" { next }
  {
    f=$3; sub(/.*jagex2\//,"",f); split(f,a,"/"); pkg=a[1]
    files[pkg]++; adds[pkg]+=$1; dels[pkg]+=$2
  }
  END {
    for (p in files) printf "%-12s files=%3d +%7d -%7d\n", p, files[p], adds[p], dels[p]
  }
' | sort -t+ -k2 -nr
echo
echo "=== only in 377 (first 25) ==="
comm -13 <(git ls-tree -r --name-only origin/289 | sort) <(git ls-tree -r --name-only origin/377 | sort) | head -25
echo
echo "=== only in 289 (first 25) ==="
comm -23 <(git ls-tree -r --name-only origin/289 | sort) <(git ls-tree -r --name-only origin/377 | sort) | head -25
echo
echo "Full plan: docs/plans/2026-08-04-java-289-vs-377-client-delta.md"
