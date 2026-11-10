/* Eventour admin MFA: TOTP enrollment and challenge. No secrets are logged or stored locally. */
(function(){
'use strict';
function node(tag,attrs,text){const n=document.createElement(tag);Object.keys(attrs||{}).forEach(k=>n.setAttribute(k,attrs[k]));if(text!==undefined)n.textContent=text;return n;}
function makePanel(title,description){
 const overlay=node('div',{role:'dialog','aria-modal':'true','aria-label':title});Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'2147483000',background:'rgba(5,12,24,.88)',display:'flex',alignItems:'center',justifyContent:'center',padding:'18px',boxSizing:'border-box',fontFamily:'Arial,sans-serif'});
 const box=node('div');Object.assign(box.style,{width:'min(440px,100%)',maxHeight:'90vh',overflowY:'auto',background:'#fff',color:'#172033',borderRadius:'16px',padding:'24px',boxSizing:'border-box',boxShadow:'0 20px 60px rgba(0,0,0,.35)'});
 const h=node('h2',{},title);Object.assign(h.style,{margin:'0 0 10px',fontSize:'21px'});
 const p=node('p',{},description);Object.assign(p.style,{fontSize:'14px',lineHeight:'1.5',margin:'0 0 16px'});
 const status=node('p',{'aria-live':'polite'});Object.assign(status.style,{fontSize:'13px',color:'#b42318',minHeight:'18px',whiteSpace:'pre-wrap'});
 box.append(h,p);overlay.append(box);document.body.append(overlay);return{overlay,box,status,close(){overlay.remove();}};
}
function addCode(box){const label=node('label',{},'Codice di autenticazione (6 cifre)');Object.assign(label.style,{display:'block',fontWeight:'700',fontSize:'13px',margin:'14px 0 6px'});const input=node('input',{type:'text',autocomplete:'one-time-code',inputmode:'numeric',maxlength:'6'});Object.assign(input.style,{width:'100%',boxSizing:'border-box',padding:'13px',fontSize:'20px',letterSpacing:'5px',border:'1px solid #aab4c3',borderRadius:'9px'});box.append(label,input);return input;}
function addButton(box,label){const b=node('button',{type:'button'},label);Object.assign(b.style,{width:'100%',padding:'13px',marginTop:'14px',border:'0',borderRadius:'9px',background:'#153b66',color:'#fff',fontWeight:'700',fontSize:'15px',cursor:'pointer'});box.append(b);return b;}
async function verify(client,factorId,code){const ch=await client.auth.mfa.challenge({factorId});if(ch.error)throw ch.error;const result=await client.auth.mfa.verify({factorId,challengeId:ch.data.id,code:String(code||'').replace(/\\s/g,'')});if(result.error)throw result.error;const aal=await client.auth.mfa.getAuthenticatorAssuranceLevel();if(aal.error)throw aal.error;if(aal.data?.currentLevel!=='aal2')throw new Error('Verifica MFA non completata. Riprova.');}
function showCodePrompt(client,factorId,enrollData){
 return new Promise(resolve=>{
  const enrollment=!!enrollData;
  const ui=makePanel(enrollment?'Attiva la protezione MFA':'Verifica in due passaggi',enrollment?'Scansiona il QR code con Google Authenticator, Microsoft Authenticator o un’app TOTP equivalente. Poi inserisci il codice a 6 cifre generato.':'Apri la tua app autenticatore e inserisci il codice temporaneo a 6 cifre.');
  if(enrollment){
   const totp=enrollData.totp||{};
   if(totp.qr_code){const img=node('img',{src:totp.qr_code,alt:'QR code per configurare Eventour'});Object.assign(img.style,{display:'block',width:'220px',height:'220px',maxWidth:'100%',margin:'12px auto',objectFit:'contain'});ui.box.append(img);}
   if(totp.secret){const p=node('p',{},'Se non puoi scansionare il QR, inserisci manualmente questa chiave:');Object.assign(p.style,{fontSize:'13px',lineHeight:'1.4'});const secret=node('code',{},totp.secret);Object.assign(secret.style,{display:'block',padding:'10px',background:'#eef2f7',borderRadius:'7px',overflowWrap:'anywhere',userSelect:'all',fontSize:'13px'});ui.box.append(p,secret);}
  }
  const code=addCode(ui.box),submit=addButton(ui.box,enrollment?'Conferma attivazione MFA':'Verifica e continua');ui.box.append(ui.status);
  submit.addEventListener('click',async()=>{submit.disabled=true;ui.status.textContent='Verifica in corso…';try{await verify(client,factorId,code.value);ui.close();resolve(true);}catch(e){ui.status.textContent=e.message||'Codice non valido. Riprova.';submit.disabled=false;}});
  code.focus();
  const timer=setInterval(async()=>{try{const s=await client.auth.getSession();if(!s.data?.session){clearInterval(timer);ui.close();resolve(false);}}catch(e){}},2000);
 });
}
async function complete(client){
 if(!client?.auth?.mfa)throw new Error('MFA TOTP non disponibile nel client Supabase.');
 const aal=await client.auth.mfa.getAuthenticatorAssuranceLevel();if(aal.error)throw aal.error;if(aal.data?.currentLevel==='aal2')return true;
 const listed=await client.auth.mfa.listFactors();if(listed.error)throw listed.error;
 const factors=listed.data?.totp||[],verified=factors.find(f=>f.status==='verified');
 if(verified)return showCodePrompt(client,verified.id,null);
 if(factors.some(f=>f.status==='unverified'))throw new Error('Esiste già una configurazione MFA non completata. Contatta il supporto prima di riprovare: non verrà eliminata automaticamente.');
 const enrolled=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'Eventour - amministratore'});if(enrolled.error)throw enrolled.error;
 return showCodePrompt(client,enrolled.data.id,enrolled.data);
}
window.EventourAdminMFA={complete};
})();