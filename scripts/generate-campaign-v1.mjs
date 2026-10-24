import {readFileSync, writeFileSync} from 'node:fs';
import {parse} from '../src/game-engine.mjs';
import {
  findHistoryEffect,
  greedy,
  orderShortest,
  permutations,
  pathMetrics,
  simplePathExists,
  solveFirst,
} from '../tests/experiment-analysis.mjs';

const STAR = '\u2605';
const classic = JSON.parse(readFileSync('data/levels.v0.2.json', 'utf8'));
const experimental = JSON.parse(readFileSync('data/levels.experimental.json', 'utf8'));
const batch = JSON.parse(readFileSync('data/levels.campaign.batch1.json', 'utf8'));
const banned = [
  ...classic.map((level, index) => ({id: 'V02-' + String(index + 1).padStart(2, '0'), rows: level.rows})),
  ...experimental.map((level) => ({id: 'EXP-' + level.code, rows: level.rows})),
  ...batch.map((level) => ({id: level.id, rows: level.rows})),
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
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

function tooClose(rows, pool, threshold) {
  const key = canonical(rows);
  for (const entry of pool) {
    if (canonical(entry.rows) === key) return entry.id;
    const distance = hamming(rows, entry.rows);
    if (distance !== null && distance < threshold) return entry.id;
  }
  return null;
}

function build(W, H, walls, start, end, gems) {
  const a = Array(W * H).fill('.');
  for (const p of walls) a[p] = '#';
  a[start] = 'S';
  a[end] = 'E';
  for (const p of gems) a[p] = STAR;
  return {rows: Array.from({length: H}, (_, y) => a.slice(y * W, (y + 1) * W).join(''))};
}

function connected(W, H, walls) {
  const free = [];
  for (let p = 0; p < W * H; p++) if (!walls.has(p)) free.push(p);
  if (free.length < W + H + 4) return null;
  const seen = new Set([free[0]]);
  const queue = [free[0]];
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head];
    const y = Math.floor(p / W);
    const x = p % W;
    for (const [dy, dx] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const yy = y + dy;
      const xx = x + dx;
      if (yy < 0 || yy >= H || xx < 0 || xx >= W) continue;
      const n = yy * W + xx;
      if (walls.has(n) || seen.has(n)) continue;
      seen.add(n);
      queue.push(n);
    }
  }
  return seen.size === free.length ? free : null;
}

function randomMap(rand, {W, H, wallChance, gems, minStartEnd}) {
  const walls = new Set();
  for (let p = 0; p < W * H; p++) if (rand() < wallChance) walls.add(p);
  const free = connected(W, H, walls);
  if (!free) return null;
  const pick = () => free[Math.floor(rand() * free.length)];
  let start, end, tries = 0;
  do {
    start = pick();
    end = pick();
    tries++;
    if (tries > 20) return null;
  } while (start === end || Math.abs(Math.floor(start / W) - Math.floor(end / W)) + Math.abs(start % W - end % W) < minStartEnd);
  const gemSet = new Set();
  let guard = 0;
  while (gemSet.size < gems && guard < 100) {
    guard++;
    const p = pick();
    if (p !== start && p !== end) gemSet.add(p);
  }
  if (gemSet.size !== gems) return null;
  return build(W, H, walls, start, end, [...gemSet]);
}

function directionsFromPath(path, W) {
  const result = [];
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1];
    const to = path[i];
    const dy = Math.floor(to / W) - Math.floor(from / W);
    const dx = (to % W) - (from % W);
    if (dy === -1) result.push(0);
    else if (dx === 1) result.push(1);
    else if (dy === 1) result.push(2);
    else result.push(3);
  }
  return result;
}

