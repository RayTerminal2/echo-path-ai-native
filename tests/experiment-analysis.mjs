// DEV-002 test helper: uses the actual game engine, not a second rules implementation.
import {initial, move, parse} from '../src/game-engine.mjs';

export function stateKey(state) {
  const stamps = Object.keys(state.stamps)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => key + ':' + state.stamps[key])
    .join(',');
  return state.pos + '|' + [...state.got].sort((a, b) => a - b).join(',') + '|' + stamps;
}

export function solveFirst(def, {maxStates = 1_000_000} = {}) {
  const start = initial(def);
  const queue = [{state: start, path: [start.pos]}];
  const seen = new Set([stateKey(start)]);
  for (let head = 0; head < queue.length; head++) {
    const {state, path} = queue[head];
    if (state.won) return {won: true, state, path, states: seen.size};
    for (let d = 0; d < 4; d++) {
      const next = move(state, d);
      if (next === state) continue;
      const key = stateKey(next);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({state: next, path: [...path, next.pos]});
      if (seen.size > maxStates) return {won: false, aborted: true, states: seen.size};
    }
  }
  return {won: false, states: seen.size};
}

export function solveFrom(state, {maxStates = 1_000_000, ignoreStamps = false} = {}) {
  const start = ignoreStamps ? {...state, stamps: {}} : state;
  const queue = [{state: start, path: [start.pos]}];
  const seen = new Set([stateKey(start) + (ignoreStamps ? '|nostamp' : '')]);
  for (let head = 0; head < queue.length; head++) {
    const {state: current, path} = queue[head];
    if (current.won) return {won: true, state: current, path, states: seen.size};
    for (let d = 0; d < 4; d++) {
      let next = move(current, d);
      if (next === current) continue;
      if (ignoreStamps) next = {...next, stamps: {}};
      const key = stateKey(next) + (ignoreStamps ? '|nostamp' : '');
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({state: next, path: [...path, next.pos]});
      if (seen.size > maxStates) return {won: false, aborted: true, states: seen.size};
    }
  }
  return {won: false, states: seen.size};
}

export function simplePathExists(def, {maxStates = 1_000_000} = {}) {
  const start = initial(def);
  const queue = [{state: start, path: [start.pos], visited: 1 << start.pos}];
  const seen = new Set([stateKey(start) + '|' + start.pos]);
  for (let head = 0; head < queue.length; head++) {
    const {state, path, visited} = queue[head];
    if (state.won) return {exists: true, path, states: seen.size};
    for (let d = 0; d < 4; d++) {
      const next = move(state, d);
      if (next === state) continue;
      if (visited & (1 << next.pos)) continue;
      const nextVisited = visited | (1 << next.pos);
      const key = stateKey(next) + '|' + nextVisited;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({state: next, path: [...path, next.pos], visited: nextVisited});
      if (seen.size > maxStates) return {exists: false, aborted: true, states: seen.size};
    }
  }
  return {exists: false, states: seen.size};
}

export function permutations(items) {
  if (items.length <= 1) return [items];
  const result = [];
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const suffix of permutations(rest)) result.push([items[i], ...suffix]);
  }
  return result;
}

export function orderSolvable(def, order, {maxStates = 1_000_000} = {}) {
  const start = initial(def);
  const queue = [{state: start, orderIndex: 0}];
  const seen = new Set([stateKey(start) + '|0']);
  for (let head = 0; head < queue.length; head++) {
    const {state, orderIndex} = queue[head];
    if (state.won) return {ok: true, states: seen.size};
    for (let d = 0; d < 4; d++) {
      const next = move(state, d);
      if (next === state) continue;
      let nextOrder = orderIndex;
      if (next.got.length > state.got.length) {
        const gem = next.got[next.got.length - 1];
        if (gem !== order[orderIndex]) continue;
        nextOrder++;
      }
      const key = stateKey(next) + '|' + nextOrder;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({state: next, orderIndex: nextOrder});
      if (seen.size > maxStates) return {ok: false, aborted: true, states: seen.size};
    }
  }
  return {ok: false, states: seen.size};
}

