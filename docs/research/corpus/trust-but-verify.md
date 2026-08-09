# Trust but verify — corpus protocol

**Rule:** Agent research is **draft until main-thread re-measure**. Fast parallel is good; unchecked VERIFIED tags are not.

## Agent output format (mandatory)

Every factual claim must include a **re-measure recipe**:

```text
CLAIM: <one line>
TAG: VERIFIED_DRAFT | CANDIDATE | SOFT
RECIPE: <command or file path + what to look for>
PATH: docs/... (where written)
```

Examples of good recipes:

- `wc -l vendor/content/pack/npc.pack` → expect 3852  
- `rg -n '^1199=' vendor/content/pack/npc.pack`  
- `node … decode n55_51 for id 1567` → 3522,3284  
- `sed -n '299,332p' docs/superpowers/.../routequest_hollow.rs2`

## Main-thread duty

1. Pull completed subagent → extract claims with RECIPE.  
2. Re-run recipes; mark **VERIFIED** or demote to **CANDIDATE/FAIL**.  
3. Append result to [verify-log.md](verify-log.md).  
4. Only then update readiness prose / product order.

## Scheduler / continue

Campaign reminder prompt should: open this file, process verify-queue, spawn ≤3 new research agents, re-measure pending claims.

## What never gets VERIFIED without smoke

- “Quest mid PASS on account X” without log path re-read  
- Readiness scores /10  
- Era dates from wiki alone (CANDIDATE max)
