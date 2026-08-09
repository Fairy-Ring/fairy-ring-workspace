/**
 * Path stickiness (ripped from rs2b0t @ 2535397 pathFollowPolicy).
 * SettingsStore omitted — use opts / env only for harness.
 */

/** Default server ticks with no tile change before stall repath. */
export const DEFAULT_PATH_STALL_TICKS = 9;

/** Default Chebyshev distance from the published path before deviation repath. */
export const DEFAULT_PATH_DEVIATION_CHEBYSHEV = 10;

/** Engage a planned transport hop only when this close to its approach tile. */
export const DEFAULT_TRANSPORT_APPROACH_CHEBYSHEV = 2;

export interface PathFollowConfig {
    stallTicks: number;
    deviationChebyshev: number;
    transportApproachChebyshev: number;
}

export interface PathFollowOverrides {
    stallTicks?: number;
    deviationChebyshev?: number;
    transportApproachChebyshev?: number;
}

function envInt(name: string, fallback: number): number {
    const n = Number(process.env[name]);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Resolve follow stickiness: walk opts → env → defaults. */
export function resolvePathFollowConfig(over?: PathFollowOverrides | null): PathFollowConfig {
    return {
        stallTicks: Math.max(
            1,
            over?.stallTicks ?? envInt('NAV_PATH_STALL_TICKS', DEFAULT_PATH_STALL_TICKS)
        ),
        deviationChebyshev: Math.max(
            1,
            over?.deviationChebyshev ?? envInt('NAV_PATH_DEVIATION', DEFAULT_PATH_DEVIATION_CHEBYSHEV)
        ),
        transportApproachChebyshev: Math.max(
            0,
            over?.transportApproachChebyshev ?? DEFAULT_TRANSPORT_APPROACH_CHEBYSHEV
        )
    };
}
