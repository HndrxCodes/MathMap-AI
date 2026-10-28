(()=>{
const origGoal=window.goalScreen;
const tl=list=>list.map(([k,v])=>`<button class="card pick ${S.topics.includes(k)?'on':''}" data-t="${esc(k)}"><b>${esc(v.display)}</b><div class="mut">${esc((v.plain||'').replace(/\^2/g,'²'))}</div></button>`).join('');
const can=()=>S.goal==='mastery'?S.topics.length===1:!!(S.exam&&S.topics.length>0);
const bar=label=>`<div class="bar"><button class="btn" id="go" ${can()?'':'disabled'}>${label}</button></div>`;
const page=(title,body,cta)=>show(`<div class="row"><button class="x" id="sback">&larr;</button><span style="width:34px"></span></div><h1>${title}</h1>${body}<div style="height:90px"></div>${cta||''}`);
const cov=e=>e&&e.covers&&e.covers.length?`<div class="mut" style="margin-top:6px">Covered here: ${esc(e.covers.join(', '))}</div><div class="mut">Not covered yet: ${esc((e.gaps||[]).join(', '))}</div>`:'';
window.goalScreen=function(anim){
  try{
    if(S.goal==='mastery'){
      let list=Object.entries(S.concepts);
      if(S.ready&&S.ready.length)list=list.filter(([k])=>S.ready.includes(k));
      return page('Master a topic','<p class="mut">Pick one topic for a focused test.</p>'+tl(list),bar('Start topic test'));
    }
    if(S.goal==='test_prep'&&!S.exam){
      return page('Which test?','<p class="mut">Pick the test you are preparing for.</p>'+Object.entries(S.exams).map(([k,e])=>`<button class="card pick" data-e="${k}"><b>${esc(e.name)}</b><div class="mut">${esc(e.facts)}</div>${cov(e)}</button>`).join(''));
    }
    if(S.goal==='test_prep'){
      const e=S.exams[S.exam]||{name:'',facts:'',covers:[],gaps:[],topics:[]},sc=S.exam==='school';
      let list=Object.entries(S.concepts);
      if(!sc)list=list.filter(([k])=>(e.topics||[]).includes(k));
      return page(esc(e.name),(sc?'':`<div class="card"><div class="mut">${esc(e.facts)}</div>${cov(e)}</div>`)+`<h2>${sc?'Which topics are on it?':'Which topics do you want to practice?'}</h2><p class="mut">${sc?'Select all that apply.':'Everything this test covers here is selected. Tap to remove any you do not need.'}</p>`+tl(list),bar('Start exam practice'));
    }
  }catch(err){}
  return origGoal.apply(this,arguments);
};
const prev=app.onclick;
app.onclick=function(e){
  const t=e.target&&e.target.closest?e.target.closest('button'):null;
  if(t){
    const d=t.dataset;
    if(d.g==='test_prep'||d.g==='mastery'){S.goal=d.g;S.exam=null;S.topics=[];goalScreen();if(!S.plan)planModal();return}
    if(d.e&&S.goal==='test_prep'){const x=S.exams[d.e];S.exam=d.e;S.topics=d.e==='school'?[]:((x&&x.topics)||[]).slice();goalScreen();return}
    if(d.t&&(S.goal==='mastery'||S.goal==='test_prep')&&document.getElementById('sback')){
      S.topics=S.goal==='test_prep'?(S.topics.includes(d.t)?S.topics.filter(x=>x!==d.t):[...S.topics,d.t]):[d.t];
      app.querySelectorAll('[data-t]').forEach(b=>b.classList.toggle('on',S.topics.includes(b.dataset.t)));
      const g=document.getElementById('go');if(g)g.disabled=!can();
      return;
    }
    if(t.id==='sback'){
      if(S.goal==='test_prep'&&S.exam){S.exam=null;S.topics=[]}else{S.goal=null;S.exam=null;S.topics=[]}
      goalScreen();return;
    }
  }
  return prev.call(app,e);
};
})();
/* END app11.js */
