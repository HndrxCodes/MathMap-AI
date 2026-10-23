const KIND={gaps:'Find my root cause',topic:'Topic test',exam:'Exam practice',practice:'Practice'};
const stamp=iso=>{const d=new Date(iso),n=new Date(),day=x=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime(),df=Math.round((day(n)-day(d))/864e5);
  return{g:df===0?'Today':df===1?'Yesterday':d.toLocaleDateString('en',{month:'short',day:'numeric'}),t:d.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}};
const hTitle=h=>(KIND[h.kind]||'Test')+((h.kind==='topic'||h.kind==='practice')&&h.topics&&h.topics[0]?' · '+cdisp(h.topics[0]):'');
const lvl=x=>x?LBL[x.level]:'Not tested';
const delta=(h,i)=>{if(h.kind==='practice'||!h.done||!h.total)return'';
  const p=(S.hist||[]).slice(i+1).find(x=>x.done&&x.kind===h.kind&&(x.topics||[]).join()===(h.topics||[]).join()&&x.total);
  if(!p)return'';const d=Math.round(100*(h.correct/h.total-p.correct/p.total));
  return ` · ${d>0?'▲':d<0?'▼':'•'} ${Math.abs(d)} pts vs previous`};
function histCard(h,i){
  const s=stamp(h.when);let body;
  if(!h.done)body='<div class="mut" style="margin-top:6px">In progress · tap to resume</div>';
  else if(h.kind==='practice')body=`<div class="mut" style="margin-top:6px">${lvl(h.before)} → <b style="color:${COL[h.after.level]}">${lvl(h.after)}</b> · ${h.correct}/${h.total} correct</div>`;
  else{const w=h.total-h.correct-h.unsure,p=x=>(x/h.total*100).toFixed(1)+'%';
    body=`<div style="display:flex;height:6px;border-radius:3px;overflow:hidden;background:#2a3050;margin:10px 0 6px"><i style="width:${p(h.correct)};background:#60a5fa"></i><i style="width:${p(w)};background:#f87171"></i><i style="width:${p(h.unsure)};background:#6b7394"></i></div><div class="mut">${h.correct}/${h.total} correct${delta(h,i)}</div>`}
  return `<button class="card pick" data-h="${i}"><div class="row"><b>${esc(hTitle(h))}</b>${i===0?'<span class="tag go">Latest</span>':''}</div><div class="mut" style="font-size:.78rem">${s.t}</div>${body}</button>`;
}
async function historyScreen(){
  const head='<div class="row"><button class="x" id="hback">←</button><b>History</b><span style="width:34px"></span></div>';
  show(head+'<p class="mut" style="margin-top:18px">Loading…</p>');
  try{S.hist=await api('/history/'+SID)}catch(e){S.hist=[]}
  let out='',last='';
  S.hist.forEach((h,i)=>{const g=stamp(h.when).g;if(g!==last){out+=`<h2>${g}</h2>`;last=g}out+=histCard(h,i)});
  show('<style>@keyframes sl{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}</style><div style="animation:sl .22s ease">'+head+(out||'<p class="mut" style="margin-top:18px">No tests yet. Your results will appear here.</p>')+'</div>');
}
async function startPractice(k){
  const s=await api('/practice/start',{student_id:SID,concept:k});
  if(s.error){alert(s.error);return}
  S.practice=k;S.fromHist=false;S.sess=s.session_id;S.qs=s.questions;S.i=0;S.review=false;
  S.ans=JSON.parse(localStorage['mm_ans_'+S.sess]||'{}');
  const f=s.focus||[];
  show(`<div class="row"><button class="x" id="quit">✕</button><span></span></div><h1>Practice: ${esc(cdisp(k))}</h1><p class="mut">${S.qs.length} fresh questions to sharpen this topic.</p>${f.length?`<div class="card"><b>Focused on your mistakes</b><div class="mut">${f.map(esc).join(' · ')}</div></div>`:'<div class="card mut">No specific mistakes recorded yet, so this is a general check.</div>'}<div class="bar"><button class="btn" id="pgo">Start</button></div>`);
}
function practiceScreen(){
  const r=S.pres,wrong=r.total-r.correct-r.unsure,cl=x=>x?COL[x.level]:COL.untested;
  const mis=r.misconceptions.length?r.misconceptions.map(m=>`<div class="card"><div class="row"><b>${esc(m.label)}</b><span class="mut">×${m.count}</span></div><div class="mut">${esc(m.description)}</div></div>`).join(''):'<div class="card mut">No specific misconception pattern this time.</div>';
  const nxt=r.next_concept&&r.next_concept!==r.concept?`<div class="card"><b>Next up</b><div class="mut">Your weakest area now is <span class="hl">${esc(r.next_display)}</span>.</div><button class="btn ghost" style="margin-top:8px" data-pr="${esc(r.next_concept)}">Practice ${esc(r.next_display)}</button></div>`:'';
  const rev=r.review.map((q,i)=>`<details class="card">${qsum(i,q)}<div style="margin-top:8px">${esc(q.stem)}</div><div class="math" id="pm${i}"></div>
    <div class="mut">Your answer</div><div class="t" id="pa${i}">${q.chosen==null?'<i>I don\'t know</i>':''}</div>
    <div class="mut" style="margin-top:6px">Correct answer</div><div id="pc${i}"></div>
    ${q.reason&&!q.is_correct?`<p>${esc(q.reason)}</p>`:''}<p class="mut">${esc(q.solution)}</p><button class="btn ghost" data-pask="${i}">Ask the tutor about this</button></details>`).join('');
  show(`<h1>Practice: ${esc(r.display)}</h1>
  <div class="card hero">${donut(r.correct,wrong,r.unsure,r.total)}<div class="leg"><div><i style="background:#60a5fa"></i>${r.correct} correct</div><div><i style="background:#f87171"></i>${wrong} not quite</div><div><i style="background:#6b7394"></i>${r.unsure} unsure</div></div></div>
  <div class="card"><div class="mut">Mastery</div><div style="margin-top:6px"><span style="color:${cl(r.before)}">${lvl(r.before)}</span> → <b style="color:${cl(r.after)}">${lvl(r.after)}</b></div><div class="mut" style="margin-top:6px">Based on all your answers in this topic so far (${r.cum.correct} of ${r.cum.total} correct).</div></div>
  ${nxt}<h2>Where mistakes come from</h2>${mis}<h2>Review your answers</h2>${rev}
  <div class="bar"><button class="btn ghost" id="menu">${S.fromHist?'Back to History':'Back to Menu'}</button><button class="btn" data-pr="${esc(r.concept)}">Practice again</button></div>`);
  r.review.forEach((q,i)=>{texLines($('#pm'+i),q.math);if(q.chosen!=null)tex($('#pa'+i),q.options[q.chosen]);tex($('#pc'+i),q.options[q.correct_index])});
  rich(app);
}
(()=>{const s=document.createElement('style');s.textContent=`details.card>summary{list-style:none;display:flex;align-items:center;gap:12px;cursor:pointer;-webkit-tap-highlight-color:transparent}
details.card>summary::-webkit-details-marker{display:none}
details.card>summary::marker{content:''}
.qb{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none}
.qb svg{width:16px;height:16px}
.qb.ok{background:rgba(52,211,153,.16);color:#34d399}
.qb.no{background:rgba(248,113,113,.16);color:#f87171}
.qb.un{background:rgba(107,115,148,.22);color:#aab2d5}
.qt{font-weight:700}
.qc{margin-left:auto;width:18px;height:18px;color:#6b7394;transition:transform .2s;flex:none}
details[open]>summary .qc{transform:rotate(90deg)}
.gt{display:flex;align-items:center;gap:10px}
.gi{display:inline-flex;width:32px;height:32px;border-radius:10px;align-items:center;justify-content:center;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.22);color:#93c5fd;flex:none}
.hfl{background:#1a1230;border-color:rgba(192,132,252,.4)}
.fl{overflow:visible;transform-origin:50% 90%;animation:flk 1.3s ease-in-out infinite alternate,flg 2.6s ease-in-out infinite}
.fl .in{transform-box:fill-box;transform-origin:50% 90%;animation:fli .9s ease-in-out infinite alternate}
@keyframes flk{0%{transform:scale(1,1) skewX(0)}30%{transform:scale(.96,1.07) skewX(-3deg)}60%{transform:scale(1.04,.95) skewX(2deg)}100%{transform:scale(.98,1.06) skewX(-1deg)}}
@keyframes fli{from{transform:scale(1,1);opacity:.95}to{transform:scale(.84,1.2);opacity:.7}}
@keyframes flg{0%,100%{filter:drop-shadow(0 0 3px rgba(232,121,249,.8))}50%{filter:drop-shadow(0 0 7px rgba(34,211,238,.7))}}
@media (prefers-reduced-motion:reduce){.fl,.fl .in{animation:none}}
.pov{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:20px 20px 12vh;box-sizing:border-box;background:rgba(5,8,20,.6);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);animation:pfade .18s ease}
.pcard{width:100%;max-width:420px;max-height:100%;overflow:auto;background:#151b33;border:1px solid #2a3050;border-radius:22px;padding:20px;box-shadow:0 18px 50px rgba(0,0,0,.55);animation:prise .24s cubic-bezier(.2,1.1,.4,1)}
@keyframes pfade{from{opacity:0}to{opacity:1}}
@keyframes prise{from{transform:translateY(14px) scale(.96);opacity:0}to{transform:none;opacity:1}}
.cust{display:flex;align-items:center;gap:10px;margin-top:10px}
.cust input{width:92px;height:42px;border-radius:12px;background:#0d1226;border:1px solid #2b4a85;color:#e8ebf7;font:inherit;font-size:16px;text-align:center;outline:none}
.cust input:focus{border-color:#60a5fa;box-shadow:0 0 0 3px rgba(96,165,250,.2)}
.cust .bad{color:#f87171}`;document.head.appendChild(s)})();
const QI={ok:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',no:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',un:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M7 12h10"/></svg>'};
const qsum=(i,q)=>{const k=q.chosen==null?'un':q.is_correct?'ok':'no';return `<summary><span class="qb ${k}">${QI[k]}</span><span class="qt">Q${i+1}</span><span class="mut">${{ok:'Correct',no:'Not quite',un:"Didn't know"}[k]}</span><svg class="qc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></summary>`};
function renderPlan(){
  const T=S.tmp,PM=[10,20,30,45],PD=[7,14,30],cm=!!T.cm||!PM.includes(T.m),cd=!!T.cd||!PD.includes(T.d);
  const pill=(on,at,tx)=>`<button class="pill ${on?'on':''}" ${at}>${tx}</button>`;
  ov.innerHTML=`<div class="pov" id="pbk"><div class="pcard"><div class="row"><b style="font-size:1.1rem">Set your study plan</b><button class="x" id="tclose">✕</button></div>
  <div class="mut" style="margin-top:14px">Minutes per day</div><div class="pills">${PM.map(m=>pill(!cm&&T.m===m,`data-pm="${m}"`,m+' min')).join('')}${pill(cm,'data-pcm="1"','Custom')}</div>
  ${cm?`<div class="cust"><input id="cmin" type="number" inputmode="numeric" min="5" max="180" value="${T.m}"><span class="mut" id="cmh">min / day (5–180)</span></div>`:''}
  <div class="mut" style="margin-top:14px">For how many days?</div><div class="pills">${PD.map(d=>pill(!cd&&T.d===d,`data-pd="${d}"`,d+' days')).join('')}${pill(cd,'data-pcd="1"','Custom')}</div>
  ${cd?`<div class="cust"><input id="cday" type="number" inputmode="numeric" min="1" max="90" value="${T.d}"><span class="mut" id="cdh">days (1–90)</span></div>`:''}
  <button class="btn" style="width:100%;margin-top:18px" id="pok">${S.plan?'Save plan':'Start day 1'}</button></div></div>`;
  const ok=document.getElementById('pok');if(ok)ok.disabled=!!(T.mbad||T.dbad);
}
ov.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||!document.getElementById('pbk'))return;const d=b.dataset;
  if(d.pm||d.pd){if(d.pm){S.tmp.cm=false;S.tmp.mbad=false}else{S.tmp.cd=false;S.tmp.dbad=false}return renderPlan()}
  if(d.pcm||d.pcd){if(d.pcm)S.tmp.cm=true;else S.tmp.cd=true;renderPlan();const i=document.getElementById(d.pcm?'cmin':'cday');if(i){i.focus();i.select()}}
});
ov.addEventListener('input',e=>{
  const T=S.tmp,el=e.target;if(!T||(el.id!=='cmin'&&el.id!=='cday'))return;
  const m=el.id==='cmin',v=parseInt(el.value,10),bad=!(v>=(m?5:1)&&v<=(m?180:90));
  if(m){T.cm=true;T.mbad=bad;if(!bad)T.m=v}else{T.cd=true;T.dbad=bad;if(!bad)T.d=v}
  const h=document.getElementById(m?'cmh':'cdh');if(h)h.classList.toggle('bad',bad);
  const ok=document.getElementById('pok');if(ok)ok.disabled=!!(T.mbad||T.dbad);
});
/* END app3.js */
