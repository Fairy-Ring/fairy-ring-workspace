/**
 * Thin rs2b0t RandomEvents port for 377 harness (Node + Playwright).
 *
 * Source of truth (read-only): `$RS2B0T_REF/src/bot/api/RandomEvents.ts`
 * + `eventEvade.ts`. Decision 004: toys only — never into vendor/client-ts.
 *
 * Wave 1: dialog · pick (Strange plant) · hostile evade/attack · lamp/box noop log.
 * Deferred: mime/maze solvers, full Guardian/Supervisor, lost-tool multi-step.
 *
 * @see docs/plans/2026-08-08-rs2b0t-377-random-events.md
 */

/** @typedef {import('playwright').Page} Page */

const DIALOG_EVENT_NPCS = [
  'genie',
  'drunken dwarf',
  'mysterious old man',
  'sandwich lady',
  'frog',
  'rick turpentine',
  "cap'n hand",
  'pillory guard'
];

const PICK_EVENT_NPCS = ['strange plant'];

/** 377 pack ids — match rs2b0t RandomEvents HOSTILE set (npc.pack verified). */
export const HOSTILE_EVENT_NPC_IDS = new Set([
  ...range(391, 396), // river troll
  411, // swarm
  ...range(413, 418), // rock golem
  ...range(419, 424), // zombie
  ...range(425, 430), // shade (macro shades — not Loar)
  ...range(431, 436), // watchman
  ...range(438, 443), // tree spirit / dryad
  408 // macro_triffidseed_angry
]);

const HOSTILE_ENGAGE_DISTANCE = 8;
const PICK_WAIT_MS = 80_000;
const GIVE_UP_COOLDOWN_MS = 45_000;
const MAX_ATTEMPTS = 4;

function range(lo, hi) {
  const out = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}

/**
 * Flee tiles, farthest from threat first (rs2b0t eventEvade).
 * @param {{x:number,z:number,level?:number}} from
 * @param {{x:number,z:number}} threat
 * @param {number} dist
 */
