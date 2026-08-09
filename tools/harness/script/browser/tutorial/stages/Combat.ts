/**
 * Port of rs2b0t Combat stages — state-driven.
 */
import {
    type Task,
    Execution,
    Game,
    Inventory,
    Equipment,
    Locs,
    Npcs,
    reader,
    StageTask,
    noDialog,
    walkToward,
    type Npc
} from '../../api.ts';
import type TutorialBot from '../TutorialBot.ts';
import { MINE_Z } from './helpers.ts';

const VANNAKA = 'Combat Instructor';
const RAT = 'Giant rat';
const WORN_TAB = 4;
const COMBAT_TAB = 0;
const MINE_GATE_X = 3094;
/**
 * Rat pen interior (m48_148):
 * - Gate pair newbiedoor5_l/r @ **3111,9518–9519** (east wall; pack ids 3022/3023)
 * - Rats ~3109,9519 (west of gate)
 * - Vannaka stand ~3107,9510 is **south of the pen**, not inside
 *
 * Old rs2b0t check `x<=3110 && z>=9512` is **too loose** — the yard between Vannaka
 * and the south fence (z 9512–9515) looked "in pen", so MeleeKillRat Attacked through
 * the cage with a sword. Tight AABB matches the fenced interior only.
 */
const PEN_BOX = { minX: 3102, maxX: 3110, minZ: 9516, maxZ: 9521 };
const PEN_GATE_BOX = { minX: 3109, maxX: 3113, minZ: 9516, maxZ: 9521 };
/** Hint 0_48_148_39_46 — approach from west (Vannaka side) then Open. */
const PEN_GATE_TILE = { x: 3111, z: 9518 };
/** Stand just west of the gate before OPLOC Open (reach + content p_teleport). */
const PEN_GATE_STAND = { x: 3110, z: 9518 };
const EXIT_LADDER_BOX = { minX: 3106, maxX: 3116, minZ: 9522, maxZ: 9530 };
/** Content hint 0_48_148_39_54 — ladder out after combat (Climb-up). */
const EXIT_LADDER_TILE = { x: 3111, z: 9526 };

const inCombatArea = (): boolean => {
    const t = Game.tile();
    return t !== null && t.z >= MINE_Z && t.x > MINE_GATE_X;
};
const inPen = (): boolean => {
    const t = Game.tile();
    if (!t || t.z < MINE_Z) return false;
    return t.x >= PEN_BOX.minX && t.x <= PEN_BOX.maxX && t.z >= PEN_BOX.minZ && t.z <= PEN_BOX.maxZ;
};
const hasSwordOrShield = () =>
    Inventory.contains('Bronze sword') ||
    Inventory.contains('Wooden shield') ||
    Equipment.contains('Bronze sword') ||
    Equipment.contains('Wooden shield');
const hasBow = () => Inventory.contains('Shortbow') || Equipment.contains('Shortbow');
const penGate = () =>
    Locs.query().name('Gate').action('Open').inside(PEN_GATE_BOX).nearest() ??
    Locs.query().name('Gate').action('Open').within(12).nearest();

interface CombatProgress {
    meleeKillDone: boolean;
    rangedKillDone: boolean;
}

/**
 * Engage one rat and wait for **death** (index leaves scene after we engaged).
 *
 * Do **not** use skill XP as a kill/stage gate — XP ticks per hit, not per kill,
 * and ClimbOut must not run after the first arrow.
 *
 * Do **not** treat "not in loc scan" before engage as a kill (false positive).
 */
class RatFight {
    private targetIndex = -1;
    /** Only count despawn as death if we saw combat / engage on this index. */
    private engaged = false;

    reset(): void {
        this.targetIndex = -1;
        this.engaged = false;
    }

