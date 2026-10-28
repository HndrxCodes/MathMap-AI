const SID=(()=>{const q=new URLSearchParams(location.search).get('student');if(q)return q;
 try{let v=localStorage.mm_student;if(!v){v='s_'+(window.crypto&&crypto.randomUUID?crypto.randomUUID().replace(/-/g,'').slice(0,16):Math.random().toString(36).slice(2,10)+Date.now().toString(36));localStorage.mm_student=v}return v}catch(e){return 'guest_'+Math.random().toString(36).slice(2,10)}})();
const COL={strong:'#34d399',developing:'#fbbf24',needs_work:'#f87171',untested:'#4a5275'};
const LBL={strong:'Strong',developing:'Developing',needs_work:'Needs work'};
const app=document.getElementById('app');
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const pend=[];
const tex=(el,s,d)=>{if(!el)return;if(window.katex){try{katex.render(s,el,{displayMode:!!d,throwOnError:false})}catch(e){el.textContent=s}}else{el.textContent=s;pend.push([el,s,d])}};
const rich=el=>window.renderMathInElement&&renderMathInElement(el,{delimiters:[{left:'$$',right:'$$',display:true},{left:'\\[',right:'\\]',display:true},{left:'\\(',right:'\\)',display:false},{left:'$',right:'$',display:false}],throwOnError:false});
window.flush=()=>{while(pend.length){const p=pend.shift();tex(p[0],p[1],p[2])}rich(app)};
const show=h=>{app.innerHTML=h;scrollTo(0,0)};
async function api(p,b){const r=await fetch('/api'+p,b?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}:{});if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
let S={goal:null,exam:null,topics:[],plan:null,ready:[],concepts:{},exams:{},review:false};

const ready=()=>!!S.goal&&(S.goal==='find_gaps'||(S.goal==='mastery'&&S.topics.length===1)||(S.goal==='test_prep'&&S.exam&&S.topics.length>0));
const topicList=()=>{
  let list=Object.entries(S.concepts);
  const only=S.goal==='mastery'&&S.ready.length;
  if(only)list=list.filter(([k])=>S.ready.includes(k));
  if(S.goal==='test_prep'&&S.exam&&S.exam!=='school'&&S.exams[S.exam])list=list.filter(([k])=>S.exams[S.exam].topics.includes(k));
  return list.map(([k,v])=>`<button class="card pick ${S.topics.includes(k)?'on':''}" data-t="${esc(k)}"><b>${esc(v.display)}</b><div class="mut">${esc(v.plain.replace(/\^2/g,'²'))}</div></button>`).join('')+(only?'<p class="mut">More topics are coming soon.</p>':'');
};

