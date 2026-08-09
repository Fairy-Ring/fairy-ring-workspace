/**
 * Port of rs2b0t QuestGuide stages — state-driven.
 */
import {
    type Task,
    Execution,
    Game,
    Skills,
    Locs,
    Npcs,
    reader,
    StageTask,
    noDialog,
    walkToward,
    doorAt
} from '../../api.ts';
import type TutorialBot from '../TutorialBot.ts';
import { MINE_Z, QUEST_GUIDE_DOOR } from './helpers.ts';

const GUIDE = 'Quest Guide';
const QUEST_TAB = 2;
const HALL_INSIDE = { x: 3086, z: 3123 };

const nearGuide = () => Npcs.query().name(GUIDE).within(10).exists();
const beforeMine = () => Skills.xp('mining') === 0;
const insideHall = () => {
    const t = Game.tile();
    return t !== null && t.z < QUEST_GUIDE_DOOR.z && t.z >= 3110;
};
const northOfHall = () => {
    const t = Game.tile();
    return (
        t !== null &&
        t.z >= QUEST_GUIDE_DOOR.z &&
        t.z <= QUEST_GUIDE_DOOR.z + 8 &&
        t.x >= QUEST_GUIDE_DOOR.x - 8 &&
        t.x <= QUEST_GUIDE_DOOR.x + 8
    );
};

interface QuestGuideProgress {
    talkedAgain: boolean;
}

class EnterQuestHall extends StageTask {
    validate(): boolean {
        return noDialog() && beforeMine() && northOfHall() && Npcs.query().name(GUIDE).within(12).exists();
    }
    async execute(): Promise<void> {
        const door = doorAt(QUEST_GUIDE_DOOR).nearest();
        if (!door) {
            await walkToward(HALL_INSIDE);
            return;
        }
        if (door.distance() > 5) {
            await walkToward(QUEST_GUIDE_DOOR);
            return;
        }
        await door.interact('Open');
        await Execution.delayUntil(() => insideHall(), 8000);
        await Execution.delayTicks(2);
    }
}

class TalkQuestGuide extends StageTask {
    private talked = false;
    validate(): boolean {
        return !this.talked && noDialog() && beforeMine() && insideHall() && nearGuide();
    }
    async execute(): Promise<void> {
        const npc = Npcs.query().name(GUIDE).nearest();
        if (!npc) return;
        await npc.interact('Talk-to');
        if (await Execution.delayUntil(() => !noDialog() || reader.sideTabInterface(QUEST_TAB) !== -1, 8000)) {
            this.talked = true;
        }
    }
}

class OpenQuestTab extends StageTask {
    private opened = false;
    validate(): boolean {
        return (
            !this.opened &&
            noDialog() &&
            beforeMine() &&
            reader.sideTabInterface(QUEST_TAB) !== -1 &&
            reader.activeSideTab() !== QUEST_TAB
        );
    }
    async execute(): Promise<void> {
        if (await Game.openSideTab(QUEST_TAB)) this.opened = true;
    }
}

class TalkQuestGuideAgain extends StageTask {
    private talked = false;
    constructor(
        bot: TutorialBot,
        private readonly progress: QuestGuideProgress
    ) {
        super(bot);
    }
    validate(): boolean {
        return (
            !this.talked &&
            noDialog() &&
            beforeMine() &&
            insideHall() &&
            nearGuide() &&
            reader.sideTabInterface(QUEST_TAB) !== -1
        );
    }
    async execute(): Promise<void> {
        const npc = Npcs.query().name(GUIDE).nearest();
        if (!npc) return;
        await npc.interact('Talk-to');
        if (await Execution.delayUntil(() => !noDialog(), 8000)) {
            this.talked = true;
            this.progress.talkedAgain = true;
        }
    }
}

class ClimbToMine extends StageTask {
    private done = false;
    constructor(
        bot: TutorialBot,
        private readonly progress: QuestGuideProgress
    ) {
        super(bot);
    }
    validate(): boolean {
        // also allow climb if quest tab open after first talks (progress flag or ladder only after again)
        return (
            !this.done &&
            noDialog() &&
            beforeMine() &&
            (this.progress.talkedAgain || reader.activeSideTab() === QUEST_TAB) &&
            Locs.query().name('Ladder').action('Climb-down').within(12).exists()
        );
    }
    async execute(): Promise<void> {
        const ladder = Locs.query().name('Ladder').action('Climb-down').within(12).nearest();
        if (!ladder) return;
        if (ladder.distance() > 5) {
            await walkToward(ladder.tile());
            return;
        }
        await ladder.interact('Climb-down');
        const arrived = await Execution.delayUntil(() => {
            const t = Game.tile();
            return t !== null && t.z >= MINE_Z;
        }, 8000);
        if (arrived) this.done = true;
    }
}

export function questGuideStages(bot: TutorialBot): Task[] {
    const progress: QuestGuideProgress = { talkedAgain: false };
    return [
        new EnterQuestHall(bot),
        new TalkQuestGuide(bot),
        new OpenQuestTab(bot),
        new TalkQuestGuideAgain(bot, progress),
        new ClimbToMine(bot, progress)
    ];
}
