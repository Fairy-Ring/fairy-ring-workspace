/**
 * Port of rs2b0t Survival stages — state-driven (inv / skills / tile).
 * Do not gate on tutorial varp 281 (often not on the wire).
 */
import {
    type Task,
    Execution,
    Game,
    ChatDialog,
    Inventory,
    Skills,
    Locs,
    Npcs,
    reader,
    StageTask,
    walkToward,
    noDialog
} from '../../api.ts';
import type TutorialBot from '../TutorialBot.ts';
import { SURVIVAL_GATE, SURVIVAL_GATE_X } from './helpers.ts';

const GUIDE = 'RuneScape Guide';
const EXPERT = 'Survival Expert';

const INVENTORY_TAB = 3;
const STATS_TAB = 1;
const GUIDE_SIDE_MAX_X = 3097;

const inGuideRoom = () => Npcs.query().name(GUIDE).within(10).exists();
const expertInScene = () => Npcs.query().name(EXPERT).within(30).exists();
const onGuideSide = () => {
    const t = Game.tile();
    return t !== null && t.x <= GUIDE_SIDE_MAX_X;
};

class TalkToGuide extends StageTask {
    private talked = false;

    validate(): boolean {
        return !this.talked && noDialog() && inGuideRoom();
    }

    async execute(): Promise<void> {
        const npc = Npcs.query().name(GUIDE).nearest();
        if (!npc) return;
        await npc.interact('Talk-to');
        if (await Execution.delayUntil(() => ChatDialog.isOpen(), 8000)) {
            this.talked = true;
        }
    }
}

class OpenGuideDoor extends StageTask {
    validate(): boolean {
        return noDialog() && onGuideSide() && inGuideRoom() && Locs.query().name('Door').action('Open').within(10).exists();
    }

    async execute(): Promise<void> {
        const door = Locs.query().name('Door').action('Open').within(10).nearest();
        if (!door) return;
        await door.interact('Open');
        await Execution.delayTicks(3);
    }
}

class TalkSurvivalExpert extends StageTask {
    private talked = false;

    validate(): boolean {
        return !this.talked && noDialog() && !onGuideSide() && expertInScene();
    }

    async execute(): Promise<void> {
        const npc = Npcs.query().name(EXPERT).nearest();
        if (!npc) return;
        if (npc.distance() > 6) {
            await walkToward(npc.tile());
            return;
        }
        await npc.interact('Talk-to');
        if (await Execution.delayUntil(() => ChatDialog.isOpen(), 10000)) {
            this.talked = true;
        }
    }
}

class OpenInventoryTab extends StageTask {
    validate(): boolean {
        return (
            noDialog() &&
            reader.sideTabInterface(INVENTORY_TAB) !== -1 &&
            !Inventory.contains('Bronze axe') &&
            reader.activeSideTab() !== INVENTORY_TAB
        );
    }

    async execute(): Promise<void> {
        await Game.openSideTab(INVENTORY_TAB);
    }
}

class ChopTree extends StageTask {
    validate(): boolean {
        return (
            noDialog() &&
            Skills.xp('firemaking') === 0 &&
            Inventory.contains('Bronze axe') &&
            !Inventory.contains('Logs') &&
            !Game.animating()
        );
    }

    async execute(): Promise<void> {
        const tree =
            Locs.query().name('Tree').action('Chop down').within(15).nearest() ??
            Locs.query().name('Tree').within(15).nearest();
        if (!tree) return;
        if (tree.distance() > 5) {
            await walkToward(tree.tile());
            return;
        }
        await tree.interact('Chop down');
        await Execution.delayUntil(() => Game.animating() || Inventory.contains('Logs'), 8000);
        await Execution.delayUntil(() => Inventory.contains('Logs') || !Game.animating(), 15000);
    }
}

class LightFire extends StageTask {
    validate(): boolean {
        return (
            noDialog() &&
            Skills.xp('firemaking') === 0 &&
            Inventory.contains('Logs') &&
            Inventory.contains('Tinderbox') &&
            !Game.animating()
        );
    }