    /**
     * @returns true when the engaged rat is dead (despawned after engage)
     */
    async advance(range: number, log?: (m: string) => void): Promise<boolean> {
        if (this.targetIndex !== -1) {
            const target = Npcs.query()
                .name(RAT)
                .where((n: Npc) => n.index === this.targetIndex)
                .first();
            if (!target) {
                if (this.engaged) {
                    log?.(`RatFight kill confirmed idx=${this.targetIndex} (despawn after engage)`);
                    this.reset();
                    return true;
                }
                // Never engaged — lost track; re-acquire
                log?.(`RatFight lost idx=${this.targetIndex} without engage — reacquire`);
                this.reset();
                return false;
            }
            if (Game.inCombat() || target.inCombat) {
                this.engaged = true;
                await Execution.delayTicks(5);
                return false;
            }
            // Idle again with target still up — re-click Attack
            log?.(`RatFight target idle idx=${this.targetIndex} — re-Attack`);
            this.targetIndex = -1;
            this.engaged = false;
        }

        const rat =
            Npcs.query().name(RAT).action('Attack').within(range).nearest() ??
            Npcs.query().name(RAT).within(range).nearest();
        if (!rat) {
            log?.(`RatFight no rat within ${range}`);
            return false;
        }

        log?.(`RatFight Attack idx=${rat.index} d=${rat.distance()} tile=${rat.tile().x},${rat.tile().z}`);
        await rat.interact('Attack');
        const index = rat.index;
        const gotEngage = await Execution.delayUntil(
            () =>
                Game.inCombat() ||
                Npcs.query()
                    .name(RAT)
                    .where((n: Npc) => n.index === index)
                    .results()
                    .some(n => n.inCombat),
            8000
        );
        if (gotEngage) {
            this.targetIndex = index;
            this.engaged = true;
            log?.(`RatFight engaged idx=${index}`);
        } else {
            log?.(`RatFight no engage idx=${index} (path/reach/wrong weapon?)`);
        }
        // Fast kill: engaged and already gone
        if (
            this.engaged &&
            !Npcs.query()
                .name(RAT)
                .where((n: Npc) => n.index === index)
                .exists()
        ) {
            log?.(`RatFight kill confirmed idx=${index} (fast despawn)`);
            this.reset();
            return true;
        }
        return false;
    }
}

class TalkVannaka extends StageTask {
    validate(): boolean {
        return noDialog() && inCombatArea() && reader.sideTabInterface(WORN_TAB) === -1;
    }
    async execute(): Promise<void> {
        const npc = Npcs.query().name(VANNAKA).within(40).nearest();
        if (!npc) return;
        if (npc.distance() > 5) {
            await walkToward(npc.tile());
            return;
        }
        await npc.interact('Talk-to');
        await Execution.delayUntil(() => reader.sideTabInterface(WORN_TAB) !== -1, 8000);
    }
}

class OpenWornTab extends StageTask {
    private opened = false;
    validate(): boolean {
        return !this.opened && noDialog() && inCombatArea() && reader.sideTabInterface(WORN_TAB) !== -1 && reader.activeSideTab() !== WORN_TAB;
    }
    async execute(): Promise<void> {
        if (await Game.openSideTab(WORN_TAB)) this.opened = true;
    }
}

class WieldDagger extends StageTask {
    validate(): boolean {
        return (
            noDialog() &&
            inCombatArea() &&
            Inventory.contains('Bronze dagger') &&
            !Equipment.contains('Bronze dagger') &&
            !hasSwordOrShield()
        );
    }
    async execute(): Promise<void> {
        await Equipment.equip('Bronze dagger');
    }
}

class TalkForSword extends StageTask {
    validate(): boolean {
        return noDialog() && inCombatArea() && Equipment.contains('Bronze dagger') && !hasSwordOrShield();
    }
    async execute(): Promise<void> {
        const npc = Npcs.query().name(VANNAKA).within(40).nearest();
        if (!npc) return;
        if (npc.distance() > 5) {
            await walkToward(npc.tile());
            return;
        }
        await npc.interact('Talk-to');
        await Execution.delayUntil(() => Inventory.contains('Bronze sword') || Inventory.contains('Wooden shield'), 8000);
    }
}

