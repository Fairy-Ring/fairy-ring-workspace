/**
 * Port of rs2b0t Chef stages — state-driven (delayUntil outcomes, not action hooks).
 *
 * Doors (content tut_doors_and_gates.rs2):
 * - East newbie_door2: enter from survival path
 * - West newbie_door3: exit only after music tab TUT_CLICKSIDE (opened_music_tab)
 * - Quest newbie_door4: only after run if_button (has_toggled_on_run)
 */
import {
    type Task,
    Execution,
    Game,
    Inventory,
    Skills,
    Locs,
    Npcs,
    reader,
    actions,
    StageTask,
    noDialog,
    walkToward,
    arriveNear,
    doorAt
} from '../../api.ts';
import type TutorialBot from '../TutorialBot.ts';
import {
    CHEF_DOOR_IN,
    CHEF_DOOR_IN_INSIDE,
    CHEF_DOOR_IN_OUTSIDE,
    CHEF_DOOR_OUT,
    CHEF_DOOR_OUT_INSIDE,
    QUEST_GUIDE_DOOR,
    SURVIVAL_GATE,
    SURVIVAL_GATE_X
} from './helpers.ts';

const CHEF = 'Master Chef';
const MUSIC_TAB = 13;
const CONTROLS_TAB = 12;

/**
 * L-shaped kitchen footprint (floor tiles from screenshots + map):
 * main room ~3073–3078 × 3082–3088, NW wing to door-out ~3073–3076 × 3088–3090.
 * South of z=3081 and east of x=3079 are **outside**.
 */
const CHEF_HOUSE = { minX: 3073, maxX: 3078, minZ: 3082, maxZ: 3090 };
/** Stand near chef (map npc 942 @ 3075,3085) — only walk here **after** inside. */
const CHEF_STAND = { x: 3076, z: 3085 };
/** East of chef house but not past survival gate (cache: gate x=3089). */
const APPROACH_MAX_X = SURVIVAL_GATE_X + 20; // survival yard ~3105

const nearChef = () => Npcs.query().name(CHEF).within(10).exists();
const insideChefHouse = () => {
    const t = Game.tile();
    return t !== null && t.x >= CHEF_HOUSE.minX && t.x <= CHEF_HOUSE.maxX && t.z >= CHEF_HOUSE.minZ && t.z <= CHEF_HOUSE.maxZ;
};
/** Correct side after west exit only */
const westOfChefHouse = () => {
    const t = Game.tile();
    return t !== null && t.x <= CHEF_DOOR_OUT.x;
};
/** Between chef west wall and survival yard (includes gate tile). */
const onChefApproach = () => {
    const t = Game.tile();
    return t !== null && t.x > CHEF_DOOR_OUT.x && t.x <= APPROACH_MAX_X;
};
/** True once west of the survival gate pair (3089). */
const pastSurvivalGate = () => {
    const t = Game.tile();
    return t !== null && t.x < SURVIVAL_GATE_X;
};
const breadChainNotStarted = () =>
    !Inventory.contains('Pot of flour') && !Inventory.contains('Bread dough') && !Inventory.contains('Bread');

/**
 * Dirt path: gate → SW → stand on-axis south of door-in (3079,3083).
 * Must share door **x** so check_axis → entering=true → walk through west.
 */
const CHEF_APPROACH = [
    { x: 3086, z: 3088 },
    { x: 3082, z: 3083 },
    CHEF_DOOR_IN_OUTSIDE
];

