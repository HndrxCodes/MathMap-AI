(()=>{const s=document.createElement('style');s.textContent=`
#nvmenu{position:fixed;top:calc(var(--nvtop,64px) + 2px);right:16px;z-index:40;min-width:230px;padding:6px;border-radius:16px;border:1.5px solid transparent;background:linear-gradient(#151b33,#151b33) padding-box,linear-gradient(135deg,#e879f9,#a855f7 55%,#22d3ee) border-box;box-shadow:0 14px 40px rgba(0,0,0,.55);animation:prise .18s ease}
#nvmenu button{display:flex;align-items:center;gap:12px;width:100%;padding:11px 12px;border:0;border-radius:11px;background:none;color:#e8ebf7;font:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
#nvmenu button:active{background:rgba(168,85,247,.16)}
#nvmenu button:disabled{opacity:.4}
#nvmenu .nvmi{flex:none;width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:rgba(232,121,249,.13);color:#e879f9}
#nvmenu b{display:block;font-size:14px}
#nvmenu i{display:block;font-style:normal;font-size:11.5px;color:#94a3b8;margin-top:1px}
.nvli{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #232b4a}
.nvlt{flex:1;min-width:0}
.nvlt b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nvdel{flex:none;padding:8px 14px;font-size:13px}
.nvdel.nvarm{color:#f87171;border-color:#f87171}
`;document.head.appendChild(s)})();
const NI={plus:SV('<path d="M12 5v14M5 12h14"/>',2.2),trash:SV('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',2)};
function nvMenuClose(){const m=document.getElementById('nvmenu');if(m)m.remove()}
function nvMenuOpen(){
  nvMenuClose();const N=S.nv,off=(!N.log.length||N.busy)?'disabled':'';
  const m=document.createElement('div');m.id='nvmenu';
  m.innerHTML=`<button data-nvm="new" ${off}><span class="nvmi">${NI.plus}</span><span><b>New chat</b><i>${N.chats.length} of 3 chats used</i></span></button><button data-nvm="clear" ${off}><span class="nvmi">${NI.trash}</span><span><b>Clear this chat</b><i>Delete its messages</i></span></button>`;
  document.body.appendChild(m);
}
function nvNewChat(){
  const N=S.nv;if(N.busy||!N.log.length)return;
  if(N.chats.length>=3)return nvLimit();
  N.cid=null;N.log=[];nvHead();nvRender();
}
function nvAskClear(){
  const N=S.nv;if(N.busy||!N.log.length)return;
  ov.innerHTML=`<div class="pov" id="pbk"><div class="pcard"><b style="font-size:1.1rem">Clear this chat?</b><p class="mut" style="margin:10px 0 18px">All messages in this chat will be deleted. This can't be undone.</p><div class="row" style="gap:10px"><button class="btn ghost" style="flex:1" id="tclose">Cancel</button><button class="btn" style="flex:1" data-nvdo="clear">Yes, clear it</button></div></div></div>`;
}
function nvLimit(){
  const N=S.nv;
  ov.innerHTML=`<div class="pov" id="pbk"><div class="pcard"><div class="row"><b style="font-size:1.1rem">Chat limit reached</b><button class="x" id="tclose">✕</button></div><p class="mut" style="margin:10px 0 6px">You can keep up to 3 chats. Delete one to start a new chat.</p>${N.chats.map(c=>{const w=stamp(c.updated);return `<div class="nvli"><div class="nvlt"><b>${esc(c.title)}</b><div class="mut" style="font-size:.76rem">${esc(w.g)}, ${esc(w.t)}</div></div><button class="btn ghost nvdel" data-nvdel="${esc(c.id)}">Delete</button></div>`}).join('')}</div></div>`;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');
  if(b&&b.id==='nvmore'){return document.getElementById('nvmenu')?nvMenuClose():nvMenuOpen()}
  if(b&&b.dataset.nvm){const a=b.dataset.nvm;nvMenuClose();return a==='new'?nvNewChat():nvAskClear()}
  if(!e.target.closest('#nvmenu'))nvMenuClose();
});
ov.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;const d=b.dataset,N=S.nv;
  try{
    if(d.nvdel){
      if(d.arm!=='1'){b.dataset.arm='1';b.textContent='Tap to confirm';b.classList.add('nvarm');return}
      b.disabled=true;
      await api('/nav/delete',{student_id:SID,chat_id:d.nvdel});
      N.cid=null;N.log=[];
      try{N.chats=await api('/nav/chats/'+SID)}catch(x){}
      closeOv();nvHead();nvRender();return;
    }
    if(d.nvdo==='clear'){
      closeOv();
      if(N.cid)await api('/nav/clear',{student_id:SID,chat_id:N.cid});
      N.log=[];
      try{N.chats=await api('/nav/chats/'+SID)}catch(x){}
      nvHead();nvRender();
    }
  }catch(err){alert('Something went wrong ('+err.message+')');b.disabled=false}
});
ov.addEventListener('click',e=>{
  const b=e.target.closest('button');
  if(b&&b.id==='pfreset'&&S.pf&&S.pf.arm){
    try{fetch('/api/nav/purge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({student_id:SID}),keepalive:true})}catch(x){}
  }
},true);
/* END app5.js */