class EquipSwordShield extends StageTask {
    private done = false;
    validate(): boolean {
        return (
            !this.done &&
            noDialog() &&
            inCombatArea() &&
            !hasBow() &&
            (Inventory.contains('Bronze sword') || Inventory.contains('Wooden shield')) &&
            !(Equipment.contains('Bronze sword') && Equipment.contains('Wooden shield'))
        );
    }
    async execute(): Promise<void> {
        if (Inventory.contains('Bronze sword')) await Equipment.equip('Bronze sword');
        if (Inventory.contains('Wooden shield')) await Equipment.equip('Wooden shield');
        if (Equipment.contains('Bronze sword') && Equipment.contains('Wooden shield')) this.done = true;
    }
}

class OpenCombatTab extends StageTask {
    private opened = false;
    validate(): boolean {
        return (
            !this.opened &&
            noDialog() &&
            inCombatArea() &&
            Equipment.contains('Bronze sword') &&
            Equipment.contains('Wooden shield') &&
            reader.sideTabInterface(COMBAT_TAB) !== -1 &&
            reader.activeSideTab() !== COMBAT_TAB
        );
    }
    async execute(): Promise<void> {
        if (await Game.openSideTab(COMBAT_TAB)) this.opened = true;
    }
}

class EnterRatPen extends StageTask {
    private done = false;
    constructor(
        bot: TutorialBot,
        private readonly progress: CombatProgress
    ) {
        super(bot);
    }
    validate(): boolean {
        return (
            !this.done &&
            noDialog() &&
            inCombatArea() &&
            !inPen() &&
            !this.progress.meleeKillDone &&
            Equipment.contains('Bronze sword') &&
            Equipment.contains('Wooden shield') &&
            !Game.inCombat()
        );
    }
    async execute(): Promise<void> {
        // Already inside (e.g. gate open + p_teleport) — mark and stop thrashing Open.
        if (inPen()) {
            this.done = true;
            this.bot.log(`EnterRatPen already inside tile=${Game.tile()?.x},${Game.tile()?.z}`);
            return;
        }

        const gate = penGate();
        if (!gate) {
            this.bot.log(
                `EnterRatPen: Gate not in scan — walk stand ${PEN_GATE_STAND.x},${PEN_GATE_STAND.z} from ${Game.tile()?.x},${Game.tile()?.z}`
            );
            await walkToward(PEN_GATE_STAND);
            return;
        }
        // Get adjacent first — Open at d=4+ yields "I can't reach that!" (mine gate same class).
        if (gate.distance() > 2) {
            this.bot.log(
                `EnterRatPen walk Gate@${gate.tile().x},${gate.tile().z} id=${gate.id} d=${gate.distance()}`
            );
            await walkToward(gate.distance() > 6 ? PEN_GATE_STAND : gate.tile());
            return;
        }
        this.bot.log(`EnterRatPen Open Gate@${gate.tile().x},${gate.tile().z} id=${gate.id} d=${gate.distance()}`);
        await gate.interact('Open');
        if (await Execution.delayUntil(() => inPen(), 8000)) {
            this.done = true;
            this.bot.log(`EnterRatPen inside tile=${Game.tile()?.x},${Game.tile()?.z}`);
        } else {
            this.bot.log(
                `EnterRatPen Open sent but not in pen yet tile=${Game.tile()?.x},${Game.tile()?.z}`
            );
            // Nudge west-of-gate stand so next tick can re-Open / path
            await walkToward(PEN_GATE_STAND);
        }
    }
}

class MeleeKillRat extends StageTask {
    private readonly fight = new RatFight();
    constructor(
        bot: TutorialBot,
        private readonly progress: CombatProgress
    ) {
        super(bot);
    }
    validate(): boolean {
        // Hard gate: must be *inside* pen AABB — never melee from Vannaka yard.
        return !this.progress.meleeKillDone && noDialog() && inPen() && Equipment.contains('Bronze sword');
    }
    async execute(): Promise<void> {
        if (!inPen()) {
            this.bot.log(`MeleeKillRat bail: not in pen tile=${Game.tile()?.x},${Game.tile()?.z}`);
            return;
        }
        // Short melee range only — do not attack a rat seen through the fence at d=12.
        if (await this.fight.advance(6, m => this.bot.log(m))) {
            this.progress.meleeKillDone = true;
            this.bot.log('MeleeKillRat done (rat dead)');
        }
    }
}

