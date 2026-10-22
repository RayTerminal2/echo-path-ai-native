// DEV-001: exercise the same rules imported by the browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initial,move,target,undo,restart} from '../src/game-engine.mjs';
const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const levels=load('../data/levels.v0.2.json');
const fixtures=load('./fixtures/verified-paths.v0.2.json');
const start=()=>initial({rows:['S.E','.★#','...']});
function freeze(value){Object.freeze(value);for(const v of Object.values(value))if(v&&typeof v==='object')freeze(v);return value}
test('legal movement stamps departure, collects once, and leaves input untouched',()=>{
 const s=freeze(start());const a=move(s,1);
 assert.equal(a.pos,1);assert.deepEqual(a.stamps,{0:1});assert.equal(a.steps,1);
 const b=move(a,2);assert.deepEqual(b.got,[4]);assert.deepEqual(b.stamps,{0:1,1:2});
 assert.equal(s.steps,0);assert.deepEqual(s.stamps,{});
 assert.deepEqual(undo(b,[s,a]),a);assert.deepEqual(undo(a,[s]),s);
});
test('boundary, wall and invalid directions leave every state field unchanged',()=>{
 const s=freeze(start());for(const d of [0,3,-1,4,NaN,'1',null]){assert.equal(target(s,d),-1);assert.equal(move(s,d),s)}
 const atExit=freeze(move(move(s,1),1));assert.equal(move(atExit,2),atExit);
});
test('revisiting stamped cells cannot overwrite or bypass the old direction; gems do not duplicate',()=>{
 let s=start();for(const d of [1,2,3,0])s=move(s,d);
 assert.equal(s.pos,0);assert.equal(move(s,2),s);
 s=move(s,1);s=move(s,2);assert.deepEqual(s.got,[4]);assert.equal(s.stamps[0],1);
});
test('exit before all gems is traversable; only stopping at exit with all gems wins',()=>{
 let s=initial({rows:['SE★','...','...']});s=move(s,1);
 assert.equal(s.pos,s.board.end);assert.equal(s.won,false);
 for(const d of [1,2,3,0])s=move(s,d);
 assert.equal(s.won,true);assert.equal(s.steps,5);assert.equal(move(s,1),s);
});
test('undo after victory restores full state, then replay and restart are deterministic',()=>{
 let s=initial({rows:['S★E','...','...']});const history=[];
 for(const d of [1,1]){history.push(s);s=move(s,d)}
 assert.equal(s.won,true);s=undo(s,history);history.pop();
 assert.deepEqual(s,history.length?move(history[0],1):null);assert.equal(s.won,false);
 assert.equal(move(s,1).won,true);
 const fresh=restart(freeze(move(s,1)));assert.deepEqual(fresh,initial({rows:['S★E','...','...']}));
 assert.equal(undo(fresh,[]),fresh);
});
for(const [i,f] of fixtures.entries())test(`level ${i+1}: actual engine wins in ${f.expectedSteps} steps`,()=>{
 let s=initial(levels[i]);const history=[];
 for(const d of f.directions){history.push(s);const next=move(freeze(s),d);assert.notEqual(next,s);s=next}
 assert.equal(s.won,true);assert.equal(s.steps,[5,11,16,14,13,17,19,19,23][i]);
 assert.equal(s.pos,s.board.end);assert.equal(s.got.length,s.board.gems.length);
 s=undo(s,history);assert.equal(s.won,false);
 assert.deepEqual(restart(s),initial(levels[i]));
});
