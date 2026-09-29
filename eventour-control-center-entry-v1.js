(function(){
'use strict';
function isSuper(){return window.isSuperadmin===true||document.documentElement.dataset.adminRole==='superadmin'}
function add(){
 if(!isSuper())return;
 const groups=[...document.querySelectorAll('#areaAdmin .sidebar .nav-group')];
 const system=groups.find(g=>g.querySelector('.nav-label')?.textContent?.trim()==='Sistema');
 if(system&&!document.getElementById('sideEventourControlCenter')){
  const nav=system.querySelector('.nav'); if(!nav)return;
  const b=document.createElement('button');b.type='button';b.id='sideEventourControlCenter';b.textContent='🎛️ Gestione EVENTOUR';b.title='Control Center Superadmin';
  b.onclick=()=>location.href='eventour-control-center.html';nav.insertBefore(b,nav.firstChild);
 }
 const mobile=document.querySelector('.mobile-nav');
 if(mobile&&!document.getElementById('mobileEventourControlCenter')){
  const b=document.createElement('button');b.type='button';b.id='mobileEventourControlCenter';b.textContent='🎛️ Gestione EVENTOUR';b.onclick=()=>location.href='eventour-control-center.html';
  mobile.prepend(b);
 }
}
window.addEventListener('admin:role-ready',add);window.addEventListener('admin:rendered',()=>requestAnimationFrame(add));
new MutationObserver(()=>requestAnimationFrame(add)).observe(document.body,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add,{once:true});else add();
})();