function analyze(def, {orderDepth = true, historyDepth = false} = {}) {
  const board = parse(def);
  const shortest = solveFirst(def, {maxStates: 500_000});
  if (!shortest.won || shortest.aborted) return null;
  const simple = simplePathExists(def, {maxStates: 500_000});
  const gr = greedy(def);
  const metrics = pathMetrics(def, shortest.path);
  const startY = Math.floor(board.start / board.W);
  const startX = board.start % board.W;
  const distances = board.gems.map((gem) => Math.abs(Math.floor(gem / board.W) - startY) + Math.abs(gem % board.W - startX));
  const nearestDistance = Math.min(...distances);
  const nearest = board.gems.filter((gem, index) => distances[index] === nearestDistance);
  const out = {
    board,
    shortest,
    simple,
    greedy: gr,
    metrics,
    nearest,
    nearestDistance,
    totalOrders: permutations(board.gems).length,
  };
  if (orderDepth) {
    const winners = [];
    for (const order of permutations(board.gems)) {
      const result = orderShortest(def, order, {maxStates: 500_000});
      if (result.ok) winners.push({order, steps: result.steps});
    }
    out.winningOrders = winners;
    out.winningFirsts = [...new Set(winners.map((entry) => entry.order[0]))];
    out.nearestWins = nearest.every((gem) => out.winningFirsts.includes(gem));
    out.steps = [...new Set(winners.map((entry) => entry.steps))].sort((a, b) => a - b);
  }
  if (historyDepth) out.history = findHistoryEffect(def, {maxDepth: 12, maxStates: 500_000});
  return out;
}

const chapterNames = new Map([
  [1, '基础规则与方向理解'],
  [2, '路线与回程规划'],
  [3, '收集顺序策略'],
  [4, '多方案取舍与步数优化'],
  [5, '综合挑战'],
]);

const plans = new Map([
  [1, [
    ['方向练习', ['基础规则', '路线规划'], '练习：在两条可解释路线之间保持基本规则可读。'],
    ['旧箭头回头', ['基础规则', '回程/旧路'], '练习：至少一次回访说明箭头不是装饰。'],
    ['先经过出口', ['基础规则', '路线规划'], '练习：出口可经过，但必须收齐后才结束。'],
    ['走廊承诺', ['基础规则', '历史分支'], '练习：走廊方向一旦写入会影响后续选择。'],
    ['双星绕行', ['基础规则', '路线规划'], '练习：两颗星需要选择绕行方向。'],
    ['短回环', ['基础规则', '回程/旧路'], '练习：短回环而不是长绕圈。'],
    ['回头确认', ['基础规则', '回程/旧路'], '练习：回头前需要先确认旧方向。'],
    ['章末基础复习', ['基础规则', '路线规划'], '复习：把移动、收集、旧箭头和出口条件合成一关。'],
  ]],
  [2, [
    ['必须回头', ['回程/旧路'], '目标：没有简单路线，必须规划回头。'],
    ['出口在回路上', ['回程/旧路'], '目标：提前经过出口，最后再绕回。'],
    ['单格瓶颈', ['回程/旧路', '路线规划'], '目标：一个瓶颈格决定能否返回。'],
    ['环道取舍', ['回程/旧路'], '目标：两条环路长短不同但可读。'],
    ['不可逆转角', ['历史分支', '回程/旧路'], '目标：转角箭头承诺后续方向。'],
    ['回程顺序', ['回程/旧路', '路线规划'], '目标：先绕哪一段影响能否收齐。'],
    ['路线承诺', ['历史分支', '路线规划'], '目标：早期移动决定后续可达性。'],
    ['章末回程', ['回程/旧路', '路线规划'], '复习：把回程规划压缩成短但明确的决策。'],
  ]],
  [3, [
    ['先远后近', ['顺序陷阱'], '目标：最近星不能先拿。'],
    ['唯一顺序', ['顺序陷阱'], '目标：只有一种首次收集顺序成立。'],
    ['近路陷阱', ['顺序陷阱'], '目标：直接近路会关闭出口。'],
    ['两阶段顺序', ['顺序陷阱', '历史分支'], '目标：第一手和第二手都受约束。'],
    ['四星取舍', ['顺序陷阱'], '目标：四颗星限制可行顺序。'],
    ['顺序加回程', ['顺序陷阱', '回程/旧路'], '目标：顺序同时决定回程可达性。'],
    ['诱饵星', ['顺序陷阱'], '目标：更明显的近星诱饵。'],
    ['章末顺序', ['顺序陷阱', '历史分支'], '复习：顺序与箭头历史共同限制路线。'],
  ]],
  [4, [
    ['两步优化', ['多方案取舍', '步数优化'], '目标：两条路线相差至少两步。'],
    ['安全短', ['多方案取舍', '步数优化'], '目标：安全路线和短路线都成立。'],
    ['风险近路', ['多方案取舍', '步数优化'], '目标：近路有风险但更短。'],
    ['多解顺序', ['多方案取舍'], '目标：多个顺序可用但步数不同。'],
    ['贪心更长', ['多方案取舍', '步数优化'], '目标：贪心路线可通关但更长。'],
    ['路线分岔', ['多方案取舍', '历史分支'], '目标：分岔后的承诺影响步数。'],
    ['回程优化', ['多方案取舍', '步数优化'], '目标：先绕远再回程更短。'],
    ['章末优化', ['多方案取舍', '步数优化'], '复习：通关后仍有明显优化空间。'],
  ]],
  [5, [
    ['综合入门', ['顺序陷阱', '回程/旧路'], '目标：顺序和回程同时存在。'],
    ['双阶段顺序', ['顺序陷阱', '历史分支'], '目标：两次顺序决策相互影响。'],
    ['路线历史', ['历史分支', '多方案取舍'], '目标：历史箭头造成路线取舍。'],
    ['短综合', ['顺序陷阱', '步数优化'], '目标：短路线但有两层决策。'],
    ['四回环', ['回程/旧路', '顺序陷阱'], '目标：回环路线限制顺序。'],
    ['步数综合', ['步数优化', '历史分支'], '目标：更短路线需要理解历史箭头。'],
    ['章末前夜', ['顺序陷阱', '回程/旧路', '步数优化'], '目标：合并三类核心约束。'],
    ['终章综合', ['顺序陷阱', '历史分支', '步数优化'], '目标：正式终章前的综合压力测试。'],
  ]],
]);

