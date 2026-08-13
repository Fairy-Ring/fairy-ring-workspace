#!/usr/bin/env python3
"""Inventory leftover same-name loc/npc/obj keys (289 then 274 vs 377).

Re-run after a config inject. Does not invent IDs. Skip a value when a
pack-ref token is missing on 377 (synth/seq/loc/npc/obj/inv/category/hunt).
"""
from __future__ import annotations

import os
import re
import sys
from collections import Counter, defaultdict

ROOT = os.environ.get(
    "LC377_ROOT",
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
)
CONTENT = os.path.join(ROOT, "vendor/content")
PACK = os.path.join(CONTENT, "pack")
UNPACK377 = os.path.join(CONTENT, "scripts/_unpack/377")
SRC289 = "/tmp/lc377-src-unpack/289-tree/scripts"
SRC274 = "/tmp/lc377-src-unpack/274-tree/scripts"
OUT = os.path.join(ROOT, "docs/research/surface-skipped-refs")

SECTION = re.compile(r"^\[([^\]]+)\]\s*$")
IDENT = re.compile(r"^[a-z][a-z0-9_]*$")

# Keys whose values are player-facing strings, not pack refs.
TEXT_KEYS = {
    "name",
    "desc",
    "op1",
    "op2",
    "op3",
    "op4",
    "op5",
    "iop1",
    "iop2",
    "iop3",
    "iop4",
    "iop5",
}

ANIM_KEYS = {
    "readyanim",
    "walkanim",
    "turnanim",
    "attackanim",
    "defendanim",
    "deathanim",
    "blockanim",
}

REF_PACKS = (
    "synth.pack",
    "seq.pack",
    "loc.pack",
    "npc.pack",
    "obj.pack",
    "inv.pack",
    "category.pack",
    "hunt.pack",
    "spotanim.pack",
    "param.pack",
    "model.pack",
    "idk.pack",
    "enum.pack",
    "struct.pack",
)


def load_pack_names(fn: str) -> set[str]:
    names: set[str] = set()
    path = os.path.join(PACK, fn)
    if not os.path.isfile(path):
        return names
    for line in open(path, encoding="utf-8", errors="replace"):
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        i, n = line.split("=", 1)
        if i.isdigit() and n:
            names.add(n)
    return names


def parse_file(path: str, dest: dict[str, dict[str, str]]) -> None:
    cur = None
    for line in open(path, encoding="utf-8", errors="replace"):
        raw = line.strip()
        if not raw or raw.startswith("//"):
            continue
        m = SECTION.match(raw)
        if m:
            cur = m.group(1)
            dest.setdefault(cur, {})
            continue
        if cur is None or "=" not in raw:
            continue
        k, v = raw.split("=", 1)
        dest[cur][k] = v


def parse_tree(root: str, kinds: tuple[str, ...]) -> dict[str, dict[str, dict[str, str]]]:
    out = {k: {} for k in kinds}
    if not os.path.isdir(root):
        return out
    for dirpath, _, files in os.walk(root):
        for fn in files:
            kind = fn.rsplit(".", 1)[-1]
            if kind not in out:
                continue
            parse_file(os.path.join(dirpath, fn), out[kind])
    return out


def is_int(s: str) -> bool:
    if not s:
        return False
    if s[0] in "+-":
        s = s[1:]
    return s.isdigit()


def classify_value(key: str, value: str, packs: dict[str, set[str]]) -> str:
    if key in TEXT_KEYS:
        return "text"
    if key.startswith("recol") or key.startswith("retex"):
        return "safe"
    if is_int(value) or value in {"yes", "no", "true", "false", "hide"}:
        return "safe"

    if key == "param":
        if "," not in value:
            return "skip_bad_param"
        pname, pval = value.split(",", 1)
        if pname not in packs["param.pack"]:
            return "skip_missing_param"
        if is_int(pval) or pval in {"yes", "no", "true", "false"}:
            return "safe"
        if pval in packs["synth.pack"] or pval in packs["seq.pack"] or pval in packs["spotanim.pack"]:
            return "safe"
        if pval in packs["loc.pack"] or pval in packs["npc.pack"] or pval in packs["obj.pack"]:
            return "safe"
        if pval in packs["inv.pack"] or pval in packs["category.pack"] or pval in packs["hunt.pack"]:
            return "safe"
        if pval in packs["model.pack"] or pval in packs["idk.pack"]:
            return "safe"
        if pval in packs.get("enum.pack", set()) or pval in packs.get("struct.pack", set()):
            return "safe"
        if IDENT.match(pval):
            return "skip_missing_ref"
        return "safe"

    tokens = [t.strip() for t in value.split(",") if t.strip()]
    if key in ANIM_KEYS or key.endswith("anim"):
        for t in tokens:
            if t not in packs["seq.pack"] and not is_int(t):
                return "skip_missing_ref"
        return "safe"
    if key == "category":
        return "safe" if value in packs["category.pack"] else "skip_missing_ref"
    if key in {"hunt", "huntmode"}:
        return "safe" if value in packs["hunt.pack"] else "skip_missing_ref"
    if key in {"owned_shop", "stockmarket"} or key.endswith("_shop"):
        return "safe" if value in packs["inv.pack"] else "skip_missing_ref"

    # Generic identifier: skip only if it looks like a debugname and is absent
    # from every ref pack (keeps free-form enums like moverestrict=outdoors).
    if IDENT.match(value):
        if any(value in packs[p] for p in REF_PACKS):
            return "safe"
        # common non-pack enums
        return "safe"
    if all(is_int(t) or IDENT.match(t) for t in tokens):
        return "safe"
    return "safe"


