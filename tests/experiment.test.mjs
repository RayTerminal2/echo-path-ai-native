// DEV-002: experimental levels and the design claims they are meant to test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initial, move, parse, restart, undo} from '../src/game-engine.mjs';
import {analyzeWins, findHistoryEffect, orderSolvable, pathMetrics, permutations, simplePathExists, solveFirst} from './experiment-analysis.mjs';

const load = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const levels = load('../data/levels.experimental.json');
const fixtures = load('./fixtures/verified-paths.experimental.json');

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

test('experimental data contains six compact, valid levels', () => {
  assert.equal(levels.length, 6);
  assert.deepEqual(levels.map((level) => level.code), ['A', 'B', 'C', 'B1', 'B2', 'B1+']);
  assert.equal(fixtures.length, levels.length);
  for (const [index, level] of levels.entries()) {
    assert.ok(level.rows.length >= 5 && level.rows.length <= 7);
    const width = level.rows[0].length;
    assert.ok(width >= 5 && width <= 7);
    assert.ok(level.rows.every((row) => row.length === width && /^[S.E★#]+$/.test(row)));
    const board = parse(level);
    assert.ok(board.start >= 0 && board.end >= 0);
    assert.ok(board.gems.length >= 2 && board.gems.length <= 4);
    assert.equal(fixtures[index].level, index + 1);
    assert.equal(fixtures[index].code, level.code);
    assert.equal(fixtures[index].expectedSteps, level.optimal);
  }
});

test('all six reference routes win on the actual game engine and support undo/restart', () => {
  for (const [index, fixture] of fixtures.entries()) {
    const level = levels[index];
    const {state, history} = replay(level, fixture.directions);
    assert.equal(state.won, true, level.code + ' reference route did not win');
    assert.equal(state.pos, state.board.end);
    assert.equal(state.got.length, state.board.gems.length);
    assert.equal(state.steps, fixture.expectedSteps);

    const beforeUndo = undo(state, history);
    history.pop();
    assert.equal(beforeUndo.won, false);
    assert.equal(beforeUndo.steps, state.steps - 1);
    assert.deepEqual(restart(state), initial(level));
  }
});

test('A: every winning route must revisit a cell (old-road evidence)', () => {
  const simple = simplePathExists(levels[0], {maxStates: 500_000});
  assert.equal(simple.aborted, undefined);
  assert.equal(simple.exists, false, 'A unexpectedly has a winning route without revisits');

  const shortest = solveFirst(levels[0], {maxStates: 500_000});
  assert.equal(shortest.won, true);
  const metrics = pathMetrics(levels[0], shortest.path);
  assert.ok(metrics.revisitEntries >= 2, 'A shortest route does not meaningfully reuse old cells');
  assert.ok(metrics.revisits.length >= 2);
});

test('B: only one of the six gem-collection orders can win', () => {
  const board = parse(levels[1]);
  const orders = permutations(board.gems);
  assert.equal(orders.length, 6);
  const solutions = [];
  for (const order of orders) {
    const result = orderSolvable(levels[1], order, {maxStates: 500_000});
    assert.equal(result.aborted, undefined);
    if (result.ok) solutions.push(order);
  }
  assert.equal(solutions.length, 1, 'B does not enforce a single winning collection order');
  assert.deepEqual(solutions[0], board.gems);
});

test('C: winning routes cross multiple junctions and require revisits', () => {
  const analysis = analyzeWins(levels[2], {maxStates: 500_000});
  assert.equal(analysis.aborted, undefined);
  assert.ok(analysis.wins.length > 0);
  assert.ok(analysis.shortest.metrics.distinctJunctions >= 5);
  assert.ok(analysis.shortest.metrics.junctionVisits >= 5);
  assert.ok(analysis.minDistinctJunctions >= 5);
  assert.ok(analysis.minRevisitEntries >= 2);

  const simple = simplePathExists(levels[2], {maxStates: 500_000});
  assert.equal(simple.aborted, undefined);
  assert.equal(simple.exists, false, 'C unexpectedly has a winning route without revisits');
});

test('B1: the nearest gem first is tempting but cannot win', () => {
  const level = levels[3];
  const board = parse(level);
  const distance = new Map(board.gems.map((gem) => [gem, Math.abs(Math.floor(gem / board.W) - Math.floor(board.start / board.W)) + Math.abs(gem % board.W - board.start % board.W)]));
  const nearest = Math.min(...distance.values());
  const orders = permutations(board.gems);
  const solutions = [];
  for (const order of orders) {
    const result = orderSolvable(level, order, {maxStates: 500_000});
    assert.equal(result.aborted, undefined);
    if (result.ok) solutions.push(order);
  }
  assert.equal(solutions.length, 1);
  assert.ok(distance.get(solutions[0][0]) > nearest, 'B1 winning order starts with a nearest gem');
  for (const order of orders) {
    if (distance.get(order[0]) === nearest) {
      assert.equal(orderSolvable(level, order, {maxStates: 500_000}).ok, false);
    }
  }
});

test('B2: early arrow choices decide whether the same cell can still be used', () => {
  const level = levels[4];
  const board = parse(level);
  const orders = permutations(board.gems);
  const solutions = orders.filter((order) => orderSolvable(level, order, {maxStates: 500_000}).ok);
  assert.equal(solutions.length, 1);
  assert.deepEqual(solutions[0], [4, 1, 0]);

  const effect = findHistoryEffect(level, {maxDepth: 8});
  assert.ok(effect, 'B2 has no pre-gem arrow split');
  assert.deepEqual(effect.cell, [1, 4]);
  assert.equal(effect.got.length, 0);
  assert.ok(effect.minSteps >= 3);
  assert.ok(effect.variants.some((variant) => variant.winnable === true));
  assert.ok(effect.variants.some((variant) => variant.winnable === false));
});

test('B1+: two good first moves still require a correct second decision', () => {
  const level = levels[5];
  const board = parse(level);
  const distance = new Map(board.gems.map((gem) => [gem, Math.abs(Math.floor(gem / board.W) - Math.floor(board.start / board.W)) + Math.abs(gem % board.W - board.start % board.W)]));
  const nearest = Math.min(...distance.values());
  const orders = permutations(board.gems);
  const results = orders.map((order) => ({order, result: orderSolvable(level, order, {maxStates: 500_000})}));
  for (const entry of results) assert.equal(entry.result.aborted, undefined);
  const wins = results.filter((entry) => entry.result.ok).map((entry) => entry.order);
  assert.equal(wins.length, 6);
  const goodFirst = [...new Set(wins.map((order) => order[0]))].sort((a, b) => a - b);
  assert.deepEqual(goodFirst, [5, 18]);
  for (const gem of board.gems) {
    if (distance.get(gem) === nearest) assert.equal(goodFirst.includes(gem), false);
  }
  for (const first of goodFirst) {
    const remaining = board.gems.filter((gem) => gem !== first);
    const goodSeconds = new Set(wins.filter((order) => order[0] === first).map((order) => order[1]));
    assert.ok(goodSeconds.size >= 1);
    assert.ok(goodSeconds.size < remaining.length, 'B1+ first move ' + first + ' does not constrain the second move');
  }

  const effect = findHistoryEffect(level, {maxDepth: 8});
  assert.ok(effect, 'B1+ has no early arrow split');
  assert.deepEqual(effect.cell, [1, 4]);
  assert.equal(effect.got.length, 0);
  assert.ok(effect.variants.some((variant) => variant.winnable === true));
  assert.ok(effect.variants.some((variant) => variant.winnable === false));
});