function slotCriteria(chapter, slot) {
  const base = {
    chapter,
    slot,
    sizes: [[5, 5]],
    gems: [2],
    wallChance: [0.12, 0.22],
    minStartEnd: 2,
    minShort: 6,
    maxShort: 16,
    maxRevisit: 4,
    minRevisit: 0,
    orderMinRatio: null,
    orderMaxRatio: null,
    nearestWins: null,
    requireNoSimple: false,
    requireSimple: false,
    requireGreedyFail: false,
    requireStepOpt: false,
    combinedMin: 0,
    requireHistory: false,
  };
  if (chapter === 1) {
    const plans1 = [
      {sizes: [[5, 5], [5, 4]], gems: [2], minShort: 7, maxShort: 11, maxRevisit: 1, orderMinRatio: 1},
      {sizes: [[5, 5], [6, 5]], gems: [2], minShort: 9, maxShort: 13, minRevisit: 1, orderMinRatio: 1},
      {sizes: [[5, 5], [6, 5]], gems: [2], minShort: 9, maxShort: 14, requireNoSimple: true, orderMinRatio: 1},
      {sizes: [[5, 5], [6, 5]], gems: [2], minShort: 10, maxShort: 14, requireGreedyFail: true, nearestWins: true, orderMinRatio: 1},
      {sizes: [[5, 5], [6, 5]], gems: [2], minShort: 10, maxShort: 15, maxRevisit: 3, orderMinRatio: 1},
      {sizes: [[5, 5], [6, 5]], gems: [2], minShort: 11, maxShort: 15, minRevisit: 1, maxRevisit: 3, orderMinRatio: 1},
      {sizes: [[5, 5], [6, 5]], gems: [2], minShort: 11, maxShort: 16, maxRevisit: 4, requireGreedyFail: true, orderMinRatio: 1},
      {sizes: [[5, 5], [6, 5]], gems: [2], minShort: 12, maxShort: 16, maxRevisit: 4, orderMinRatio: 1},
    ];
    return {...base, ...plans1[slot]};
  }
  if (chapter === 2) {
    const plans2 = [
      {gems: [2], minShort: 10, maxShort: 14, minRevisit: 1, orderMinRatio: 0.5},
      {gems: [2], minShort: 11, maxShort: 15, requireNoSimple: true, orderMinRatio: 0.5},
      {gems: [3], minShort: 11, maxShort: 15, minRevisit: 2, orderMinRatio: 0.5},
      {gems: [2, 3], minShort: 12, maxShort: 16, requireNoSimple: true, orderMinRatio: 0.5},
      {gems: [2, 3], minShort: 13, maxShort: 16, minRevisit: 1, orderMinRatio: 0.5},
      {gems: [3], minShort: 13, maxShort: 17, requireNoSimple: true, orderMinRatio: 0.5},
      {gems: [2, 3], minShort: 14, maxShort: 18, minRevisit: 2, orderMinRatio: 0.5},
      {gems: [3], minShort: 14, maxShort: 19, minRevisit: 2, orderMinRatio: 0.5, maxRevisit: 6},
    ];
    return {...base, sizes: [[5, 5]], wallChance: [0.13, 0.24], minStartEnd: 3, maxRevisit: 6, ...plans2[slot]};
  }
  if (chapter === 3) {
    const plans3 = [
      {gems: [3], minShort: 8, maxShort: 12, orderMaxRatio: 1 / 3, nearestWins: false},
      {gems: [3], minShort: 10, maxShort: 14, orderMaxRatio: 1 / 6, nearestWins: false},
      {gems: [3], minShort: 10, maxShort: 15, orderMaxRatio: 1 / 3, nearestWins: false},
      {gems: [3], minShort: 11, maxShort: 16, orderMaxRatio: 1 / 3, nearestWins: false},
      {gems: [4], minShort: 12, maxShort: 17, orderMaxRatio: 1 / 3, nearestWins: false},
      {gems: [3, 4], minShort: 12, maxShort: 18, orderMaxRatio: 1 / 2, nearestWins: false, requireNoSimple: true},
      {gems: [4], minShort: 13, maxShort: 18, orderMaxRatio: 1 / 3, nearestWins: false},
      {gems: [4], minShort: 14, maxShort: 19, orderMaxRatio: 1 / 6, nearestWins: false, maxRevisit: 4},
    ];
    return {...base, sizes: [[5, 5], [6, 5]], wallChance: [0.14, 0.26], minStartEnd: 3, maxRevisit: 5, ...plans3[slot]};
  }
  if (chapter === 4) {
    const plans4 = [
      {gems: [3, 4], minShort: 12, maxShort: 16, requireStepOpt: true},
      {gems: [3], minShort: 13, maxShort: 17, requireStepOpt: true},
      {gems: [3, 4], minShort: 14, maxShort: 18, requireStepOpt: true},
      {gems: [3, 4], minShort: 14, maxShort: 19, requireStepOpt: true},
      {gems: [4], minShort: 15, maxShort: 20, requireStepOpt: true},
      {gems: [3, 4], minShort: 15, maxShort: 20, requireStepOpt: true, minRevisit: 1},
      {gems: [4], minShort: 16, maxShort: 21, requireStepOpt: true},
      {gems: [4], minShort: 17, maxShort: 22, requireStepOpt: true, maxRevisit: 5},
    ];
    return {...base, sizes: [[5, 5], [6, 5], [6, 6]], wallChance: [0.12, 0.24], minStartEnd: 3, maxRevisit: 5, orderMinRatio: 1 / 6, ...plans4[slot]};
  }
  const plans5 = [
    {gems: [3], minShort: 15, maxShort: 20, combinedMin: 2},
    {gems: [4], minShort: 16, maxShort: 21, combinedMin: 2},
    {gems: [3, 4], minShort: 17, maxShort: 22, combinedMin: 2},
    {gems: [3], minShort: 16, maxShort: 21, combinedMin: 2, maxRevisit: 5},
    {gems: [4], minShort: 18, maxShort: 23, combinedMin: 2, requireNoSimple: true},
    {gems: [4], minShort: 18, maxShort: 23, combinedMin: 2},
    {gems: [4], minShort: 19, maxShort: 24, combinedMin: 3},
    {gems: [4], minShort: 20, maxShort: 25, combinedMin: 3},
  ];
  return {...base, sizes: [[5, 5], [6, 5], [6, 6]], wallChance: [0.15, 0.27], minStartEnd: 3, maxRevisit: 8, ...plans5[slot]};
}

