/**
 * Special crossings: tolls, ships, quest unlock, use-item gates —
 * port of rs2b0t exec/specialCrossing.ts (classic-relevant paths).
 *
 * Heavy deps (Banking pack free, full quest unlock walk) log + fail soft
 * when API incomplete — loc/NPC/dialog hops are real.
 */

import {
    ChatDialog,
    Equipment,
    Execution,
    Game,
    Inventory,
    Locs,
    Npcs,
    reader,
    Skills
} from '../../script/browser/api.ts';
import { Reachability } from '../browser/Reachability.ts';
import { DirectNavigator } from '../browser/DirectNavigator.ts';
import {
    matchesUseItem,
    meetsRequirement,
    meetsSkill,
    pickChoice,
    type SpecialCrossing
} from '../data/specialCrossings.ts';
import { chebyshev, isOnFarSide } from '../followMath.ts';
import type { TransportInfo } from '../PathFinder.ts';
import { findTransportLoc, interactTransportLoc } from './transportLoc.ts';

const DIALOGUE_STEPS = 24;
const SHIP_DIALOGUE_STEPS = 40;
const GATE_REOPENS = 2;

function isNearTile(
    me: { x: number; z: number; level: number },
    dest: { x: number; z: number; level: number },
    rad: number
): boolean {
    return me.level === dest.level && chebyshev(me, dest) <= rad;
}

export interface PathStepTile {
    x: number;
    z: number;
    level: number;
    transport?: TransportInfo;
}

export type WalkToFn = (
    dest: { x: number; z: number; level: number },
    opts?: { radius?: number; timeoutMs?: number; log?: (msg: string) => void }
) => Promise<boolean>;

export const ENTRANA_RESTRICTED_GEAR_RE =
    /\b(sword|dagger|scimitar|longsword|2h|two.handed|mace|warhammer|battleaxe|axe|pickaxe|spear|hasta|halberd|maul|claws|whip|bow|crossbow|javelin|dart|thrownaxe|knife|staff|wand|battlestaff|halberd|cannon|helmet|full helm|med helm|coif|platebody|chainbody|platelegs|plateskirt|skirt of|kiteshield|square shield|sq shield|dragon square|god cape|fire cape|obsidian cape|defender)\b/i;

export function namesHaveEntranaRestrictedGear(names: readonly string[]): boolean {
    return names.some(n => n.length > 0 && ENTRANA_RESTRICTED_GEAR_RE.test(n));
}

export function hasEntranaRestrictedGear(): boolean {
    const names = [
        ...Inventory.items().map(i => i.name ?? ''),
        ...Equipment.items().map(i => i.name ?? '')
    ];
    return namesHaveEntranaRestrictedGear(names);
}