    async execute(): Promise<void> {
        // Ensure pack tab so use-with matches human path
        if (reader.activeSideTab() !== INVENTORY_TAB) {
            await Game.openSideTab(INVENTORY_TAB);
        }
        const box = Inventory.first('Tinderbox') ?? Inventory.firstIncludes('Tinderbox');
        const logs = Inventory.first('Logs') ?? Inventory.firstIncludes('Logs');
        if (!box || !logs) {
            this.bot.log(`LightFire: missing items box=${!!box} logs=${!!logs} inv=${Inventory.items().map(i => i.name).join(',')}`);
            return;
        }
        // Tinderbox → logs (order matters; logs→tinderbox is a no-op on LC).
        const ok = await box.useOn(logs);
        this.bot.log(`LightFire: use tinderbox#${box.id}@${box.slot} on logs#${logs.id}@${logs.slot} → ${ok}`);
        await Execution.delayUntil(() => !Inventory.contains('Logs') || Skills.xp('firemaking') > 0, 15000);
    }
}

class OpenStatsTab extends StageTask {
    private opened = false;

    validate(): boolean {
        return (
            !this.opened &&
            noDialog() &&
            Skills.xp('firemaking') > 0 &&
            reader.sideTabInterface(STATS_TAB) !== -1 &&
            reader.activeSideTab() !== STATS_TAB
        );
    }

    async execute(): Promise<void> {
        if (await Game.openSideTab(STATS_TAB)) {
            this.opened = true;
        }
    }
}

class TalkSurvivalAgain extends StageTask {
    validate(): boolean {
        return noDialog() && Skills.xp('firemaking') > 0 && !Inventory.contains('Small fishing net') && expertInScene();
    }

    async execute(): Promise<void> {
        const npc = Npcs.query().name(EXPERT).nearest();
        if (!npc) return;
        if (npc.distance() > 6) {
            await walkToward(npc.tile());
            return;
        }
        await npc.interact('Talk-to');
        await Execution.delayUntil(() => ChatDialog.isOpen(), 10000);
    }
}

class NetShrimp extends StageTask {
    validate(): boolean {
        return (
            noDialog() &&
            Skills.xp('cooking') === 0 &&
            Inventory.contains('Small fishing net') &&
            !Inventory.contains('Raw shrimps') &&
            !Game.animating()
        );
    }

    async execute(): Promise<void> {
        const spot =
            Npcs.query().name('Fishing spot').action('Net').within(20).nearest() ??
            Npcs.query().name('Fishing spot').within(20).nearest();
        if (!spot) return;
        if (spot.distance() > 6) {
            await walkToward(spot.tile());
            return;
        }
        await spot.interact('Net');
        await Execution.delayUntil(() => Game.animating() || Inventory.contains('Raw shrimps'), 8000);
        await Execution.delayUntil(() => Inventory.contains('Raw shrimps') || !Game.animating(), 20000);
    }
}

class CookShrimp extends StageTask {
    validate(): boolean {
        return noDialog() && Skills.xp('cooking') === 0 && Inventory.contains('Raw shrimps');
    }

    async execute(): Promise<void> {
        const fire = Locs.query().name('Fire').within(10).nearest();
        if (!fire) {
            const logs = Inventory.first('Logs');
            if (!logs) {
                const tree =
                    Locs.query().name('Tree').action('Chop down').within(15).nearest() ??
                    Locs.query().name('Tree').within(15).nearest();
                if (tree) {
                    await tree.interact('Chop down');
                    await Execution.delayUntil(() => Inventory.contains('Logs'), 15000);
                }
                return;
            }
            const box = Inventory.first('Tinderbox');
            if (box) {
                await box.useOn(logs);
                await Execution.delayUntil(() => Locs.query().name('Fire').within(10).exists(), 15000);
            }
            return;
        }

        const raw = Inventory.first('Raw shrimps');
        if (!raw) return;
        const before = Inventory.count('Raw shrimps');
        await raw.useOn(fire);
        await Execution.delayUntil(() => Inventory.count('Raw shrimps') < before || Skills.xp('cooking') > 0, 15000);
    }
}

