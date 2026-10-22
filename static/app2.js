const ov=document.getElementById('ov');
const texLines=(el,s)=>{const p=s.split(/,\s*(?=\\text\{)/);if(p.length<2||!window.katex)return tex(el,s,true);el.innerHTML='';p.forEach(x=>{const d=document.createElement('div');el.appendChild(d);tex(d,x,true)})};
const md=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
const closeOv=()=>{ov.innerHTML=''};
function quitModal(){ov.innerHTML='<div class="ov"><div class="sheet"><h2 style="margin-top:0">Quit the test?</h2><p class="mut">Your answers are saved. You can pick up where you left off.</p><div class="row" style="gap:10px"><button class="btn ghost" style="flex:1" id="qno">No</button><button class="btn" style="flex:1" id="qyes">Yes, quit</button></div></div></div>'}
function renderPlan(){
  ov.innerHTML=`<div class="ov"><div class="sheet"><h2 style="margin-top:0">Set your study plan</h2><div class="mut">Minutes per day</div><div class="pills">${[10,20,30,45].map(m=>`<button class="pill ${S.tmp.m===m?'on':''}" data-pm="${m}">${m} min</button>`).join('')}</div><div class="mut" style="margin-top:14px">For how many days?</div><div class="pills">${[7,14,30].map(d=>`<button class="pill ${S.tmp.d===d?'on':''}" data-pd="${d}">${d} days</button>`).join('')}</div><button class="btn" style="width:100%;margin-top:18px" id="pok">${S.plan?'Save plan':'Start day 1'}</button></div></div>`}
function planModal(){const p=S.plan||{minutes:20,days:14};S.tmp={m:p.minutes,d:p.days};renderPlan()}
const CHIPS={wrong:['Why is my answer wrong?','Show the correct steps','Give me a hint, not the answer','What rule am I missing?'],right:['Is there a faster way?','Why are the other options wrong?','Where could this trick me on a test?'],idk:['Where do I start?','Explain the idea first','Walk me through it step by step'],summary:['Explain my mistakes in one paragraph','Why should I start there?','Plan my first week']};
function summaryData(){const r=S.res,g=r.goal||{};return{score:r.correct+'/'+r.total,unsure:r.unsure,path:r.path.map(n=>({topic:n.display,status:n.status,correct:n.correct,total:n.total,goal:n.goal})),start:r.start_concept,mistakes:r.misconceptions.map(m=>({label:m.label,times:m.count,root:m.root_display})),minutes_per_day:g.study_minutes,days:g.study_days}}
function tutorSheet(kind,item){
  S.t={kind,data:kind==='summary'?summaryData():item,hist:[]};
  const key=kind==='summary'?'summary':item.chosen==null?'idk':item.is_correct?'right':'wrong';
  ov.innerHTML=`<div class="ov"><div class="sheet tall"><div class="row"><b>AI tutor</b><button class="x" id="tclose">✕</button></div><div id="msgs" class="msgs"><div class="mut">Ask about ${kind==='summary'?'your results':'this question'}. Pick a suggestion or type your own.</div></div><div class="chips">${CHIPS[key].map(c=>`<button class="chip" data-chip="${esc(c)}">${esc(c)}</button>`).join('')}</div><div class="send"><input id="tin" placeholder="Ask anything…" autocomplete="off"><button class="btn" id="tsend">Send</button></div></div></div>`;
}
async function ask(text){
  const box=document.getElementById('msgs');if(!box||S.t.busy)return;S.t.busy=true;
  box.insertAdjacentHTML('beforeend',`<div class="msg me">${esc(text)}</div><div class="msg bot" id="wait">…</div>`);box.scrollTop=box.scrollHeight;
  let reply;try{const r=await api('/tutor',{kind:S.t.kind,message:text,data:S.t.data,history:S.t.hist});reply=r.reply}catch(e){reply='Sorry, I could not reach the tutor.'}
  S.t.hist.push({role:'user',content:text},{role:'assistant',content:reply});
  const w=document.getElementById('wait');w.id='';w.innerHTML=md(reply);rich(w);box.scrollTop=box.scrollHeight;S.t.busy=false;
}
ov.onclick=async e=>{
  const t=e.target.closest('button');if(!t){if(e.target.classList.contains('ov'))closeOv();return}
  const d=t.dataset;
  try{
    if(t.id==='qno'||t.id==='tclose')return closeOv();
    if(t.id==='qyes'){closeOv();return goalScreen()}
    if(d.pm){S.tmp.m=+d.pm;return renderPlan()}
    if(d.pd){S.tmp.d=+d.pd;return renderPlan()}
    if(t.id==='pok'){t.disabled=true;const first=!S.plan;S.plan={minutes:S.tmp.m,days:S.tmp.d,day:first?1:S.plan.day};
      await api('/goal',{student_id:SID,goal_type:S.goal||'find_gaps',topics:S.topics,study_minutes:S.tmp.m,study_days:S.tmp.d,exam:S.exam||''});
      closeOv();return goalScreen(first)}
    if(d.chip)return ask(d.chip);
    if(t.id==='tsend'){const i=document.getElementById('tin'),v=i.value.trim();if(v){i.value='';ask(v)}}
  }catch(err){alert('Something went wrong ('+err.message+')');t.disabled=false}
};
ov.onkeydown=e=>{if(e.key==='Enter'&&e.target.id==='tin'){const v=e.target.value.trim();if(v){e.target.value='';ask(v)}}};

app.onclick=async e=>{
  const t=e.target.closest('button');if(!t)return;const d=t.dataset;
  try{
    if(d.g){S.goal=d.g;S.exam=null;S.topics=[];goalScreen();if(!S.plan)planModal();return}
    if(t.id==='flame')return planModal();
    if(t.id==='quit')return quitModal();
    if(d.ask!==undefined)return tutorSheet('question',S.res.review[+d.ask]);
    if(d.scan){S.start={mode:'gaps',topics:[]};return startTest()}
    if(d.e){S.exam=d.e;S.topics=[];return goalScreen()}
    if(d.t){S.topics=S.goal==='test_prep'?(S.topics.includes(d.t)?S.topics.filter(x=>x!==d.t):[...S.topics,d.t]):[d.t];return goalScreen()}
    if(d.m){S.minutes=+d.m;return goalScreen()}
    if(d.o!==undefined){S.ans[S.qs[S.i].id]=d.o==='-1'?null:+d.o;localStorage['mm_ans_'+S.sess]=JSON.stringify(S.ans);return testScreen()}
    if(d.j!==undefined){S.review=false;S.i=+d.j;return testScreen()}
    if(t.id==='go'){t.disabled=true;
      const mode=S.goal==='mastery'?'topic':S.goal==='test_prep'?'exam':'gaps';
      const topics=S.goal==='test_prep'&&S.exam!=='school'?S.exams[S.exam].topics:S.topics;
      S.start={mode,topics};
      await api('/goal',{student_id:SID,goal_type:S.goal,topics,study_minutes:S.plan?S.plan.minutes:20,study_days:S.plan?S.plan.days:14,exam:S.exam||''});
      return startTest()}
    if(t.id==='prev'){if(S.review){S.review=false;S.i=S.qs.length-1}else S.i--;return testScreen()}
    if(t.id==='next'){if(S.i===S.qs.length-1){S.review=true;return reviewScreen()}S.i++;return testScreen()}
    if(t.id==='submit'){t.disabled=true;const a={};S.qs.forEach(q=>a[q.id]=S.ans[q.id]===undefined?null:S.ans[q.id]);
      S.res=await api('/baseline/submit',{session_id:S.sess,answers:a});localStorage.removeItem('mm_ans_'+S.sess);return resultScreen()}
    if(t.id==='retake'){S.goal=null;S.exam=null;S.topics=[];return goalScreen()}
    if(t.id==='tutor')return tutorSheet('summary');
  }catch(err){alert('Something went wrong ('+err.message+'). Please try again.');t.disabled=false}
};

(async()=>{
  try{S.concepts=await api('/concepts');S.exams=await api('/exams');S.ready=await api('/topics/ready').catch(()=>[])}catch(e){return show(`<h1>Cannot load the app data</h1><p class="mut">${esc(e.message)}. The server may be restarting, or the /api routes are not connected.</p>`)}
  try{const g=await api('/goal/'+SID);if(g.study_minutes)S.plan={minutes:g.study_minutes,days:g.study_days||14,day:g.day||1}}catch(e){}
  try{const r=await api('/baseline/result/'+SID);if(r&&r.total){S.res=r;return resultScreen()}}catch(e){}
  goalScreen();
})();
/* END app2.js */
