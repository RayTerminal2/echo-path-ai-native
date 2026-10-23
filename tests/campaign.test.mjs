import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initial, move, parse, restart, undo} from '../src/game-engine.mjs';
import {
  analyzeWins,
  findHistoryEffect,
  greedy,
  orderShortest,
  orderSolvable,
  permutations,
  simplePathExists,
  solveFirst,
  solveFrom,
} from './experiment-analysis.mjs';

const load = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const levels = load('../data/levels.campaign.batch1.json');
const fixtures = load('./fixtures/verified-paths.campaign.batch1.json');
const classic = load('../data/levels.v0.2.json');
const experimental = load('../data/levels.experimental.json');

const expectedIds = ['C1-01', 'C1-02', 'C2-01', 'C2-02', 'C3-01', 'C3-02', 'C4-01', 'C4-02', 'C5-01', 'C5-02'];
const chapterNames = new Map([
  [1, '基础规则与方向理解'],
  [2, '路线与回程规划'],
  [3, '收集顺序策略'],
  [4, '多方案取舍与步数优化'],
  [5, '综合挑战'],
]);
const sourceRows = new Map([
  ['V02-01', classic[0].rows],
  ['V02-02', classic[1].rows],
  ['V02-03', classic[2].rows],
  ['V02-09', classic[8].rows],
  ['EXP-B1', experimental.find((level) => level.code === 'B1').rows],
  ['EXP-E1', experimental.find((level) => level.code === 'E1').rows],
  ['EXP-E2', experimental.find((level) => level.code === 'E2').rows],
]);

function replay(def, directions) {
  let state = initial(def);
  const history = [];
  for (const direction of directions) {
    const next = move(state, direction);
    assert.notEqual(next, state, 'reference route contains an illegal move');
    history.push(state);
    state = next;
  }
  return {state, history};
}

function transform(rows, kind) {
  let grid = rows.map((row) => [...row]);
  if (kind & 4) grid = grid.map((row) => [...row].reverse());
  if (kind & 1) grid = [...grid].reverse();
  if (kind & 2) {
    const height = grid.length;
    const width = grid[0].length;
    grid = Array.from({length: width}, (_, x) => Array.from({length: height}, (_, y) => grid[y][x]));
  }
  return grid.map((row) => row.join(''));
}

function canonical(rows) {
  const variants = [];
  for (let kind = 0; kind < 8; kind++) variants.push(transform(rows, kind).join('/'));
  return variants.sort()[0];
}

function hamming(a, b) {
  if (a.length !== b.length || a[0].length !== b[0].length) return null;
  let distance = 0;
  for (let y = 0; y < a.length; y++) {
    for (let x = 0; x < a[0].length; x++) if (a[y][x] !== b[y][x]) distance++;
  }
  return distance;
}

function winningOrders(def) {
  const board = parse(def);
  return permutations(board.gems).filter((order) => orderSolvable(def, order, {maxStates: 1_000_000}).ok);
}

function nearestGems(def) {
  const board = parse(def);
  const startY = Math.floor(board.start / board.W);
  const startX = board.start % board.W;
  const distances = board.gems.map((gem) => (
    Math.abs(Math.floor(gem / board.W) - startY) + Math.abs(gem % board.W - startX)
  ));
  const nearest = Math.min(...distances);
  return board.gems.filter((gem, index) => distances[index] === nearest);
}