/**
 * Survival→chef gate — cache m48_48: newbiegateclosedr2 @ 3089,3091 (+ l2 @ 3089,3092).
 * Cross = world x < 3089. Do not use guessed lines like 3095.
 */
class OpenSurvivalGate extends StageTask {
    private opened = false;

    validate(): boolean {
        if (this.opened || !noDialog() || Skills.xp('cooking') <= 0) return false;
        const t = Game.tile();
        // Already west of gate (cache x=3089)
        if (t && t.x < SURVIVAL_GATE_X) {
            this.opened = true;
            return false;
        }
        return true; // keep trying until past gate, even if Open action already consumed
    }

    async execute(): Promise<void> {
        const me = Game.tile();
        if (!me) return;
        if (me.x < SURVIVAL_GATE_X) {
            this.opened = true;
            return;
        }

        const gate =
            Locs.query()
                .name('Gate')
                .action('Open')
                .inside({
                    minX: SURVIVAL_GATE.x - 1,
                    maxX: SURVIVAL_GATE.x + 1,
                    minZ: SURVIVAL_GATE.z - 1,
                    maxZ: SURVIVAL_GATE.z + 2
                })
                .nearest() ?? Locs.query().name('Gate').action('Open').within(20).nearest();

        if (!gate) {
            // Locs may already be walls after open — walk west through cache gate tile
            this.bot.log(`OpenSurvivalGate no Open Gate — walk west through ${SURVIVAL_GATE.x},${SURVIVAL_GATE.z} from ${me.x},${me.z}`);
            await walkToward({ x: SURVIVAL_GATE_X - 2, z: SURVIVAL_GATE.z });
            const crossed = await Execution.delayUntil(() => {
                const t = Game.tile();
                return t !== null && t.x < SURVIVAL_GATE_X;
            }, 6000);
            if (crossed) this.opened = true;
            return;
        }

        const gt = gate.tile();
        if (gate.distance() > 2) {
            this.bot.log(`OpenSurvivalGate walk Gate@${gt.x},${gt.z} d=${gate.distance()} from ${me.x},${me.z}`);
            await walkToward(gt);
            await Execution.delayTicks(2);
            return;
        }

        this.bot.log(`OpenSurvivalGate open Gate@${gt.x},${gt.z} id=${gate.id} d=${gate.distance()}`);
        const dispatched = await gate.interact('Open');
        // From east: p_teleport(loc_coord) → 3089,* (on gate tile), then locs → walls.
        // Treat x <= 3089 as through once Open was sent (or x < 3089 after stepping west).
        const crossed = await Execution.delayUntil(() => {
            const t = Game.tile();
            if (!t) return false;
            if (t.x < SURVIVAL_GATE_X) return true;
            // On gate tile after tele: no longer Open-able means transition done
            return t.x <= SURVIVAL_GATE_X && !Locs.query().name('Gate').action('Open').within(2).exists();
        }, 8000);
        this.bot.log(`OpenSurvivalGate cross=${crossed} dispatched=${dispatched} tile=${Game.tile()?.x},${Game.tile()?.z}`);
        if (crossed) {
            this.opened = true;
            return;
        }
        // Step west off the gate line toward door-in corridor (z≈3084), not door-out (z=3090)
        await walkToward({ x: SURVIVAL_GATE_X - 2, z: 3084 });
        const walked = await Execution.delayUntil(() => {
            const t = Game.tile();
            return t !== null && t.x < SURVIVAL_GATE_X;
        }, 5000);
        if (walked) this.opened = true;
    }
}

export function survivalStages(bot: TutorialBot): Task[] {
    return [
        new TalkToGuide(bot),
        new OpenGuideDoor(bot),
        new TalkSurvivalExpert(bot),
        new OpenInventoryTab(bot),
        new ChopTree(bot),
        new LightFire(bot),
        new OpenStatsTab(bot),
        new TalkSurvivalAgain(bot),
        new NetShrimp(bot),
        new CookShrimp(bot),
        new OpenSurvivalGate(bot)
    ];
}