export function fleeCandidates(from, threat, dist = 12) {
  const COMPASS = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1]
  ];
  const MIN_FLEE_DIST = 4;
  const RING_STEP = 2;
  const seen = new Set();
  const out = [];
  for (let d = dist; d >= MIN_FLEE_DIST; d -= RING_STEP) {
    for (const [dx, dz] of COMPASS) {
      const p = { x: from.x + dx * d, z: from.z + dz * d, level: from.level ?? 0 };
      const key = `${p.x},${p.z}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
  }
  return out.sort((a, b) => {
    const da = Math.max(Math.abs(a.x - threat.x), Math.abs(a.z - threat.z));
    const db = Math.max(Math.abs(b.x - threat.x), Math.abs(b.z - threat.z));
    return db - da;
  });
}

/** @param {string[]} ops */
export function plantStrategy(ops) {
  const list = (ops || []).map(o => String(o ?? ''));
  const canPick = list.some(a => /pick|take/i.test(a));
  const canAttack = list.some(a => /attack/i.test(a));
  return !canPick && canAttack ? 'evade' : 'pick';
}

/**
 * @param {object} npc
 * @returns {boolean}
 */
export function isHostileEventNpc(npc) {
  const id = Number(npc?.id ?? -1);
  if (!HOSTILE_EVENT_NPC_IDS.has(id)) return false;
  const dist = Number(npc?.distance ?? 99);
  if (dist > HOSTILE_ENGAGE_DISTANCE) return false;
  // Presence in range is enough (swarm / soft combat flags — rs2b0t lesson).
  return true;
}

/**
 * Snapshot scene randoms via page evaluate (one round-trip).
 * @param {Page} page
 */
export async function detectRandomEvent(page) {
  return page.evaluate(
    ({ dialogNames, pickNames, hostileIds, engageDist }) => {
      const r = globalThis.__lc377?.reader;
      if (!r?.npcs) return null;
      let npcs;
      try {
        npcs = r.npcs() ?? [];
      } catch {
        return null;
      }
      const me = r.worldTile?.();

      for (const npc of npcs) {
        const name = String(npc?.name ?? '').toLowerCase();
        if (!name) continue;
        if (dialogNames.includes(name) && (npc.distance ?? 99) <= 6) {
          return {
            kind: 'dialog',
            name,
            index: npc.index,
            id: npc.id,
            distance: npc.distance,
            ops: npc.ops ?? [],
            tile: npc.tile
          };
        }
        if (pickNames.includes(name) && (npc.distance ?? 99) <= 8) {
          return {
            kind: 'pick',
            name,
            index: npc.index,
            id: npc.id,
            distance: npc.distance,
            ops: npc.ops ?? [],
            tile: npc.tile
          };
        }
      }

      for (const npc of npcs) {
        const id = Number(npc?.id ?? -1);
        if (!hostileIds.includes(id)) continue;
        if ((npc.distance ?? 99) > engageDist) continue;
        return {
          kind: 'evade',
          name: String(npc?.name ?? 'event monster').toLowerCase(),
          index: npc.index,
          id,
          distance: npc.distance,
          ops: npc.ops ?? [],
          tile: npc.tile
        };
      }

      // Inventory lamp / strange box (detect only; handler may soft-skip)
      const inv = r.inventory?.() ?? [];
      for (const it of inv) {
        const n = String(it?.name ?? '');
        if (/^strange box$/i.test(n)) return { kind: 'box', name: 'strange box' };
        if (/^lamp$/i.test(n)) return { kind: 'lamp', name: 'lamp' };
      }

      return me ? { kind: null, me } : null;
    },
    {
      dialogNames: DIALOG_EVENT_NPCS,
      pickNames: PICK_EVENT_NPCS,
      hostileIds: [...HOSTILE_EVENT_NPC_IDS],
      engageDist: HOSTILE_ENGAGE_DISTANCE
    }
  ).then(ev => {
    if (!ev || !ev.kind) return null;
    return ev;
  });
}

const attempts = new Map();
const cooldownUntil = new Map();
let handling = false;

function cooledDown(sig) {
  const until = cooldownUntil.get(sig);
  return until !== undefined && Date.now() < until;
}

/**
 * Continue/chat thrash (dialog randoms).
 * @param {Page} page
 */
async function thrashDialog(page, maxIters = 28) {
  for (let i = 0; i < maxIters; i++) {
    const open = await page.evaluate(() => {
      const a = globalThis.__lc377?.actions;
      const r = globalThis.__lc377?.reader;
      a?.continueDialog?.();
      a?.dismissModalMessage?.();
      a?.chatContinue?.();
      if ((r?.chatOptions?.() ?? []).length) a?.chooseOption?.();
      return !!(r?.dialogOpen?.() || (r?.chatOptions?.() ?? []).length || r?.chatContinueComId?.());
    });
    await page.waitForTimeout(280);
    if (!open && i > 2) break;
  }
}

/**
 * @param {Page} page
 * @param {{x:number,z:number}} dest
 * @param {number} radius
 */
async function walkLocal(page, dest, radius = 2) {
  await page.evaluate(
    ({ x, z }) => {
      const a = globalThis.__lc377?.actions;
      a?.walkWorld?.(x, z) || a?.walkTo?.(x, z);
    },
    { x: dest.x, z: dest.z }
  );
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const ok = await page.evaluate(
      ({ x, z, radius }) => {
        const t = globalThis.__lc377?.reader?.worldTile?.();
        if (!t) return false;
        return Math.max(Math.abs(t.x - x), Math.abs(t.z - z)) <= radius;
      },
      { x: dest.x, z: dest.z, radius }
    );
    if (ok) return true;
    await page.waitForTimeout(300);
  }
  return false;
}

/**
 * @param {Page} page
 * @param {object} event
 * @param {(msg: string) => void} log
 */
async function handleDialog(page, event, log) {
  log(`random event: ${event.name} — talking through it`);
  await page.evaluate(
    ({ name, index }) => {
      const a = globalThis.__lc377?.actions;
      if (index != null) a?.npcOp?.(index, 1);
      else a?.talkNpc?.(name) || a?.npcOp?.(name, 1);
    },
    { name: event.name, index: event.index }
  );
  await thrashDialog(page);
  log(`random event: ${event.name} cleared (dialog thrash done)`);
  return true;
}

/**
 * Strange plant: pick fruit while ops allow; else attack/flee hostile form.
 * @param {Page} page
 * @param {object} event
 * @param {(msg: string) => void} log
 * @param {{ preferAttack?: boolean }} opts
 */
async function handlePick(page, event, log, opts = {}) {
  const preferAttack = opts.preferAttack !== false; // Flamtaer thrash: kill angry plant
  const deadline = Date.now() + PICK_WAIT_MS;
  let announced = false;

  while (Date.now() < deadline) {
    const plant = await page.evaluate(name => {
      const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
      return (
        npcs.find(n => String(n?.name ?? '').toLowerCase() === name) ?? null
      );
    }, event.name);

    if (!plant) {
      log(`random event: ${event.name} gone`);
      return true;
    }

    const strategy = plantStrategy(plant.ops || []);
    if (strategy === 'evade') {
      if (preferAttack) {
        log(`random event: ${event.name} hostile — attacking (preferAttack)`);
        await page.evaluate(
          ({ name, index }) => {
            const a = globalThis.__lc377?.actions;
            a?.attackNpc?.(name) || a?.npcOp?.(index, 2);
          },
          { name: plant.name, index: plant.index }
        );
        await page.waitForTimeout(2500);
        // keep attacking until gone or timeout slice
        for (let k = 0; k < 40; k++) {
          const still = await page.evaluate(name => {
            const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
            return npcs.some(n => String(n?.name ?? '').toLowerCase() === name);
          }, event.name);
          if (!still) {
            log(`random event: ${event.name} killed`);
            return true;
          }
          await page.evaluate(
            ({ name, index }) => {
              const a = globalThis.__lc377?.actions;
              a?.attackNpc?.(name) || a?.npcOp?.(index, 2);
            },
            { name: plant.name, index: plant.index }
          );
          await page.evaluate(() => globalThis.__lc377?.actions?.eatIfNeeded?.('Lobster', 12));
          await page.waitForTimeout(600);
        }
        return true;
      }
      log(`random event: ${event.name} turned hostile — fleeing`);
      return handleEvade(page, { ...event, name: event.name, tile: plant.tile }, log);
    }

    if (!announced) {
      log(`random event: ${event.name} — picking fruit when ripe`);
      announced = true;
    }

    const opIdx = (plant.ops || []).findIndex(a => /pick|take/i.test(String(a ?? '')));
    if (opIdx >= 0) {
      const before = await page.evaluate(() => {
        const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
        return inv.filter(i => /strange fruit/i.test(String(i?.name ?? ''))).length;
      });
      await page.evaluate(
        ({ index, op }) => {
          const a = globalThis.__lc377?.actions;
          // op1 = first listed op; plant Pick is typically op1
          a?.npcOp?.(index, op + 1);
        },
        { index: plant.index, op: opIdx }
      );
      await page.waitForTimeout(1200);
      const after = await page.evaluate(() => {
        const inv = globalThis.__lc377?.reader?.inventory?.() ?? [];
        return inv.filter(i => /strange fruit/i.test(String(i?.name ?? ''))).length;
      });
      const chat = await page.evaluate(() => {
        const lines = globalThis.__lc377?.reader?.chat?.(6) ?? [];
        return lines.map(l => String(l?.text ?? l ?? ''));
      });
      if (chat.some(t => /not here for you/i.test(t))) {
        cooldownUntil.set(`pick:${event.name}`, Date.now() + GIVE_UP_COOLDOWN_MS);
        log(`random event: ${event.name} not ours — cooldown ${GIVE_UP_COOLDOWN_MS / 1000}s`);
        return true;
      }
      if (after > before) {
        log(`random event: ${event.name} — fruit picked`);
        return true;
      }
      const still = await page.evaluate(name => {
        const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
        return npcs.some(n => String(n?.name ?? '').toLowerCase() === name);
      }, event.name);
      if (!still) {
        log(`random event: ${event.name} despawned after pick`);
        return true;
      }
    }
    await page.waitForTimeout(2400); // ~4 ticks @ 600ms
  }
  log(`random event: ${event.name} — fruit never ripened this pass; will retry`);
  return true;
}

/**
 * @param {Page} page
 * @param {object} event
 * @param {(msg: string) => void} log
 * @param {{ preferAttack?: boolean }} opts
 */
async function handleEvade(page, event, log, opts = {}) {
  const preferAttack = opts.preferAttack === true;
  const me = await page.evaluate(() => globalThis.__lc377?.reader?.worldTile?.());
  if (!me) return false;

  if (preferAttack) {
    log(`random event: ${event.name} — attacking (preferAttack)`);
    await page.evaluate(
      ({ name, index }) => {
        const a = globalThis.__lc377?.actions;
        a?.attackNpc?.(name) || (index != null && a?.npcOp?.(index, 2));
      },
      { name: event.name, index: event.index }
    );
    for (let k = 0; k < 50; k++) {
      const still = await page.evaluate(
        ({ name, id }) => {
          const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
          return npcs.some(
            n =>
              String(n?.name ?? '').toLowerCase() === name ||
              (id != null && Number(n?.id) === Number(id))
          );
        },
        { name: event.name, id: event.id }
      );
      if (!still) {
        log(`random event: ${event.name} killed`);
        return true;
      }
      await page.evaluate(
        ({ name, index }) => {
          const a = globalThis.__lc377?.actions;
          a?.attackNpc?.(name) || (index != null && a?.npcOp?.(index, 2));
        },
        { name: event.name, index: event.index }
      );
      await page.evaluate(() => globalThis.__lc377?.actions?.eatIfNeeded?.('Lobster', 12));
      await page.waitForTimeout(600);
    }
    return true;
  }

  const threat = event.tile || me;
  log(`random event: ${event.name} attacking — evading`);
  const candidates = fleeCandidates(me, threat, 12);
  let fled = false;
  for (const dest of candidates.slice(0, 12)) {
    fled = await walkLocal(page, dest, 2);
    if (fled) break;
  }
  if (!fled) {
    log('random event: nowhere to evade — waiting');
    await page.waitForTimeout(6000);
    return false;
  }
  const gone = await page.evaluate(
    async ({ name, id }) => {
      const start = Date.now();
      while (Date.now() - start < 45_000) {
        const npcs = globalThis.__lc377?.reader?.npcs?.() ?? [];
        const hit = npcs.some(
          n =>
            String(n?.name ?? '').toLowerCase() === name ||
            (id != null && Number(n?.id) === Number(id))
        );
        if (!hit) return true;
        await new Promise(r => setTimeout(r, 400));
      }
      return false;
    },
    { name: event.name, id: event.id }
  );
  log(gone ? `random event: ${event.name} despawned` : `random event: ${event.name} still around after evade`);
  // walk back toward original tile
  await walkLocal(page, me, 3);
  return true;
}

/**
 * Detect + handle one random event if present.
 *
 * @param {Page} page
 * @param {{
 *   log?: (msg: string) => void,
 *   preferAttack?: boolean,
 *   skipKinds?: string[],
 * }} [opts]
 * @returns {Promise<{ handled: boolean, event: object|null }>}
 */
export async function handleRandomEventOnce(page, opts = {}) {
  const log = opts.log ?? (m => console.log(`[random] ${m}`));
  const preferAttack = opts.preferAttack ?? false;
  const skipKinds = new Set(opts.skipKinds ?? []);

  if (handling) return { handled: false, event: null };
  handling = true;
  try {
    const event = await detectRandomEvent(page);
    if (!event) return { handled: false, event: null };
    if (skipKinds.has(event.kind)) {
      return { handled: false, event };
    }

    const sig = `${event.kind}:${event.name}`;
    if (cooledDown(sig)) return { handled: false, event };

    const n = (attempts.get(sig) ?? 0) + 1;
    attempts.set(sig, n);
    if (n > MAX_ATTEMPTS) {
      attempts.delete(sig);
      cooldownUntil.set(sig, Date.now() + GIVE_UP_COOLDOWN_MS);
      log(`random event: giving up on ${sig} for ${GIVE_UP_COOLDOWN_MS / 1000}s`);
      return { handled: false, event };
    }

    let acted = false;
    if (event.kind === 'dialog') {
      acted = await handleDialog(page, event, log);
    } else if (event.kind === 'pick') {
      acted = await handlePick(page, event, log, { preferAttack });
    } else if (event.kind === 'evade') {
      acted = await handleEvade(page, event, log, { preferAttack });
    } else if (event.kind === 'box' || event.kind === 'lamp') {
      log(`random event: ${event.name} detected (wave1: no solver yet — continuing thrash)`);
      acted = false;
    }

    if (acted) attempts.delete(sig);
    return { handled: !!acted, event };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`random event: handler error (continuing): ${msg}`);
    return { handled: false, event: null };
  } finally {
    handling = false;
  }
}

/**
 * Soft poll: handle random if any. Call from thrash loops every N ticks.
 *
 * @param {Page} page
 * @param {object} [opts]
 */
export async function softRandomTick(page, opts = {}) {
  return handleRandomEventOnce(page, opts);
}

export const RandomEvents = {
  detect: detectRandomEvent,
  handleOnce: handleRandomEventOnce,
  softTick: softRandomTick,
  plantStrategy,
  isHostileEventNpc,
  fleeCandidates,
  DIALOG_EVENT_NPCS,
  PICK_EVENT_NPCS,
  HOSTILE_EVENT_NPC_IDS
};

export default RandomEvents;
