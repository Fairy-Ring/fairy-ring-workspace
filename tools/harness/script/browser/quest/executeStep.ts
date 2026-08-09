/**
 * Execute one {@link QuestStep} on the harness ABI.
 * Pattern: rs2b0t `quests/exec/steps.ts` — thinner surface for 377.
 */
import {
    Chat,
    ChatDialog,
    Execution,
    Game,
    Inventory,
    Locs,
    Npcs,
    QuestHardFail,
    Traversal,
    clearDialogs,
    noDialog,
    type WorldTile
} from '../api.ts';
import type { QuestExecCtx, QuestStep } from './types.ts';
import { pickDialogOption } from './dialogPath.ts';

/**
 * After a Talk/OP, wait for chat modal **or** engine fail-fast mes.
 * Default is **patient** — OPNPC often walks first; 4–5s is too short.
 * Throws {@link QuestHardFail} only on `No trigger for` (content gap).
 */
async function waitDialogOrHardFail(
    label: string,
    timeoutMs: number,
    log: (m: string) => void
): Promise<boolean> {
    const opened = await Execution.delayUntil(() => {
        if (Chat.noTriggerFor(32)) return true;
        return ChatDialog.isOpen();
    }, timeoutMs);
    const nt = Chat.noTriggerFor(32);
    if (nt) {
        log(`FAIL-FAST: ${nt}`);
        throw new QuestHardFail(`${label}: ${nt}`);
    }
    return opened && ChatDialog.isOpen();
}

/** Wall-clock cap waiting for chat after a single Talk-to (not reclick storm). */
const TALK_DIALOG_MS = 30_000;

async function walkTo(
    tile: WorldTile,
    radius: number,
    log: (m: string) => void
): Promise<boolean> {
    const here = Game.tile();
    if (
        here &&
        Math.max(Math.abs(here.x - tile.x), Math.abs(here.z - tile.z)) <= radius &&
        (here.level ?? 0) === (tile.level ?? 0)
    ) {
        return true;
    }
    log(`walk ${tile.x},${tile.z} r=${radius}`);
    return Traversal.walkTo(
        { x: tile.x, z: tile.z, level: tile.level ?? 0 },
        { radius, log }
    );
}