test('campaign data contains ten valid levels across five chapters', () => {
  assert.equal(levels.length, 10);
  assert.deepEqual(levels.map((level) => level.id), expectedIds);
  assert.equal(fixtures.length, levels.length);
  for (let chapter = 1; chapter <= 5; chapter++) {
    assert.equal(levels.filter((level) => level.chapter === chapter).length, 2);
  }
  for (const [index, level] of levels.entries()) {
    assert.equal(level.chapterName, chapterNames.get(level.chapter));
    const width = level.rows[0].length;
    assert.ok(level.rows.length >= 4 && level.rows.length <= 7);
    assert.ok(width >= 4 && width <= 7);
    assert.ok(level.rows.every((row) => row.length === width && /^[S.E★#]+$/u.test(row)));
    const flat = level.rows.join('');
    assert.equal((flat.match(/S/g) || []).length, 1);
    assert.equal((flat.match(/E/g) || []).length, 1);
    const board = parse(level);
    assert.ok(board.gems.length >= 1 && board.gems.length <= 5);
    assert.equal(fixtures[index].level, index + 1);
    assert.equal(fixtures[index].id, level.id);
    assert.equal(fixtures[index].expectedSteps, level.optimal);
    if (level.source !== 'new') {
      assert.deepEqual(level.rows, sourceRows.get(level.source), level.id + ' reuse changed the source map');
    } else {
      assert.equal(level.verifiedReplay, true);
    }
  }
});

test('all ten reference routes win on the actual engine and support undo/restart', () => {
  for (const [index, fixture] of fixtures.entries()) {
    const level = levels[index];
    const {state, history} = replay(level, fixture.directions);
    assert.equal(state.won, true, level.id + ' reference route did not win');
    assert.equal(state.pos, state.board.end);
    assert.equal(state.got.length, state.board.gems.length);
    assert.equal(state.steps, fixture.expectedSteps);

    const previous = undo(state, history);
    history.pop();
    assert.equal(previous.won, false);
    assert.equal(previous.steps, state.steps - 1);
    assert.deepEqual(restart(state), initial(level));
  }
});

test('all ten shortest steps are confirmed by complete BFS', () => {
  for (const level of levels) {
    const result = solveFirst(level, {maxStates: 2_000_000});
    assert.equal(result.status, 'solved', level.id + ' solver did not finish');
    assert.equal(result.aborted, undefined, level.id + ' solver aborted');
    assert.equal(result.won, true);
    assert.equal(result.state.steps, level.optimal, level.id + ' optimal metadata is not the BFS shortest');
    assert.equal(result.path.length - 1, level.optimal);
  }
});

test('C2-02 is a short return puzzle that defeats the stamped greedy route', () => {
  const level = levels.find((entry) => entry.id === 'C2-02');
  const simple = simplePathExists(level, {maxStates: 1_000_000});
  assert.equal(simple.exists, false);
  assert.equal(simple.status, 'unsolvable');

  const orders = winningOrders(level);
  assert.equal(orders.length, 1);
  assert.equal(greedy(level).won, false);
  assert.equal(greedy(level, {ignoreStamps: true}).won, true);

  const effect = findHistoryEffect(level, {maxDepth: 12, maxStates: 500_000});
  assert.ok(effect);
  assert.deepEqual(effect.cell, [2, 2]);
  assert.equal(effect.got.length, 1);
});

test('C3-01 keeps the nearest-gem trap and a single winning order', () => {
  const level = levels.find((entry) => entry.id === 'C3-01');
  const orders = winningOrders(level);
  assert.equal(orders.length, 1);
  const nearest = nearestGems(level);
  assert.equal(nearest.some((gem) => orders[0][0] === gem), false);
  assert.equal(greedy(level).won, false);
});

test('C3-02 keeps the direct nearest-gem trap', () => {
  const level = levels.find((entry) => entry.id === 'C3-02');
  const orders = winningOrders(level);
  assert.equal(orders.length, 1);
  const nearest = nearestGems(level);
  assert.equal(nearest.some((gem) => orders[0][0] === gem), false);
  assert.equal(greedy(level).won, false);
  assert.equal(solveFirst(level, {maxStates: 1_000_000}).state.steps, 12);
});

test('C4-02 has two winning routes with a two-step difference', () => {
  const level = levels.find((entry) => entry.id === 'C4-02');
  const orders = winningOrders(level);
  assert.equal(orders.length, 2);
  const steps = orders.map((order) => orderShortest(level, order, {maxStates: 1_000_000}).steps).sort((a, b) => a - b);
  assert.deepEqual(steps, [14, 16]);
  assert.equal(simplePathExists(level, {maxStates: 1_000_000}).exists, false);
  assert.equal(greedy(level).won, true);
  assert.equal(greedy(level).steps, 16);
  assert.ok(greedy(level).steps - level.optimal >= 2);
  assert.ok(findHistoryEffect(level, {maxDepth: 12, maxStates: 500_000}));
});

test('C5-02 combines order and history constraints without a natural bypass', () => {
  const level = levels.find((entry) => entry.id === 'C5-02');
  const orders = winningOrders(level);
  assert.equal(orders.length, 4);
  const winningFirsts = new Set(orders.map((order) => order[0]));
  const nearest = nearestGems(level);
  assert.equal(nearest.some((gem) => !winningFirsts.has(gem)), true);
  assert.equal(greedy(level).won, false);
  assert.equal(greedy(level, {ignoreStamps: true}).won, true);

  const evidence = level.evidence.historyEvidence;
  const stateAfter = (directions) => {
    let state = initial(level);
    for (const direction of directions) state = move(state, direction);
    return state;
  };
  const winnable = stateAfter(evidence.winnableDirections);
  const blocked = stateAfter(evidence.blockedDirections);
  assert.equal(winnable.pos, blocked.pos);
  assert.deepEqual(winnable.got, evidence.got);
  assert.deepEqual(blocked.got, evidence.got);
  assert.deepEqual([Math.floor(winnable.pos / parse(level).W), winnable.pos % parse(level).W], evidence.cell);
  assert.equal(solveFrom(winnable, {maxStates: 500_000}).won, true);
  assert.equal(solveFrom(blocked, {maxStates: 500_000}).won, false);
});

test('new campaign maps are not exact or obvious duplicates', () => {
  const existing = [
    ...classic.map((level, index) => ({id: 'V02-' + String(index + 1).padStart(2, '0'), rows: level.rows})),
    ...experimental.map((level) => ({id: 'EXP-' + level.code, rows: level.rows})),
  ];
  const newLevels = levels.filter((level) => level.source === 'new');
  for (const level of newLevels) {
    for (const entry of existing) {
      assert.notEqual(canonical(level.rows), canonical(entry.rows), level.id + ' duplicates ' + entry.id);
      const distance = hamming(level.rows, entry.rows);
      if (distance !== null) assert.ok(distance >= 6, level.id + ' is too close to ' + entry.id);
    }
  }
  for (let i = 0; i < newLevels.length; i++) {
    for (let j = i + 1; j < newLevels.length; j++) {
      assert.notEqual(canonical(newLevels[i].rows), canonical(newLevels[j].rows));
      const distance = hamming(newLevels[i].rows, newLevels[j].rows);
      if (distance !== null) assert.ok(distance >= 6, newLevels[i].id + ' is too close to ' + newLevels[j].id);
    }
  }
});

test('solver status distinguishes solved, unsolvable and aborted', () => {
  const level7 = classic[6];
  const level9 = classic[8];
  assert.equal(simplePathExists(level7, {maxStates: 1_000_000}).exists, true);
  assert.equal(simplePathExists(level7, {maxStates: 1_000_000}).status, 'solved');
  assert.equal(simplePathExists(level9, {maxStates: 1_000_000}).exists, true);
  assert.equal(simplePathExists(level9, {maxStates: 1_000_000}).status, 'solved');
  assert.equal(simplePathExists(classic[2], {maxStates: 1_000_000}).exists, false);
  assert.equal(simplePathExists(classic[2], {maxStates: 1_000_000}).status, 'unsolvable');

  const aborted = solveFirst(level9, {maxStates: 1});
  assert.equal(aborted.status, 'aborted');
  assert.equal(aborted.aborted, true);
  assert.equal(aborted.won, false);

  const order = winningOrders(level9)[0];
  const orderAborted = orderSolvable(level9, order, {maxStates: 1});
  assert.equal(orderAborted.status, 'aborted');
  assert.equal(orderAborted.aborted, true);

  assert.equal(analyzeWins(classic[0], {maxStates: 1}).status, 'aborted');
  assert.equal(analyzeWins(classic[0], {maxStates: 1_000_000}).status, 'solved');
  assert.equal(solveFrom(initial(classic[0]), {maxStates: 1_000_000}).status, 'solved');
});