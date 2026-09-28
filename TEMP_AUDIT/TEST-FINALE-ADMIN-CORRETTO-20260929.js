/* NEXT POINT PADEL — TEST FINALE ADMIN CORRETTO — READ ONLY */
(async()=>{
 const R={ok:0,ko:0,rows:[],errors:[]};
 const ck=(id,ok,detail)=>{R[ok?'ok':'ko']++;R.rows.push({id,esito:ok?'OK':'KO',detail});};
 const err=(id,e)=>R.errors.push({id,error:String(e?.message||e)});
 try{
  ck('A01',location.protocol==='https:','HTTPS');
  const client=window.sb||window.supabaseClient||window.supabase;
  ck('A02',!!client&&typeof client.from==='function'&&typeof client.auth?.getSession==='function','client Supabase singleton');
  if(client){
   const {data,error}=await client.auth.getSession(); if(error) throw error;
   const s=data?.session; ck('A03',!!s?.user?.id,'sessione autenticata');
   if(s){
    ck('A04',!!s.user.email,'email utente presente');
    const {data:m,error:me}=await client.from('azienda_utenti').select('azienda_id,user_id,ruolo,attivo').eq('user_id',s.user.id);
    if(me) throw me;
    const active=(m||[]).filter(x=>x.attivo===true);
    ck('A05',active.length>0,'membership attiva');
    const tenant=window.aziendaId;
    ck('A06',!!tenant,'tenant runtime');
    if(tenant){
      ck('A07',active.some(x=>x.azienda_id===tenant),'membership coerente col tenant');
      const {data:a,error:ae}=await client.from('aziende').select('id,ragione_sociale,nome_app,slug,stato,owner_user_id').eq('id',tenant).maybeSingle();
      if(ae) throw ae;
      ck('A08',a?.id===tenant,'azienda corrente');
      ck('A09',['attiva','configurazione'].includes(String(a?.stato||'')),'azienda in stato operativo');
      const {data:t,error:te}=await client.from('tornei').select('id,nome,azienda_id,pubblicato,stato,iscrizioni_chiuse,formula').eq('azienda_id',tenant);
      if(te) throw te;
      ck('A10',Array.isArray(t),'tornei tenant leggibili');
      ck('A11',(t||[]).every(x=>x.azienda_id===tenant),'isolamento tornei');
      ck('A12',(t||[]).every(x=>x.id!=null&&x.nome!=null),'integrità tornei');
      const ids=(t||[]).map(x=>x.id);
      if(ids.length){
       const {data:i,error:ie}=await client.from('iscrizioni').select('id,torneo_id,azienda_id,stato,approvato').in('torneo_id',ids);
       if(ie) throw ie;
       ck('A13',Array.isArray(i),'iscrizioni leggibili');
       ck('A14',(i||[]).every(x=>x.azienda_id===tenant),'isolamento iscrizioni');
      }else{ck('A13',true,'nessun torneo presente');ck('A14',true,'nessun torneo presente')}
    }
   }
  }
  ck('A15',typeof window.caricaTorneiSupabase==='function','caricamento tornei');
  ck('A16',typeof window.selezionaTorneoAdmin==='function','selezione torneo');
  ck('A17',typeof window.pubblicaTorneo==='function','pubblicazione torneo');
  ck('A18',typeof window.chiudiIscrizioniTorneo==='function','chiusura iscrizioni');
  ck('A19',typeof window.approvaIscrizioneCentralizzata==='function','approvazione iscrizione');
  ck('A20',typeof window.apriBoveConTorneo==='function','apertura tabellone (identificatore tecnico legacy)');
  ck('A21',typeof window.openAdminCalendar==='function','calendario');
  ck('A22',typeof window.generaLinkBove==='function'&&typeof window.copiaLinkBove==='function','link pubblico');
  ck('A23',typeof window.renderCleanAdmin==='function'&&typeof window.openAdminPage==='function','render/routing Gestione torneo');
  ck('A24',!!document.querySelector('#sideTabellone')&&!!document.querySelector('#sideCalendario'),'menu Tabellone/Calendario');
 }catch(e){err('GLOBAL',e)}
 console.table(R.rows);console.log({OK:R.ok,KO:R.ko,ERRORI:R.errors.length,errors:R.errors});window.__NP_FINAL_ADMIN_TEST__=R;
})();