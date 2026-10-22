import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const original = readFileSync(new URL('../legacy/echo-v0.2-original.html', import.meta.url),'utf8');
const levels = JSON.parse(readFileSync(new URL('../data/levels.v0.2.json', import.meta.url),'utf8'));
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/verified-paths.v0.2.json', import.meta.url),'utf8'));
// BASELINE ONLY: these checks do not exercise the browser's game implementation.
// After DEV-001, add independent tests that import the extracted rules module.
function embeddedLevels(html) {
  const m = html.match(/const LEVELS=(\[[^;]+\]);/);
  assert.ok(m, 'baseline HTML contains LEVELS');
  return JSON.parse(m[1]);
}
function replayReference(lvl, dirs) {
  const rows=lvl.rows, W=rows[0].length, H=rows.length;
  const flat=rows.join('');
  let pos=flat.indexOf('S');
  let got = new Set(), stamps = new Map(), steps=0;
  const offsets=[[-1,0],[0,1],[1,0],[0,-1]];
  for (const dir of dirs) {
    assert.ok(Number.isInteger(dir)&&dir>=0&&dir<4);
    assert.ok(!stamps.has(pos) || stamps.get(pos)===dir, 'respects stored arrow');
    const y=Math.floor(pos/W)+offsets[dir][0],x=pos%W+offsets[dir][1];
    assert.ok(y>=0&&y<H&&x>=0&&x<W, 'within board');
    const n=y*W+x;
    assert.notEqual(flat[n], '#', 'not a wall');
    if(!stamps.has(pos)) stamps.set(pos, dir);
    pos=n;steps++;
    if(flat[pos]==='★')got.add(pos);
  }
  assert.equal(pos,flat.indexOf('E'),'finished at exit');
  assert.equal(got.size,[...flat].filter(c=>c==='★').length,'collected all goals');
  return steps;
}
test('frozen V0.2 reference matches its audited SHA256',()=> {
  const sha=createHash('sha256').update(original,'utf8').digest('hex');
  assert.equal(sha,'75b9f04a879d4d31aaca86e4b70f72cafda73265d8cdde5f52c3cf5b8ec5d9c1');
});
test('frozen original levels equal the external source-data snapshot',()=>assert.deepEqual(embeddedLevels(original),levels));
test('nine levels have valid start/end, consistent geometry and reference routes',()=>{
  assert.equal(levels.length,9);
  assert.equal(fixtures.length,levels.length);
  for(const [i,l] of levels.entries()) {
    assert.ok(l.rows.length>=4);
    const w=l.rows[0].length;
    assert.ok(l.rows.every(r=>r.length===w&&/^[S.E★#]+$/.test(r)));
    const flat=l.rows.join('');
    assert.equal((flat.match(/S/g)||[]).length,1);
    assert.equal((flat.match(/E/g)||[]).length,1);
    assert.ok((flat.match(/★/g)||[]).length>0);
    const fixture=fixtures[i];
    assert.equal(fixture.level,i+1);
    assert.equal(replayReference(l,fixture.directions),fixture.expectedSteps);
    assert.equal(fixture.expectedSteps,l.optimal);
  }
});
