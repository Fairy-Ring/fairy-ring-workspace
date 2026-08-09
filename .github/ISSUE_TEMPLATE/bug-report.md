---
name: Bug report (proof required)
about: Product or harness bug — PRs without human-reviewable proof will not be reviewed
title: "bug: "
labels: ["bug"]
---

## Proof bar (required)

**Pull requests that only restate a vague bug will not be reviewed** until this issue (or the PR body) includes enough evidence for a human to reproduce or reject the claim.

| Field | Fill in |
|-------|---------|
| **Expected** | |
| **Actual** | |
| **Repro steps** | 1. … 2. … |
| **Account / run id** (if smoke) | |
| **Stage / var** (e.g. `morttonquest=75`) | |
| **Log path or paste** (tail OK) | |
| **Headed shot** (path or attach) | optional but preferred |
| **Soft vs residual** | SOFT / residual bar §2 / unknown |

## Where

- [ ] Content (`vendor/content`)
- [ ] Engine (`vendor/engine`)
- [ ] Client pure (`vendor/client-ts`)
- [ ] Harness / smoke (`tools/harness`)
- [ ] Docs / process
- [ ] Unknown

```
component:
```

## Soft / authenticity honesty

- [ ] Soft thrash (`setvar` claimed stage, quest-critical `give`, etc.) is **labeled** if used  
- [ ] Not claiming residual authenticity without live `.rs2` stage write  

## Who is filing

- [ ] Human
- [ ] Coding agent (tool)

## Related

PR (if any):  
Context request issue (if any):  
