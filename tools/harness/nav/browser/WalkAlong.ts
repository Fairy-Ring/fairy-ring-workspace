/**
 * @deprecated Prefer WalkExecutor — this file re-exports classic walkTo for
 * existing imports. Full hop handling lives in WalkExecutor + exec/*.
 *
 * @see tools/harness/nav/browser/WalkExecutor.ts
 * @see docs/plans/2026-08-04-nav-full-executor-port.md
 */
export { walkTo, WalkExecutor, type WalkToOpts, type WalkOptions } from './WalkExecutor.ts';
