(()=>{
const OPS=new Set(['=','+','-','−','×','÷','∘','*','/']);
const TR=/[.,;:!?]+$/;
const OK=/^[A-Za-z0-9()\[\]+\-−=×÷∘^.,\/*²³]+$/;
function cls(w){
  const m=w.match(TR),trail=m?m[0]:'',core=trail?w.slice(0,w.length-trail.length):w;
  if(!core)return['W',w,''];
  if(OPS.has(core))return['O',core,trail];
  if(/^[A-Za-z]$/.test(core))return['S',core,trail];
  if(/^\d+(\.\d+)?$/.test(core))return['N',core,trail];
  if(/[A-Za-z]{2,}/.test(core)||!OK.test(core))return['W',w,''];
  if(/[0-9=+^∘×÷²³]/.test(core)||/^[-−]\d/.test(core)||/^[A-Za-z]\(/.test(core))return['M',core,trail];
  return['W',w,''];
}
function convert(str){
  const parts=str.split(/(\s+)/);
  const tk=parts.map(p=>{if(/^\s*$/.test(p))return{sp:1,w:p};const c=cls(p);return{ty:c[0],core:c[1],trail:c[2],w:p}});
  const segs=[];let buf='',i=0;
  const push=(s,m)=>{if(s)segs.push({s:s,m:m})};
  while(i<tk.length){
    const t=tk[i];
    if(t.sp||t.ty==='W'||t.ty==='O'){buf+=t.w;i++;continue}
    const seq=[i];let k=i;
    for(;;){
      const cur=tk[k];if(cur.trail)break;
      const sp=tk[k+1],nx=tk[k+2];
      if(!sp||!sp.sp||!nx||nx.sp||nx.ty==='W')break;
      if((cur.ty==='O')===(nx.ty==='O'))break;
      seq.push(k+2);k+=2;
    }
    if(tk[seq[seq.length-1]].ty==='O')seq.pop();
    const ty=seq.map(q=>tk[q].ty);
    const nn=ty.filter(x=>x!=='O').length;
    const wrap=ty.includes('M')||(ty.includes('O')&&nn>=2);
    if(!wrap){buf+=t.w;i++;continue}
    const last=seq[seq.length-1];let m='';
    for(let q=seq[0];q<=last;q++){const x=tk[q];m+=(q===last)?x.core:x.w}
    push(buf,false);buf='';push(m,true);buf=tk[last].trail||'';i=last+1;
  }
  push(buf,false);return segs;
}
const tx=m=>m.replace(/−/g,'-').replace(/×/g,'\\times ').replace(/÷/g,'\\div ').replace(/∘/g,'\\circ ').replace(/\*/g,'\\cdot ').replace(/²/g,'^2').replace(/³/g,'^3').replace(/\^(\d{2,})/g,'^{$1}');
function sweep(root){
  if(!window.katex)return;
  root.querySelectorAll('details.card p').forEach(p=>{
    const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement&&n.parentElement.closest('.katex,.m9')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
    const ns=[];while(w.nextNode())ns.push(w.currentNode);
    ns.forEach(n=>{
      const sg=convert(n.nodeValue);
      if(!sg.some(x=>x.m))return;
      const f=document.createDocumentFragment();
      sg.forEach(x=>{
        if(!x.m){f.appendChild(document.createTextNode(x.s));return}
        const sp=document.createElement('span');sp.className='m9';
        try{katex.render(tx(x.s),sp,{throwOnError:false})}catch(e){sp.textContent=x.s}
        f.appendChild(sp);
      });
      n.replaceWith(f);
    });
  });
}
let tmr=0;
new MutationObserver(()=>{clearTimeout(tmr);tmr=setTimeout(()=>sweep(app),90)}).observe(app,{childList:true,subtree:true});
})();
/* END app9.js */
