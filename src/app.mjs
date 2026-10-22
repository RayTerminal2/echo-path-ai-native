// DEV-001: UI events, session statistics and export; rules live in game-engine.mjs.
import {DIRS,initial as createInitial,target,move as moveState,undo as undoState,restart as restartState} from './game-engine.mjs';
import {render as renderGame} from './render.mjs';
const response=await fetch(new URL('../data/levels.v0.2.json',import.meta.url));
if(!response.ok)throw new Error('Failed to load levels: '+response.status);
const LEVELS=await response.json();
const $=id=>document.getElementById(id);
let level=3,state=null,history=[],counts={},events=[],openedAt=Date.now(),notice='',noticeType='';
function levelKey(){return String(level+1)}
function stat(){const k=levelKey();if(!counts[k])counts[k]={level:level+1,opened:0,clears:0,best:null,undos:0,restarts:0,invalid:0,lastSteps:null,secondsToFirstClear:null};return counts[k]}
function initial(){return createInitial(LEVELS[level])}
function render(){renderGame({LEVELS,level,state,counts,historyLength:history.length,undos:stat().undos})}
function record(type,extra={}){events.push({time:new Date().toISOString(),level:level+1,type,...extra})}
function say(text,type=''){notice=text;noticeType=type;const el=$('notice');el.textContent=text;el.className='notice'+(type?' '+type:'')}
function openLevel(i){level=i;state=initial();history=[];openedAt=Date.now();stat().opened++;record('open');render();say('可点击绿色格子，或使用方向键 / WASD / 屏幕按钮移动。')}
function move(d){if(state.won){say('已经通关，可点击下一关，或撤销继续尝试。');return}
 const v=target(state,d);if(v<0){stat().invalid++;record('invalid',{direction:DIRS[d][2],at:state.pos});say('这一步无法执行：可能有障碍，也可能与旧箭头的方向冲突。','warn');return}
 const from=state.pos;history.push(state);state=moveState(state,d);
 record('move',{from,to:v,direction:DIRS[d][2],got:state.got.length,stampedAfterMove:Object.keys(state.stamps).length});
 if(state.won){const s=stat();s.clears++;s.lastSteps=state.steps;s.best=s.best===null?state.steps:Math.min(s.best,state.steps);const duration=Math.round((Date.now()-openedAt)/1000);if(s.secondsToFirstClear===null)s.secondsToFirstClear=duration;record('clear',{steps:state.steps,durationSeconds:duration});render();say('通关！本次 '+state.steps+' 步；求解器验证的最短路线是 '+LEVELS[level].optimal+' 步。'+(state.steps===LEVELS[level].optimal?'你找到了最短解。':'如果有兴趣，也可以尝试更短路线。'),'success');return}
 render();say(state.board.gems.includes(v)?'收集成功。注意后续路线是否还能到达出口。':Object.prototype.hasOwnProperty.call(state.stamps,v)?'你回到了留下箭头的格子，接下来要遵循它的方向。':'观察下一步：已经走过的格子会保留方向。');
}
function undo(){if(history.length===0)return;state=undoState(state,history);history.pop();stat().undos++;record('undo',{steps:state.steps});render();say('已经撤销上一步。')}
function restart(){stat().restarts++;record('restart',{previousSteps:state.steps});state=restartState(state);history=[];openedAt=Date.now();render();say('重新开始第'+(level+1)+'关。测试统计仍然保留。')}
function testSummary(){const lines=['方向回声 V0.2｜试玩记录','生成时间：'+new Date().toLocaleString('zh-CN'),'说明：本记录由页面事件自动汇总，主观体验需要玩家自行补充。',''];for(let i=3;i<LEVELS.length;i++){const s=counts[String(i+1)];lines.push('第'+(i+1)+'关 '+LEVELS[i].name+'：'+(s?('通关'+s.clears+'次，最佳'+(s.best??'未通关')+'步，撤销'+s.undos+'次，重开'+s.restarts+'次，无效方向'+s.invalid+'次，首次通关计时'+(s.secondsToFirstClear??'—')+'秒'):'未游玩'))}lines.push('','事件明细(JSON)：',JSON.stringify({levels:counts,events:events},null,2));return lines.join('\n')}
function downloadSummary(str){const blob=new Blob([str],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='方向回声_v02_试玩记录.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500)}
function copySummary(){const str=testSummary(),el=$('copyBtn'),orig=el.textContent;const ok=()=>{el.textContent='✓ 已复制，可以粘贴发送';setTimeout(()=>el.textContent=orig,2500)};const backup=()=>{const tmp=document.createElement('textarea');tmp.value=str;tmp.style.position='fixed';tmp.style.left='-9999px';document.body.appendChild(tmp);tmp.select();let copied=false;try{copied=document.execCommand('copy')}catch(e){}tmp.remove();if(copied)ok();else{downloadSummary(str);el.textContent='已下载测试记录';setTimeout(()=>el.textContent=orig,2500)}};if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(str).then(ok).catch(backup)}else backup()}
$('levelGrid').addEventListener('click',e=>{const b=e.target.closest('button[data-level]');if(b)openLevel(Number(b.dataset.level))});
$('board').addEventListener('click',e=>{const b=e.target.closest('.cell[data-dir]');if(b)move(Number(b.dataset.dir))});
$('board').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const b=e.target.closest('.cell[data-dir]');if(b){e.preventDefault();move(Number(b.dataset.dir))}}});
document.querySelectorAll('.dpad button').forEach(el=>el.addEventListener('click',()=>move(Number(el.dataset.dir))));
$('undoBtn').addEventListener('click',undo);$('resetBtn').addEventListener('click',restart);$('nextBtn').addEventListener('click',()=>openLevel(level+1));$('copyBtn').addEventListener('click',copySummary);
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;const mapping={'ArrowUp':0,'ArrowRight':1,'ArrowDown':2,'ArrowLeft':3,'w':0,'d':1,'s':2,'a':3};const d=mapping[e.key];if(d!==undefined){e.preventDefault();move(d)}else if(e.key==='Backspace'||(e.ctrlKey&&e.key.toLowerCase()==='z')){e.preventDefault();undo()}});
window.echoTest={levels:LEVELS,getState:()=>({level:level+1,position:state.pos,got:[...state.got],arrows:{...state.stamps},steps:state.steps,won:state.won,historyLength:history.length,counts}),goToLevel:n=>openLevel(n-1),move};
openLevel(3);