export async function executeStep(step: QuestStep, ctx: QuestExecCtx): Promise<boolean> {
    const { log } = ctx;

    // World ops need sceneState=2 (post-tele often 1 while maps load)
    if (step.kind !== 'done' && step.kind !== 'wait' && !Game.sceneReady()) {
        log(`ensure sceneState=2 before ${step.kind} (now ${Game.sceneState()})`);
        if (!(await Game.waitSceneReady(60_000, log))) return false;
    }

    switch (step.kind) {
        case 'done':
            return true;

        case 'wait': {
            log(`wait: ${step.reason}`);
            // Prefer game ticks; `ms` only if caller forces wall-clock (rare)
            if (step.ms != null && step.ms > 0) {
                await Execution.delay(step.ms);
            } else {
                await Execution.delayTicks(2);
            }
            return true;
        }

        case 'walk':
            return walkTo(step.tile, step.radius ?? 3, log);

        case 'talk': {
            if (!noDialog()) {
                log(`talk ${step.npc}: dialog already open — AdvanceDialog owns tree`);
                return true;
            }
            // Prefer stand near anchor; if path fails (outpost gates / basalt pad),
            // still try OPNPC when the NPC is already in scene (rs2b0t Reach style).
            if (step.anchor) {
                if (!(await walkTo(step.anchor, Math.min(step.radius ?? 4, 2), log))) {
                    log(`talk walk fail → ${step.npc} — try in-scene NPC`);
                }
            }
            let npc =
                Npcs.query().name(step.npc).within(12).nearest() ??
                Npcs.query().name(step.npc).within(24).nearest() ??
                Npcs.query().name(step.npc).within(40).nearest();
            if (!npc) {
                const near = Npcs.query()
                    .within(24)
                    .all()
                    .slice(0, 8)
                    .map(n => n.name)
                    .filter(Boolean);
                log(`talk: no npc ${step.npc} (near: ${near.join(', ') || 'none'})`);
                return false;
            }
            if (npc.distance() > 1) {
                log(`talk approach ${step.npc} d=${npc.distance()}`);
                const walked = await walkTo(npc.tile(), 1, log);
                if (!walked) {
                    // Server-side walk-on-OPNPC as last resort when graph blocked
                    log(`talk: approach path fail d=${npc.distance()} — OPNPC anyway`);
                }
                npc =
                    Npcs.query().name(step.npc).within(12).nearest() ??
                    Npcs.query().name(step.npc).within(24).nearest() ??
                    Npcs.query().name(step.npc).within(40).nearest();
                if (!npc) {
                    log(`talk: lost ${step.npc} after approach`);
                    return false;
                }
            }
            // Settle fully before OPNPC — mid-route tryMove thrash made Talk miss
            // (no dialog for 30s). waitIdle > delayTicks(2).
            if (!(await Game.waitIdle(8_000, log))) {
                log(`talk ${step.npc}: still moving — OPNPC anyway`);
            }

            // **One** Talk-to only. AdvanceDialog walks the multi tree on later ticks.
            if (!noDialog()) {
                log(`talk ${step.npc}: dialog already open`);
                return true;
            }
            log(`talk ${step.npc}`);
            await npc.interact('Talk-to');
            const dialog = await waitDialogOrHardFail(`talk ${step.npc}`, TALK_DIALOG_MS, log);
            if (!dialog) {
                const nih = Chat.nothingInteresting(16);
                if (nih) {
                    log(`talk ${step.npc}: no dialog (${nih})`);
                    return false;
                }
                log(`talk ${step.npc}: no dialog after ${TALK_DIALOG_MS}ms`);
                return false;
            }
            // One tick for first page paint; AdvanceDialog spacebars continues
            await Execution.delayTicks(1);
            return true;
        }

        case 'interactLoc': {
            const jumpish = /jump|cross/i.test(step.op);
            // Never OP while mid exact-move / anim — "Please finish what you are doing first."
            if (!(await Game.waitIdle(12_000, log))) {
                log(`interactLoc: still busy — skip ${step.op}`);
                return false;
            }
            if (step.anchor) {
                const walked = await walkTo(step.anchor, step.radius ?? 3, log);
                // Basalt rocks: chain tiles often unreachable to each other — OP nearest
                if (!walked && !jumpish) return false;
                if (!walked && jumpish) {
                    log(`interactLoc: walk to anchor failed — try nearest ${step.loc}`);
                }
                // Walk itself can leave us animating / routing
                if (!(await Game.waitIdle(12_000, log))) {
                    log(`interactLoc: busy after walk — skip ${step.op}`);
                    return false;
                }
            }
            const loc =
                Locs.query().name(step.loc).action(step.op).within(12).nearest() ??
                Locs.query().name(step.loc).within(12).nearest() ??
                (jumpish
                    ? Locs.query().name(step.loc).action(step.op).within(20).nearest()
                    : null);
            if (!loc) {
                log(`interactLoc: no ${step.loc}`);
                return false;
            }
            log(`${step.op} ${step.loc}`);
            const before = Game.tile();
            await loc.interact(step.op);
            // Fail-fast if engine reports missing OPLOC trigger (dev mes)
            await Execution.delayTicks(1);
            const nt = Chat.noTriggerFor(16);
            if (nt) {
                log(`FAIL-FAST: ${nt}`);
                throw new QuestHardFail(`interactLoc ${step.loc}: ${nt}`);
            }
            if (jumpish) {
                // Wait until anim/exactmove starts (or we already moved), then idle
                await Execution.delayUntil(
                    () =>
                        Game.busy() ||
                        (() => {
                            const t = Game.tile();
                            return !!(
                                before &&
                                t &&
                                (t.x !== before.x || t.z !== before.z || (t.level ?? 0) !== (before.level ?? 0))
                            );
                        })(),
                    3000
                );
                // Full settle: exactmove + forcemove + primaryAnim clear
                if (!(await Game.waitIdle(20_000, log))) {
                    log(`warn: ${step.op} still busy after settle`);
                }
                // Extra ticks so next Jump-across is not back-to-back on server
                await Execution.delayTicks(2);
                const after = Game.tile();
                log(
                    `after ${step.op}: ${before ? `${before.x},${before.z}` : '?'} → ${after ? `${after.x},${after.z}` : '?'}`
                );
                if (
                    before &&
                    after &&
                    before.x === after.x &&
                    before.z === after.z &&
                    (before.level ?? 0) === (after.level ?? 0)
                ) {
                    log(`warn: ${step.op} did not move — will re-pick rock`);
                }
            } else {
                await Execution.delayTicks(1);
            }
            return true;
        }

        case 'jump': {
            // rs2b0t specialCrossing pattern: idle → OP → delayUntil(toTile) → idle
            const rad = step.arrivalRadius ?? 1;
            const nearTo = (): boolean => {
                const t = Game.tile();
                if (!t) return false;
                if ((t.level ?? 0) !== (step.toTile.level ?? 0)) return false;
                return Math.max(Math.abs(t.x - step.toTile.x), Math.abs(t.z - step.toTile.z)) <= rad;
            };
            if (nearTo()) {
                log(`jump already at ${step.toTile.x},${step.toTile.z}`);
                return true;
            }
            if (!(await Game.waitIdle(12_000, log))) {
                log('jump: still busy — skip');
                return false;
            }
            if (step.anchor) {
                const walked = await walkTo(step.anchor, step.radius ?? 1, log);
                if (!walked) {
                    log(`jump: walk to stand failed — try nearest ${step.loc}`);
                }
                if (!(await Game.waitIdle(12_000, log))) {
                    log('jump: busy after walk — skip');
                    return false;
                }
            }
            if (nearTo()) return true;
            // Prefer loc nearest **anchor** (Horror Broken bridge left vs right both Cross).
            const pickNear = (list: ReturnType<ReturnType<typeof Locs.query>['all']>) => {
                if (!list.length) return null;
                const ref = step.anchor ?? Game.tile();
                if (!ref) return list[0]!;
                return list.slice().sort((a, b) => {
                    const da = Math.max(Math.abs(a.tile().x - ref.x), Math.abs(a.tile().z - ref.z));
                    const db = Math.max(Math.abs(b.tile().x - ref.x), Math.abs(b.tile().z - ref.z));
                    return da - db;
                })[0]!;
            };
            const withOp = Locs.query().name(step.loc).action(step.op).within(16).all();
            const anyName = Locs.query().name(step.loc).within(16).all();
            const loc =
                pickNear(withOp) ??
                pickNear(anyName) ??
                Locs.query().name(step.loc).action(step.op).within(20).nearest();
            if (!loc) {
                log(`jump: no ${step.loc}`);
                return false;
            }
            log(`${step.op} ${step.loc}${step.label ? ` (${step.label})` : ''} → ${step.toTile.x},${step.toTile.z}`);
            const before = Game.tile();
            await loc.interact(step.op);
            await Execution.delayTicks(1);
            const nt = Chat.noTriggerFor(16);
            if (nt) {
                log(`FAIL-FAST: ${nt}`);
                throw new QuestHardFail(`jump ${step.loc}: ${nt}`);
            }
            const landed = await Execution.delayUntil(() => nearTo(), 14_000);
            await Game.waitIdle(15_000, log);
            await Execution.delayTicks(2);
            const after = Game.tile();
            log(
                `jump land: ${before ? `${before.x},${before.z}` : '?'} → ${after ? `${after.x},${after.z}` : '?'} ok=${landed}`
            );
            return landed || nearTo();
        }

        case 'useOnNpc': {
            if (step.anchor) {
                if (!(await walkTo(step.anchor, Math.min(step.radius ?? 4, 2), log))) {
                    log(`useOnNpc walk fail → try NPC in scene`);
                }
            }
            let npc =
                Npcs.query().name(step.npc).within(12).nearest() ??
                Npcs.query().name(step.npc).within(24).nearest() ??
                Npcs.query().name(step.npc).within(40).nearest();
            if (!npc) {
                log(`useOnNpc: no npc ${step.npc}`);
                return false;
            }
            if (npc.distance() > 1) {
                log(`useOnNpc approach ${step.npc} d=${npc.distance()}`);
                await walkTo(npc.tile(), 1, log);
                npc =
                    Npcs.query().name(step.npc).within(12).nearest() ??
                    Npcs.query().name(step.npc).within(24).nearest();
                if (!npc) {
                    log(`useOnNpc: lost ${step.npc}`);
                    return false;
                }
            }
            if (!(await Game.waitIdle(8_000, log))) {
                log(`useOnNpc: still moving — try use`);
            }
            // Prefer exact obj id when display names collide (loaded vs empty vessel).
            let item =
                step.itemId != null
                    ? Inventory.items().find(i => (i.id | 0) === (step.itemId | 0)) ?? null
                    : Inventory.first(step.item);
            if (!item) item = Inventory.first(step.item);
            if (!item) {
                log(`useOnNpc missing item ${step.item}${step.itemId != null ? `#${step.itemId}` : ''}`);
                return false;
            }
            log(
                `use ${item.name ?? step.item}#${item.id} on ${step.npc}` +
                    (step.itemId != null ? ` (want id ${step.itemId})` : '')
            );
            const invBefore = step.itemId != null ? Inventory.items().filter(i => (i.id | 0) === (step.itemId | 0)).length : -1;
            await item.useOn(npc);
            // Tiadeche vessel OP has p_delay(10) cutscene + multi — wait for chat or idle
            await Execution.delayTicks(2);
            await Execution.delayUntil(() => ChatDialog.isOpen() || Game.idle(), 18_000);
            // Drain multi (Yes accept catch); AdvanceDialog may also run between tasks
            await clearDialogs(24);
            // Tinsay vessel path: if_close → p_delay(3) → inv_add manual while chat closed.
            // Stay in this step a bit so decide() does not thrash mid-exchange.
            if (step.itemId != null && invBefore > 0) {
                await Execution.delayUntil(() => {
                    const still = Inventory.items().filter(i => (i.id | 0) === (step.itemId! | 0)).length;
                    return still < invBefore || ChatDialog.isOpen();
                }, 8_000);
                // Extra settle for post-del p_delay + inv_add (crafting manual)
                await Execution.delayTicks(8);
                await clearDialogs(16);
            }
            await Game.waitIdle(12_000, log);
            return true;
        }

        case 'useOnLoc': {
            if (step.anchor) {
                if (!(await walkTo(step.anchor, step.radius ?? 3, log))) return false;
            }
            const item = Inventory.first(step.item);
            // Prefer loc nearest **anchor**, not player. Shared display names
            // (Horror "Broken bridge" left vs right @ 2596/2598) otherwise always
            // hit the left spot after it is already fixed → mesbox thrash.
            const candidates = Locs.query().name(step.loc).within(16).all();
            let loc =
                candidates.length > 0
                    ? candidates.slice().sort((a, b) => {
                          const ref = step.anchor ?? Game.tile();
                          if (!ref) return a.distance() - b.distance();
                          const da = Math.max(
                              Math.abs(a.tile().x - ref.x),
                              Math.abs(a.tile().z - ref.z)
                          );
                          const db = Math.max(
                              Math.abs(b.tile().x - ref.x),
                              Math.abs(b.tile().z - ref.z)
                          );
                          return da - db;
                      })[0]!
                    : null;
            if (!loc) {
                loc =
                    Locs.query().name(step.loc).within(16).nearest() ??
                    Locs.query().name(step.loc).within(24).nearest();
            }
            if (!item || !loc) {
                log(`useOnLoc missing item/loc ${step.item}/${step.loc}`);
                return false;
            }
            const lt = loc.tile();
            log(
                `use ${step.item} on ${step.loc} @${lt.x},${lt.z}` +
                    (step.anchor ? ` (anchor ${step.anchor.x},${step.anchor.z})` : '')
            );
            await item.useOn(loc);
            await Execution.delayTicks(4);
            // Drain half-fixed / already-fixed / need-nails mesboxes so FAIL-FAST
            // does not treat them as silent no-progress loops.
            await clearDialogs(8);
            return true;
        }

        case 'useOnItem': {
            const a = Inventory.first(step.use);
            const b = Inventory.first(step.target);
            if (!a || !b) {
                log(`useOnItem missing ${step.use}/${step.target}`);
                return false;
            }
            log(`use ${step.use} on ${step.target}`);
            await a.useOn(b);
            await Execution.delayTicks(2);
            return true;
        }

        case 'equip': {
            log(`equip ${step.item}`);
            // Inventory.equip if present
            const { Equipment } = await import('../api.ts');
            return Equipment.equip(step.item);
        }

        case 'custom':
            log(`custom: ${step.name}`);
            return step.run(ctx);

        default: {
            const _x: never = step;
            log(`unknown step ${JSON.stringify(_x)}`);
            return false;
        }
    }
}
