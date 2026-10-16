(()=> {
  'use strict';
  const panel=document.getElementById('linkPubblicoVisibile');
  const desktopButton=document.getElementById('sidePublicLink');
  const mobileButton=document.getElementById('mobilePublicLink');
  const sidebar=desktopButton?.closest('.nav');
  const mobileNav=mobileButton?.closest('.mobile-nav');
  if(!panel||!desktopButton||!mobileButton||!sidebar||!mobileNav)return;
  function placeAfter(button){
    button.insertAdjacentElement('afterend',panel);
  }
  function toggle(button){
    const wasOpen=!panel.classList.contains('hidden');
    placeAfter(button);
    panel.classList.toggle('hidden',wasOpen);
    button.setAttribute('aria-expanded',String(!wasOpen));
    const other=button===desktopButton?mobileButton:desktopButton;
    other.setAttribute('aria-expanded','false');
  }
  desktopButton.setAttribute('aria-expanded','false');
  mobileButton.setAttribute('aria-expanded','false');
  desktopButton.addEventListener('click',()=>toggle(desktopButton));
  mobileButton.addEventListener('click',()=>toggle(mobileButton));
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      panel.classList.add('hidden');
      desktopButton.setAttribute('aria-expanded','false');
      mobileButton.setAttribute('aria-expanded','false');
    }
  });
})();