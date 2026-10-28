(()=>{
const AK='mm_active';
const jget=k=>{try{return JSON.parse(localStorage[k]||'null')}catch(e){return null}};
const jset=(k,v)=>{try{localStorage[k]=JSON.stringify(v)}catch(e){}};
const jdel=k=>{try{localStorage.removeItem(k)}catch(e){}};
const _t=window.testScreen,_r=window.reviewScreen,_res=window.resultScreen,_g=window.goalScreen;
const save=rv=>{try{if(S.practice||!S.sess||!S.start)return;jset(AK,{sess:S.sess,i:S.i,review:!!rv,start:S.start,exam:S.exam||'',goal:S.goal||'',topics:S.topics||[]})}catch(e){}};
window.testScreen=function(){_t.apply(this,arguments);save(false)};
window.reviewScreen=function(){_r.apply(this,arguments);save(true)};
window.resultScreen=function(){jdel(AK);return _res.apply(this,arguments)};
ov.addEventListener('click',e=>{
  const t=e.target.closest&&e.target.closest('button');
  if(t&&t.id==='qyes'){
    const a=jget(AK);
    try{if(a&&a.sess&&!S.practice){api('/baseline/abandon',{session_id:a.sess,student_id:SID}).catch(()=>{});jdel('mm_ans_'+a.sess);jdel('mm_el_'+a.sess)}}catch(x){}
    jdel(AK);
  }
},true);
async function resume(a){
  try{
    S.goal=a.goal||S.goal;S.exam=a.exam||null;S.topics=a.topics||[];S.start=a.start;
    const s=await api('/baseline/start',{student_id:SID,mode:a.start.mode,topics:a.start.topics,exam:a.start.mode==='exam'?(a.exam||''):''});
    if(s.session_id!==a.sess){api('/baseline/abandon',{session_id:s.session_id,student_id:SID}).catch(()=>{});jdel(AK);return _g.call(window,true)}
    S.practice=null;S.fromHist=false;S.sess=s.session_id;S.qs=s.questions;
    S.i=Math.min(a.i||0,S.qs.length-1);S.review=!!a.review;
    S.ans=JSON.parse(localStorage['mm_ans_'+S.sess]||'{}');
    if(S.review)reviewScreen();else testScreen();
  }catch(e){jdel(AK);return _g.call(window,true)}
}
let booted=false;
window.goalScreen=function(){
  if(!booted){
    booted=true;
    const a=jget(AK);
    if(a&&a.sess&&a.start){resume(a);return}
  }
  return _g.apply(this,arguments);
};
})();
/* END app12.js */
