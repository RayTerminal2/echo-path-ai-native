// DEV-001: DOM rendering only.
import {DIRS,target} from './game-engine.mjs';
const $=id=>document.getElementById(id);
export function render({LEVELS,level,state,counts,historyLength,undos,mode='original'}){const def=LEVELS[level],b=state.board,exp=mode==='experiment',keyPrefix=exp?'exp:':'';
 $('stageTitle').textContent=exp?('实验 '+def.code+' · '+def.name):('第'+(level+1)+'关 · '+def.name);$('stageTag').textContent=def.tag;$('stageType').textContent=exp?'实验关卡':level>=3?'新关卡':'基础复习';$('stageType').classList.toggle('new',exp||level>=3);
 $('levelGrid').classList.toggle('experiment',exp);
 $('levelGrid').innerHTML=LEVELS.map((d,i)=>'<button type="button" data-level="'+i+'" class="'+(level===i?'now ':'')+((exp||i>=3)?'is-new ':'')+(counts[keyPrefix+String(i+1)]?.clears?'cleared':'')+'" aria-label="'+(exp?'实验 '+d.code:'第'+(i+1)+'关')+'">'+(exp?d.code:(i+1))+'</button>').join('');
 $('stepCount').textContent=state.steps;$('gemCount').textContent=state.got.length+'/'+b.gems.length;$('undoCount').textContent=undos;$('undoBtn').disabled=historyLength===0;$('nextBtn').classList.toggle('hidden',!state.won||level===LEVELS.length-1);
 const legal=new Map();for(let d=0;d<4;d++){const v=target(state,d);if(v>=0)legal.set(v,d)}
  let content='';for(let p=0;p<b.W*b.H;p++){
   const wall=b.flat[p]==='#',cur=state.pos===p,gem=b.gems.includes(p)&&!state.got.includes(p),goal=b.end===p,stamped=Object.prototype.hasOwnProperty.call(state.stamps,p),go=legal.has(p);
   const cls=['cell',wall?'wall':'',cur?'current':''].filter(Boolean).join(' ');
   let inner='';if(goal)inner+='<span class="goal"></span>';if(gem)inner+='<span class="star">◆</span>';if(stamped)inner+='<span class="arrow">'+DIRS[state.stamps[p]][2]+'</span>';if(b.start===p&&!cur)inner+='<span class="spawn">S</span>';if(cur)inner+='<span class="player">•</span>';
   const label=wall?'障碍':cur?'角色位置':gem?'收集物':goal?'出口':'通行地面';content+='<div class="'+cls+'" data-pos="'+p+'" '+(go?'data-dir="'+legal.get(p)+'" tabindex="0" role="button"':'')+' aria-label="'+label+'">'+inner+'</div>';
  }const grid=$('board');grid.style.setProperty('--n',b.W);grid.style.setProperty('--h',b.H);grid.innerHTML=content;
}
