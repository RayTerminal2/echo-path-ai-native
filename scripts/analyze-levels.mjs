import {readFileSync} from 'node:fs';
import {parse} from '../src/game-engine.mjs';
import {
  findHistoryEffect,
  greedy,
  orderSolvable,
  pathMetrics,
  permutations,
  simplePathExists,
  solveFirst,
} from '../tests/experiment-analysis.mjs';

const DEFAULT_PATH = 'data/levels.campaign.batch1.json';
const args = process.argv.slice(2);
const json = args.includes('--json');
const path = args.find((arg) => !arg.startsWith('--')) || DEFAULT_PATH;
const levels = JSON.parse(readFileSync(path, 'utf8'));

function analyze(def) {
  const board = parse(def);
  const shortest = solveFirst(def, {maxStates: 1_000_000});
  const simple = simplePathExists(def, {maxStates: 1_000_000});
  const greedyStamped = greedy(def);
  const greedyFree = greedy(def, {ignoreStamps: true});
  const orders = permutations(board.gems);
  const winningOrders = [];
  for (const order of orders) {
    const result = orderSolvable(def, order, {maxStates: 1_000_000});
    if (result.ok) winningOrders.push(order);
  }
  const winningFirsts = [...new Set(winningOrders.map((order) => order[0]))];
  const startY = Math.floor(board.start / board.W);
  const startX = board.start % board.W;
  const distances = board.gems.map((gem) => (
    Math.abs(Math.floor(gem / board.W) - startY) + Math.abs(gem % board.W - startX)
  ));
  const nearestDistance = Math.min(...distances);
  const nearest = board.gems.filter((gem, index) => distances[index] === nearestDistance);
  const history = findHistoryEffect(def, {maxDepth: 12, maxStates: 500_000});
  return {
    board,
    shortest,
    simple,
    greedyStamped,
    greedyFree,
    orders,
    winningOrders,
    winningFirsts,
    nearest,
    nearestWins: nearest.every((gem) => winningFirsts.includes(gem)),
    history,
    metrics: shortest.won ? pathMetrics(def, shortest.path) : null,
  };
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

const classic = JSON.parse(readFileSync('data/levels.v0.2.json', 'utf8')).map((level, index) => ({
  id: 'V02-' + String(index + 1).padStart(2, '0'),
  rows: level.rows,
}));
const experimental = JSON.parse(readFileSync('data/levels.experimental.json', 'utf8')).map((level) => ({
  id: 'EXP-' + level.code,
  rows: level.rows,
}));
const existing = [...classic, ...experimental];

const report = levels.map((level) => {
  const analysis = analyze(level);
  const board = analysis.board;
  const exact = existing.filter((entry) => canonical(entry.rows) === canonical(level.rows)).map((entry) => entry.id);
  const nearestLayout = existing
    .map((entry) => ({id: entry.id, distance: hamming(entry.rows, level.rows)}))
    .filter((entry) => entry.distance !== null)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);
  return {
    id: level.id,
    name: level.name,
    source: level.source,
    size: board.W + 'x' + board.H,
    gems: board.gems.length,
    optimal: level.optimal,
    shortest: analysis.shortest.won ? analysis.shortest.state.steps : null,
    status: analysis.shortest.status,
    simplePath: analysis.simple.exists,
    simpleStatus: analysis.simple.status,
    winningOrders: analysis.winningOrders.length,
    totalOrders: analysis.orders.length,
    winningFirsts: analysis.winningFirsts.map((gem) => board.gems.indexOf(gem) + 1),
    nearestFirsts: analysis.nearest.map((gem) => board.gems.indexOf(gem) + 1),
    nearestWins: analysis.nearestWins,
    greedy: analysis.greedyStamped,
    greedyWithoutStamps: analysis.greedyFree,
    history: analysis.history ? {cell: analysis.history.cell, got: analysis.history.got} : null,
    revisits: analysis.metrics ? analysis.metrics.revisitEntries : null,
    exactMatches: exact,
    nearestLayouts: nearestLayout,
  };
});

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  for (const entry of report) {
    console.log([
      entry.id,
      entry.size,
      entry.gems + 'g',
      'opt=' + entry.optimal,
      'short=' + entry.shortest,
      entry.status,
      'simple=' + entry.simplePath,
      'orders=' + entry.winningOrders + '/' + entry.totalOrders,
      'greedy=' + (entry.greedy.won ? entry.greedy.steps : 'fail@' + entry.greedy.steps),
      'history=' + (entry.history ? entry.history.cell.join(',') : '-'),
    ].join('  '));
  }
}