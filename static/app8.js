(()=>{
const origGoal=goalScreen;
const cov=e=>e.covers&&e.covers.length?`<div class="mut" style="margin-top:6px">Covered here: ${esc(e.covers.join(', '))}</div><div class="mut">Not covered yet: ${esc(e.gaps.join(', '))}</div>`:'';
const page=(title,body,cta)=>show(`<div style="margin-bottom:8px"><button class="btn ghost" id="sback" style="padding:6px 14px">&larr; Back</button></div><h1>${title}</h1>${body}<div style="height:84px"></div>${cta||''}`);
const bar=label=>`<div class="bar"><button class="btn" id="go" ${ready()?'':'disabled'}>${label}</button></div>`;
window.goalScreen=function(anim){
  if(S.goal==='mastery')return page('Master a topic','<p class="mut">Pick one topic for a focused test.</p>'+topicList(),bar('Start topic test'));
  if(S.goal==='test_prep'&&!S.exam)return page('Which test?','<p class="mut">Pick the test you are preparing for.</p>'+Object.entries(S.exams).map(([k,e])=>`<button class="card pick" data-e="${k}"><b>${esc(e.name)}</b><div class="mut">${esc(e.facts)}</div>${cov(e)}</button>`).join(''));
  if(S.goal==='test_prep'){
    const e=S.exams[S.exam]||{name:'',facts:'',covers:[],gaps:[]},sc=S.exam==='school';
    return page(esc(e.name),(sc?'':`<div class="card"><div class="mut">${esc(e.facts)}</div>${cov(e)}</div>`)+`<h2>${sc?'Which topics are on it?':'Which topics do you want to practice?'}</h2><p class="mut">${sc?'Select all that apply.':'Pick one or more. Questions come only from the topics you choose.'}</p>`+topicList(),bar('Start exam practice'));
  }
  return origGoal(anim);
};
const prev=app.onclick;
app.onclick=function(e){
  const t=e.target.closest&&e.target.closest('button');
  if(t){
    const d=t.dataset;
    if(d.g==='test_prep'||d.g==='mastery'){S.goal=d.g;S.exam=null;S.topics=[];goalScreen();window.scrollTo(0,0);if(!S.plan)planModal();return}
    if(d.e){S.exam=d.e;S.topics=[];goalScreen();window.scrollTo(0,0);return}
    if(t.id==='sback'){
      if(S.goal==='test_prep'&&S.exam){S.exam=null;S.topics=[]}
      else{S.goal=null;S.exam=null;S.topics=[]}
      goalScreen();window.scrollTo(0,0);return;
    }
  }
  return prev.call(app,e);
};
})();
/* END app8.js */