function passCriteria(criteria, metrics) {
  const steps = metrics.shortest.state.steps;
  const ratio = metrics.winningOrders.length / metrics.totalOrders;
  if (steps < criteria.minShort || steps > criteria.maxShort) return false;
  if (metrics.metrics.revisitEntries < criteria.minRevisit || metrics.metrics.revisitEntries > criteria.maxRevisit) return false;
  if (criteria.requireNoSimple && metrics.simple.exists) return false;
  if (criteria.requireSimple && !metrics.simple.exists) return false;
  if (criteria.requireGreedyFail && metrics.greedy.won) return false;
  if (criteria.orderMinRatio !== null && ratio < criteria.orderMinRatio) return false;
  if (criteria.orderMaxRatio !== null && ratio > criteria.orderMaxRatio) return false;
  if (criteria.nearestWins === true && !metrics.nearestWins) return false;
  if (criteria.nearestWins === false && metrics.nearestWins) return false;
  if (criteria.requireStepOpt) {
    const spread = metrics.steps.length >= 2 && metrics.steps[metrics.steps.length - 1] - metrics.steps[0] >= 2;
    const greedyGap = metrics.greedy.won && metrics.greedy.steps - steps >= 2;
    const multiple = metrics.winningOrders.length >= 2;
    if (!(multiple && (spread || greedyGap))) return false;
  }
  if (criteria.combinedMin > 0) {
    let combined = 0;
    if (ratio <= 0.5) combined++;
    if (!metrics.simple.exists) combined++;
    if (metrics.greedy.won && metrics.greedy.steps - steps >= 2) combined++;
    if (metrics.steps.length >= 2 && metrics.steps[metrics.steps.length - 1] - metrics.steps[0] >= 2) combined++;
    if (criteria.requireHistory && metrics.history) combined++;
    if (combined < criteria.combinedMin) return false;
  }
  if (criteria.requireHistory && !metrics.history) return false;
  return true;
}

