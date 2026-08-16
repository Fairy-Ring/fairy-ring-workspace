#!/usr/bin/env python3
"""One-shot: git mv 41x–44x research into docs/research/horizon/ and rewrite links.

Product stays 377. Run from vault root. Safe to re-run: skips already-moved.
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path("/Users/acfrazier/experiments/LC-rs2-r377-2006-05-02")
RES = ROOT / "docs" / "research"
HOR = RES / "horizon"

PATTERNS = (
    "cache-41*.md",
    "cache-42*.md",
    "cache-43*.md",
    "cache-44*.md",
    "client-41*.md",
    "client-42*.md",
    "revision-41*.md",
    "construction-41*.md",
)

LINK_RE = re.compile(r"\]\(([^)]+)\)")


def git(*args: str) -> None:
    subprocess.check_call(["git", *args], cwd=ROOT)


def collect_src() -> list[Path]:
    out: list[Path] = []
    for pat in PATTERNS:
        out.extend(sorted(RES.glob(pat)))
    return [p for p in out if p.is_file()]


def rewrite_horizon_target(target: str, basenames: set[str]) -> str:
    if target.startswith(("http://", "https://", "mailto:", "#")):
        return target
    if target.startswith("<"):
        return target
    path, hashsep, hashpart = target.partition("#")
    anc = f"#{hashpart}" if hashsep else ""
    if not path:
        return target
    if path.startswith("../"):
        return f"../{path}{anc}"
    if path.startswith("./"):
        path = path[2:]
    first = path.split("/", 1)[0]
    if first in basenames or path in basenames:
        return f"{path}{anc}"
    return f"../{path}{anc}"


def rewrite_horizon_file(path: Path, basenames: set[str]) -> bool:
    text = path.read_text(encoding="utf-8")

    def repl(m: re.Match[str]) -> str:
        return f"]({rewrite_horizon_target(m.group(1), basenames)})"

    new = LINK_RE.sub(repl, text)
    if new != text:
        path.write_text(new, encoding="utf-8")
        return True
    return False


def inbound_replace(text: str, names: list[str], in_research_root: bool) -> str:
    for name in names:
        text = text.replace(f"docs/research/horizon/{name}", f"__HOR_KEEP__{name}")
        text = text.replace(f"../research/horizon/{name}", f"__HOR_REL__{name}")
        text = text.replace(f"](horizon/{name}", f"__HOR_MD__{name}")
        text = text.replace(f"docs/research/{name}", f"docs/research/horizon/{name}")
        text = text.replace(f"../research/{name}", f"../research/horizon/{name}")
        if in_research_root:
            text = text.replace(f"]({name}", f"](horizon/{name}")
        text = text.replace(f"__HOR_KEEP__{name}", f"docs/research/horizon/{name}")
        text = text.replace(f"__HOR_REL__{name}", f"../research/horizon/{name}")
        text = text.replace(f"__HOR_MD__{name}", f"](horizon/{name}")
    return text


def main() -> int:
    HOR.mkdir(exist_ok=True)
    src = collect_src()
    already = sorted(p.name for p in HOR.glob("*.md") if p.name != "README.md")
    if not src and not already:
        print("no horizon files found", file=sys.stderr)
        return 1

    moved: list[str] = []
    for p in src:
        dest = HOR / p.name
        if dest.exists():
            print(f"skip exists {dest.relative_to(ROOT)}")
            continue
        git("mv", str(p.relative_to(ROOT)), str(dest.relative_to(ROOT)))
        moved.append(p.name)
        print(f"mv {p.name}")

    basenames = {p.name for p in HOR.glob("*.md") if p.name != "README.md"}
    names = sorted(basenames, key=len, reverse=True)

    hor_changed = 0
    for p in sorted(HOR.glob("*.md")):
        if p.name == "README.md":
            continue
        if rewrite_horizon_file(p, basenames):
            hor_changed += 1
    print(f"horizon internal links rewritten in {hor_changed} files")

    inbound = 0
    scan_roots = [
        ROOT / "docs",
        ROOT / "AGENTS.md",
        ROOT / "PLAN.md",
    ]
    files: list[Path] = []
    for root in scan_roots:
        if root.is_file():
            files.append(root)
        elif root.is_dir():
            files.extend(root.rglob("*.md"))

    for path in files:
        if HOR in path.parents or path.parent == HOR:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        in_research_root = path.parent == RES
        new = inbound_replace(text, names, in_research_root)
        if new != text:
            path.write_text(new, encoding="utf-8")
            inbound += 1
            print(f"inbound {path.relative_to(ROOT)}")

    print(f"moved={len(moved)} already={len(already)} inbound_files={inbound} horizon_n={len(basenames)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
