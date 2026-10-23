const SID=new URLSearchParams(location.search).get('student')||localStorage.mm_student||'demo_student';
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

const ready=()=>!!S.goal&&(S.goal==='find_gaps'||(S.goal==='mastery'&&S.topics.length===1)||(S.goal==='test_prep'&&S.exam&&(S.exam!=='school'||S.topics.length>0)));
const topicList=()=>{
  let list=Object.entries(S.concepts);
  const only=S.goal==='mastery'&&S.ready.length;
  if(only)list=list.filter(([k])=>S.ready.includes(k));
  return list.map(([k,v])=>`<button class="card pick ${S.topics.includes(k)?'on':''}" data-t="${esc(k)}"><b>${esc(v.display)}</b><div class="mut">${esc(v.plain.replace(/\^2/g,'²'))}</div></button>`).join('')+(only?'<p class="mut">More topics are coming soon.</p>':'');
};

function goalScreen(anim){
  const G=[['test_prep','🎯','Prepare for a test','Practice for SAT, CSCA or your own exam'],['mastery','📘','Master a topic','Take a focused test on one topic'],['find_gaps','🔍','Find my gaps','A broad scan of the basics to see where to start']];
  const fl=S.plan?`<div class="slot ${anim?'':'on'}" id="slot"><div class="flrow"><button class="flame" id="flame"><svg width="18" height="22" viewBox="0 0 24 24"><defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93c5fd"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs><path fill="url(#fg)" d="M12 2c.8 3.2 5.5 5.2 5.5 10.2A5.5 5.5 0 0 1 6.5 14c0-2.2 1.2-3.8 2.4-5 .1 1.6.9 2.6 1.9 2.8C10.4 8 11 5 12 2z"/></svg><b>${S.plan.day}</b></button></div></div>`:'';
  let h=fl+'<h1>What brings you here?</h1><p class="mut">Pick one. You do not need to know topic names.</p>'+
    G.map(g=>`<button class="card pick ${S.goal===g[0]?'on':''}" data-g="${g[0]}"><b>${g[1]} ${g[2]}</b><div class="mut">${g[3]}</div></button>`).join('');
  if(S.goal==='test_prep'){
    h+='<h2>Which test?</h2>'+Object.entries(S.exams).map(([k,e])=>`<button class="card pick ${S.exam===k?'on':''}" data-e="${k}"><b>${esc(e.name)}</b><div class="mut">${esc(e.facts)}</div>${e.covers.length?`<div class="mut" style="margin-top:6px">Covered here: ${esc(e.covers.join(', '))}</div><div class="mut">Not covered yet: ${esc(e.gaps.join(', '))}</div>`:''}</button>`).join('');
    if(S.exam==='school')h+='<h2>Which topics are on it?</h2><p class="mut">Select all that apply.</p>'+topicList();
  }
  if(S.goal==='mastery')h+='<h2>Which topic?</h2>'+topicList();
  show(h+`<p class="mut" style="text-align:center;font-size:.7rem;margin-top:24px">build 6</p><div class="bar"><button class="btn" id="go" ${ready()?'':'disabled'}>Start the test</button></div>`);
  if(anim)requestAnimationFrame(()=>requestAnimationFrame(()=>{const e=document.getElementById('slot');if(e)e.classList.add('on')}));
}

async function startTest(){
  const s=await api('/baseline/start',{student_id:SID,mode:S.start.mode,topics:S.start.topics});
  S.sess=s.session_id;S.qs=s.questions;S.i=0;S.review=false;
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
  const path=r.path.map(n=>`<div class="step"><div class="rail"><i style="background:${COL[n.status]}"></i></div><div class="sbody"><div class="row"><b>${esc(n.display)}</b><span>${n.goal?'<span class="tag">Goal</span>':''}${n.concept===r.start_concept?'<span class="tag go">Start here</span>':''}</span></div><div class="mut">${n.total?`${n.correct} of ${n.total} correct · ${LBL[n.status]}`:'Not tested in this check'}</div></div></div>`).join('');
  const next=r.start_concept?`Start with <span class="hl">${esc(dn(r.start_concept))}</span>${g.study_minutes?` · ${g.study_minutes} min a day`:''}.`:(r.unchecked&&r.unchecked.length?`What we checked looks solid. Still to check: ${esc(r.unchecked.join(', '))}.`:'You look ready for this goal. Move on to harder practice.');
  const scan=(r.mode==='topic'&&r.unchecked&&r.unchecked.length)?`<div class="card"><b>Foundations not checked yet</b><div class="mut">Skills this topic builds on were not tested: ${esc(r.unchecked.join(', '))}.</div><button class="btn ghost" style="margin-top:8px" data-scan="1">Take the quick scan</button></div>`:'';
  const mis=r.misconceptions.length?r.misconceptions.map(m=>`<div class="card"><div class="row"><b>${esc(m.label)}</b><span class="mut">×${m.count}</span></div>
    <div class="mut">${esc(m.description)}</div><div style="margin-top:6px">Root cause to revisit: <span class="hl">${esc(m.root_display)}</span></div></div>`).join(''):'<div class="card mut">No specific misconception pattern detected.</div>';
  const rev=r.review.map((q,i)=>`<details class="card"><summary>Q${i+1} ${q.is_correct?'✅':'❌'}</summary><div style="margin-top:8px">${esc(q.stem)}</div><div class="math" id="rm${i}"></div>
    <div class="mut">Your answer</div><div class="t" id="ra${i}">${q.chosen==null?'<i>I don\'t know</i>':''}</div>
    <div class="mut" style="margin-top:6px">Correct answer</div><div id="rc${i}"></div>
    ${q.reason&&!q.is_correct?`<p>${esc(q.reason)}</p>`:''}<p class="mut">${esc(q.solution)}</p><button class="btn ghost" data-ask="${i}">Ask the tutor about this</button></details>`).join('');
  show(`<h1>Your diagnostic</h1>
  <div class="card hero">${donut(r.correct,wrong,r.unsure,r.total)}<div class="leg"><div><i style="background:#60a5fa"></i>${r.correct} correct</div><div><i style="background:#f87171"></i>${wrong} not quite</div><div><i style="background:#6b7394"></i>${r.unsure} unsure</div></div></div>
  <p class="mut">A short check is a starting point. Practice sharpens the picture.</p>
  <h2>${title}</h2><p>${next}</p><div class="card">${path}</div>${scan}
  <h2>Where mistakes come from</h2>${mis}<h2>Review your answers</h2>${rev}
  <div class="bar"><button class="btn ghost" id="retake">Retake</button><button class="btn" id="tutor">Ask the tutor</button></div>`);
  r.review.forEach((q,i)=>{texLines($('#rm'+i),q.math);if(q.chosen!=null)tex($('#ra'+i),q.options[q.chosen]);tex($('#rc'+i),q.options[q.correct_index])});
  rich(app);
}
/* END app.js */