function strategyFor(criteria, metrics) {
  const tags = [];
  if (criteria.chapter === 1) tags.push('基础规则');
  if (!metrics.simple.exists || metrics.metrics.revisitEntries > 0) tags.push('回程/旧路');
  if (criteria.chapter >= 3 && metrics.winningOrders.length / metrics.totalOrders <= 0.5 && !metrics.nearestWins) tags.push('顺序陷阱');
  if (criteria.chapter >= 4 && metrics.winningOrders.length >= 2 && metrics.steps.length >= 2) tags.push('多方案取舍');
  if (criteria.chapter >= 4 && (metrics.steps.length >= 2 && metrics.steps[metrics.steps.length - 1] - metrics.steps[0] >= 2 || metrics.greedy.won && metrics.greedy.steps - metrics.shortest.state.steps >= 2)) tags.push('步数优化');
  if (metrics.history) tags.push('历史分支');
  if (criteria.chapter === 5) tags.push('综合挑战');
  if (tags.length === 0) tags.push('路线规划');
  return [...new Set(tags)];
}

function makeLevel(criteria, def, metrics) {
  const chapter = criteria.chapter;
  const slot = criteria.slot;
  const plan = plans.get(chapter)[slot];
  const id = `C${chapter}-${String(slot + 3).padStart(2, '0')}`;
  const board = metrics.board;
  const firstGemPlan = [...new Set(metrics.shortest.path.filter((p) => board.gems.includes(p)))]
    .map((gem) => [Math.floor(gem / board.W), gem % board.W]);
  const ratio = metrics.winningOrders.length / metrics.totalOrders;
  return {
    id,
    chapter,
    chapterName: chapterNames.get(chapter),
    name: plan[0],
    tag: `第${chapter}章 · ${plan[2]}`,
    source: 'generated:v1',
    rows: def.rows,
    optimal: metrics.shortest.state.steps,
    verifiedReplay: true,
    strategy: strategyFor(criteria, metrics),
    evidence: {
      winningOrders: `${metrics.winningOrders.length}/${metrics.totalOrders}`,
      orderRatio: Number(ratio.toFixed(4)),
      simplePath: metrics.simple.exists,
      revisits: metrics.metrics.revisitEntries,
      greedy: metrics.greedy.won ? `成功 ${metrics.greedy.steps} 步` : `失败@${metrics.greedy.steps}`,
      shortestOrderSteps: metrics.steps.slice(0, 6),
      firstGemPlan,
      note: plan[2],
      historyCell: metrics.history ? metrics.history.cell : null,
    },
    directions: directionsFromPath(metrics.shortest.path, board.W),
  };
}

