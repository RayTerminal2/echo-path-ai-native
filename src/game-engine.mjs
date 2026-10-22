// DEV-001: deterministic rules; UI statistics and event history stay outside this module.
export const DIRS=[[-1,0,'↑'],[0,1,'→'],[1,0,'↓'],[0,-1,'←']];
export function parse(def){const H=def.rows.length,W=def.rows[0].length,flat=def.rows.join('');return {W,H,flat,start:flat.indexOf('S'),end:flat.indexOf('E'),gems:[...flat].flatMap((v,i)=>v==='★'?[i]:[])}}

export function initial(def) {
 const board=parse(def);
 return {board,pos:board.start,stamps:{},got:[],steps:0,won:false};
}
export function target(state,d) {
 if(!Number.isInteger(d)||d<0||d>3||state.won)return -1;
 if(Object.hasOwn(state.stamps,state.pos)&&state.stamps[state.pos]!==d)return -1;
 const b=state.board,y=Math.floor(state.pos/b.W)+DIRS[d][0],x=state.pos%b.W+DIRS[d][1];
 if(y<0||y>=b.H||x<0||x>=b.W)return -1;
 const v=y*b.W+x;
 return b.flat[v]==='#'?-1:v;
}
// Invalid moves return the identical state; successful moves never mutate their input.
export function move(state,d) {
 const v=target(state,d);
 if(v<0)return state;
 const stamps={...state.stamps};
 if(!Object.hasOwn(stamps,state.pos))stamps[state.pos]=d;
 const got=state.board.gems.includes(v)&&!state.got.includes(v)?[...state.got,v]:[...state.got];
 return {...state,pos:v,stamps,got,steps:state.steps+1,won:v===state.board.end&&got.length===state.board.gems.length};
}
export function undo(state,history) {
 return history.length?history[history.length-1]:state;
}
export function restart(state) {
 return {...state,pos:state.board.start,stamps:{},got:[],steps:0,won:false};
}