class TalkForBow extends StageTask {
    constructor(
        bot: TutorialBot,
        private readonly progress: CombatProgress
    ) {
        super(bot);
    }
    validate(): boolean {
        return this.progress.meleeKillDone && noDialog() && inCombatArea() && !hasBow() && !Game.inCombat();
    }
    async execute(): Promise<void> {
        if (inPen()) {
            const gate = penGate();
            if (!gate) {
                this.bot.log(`TalkForBow exit: no Gate — walk ${PEN_GATE_TILE.x},${PEN_GATE_TILE.z}`);
                await walkToward(PEN_GATE_TILE);
                return;
            }
            if (gate.distance() > 2) {
                this.bot.log(`TalkForBow walk Gate d=${gate.distance()}`);
                await walkToward(gate.tile());
                return;
            }
            this.bot.log(`TalkForBow Open exit Gate d=${gate.distance()}`);
            await gate.interact('Open');
            await Execution.delayUntil(() => !inPen(), 8000);
            return;
        }
        const npc = Npcs.query().name(VANNAKA).within(40).nearest();
        if (!npc) {
            this.bot.log('TalkForBow: Vannaka not in scene');
            return;
        }
        if (npc.distance() > 5) {
            this.bot.log(`TalkForBow walk Vannaka d=${npc.distance()}`);
            await walkToward(npc.tile());
            return;
        }
        this.bot.log(`TalkForBow Talk-to d=${npc.distance()}`);
        await npc.interact('Talk-to');
        // Wait for bow **and** arrows (both needed to shoot)
        await Execution.delayUntil(
            () => Inventory.contains('Shortbow') || Equipment.contains('Shortbow'),
            10000
        );
        await Execution.delayUntil(
            () => Inventory.contains('Bronze arrow') || Equipment.contains('Bronze arrow'),
            4000
        );
        this.bot.log(
            `TalkForBow after talk bow=${hasBow()} arrows=${Inventory.contains('Bronze arrow') || Equipment.contains('Bronze arrow')} inv=${Inventory.debugList()}`
        );
    }
}

/** Outside pen, west of gate — clear line to rats for ranged. */
const RANGE_STAND = { x: 3112, z: 9518 };

const hasArrows = () =>
    Equipment.contains('Bronze arrow') ||
    Inventory.contains('Bronze arrow') ||
    Equipment.items().some(i => /arrow/i.test(i.name ?? '')) ||
    Inventory.items().some(i => /bronze arrow/i.test(i.name ?? ''));

const bowReady = () => Equipment.contains('Shortbow');
const arrowsReady = () =>
    Equipment.contains('Bronze arrow') || Equipment.items().some(i => /arrow/i.test(i.name ?? ''));

