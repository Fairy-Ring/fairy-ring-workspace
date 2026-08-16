#!/usr/bin/env python3
"""Prepend a historical-hop / horizon banner. Idempotent. Facts stay; process tense is not law."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "docs" / "research"

HOP_MARK = "**Historical hop note.**"
HORIZON_MARK = "**Horizon note (not this product).**"

DENY_REL = {
    "README.md",
    "INDEX.md",
    "hop-note-policy-377.md",
    "authenticity-stance.md",
    "deviations.md",
    "softpass.md",
    "dest-cite-index-377.md",
    "dest-from-our-maps-377.md",
    "dest-from-our-maps-remaining-377.md",
    "dest-uncited-pass-next-377.md",
    "spine-after-red-starts-377.md",
    "spine-17-remaining-impl-377.md",
    "spine-17-stop-ledger-377.md",
    "red-19-start-impl-377.md",
    "red-19-start-line-status-377.md",
    "port-quest-config-unit-first-377.md",
    "map-npc-spawns-jm2-377.md",
    "CORPUS_DIGEST.md",
    "finish-377-rev-holes-377.md",
    "horizon/README.md",
}

DENY_PREFIXES = (
    "runescript/",
    "corpus/",
    "game-knowledge/",
)

PROCESS_RE = re.compile(
    r"Docs only|No product `\.\s*rs2`|No product \.rs2|Hunt 289|"
    r"Implement after|Research only|STOP this unit|do not ship this turn|"
    r"No product this (file|turn)|implement = \*\*none\*\*",
    re.I,
)


def rel(p: Path) -> str:
    return p.relative_to(RESEARCH).as_posix()


def skip(p: Path) -> bool:
    r = rel(p)
    if r in DENY_REL:
        return True
    return any(r.startswith(pref) for pref in DENY_PREFIXES)


def hop_banner(p: Path) -> str:
    readme = Path(os_rel(p, "README.md"))
    policy = Path(os_rel(p, "hop-note-policy-377.md"))
    gap = Path(os_rel(p, "../gap/003-content-complete-countdown.md"))
    return (
        f"> {HOP_MARK} Tiles, pack ids, PASS/FAIL, and cites stay usable. "
        f"Process tense here is **not** live policy (“docs only”, “no product `.rs2`”, "
        f"“STOP this unit”, “implement after … not now”). "
        f"Live: [`README`]({readme.as_posix()}) · "
        f"[`hop-note policy`]({policy.as_posix()}) · "
        f"[gap 003]({gap.as_posix()}).\n\n"
    )


def horizon_banner(p: Path) -> str:
    hub = Path(os_rel(p, "horizon/README.md"))
    pol = Path(os_rel(p, "hop-note-policy-377.md"))
    return (
        f"> {HORIZON_MARK} Decision **014**. Product stays **377**. "
        f"Do not treat this file as remaining 377 work. "
        f"Hub: [`horizon/README`]({hub.as_posix()}). "
        f"Live 377: [`hop-note policy`]({pol.as_posix()}).\n\n"
    )


def os_rel(p: Path, dest: str) -> str:
    dest_path = RESEARCH / dest
    return Path(os_relpath(p.parent, dest_path))


def os_relpath(start: Path, dest: Path) -> str:
    return Path(os_path_rel(start, dest)).as_posix()


def os_path_rel(start: Path, dest: Path) -> str:
    import os

    return os.path.relpath(dest, start)


def already(text: str, mark: str) -> bool:
    return mark in text[:800]


def main() -> None:
    import sys

    dry = "--dry-run" in sys.argv
    hop_n = hor_n = skip_n = 0
    for p in sorted(RESEARCH.rglob("*.md")):
        if skip(p):
            skip_n += 1
            continue
        text = p.read_text(encoding="utf-8")
        r = rel(p)
        if r.startswith("horizon/"):
            if already(text, HORIZON_MARK):
                skip_n += 1
                continue
            if not dry:
                p.write_text(horizon_banner(p) + text, encoding="utf-8")
            hor_n += 1
            continue
        if not PROCESS_RE.search(text):
            skip_n += 1
            continue
        if already(text, HOP_MARK):
            skip_n += 1
            continue
        if not dry:
            p.write_text(hop_banner(p) + text, encoding="utf-8")
        hop_n += 1
    print(f"{'dry ' if dry else ''}stamped hop={hop_n} horizon={hor_n} skipped={skip_n}")


if __name__ == "__main__":
    main()