(()=>{const l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600&display=swap';document.head.appendChild(l);const s=document.createElement('style');s.textContent=`.hdr{display:flex;align-items:center;justify-content:space-between;margin:0 0 20px;min-height:44px}
.brand{display:flex;align-items:center;gap:10px;user-select:none}
.bico{width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.35)}
.bico svg{width:27px;height:27px;overflow:visible}
.bname{font:800 19px/1.05 'Plus Jakarta Sans',system-ui,sans-serif;color:#fff;letter-spacing:-.3px}
.bname span{background:linear-gradient(135deg,#c084fc,#22d3ee);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.bsub{font:600 8.5px/1 'JetBrains Mono',ui-monospace,monospace;letter-spacing:2px;color:#94a3b8;margin-top:5px}
.bsub i{color:#22d3ee;font-style:normal;padding:0 3px}
.hact{display:flex;align-items:center;gap:8px}
.hbtn{display:flex;align-items:center;justify-content:center;gap:6px;height:40px;min-width:40px;padding:0 12px;border-radius:20px;background:#151b33;border:1px solid #2a3050;color:#e8ebf7;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .12s}
.hbtn:active{transform:scale(.94)}
.hbtn b{font-size:15px;line-height:1}
.hfl{background:#14203f;border-color:#2b4a85}
.pop{animation:hpop .4s cubic-bezier(.2,1.3,.4,1)}
@keyframes hpop{0%{transform:scale(.5);opacity:0}100%{transform:none;opacity:1}}
.bico .node{transform-origin:center;transform-box:fill-box;animation:nodeGlow 3s infinite ease-in-out}
.bico .n2{animation-delay:1.5s}
@keyframes nodeGlow{0%,100%{transform:scale(1);filter:brightness(1)}50%{transform:scale(1.15);filter:brightness(1.4)}}
@media (prefers-reduced-motion:reduce){.bico .node,.pop{animation:none}}
.card.pick.on{box-shadow:0 0 0 1px rgba(96,165,250,.45),0 0 18px rgba(96,165,250,.28)}`;document.head.appendChild(s)})();
const avl=()=>{const n=((S.prof&&S.prof.name)||'').trim();return n?esc(n[0].toUpperCase()):'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>'};
const hdr=anim=>`<div class="hdr"><div class="brand"><div class="bico"><svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lgc" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#a855f7"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient><filter id="lgg" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.5" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter></defs><path d="M 23 8 C 18 8, 17 12, 17 17 L 17 23 C 17 28, 16 32, 11 32" fill="none" stroke="#334155" stroke-width="2" stroke-dasharray="2 2"/><path d="M 23 8 C 18 8, 17 12, 17 17 L 17 23 C 17 28, 16 32, 11 32" fill="none" stroke="url(#lgc)" stroke-width="3.5" stroke-linecap="round" filter="url(#lgg)"/><circle class="node" cx="23" cy="8" r="3" fill="#06b6d4"/><circle class="node n2" cx="11" cy="32" r="3" fill="#a855f7"/></svg></div><div><div class="bname">Math<span>Map</span></div><div class="bsub">DIAGNOSE<i>•</i>AI</div></div></div><div class="hact">${S.plan?`<button class="hbtn hfl ${anim?'pop':''}" id="flame" aria-label="Study plan"><svg class="fl" width="18" height="22" viewBox="0 0 24 24"><defs><linearGradient id="hfg2" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#e879f9"/><stop offset=".5" stop-color="#a855f7"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><path fill="url(#hfg2)" d="M12 2c.8 3.2 5.5 5.2 5.5 10.2A5.5 5.5 0 0 1 6.5 14c0-2.2 1.2-3.8 2.4-5 .1 1.6.9 2.6 1.9 2.8C10.4 8 11 5 12 2z"/><path class="in" fill="#f5d0fe" fill-opacity=".9" d="M12 11.6c.4 1.4 2.4 2.2 2.4 4.1a2.4 2.4 0 0 1-4.8 0c0-.9.5-1.6 1.1-2.2 0 .7.4 1.1.8 1.2.1-.9.2-1.9.5-3.1z"/></svg><b>${S.plan.day}</b></button>`:''}<button class="hbtn" id="histbtn" aria-label="History"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></svg></button><button class="hbtn av" id="pbtn" aria-label="Profile">${avl()}</button></div></div>`;
const AGENT_STEPS={find_gaps:['Quick scan','Diagnostic map','Practice'],mastery:['Topic test','Root-cause map','Practice'],test_prep:['Exam practice','Root-cause map','Practice']};
const agentMsg=()=>{
  if(S.goal==='find_gaps')return 'Will check 4 foundations in 10 questions, then map the root causes';
  if(S.goal==='mastery')return S.topics.length?`Will run a focused test on ${(S.concepts[S.topics[0]]||{display:S.topics[0]}).display}, then trace mistakes back`:'Pick a topic to continue';
  if(S.goal==='test_prep')return 'Will practice the skills your test covers, then trace mistakes back';
  return 'Ready. Choose what you need and I will build your map';
};
const agentBlock=()=>{const st=AGENT_STEPS[S.goal]||AGENT_STEPS.find_gaps;
  return `<div class="agent"><span class="adot"></span><span><b>MathMap</b> · ${agentMsg()}</span></div><div class="steps">${st.map((x,i)=>`<div class="stp"><span class="sn">${i+1}</span>${x}</div>`).join('<i class="sar">›</i>')}</div>`};
function goalScreen(anim){
  const G=[['test_prep','<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity=".12"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>','Prepare for a test','Practice for SAT, CSCA or your own exam'],['mastery','<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z" fill="currentColor" fill-opacity=".12"/><path d="M5 17a3 3 0 0 1 3-3h10"/></svg>','Master a topic','Take a focused test on one topic'],['find_gaps','<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="12" r="2.2" fill="currentColor" fill-opacity=".25"/><circle cx="7" cy="18" r="2.2"/><path d="M8 7l8 4M16 13l-7 4"/></svg>','Find my root cause','Not just right or wrong: we trace each mistake back to the skill it comes from. No need to know topic names.']];
  const fl=S.plan?`<div class="slot ${anim?'':'on'}" id="slot"><div class="flrow"><button class="flame" id="flame"><svg width="18" height="22" viewBox="0 0 24 24"><defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93c5fd"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs><path fill="url(#fg)" d="M12 2c.8 3.2 5.5 5.2 5.5 10.2A5.5 5.5 0 0 1 6.5 14c0-2.2 1.2-3.8 2.4-5 .1 1.6.9 2.6 1.9 2.8C10.4 8 11 5 12 2z"/></svg><b>${S.plan.day}</b></button></div></div>`:'';
  let h=(S.prof&&S.prof.name?'<p class="mut" style="margin:0 0 4px">Hi, '+esc(S.prof.name)+'</p>':'')+'<h1>What brings you here?</h1><div style="height:6px"></div>'+
    G.map(g=>`<button class="card pick ${S.goal===g[0]?'on':''}" data-g="${g[0]}"><span class="gi">${g[1]}</span><span class="gcc"><span class="gtt">${g[2]}</span><span class="gd">${g[3]}</span></span></button>`).join('');
  if(S.goal==='test_prep'){
    h+='<h2>Which test?</h2>'+Object.entries(S.exams).map(([k,e])=>`<button class="card pick ${S.exam===k?'on':''}" data-e="${k}"><b>${esc(e.name)}</b><div class="mut">${esc(e.facts)}</div>${e.covers.length?`<div class="mut" style="margin-top:6px">Covered here: ${esc(e.covers.join(', '))}</div><div class="mut">Not covered yet: ${esc(e.gaps.join(', '))}</div>`:''}</button>`).join('');
    if(S.exam==='school')h+='<h2>Which topics are on it?</h2><p class="mut">Select all that apply.</p>'+topicList();else if(S.exam)h+='<h2>Which topics do you want to practice?</h2><p class="mut">Everything this test covers here is selected. Tap to remove any you do not need.</p>'+topicList();
  }
  if(S.goal==='mastery')h+='<h2>Which topic?</h2>'+topicList();
  show(hdr(anim)+h+agentBlock()+`<p class="mut" style="text-align:center;font-size:.7rem;margin-top:24px">build 14</p><div class="bar"><button class="btn" id="go" ${ready()?'':'disabled'}>${S.goal?(S.goal==='find_gaps'?'Diagnose my root cause':S.goal==='mastery'?'Start topic test':'Start exam practice'):'Choose what you need'}</button></div>`);
  if(anim)requestAnimationFrame(()=>requestAnimationFrame(()=>{const e=document.getElementById('slot');if(e)e.classList.add('on')}));
}

async function startTest(){
  const s=await api('/baseline/start',{student_id:SID,mode:S.start.mode,topics:S.start.topics,exam:S.start.mode==='exam'?(S.exam||''):''});
  S.practice=null;S.fromHist=false;S.sess=s.session_id;S.qs=s.questions;S.i=0;S.review=false;
  S.ans=JSON.parse(localStorage['mm_ans_'+S.sess]||'{}');
  testScreen();
}
function testScreen(){
  const q=S.qs[S.i],n=S.qs.length,a=S.ans[q.id];
  show(`<div class="row"><button class="x" id="quit">✕</button><div class="mut">Question ${S.i+1} of ${n}</div><span style="width:34px"></span></div><div class="prog"><i style="width:${(S.i+1)/n*100}%"></i></div>
  <div class="card"><div>${esc(q.stem)}</div><div class="math" id="m"></div></div>`+
  q.options.map((o,k)=>`<button class="card pick opt ${a===k?'on':''}" data-o="${k}"><b>${'ABCDE'[k]}</b><span class="t" id="o${k}"></span></button>`).join('')+
  `<button class="card pick opt idk ${a===null?'on':''}" data-o="-1"><b>?</b><span>I don't know</span></button>
  <div class="bar"><button class="btn ghost" id="prev" ${S.i?'':'disabled'}>Back</button><button class="btn" id="next">${S.i===n-1?'Review':'Next'}</button></div>`);
  texLines($('#m'),q.math);q.options.forEach((o,k)=>tex($('#o'+k),o));
}
function reviewScreen(){
  const un=S.qs.filter(q=>S.ans[q.id]===undefined).length;
  show(`<div class="row"><button class="x" id="quit">✕</button><span></span></div><h1>Ready to submit?</h1><p class="mut">${un?`${un} unanswered. They count as “I don't know”.`:'All questions answered.'}</p>
  <div class="dots">`+S.qs.map((q,i)=>`<button class="btn ghost" data-j="${i}" style="${S.ans[q.id]===undefined?'':'border-color:var(--ac)'}">${i+1}</button>`).join('')+
  `</div><div class="bar"><button class="btn ghost" id="prev">Back</button><button class="btn" id="submit">Submit</button></div>`);
}

function donut(c,w,u,t){
  const R=42,C=2*Math.PI*R;let off=0;
  const seg=(n,col)=>{const l=n/t*C,s=`<circle r="${R}" cx="60" cy="60" fill="none" stroke="${col}" stroke-width="14" stroke-dasharray="${l} ${C-l}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`;off+=l;return s};
  return `<svg viewBox="0 0 120 120" width="120" height="120"><circle r="${R}" cx="60" cy="60" fill="none" stroke="#2a3050" stroke-width="14"/>${seg(c,'#60a5fa')}${seg(w,'#f87171')}${seg(u,'#6b7394')}<text x="60" y="67" text-anchor="middle" fill="#e8ebf7" font-size="22" font-weight="700">${c}/${t}</text></svg>`;
}

function resultScreen(){
  const r=S.res,g=r.goal||{},wrong=r.total-r.correct-r.unsure;
  const dn=k=>(S.concepts[k]||{display:k}).display;
  const title=r.mode==='topic'?`Path to ${esc(dn(r.topics[0]))}`:r.mode==='exam'?'Path to your test':'Your learning path';
  const path=r.path.map(n=>`<div class="step" data-l="${esc(n.concept)}" style="cursor:pointer"><div class="rail"><i style="background:${COL[n.status]}"></i></div><div class="sbody"><div class="row"><b>${esc(n.display)}</b><span>${n.goal?'<span class="tag">Goal</span>':''}${n.concept===r.start_concept?'<span class="tag go">Start here</span>':''}</span></div><div class="mut">${n.total?`${n.correct} of ${n.total} correct · ${LBL[n.status]}`:'Not tested in this check'}</div></div></div>`).join('');
  const next=r.start_concept?`Start with <span class="hl">${esc(dn(r.start_concept))}</span>${g.study_minutes?` · ${g.study_minutes} min a day`:''}.`:(r.unchecked&&r.unchecked.length?`What we checked looks solid. Still to check: ${esc(r.unchecked.join(', '))}.`:'You look ready for this goal. Move on to harder practice.');
  const scan=(r.mode==='topic'&&r.unchecked&&r.unchecked.length)?`<div class="card"><b>Foundations not checked yet</b><div class="mut">Skills this topic builds on were not tested: ${esc(r.unchecked.join(', '))}.</div><button class="btn ghost" style="margin-top:8px" data-scan="1">Take the quick scan</button></div>`:'';
  const mis=r.misconceptions.length?r.misconceptions.map(m=>`<div class="card"><div class="row"><b>${esc(m.label)}</b><span class="mut">×${m.count}</span></div>
    <div class="mut">${esc(m.description)}</div><div style="margin-top:6px">Root cause to revisit: <span class="hl">${esc(m.root_display)}</span></div></div>`).join(''):'<div class="card mut">No specific misconception pattern detected.</div>';
  const rev=r.review.map((q,i)=>`<details class="card">${qsum(i,q)}<div style="margin-top:8px">${esc(q.stem)}</div><div class="math" id="rm${i}"></div>
    <div class="mut">Your answer</div><div class="t" id="ra${i}">${q.chosen==null?'<i>I don\'t know</i>':''}</div>
    <div class="mut" style="margin-top:6px">Correct answer</div><div id="rc${i}"></div>
    ${q.reason&&!q.is_correct?`<p>${esc(q.reason)}</p>`:''}<p class="mut">${esc(q.solution)}</p><button class="btn ghost" data-ask="${i}">Ask the tutor about this</button></details>`).join('');
  show(`<h1>Your diagnostic</h1>
  <div class="card hero">${donut(r.correct,wrong,r.unsure,r.total)}<div class="leg"><div><i style="background:#60a5fa"></i>${r.correct} correct</div><div><i style="background:#f87171"></i>${wrong} not quite</div><div><i style="background:#6b7394"></i>${r.unsure} unsure</div></div></div>
  <p class="mut">A short check is a starting point. Practice sharpens the picture.</p>
  <h2>${title}</h2><p>${next}</p><p class="mut">Tap a topic to open a short lesson.</p><div class="card">${path}</div>${scan}
  <h2>Where mistakes come from</h2>${mis}<h2>Review your answers</h2>${rev}
  <div class="bar"><button class="btn ghost" id="menu">${S.fromHist?'Back to History':'Back to Menu'}</button>${r.start_concept?`<button class="btn" id="learn" data-pr="${esc(r.start_concept)}">Start practice</button>`:''}</div>`);
  r.review.forEach((q,i)=>{texLines($('#rm'+i),q.math);if(q.chosen!=null)tex($('#ra'+i),q.options[q.chosen]);tex($('#rc'+i),q.options[q.correct_index])});
  rich(app);
}
/* END app.js */
