// DEV-001: DOM rendering only.
import {DIRS,target} from './game-engine.mjs';
const $=id=>document.getElementById(id);
export function render({LEVELS,level,state,counts,best=null,historyLength,undos,mode='original',chapterView=1}){const def=LEVELS[level],b=state.board,exp=mode==='experiment',campaign=mode==='campaign',keyPrefix=campaign?'cam:':exp?'exp:':'';
 $('stageTitle').textContent=campaign?(def.id+' · '+def.name):exp?('实验 '+def.code+' · '+def.name):('第'+(level+1)+'关 · '+def.name);$('stageTag').textContent=def.tag;$('stageType').textContent=campaign?('第'+def.chapter+'章 · '+(def.chapterName??'')):exp?'实验关卡':level>=3?'新关卡':'基础复习';$('stageType').classList.toggle('new',campaign||exp||level>=3);
 $('levelGrid').classList.toggle('experiment',exp);
 $('levelGrid').classList.toggle('campaign',campaign);
 const tabs=$('chapterTabs');if(tabs){tabs.classList.toggle('hidden',!campaign);tabs.innerHTML=campaign?[1,2,3,4,5].map((c)=>{const idxs=LEVELS.map((d,i)=>({d,i})).filter(({d})=>d.chapter===c);const done=idxs.filter(({i})=>counts['cam:'+String(i+1)]?.clears).length;return '<button type="button" data-chapter="'+c+'" class="'+(chapterView===c?'now':'')+'" aria-label="第'+c+'章 '+done+'/'+idxs.length+'">'+c+' 章 <small>'+done+'/'+idxs.length+'</small></button>'}).join(''):void 0}
 const shown=campaign?LEVELS.map((d,i)=>({d,i})).filter(({d})=>d.chapter===chapterView):LEVELS.map((d,i)=>({d,i}));
 $('levelGrid').innerHTML=shown.map(({d,i})=>'<button type="button" data-level="'+i+'" class="'+(level===i?'now ':'')+((campaign||exp||i>=3)?'is-new ':'')+(counts[keyPrefix+String(i+1)]?.clears?'cleared':'')+'" aria-label="'+(campaign?d.id+' '+d.name:exp?'实验 '+d.code:'第'+(i+1)+'关')+'">'+(campaign?d.id.slice(-2):exp?d.code:(i+1))+'</button>').join('');
 $('stepCount').textContent=state.steps;$('gemCount').textContent=state.got.length+'/'+b.gems.length;$('undoCount').textContent=undos;$('undoBtn').disabled=historyLength===0;$('nextBtn').classList.toggle('hidden',!state.won||level===LEVELS.length-1);const challenge=$('challengeLine');if(challenge)challenge.innerHTML='<span class="current">当前 '+state.steps+' 步</span> · <span>'+(Number.isInteger(def.optimal)&&def.optimal>0?'最优 '+def.optimal+' 步':'最优待确认')+'</span> · <span class="best">个人最佳 '+(best??'未通关')+' 步</span>';
 const legal=new Map();for(let d=0;d<4;d++){const v=target(state,d);if(v>=0)legal.set(v,d)}
  let content='';for(let p=0;p<b.W*b.H;p++){
   const wall=b.flat[p]==='#',cur=state.pos===p,gem=b.gems.includes(p)&&!state.got.includes(p),goal=b.end===p,stamped=Object.prototype.hasOwnProperty.call(state.stamps,p),go=legal.has(p);
   const cls=['cell',wall?'wall':'',cur?'current':''].filter(Boolean).join(' ');
   let inner='';if(goal)inner+='<span class="goal"></span>';if(gem)inner+='<span class="star">◆</span>';if(stamped)inner+='<span class="arrow">'+DIRS[state.stamps[p]][2]+'</span>';if(b.start===p&&!cur)inner+='<span class="spawn">S</span>';if(cur){inner+='<span class="player">•</span>';if(stamped)inner+='<span class="player-arrow" aria-hidden="true">'+DIRS[state.stamps[p]][2]+'</span>'}
   const label=wall?'障碍':cur?'角色位置':gem?'收集物':goal?'出口':'通行地面';content+='<div class="'+cls+'" data-pos="'+p+'" '+(go?'data-dir="'+legal.get(p)+'" tabindex="0" role="button"':'')+' aria-label="'+label+'">'+inner+'</div>';
  }const grid=$('board');grid.style.setProperty('--n',b.W);grid.style.setProperty('--h',b.H);grid.innerHTML=content;
}