class OpenChefDoor extends StageTask {
    private approachWp = 0;
    private gateCrossed = false;
    private failShots = 0;
    validate(): boolean {
        // Enter from east approach; never when already west (exited) or inside
        // westOfChefHouse without bread is a recovery case handled below
        if (!noDialog() || Skills.xp('cooking') <= 0 || insideChefHouse() || !breadChainNotStarted()) {
            return false;
        }
        if (westOfChefHouse()) {
            // Left via door-out (or south/west walk) before bread — re-enter via door-in only
            return true;
        }
        return onChefApproach();
    }
    async execute(): Promise<void> {
        const me = Game.tile();
        if (!me) return;

        // If west of house without bread: do **not** open door-out; walk south then east to door-in
        if (westOfChefHouse()) {
            this.bot.log(`OpenChefDoor recover from west ${me.x},${me.z} → door-in ${CHEF_DOOR_IN.x},${CHEF_DOOR_IN.z}`);
            // South of house then east porch (avoid door-out at 3072,3090)
            const recover = [
                { x: 3070, z: 3078 },
                { x: 3082, z: 3078 },
                { x: 3082, z: 3084 },
                { x: CHEF_DOOR_IN.x + 1, z: CHEF_DOOR_IN.z }
            ];
            for (const p of recover) {
                const cur = Game.tile();
                if (!cur) return;
                if (Math.max(Math.abs(cur.x - p.x), Math.abs(cur.z - p.z)) <= 2) continue;
                await walkToward(p);
                await arriveNear(p, 2, 6000);
                return;
            }
            // fall through to open door-in
        }

        if (pastSurvivalGate() || me.x <= SURVIVAL_GATE_X) {
            // On gate tile (3089) after p_teleport counts as through for pathing west
            if (me.x < SURVIVAL_GATE_X || !Locs.query().name('Gate').action('Open').within(3).exists()) {
                this.gateCrossed = true;
            }
        }

        // Still east of gate — open survival gate (not a Door)
        if (!this.gateCrossed && me.x >= SURVIVAL_GATE_X) {
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
                    .nearest() ?? Locs.query().name('Gate').action('Open').within(12).nearest();

            if (!gate) {
                this.bot.log(`OpenChefDoor no Gate Open near ${SURVIVAL_GATE.x},${SURVIVAL_GATE.z} tile=${me.x},${me.z}`);
                await walkToward({ x: SURVIVAL_GATE_X - 2, z: 3084 });
                await arriveNear({ x: SURVIVAL_GATE_X - 2, z: 3084 }, 2, 5000);
                if (pastSurvivalGate()) this.gateCrossed = true;
                return;
            }

            const gt = gate.tile();
            if (me.x < gt.x) {
                this.gateCrossed = true;
            } else {
                if (gate.distance() > 2) {
                    this.bot.log(`OpenChefDoor walk Gate@${gt.x},${gt.z} d=${gate.distance()} from ${me.x},${me.z}`);
                    await walkToward(gt);
                    await arriveNear(gt, 2, 8000);
                    return;
                }
                this.bot.log(`OpenChefDoor open Gate@${gt.x},${gt.z} id=${gate.id} d=${gate.distance()}`);
                await gate.interact('Open');
                const crossed = await Execution.delayUntil(() => {
                    const t = Game.tile();
                    return t !== null && t.x <= SURVIVAL_GATE_X;
                }, 8000);
                this.bot.log(`OpenChefDoor gate cross=${crossed} tile=${Game.tile()?.x},${Game.tile()?.z}`);
                if (crossed) this.gateCrossed = true;
                else {
                    await walkToward({ x: SURVIVAL_GATE_X - 2, z: 3084 });
                    await Execution.delayUntil(() => pastSurvivalGate(), 5000);
                    if (pastSurvivalGate()) this.gateCrossed = true;
                }
                return;
            }
        }

        // Must be on-axis with door (same x for angle=west) before Open — see helpers.ts
        const onAxis =
            me.x === CHEF_DOOR_IN.x && Math.abs(me.z - CHEF_DOOR_IN.z) <= 2 && me.z !== CHEF_DOOR_IN.z;
        // Also accept standing on the door tile itself
        const onDoor = me.x === CHEF_DOOR_IN.x && me.z === CHEF_DOOR_IN.z;
        if (!onAxis && !onDoor) {
            while (this.approachWp < CHEF_APPROACH.length) {
                const p = CHEF_APPROACH[this.approachWp];
                const cur = Game.tile();
                if (!cur) return;
                if (Math.max(Math.abs(cur.x - p.x), Math.abs(cur.z - p.z)) <= 1) {
                    this.approachWp++;
                    continue;
                }
                this.bot.log(`OpenChefDoor approach wp${this.approachWp} → ${p.x},${p.z} from ${cur.x},${cur.z}`);
                const walked = await walkToward(p);
                const arrived = await arriveNear(p, 1, 8000);
                this.bot.log(
                    `OpenChefDoor wp${this.approachWp} walked=${walked} arrived=${arrived} now=${Game.tile()?.x},${Game.tile()?.z}`
                );
                if (arrived) this.approachWp++;
                return;
            }
            this.bot.log(
                `OpenChefDoor final on-axis ${CHEF_DOOR_IN_OUTSIDE.x},${CHEF_DOOR_IN_OUTSIDE.z} from ${me.x},${me.z}`
            );
            await walkToward(CHEF_DOOR_IN_OUTSIDE);
            await arriveNear(CHEF_DOOR_IN_OUTSIDE, 0, 8000);
            return;
        }

        // **Only** door-in — exact typecode snap (not name-nearest)
        const door = doorAt(CHEF_DOOR_IN, 1).nearest();
        if (!door) {
            this.bot.log(`OpenChefDoor no door-in loc — opLocAt ${CHEF_DOOR_IN.x},${CHEF_DOOR_IN.z}`);
            actions.opLocAt(CHEF_DOOR_IN.x, CHEF_DOOR_IN.z, 'Open');
        } else {
            this.bot.log(
                `OpenChefDoor open door-in@${door.tile().x},${door.tile().z} id=${door.id} d=${door.distance()} from ${me.x},${me.z}`
            );
            await door.interact('Open');
        }

        // Do **not** walkToward here — open_and_close_door p_teleports through;
        // a client tryMove races and cancels / sticks on the threshold.
        const inHouse = await Execution.delayUntil(() => {
            const t = Game.tile();
            return t !== null && (insideChefHouse() || (t.x <= CHEF_DOOR_IN_INSIDE.x && Math.abs(t.z - CHEF_DOOR_IN.z) <= 1));
        }, 5000);
        const after = Game.tile();
        this.bot.log(`OpenChefDoor inside=${inHouse} tile=${after?.x},${after?.z}`);
        if (!inHouse) {
            // One retry open without walk race (limit fail shots — visual noise)
            if (this.failShots < 3) {
                this.failShots++;
                await this.bot.shot?.(`chef-door-in-fail-${this.failShots}`);
            }
            await Execution.delayTicks(1);
            actions.opLocAt(CHEF_DOOR_IN.x, CHEF_DOOR_IN.z, 'Open');
            await Execution.delayUntil(() => insideChefHouse(), 4000);
        }
        if (insideChefHouse()) {
            await walkToward(CHEF_STAND);
        }
    }
}

