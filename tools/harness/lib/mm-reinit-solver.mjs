/**
 * Monkey Madness reinit 5×5 slide solver — RuneLite patterns.
 * IDAStarMM: lock row0 → left col → row1 → IDA* rest.
 * @see docs/research/mm-hangar-reinit-377.md §6A
 * @see runelite .../puzzlesolver/solver/pathfinding/IDAStarMM.java
 */

export const DIMENSION = 5;
export const BLANK = -1;
const N = DIMENSION * DIMENSION;

/** RL: MM item ids have cert gaps → (id - minId) / 2 */
export function boardFromInvItems(items) {
  const raw = new Array(N).fill(0);
  const filled = new Set();
  for (const it of items) {
    if (it.slot < 0 || it.slot >= N) continue;
    raw[it.slot] = it.id | 0;
    filled.add(it.slot);
  }
  let blankSlot = -1;
  for (let s = 0; s < N; s++) {
    if (!filled.has(s)) {
      blankSlot = s;
      raw[s] = BLANK;
      break;
    }
  }
  if (blankSlot < 0) {
    for (let s = 0; s < N; s++) {
      if ((raw[s] | 0) <= 0) {
        blankSlot = s;
        raw[s] = BLANK;
        break;
      }
    }
  }
  if (blankSlot < 0) throw new Error('mm-reinit-solver: no blank slot');

  let lowest = Infinity;
  for (const id of raw) {
    if (id === BLANK) continue;
    if (id < lowest) lowest = id;
  }
  if (!Number.isFinite(lowest)) throw new Error('mm-reinit-solver: no pieces');

  const board = new Array(N);
  for (let i = 0; i < N; i++) {
    if (raw[i] === BLANK) board[i] = BLANK;
    else board[i] = Math.floor((raw[i] - lowest) / 2);
  }
  return board;
}

function manhattan(pieces) {
  let v = 0;
  for (let i = 0; i < N; i++) {
    const p = pieces[i];
    if (p === BLANK) continue;
    v += Math.abs((i % DIMENSION) - (p % DIMENSION)) + Math.abs(((i / DIMENSION) | 0) - ((p / DIMENSION) | 0));
  }
  return v;
}

function findEmpty(pieces) {
  for (let i = 0; i < N; i++) if (pieces[i] === BLANK) return i;
  throw new Error('no blank');
}

function findVal(pieces, val) {
  for (let i = 0; i < N; i++) if (pieces[i] === val) return i;
  throw new Error('piece ' + val);
}

function clone(p) {
  return p.slice();
}

function getPiece(pieces, x, y) {
  return pieces[y * DIMENSION + x];
}

function swapCoords(pieces, x1, y1, x2, y2) {
  const next = clone(pieces);
  const i1 = y1 * DIMENSION + x1;
  const i2 = y2 * DIMENSION + x2;
  const t = next[i1];
  next[i1] = next[i2];
  next[i2] = t;
  return next;
}

function swapEmptyWith(pieces, empty, target) {
  const next = clone(pieces);
  next[empty] = next[target];
  next[target] = BLANK;
  return next;
}

/** Pure IDA* (4×4 tail or small distance). */
function idaStar(startPieces, maxMs = 8000) {
  if (manhattan(startPieces) === 0) return [startPieces.slice()];
  const t0 = Date.now();
  const start = { pieces: startPieces, empty: findEmpty(startPieces), parent: null };
  let bound = manhattan(startPieces);

  function search(node, g, bound) {
    if (Date.now() - t0 > maxMs) return { type: 'timeout' };
    const h = manhattan(node.pieces);
    const f = g + h;
    if (f > bound) return { type: 'bound', val: f };
    if (h === 0) return { type: 'goal', node };
    let min = Infinity;
    const e = node.empty;
    const ex = e % DIMENSION;
    const ey = (e / DIMENSION) | 0;
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ]) {
      const nx = ex + dx;
      const ny = ey + dy;
      if (nx < 0 || nx >= DIMENSION || ny < 0 || ny >= DIMENSION) continue;
      const t = ny * DIMENSION + nx;
      if (node.parent && node.parent.empty === t) continue;
      const pieces = swapEmptyWith(node.pieces, e, t);
      const r = search({ pieces, empty: t, parent: node }, g + 1, bound);
      if (r.type === 'goal' || r.type === 'timeout') return r;
      if (r.type === 'bound' && r.val < min) min = r.val;
    }
    return { type: 'bound', val: min };
  }

  for (let iter = 0; iter < 100; iter++) {
    const r = search(start, 0, bound);
    if (r.type === 'goal') {
      const path = [];
      let n = r.node;
      while (n) {
        path.push(n.pieces);
        n = n.parent;
      }
      path.reverse();
      return path;
    }
    if (r.type === 'timeout' || r.val === Infinity) return null;
    bound = r.val;
  }
  return null;
}