def main() -> int:
    if not os.path.isdir(SRC289) or not os.path.isdir(SRC274):
        print("REFUSE: extract 289/274 trees first:", SRC289, SRC274, file=sys.stderr)
        return 2

    packs = {fn: load_pack_names(fn) for fn in REF_PACKS}
    kinds = ("npc", "loc", "obj")
    src289 = parse_tree(SRC289, kinds)
    src274 = parse_tree(SRC274, kinds)
    dst = parse_tree(os.path.join(CONTENT, "scripts"), kinds)

    os.makedirs(OUT, exist_ok=True)
    rows: list[str] = []
    stats: dict[str, Counter] = {k: Counter() for k in kinds}
    skipped: list[tuple[str, str, str, str, str, str]] = []
    injectable: list[tuple[str, str, str, str, str]] = []
    only377 = {k: 0 for k in kinds}

    for kind in kinds:
        names = set(src289[kind]) | set(src274[kind]) | set(dst[kind])
        for name in names:
            s289 = src289[kind].get(name)
            s274 = src274[kind].get(name)
            s377 = dst[kind].get(name)
            if s377 is None:
                continue
            if s289 is None and s274 is None:
                only377[kind] += 1
                continue
            src_keys = {}
            if s274:
                src_keys.update(s274)
            if s289:
                src_keys.update(s289)  # 289 wins
            for key, val in src_keys.items():
                if key in s377:
                    stats[kind]["present"] += 1
                    continue
                cls = classify_value(key, val, packs)
                stats[kind][cls] += 1
                ladder = "289" if s289 and key in s289 else "274"
                if cls.startswith("skip"):
                    skipped.append((kind, name, key, val, cls, ladder))
                else:
                    injectable.append((kind, name, key, val, ladder))

    tsv = os.path.join(OUT, "skipped.tsv")
    with open(tsv, "w", encoding="utf-8") as f:
        f.write("kind\tname\tkey\tvalue\tclass\tladder\n")
        for row in sorted(skipped):
            f.write("\t".join(row) + "\n")

    inj = os.path.join(OUT, "injectable-leftover.tsv")
    with open(inj, "w", encoding="utf-8") as f:
        f.write("kind\tname\tkey\tvalue\tladder\n")
        for row in sorted(injectable):
            f.write("\t".join(row) + "\n")

    print("=== leftover same-name keys ===")
    for kind in kinds:
        c = stats[kind]
        print(
            f"{kind}: present={c['present']} injectable={c['text']+c['safe']} "
            f"skip_ref={c['skip_missing_ref']} skip_param={c['skip_missing_param']} "
            f"skip_bad_param={c['skip_bad_param']} 377-only-sections={only377[kind]}"
        )
        print("  classes:", dict(c))
    print(f"skipped rows: {len(skipped)} -> {tsv}")
    print(f"injectable leftover: {len(injectable)} -> {inj}")

    # skip-class breakdown
    by_cls = Counter(r[4] for r in skipped)
    print("skip classes:", dict(by_cls))
    by_key = Counter((r[0], r[2].split(",", 1)[0] if r[2] == "param" else r[2]) for r in skipped)
    print("top skip keys:")
    for (kind, key), n in by_key.most_common(25):
        print(f"  {n:4d}  {kind}.{key}")

    # param name breakdown for skip_missing_ref params
    pnames = Counter()
    for kind, name, key, val, cls, ladder in skipped:
        if key == "param" and "," in val:
            pnames[val.split(",", 1)[0]] += 1
    print("top skipped param names:")
    for p, n in pnames.most_common(20):
        print(f"  {n:4d}  {p}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
