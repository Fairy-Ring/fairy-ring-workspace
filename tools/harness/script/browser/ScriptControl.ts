/**
 * Cooperative stop/interrupt for harness scripts + nav.
 *
 * Panel Stop / scripts.stop() request stop; long-running work (walkTo, delayUntil)
 * polls `isStopRequested()` and returns early — same role as rs2b0t ScriptRunner
 * "stopping" + EventSignal for host-driven yield.
 *
 * WalkAlong does not import TaskBot; both sides use this module.
 */
let stopRequested = false;

export const ScriptControl = {
    /** Panel / host: request all cooperative loops to exit. */
    requestStop(): void {
        stopRequested = true;
    },

    /** Start of a script run — clear previous stop. */
    clearStop(): void {
        stopRequested = false;
    },

    isStopRequested(): boolean {
        return stopRequested;
    }
};
