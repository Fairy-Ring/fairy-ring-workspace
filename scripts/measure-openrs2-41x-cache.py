#!/usr/bin/env python3
"""Measure on-disk OpenRS2 412/413/414 caches (extract + SHA256 + flat counts).

Does not touch vendor product trees. Blobs stay gitignored.
Usage:
  python3 scripts/measure-openrs2-41x-cache.py
  python3 scripts/measure-openrs2-41x-cache.py 412 413 414
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "cache"
BUILDS = [412, 413, 414]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def ensure_disk(dest: Path) -> list[tuple[str, int]]:
    zpath = dest / "disk.zip"
    disk = dest / "disk"
    if not (disk / "cache").is_dir():
        disk.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(zpath, "r") as zf:
            zf.extractall(disk)
    rows: list[tuple[str, int]] = []
    cdir = disk / "cache"
    for name in sorted(cdir.iterdir(), key=lambda p: p.name):
        if name.is_file():
            rows.append((name.name, name.stat().st_size))
    return rows


def ensure_flat(dest: Path) -> dict[str, int]:
    tar = dest / "flat-file.tar.gz"
    flat = dest / "flat"
    marker = flat / "cache"
    if not marker.is_dir():
        flat.mkdir(parents=True, exist_ok=True)
        # Prefer tar CLI (fast); fall back would be tarfile pure-python.
        subprocess.check_call(
            ["tar", "-xzf", str(tar), "-C", str(flat)],
            stdout=subprocess.DEVNULL,
        )
    counts: dict[str, int] = {}
    for arch in sorted(marker.iterdir(), key=lambda p: (len(p.name), p.name)):
        if not arch.is_dir():
            continue
        n = sum(1 for p in arch.iterdir() if p.suffix == ".dat" and p.is_file())
        counts[arch.name] = n
    return counts


def measure_one(build: int) -> dict:
    dest = CACHE / f"openrs2-{build}"
    out: dict = {"build": build, "path": str(dest)}
    if not dest.is_dir():
        out["error"] = "missing directory"
        return out

    for name in ("disk.zip", "flat-file.tar.gz", "keys.json"):
        p = dest / name
        out[f"has_{name}"] = p.is_file()
        if p.is_file():
            out[f"sha256_{name}"] = sha256_file(p)
            out[f"bytes_{name}"] = p.stat().st_size

    keys_path = dest / "keys.json"
    if keys_path.is_file():
        keys = json.loads(keys_path.read_text())
        out["xtea_valid"] = len(keys)
        out["xtea_names"] = [k.get("name") for k in keys]
        out["xtea_groups"] = [
            {"name": k.get("name"), "mapsquare": k.get("mapsquare"),
             "archive": k.get("archive"), "group": k.get("group")}
            for k in keys
        ]

    out["disk_files"] = ensure_disk(dest)
    out["flat_counts"] = ensure_flat(dest)
    out["flat_total"] = sum(out["flat_counts"].values())
    dat2 = dest / "disk" / "cache" / "main_file_cache.dat2"
    if dat2.is_file():
        out["dat2_bytes"] = dat2.stat().st_size
    return out


def main() -> int:
    builds = [int(a) for a in sys.argv[1:]] if len(sys.argv) > 1 else BUILDS
    results = [measure_one(b) for b in builds]
    print(json.dumps(results, indent=2))
    # Also write next to each cache for durable local notes (gitignored under cache/)
    for r in results:
        if "error" in r:
            continue
        dest = Path(r["path"])
        lines = [
            f"# Measured {r['build']} — openrs2 local extract",
            f"dat2_bytes={r.get('dat2_bytes')}",
            f"flat_total={r.get('flat_total')}",
            f"xtea_valid={r.get('xtea_valid')} names={r.get('xtea_names')}",
            "",
            "## SHA256",
            f"{r.get('sha256_disk.zip')}  disk.zip",
            f"{r.get('sha256_flat-file.tar.gz')}  flat-file.tar.gz",
            f"{r.get('sha256_keys.json')}  keys.json",
            "",
            "## disk/cache files",
        ]
        for name, size in r.get("disk_files", []):
            lines.append(f"{size:12d}  {name}")
        lines.append("")
        lines.append("## flat/cache group counts")
        for arch, n in sorted(r.get("flat_counts", {}).items(), key=lambda x: (len(x[0]), x[0])):
            lines.append(f"{arch:>4}  {n}")
        (dest / "MEASURED.txt").write_text("\n".join(lines) + "\n")
        # Update SHA256SUMS.txt
        (dest / "SHA256SUMS.txt").write_text(
            "\n".join(
                [
                    f"# OpenRS2 local measure build {r['build']}.",
                    f"{r.get('sha256_disk.zip')}  disk.zip",
                    f"{r.get('sha256_flat-file.tar.gz')}  flat-file.tar.gz",
                    f"{r.get('sha256_keys.json')}  keys.json",
                    "",
                ]
            )
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
