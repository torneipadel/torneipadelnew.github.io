(()=>{'use strict';
/*
 * Instradamento compatibile con il flusso originale Comunicazioni.
 * Locandine & articoli deve aprire il gestore News esistente, non sostituire
 * #appContent con una pagina separata e una tela bianca senza contenuti.
 */
function openExistingNews(){
 const overlay=document.getElementById('mobileOverlay');
 overlay?.classList.remove('open');
 if(typeof window.openAdminComPage==='function'){
  window.openAdminComPage('news');
  return;
 }
 if(typeof window.openAdminPage==='function'){
  window.openAdminPage('torneo');
  console.error('Gestore News non disponibile: ripristinata la schermata torneo.');
  return;
 }
 console.error('Gestore News non disponibile: impossibile aprire Locandine & articoli.');
}
window.openEventourPosterEditor=openExistingNews;
function capture(e){
 const b=e.target?.closest?.('#sideLocandineArticles, #mobileLocandineArticles, [data-com-page="locandine"]');
 if(!b)return;
 e.preventDefault();
 e.stopPropagation();
 e.stopImmediatePropagation();
 openExistingNews();
}
document.addEventListener('click',capture,true);
window.openAdminComPage=(function(previous){
 return function(page,...args){
  if(page==='locandine'){openExistingNews();return}
  return previous?.call(this,page,...args);
 };
})(window.openAdminComPage);
})();