const NAV='Navigator';
(()=>{const s=document.createElement('style');s.textContent=`
#nvfab{position:fixed;right:14px;bottom:calc(86px + env(safe-area-inset-bottom,0px));z-index:30;display:flex;align-items:center;gap:8px;height:46px;padding:0 16px 0 5px;border:1.5px solid transparent;border-radius:23px;color:#e8ebf7;font:700 13.5px 'Plus Jakarta Sans',system-ui,sans-serif;cursor:pointer;background:linear-gradient(#141a33,#141a33) padding-box,linear-gradient(135deg,#e879f9,#a855f7 55%,#22d3ee) border-box;box-shadow:0 8px 24px rgba(168,85,247,.35);-webkit-tap-highlight-color:transparent;transition:opacity .2s,transform .2s}
#nvfab:active{transform:scale(.95)}
#nvfab.off{opacity:0;pointer-events:none;transform:translateY(10px)}
#nvfab .nvfi{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#a855f7,#06b6d4);color:#fff}
.nvtop{position:fixed;top:0;left:0;right:0;z-index:30;padding:calc(10px + env(safe-area-inset-top,0px)) 16px 10px;background:rgba(14,18,36,.92);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,.06)}
.nvrow{display:flex;align-items:center;gap:12px}
.nvrow .hbtn{flex:none}
.hbtn.nvmore{border:1.5px solid transparent;background:linear-gradient(#151b33,#151b33) padding-box,linear-gradient(135deg,#e879f9,#a855f7 55%,#22d3ee) border-box}
.nvtt{flex:1;min-width:0}
.nvt{font-weight:800;font-size:18px;letter-spacing:-.3px;line-height:1.1}
.nvs{font-size:11.5px;color:#94a3b8;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nvtabs{display:flex;gap:8px;margin-top:10px;overflow-x:auto;scrollbar-width:none}
.nvtabs::-webkit-scrollbar{display:none}
.nvtab{flex:0 0 auto;max-width:150px;height:30px;padding:0 13px;border-radius:15px;border:1.5px solid #2a3050;background:#151b33;color:#94a3b8;font:600 12.5px 'Plus Jakarta Sans',system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
.nvtab.on{color:#fff;border-color:transparent;background:linear-gradient(#1a1535,#1a1535) padding-box,linear-gradient(135deg,#e879f9,#a855f7 55%,#22d3ee) border-box}
.nvsp{height:var(--nvtop,64px)}
.nvm{max-width:92%;padding:12px 15px;border-radius:18px;margin:10px 0;font-size:14.5px;word-wrap:break-word;scroll-margin-top:calc(var(--nvtop,64px) + 12px)}
.nvm.me{margin-left:auto;color:#fff;font-weight:500;line-height:1.5;background:linear-gradient(135deg,#4f8cff,#2f6df6);border-bottom-right-radius:5px;box-shadow:0 6px 18px rgba(47,109,246,.32)}
.nvm.bot{background:#151b33;border:1px solid #232b4a;border-bottom-left-radius:5px;line-height:1.7}
.nvp{margin:2px 0}
.nvgap{height:8px}
.nvst{display:flex;gap:11px;margin:11px 0;align-items:flex-start}
.nvn{flex:none;width:22px;height:22px;margin-top:2px;border-radius:50%;background:linear-gradient(135deg,#e879f9,#a855f7);color:#fff;font:800 12px/22px 'Plus Jakarta Sans',system-ui,sans-serif;text-align:center}
.nvbl{display:flex;gap:11px;margin:8px 0;align-items:flex-start}
.nvd{flex:none;width:6px;height:6px;margin-top:11px;border-radius:50%;background:#e879f9}
.k-hi{color:#fb923c;font-weight:700}
.k-md,.k-dv{color:#fbbf24;font-weight:700}
.k-lo,.k-st{color:#34d399;font-weight:700}
.k-nw{color:#f87171;font-weight:700}
.k-tp{color:#93c5fd;font-weight:700}
.k-mn{color:#67e8f9;font-weight:600}
.nvdots{display:inline-flex;gap:4px;margin-left:8px;vertical-align:middle}
.nvdots i{width:6px;height:6px;border-radius:50%;background:#e879f9;animation:nvb 1s infinite ease-in-out}
.nvdots i:nth-child(2){animation-delay:.15s;background:#a855f7}
.nvdots i:nth-child(3){animation-delay:.3s;background:#22d3ee}
@keyframes nvb{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
@media (prefers-reduced-motion:reduce){.nvdots i{animation:none}}
.nvacts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.nvacts .btn{flex:0 0 auto;padding:9px 14px;font-size:13.5px}
.nvtr{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:12px;font:600 10.5px 'JetBrains Mono',ui-monospace,monospace;color:#94a3b8}
.nvtp{padding:3px 8px;border-radius:10px;background:rgba(34,211,238,.1);border:1px solid rgba(34,211,238,.25);color:#67e8f9}
.nvtp.bad{background:rgba(248,113,113,.1);border-color:rgba(248,113,113,.3);color:#f87171}
.nvtr i{color:#475569;font-style:normal}
.nvbar{display:flex!important;align-items:flex-end;gap:10px}
.nvbar .nvin{flex:1;min-width:0;min-height:44px;max-height:120px;resize:none;border:0;border-radius:22px;background:#1a2140;color:#e8ebf7;font:inherit;font-size:16px;line-height:1.4;padding:11px 16px;outline:none;box-sizing:border-box;overflow-y:auto}
.nvbar .nvin::placeholder{color:#7b86ad}
.nvbar .nvin:focus{box-shadow:0 0 0 1px rgba(96,165,250,.3)}
.nvbar .btn.nvsend{flex:0 0 40px!important;width:40px!important;height:40px;min-width:0;padding:0!important;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#60a5fa,#3b82f6);color:#fff;box-shadow:0 4px 14px rgba(59,130,246,.45);margin-bottom:2px;transition:opacity .15s,transform .12s}
.nvbar .btn.nvsend:disabled{opacity:.4;box-shadow:none}
.nvbar .btn.nvsend:active:not(:disabled){transform:scale(.92)}
#nvdown{position:fixed;left:50%;bottom:calc(var(--nvh,72px) + 12px);z-index:25;width:34px;height:34px;padding:0;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#f0abfc;background:rgba(21,27,51,.78);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border:1px solid rgba(232,121,249,.4);box-shadow:0 4px 16px rgba(232,121,249,.2);opacity:.85;transform:translateX(-50%);transition:opacity .2s,transform .2s;cursor:pointer}
#nvdown.off{opacity:0;pointer-events:none;transform:translate(-50%,8px)}
`;document.head.appendChild(s)})();
const NAVI='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z" fill="currentColor" fill-opacity=".25"/></svg>';
const SV=(p,w)=>'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
const ICO={up:SV('<path d="M12 19V5M5 12l7-7 7 7"/>',3),down:SV('<path d="M12 5v14M5 12l7 7 7-7"/>',2.4),back:SV('<path d="M15 6l-6 6 6 6"/>',2.4)};
const MORE='<svg width="18" height="18" viewBox="0 0 24 24"><defs><linearGradient id="nvmg" gradientUnits="userSpaceOnUse" x1="0" y1="3" x2="0" y2="21"><stop offset="0" stop-color="#e879f9"/><stop offset=".55" stop-color="#a855f7"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><circle cx="12" cy="5" r="2.2" fill="url(#nvmg)"/><circle cx="12" cy="12" r="2.2" fill="url(#nvmg)"/><circle cx="12" cy="19" r="2.2" fill="url(#nvmg)"/></svg>';
const NCH=['Plan my study session','Am I ready for Limits?','How have I improved?','I only have 10 minutes today'];
const COARSE=!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
const nvCls={high:'k-hi',medium:'k-md',low:'k-lo','needs work':'k-nw',developing:'k-dv',strong:'k-st'};