export function pathMetrics(def, path) {
  const board = parse(def);
  const degrees = [...board.flat].map((cell, pos) => {
    if (cell === '#') return 0;
    const y = Math.floor(pos / board.W);
    const x = pos % board.W;
    let count = 0;
    for (const [dy, dx] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) {
      const yy = y + dy;
      const xx = x + dx;
      if (yy >= 0 && yy < board.H && xx >= 0 && xx < board.W && board.flat[yy * board.W + xx] !== '#') count++;
    }
    return count;
  });
  const counts = new Map();
  for (const pos of path) counts.set(pos, (counts.get(pos) || 0) + 1);
  const revisits = [...counts].filter(([, count]) => count > 1);
  const junctionVisits = path.filter((pos) => degrees[pos] >= 3);
  return {
    steps: path.length - 1,
    distinct: counts.size,
    revisitEntries: revisits.reduce((total, [, count]) => total + count - 1, 0),
    revisits: revisits.map(([pos, count]) => ({cell: [Math.floor(pos / board.W), pos % board.W], count})),
    junctionVisits: junctionVisits.length,
    distinctJunctions: new Set(junctionVisits).size,
    junctions: [...new Set(junctionVisits)].map((pos) => [Math.floor(pos / board.W), pos % board.W]),
  };
}

export function findHistoryEffect(def, {maxDepth = 9, maxVariants = 3, maxStates = 100_000} = {}) {
  const board = parse(def);
  const start = initial(def);
  const queue = [{state: start, path: [start.pos]}];
  const seen = new Set([stateKey(start)]);
  const groups = new Map();
  const stampSignature = (state) => Object.keys(state.stamps)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => key + ':' + state.stamps[key])
    .join(',') || '-';
  for (let head = 0; head < queue.length; head++) {
    const {state, path} = queue[head];
    if (state.steps <= maxDepth) {
      const groupKey = state.pos + '|' + [...state.got].sort((a, b) => a - b).join(',');
      if (!groups.has(groupKey)) groups.set(groupKey, new Map());
      const group = groups.get(groupKey);
      const signature = stampSignature(state);
      if (!group.has(signature)) group.set(signature, {state, path});
    }
    for (let d = 0; d < 4; d++) {
      const next = move(state, d);
      if (next === state) continue;
      const key = stateKey(next);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({state: next, path: [...path, next.pos]});
    }
  }
  const winCache = new Map();
  const canWin = (state) => {
    const key = stateKey(state);
    if (winCache.has(key)) return winCache.get(key);
    const queue = [state];
    const visited = new Set([key]);
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head];
      if (current.won) { winCache.set(key, true); return true; }
      for (let d = 0; d < 4; d++) {
        const next = move(current, d);
        if (next === current) continue;
        const nextKey = stateKey(next);
        if (visited.has(nextKey)) continue;
        visited.add(nextKey);
        queue.push(next);
        if (visited.size > maxStates) { winCache.set(key, null); return null; }
      }
    }
    winCache.set(key, false);
    return false;
  };
  for (const group of groups.values()) {
    if (group.size < 2) continue;
    const variants = [...group.values()];
    if (variants[0].state.pos === start.pos) continue;
    if (variants[0].state.got.length > 1) continue;
    const minSteps = Math.min(...variants.map((entry) => entry.state.steps));
    if (minSteps < 3) continue;
    const results = variants.slice(0, maxVariants).map((entry) => ({
      steps: entry.state.steps,
      stamps: entry.state.stamps,
      path: entry.path,
      winnable: canWin(entry.state),
    }));
    if (results.some((entry) => entry.winnable === true) && results.some((entry) => entry.winnable === false)) {
      const pos = variants[0].state.pos;
      return {
        pos,
        cell: [Math.floor(pos / board.W), pos % board.W],
        got: [...variants[0].state.got],
        minSteps,
        variants: results,
      };
    }
  }
  return null;
}

export function analyzeWins(def, {maxStates = 1_000_000} = {}) {
  const board = parse(def);
  const start = initial(def);
  const queue = [{state: start, path: [start.pos]}];
  const seen = new Set([stateKey(start)]);
  const wins = [];
  for (let head = 0; head < queue.length; head++) {
    const {state, path} = queue[head];
    if (state.won) {
      wins.push({path, metrics: pathMetrics(def, path)});
      continue;
    }
    for (let d = 0; d < 4; d++) {
      const next = move(state, d);
      if (next === state) continue;
      const key = stateKey(next);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({state: next, path: [...path, next.pos]});
      if (seen.size > maxStates) return {aborted: true, states: seen.size, wins: [], board};
    }
  }
  const shortest = wins.reduce((best, win) => best === null || win.metrics.steps < best.metrics.steps ? win : best, null);
  return {
    board,
    states: seen.size,
    wins,
    shortest,
    minDistinctJunctions: wins.length ? Math.min(...wins.map((win) => win.metrics.distinctJunctions)) : null,
    minRevisitEntries: wins.length ? Math.min(...wins.map((win) => win.metrics.revisitEntries)) : null,
  };
}