const chapterArg = Number(process.env.V1_CHAPTER || 1);
const startArg = Number(process.env.V1_START || 0);
const countArg = Number(process.env.V1_COUNT || 8);
const seedBase = Number(process.env.V1_SEED || 0);
const output = process.env.V1_OUTPUT;
const pool = [...banned];
const generated = [];
let attempts = 0;

for (let slot = startArg; slot < startArg + countArg; slot++) {
  const criteria = slotCriteria(chapterArg, slot);
  let accepted = false;
  for (let retry = 0; retry < 120 && !accepted; retry++) {
    for (let i = 0; i < 50000 && !accepted; i++) {
      attempts++;
      if (process.env.V1_DEBUG && attempts % 20000 === 0) console.error(`progress attempts=${attempts} chapter=${chapterArg} slot=${slot + 3}`);
      const seed = seedBase + chapterArg * 1000000 + slot * 100000 + retry * 10000 + i;
      const rand = mulberry32(seed);
      const [W, H] = criteria.sizes[Math.floor(rand() * criteria.sizes.length)];
      const gems = criteria.gems[Math.floor(rand() * criteria.gems.length)];
      const wallChance = criteria.wallChance[0] + rand() * (criteria.wallChance[1] - criteria.wallChance[0]);
      const def = randomMap(rand, {W, H, wallChance, gems, minStartEnd: criteria.minStartEnd});
      if (!def) continue;
      const quick = solveFirst(def, {maxStates: 300_000});
      if (!quick.won || quick.aborted) continue;
      if (quick.state.steps < criteria.minShort || quick.state.steps > criteria.maxShort) continue;
      const quickSimple = simplePathExists(def, {maxStates: 300_000});
      if (criteria.requireNoSimple && quickSimple.exists) continue;
      const metrics = analyze(def, {orderDepth: true, historyDepth: criteria.chapter === 5 || criteria.requireHistory});
      if (!passCriteria(criteria, metrics)) continue;
      const close = tooClose(def.rows, pool, 8);
      if (close) continue;
      const level = makeLevel(criteria, def, metrics);
      generated.push(level);
      pool.push({id: level.id, rows: level.rows});
      accepted = true;
    }
  }
  if (!accepted) throw new Error(`failed to generate chapter ${chapterArg} slot ${slot + 3}`);
}

const payload = {attempts, levels: generated};
if (output) writeFileSync(output, JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload.levels, null, 2));