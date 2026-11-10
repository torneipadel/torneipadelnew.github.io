/* Eventour admin MFA: TOTP enrollment and challenge. No secrets are logged or stored locally. */
(function(){
  'use strict';
  function el(tag,attrs,text){const n=document.createElement(tag);Object.keys(attrs||{}).forEach(k=>{if(k==='style')Object.assign(n.style,attrs[k]);else n.setAttribute(k,attrs[k])});if(text!==undefined)n.textContent=text;return n;}
  function panel(title,description){
    const overlay=el('div',{role:'dialog','aria-modal':'true','aria-label':title});
    Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'2147483000',background:'rgba(5,12,24,.88)',display:'flex',alignItems:'center',justifyContent:'center',padding:'18px',boxSizing:'border-box',fontFamily:'Arial,sans-serif'});
    const box=el('div',{});Object.assign(box.style,{width:'min(440px,100%)',maxHeight:'90vh',overflowY:'auto',background:'#fff',color:'#172033',borderRadius:'16px',padding:'24px',boxSizing:'border-box',boxShadow:'0 20px 60px rgba(0,0,0,.35)'});
    const h=el('h2',{},title);Object.assign(h.style,{margin:'0 0 10px',fontSize:'21px'});
    const p=el('p',{},description);Object.assign(p.style,{fontSize:'14px',lineHeight:'1.5',margin:'0 0 16px'});
    const status=el('p',{'aria-live':'polite'});Object.assign(status.style,{fontSize:'13px',color:'#b42318',minHeight:'18px',whiteSpace:'pre-wrap'});
    box.append(h,p);overlay.append(box);document.body.append(overlay);
    return {overlay,box,status,close(){overlay.remove();}};
  }
  function field(parent,labelText,attrs){
    const label=el('label',{},labelText);Object.assign(label.style,{display:'block',fontWeight:'700',fontSize:'13px',margin:'14px 0 6px'});
    const input=el('input',Object.assign({type:'text',autocomplete:'one-time-code',inputmode:'numeric',maxlength:'6'},attrs||{}));Object.assign(input.style,{width:'100%',boxSizing:'border-box',padding:'13px',fontSize:'20px',letterSpacing:'5px',border:'1px solid #aab4c3',borderRadius:'9px'});
    parent.append(label,input);return input;
  }
  function button(parent,label){
    const b=el('button',{type:'button'},label);Object.assign(b.style,{width:'100%',padding:'13px',marginTop:'14px',border:'0',borderRadius:'9px',background:'#153b66',color:'#fff',fontWeight:'700',fontSize:'15px',cursor:'pointer'});parent.append(b);return b;
  }
  async function finish(client, factorId, code, challengeId){
    const verified=await client.auth.mfa.verify({factorId,challengeId,code:String(code||'').replace(/\s/g,'')});
    if(verified.error)throw verified.error;
    const aal=await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aal.error)throw aal.error;
    if(aal.data?.currentLevel!=='aal2')throw new Error('Verifica MFA non completata. Riprova.');
  }
  async function complete(client){
    if(!client?.auth?.mfa)throw new Error('MFA TOTP non disponibile nel client Supabase.');
    const aal=await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aal.error)throw aal.error;
    if(aal.data?.currentLevel==='aal2')return true;
    const listed=await client.auth.mfa.listFactors();
    if(listed.error)throw listed.error;
    const factors=(listed.data?.totp||[]);
    const verified=factors.find(f=>f.status==='verified');
    if(verified){
      const ui=panel('Verifica in due passaggi','Apri la tua app autenticatore e inserisci il codice temporaneo a 6 cifre.');
      const code=field(ui.box,'Codice di autenticazione');
      const submit=button(ui.box,'Verifica e continua');
      ui.box.append(ui.status);
      submit.addEventListener('click',async()=>{
        submit.disabled=true;ui.status.textContent='Verifica in corso…';
        try{const ch=await client.auth.mfa.challenge({factorId:verified.id});if(ch.error)throw ch.error;await finish(client,verified.id,code.value,ch.data.id);ui.close();location.reload();}
        catch(e){ui.status.textContent=e.message||'Codice non valido. Riprova.';submit.disabled=false;}
      });
      code.focus();
      return await new Promise(resolve=>{const timer=setInterval(async()=>{const s=await client.auth.getSession();if(!s.data?.session){clearInterval(timer);ui.close();resolve(false);}},1500);});
    }
    const pending=factors.find(f=>f.status==='unverified');
    if(pending)throw new Error('Esiste già una configurazione MFA non completata. Contatta il supporto prima di riprovare: non verrà eliminata automaticamente.');
    const enrolled=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'Eventour - amministratore'});
    if(enrolled.error)throw enrolled.error;
    const factorId=enrolled.data.id;
    const totp=enrolled.data.totp||{};
    const ui=panel('Attiva la protezione MFA','1. Scansiona il QR code con Google Authenticator, Microsoft Authenticator o un’app TOTP equivalente. 2. Inserisci qui il codice a 6 cifre generato.');
    if(totp.qr_code){const img=el('img',{src:totp.qr_code,alt:'QR code per configurare Eventour'});Object.assign(img.style,{display:'block',width:'220px',height:'220px',maxWidth:'100%',margin:'12px auto',objectFit:'contain'});ui.box.append(img);}
    if(totp.secret){const secretLabel=el('p',{},'Se non puoi scansionare il QR, inserisci manualmente questa chiave:');Object.assign(secretLabel.style,{fontSize:'13px',lineHeight:'1.4'});const secret=el('code',{},totp.secret);Object.assign(secret.style,{display:'block',padding:'10px',background:'#eef2f7',borderRadius:'7px',overflowWrap:'anywhere',userSelect:'all',fontSize:'13px'});ui.box.append(secretLabel,secret);}
    const code=field(ui.box,'Codice generato dall’app autenticatore');
    const submit=button(ui.box,'Conferma attivazione MFA');
    ui.box.append(ui.status);
    submit.addEventListener('click',async()=>{
      submit.disabled=true;ui.status.textContent='Attivazione in corso…';
      try{const ch=await client.auth.mfa.challenge({factorId});if(ch.error)throw ch.error;await finish(client,factorId,code.value,ch.data.id);ui.close();location.reload();}
      catch(e){ui.status.textContent=e.message||'Codice non valido. Riprova.';submit.disabled=false;}
    });
    code.focus();
    return await new Promise(resolve=>{const timer=setInterval(async()=>{const s=await client.auth.getSession();if(!s.data?.session){clearInterval(timer);ui.close();resolve(false);}},1500);});
  }
  window.EventourAdminMFA={complete};
})();