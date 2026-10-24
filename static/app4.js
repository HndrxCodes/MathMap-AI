const NAV='Navigator';
(()=>{const s=document.createElement('style');s.textContent=`
.card.pick.nvcard{display:flex;align-items:flex-start;gap:14px;text-align:left;width:100%;margin-top:14px;padding:16px;border-radius:16px;background:linear-gradient(135deg,rgba(168,85,247,.10),rgba(6,182,212,.08));border:1px solid rgba(168,85,247,.35)}
.nvhead{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.nvt{font-weight:800;font-size:20px;letter-spacing:-.3px}
.nvs{font-size:12px;color:#94a3b8;margin-top:2px}
.nvm{max-width:92%;padding:11px 14px;border-radius:16px;margin:10px 0;line-height:1.5;font-size:14.5px;word-wrap:break-word}
.nvm.me{margin-left:auto;background:#1f3a6b;border-bottom-right-radius:4px}
.nvm.bot{background:#151b33;border:1px solid #2a3050;border-bottom-left-radius:4px}
.nvacts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.nvacts .btn{flex:0 0 auto;padding:9px 14px;font-size:13.5px}
.nvtr{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:12px;font:600 10.5px 'JetBrains Mono',ui-monospace,monospace;color:#94a3b8}
.nvtp{padding:3px 8px;border-radius:10px;background:rgba(34,211,238,.1);border:1px solid rgba(34,211,238,.25);color:#67e8f9}
.nvtp.bad{background:rgba(248,113,113,.1);border-color:rgba(248,113,113,.3);color:#f87171}
.nvtr i{color:#475569;font-style:normal}
.nvbar .nvin{flex:1;min-width:0;height:46px;border-radius:14px;background:#0d1226;border:1px solid #2a3050;color:#e8ebf7;font-size:16px;padding:0 14px;outline:none}
.nvbar .nvin:focus{border-color:#60a5fa}
.nvbar .nvsend{flex:0 0 auto;padding:0 20px}
`;document.head.appendChild(s)})();
const NAVI='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z" fill="currentColor" fill-opacity=".25"/></svg>';
const NCH=['Plan my study session','Am I ready for Limits?','How have I improved?','I only have 10 minutes today'];

function navEntry(){
  if(!(S.res&&S.res.total))return;
  const el=document.querySelector('.agent');
  const h=`<button class="card pick nvcard" data-nvopen="1"><span class="gi" style="color:#22d3ee;background:rgba(34,211,238,.12)">${NAVI}</span><span class="gcc"><span class="gtt">${NAV}</span><span class="gd">Plans your next step from your own results${S.plan?' · '+S.plan.minutes+' min/day':''}.</span></span></button>`;
  if(el)el.insertAdjacentHTML('beforebegin',h);
}
const _gs0=goalScreen;
goalScreen=function(a){_gs0(a);try{navEntry()}catch(e){}};

function navScreen(){
  S.nv=S.nv||{log:[],hist:[],busy:false,model:null};
  show(`<div class="nvhead"><button class="hbtn" data-nvback="1" aria-label="Back">←</button><div><div class="nvt">${NAV}</div><div class="nvs">Plans your next step from your own data</div></div></div><div id="nvlog"></div><div class="bar nvbar"><input id="nvin" class="nvin" type="text" placeholder="Ask what to do next…" autocomplete="off" enterkeyhint="send"><button class="btn nvsend" id="nvsend">Send</button></div>`);
  nvRender(true);
}
function nvRender(noscroll){
  const box=document.getElementById('nvlog');if(!box)return;const N=S.nv;
  const nm=(S.prof&&S.prof.name)?', '+esc(S.prof.name):'';
  let h='';
  if(!N.log.length){
    h+=`<div class="nvm bot">Hi${nm}. I look at your results and plan what to do next${S.plan?`, using your ${S.plan.minutes}-minute daily plan`:''}.</div><div class="chips">${NCH.map(c=>`<button class="chip" data-nvchip="${esc(c)}">${esc(c)}</button>`).join('')}</div>`;
  }
  h+=N.log.map(m=>{
    if(m.role==='me')return `<div class="nvm me">${esc(m.text)}</div>`;
    if(m.pending)return `<div class="nvm bot"><span class="mut">Checking your results…</span></div>`;
    const acts=(m.actions||[]).map(a=>`<button class="btn ghost" data-nvact="${esc(a.type)}" data-nvc="${esc(a.concept||'')}">${esc(a.label)}</button>`).join('');
    const tr=(m.trace||[]).length?`<div class="nvtr"><span>Tools</span>${m.trace.map(t=>`<span class="nvtp ${t.ok?'':'bad'}">${esc(t.tool)}</span>`).join('<i>›</i>')}</div>`:'';
    return `<div class="nvm bot">${md(fixMath(m.text))}${acts?`<div class="nvacts">${acts}</div>`:''}${tr}</div>`;
  }).join('');
  if(N.model)h+=`<div class="mut" style="font-size:.72rem;text-align:center;margin-top:8px">${esc(/nemotron/i.test(N.model)?'NVIDIA Nemotron':N.model.split('/').pop())} · Nebius Token Factory</div>`;
  box.innerHTML=h+'<div style="height:130px"></div>';
  rich(box);
  if(!noscroll)window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});
}
async function nvSend(text){
  const N=S.nv;text=(text||'').trim();if(!text||N.busy)return;
  N.busy=true;N.log.push({role:'me',text},{role:'bot',pending:true});nvRender();
  let r;
  try{r=await api('/navigator/chat',{student_id:SID,message:text,history:N.hist})}
  catch(e){r={reply:'Sorry, I could not reach the navigator.',trace:[],actions:[]}}
  N.log.pop();
  N.hist.push({role:'user',content:text},{role:'assistant',content:r.reply});
  N.log.push({role:'bot',text:r.reply,trace:r.trace||[],actions:r.actions||[]});
  if(r.model)N.model=r.model;
  N.busy=false;nvRender();
}
app.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  try{
    if(d.nvopen)return navScreen();
    if(d.nvback)return goalScreen();
    if(d.nvchip)return nvSend(d.nvchip);
    if(b.id==='nvsend'){const i=document.getElementById('nvin'),v=i.value;i.value='';return nvSend(v)}
    if(d.nvact==='practice')return startPractice(d.nvc);
    if(d.nvact==='lesson')return lessonSheet(d.nvc);
    if(d.nvact==='scan'){S.start={mode:'gaps',topics:[]};return startTest()}
  }catch(err){alert('Something went wrong ('+err.message+')')}
});
app.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.id==='nvin'){const v=e.target.value;e.target.value='';nvSend(v)}
});
/* END app4.js */
