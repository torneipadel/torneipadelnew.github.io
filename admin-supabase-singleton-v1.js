(()=>{
'use strict';

const sup=window.supabase;
if(!sup?.createClient)return;
if(sup.createClient.__adminSingletonWrapper)return;

const SUPABASE_URL='https://dkeqicstprvvfebiaooc.supabase.co';
const SUPABASE_KEY='sb_publishable_EBgrU25BpXMp9x6a2n7_Pg_FTFa5JLu';
const originalCreateClient=sup.createClient.bind(sup);
const singletonCreateClient=function(...args){
  const existing=window.supabaseClient;
  if(existing && typeof existing.from==='function' && existing.auth) {
    window.sb=existing;
    return existing;
  }
  const legacy=window.sb;
  if(legacy && typeof legacy.from==='function' && legacy.auth) {
    window.supabaseClient=legacy;
    return legacy;
  }
  const client=originalCreateClient(...(args.length?args:[SUPABASE_URL,SUPABASE_KEY]));
  window.sb=client;
  window.supabaseClient=client;
  return client;
};

singletonCreateClient.__adminSingletonWrapper=true;
sup.createClient=singletonCreateClient;

// Il client deve esistere prima di admin-functions.js: altrimenti window.sb
// può rimanere l'oggetto namespace della libreria invece del client Supabase.
if(!window.supabaseClient || typeof window.supabaseClient.from!=='function'){
  singletonCreateClient();
}
})();
