/* NEXT POINT PADEL — TEST FINALE READ-ONLY
 * Incolla nella console del browser mentre sei autenticato in admin.html.
 * Non modifica DB, localStorage, DOM o repository.
 */
(async()=>{
 const R={ok:0,ko:0,rows:[],errors:[]};
 const ck=(id,ok,detail)=>{R[ok?'ok':'ko']++;R.rows.push({id,esito:ok?'OK':'KO',detail});};
 const err=(id,e)=>{R.errors.push({id,error:String(e?.message||e)});};
 try{
  ck('T01','https:'===location.protocol,'HTTPS');
  ck('T02',!!window.supabase||!!window.sb||!!window.client,'client Supabase presente');
  const c=window.supabase||window.sb||window.client;
  const client=c?.from&&c?.auth?c:null;
  ck('T03',!!client,'client utilizzabile');
  if(client){
   const {data:{session},error:se}=await client.auth.getSession(); if(se) throw se;
   ck('T04',!!session?.user?.id,'sessione autenticata');
   if(session){
    const uid=session.user.id;
    const {data:mem,error:me}=await client.from('azienda_utenti').select('azienda_id,user_id,ruolo,attivo').eq('user_id',uid);
    if(me) throw me;
    ck('T05',Array.isArray(mem),'membership leggibile');
    const active=(mem||[]).filter(x=>x.attivo!==false);
    ck('T06',active.length>0,'membership attiva');
    const tenant=window.aziendaId||window.currentAziendaId||window.adminState?.aziendaId;
    ck('T07',!!tenant,'tenant runtime presente');
    if(tenant){
      ck('T08',active.some(x=>x.azienda_id===tenant),'membership coerente col tenant');
      const {data:a,error:ae}=await client.from('aziende').select('id,ragione_sociale,nome_app,slug,stato').eq('id',tenant).maybeSingle();
      if(ae) throw ae;
      ck('T09',a?.id===tenant,'azienda corrente caricata');
      ck('T10',!!a?.slug,'slug azienda presente');
      const {data:t,error:te}=await client.from('tornei').select('id,nome,azienda_id,pubblicato,stato,iscrizioni_chiuse,formula').eq('azienda_id',tenant);
      if(te) throw te;
      ck('T11',Array.isArray(t),'tornei tenant leggibili');
      ck('T12',(t||[]).every(x=>x.azienda_id===tenant),'nessun torneo esterno nel tenant');
      ck('T13',(t||[]).every(x=>x.id!==null && x.nome!==null),'tornei coerenti');
      const ids=(t||[]).map(x=>x.id);
      if(ids.length){
       const {data:i,error:ie}=await client.from('iscrizioni').select('id,torneo_id,azienda_id,stato,approvato').in('torneo_id',ids);
       if(ie) throw ie;
       ck('T14',Array.isArray(i),'iscrizioni tornei leggibili');
       ck('T15',(i||[]).every(x=>x.azienda_id===tenant),'iscrizioni coerenti col tenant');
      }else ck('T14',true,'nessun torneo: controllo iscrizioni non applicabile'),ck('T15',true,'nessun torneo: controllo isolamento non applicabile');
    }
   }
  }
  ck('T16',typeof window.openAdminCalendar==='function','calendario reale disponibile');
  ck('T17',typeof window.openAdminPage==='function','routing admin disponibile');
  ck('T18',typeof window.vaiIscrizione==='function'||typeof window.apriTorneoPubblico==='function','funzioni pubblico disponibili');
 }catch(e){err('GLOBAL',e)}
 console.table(R.rows); console.log({OK:R.ok,KO:R.ko,ERRORI:R.errors.length,errors:R.errors});
 window.__NP_FINAL_TEST__=R;
})();