class TalkChef extends StageTask {
    private talked = false;
    validate(): boolean {
        return !this.talked && noDialog() && insideChefHouse() && nearChef();
    }
    async execute(): Promise<void> {
        const npc = Npcs.query().name(CHEF).nearest();
        if (!npc) {
            this.bot.log(`TalkChef no NPC "${CHEF}" inside tile=${Game.tile()?.x},${Game.tile()?.z}`);
            return;
        }
        if (npc.distance() > 5) {
            this.bot.log(`TalkChef walk chef d=${npc.distance()} from ${Game.tile()?.x},${Game.tile()?.z}`);
            // Walk to chef tile — stay inside (chef @ 3075,3085 cache)
            await walkToward(npc.tile());
            return;
        }
        this.bot.log(`TalkChef Talk-to d=${npc.distance()}`);
        await npc.interact('Talk-to');
        if (await Execution.delayUntil(() => !noDialog() || Inventory.contains('Pot of flour'), 8000)) {
            this.talked = true;
            this.bot.log(`TalkChef ok flour=${Inventory.contains('Pot of flour')}`);
        }
    }
}

class MakeDough extends StageTask {
    validate(): boolean {
        return noDialog() && Inventory.contains('Pot of flour') && Inventory.contains('Bucket of water');
    }
    async execute(): Promise<void> {
        const flour = Inventory.first('Pot of flour') ?? Inventory.firstIncludes('flour');
        const water = Inventory.first('Bucket of water') ?? Inventory.firstIncludes('water');
        if (!flour || !water) return;
        await flour.useOn(water);
        await Execution.delayUntil(() => Inventory.contains('Bread dough'), 5000);
    }
}

