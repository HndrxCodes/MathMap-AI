(()=>{
const K=s=>'mm_el_'+s;
const get=k=>{try{return+localStorage[k]||0}catch(e){return 0}};
const set=(k,v)=>{try{localStorage[k]=v}catch(e){}};
const fmt=ms=>{const s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
const isExam=()=>!!(S.start&&S.start.mode==='exam'&&!S.practice&&S.sess);
const stamp=()=>{const el=document.getElementById('mmtimer');if(el)el.textContent=fmt(get(K(S.sess)))};
const _t=window.testScreen,_r=window.reviewScreen,_res=window.resultScreen;
window.testScreen=function(){
  _t.apply(this,arguments);
  try{if(!isExam())return;const m=app.querySelector('.row .mut');if(m){m.insertAdjacentHTML('beforeend',' · <span id="mmtimer"></span>');stamp()}}catch(e){}
};
window.reviewScreen=function(){
  _r.apply(this,arguments);
  try{if(!isExam())return;const h=app.querySelector('h1');if(h){h.insertAdjacentHTML('afterend','<p class="mut" style="margin:0 0 6px">Time <span id="mmtimer"></span></p>');stamp()}}catch(e){}
};
window.resultScreen=function(){
  _res.apply(this,arguments);
  try{
    const r=S.res;if(!r||r.mode!=='exam'||S.fromHist||S.practice||!S.sess)return;
    const ms=get(K(S.sess));if(ms<5000)return;
    const n=r.total||(S.qs||[]).length;if(!n)return;
    const hero=app.querySelector('.card.hero');if(!hero)return;
    const avg=Math.round(ms/1000/n),ex=S.exams&&S.exams[S.exam];
    let line='';
    const mt=ex&&String(ex.facts).match(/(\d+)\D{1,40}?(\d+)\s*minutes/i);
    if(mt){const q=+mt[1],min=+mt[2],per=Math.round(min*60/q);
      line=`<div class="mut" style="margin-top:6px">Real ${esc(ex.name)}: ${q} questions in ${min} min, about ${per} s each. ${avg<=per?'You are within that pace.':'You are slower than that pace.'} This practice has fewer questions than the real test.</div>`}
    hero.insertAdjacentHTML('afterend',`<div class="card"><b>Exam pace</b><div class="mut" style="margin-top:4px">${fmt(ms)} for ${n} questions, about ${avg} s per question.</div>${line}</div>`);
  }catch(e){}
};
let last=Date.now();
setInterval(()=>{
  const now=Date.now(),d=Math.min(now-last,2000);last=now;
  try{if(!isExam()||!document.getElementById('mmtimer'))return;
    const k=K(S.sess);set(k,get(k)+d);stamp()}catch(e){}
},1000);
})();
/* END app10.js */