function nvDecor(s){
  s=s.replace(/\b(HIGH|MEDIUM|LOW)\b(?:[\s-]risk)?|\b(high|medium|low)[\s-]risk\b/g,(m,u,l)=>`<span class="${nvCls[(u||l).toLowerCase()]}">${m}</span>`);
  s=s.replace(/\b(needs work|developing|strong)\b/gi,(m,k)=>`<span class="${nvCls[k.toLowerCase()]}">${m}</span>`);
  s=s.replace(/\b(Integer Operations|Basic Algebra|Factoring|Functions|Quadratic Equations|Limits?)\b/g,'<span class="k-tp">$1</span>');
  return s.replace(/\b(\d+\s?(?:minutes|mins|min))\b/gi,'<span class="k-mn">$1</span>');
}
function nvInline(s){
  return s.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/).map((p,i)=>i%2?esc(p):nvDecor(esc(p).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>'))).join('');
}
function nvFmt(t){
  let out='',gap=false;
  for(const raw of fixMath(t).split('\n')){
    const l=raw.trim();
    if(!l){if(!gap)out+='<div class="nvgap"></div>';gap=true;continue}
    gap=false;
    let m=l.match(/^(\d+)[.)]\s+(.*)$/);
    if(m){out+=`<div class="nvst"><span class="nvn">${m[1]}</span><span>${nvInline(m[2])}</span></div>`;continue}
    m=l.match(/^[-•*]\s+(.*)$/);
    if(m){out+=`<div class="nvbl"><span class="nvd"></span><span>${nvInline(m[1])}</span></div>`;continue}
    out+=`<div class="nvp">${nvInline(l)}</div>`;
  }
  return out;
}

