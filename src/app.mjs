// DEV-001: UI events, session statistics and export; rules live in game-engine.mjs.
import {DIRS,initial as createInitial,target,move as moveState,undo as undoState,restart as restartState} from './game-engine.mjs';
import {render as renderGame} from './render.mjs';
const params=new URLSearchParams(location.search);
const EXPERIMENT=params.get('mode')==='experiment';
const CLASSIC=params.get('mode')==='classic';
const CAMPAIGN=!EXPERIMENT&&!CLASSIC;
const levelsPath=CAMPAIGN?'../data/levels.campaign.json':EXPERIMENT?'../data/levels.experimental.json':'../data/levels.v0.2.json';
const levelsResponse=await fetch(new URL(levelsPath,import.meta.url));
if(!levelsResponse.ok)throw new Error('Failed to load levels: '+levelsResponse.status);
const LEVELS=await levelsResponse.json();
const $=id=>document.getElementById(id);
let level=CAMPAIGN?0:EXPERIMENT?0:3,chapterView=1,state=null,history=[],counts={},events=[],openedAt=Date.now(),notice='',noticeType='';
function scope(){return CAMPAIGN?'campaign':EXPERIMENT?'experiment':'original'}
function keyFor(i){return (CAMPAIGN?'cam:':EXPERIMENT?'exp:':'')+String(i+1)}
const BEST_STORAGE_KEY='echoPath.best.v1';
function loadBests(){try{const parsed=JSON.parse(localStorage.getItem(BEST_STORAGE_KEY)||'{}');if(!parsed||typeof parsed!=='object')return{};return Object.fromEntries(Object.entries(parsed).filter(([,value])=>Number.isInteger(value)&&value>0))}catch{return{}}}
function saveBests(values){try{localStorage.setItem(BEST_STORAGE_KEY,JSON.stringify(values))}catch{}}
let bests=loadBests();
function bestKeyFor(i){return scope()+':'+(LEVELS[i].id||LEVELS[i].code||String(i+1))}
function personalBest(i=level){return bests[bestKeyFor(i)]??null}
function updatePersonalBest(i,steps){const key=bestKeyFor(i);const previous=bests[key]??null;if(previous===null||steps<previous){bests[key]=steps;saveBests(bests);return true}return false}
function levelKey(){return keyFor(level)}
function stat(){const k=levelKey();if(!counts[k])counts[k]={mode:scope(),level:level+1,id:LEVELS[level].id??null,code:LEVELS[level].code??null,opened:0,clears:0,best:null,undos:0,restarts:0,invalid:0,lastSteps:null,secondsToFirstClear:null};return counts[k]}
function initial(){return createInitial(LEVELS[level])}
function render(){renderGame({LEVELS,level,state,counts,best:personalBest(),historyLength:history.length,undos:stat().undos,mode:scope(),chapterView})}
function record(type,extra={}){events.push({time:new Date().toISOString(),mode:scope(),level:level+1,type,...extra})}
function say(text,type=''){notice=text;noticeType=type;const el=$('notice');el.textContent=text;el.className='notice'+(type?' '+type:'')}
function openLevel(i){if(i<0||i>=LEVELS.length)return;level=i;chapterView=LEVELS[i].chapter??chapterView;state=initial();history=[];openedAt=Date.now();stat().opened++;record('open');render();say(CAMPAIGN?'V1.0 正式关卡：使用方向键 / WASD / 屏幕按钮，或点击相邻格子移动。':EXPERIMENT?'实验关卡：使用方向键 / WASD / 屏幕按钮，或点击相邻格子移动。':'使用方向键 / WASD / 屏幕按钮，或点击相邻格子移动。')}
function move(d){if(state.won){say('已经通关，可点击下一关，或撤销继续尝试。');return}
 const v=target(state,d);if(v<0){stat().invalid++;record('invalid',{direction:DIRS[d][2],at:state.pos});say('这一步无法执行：可能有障碍，也可能与旧箭头的方向冲突。','warn');return}
 const from=state.pos;history.push(state);state=moveState(state,d);
 record('move',{from,to:v,direction:DIRS[d][2],got:state.got.length,stampedAfterMove:Object.keys(state.stamps).length});
 if(state.won){const s=stat();const refreshed=updatePersonalBest(level,state.steps);s.clears++;s.lastSteps=state.steps;s.best=s.best===null?state.steps:Math.min(s.best,state.steps);const duration=Math.round((Date.now()-openedAt)/1000);if(s.secondsToFirstClear===null)s.secondsToFirstClear=duration;record('clear',{steps:state.steps,durationSeconds:duration,refreshedPersonalBest:refreshed});render();const target=Number.isInteger(LEVELS[level].optimal)&&LEVELS[level].optimal>0?LEVELS[level].optimal:null;const best=personalBest();const targetText=target===null?'最优步数待完整求解确认':'最优 '+target+' 步';const gapText=target===null?'':target===state.steps?' · 已追平最优':' · 距离最优还差 '+(state.steps-target)+' 步';say('通关！本次 '+state.steps+' 步 · '+targetText+gapText+' · 个人最佳 '+(best??'—')+' 步 · '+(refreshed?'已刷新纪录。':'未刷新纪录，重开可再挑战。'),'success');return}
 render();say(state.board.gems.includes(v)?'收集成功。注意后续路线是否还能到达出口。':Object.prototype.hasOwnProperty.call(state.stamps,v)?'你回到了留下箭头的格子，接下来要遵循它的方向。':'观察下一步：已经走过的格子会保留方向。');
}
function undo(){if(history.length===0)return;state=undoState(state,history);history.pop();stat().undos++;record('undo',{steps:state.steps});render();say('已经撤销上一步。')}
function restart(){stat().restarts++;record('restart',{previousSteps:state.steps});state=restartState(state);history=[];openedAt=Date.now();render();say(CAMPAIGN?'重新开始 '+LEVELS[level].id+'。步数挑战重新开始，个人最佳仍然保留。':EXPERIMENT?'重新开始实验 '+LEVELS[level].code+'。测试统计仍然保留。':'重新开始第'+(level+1)+'关。测试统计仍然保留。')}
function testSummary(){const modeName=CAMPAIGN?'V1.0 正式50关':EXPERIMENT?'实验关卡':'V0.2';const lines=['方向回声 '+modeName+'｜试玩记录','生成时间：'+new Date().toLocaleString('zh-CN'),'说明：本记录由页面事件自动汇总，主观体验需要玩家自行补充。',''];const start=CAMPAIGN||EXPERIMENT?0:3;for(let i=start;i<LEVELS.length;i++){const s=counts[keyFor(i)];const personal=bests[bestKeyFor(i)];const label=CAMPAIGN?(LEVELS[i].id+' '+LEVELS[i].name):EXPERIMENT?('实验 '+LEVELS[i].code+' '+LEVELS[i].name):('第'+(i+1)+'关 '+LEVELS[i].name);lines.push(label+'：'+((s||personal!==undefined)?('通关'+(s?.clears??0)+'次，个人最佳'+(personal??'未通关')+'步，撤销'+(s?.undos??0)+'次，重开'+(s?.restarts??0)+'次，无效方向'+(s?.invalid??0)+'次，首次通关计时'+(s?.secondsToFirstClear??'—')+'秒'):'未游玩'))}lines.push('','事件明细(JSON)：',JSON.stringify({mode:scope(),levels:counts,personalBests:bests,events},null,2));return lines.join('\n')}
function downloadSummary(str){const blob=new Blob([str],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=CAMPAIGN?'方向回声_V1正式50关_试玩记录.txt':EXPERIMENT?'方向回声_实验关卡_试玩记录.txt':'方向回声_v02_试玩记录.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500)}
function copySummary(){const str=testSummary(),el=$('copyBtn'),orig=el.textContent;const ok=()=>{el.textContent='✓ 已复制，可以粘贴发送';setTimeout(()=>el.textContent=orig,2500)};const backup=()=>{const tmp=document.createElement('textarea');tmp.value=str;tmp.style.position='fixed';tmp.style.left='-9999px';document.body.appendChild(tmp);tmp.select();let copied=false;try{copied=document.execCommand('copy')}catch(e){}tmp.remove();if(copied)ok();else{downloadSummary(str);el.textContent='已下载测试记录';setTimeout(()=>el.textContent=orig,2500)}};if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(str).then(ok).catch(backup)}else backup()}
$('levelGrid').addEventListener('click',e=>{const b=e.target.closest('button[data-level]');if(b)openLevel(Number(b.dataset.level))});
$('chapterTabs').addEventListener('click',e=>{const b=e.target.closest('button[data-chapter]');if(b){chapterView=Number(b.dataset.chapter);render()}});
$('board').addEventListener('click',e=>{const b=e.target.closest('.cell[data-dir]');if(b)move(Number(b.dataset.dir))});
$('board').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const b=e.target.closest('.cell[data-dir]');if(b){e.preventDefault();move(Number(b.dataset.dir))}}});
document.querySelectorAll('.dpad button').forEach(el=>el.addEventListener('click',()=>move(Number(el.dataset.dir))));
$('undoBtn').addEventListener('click',undo);$('resetBtn').addEventListener('click',restart);$('nextBtn').addEventListener('click',()=>openLevel(level+1));$('copyBtn').addEventListener('click',copySummary);
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;const mapping={'ArrowUp':0,'ArrowRight':1,'ArrowDown':2,'ArrowLeft':3,'w':0,'d':1,'s':2,'a':3};const d=mapping[e.key];if(d!==undefined){e.preventDefault();move(d)}else if(e.key==='Backspace'||(e.ctrlKey&&e.key.toLowerCase()==='z')){e.preventDefault();undo()}});
const modeLink=$('modeLink');
const campaignLink=$('campaignLink');
if(CAMPAIGN){
 document.title='方向回声 · V1.0 正式50关';
 modeLink.textContent='实验模式 →';modeLink.href='?mode=experiment';
 campaignLink.textContent='经典九关 →';campaignLink.href='?mode=classic';campaignLink.classList.remove('hidden');
 $('intro').textContent='V1.0 正式50关 · 五章各十关：基础规则、回程规划、收集顺序、多方案取舍与步数优化、综合挑战。步数挑战与个人最佳为正式功能。';
 $('levelHint').textContent='选择章节 · 每章十关 · 点击切换';
 $('testboxNote').textContent='优先按 C1→C5 顺序体验。重点观察：最近目标是否诱人、回程是否可提前规划、两条路线是否值得比较步数、通关后是否愿意再挑战个人最佳。';
 $('footNote').textContent='五十关均有求解器完整 BFS 验证的参考路线与最优步数。难度递进与趣味性尚未完成人工试玩验收。';
}else if(EXPERIMENT){
 document.title='方向回声 · 实验关卡';
 modeLink.textContent='经典九关 →';modeLink.href='?mode=classic';
 campaignLink.textContent='V1.0 正式50关 →';campaignLink.href='?mode=campaign';campaignLink.classList.remove('hidden');
 $('intro').textContent='实验模式 · 八关独立实验关卡：旧路重访、顺序陷阱、多路口规划与路线取舍。原九关仍保留。';
 $('levelHint').textContent='实验 A–C · B1–B2 · B1+ · E1–E2';
 $('testboxNote').textContent='优先体验实验 A–C、B1–B2、B1+ 与 E1–E2。重点观察：玩家如何规划收集顺序，以及是否会主动尝试不同路线。';
 $('footNote').textContent='八关均有求解器验证的通关路线。通关前不展示参考步数。实验记录与原九关统计分开保存，离开前请复制。';
}else{
 document.title='方向回声 · 经典九关';
 modeLink.textContent='实验模式 →';modeLink.href='?mode=experiment';
 campaignLink.textContent='V1.0 正式50关 →';campaignLink.href='?mode=campaign';campaignLink.classList.remove('hidden');
}
window.echoTest={mode:scope(),levels:LEVELS,getState:()=>({mode:scope(),level:level+1,id:LEVELS[level].id??null,code:LEVELS[level].code??null,position:state.pos,got:[...state.got],arrows:{...state.stamps},steps:state.steps,won:state.won,historyLength:history.length,counts}),goToLevel:n=>openLevel(n-1),move};
openLevel(CAMPAIGN||EXPERIMENT?0:3);