// --- RL IDAStarMM reduction (row/col lock then IDA*) ---

const PATTERNS = {
  ROTATE_LEFT_UP: { pts: [1, -1, 0, -1, -1, -1, -1, 0], mx: 1, my: 1 },
  ROTATE_LEFT_DOWN: { pts: null, mx: 1, my: -1, ref: 'ROTATE_LEFT_UP' },
  ROTATE_RIGHT_UP: { pts: null, mx: -1, my: 1, ref: 'ROTATE_LEFT_UP' },
  ROTATE_RIGHT_DOWN: { pts: null, mx: -1, my: -1, ref: 'ROTATE_LEFT_UP' },
  ROTATE_UP_LEFT: { pts: [-1, 1, -1, 0, -1, -1, 0, -1], mx: 1, my: 1 },
  ROTATE_UP_RIGHT: { pts: null, mx: -1, my: 1, ref: 'ROTATE_UP_LEFT' },
  ROTATE_DOWN_LEFT: { pts: null, mx: 1, my: -1, ref: 'ROTATE_UP_LEFT' },
  ROTATE_DOWN_RIGHT: { pts: null, mx: -1, my: -1, ref: 'ROTATE_UP_LEFT' },
  LAST_PIECE_ROW: { pts: [-1, -1, 0, -1, -1, 0, -1, 1], mx: 1, my: 1, last: true },
  LAST_PIECE_COLUMN: { pts: [-1, -1, -1, 0, 0, -1, 1, -1], mx: 1, my: 1, last: true },
  SHUFFLE_UP_RIGHT: { pts: [1, -1, 0, -1], mx: 1, my: 1 },
  SHUFFLE_UP_LEFT: { pts: [-1, -1, 0, -1], mx: 1, my: 1 },
  SHUFFLE_UP_BELOW: { pts: [-1, 1, -1, 0], mx: 1, my: 1 },
  SHUFFLE_UP_ABOVE: { pts: [-1, -1, -1, 0], mx: 1, my: 1 }
};

function resolvePattern(name) {
  let p = PATTERNS[name];
  if (p.ref) {
    const base = PATTERNS[p.ref];
    return { pts: base.pts, mx: p.mx, my: p.my, last: p.last };
  }
  return p;
}

/**
 * RL-style MM pathfinder. Returns board path start→goal.
 */