function nvLayout(){
  const b=document.querySelector('.nvbar'),t=document.getElementById('nvtop'),r=document.documentElement.style;
  if(b)r.setProperty('--nvh',b.offsetHeight+'px');
  if(t)r.setProperty('--nvtop',t.offsetHeight+'px');
}
function nvAtBottom(){return window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-150}
function nvSyncBtn(){const d=document.getElementById('nvdown');if(d)d.classList.toggle('off',nvAtBottom())}
function nvToBottom(smooth){window.scrollTo({top:document.documentElement.scrollHeight,behavior:smooth===false?'auto':'smooth'})}
function nvUpd(){const i=document.getElementById('nvin'),b=document.getElementById('nvsend');if(b)b.disabled=!(i&&i.value.trim())||!!(S.nv&&S.nv.busy)}

function nvHead(){
  const N=S.nv,el=document.getElementById('nvtop');if(!el)return;
  const tabs=N.chats.map(c=>({id:c.id,t:c.title}));
  if(!N.cid&&tabs.length)tabs.push({id:'',t:'New chat'});
  const row=`<div class="nvrow"><button class="hbtn" data-nvback="1" aria-label="Back to menu">${ICO.back}</button><div class="nvtt"><div class="nvt">${NAV}</div><div class="nvs">Plans your next step from your own data</div></div><button class="hbtn nvmore" id="nvmore" aria-label="More options">${MORE}</button></div>`;
  const tb=tabs.length>=2?`<div class="nvtabs">${tabs.map(x=>`<button class="nvtab ${(x.id||null)===N.cid?'on':''}" data-nvtab="${esc(x.id)}">${esc(x.t)}</button>`).join('')}</div>`:'';
  el.innerHTML=row+tb;nvLayout();
}
function nvRender(){
  const box=document.getElementById('nvlog');if(!box)return;const N=S.nv;
  const nm=(S.prof&&S.prof.name)?', '+esc(S.prof.name):'';
  let h='';
  if(!N.loaded)h+='<div class="mut" style="margin-top:14px">Loading…</div>';
  else if(!N.log.length)h+=`<div class="nvm bot"><div class="nvp">Hi${nm}. I read your results and plan what to do next${S.plan?`, using your ${S.plan.minutes}-minute daily plan`:''}. Pick a question or ask your own.</div></div><div class="chips">${NCH.map(c=>`<button class="chip" data-nvchip="${esc(c)}">${esc(c)}</button>`).join('')}</div>`;
  h+=N.log.map(m=>{
    if(m.role==='me')return `<div class="nvm me">${esc(m.text)}</div>`;
    if(m.pending)return `<div class="nvm bot"><span class="mut">Checking your results</span><span class="nvdots"><i></i><i></i><i></i></span></div>`;
    const acts=(m.actions||[]).map(a=>`<button class="btn ghost" data-nvact="${esc(a.type)}" data-nvc="${esc(a.concept||'')}">${esc(a.label)}</button>`).join('');
    const tr=(m.trace||[]).length?`<div class="nvtr"><span>Tools</span>${m.trace.map(t=>`<span class="nvtp ${t.ok?'':'bad'}">${esc(t.tool)}</span>`).join('<i>›</i>')}</div>`:'';
    return `<div class="nvm bot">${nvFmt(m.text)}${acts?`<div class="nvacts">${acts}</div>`:''}${tr}</div>`;
  }).join('');
  const lm=[...N.log].reverse().find(m=>m.role==='bot'&&m.model);
  if(lm)h+=`<div class="mut" style="font-size:.72rem;text-align:center;margin-top:8px">${esc(/nemotron/i.test(lm.model)?'NVIDIA Nemotron':lm.model.split('/').pop())} · Nebius Token Factory</div>`;
  box.innerHTML=h+'<div style="height:calc(var(--nvh,72px) + 24px)"></div>';
  rich(box);
}
function nvShell(){
  show(`<div class="nvtop" id="nvtop"></div><div class="nvsp"></div><div id="nvlog"></div><button id="nvdown" class="off" aria-label="Scroll to latest">${ICO.down}</button><div class="bar nvbar"><textarea id="nvin" class="nvin" rows="1" placeholder="Ask what to do next…" enterkeyhint="enter" autocomplete="off" autocapitalize="sentences"></textarea><button class="btn nvsend" id="nvsend" aria-label="Send" disabled>${ICO.up}</button></div>`);
  nvHead();nvRender();nvLayout();nvUpd();
}
async function navScreen(){
  S.nv=S.nv||{chats:[],cid:null,log:[],busy:false,loaded:false};
  nvShell();
  const N=S.nv;
  try{
    N.chats=await api('/nav/chats/'+SID);
    if(N.cid&&!N.chats.some(c=>c.id===N.cid)){N.cid=null;N.log=[]}
    if(!N.loaded&&!N.cid&&N.chats.length){
      const last=N.chats.slice().sort((a,b)=>a.updated<b.updated?1:-1)[0];
      const r=await api('/nav/chat/'+last.id+'?student_id='+encodeURIComponent(SID));
      N.cid=last.id;N.log=r.messages||[];
    }
  }catch(e){}
  N.loaded=true;
  if(!document.getElementById('nvlog'))return;
  nvHead();nvRender();
  if(N.log.length)setTimeout(()=>{nvToBottom(false);nvSyncBtn()},40);
}
async function nvOpen(id){
  const N=S.nv;if(N.busy||id===N.cid)return;
  let r;try{r=await api('/nav/chat/'+id+'?student_id='+encodeURIComponent(SID))}catch(e){return}
  N.cid=id;N.log=r.messages||[];nvHead();nvRender();
  setTimeout(()=>{nvToBottom(false);nvSyncBtn()},40);
}
async function nvSend(text){
  const N=S.nv;text=(text||'').trim();if(!text||N.busy)return;
  if(!N.cid){
    let r;try{r=await api('/nav/new',{student_id:SID})}catch(e){r={}}
    if(r.error==='limit'){const i=document.getElementById('nvin');if(i){i.value=text;nvUpd()}return nvLimit()}
    if(!r.chat_id){alert('Could not start a chat. Please try again.');return}
    N.cid=r.chat_id;
  }
  const cid=N.cid;
  N.busy=true;N.log.push({role:'me',text},{role:'bot',pending:true});
  nvRender();nvUpd();nvToBottom();
  let r;
  try{r=await api('/navigator/send',{student_id:SID,chat_id:cid,message:text})}
  catch(e){r={reply:'Sorry, I could not reach the navigator.',trace:[],actions:[]}}
  N.busy=false;
  try{N.chats=await api('/nav/chats/'+SID)}catch(e){}
  if(r.error==='no_chat'&&N.cid===cid)N.cid=null;
  N.log=N.log.filter(m=>!m.pending);
  N.log.push({role:'bot',text:r.reply,trace:r.trace||[],actions:r.actions||[],model:r.model});
  if(!document.getElementById('nvlog'))return;
  nvHead();nvRender();nvUpd();
  const bots=document.querySelectorAll('#nvlog .nvm.bot'),last=bots[bots.length-1];
  if(last)last.scrollIntoView({behavior:'smooth',block:'start'});
  setTimeout(nvSyncBtn,500);
}
function nvGo(){
  const i=document.getElementById('nvin');if(!i)return;
  const v=i.value;i.value='';i.style.height='auto';nvLayout();nvSend(v);
}
app.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  try{
    if(d.nvback)return goalScreen();
    if(d.nvtab!==undefined)return d.nvtab?nvOpen(d.nvtab):null;
    if(d.nvchip)return nvSend(d.nvchip);
    if(b.id==='nvsend')return nvGo();
    if(b.id==='nvdown')return nvToBottom();
    if(d.nvact==='practice')return startPractice(d.nvc);
    if(d.nvact==='lesson')return lessonSheet(d.nvc);
    if(d.nvact==='scan'){S.start={mode:'gaps',topics:[]};return startTest()}
  }catch(err){alert('Something went wrong ('+err.message+')')}
});
app.addEventListener('input',e=>{
  if(e.target.id!=='nvin')return;const t=e.target;
  t.style.height='auto';t.style.height=Math.min(t.scrollHeight,120)+'px';nvUpd();nvLayout();
});
app.addEventListener('keydown',e=>{
  if(e.target.id==='nvin'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&!COARSE){e.preventDefault();nvGo()}
});
window.addEventListener('scroll',nvSyncBtn,{passive:true});
window.addEventListener('resize',()=>{nvLayout();nvSyncBtn()});
const nvfab=document.createElement('button');
nvfab.id='nvfab';nvfab.setAttribute('aria-label','Open Navigator');
nvfab.innerHTML='<span class="nvfi">'+NAVI+'</span><span>Navigator</span>';
document.body.appendChild(nvfab);
const nvFabSync=()=>{const hide=!app.children.length||app.querySelector('.prog,#submit,#nvlog,#pgo')||ov.children.length;nvfab.classList.toggle('off',!!hide)};
new MutationObserver(nvFabSync).observe(app,{childList:true});
new MutationObserver(nvFabSync).observe(ov,{childList:true});
nvfab.onclick=()=>navScreen();
nvFabSync();
/* END app4.js */
