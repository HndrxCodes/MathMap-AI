(()=>{
const st=document.createElement('style');
st.textContent='.pov.still,.pov.still .pcard{animation:none!important}';
document.head.appendChild(st);
let had=false;
new MutationObserver(()=>{
  const el=ov.querySelector('.pov'),now=!!el;
  if(now&&had)el.classList.add('still');
  had=now;
}).observe(ov,{childList:true});
})();
/* END app7.js */