class BakeBread extends StageTask {
    validate(): boolean {
        return noDialog() && Inventory.contains('Bread dough');
    }
    async execute(): Promise<void> {
        const dough = Inventory.first('Bread dough') ?? Inventory.firstIncludes('dough');
        const range = Locs.query().name('Range').within(8).nearest();
        if (!dough || !range) return;
        if (range.distance() > 5) {
            await walkToward(range.tile());
            return;
        }
        await dough.useOn(range);
        await Execution.delayUntil(() => !Inventory.contains('Bread dough'), 15000);
    }
}

class OpenMusicTab extends StageTask {
    private opened = false;
    private attempts = 0;
    validate(): boolean {
        return (
            !this.opened &&
            noDialog() &&
            Inventory.contains('Bread') &&
            insideChefHouse() &&
            reader.sideTabInterface(MUSIC_TAB) !== -1 &&
            reader.activeSideTab() !== MUSIC_TAB
        );
    }
    async execute(): Promise<void> {
        // TUT_CLICKSIDE when tutFlashIcon matches → server opened_music_tab
        const ok = actions.setSideTab(MUSIC_TAB);
        this.attempts++;
        this.bot.log(`OpenMusicTab setSideTab=${ok} (attempts=${this.attempts})`);
        await Execution.delayTicks(3);
        if (this.attempts >= 3 || reader.activeSideTab() === MUSIC_TAB) {
            this.opened = true;
        }
    }
}

class ExitChefHouse extends StageTask {
    validate(): boolean {
        // Only after bread — door-out (newbie_door3) is blocked until music tab server-side
        return noDialog() && Inventory.contains('Bread') && insideChefHouse();
    }
    async execute(): Promise<void> {
        const me = Game.tile();
        if (!me) return;
        // Walk to **inside** of door-out (NW wing), then open — never door-in
        const atExit =
            Math.abs(me.x - CHEF_DOOR_OUT_INSIDE.x) <= 1 && Math.abs(me.z - CHEF_DOOR_OUT_INSIDE.z) <= 1;
        if (!atExit) {
            this.bot.log(`ExitChefHouse walk to door-out inside from ${me.x},${me.z}`);
            await walkToward(CHEF_DOOR_OUT_INSIDE);
            await arriveNear(CHEF_DOOR_OUT_INSIDE, 1, 8000);
            return;
        }
        const door = doorAt(CHEF_DOOR_OUT, 1).nearest();
        if (door) {
            this.bot.log(`ExitChefHouse open door-out@${door.tile().x},${door.tile().z} id=${door.id}`);
            await door.interact('Open');
        } else {
            actions.opLocAt(CHEF_DOOR_OUT.x, CHEF_DOOR_OUT.z, 'Open');
        }
        await walkToward({ x: CHEF_DOOR_OUT.x - 2, z: CHEF_DOOR_OUT.z });
        const left = await Execution.delayUntil(() => westOfChefHouse(), 8000);
        this.bot.log(`ExitChefHouse west=${left} tile=${Game.tile()?.x},${Game.tile()?.z}`);
        if (!left) {
            actions.setSideTab(MUSIC_TAB);
            await Execution.delayTicks(3);
            actions.opLocAt(CHEF_DOOR_OUT.x, CHEF_DOOR_OUT.z, 'Open');
        }
    }
}

