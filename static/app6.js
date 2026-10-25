(()=>{
const MAP={times:'×',div:'÷',cdot:'·',pm:'±',neq:'≠',ne:'≠',leq:'≤',le:'≤',geq:'≥',ge:'≥',to:'→',approx:'≈',infty:'∞',pi:'π'};
function fixReason(s){
  if(s.indexOf('$')>=0)return null;
  let t=s.replace(/\\(times|div|cdot|pm|neq|ne|leq|le|geq|ge|to|approx|infty|pi)(?![A-Za-z])/g,(m,k)=>MAP[k]);
  t=t.replace(/(^|[\s(=\[])-(?=[\d(])/g,'$1−').replace(/ - /g,' − ');
  const w=x=>'$'+x+'$';
  t=t.replace(/\\frac\{[^{}]*\}\{[^{}]*\}/g,w)
     .replace(/\\sqrt(\[[^\]]*\])?\{[^{}]*\}/g,w)
     .replace(/[A-Za-z0-9)]\^(\{[^{}]*\}|[A-Za-z0-9]+)/g,w);
  return t;
}
function sweep(root){
  root.querySelectorAll('details.card p').forEach(p=>{
    if(p.dataset.fx||p.querySelector('.katex'))return;
    const s=p.textContent;
    if(s.indexOf('\\')<0)return;
    p.dataset.fx='1';
    const r=fixReason(s);
    if(r===null)return;
    p.textContent=r;
    if(r.indexOf('$')>=0&&typeof rich==='function')rich(p);
  });
}
let busy=false;
new MutationObserver(()=>{
  if(busy)return;busy=true;
  requestAnimationFrame(()=>{busy=false;sweep(app)});
}).observe(app,{childList:true,subtree:true});
})();
/* END app6.js */
