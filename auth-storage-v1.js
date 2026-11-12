/* Eventour auth persistence: Ricordami = localStorage; senza Ricordami = sessionStorage.
   Lo storage è scelto dinamicamente così login, dashboard e admin condividono la stessa sessione. */
(function(){
'use strict';
const KEY='sb-dkeqicstprvvfebiaooc-auth-token';
const PREF='eventour_auth_remember';
function remembered(){
 try{
  if(localStorage.getItem(PREF)==='1')return true;
  if(sessionStorage.getItem(PREF)==='0')return false;
 }catch(_){}
 return true; // compatibilità con le sessioni persistenti già esistenti
}
function store(){
 try{return remembered()?localStorage:sessionStorage}catch(_){return sessionStorage}
}
window.EventourAuthPersistence={
 setRemember(value){
  const keep=!!value;
  try{
   if(keep){localStorage.setItem(PREF,'1');sessionStorage.removeItem(PREF)}
   else{sessionStorage.setItem(PREF,'0');localStorage.removeItem(PREF);localStorage.removeItem(KEY)}
  }catch(e){console.warn('Preferenza Ricordami non salvata:',e)}
 },
 isRemembered:remembered
};
const api=window.supabase;
if(!api?.createClient||api.createClient.__eventourPersistenceWrapped)return;
const original=api.createClient.bind(api);
const wrapped=function(url,key,options){
 const opts=options||{};
 const auth=opts.auth||{};
 // Non modificare i client visitatore che usano uno storageKey dedicato.
 if(auth.storageKey&&auth.storageKey!=='sb-dkeqicstprvvfebiaooc-auth-token')return original(url,key,opts);
 const adapter={
  getItem(k){try{return store().getItem(k)}catch(_){return null}},
  setItem(k,v){try{store().setItem(k,v)}catch(e){console.error('Salvataggio sessione Eventour non riuscito:',e)}},
  removeItem(k){try{store().removeItem(k)}catch(e){console.error('Rimozione sessione Eventour non riuscita:',e)}}
 };
 return original(url,key,{...opts,auth:{...auth,storage:adapter}});
};
wrapped.__eventourPersistenceWrapped=true;
api.createClient=wrapped;
})();