#!/usr/bin/env python3
"""Counts only — does not classify SHIP/SPINE/RED (that is gap/003)."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "vendor" / "content"


def main() -> None:
    ql = (CONTENT / "scripts/interfaces/questlist.if").read_text()
    slugs = re.findall(r"^\[([a-z0-9_]+)\]", ql, re.M)
    quests = [s for s in slugs if not s.startswith("com_")]
    qdir = CONTENT / "scripts/quests"
    folders = sorted(p.name for p in qdir.iterdir() if p.is_dir())
    rs2 = {n: len(list((qdir / n).rglob("*.rs2"))) for n in folders}
    thin = sorted(n for n, c in rs2.items() if c <= 1)
    print(f"questlist_rows={len(quests)}")
    print(f"quest_folders={len(folders)}")
    print(f"folders_rs2_le_1={len(thin)}")
    print("thin:", ", ".join(f"{n}={rs2[n]}" for n in thin))
    mdir = CONTENT / "scripts/minigames"
    if mdir.is_dir():
        print("minigames:")
        for p in sorted(x for x in mdir.iterdir() if x.is_dir()):
            print(f"  {p.name} rs2={len(list(p.rglob('*.rs2')))}")


if __name__ == "__main__":
    main()
