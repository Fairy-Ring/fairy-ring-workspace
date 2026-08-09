#!/usr/bin/env python3
"""One-shot opcode usage census for vendor/content/scripts/**/*.rs2.

Counts command-like call sites: identifier immediately followed by '('.
Includes secondary pointer forms (.mes, .queue, …) under the base name.
Excludes engine.rs2 declarations ([command,…] only — no name( call sites).
Also ranks top files for p_delay( and queue(.

Run:
  python3 docs/research/runescript/_opcode_census_measure.py
"""
from __future__ import annotations

import os
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SCRIPTS = ROOT / "vendor" / "content" / "scripts"
ENGINE = SCRIPTS / "engine.rs2"

# Match call-like tokens: optional leading dot, then name, then (
# Names may include * (queue*, weakqueue*).
CALL_RE = re.compile(r"(?<![A-Za-z0-9_])(\.?[A-Za-z_][A-Za-z0-9_*]*)\(")

# Control / language forms that are not engine opcodes (still appear as name() in source).
SKIP_RAW = {
    "if", "else", "while", "for", "switch", "case", "default", "return",
    "calc", "max", "min", "abs", "scale", "mod", "pow", "random",
    "tostring", "enum", "db_getfield", "db_find", "db_findnext", "db_getrow",
    "db_listall", "db_findreverse", "db_getfieldcount",
    "switch_int", "switch_obj", "switch_npc", "switch_loc", "switch_component",
    "switch_stat", "switch_category", "switch_struct",
    "enum_getvalue", "enum_getreversecount", "enum_getreverseindex",
    "enum_getoutputcount",
}

def load_engine_commands() -> set[str]:
    text = ENGINE.read_text(encoding="utf-8", errors="replace")
    names = set()
    for m in re.finditer(r"\[command,(\.?[A-Za-z_][A-Za-z0-9_*]*)\]", text):
        n = m.group(1)
        if n.startswith("."):
            n = n[1:]
        # strip trailing * for base family? keep full name as declared
        names.add(n.rstrip("*") if False else n)
        # also add base without *
        if n.endswith("*"):
            names.add(n[:-1])
        names.add(n)
    return names


def base_name(tok: str) -> str:
    if tok.startswith("."):
        tok = tok[1:]
    return tok


def main() -> None:
    engine_cmds = load_engine_commands()
    # expand: softtimer settimer are commented signature forms but still declared
    # also treat common chat procs as command-like when used as ~chatnpc(
    # User style lists engine-ish ops; we count ALL name( then filter to engine OR known chat helpers.

    total_calls: Counter[str] = Counter()
    engine_calls: Counter[str] = Counter()
    p_delay_files: Counter[str] = Counter()
    queue_files: Counter[str] = Counter()
    file_count = 0
    line_count = 0

    for dirpath, _, filenames in os.walk(SCRIPTS):
        for fn in filenames:
            if not fn.endswith(".rs2"):
                continue
            path = Path(dirpath) / fn
            rel = path.relative_to(SCRIPTS).as_posix()
            # skip engine declarations file for call census (optional: include if any calls)
            try:
                text = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            file_count += 1
            line_count += text.count("\n") + (1 if text and not text.endswith("\n") else 0)

            for m in CALL_RE.finditer(text):
                tok = m.group(1)
                name = base_name(tok)
                if name in SKIP_RAW:
                    continue
                # skip ~proc calls? ~ is before name so CALL_RE still gets chatnpc from ~chatnpc(
                total_calls[name] += 1
                # engine command match: name or name* family
                if name in engine_cmds or f"{name}*" in engine_cmds or name.rstrip("*") in engine_cmds:
                    engine_calls[name] += 1
                if name == "p_delay":
                    p_delay_files[rel] += 1
                if name == "queue":
                    queue_files[rel] += 1

    print(f"## meta files={file_count} approx_lines={line_count} engine_cmds={len(engine_cmds)}")
    print("\n## TOP40_ENGINE_COMMAND_CALLS")
    for i, (name, cnt) in enumerate(engine_calls.most_common(40), 1):
        print(f"{i:2d}\t{cnt:6d}\t{name}")

    print("\n## TOP40_ALL_CALL_LIKE (engine+procs, skip control)")
    for i, (name, cnt) in enumerate(total_calls.most_common(40), 1):
        tag = "CMD" if (name in engine_cmds or f"{name}*" in engine_cmds) else "OTHER"
        print(f"{i:2d}\t{cnt:6d}\t{name}\t{tag}")

    # highlight seed list
    seeds = [
        "p_delay", "settimer", "softtimer", "queue", "mes", "inv_add", "inv_del",
        "chatnpc", "inzone", "oc_category", "p_finduid",
        "strongqueue", "weakqueue", "longqueue", "cleartimer", "clearsofttimer",
        "npc_add", "npc_del", "anim", "sound_synth", "stat", "stat_base",
        "if_close", "p_teleport", "p_telejump", "p_walk", "coord", "npc_coord",
        "huntnext", "huntall", "npc_find", "obj_add", "obj_del", "inv_total",
        "inv_freespace", "inv_getobj", "map_members", "map_clock", "distance",
        "movecoord", "buildappearance", "spotanim_pl", "spotanim_map", "say",
        "npc_say", "facesquare", "uid", "displayname", "last_useitem", "last_item",
        "last_slot", "npc_param", "oc_param", "oc_name", "oc_members", "nc_name",
        "lc_name", "random", "calc",
    ]
    print("\n## SEED_AND_COMMON")
    for s in seeds:
        print(f"{total_calls.get(s, 0):6d}\t{s}\t{'CMD' if s in engine_cmds or f'{s}*' in engine_cmds else 'OTHER'}")

    print("\n## TOP_FILES_p_delay")
    for rel, cnt in p_delay_files.most_common(25):
        print(f"{cnt:5d}\t{rel}")

    print("\n## TOP_FILES_queue")
    for rel, cnt in queue_files.most_common(25):
        print(f"{cnt:5d}\t{rel}")

    # also strongqueue / weakqueue / longqueue file totals
    print("\n## QUEUE_FAMILY_TOTALS")
    for n in ("queue", "strongqueue", "weakqueue", "longqueue", "getqueue", "clearqueue"):
        print(f"{total_calls.get(n, 0):6d}\t{n}")


if __name__ == "__main__":
    main()
