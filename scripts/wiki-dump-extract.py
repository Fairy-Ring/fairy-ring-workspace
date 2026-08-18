#!/usr/bin/env python3
"""Extract latest (or as-of) revisions from the local OSRS wiki history dump.

Does not hit the live wiki. Stream-decompresses
`.wiki/oldschool.runescape.wiki-20251006-history.xml.zst`.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

NS = "{http://www.mediawiki.org/xml/export-0.11/}"
DEFAULT_DUMP = (
    Path(__file__).resolve().parents[1]
    / ".wiki"
    / "oldschool.runescape.wiki-20251006-history.xml.zst"
)


def safe_name(title: str) -> str:
    return (
        title.replace("/", "_")
        .replace(":", "_")
        .replace(" ", "_")
        .replace("?", "")
        .replace("*", "")
    )


def extract(dump: Path, want: set[str], out_dir: Path, as_of: str | None) -> dict[str, str]:
    want_l = {t: t for t in want}
    # MediaWiki first-letter case
    want_norm = {t[0].upper() + t[1:] if t else t: t for t in want}
    found: dict[str, tuple[str, str]] = {}  # title -> (ts, text)

    proc = subprocess.Popen(
        ["zstd", "-dc", "--long=31", str(dump)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    assert proc.stdout is not None
    ctx = ET.iterparse(proc.stdout, events=("end",))
    n_pages = 0
    try:
        for _ev, el in ctx:
            if el.tag != f"{NS}page":
                continue
            n_pages += 1
            title_el = el.find(f"{NS}title")
            title = title_el.text if title_el is not None else None
            key = None
            if title in want_l:
                key = want_l[title]
            elif title in want_norm:
                key = want_norm[title]
            if key is None:
                el.clear()
                if len(found) == len(want):
                    break
                continue
            best_ts = ""
            best_text = ""
            for rev in el.findall(f"{NS}revision"):
                ts_el = rev.find(f"{NS}timestamp")
                tx_el = rev.find(f"{NS}text")
                ts = ts_el.text or "" if ts_el is not None else ""
                tx = tx_el.text or "" if tx_el is not None else ""
                if as_of and ts > as_of:
                    continue
                if ts >= best_ts:
                    best_ts = ts
                    best_text = tx
            if best_text:
                found[key] = (best_ts, best_text)
            el.clear()
            if len(found) == len(want):
                break
    finally:
        proc.kill()
        proc.wait()

    out_dir.mkdir(parents=True, exist_ok=True)
    for title, (ts, text) in found.items():
        path = out_dir / f"{safe_name(title)}.wikitext"
        path.write_text(f"<!-- title: {title} | rev: {ts} -->\n{text}\n", encoding="utf-8")
        print(f"OK  {title}  {ts}  {path.stat().st_size}B", file=sys.stderr)
    missing = [t for t in want if t not in found]
    for t in missing:
        print(f"MISS {t}", file=sys.stderr)
    print(f"scanned_pages~={n_pages} hit={len(found)} miss={len(missing)}", file=sys.stderr)
    return {t: found[t][1] for t in found}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dump", type=Path, default=DEFAULT_DUMP)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--title", action="append", default=[])
    ap.add_argument("--title-file", type=Path)
    ap.add_argument("--as-of", help="ISO timestamp exclusive upper bound, e.g. 2007-08-10T00:00:00Z")
    args = ap.parse_args()
    titles: list[str] = list(args.title)
    if args.title_file:
        titles.extend(
            ln.strip()
            for ln in args.title_file.read_text(encoding="utf-8").splitlines()
            if ln.strip() and not ln.startswith("#")
        )
    if not titles:
        print("no titles", file=sys.stderr)
        return 2
    if not args.dump.exists():
        print(f"missing dump {args.dump}", file=sys.stderr)
        return 2
    extract(args.dump, set(titles), args.out, args.as_of)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
