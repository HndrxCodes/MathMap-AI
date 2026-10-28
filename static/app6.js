(()=>{
const MAP={times:'×',div:'÷',cdot:'·',pm:'±',neq:'≠',ne:'≠',leq:'≤',le:'≤',geq:'≥',ge:'≥',to:'→',approx:'≈',infty:'∞',pi:'π',circ:'∘'};
function fixReason(s){
  if(s.indexOf('$')>=0)return null;
  let t=s.replace(/\\(times|div|cdot|pm|neq|ne|leq|le|geq|ge|to|approx|infty|pi|circ)(?![A-Za-z])/g,(m,k)=>MAP[k]);
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
    if(s.indexOf('\\')<0){p.dataset.fx='1';if(s.indexOf('$')>=0)return;const r2=s.replace(AR,m=>'$'+m+'$');if(r2!==s){p.textContent=r2;if(typeof rich==='function')rich(p)}return}
    p.dataset.fx='1';
    const r=fixReason(s);
    if(r===null)return;
    p.textContent=r;
    if(r.indexOf('$')>=0&&typeof rich==='function')rich(p);
  });
}
const AR=/(?<![A-Za-z0-9^.])(?:\(?-?(?:\d+(?:\.\d+)?[a-z]?|[a-z](?![A-Za-z]))(?:\^\d+)?\)?(?:\s*[-+=\u2212\u00d7\u00f7]\s*\(?-?(?:\d+(?:\.\d+)?[a-z]?|[a-z](?![A-Za-z]))(?:\^\d+)?\)?)+|\(?-\d+(?:\.\d+)?[a-z]?(?:\^\d+)?\)?|\d+(?:\.\d+)?[a-z](?:\^\d+)?|[a-z]\^\d+)(?![A-Za-z0-9])/g;
let busy=false;
new MutationObserver(()=>{
  if(busy)return;busy=true;
  requestAnimationFrame(()=>{busy=false;sweep(app)});
}).observe(app,{childList:true,subtree:true});
})();
/* END app6.js */
