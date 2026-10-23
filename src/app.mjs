// DEV-001: UI events, session statistics and export; rules live in game-engine.mjs.
import {DIRS,initial as createInitial,target,move as moveState,undo as undoState,restart as restartState} from './game-engine.mjs';
import {render as renderGame} from './render.mjs';
const params=new URLSearchParams(location.search);
const EXPERIMENT=params.get('mode')==='experiment';
const levelsPath=EXPERIMENT?'../data/levels.experimental.json':'../data/levels.v0.2.json';
const levelsResponse=await fetch(new URL(levelsPath,import.meta.url));
if(!levelsResponse.ok)throw new Error('Failed to load levels: '+levelsResponse.status);
const LEVELS=await levelsResponse.json();
const $=id=>document.getElementById(id);
let level=EXPERIMENT?0:3,state=null,history=[],counts={},events=[],openedAt=Date.now(),notice='',noticeType='';
function scope(){return EXPERIMENT?'experiment':'original'}
function keyFor(i){return (EXPERIMENT?'exp:':'')+String(i+1)}
function levelKey(){return keyFor(level)}
function stat(){const k=levelKey();if(!counts[k])counts[k]={mode:scope(),level:level+1,code:LEVELS[level].code??null,opened:0,clears:0,best:null,undos:0,restarts:0,invalid:0,lastSteps:null,secondsToFirstClear:null};return counts[k]}
function initial(){return createInitial(LEVELS[level])}
function render(){renderGame({LEVELS,level,state,counts,historyLength:history.length,undos:stat().undos,mode:scope()})}
function record(type,extra={}){events.push({time:new Date().toISOString(),mode:scope(),level:level+1,type,...extra})}
function say(text,type=''){notice=text;noticeType=type;const el=$('notice');el.textContent=text;el.className='notice'+(type?' '+type:'')}
function openLevel(i){if(i<0||i>=LEVELS.length)return;level=i;state=initial();history=[];openedAt=Date.now();stat().opened++;record('open');render();say(EXPERIMENT?'实验关卡：使用方向键 / WASD / 屏幕按钮，或点击相邻格子移动。':'使用方向键 / WASD / 屏幕按钮，或点击相邻格子移动。')}
function move(d){if(state.won){say('已经通关，可点击下一关，或撤销继续尝试。');return}
 const v=target(state,d);if(v<0){stat().invalid++;record('invalid',{direction:DIRS[d][2],at:state.pos});say('这一步无法执行：可能有障碍，也可能与旧箭头的方向冲突。','warn');return}
 const from=state.pos;history.push(state);state=moveState(state,d);
 record('move',{from,to:v,direction:DIRS[d][2],got:state.got.length,stampedAfterMove:Object.keys(state.stamps).length});
 if(state.won){const s=stat();s.clears++;s.lastSteps=state.steps;s.best=s.best===null?state.steps:Math.min(s.best,state.steps);const duration=Math.round((Date.now()-openedAt)/1000);if(s.secondsToFirstClear===null)s.secondsToFirstClear=duration;record('clear',{steps:state.steps,durationSeconds:duration});render();say('通关！本次 '+state.steps+' 步；求解器验证的最短路线是 '+LEVELS[level].optimal+' 步。'+(state.steps===LEVELS[level].optimal?'你找到了最短解。':'如果有兴趣，也可以尝试更短路线。'),'success');return}
 render();say(state.board.gems.includes(v)?'收集成功。注意后续路线是否还能到达出口。':Object.prototype.hasOwnProperty.call(state.stamps,v)?'你回到了留下箭头的格子，接下来要遵循它的方向。':'观察下一步：已经走过的格子会保留方向。');
}
function undo(){if(history.length===0)return;state=undoState(state,history);history.pop();stat().undos++;record('undo',{steps:state.steps});render();say('已经撤销上一步。')}
function restart(){stat().restarts++;record('restart',{previousSteps:state.steps});state=restartState(state);history=[];openedAt=Date.now();render();say(EXPERIMENT?'重新开始实验 '+LEVELS[level].code+'。测试统计仍然保留。':'重新开始第'+(level+1)+'关。测试统计仍然保留。')}
function testSummary(){const modeName=EXPERIMENT?'实验关卡':'V0.2';const lines=['方向回声 '+modeName+'｜试玩记录','生成时间：'+new Date().toLocaleString('zh-CN'),'说明：本记录由页面事件自动汇总，主观体验需要玩家自行补充。',''];const start=EXPERIMENT?0:3;for(let i=start;i<LEVELS.length;i++){const s=counts[keyFor(i)];const label=EXPERIMENT?('实验 '+LEVELS[i].code+' '+LEVELS[i].name):('第'+(i+1)+'关 '+LEVELS[i].name);lines.push(label+'：'+(s?('通关'+s.clears+'次，最佳'+(s.best??'未通关')+'步，撤销'+s.undos+'次，重开'+s.restarts+'次，无效方向'+s.invalid+'次，首次通关计时'+(s.secondsToFirstClear??'—')+'秒'):'未游玩'))}lines.push('','事件明细(JSON)：',JSON.stringify({mode:scope(),levels:counts,events},null,2));return lines.join('\n')}
function downloadSummary(str){const blob=new Blob([str],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=EXPERIMENT?'方向回声_实验关卡_试玩记录.txt':'方向回声_v02_试玩记录.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500)}
function copySummary(){const str=testSummary(),el=$('copyBtn'),orig=el.textContent;const ok=()=>{el.textContent='✓ 已复制，可以粘贴发送';setTimeout(()=>el.textContent=orig,2500)};const backup=()=>{const tmp=document.createElement('textarea');tmp.value=str;tmp.style.position='fixed';tmp.style.left='-9999px';document.body.appendChild(tmp);tmp.select();let copied=false;try{copied=document.execCommand('copy')}catch(e){}tmp.remove();if(copied)ok();else{downloadSummary(str);el.textContent='已下载测试记录';setTimeout(()=>el.textContent=orig,2500)}};if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(str).then(ok).catch(backup)}else backup()}
$('levelGrid').addEventListener('click',e=>{const b=e.target.closest('button[data-level]');if(b)openLevel(Number(b.dataset.level))});
$('board').addEventListener('click',e=>{const b=e.target.closest('.cell[data-dir]');if(b)move(Number(b.dataset.dir))});
$('board').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const b=e.target.closest('.cell[data-dir]');if(b){e.preventDefault();move(Number(b.dataset.dir))}}});
document.querySelectorAll('.dpad button').forEach(el=>el.addEventListener('click',()=>move(Number(el.dataset.dir))));
$('undoBtn').addEventListener('click',undo);$('resetBtn').addEventListener('click',restart);$('nextBtn').addEventListener('click',()=>openLevel(level+1));$('copyBtn').addEventListener('click',copySummary);
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;const mapping={'ArrowUp':0,'ArrowRight':1,'ArrowDown':2,'ArrowLeft':3,'w':0,'d':1,'s':2,'a':3};const d=mapping[e.key];if(d!==undefined){e.preventDefault();move(d)}else if(e.key==='Backspace'||(e.ctrlKey&&e.key.toLowerCase()==='z')){e.preventDefault();undo()}});
const modeLink=$('modeLink');
if(EXPERIMENT){
 document.title='方向回声 · 实验关卡';
 modeLink.textContent='← 返回九关';modeLink.href='./';
 $('intro').textContent='实验模式 · 五关独立实验关卡：旧路重访、顺序陷阱、多路口规划与预留退路。原九关仍保留。';
 $('levelHint').textContent='实验 A–C · B1–B2';
 $('testboxNote').textContent='优先体验实验 A–C 与 B1–B2。重点观察：收集顺序是否真的改变后续路线？关键格子的前期箭头是否影响退路？';
 $('footNote').textContent='五关均有求解器验证的通关路线。通关前不展示参考步数。实验记录与原九关统计分开保存，离开前请复制。';
}else{
 modeLink.textContent='实验模式 →';modeLink.href='?mode=experiment';
}
window.echoTest={mode:scope(),levels:LEVELS,getState:()=>({mode:scope(),level:level+1,code:LEVELS[level].code??null,position:state.pos,got:[...state.got],arrows:{...state.stamps},steps:state.steps,won:state.won,historyLength:history.length,counts}),goToLevel:n=>openLevel(n-1),move};
openLevel(EXPERIMENT?0:3);