class RangedKillRat extends StageTask {
    private readonly fight = new RatFight();
    private equipAttempts = 0;
    constructor(
        bot: TutorialBot,
        private readonly progress: CombatProgress
    ) {
        super(bot);
    }
    validate(): boolean {
        return (
            !this.progress.rangedKillDone &&
            this.progress.meleeKillDone &&
            noDialog() &&
            inCombatArea() &&
            !inPen() &&
            hasBow()
        );
    }
    async execute(): Promise<void> {
        // Kill proof is NPC death only — never Skills.xp (ticks every hit).
        if (!bowReady()) {
            this.bot.log(`RangedKillRat equip Shortbow (worn=${Equipment.items().map(i => i.name).join(',')})`);
            await Equipment.equip('Shortbow');
            this.equipAttempts++;
            if (!bowReady() && this.equipAttempts < 8) return;
            if (!bowReady()) {
                this.bot.log('RangedKillRat: Shortbow still not worn — retry');
                return;
            }
        }
        if (!arrowsReady() && hasArrows()) {
            this.bot.log('RangedKillRat equip Bronze arrow');
            await Equipment.equip('Bronze arrow');
            // Stackable ammo: equipment reader may lag; if still in inv after Wield, try once more
            if (!arrowsReady() && Inventory.contains('Bronze arrow')) {
                await Equipment.equip('Bronze arrow');
            }
            if (!arrowsReady()) {
                // Still fire Attack — client will mes if ammo missing; don't softlock forever
                this.bot.log(
                    `RangedKillRat: arrows not seen in worn after equip — Attack anyway (inv has=${Inventory.contains('Bronze arrow')})`
                );
            }
        } else if (!arrowsReady() && !hasArrows()) {
            this.bot.log('RangedKillRat: no Bronze arrow in inv/worn — re-talk Vannaka path?');
            // Drop hasBow gate by not setting kill; TalkForBow only if !hasBow. Walk to Vannaka.
            const npc = Npcs.query().name(VANNAKA).within(40).nearest();
            if (npc && npc.distance() > 5) await walkToward(npc.tile());
            else if (npc) await npc.interact('Talk-to');
            return;
        }

        // Outside pen with line of sight
        const me = Game.tile();
        if (me && Math.max(Math.abs(me.x - RANGE_STAND.x), Math.abs(me.z - RANGE_STAND.z)) > 4) {
            const ratNear = Npcs.query().name(RAT).within(12).nearest();
            if (!ratNear || ratNear.distance() > 10) {
                this.bot.log(`RangedKillRat walk range stand ${RANGE_STAND.x},${RANGE_STAND.z}`);
                await walkToward(RANGE_STAND);
                return;
            }
        }

        this.bot.log(
            `RangedKillRat shoot bow=${bowReady()} arrowsWorn=${arrowsReady()} worn=[${Equipment.items().map(i => i.name).join(',')}]`
        );
        if (await this.fight.advance(15, m => this.bot.log(m))) {
            this.progress.rangedKillDone = true;
            this.bot.log('RangedKillRat done (rat dead) — not XP');
        }
    }
}

/**
 * After **ranged kill flag** only: climb ladder out of mine.
 * Never gate on ranged XP (hits grant XP; kill is NPC death).
 * Loc scan maxDist=15 — walk known tile until Ladder in scan.
 */
class ClimbOutLadder extends StageTask {
    private done = false;
    constructor(
        bot: TutorialBot,
        private readonly progress: CombatProgress
    ) {
        super(bot);
    }
    validate(): boolean {
        // Explicit progress flag only — no Skills.xp('ranged') recovery
        return !this.done && this.progress.rangedKillDone && noDialog() && inCombatArea();
    }
    async execute(): Promise<void> {
        let ladder =
            Locs.query().name('Ladder').action('Climb-up').inside(EXIT_LADDER_BOX).nearest() ??
            Locs.query().name('Ladder').action('Climb-up').nearest();
        if (!ladder) {
            this.bot.log(
                `ClimbOutLadder: Ladder not in loc scan (maxDist 15) — walk ${EXIT_LADDER_TILE.x},${EXIT_LADDER_TILE.z}`
            );
            await walkToward(EXIT_LADDER_TILE);
            return;
        }
        if (ladder.distance() > 5) {
            this.bot.log(
                `ClimbOutLadder walk Ladder@${ladder.tile().x},${ladder.tile().z} d=${ladder.distance()}`
            );
            await walkToward(ladder.tile());
            return;
        }
        this.bot.log(`ClimbOutLadder Climb-up id=${ladder.id} d=${ladder.distance()}`);
        await ladder.interact('Climb-up');
        const surfaced = await Execution.delayUntil(() => {
            const t = Game.tile();
            return t !== null && t.z < MINE_Z;
        }, 8000);
        if (surfaced) this.done = true;
    }
}

export function combatStages(bot: TutorialBot): Task[] {
    const progress: CombatProgress = { meleeKillDone: false, rangedKillDone: false };
    return [
        new TalkVannaka(bot),
        new OpenWornTab(bot),
        new WieldDagger(bot),
        new TalkForSword(bot),
        new EquipSwordShield(bot),
        new OpenCombatTab(bot),
        new EnterRatPen(bot, progress),
        new MeleeKillRat(bot, progress),
        new TalkForBow(bot, progress),
        new RangedKillRat(bot, progress),
        new ClimbOutLadder(bot, progress)
    ];
}
