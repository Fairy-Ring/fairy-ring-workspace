#!/usr/bin/env python3
"""Unwrap a Jagex OpenRS2 'pack200' game client and write a real Pack200 stream.

OpenRS2 32256 (RS2 410) is NOT a jar and NOT a bare Pack200 file:
  [8-byte header] + raw DEFLATE(Pack200)
Header on 32256 is 08 00 00 00 00 00 00 00. Inflated payload starts CA FE D0 0D.

Then:  unpack200 client.pack200 client.jar   # JDK 8 only

Usage:
  python3 scripts/unpack-openrs2-pack200.py research/jars/410/client-410-pack200.dat
"""
from __future__ import annotations

import argparse
import sys
import zlib
from pathlib import Path

PACK200_MAGIC = bytes.fromhex("cafed00d")


def unwrap(data: bytes) -> bytes:
    if data.startswith(PACK200_MAGIC):
        return data
    if len(data) > 8:
        try:
            out = zlib.decompress(data[8:], -15)
            if out.startswith(PACK200_MAGIC):
                return out
        except zlib.error:
            pass
    raise SystemExit(
        "not a Pack200 file and 8-byte+raw-deflate unwrap failed "
        f"(magic={data[:8].hex()})"
    )


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("src")
    ap.add_argument("-o", "--out", help="default: <src> with .pack200 suffix")
    args = ap.parse_args()
    src = Path(args.src)
    out = Path(args.out) if args.out else src.with_suffix(".pack200")
    payload = unwrap(src.read_bytes())
    out.write_bytes(payload)
    print(f"wrote {out} ({len(payload)} bytes) Pack200 magic ok", file=sys.stderr)


if __name__ == "__main__":
    main()
