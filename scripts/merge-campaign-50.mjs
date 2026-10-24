import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {initial, move, parse} from '../src/game-engine.mjs';
import {solveFirst} from '../tests/experiment-analysis.mjs';

const TEMP = process.env.MERGE_TEMP || tmpdir();
const batch1 = JSON.parse(readFileSync('data/levels.campaign.batch1.json', 'utf8'));
const batch1Fixtures = JSON.parse(readFileSync('tests/fixtures/verified-paths.campaign.batch1.json', 'utf8'));
const classic = JSON.parse(readFileSync('data/levels.v0.2.json', 'utf8'));
const experimental = JSON.parse(readFileSync('data/levels.experimental.json', 'utf8'));

const chapterFiles = new Map([
  [1, TEMP + '/gen-c1-8.json'],
  [2, TEMP + '/gen-c2-8.json'],
  [3, TEMP + '/gen-c3-8.json'],
  [4, TEMP + '/gen-c4-8.json'],
  [5, TEMP + '/gen-c5-8.json'],
]);
const generated = [];
const missing = [];
for (const [chapter, file] of chapterFiles) {
  if (!existsSync(file)) { missing.push(chapter); continue; }
  const payload = JSON.parse(readFileSync(file, 'utf8'));
  for (const level of payload.levels) {
    if (level.chapter !== chapter) throw new Error(`file ${file} contains level ${level.id} outside chapter ${chapter}`);
    generated.push(level);
  }
}
if (missing.length > 0 && !process.env.MERGE_ALLOW_PARTIAL) {
  throw new Error('missing generated chapters: ' + missing.join(',') + ' (set MERGE_ALLOW_PARTIAL=1 to merge what exists)');
}

const byId = new Map();
for (const level of batch1) byId.set(level.id, {...level, directions: batch1Fixtures.find((f) => f.id === level.id).directions});
for (const level of generated) {
  if (byId.has(level.id)) throw new Error('duplicate id ' + level.id);
  byId.set(level.id, level);
}

const levels = [];
for (let chapter = 1; chapter <= 5; chapter++) {
  for (let index = 1; index <= 10; index++) {
    const id = `C${chapter}-${String(index).padStart(2, '0')}`;
    if (byId.has(id)) levels.push(byId.get(id));
    else console.error('MISSING level ' + id);
  }
}
if (process.env.MERGE_ALLOW_PARTIAL) {
  writeReport(levels, 'partial');
  process.exit(0);
}
if (levels.length !== 50) throw new Error('expected 50 levels, got ' + levels.length);

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

const failures = [];
const warnings = [];
const fixtures = [];
const pool = [
  ...classic.map((level, index) => ({id: 'V02-' + String(index + 1).padStart(2, '0'), rows: level.rows})),
  ...experimental.map((level) => ({id: 'EXP-' + level.code, rows: level.rows})),
];
for (const [index, level] of levels.entries()) {
  let state = initial(level);
  const history = [];
  let illegal = -1;
  for (const [step, direction] of level.directions.entries()) {
    const next = move(state, direction);
    if (next === state) { illegal = step; break; }
    history.push(state);
    state = next;
  }
  if (illegal >= 0) failures.push(`${level.id}: reference route illegal at step ${illegal + 1}`);
  else if (!state.won) failures.push(`${level.id}: reference route did not win`);
  else if (state.steps !== level.optimal) failures.push(`${level.id}: replay steps ${state.steps} != optimal ${level.optimal}`);
  const bfs = solveFirst(level, {maxStates: 2_000_000});
  if (bfs.aborted) failures.push(`${level.id}: BFS ABORTED at ${bfs.state ? bfs.state.steps : '?'} steps, optimal NOT verified`);
  else if (bfs.status !== 'solved' || !bfs.won) failures.push(`${level.id}: BFS status=${bfs.status}, not solved`);
  else if (bfs.state.steps !== level.optimal) failures.push(`${level.id}: BFS shortest ${bfs.state.steps} != optimal ${level.optimal}`);
  for (const entry of pool) {
    if (level.source === entry.id) continue;
    if (canonical(entry.rows) === canonical(level.rows)) failures.push(`${level.id}: exact duplicate of ${entry.id}`);
    const distance = hamming(level.rows, entry.rows);
    if (distance !== null && distance < 6) failures.push(`${level.id}: hamming ${distance} < 6 vs ${entry.id}`);
    else if (distance !== null && distance < 8) warnings.push(`${level.id}: hamming ${distance} vs ${entry.id}`);
  }
  pool.push({id: level.id, rows: level.rows});
  fixtures.push({level: index + 1, id: level.id, expectedSteps: level.optimal, directions: level.directions});
}

if (failures.length > 0) {
  console.error('FAILURES:\n' + failures.join('\n'));
  process.exit(1);
}
if (warnings.length > 0) console.error('WARNINGS:\n' + warnings.join('\n'));
writeReport(levels, 'full');
writeFileSync('tests/fixtures/verified-paths.campaign.json', JSON.stringify(fixtures, null, 2) + '\n');
console.log('merged ' + levels.length + ' levels, fixtures written');

function writeReport(list, mode) {
  const data = list.map(({directions, ...level}) => level);
  writeFileSync('data/levels.campaign.json', JSON.stringify(data, null, 2) + '\n');
  console.log(mode + ' merge wrote data/levels.campaign.json with ' + list.length + ' levels');
}