export async function handleSpecialCrossing(
    approach: PathStepTile,
    step: PathStepTile,
    sc: SpecialCrossing,
    log: (msg: string) => void,
    walkTo: WalkToFn
): Promise<boolean> {
    if (sc.requires && !meetsRequirement(Inventory.count(sc.requires.item), sc.requires)) {
        log(`${sc.label}: need ${sc.requires.count} ${sc.requires.item} — skipping`);
        return false;
    }

    if (sc.requiresSkill && !meetsSkill(Skills.level(sc.requiresSkill.name), sc.requiresSkill)) {
        log(`${sc.label}: need ${sc.requiresSkill.name} ${sc.requiresSkill.level} — skipping`);
        return false;
    }

    if (/port sarim.*entrana/i.test(sc.label) && hasEntranaRestrictedGear()) {
        log(`${sc.label}: remove weapons/armour before boarding Entrana`);
        return false;
    }

    if (sc.unlockQuest) {
        log(`${sc.label}: unlockQuest not fully wired in harness — skipping`);
        return false;
    }

    // Loc-backed multi-dest hubs (spirit trees)
    if (!sc.npc && sc.dialogue && sc.toTile && /spirit/i.test(sc.locName)) {
        const loc =
            Locs.query().name(sc.locName).action(sc.action).within(3).nearest() ??
            Locs.query().name(sc.locName).within(3).nearest();
        if (!loc || !(await loc.interact(sc.action))) {
            log(`${sc.label}: '${sc.locName}' not interactable`);
            return false;
        }
        const rad = sc.arrivalRadius ?? 3;
        const arrived = (): boolean => {
            const me = reader.worldTile();
            return me !== null && sc.toTile !== undefined && isNearTile(me, sc.toTile, rad);
        };
        for (let i = 0; i < SHIP_DIALOGUE_STEPS && !arrived(); i++) {
            const pick = pickChoice(ChatDialog.options(), sc.dialogue.choose);
            if (pick) await ChatDialog.chooseOption(pick);
            else if (ChatDialog.canContinue()) await ChatDialog.continue();
            else await Execution.delayTicks(1);
        }
        if (arrived()) {
            log(`${sc.label}: arrived`);
            return true;
        }
        log(`${sc.label}: spirit hop did not resolve — repathing`);
        return false;
    }

    if (sc.npc) {
        const preferred =
            sc.action && sc.action !== 'Open' && sc.action !== 'Go-through' && sc.action !== 'Pull'
                ? sc.action
                : 'Talk-to';
        const tryActs = preferred === 'Talk-to' ? (['Talk-to'] as const) : ([preferred, 'Talk-to'] as const);
        const stand = { x: sc.x, z: sc.z, level: sc.level };
        let interacted = false;
        for (const act of tryActs) {
            // Prefer NPC near stand tile
            const npc =
                Npcs.query()
                    .name(sc.npc)
                    .action(act)
                    .where(n => chebyshev(n.tile(), stand) <= 10)
                    .nearest() ??
                Npcs.query().name(sc.npc).action(act).within(12).nearest();
            if (npc && (await npc.interact(act))) {
                interacted = true;
                break;
            }
        }
        if (!interacted) {
            log(`${sc.label}: '${sc.npc}' not interactable (${preferred}) near (${sc.x},${sc.z})`);
            return false;
        }
        const rad = sc.arrivalRadius ?? 2;
        const arrived = (): boolean => {
            const me = reader.worldTile();
            return me !== null && sc.toTile !== undefined && isNearTile(me, sc.toTile, rad);
        };
        for (let i = 0; i < SHIP_DIALOGUE_STEPS && !arrived(); i++) {
            const pick = sc.dialogue ? pickChoice(ChatDialog.options(), sc.dialogue.choose) : null;
            if (pick) await ChatDialog.chooseOption(pick);
            else if (ChatDialog.canContinue()) await ChatDialog.continue();
            else await Execution.delayTicks(1);
        }
        if (arrived()) {
            if (sc.toTile && approach.level !== sc.toTile.level) await Execution.delayTicks(2);
            else if (sc.toTile) await Execution.delayTicks(1);
            log(`${sc.label}: arrived`);
            return true;
        }
        log(`${sc.label}: hop did not resolve — repathing`);
        return false;
    }

    const crossed = (): boolean => {
        if (sc.toTile) {
            const me = reader.worldTile();
            const rad = sc.arrivalRadius ?? 2;
            return me !== null && isNearTile(me, sc.toTile, rad);
        }
        return isOnFarSide(reader.worldTile(), approach, step);
    };

    if (/^open$/i.test(sc.action) && !sc.useItem) {
        const shutProbe = findTransportLoc({
            locName: sc.locName,
            action: sc.action,
            locX: sc.x,
            locZ: sc.z
        });
        if (!shutProbe) {
            if (crossed()) {
                log(`${sc.label}: already past open '${sc.locName}'`);
                return true;
            }
            const me = reader.worldTile();
            if (me && Reachability.canStep(approach, step)) {
                log(`${sc.label}: '${sc.locName}' already open — continuing`);
                if (me.x === approach.x && me.z === approach.z && me.level === approach.level) {
                    DirectNavigator.walk(step);
                    await Execution.delayUntil(() => crossed(), 2500);
                }
                return crossed() || Reachability.canStep(approach, step);
            }
        }
    }

    if (/sewer pipe|plague city/i.test(sc.label) && /pipe/i.test(sc.locName)) {
        if (!Equipment.contains('Gas mask')) {
            if (!(await Equipment.equip('Gas mask'))) {
                log(`${sc.label}: need Gas mask worn — skipping`);
                return false;
            }
        }
    }

    const maxOpens = sc.reopenAfterDialogue ? GATE_REOPENS : 1;
    for (let open = 0; open < maxOpens && !crossed(); open++) {
        const loc = sc.useItem
            ? Locs.query()
                  .name(sc.locName)
                  .where(l => {
                      const t = l.tile();
                      return Math.max(Math.abs(t.x - sc.x), Math.abs(t.z - sc.z)) <= 3;
                  })
                  .nearest()
            : findTransportLoc({ locName: sc.locName, action: sc.action, locX: sc.x, locZ: sc.z });
        if (!loc) {
            if (/^open$/i.test(sc.action) && (crossed() || Reachability.canStep(approach, step))) {
                log(`${sc.label}: '${sc.locName}' already open`);
                return true;
            }
            log(`${sc.label}: '${sc.locName}' not found at (${sc.x},${sc.z})`);
            return false;
        }
        if (sc.useItem) {
            // Nested forcewalk stands for Baxtorian rope — walkTo when provided
            if (/Baxtorian rope → rock/i.test(sc.label)) {
                const stand = { x: 2512, z: 3477, level: 0 };
                if (!(await walkTo(stand, { radius: 0, timeoutMs: 60_000, log: m => log(`  ${m}`) }))) {
                    log(`${sc.label}: could not reach rope-throw stand`);
                    return false;
                }
            } else if (/Baxtorian rope → ledge/i.test(sc.label)) {
                const stand = { x: 2512, z: 3466, level: 0 };
                if (!(await walkTo(stand, { radius: 0, timeoutMs: 60_000, log: m => log(`  ${m}`) }))) {
                    log(`${sc.label}: could not reach dead-tree stand`);
                    return false;
                }
            }
            const item =
                Inventory.items().find(candidate => matchesUseItem(candidate, sc.useItem!)) ??
                Inventory.first(sc.useItem.name);
            if (!item) {
                log(`${sc.label}: need ${sc.useItem.name} (id ${sc.useItem.id}) — skipping`);
                return false;
            }
            const useLoc =
                Locs.query()
                    .name(sc.locName)
                    .where(l => {
                        const t = l.tile();
                        return Math.max(Math.abs(t.x - sc.x), Math.abs(t.z - sc.z)) <= 3;
                    })
                    .nearest() ?? loc;
            if (!(await item.useOn(useLoc))) {
                log(`${sc.label}: could not use ${sc.useItem.name} on ${sc.locName}`);
                return false;
            }
            if (sc.toTile) {
                const rad = sc.arrivalRadius ?? 2;
                const landed = await Execution.delayUntil(() => {
                    const me = reader.worldTile();
                    return me !== null && isNearTile(me, sc.toTile!, rad);
                }, 14_000);
                if (landed) {
                    log(`${sc.label}: crossed`);
                    return true;
                }
                log(`${sc.label}: use-item hop did not land at toTile — repathing`);
                return false;
            }
        } else {
            // Exactmove jumps (basalt): never OP while mid-anim
            if (/jump/i.test(sc.action) && !(await Game.waitIdle(12_000, log))) {
                log(`${sc.label}: still busy — skip`);
                return false;
            }
            if (!interactTransportLoc(loc, sc.action) && !(await loc.interact(sc.action))) {
                log(`${sc.label}: '${sc.action}' not offered (ops: ${loc.actions().join(', ')})`);
                return false;
            }
        }
        const waitSteps = DIALOGUE_STEPS;
        for (let i = 0; i < waitSteps && !crossed(); i++) {
            const pick = sc.dialogue ? pickChoice(ChatDialog.options(), sc.dialogue.choose) : null;
            if (pick) await ChatDialog.chooseOption(pick);
            else if (ChatDialog.canContinue()) await ChatDialog.continue();
            else await Execution.delayTicks(1);
        }
        if (sc.toTile && !sc.useItem && !crossed()) {
            const rad = sc.arrivalRadius ?? 2;
            await Execution.delayUntil(() => {
                const me = reader.worldTile();
                return me !== null && isNearTile(me, sc.toTile!, rad);
            }, 14_000);
            // Basalt: wait exactmove fully clear before next hop
            if (/jump/i.test(sc.action)) {
                await Game.waitIdle(15_000, log);
                await Execution.delayTicks(1);
            }
        }
    }
    if (crossed()) {
        log(`${sc.label}: crossed`);
        return true;
    }
    log(`${sc.label}: dialogue did not resolve — repathing`);
    return false;
}
