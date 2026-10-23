import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initial, move, parse, restart, undo} from '../src/game-engine.mjs';
import {solveFirst} from './experiment-analysis.mjs';

const load = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const levels = load('../data/levels.campaign.json');
const fixtures = load('./fixtures/verified-paths.campaign.json');
const classic = load('../data/levels.v0.2.json');
const experimental = load('../data/levels.experimental.json');

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

test('campaign has fifty levels across five chapters of ten', () => {
  assert.equal(levels.length, 50);
  assert.equal(fixtures.length, 50);
  for (let chapter = 1; chapter <= 5; chapter++) {
    const chapterLevels = levels.filter((level) => level.chapter === chapter);
    assert.equal(chapterLevels.length, 10);
    assert.deepEqual(chapterLevels.map((level) => level.id),
      Array.from({length: 10}, (_, i) => `C${chapter}-${String(i + 1).padStart(2, '0')}`));
  }
  assert.deepEqual(levels.map((level) => level.id), [...new Set(levels.map((level) => level.id))]);
});

test('every campaign level is structurally valid', () => {
  for (const level of levels) {
    assert.equal(level.chapterName, chapterNames.get(level.chapter));
    const width = level.rows[0].length;
    assert.ok(level.rows.length >= 4 && level.rows.length <= 7, level.id + ' height');
    assert.ok(width >= 4 && width <= 7, level.id + ' width');
    assert.ok(level.rows.every((row) => row.length === width && /^[S.E★#]+$/u.test(row)), level.id + ' charset');
    const flat = level.rows.join('');
    assert.equal((flat.match(/S/g) || []).length, 1);
    assert.equal((flat.match(/E/g) || []).length, 1);
    const board = parse(level);
    assert.ok(board.gems.length >= 1 && board.gems.length <= 5, level.id + ' gems');
    assert.ok(Number.isInteger(level.optimal) && level.optimal > 0, level.id + ' optimal');
    assert.ok(Array.isArray(level.strategy) && level.strategy.length > 0, level.id + ' strategy');
    if (level.source === 'generated:v1') {
      assert.equal(level.verifiedReplay, true);
      assert.ok(level.evidence && typeof level.evidence === 'object');
      assert.match(level.evidence.winningOrders, /^\d+\/\d+$/);
      assert.ok(Number.isFinite(level.evidence.orderRatio));
    } else if (level.source !== 'new') {
      assert.deepEqual(level.rows, sourceRows.get(level.source), level.id + ' reuse changed the source map');
    }
  }
  for (const [index, fixture] of fixtures.entries()) {
    assert.equal(fixture.level, index + 1);
    assert.equal(fixture.id, levels[index].id);
    assert.equal(fixture.expectedSteps, levels[index].optimal);
  }
});

test('all fifty reference routes win on the actual engine and support undo/restart', () => {
  for (const [index, fixture] of fixtures.entries()) {
    const level = levels[index];
    let state = initial(level);
    const history = [];
    for (const direction of fixture.directions) {
      const next = move(state, direction);
      assert.notEqual(next, state, level.id + ': reference route contains an illegal move');
      history.push(state);
      state = next;
    }
    assert.equal(state.won, true, level.id + ': reference route did not win');
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

test('all fifty optimal steps are confirmed by complete BFS', () => {
  for (const level of levels) {
    const result = solveFirst(level, {maxStates: 2_000_000});
    assert.equal(result.status, 'solved', level.id + ' solver aborted or unsolved');
    assert.equal(result.aborted, undefined, level.id + ' solver aborted');
    assert.equal(result.won, true);
    assert.equal(result.state.steps, level.optimal, level.id + ' optimal is not the BFS shortest');
  }
});

test('generated campaign levels satisfy their chapter slot evidence', () => {
  const generatedLevels = levels.filter((level) => level.source === 'generated:v1');
  assert.equal(generatedLevels.length, 40);
  for (const level of generatedLevels) {
    const evidence = level.evidence;
    const [wins, total] = evidence.winningOrders.split('/').map(Number);
    assert.ok(wins >= 1, level.id + ' has no winning order');
    assert.ok(Math.abs(wins / total - evidence.orderRatio) < 0.0005, level.id + ' order ratio mismatch');
    assert.ok(evidence.revisits >= 0);
    const chapter = level.chapter;
    if (chapter >= 3 && level.strategy.includes('顺序陷阱')) {
      assert.ok(evidence.orderRatio <= 0.5, level.id + ' order trap ratio too high');
    }
    if (chapter >= 4 && level.strategy.includes('步数优化')) {
      const spread = evidence.shortestOrderSteps.length >= 2 &&
        evidence.shortestOrderSteps[evidence.shortestOrderSteps.length - 1] - evidence.shortestOrderSteps[0] >= 2;
      const greedyGap = evidence.greedy.startsWith('成功') && Number(evidence.greedy.match(/\d+/)[0]) - level.optimal >= 2;
      assert.ok(spread || greedyGap, level.id + ' step optimization evidence missing');
    }
    if (chapter <= 2) {
      assert.ok(level.optimal <= 19, level.id + ' early chapter level too long');
    }
  }
});

test('campaign maps contain no exact duplicates beyond declared reuses', () => {
  const existing = [
    ...classic.map((level, index) => ({id: 'V02-' + String(index + 1).padStart(2, '0'), rows: level.rows})),
    ...experimental.map((level) => ({id: 'EXP-' + level.code, rows: level.rows})),
  ];
  const pool = [...existing];
  for (const level of levels) {
    for (const entry of pool) {
      if (level.source === entry.id) continue;
      assert.notEqual(canonical(level.rows), canonical(entry.rows), level.id + ' duplicates ' + entry.id);
      const distance = hamming(level.rows, entry.rows);
      if (distance !== null) assert.ok(distance >= 6, level.id + ' is too close to ' + entry.id);
    }
    pool.push({id: level.id, rows: level.rows});
  }
});
