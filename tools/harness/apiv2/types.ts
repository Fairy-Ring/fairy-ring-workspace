/** PR 604 / rs2b0t#604 shapes. World tiles only — never scene-local. */

export type WorldTile = { x: number; z: number; level: number };

export type SendReason =
    | 'not-attached'
    | 'not-ingame'
    | 'scene-unavailable'
    | 'off-scene'
    | 'level-mismatch'
    | 'stale-target'
    | 'invalid-action'
    | 'unreachable'
    | 'driver-rejected';

export type WireCommand =
    | { kind: 'walk'; tile: WorldTile }
    | { kind: 'op'; target: { family: 'npc' | 'loc' | 'obj' | 'held'; id?: number; name?: string; x?: number; z?: number; level?: number }; action: string | number };

export type SendResult =
    | { sent: true; tick: number; command: WireCommand }
    | { sent: false; tick: number; reason: SendReason };

export type InvItem = { id: number; name: string | null; count: number; slot: number };

export type LocSnap = {
    id: number;
    name: string | null;
    x: number;
    z: number;
    level: number;
    ops: (string | null)[];
};

export type NpcSnap = {
    id: number;
    name: string | null;
    x: number;
    z: number;
    level: number;
    index: number;
    inCombat: boolean;
};

export type GroundSnap = {
    id: number;
    name: string | null;
    count: number;
    x: number;
    z: number;
    level: number;
    lx: number;
    lz: number;
    ops: (string | null)[];
};

export type ReadSnap = {
    tick: number;
    attached: boolean;
    ingame: boolean;
    sceneState: number;
    tile: WorldTile | null;
    inv: InvItem[];
    chat: string[];
    locs: LocSnap[];
    npcs: NpcSnap[];
    ground: GroundSnap[];
};

export type Evidence = (now: ReadSnap, before: ReadSnap) => boolean;

export type Outcome =
    | { kind: 'refused'; reason: SendReason; tick: number }
    | { kind: 'matched'; arm: string; now: ReadSnap; before: ReadSnap; tick: number }
    | { kind: 'stalled'; now: ReadSnap; before: ReadSnap; tick: number }
    | { kind: 'expired'; now: ReadSnap; before: ReadSnap; tick: number };

export type SettleOptions = {
    arms: Record<string, Evidence>;
    since?: ReadSnap;
    budgetTicks: number;
};
