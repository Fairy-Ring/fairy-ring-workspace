# Verification rubric — r377 corpus claims

Use these tags on every factual claim in campaign docs.

| Tag | Meaning | Re-verify how |
|-----|---------|----------------|
| **VERIFIED** | Measured this session from pack, unpack, map, script, engine source, or named smoke account | Re-run the same command / re-open path; SHA may drift |
| **CANDIDATE** | Present on 274/289 or period media; era-check incomplete for May 2006 | Diff vs cache 657 / period media |
| **SOFT** | Host prep only (`setvar`, `give`, `tele`) | Label in smoke RESULT; never claim as authentic product |

## Preferred evidence

1. Absolute path under `$RS2_R377_ROOT`  
2. Pack id from `vendor/content/pack/*.pack`  
3. World tile = `mx*64+lx`, `mz*64+lz` from `nXX_ZZ` / jm2  
4. Stage constants from quest `.constant`  
5. Full git SHA for content/engine when citing tree tip  
6. RuneScript semantics: engine line **or** @JagexAsh tweet (authoritative unless later contradicted)

## Forbidden as sole evidence

- Uncited OSRS wiki  
- “377-wip has a file so it is correct”  
- Chat-only memory without disk path  

## Ladder pointer

`docs/research/authenticity-stance.md` · RuneScript special case in `docs/research/runescript/README.md` § Authority.
