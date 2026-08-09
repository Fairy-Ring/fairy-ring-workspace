/**
 * Curated walk destinations for harness panel WalkTo.
 * Same set as rs2b0t WalkDestinations (classic free/members hubs).
 * Rev-agnostic stands — verify against live map when in doubt.
 */

export interface WalkDestination {
    name: string;
    x: number;
    z: number;
    level: number;
}

export const WALK_DESTINATIONS: WalkDestination[] = [
    { name: 'Lumbridge', x: 3221, z: 3218, level: 0 },
    { name: 'Varrock', x: 3213, z: 3424, level: 0 },
    { name: 'Falador', x: 2965, z: 3378, level: 0 },
    { name: 'Ardougne', x: 2661, z: 3301, level: 0 },
    { name: 'Rellekka', x: 2668, z: 3660, level: 0 },
    { name: 'Taverley', x: 2895, z: 3435, level: 0 },
    { name: 'Draynor bank', x: 3092, z: 3243, level: 0 },
    { name: 'Al Kharid bank', x: 3269, z: 3167, level: 0 },
    { name: 'Edgeville bank', x: 3094, z: 3493, level: 0 },
    { name: "Seers' Village bank", x: 2725, z: 3491, level: 0 },
    { name: 'Yanille bank', x: 2612, z: 3092, level: 0 },
    { name: 'Catherby bank', x: 2809, z: 3441, level: 0 },
    { name: 'Varrock East bank', x: 3253, z: 3420, level: 0 },
    { name: 'Varrock West bank', x: 3185, z: 3436, level: 0 },
    { name: 'Falador East bank', x: 3013, z: 3355, level: 0 },
    { name: 'Falador West bank', x: 2946, z: 3368, level: 0 }
];

export function resolveDestination(name: string): WalkDestination | null {
    const key = name.trim().toLowerCase();
    return WALK_DESTINATIONS.find(d => d.name.toLowerCase() === key) ?? null;
}