class OpenControlsTab extends StageTask {
    private opened = false;
    private attempts = 0;
    validate(): boolean {
        return (
            !this.opened &&
            noDialog() &&
            Inventory.contains('Bread') &&
            westOfChefHouse() &&
            reader.sideTabInterface(CONTROLS_TAB) !== -1 &&
            reader.activeSideTab() !== CONTROLS_TAB
        );
    }
    async execute(): Promise<void> {
        const ok = actions.setSideTab(CONTROLS_TAB);
        this.attempts++;
        this.bot.log(`OpenControlsTab setSideTab=${ok} (attempts=${this.attempts})`);
        await Execution.delayTicks(3);
        if (this.attempts >= 3 || reader.activeSideTab() === CONTROLS_TAB) {
            this.opened = true;
        }
    }
}

class ToggleRunOn extends StageTask {
    private done = false;
    private attempts = 0;
    validate(): boolean {
        return !this.done && noDialog() && Inventory.contains('Bread') && westOfChefHouse() && reader.sideTabInterface(CONTROLS_TAB) !== -1;
    }
    async execute(): Promise<void> {
        if (reader.activeSideTab() !== CONTROLS_TAB) {
            actions.setSideTab(CONTROLS_TAB);
            await Execution.delayTicks(2);
        }
        const ok = actions.setRun(true);
        this.attempts++;
        this.bot.log(`ToggleRunOn setRun=${ok} (attempts=${this.attempts})`);
        await Execution.delayTicks(3);
        if (ok || this.attempts >= 4) this.done = true;
    }
}

class OpenQuestGuideDoor extends StageTask {
    private done = false;
    validate(): boolean {
        const t = Game.tile();
        return (
            !this.done &&
            noDialog() &&
            Inventory.contains('Bread') &&
            Skills.xp('mining') === 0 &&
            westOfChefHouse() &&
            t !== null &&
            t.z < QUEST_GUIDE_DOOR.z
        );
    }
    async execute(): Promise<void> {
        const door = doorAt(QUEST_GUIDE_DOOR, 3).nearest();
        if (!door || door.distance() > 5) {
            const t = Game.tile();
            this.bot.log(`OpenQuestGuideDoor walk → ${QUEST_GUIDE_DOOR.x},${QUEST_GUIDE_DOOR.z} from ${t?.x},${t?.z}`);
            // One pack walk (repath inside). Do not thrash with arriveNear retries.
            const ok = await walkToward(QUEST_GUIDE_DOOR);
            this.bot.log(`OpenQuestGuideDoor walk ${ok ? 'ok' : 'fail'} tile=${Game.tile()?.x},${Game.tile()?.z}`);
            return;
        }
        await door.interact('Open');
        const crossed = await Execution.delayUntil(() => {
            const t = Game.tile();
            return t !== null && t.z >= QUEST_GUIDE_DOOR.z;
        }, 8000);
        if (crossed) {
            this.done = true;
            this.bot.log('OpenQuestGuideDoor crossed into hall');
        } else {
            this.bot.log('OpenQuestGuideDoor open no cross — retry');
            actions.setSideTab(CONTROLS_TAB);
            await Execution.delayTicks(1);
            actions.setRun(true);
        }
    }
}

export function chefStages(bot: TutorialBot): Task[] {
    return [
        new OpenChefDoor(bot),
        new TalkChef(bot),
        new MakeDough(bot),
        new BakeBread(bot),
        new OpenMusicTab(bot),
        new ExitChefHouse(bot),
        new OpenControlsTab(bot),
        new ToggleRunOn(bot),
        new OpenQuestGuideDoor(bot)
    ];
}