export function solveMmBoard(startBoard) {
  let current = clone(startBoard);
  const stateList = [clone(current)];

  const swap = (p1, p2) => {
    current = swapCoords(current, p1.x, p1.y, p2.x, p2.y);
    stateList.push(clone(current));
  };

  const findPiece = val => {
    const i = findVal(current, val);
    return { x: i % DIMENSION, y: (i / DIMENSION) | 0 };
  };

  const performSwapPattern = (locBlank, locVal, patternName) => {
    const pattern = resolvePattern(patternName);
    let offsets = pattern.pts;
    if (!offsets) throw new Error('bad pattern ' + patternName);
    const modX = pattern.mx;
    const modY = pattern.my;
    const points = [];
    for (let i = 0; i < offsets.length; i += 2) {
      points.push({
        x: locVal.x + modX * offsets[i],
        y: locVal.y + modY * offsets[i + 1]
      });
    }
    points.push(locVal);

    if (!pattern.last) {
      let start = locBlank;
      for (const p of points) {
        swap(start, p);
        start = p;
      }
    } else {
      const [loc1, loc2, loc3, loc4] = points;
      // RL LAST_PIECE sequence
      swap(locBlank, locVal);
      swap(locVal, loc3);
      swap(loc3, loc1);
      swap(loc1, loc2);
      swap(loc2, locVal);
      swap(locVal, loc3);
      swap(loc3, loc1);
      swap(loc1, loc2);
      swap(loc2, locVal);
      swap(locVal, locBlank);
      swap(locBlank, loc4);
      swap(loc4, loc3);
      swap(loc3, loc1);
      swap(loc1, loc2);
      swap(loc2, locVal);
    }
  };

  const validRowNumbers = [
    [0, 1, 2, 3, 4],
    [6, 7, 8, 9]
  ];
  const validColumnNumbers = [[5, 10, 15, 20]];

  const alignTargetX = (valTarget, x, y) => {
    let locVal = findPiece(valTarget);
    if (locVal.x === x) return;
    const direction = Math.sign(x - locVal.x);
    while (locVal.x !== x) {
      locVal = findPiece(valTarget);
      const locBlank = findPiece(BLANK);
      if (x - locVal.x === 0) break;
      if (locVal.x === locBlank.x) {
        const diff = locBlank.y - locVal.y;
        if (diff === 1) {
          const loc1 = { x: locBlank.x + direction, y: locBlank.y };
          const loc2 = { x: loc1.x, y: loc1.y - 1 };
          swap(locBlank, loc1);
          swap(loc1, loc2);
          swap(loc2, locVal);
        } else if (diff === -1) {
          swap(locBlank, locVal);
        }
      } else if (locVal.y === locBlank.y) {
        const diff = locBlank.x - locVal.x;
        if (diff === 1) {
          if (direction === 1) swap(locVal, locBlank);
          else if (direction === -1) {
            if (locVal.y === DIMENSION - 1) performSwapPattern(locBlank, locVal, 'ROTATE_LEFT_UP');
            else performSwapPattern(locBlank, locVal, 'ROTATE_LEFT_DOWN');
          }
        } else if (diff === -1) {
          if (direction === -1) swap(locVal, locBlank);
          else if (direction === 1) {
            if (locVal.y === DIMENSION - 1) performSwapPattern(locBlank, locVal, 'ROTATE_RIGHT_UP');
            else performSwapPattern(locBlank, locVal, 'ROTATE_RIGHT_DOWN');
          }
        }
      }
    }
  };

  const swapUpRow = (valTarget, x, y) => {
    let locVal = findPiece(valTarget);
    let locBlank = findPiece(BLANK);
    if (locVal.x === x && locVal.y === y) return;
    if (locBlank.x === x && locBlank.y === y && locVal.y - 1 === y) {
      swap(locBlank, locVal);
      return;
    }
    for (;;) {
      locVal = findPiece(valTarget);
      locBlank = findPiece(BLANK);
      if (locVal.x === x && locVal.y === y) return;
      if (locVal.x === locBlank.x) {
        const diff = locBlank.y - locVal.y;
        if (diff === 1) {
          if (x === DIMENSION - 1) {
            performSwapPattern(locBlank, locVal, 'LAST_PIECE_ROW');
            return;
          }
          performSwapPattern(locBlank, locVal, 'ROTATE_UP_RIGHT');
        } else if (diff === -1) {
          swap(locBlank, locVal);
        }
      } else if (locVal.y === locBlank.y) {
        const diff = locBlank.x - locVal.x;
        if (diff === 1) performSwapPattern(locBlank, locVal, 'SHUFFLE_UP_RIGHT');
        else if (diff === -1) {
          if (locVal.y - 1 === y) {
            const loc1 = { x: locBlank.x, y: locBlank.y + 1 };
            const loc2 = { x: loc1.x + 1, y: loc1.y };
            swap(locBlank, loc1);
            swap(loc1, loc2);
            continue;
          }
          performSwapPattern(locBlank, locVal, 'SHUFFLE_UP_LEFT');
        }
      }
    }
  };

  const alignTargetY = (valTarget, x, y) => {
    let locVal = findPiece(valTarget);
    if (locVal.y === y) return;
    const direction = Math.sign(y - locVal.y);
    while (locVal.y !== y) {
      locVal = findPiece(valTarget);
      const locBlank = findPiece(BLANK);
      if (y - locVal.y === 0) break;
      if (locVal.y === locBlank.y) {
        const diff = locBlank.x - locVal.x;
        if (diff === 1) {
          const loc1 = { x: locBlank.x, y: locBlank.y + direction };
          const loc2 = { x: loc1.x - 1, y: loc1.y };
          swap(locBlank, loc1);
          swap(loc1, loc2);
          swap(loc2, locVal);
        } else if (diff === -1) {
          swap(locBlank, locVal);
        }
      } else if (locVal.x === locBlank.x) {
        const diff = locBlank.y - locVal.y;
        if (diff === 1) {
          if (direction === 1) swap(locVal, locBlank);
          else if (direction === -1) {
            if (locVal.x === DIMENSION - 1) performSwapPattern(locBlank, locVal, 'ROTATE_UP_LEFT');
            else performSwapPattern(locBlank, locVal, 'ROTATE_UP_RIGHT');
          }
        } else if (diff === -1) {
          if (direction === -1) swap(locVal, locBlank);
          else if (direction === 1) {
            if (locVal.x === DIMENSION - 1) performSwapPattern(locBlank, locVal, 'ROTATE_DOWN_LEFT');
            else performSwapPattern(locBlank, locVal, 'ROTATE_DOWN_RIGHT');
          }
        }
      }
    }
  };

  const swapLeftColumn = (valTarget, x, y) => {
    let locVal = findPiece(valTarget);
    let locBlank = findPiece(BLANK);
    if (locVal.x === x && locVal.y === y) return;
    if (locBlank.x === x && locBlank.y === y && locVal.x - 1 === x) {
      swap(locBlank, locVal);
      return;
    }
    for (;;) {
      locVal = findPiece(valTarget);
      locBlank = findPiece(BLANK);
      if (locVal.x === x && locVal.y === y) return;
      if (locVal.x === locBlank.x) {
        const diff = locBlank.y - locVal.y;
        if (diff === 1) performSwapPattern(locBlank, locVal, 'SHUFFLE_UP_BELOW');
        else if (diff === -1) {
          if (locVal.x - 1 === x) {
            const loc1 = { x: locBlank.x + 1, y: locBlank.y };
            const loc2 = { x: loc1.x, y: loc1.y + 1 };
            swap(locBlank, loc1);
            swap(loc1, loc2);
            continue;
          }
          performSwapPattern(locBlank, locVal, 'SHUFFLE_UP_ABOVE');
        }
      } else if (locVal.y === locBlank.y) {
        const diff = locBlank.x - locVal.x;
        if (diff === 1) {
          if (y === DIMENSION - 1) {
            performSwapPattern(locBlank, locVal, 'LAST_PIECE_COLUMN');
            return;
          }
          performSwapPattern(locBlank, locVal, 'ROTATE_LEFT_DOWN');
        } else if (diff === -1) {
          swap(locBlank, locVal);
        }
      }
    }
  };

  const moveTowardsVal = (valTarget, x, y, rowMode) => {
    let reached = false;
    while (getPiece(current, x, y) !== valTarget) {
      const locVal = findPiece(valTarget);
      const locBlank = findPiece(BLANK);
      if (reached) {
        if (rowMode) {
          alignTargetX(valTarget, x, y);
          swapUpRow(valTarget, x, y);
        } else {
          alignTargetY(valTarget, x, y);
          swapLeftColumn(valTarget, x, y);
        }
      } else {
        const distX = locVal.x - locBlank.x;
        const distY = locVal.y - locBlank.y;
        const distAbsX = Math.abs(distX);
        const distAbsY = Math.abs(distY);
        if (distX === 0) {
          if (distAbsY === 1) reached = true;
          else if (distY >= 2) swap(locBlank, { x: locBlank.x, y: locBlank.y + 1 });
          else if (distY <= -2) swap(locBlank, { x: locBlank.x, y: locBlank.y - 1 });
        } else if (distY === 0) {
          if (distAbsX === 1) reached = true;
          else if (distX >= 2) swap(locBlank, { x: locBlank.x + 1, y: locBlank.y });
          else if (distX <= -2) swap(locBlank, { x: locBlank.x - 1, y: locBlank.y });
        } else if (rowMode) {
          if (
            locBlank.y - 1 === y &&
            validRowNumbers[y] &&
            validRowNumbers[y].includes(getPiece(current, locBlank.x, locBlank.y - 1)) &&
            getPiece(current, locBlank.x, locBlank.y - 1) < valTarget &&
            distY <= -1
          ) {
            swap(locBlank, { x: locBlank.x + 1, y: locBlank.y });
            continue;
          }
          if (distY >= 1) swap(locBlank, { x: locBlank.x, y: locBlank.y + 1 });
          else if (distY <= -1) swap(locBlank, { x: locBlank.x, y: locBlank.y - 1 });
        } else {
          if (
            locBlank.x - 1 === x &&
            validColumnNumbers[x] &&
            validColumnNumbers[x].includes(getPiece(current, locBlank.x - 1, locBlank.y)) &&
            getPiece(current, locBlank.x - 1, locBlank.y) < valTarget &&
            distX <= -1
          ) {
            swap(locBlank, { x: locBlank.x, y: locBlank.y + 1 });
            continue;
          }
          if (distX >= 1) swap(locBlank, { x: locBlank.x + 1, y: locBlank.y });
          else if (distX <= -1) swap(locBlank, { x: locBlank.x - 1, y: locBlank.y });
        }
      }
    }
  };

  const solveRow = row => {
    for (let i = row; i < DIMENSION; i++) {
      const valTarget = row * DIMENSION + i;
      if (getPiece(current, i, row) !== valTarget) {
        moveTowardsVal(valTarget, i, row, true);
      }
    }
  };

  const solveColumn = () => {
    const column = 0;
    for (let i = column + 1; i < DIMENSION; i++) {
      const valTarget = column + i * DIMENSION;
      if (getPiece(current, column, i) !== valTarget) {
        moveTowardsVal(valTarget, column, i, false);
      }
    }
  };

  // Reduce like RL
  solveRow(0);
  solveColumn();
  solveRow(1);

  // Drop last state before IDA* path (RL removes last then prepends)
  // Keep all states; IDA* from current
  const tail = idaStar(current, 15000);
  if (!tail || !tail.length) {
    throw new Error('mm-reinit-solver: IDA* tail failed manh=' + manhattan(current));
  }
  // Merge: stateList + tail without duplicate current
  const path = stateList.slice(0, -1).concat(tail);
  return path;
}

export function pathToClicks(path) {
  const clicks = [];
  for (let i = 1; i < path.length; i++) {
    const e0 = findEmpty(path[i - 1]);
    const e1 = findEmpty(path[i]);
    clicks.push({ clickSlot: e1, emptyFrom: e0, emptyTo: e1 });
  }
  return clicks;
}

export function solveFromInvItems(items) {
  const board = boardFromInvItems(items);
  const seen = new Set();
  for (const v of board) {
    if (v === BLANK) continue;
    if (v < 0 || v > 23 || seen.has(v)) throw new Error('bad board ' + board.join(','));
    seen.add(v);
  }
  if (seen.size !== 24) throw new Error('expected 24 pieces got ' + seen.size);
  if (manhattan(board) === 0) return { board, clicks: [], path: [board] };
  const path = solveMmBoard(board);
  return { board, clicks: pathToClicks(path), path };
}
