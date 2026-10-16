(()=> {
  'use strict';
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const isDashboard = page === 'dashboard.html';
  const style = document.createElement('style');
  style.textContent = `
    .site-global-back{position:fixed!important;top:16px!important;left:16px!important;z-index:2147483000!important;width:38px!important;height:38px!important;display:flex!important;align-items:center!important;justify-content:center!important;border:1px solid rgba(255,255,255,.28)!important;border-radius:12px!important;background:rgba(7,25,45,.72)!important;color:#fff!important;box-shadow:0 5px 18px rgba(0,0,0,.22)!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important;font:700 23px/1 Arial,sans-serif!important;text-decoration:none!important;cursor:pointer!important;padding:0!important}
    .site-global-back:hover{background:rgba(7,25,45,.9)!important;transform:translateY(-1px)}
    html.site-no-dashboard-menu .menu-button:not([data-site-keep-menu-control]),html.site-no-dashboard-menu .mobile-menu:not([data-site-keep-menu-control]),html.site-no-dashboard-menu .hamburger:not([data-site-keep-menu-control]),html.site-no-dashboard-menu [data-hamburger]:not([data-site-keep-menu-control]),html.site-no-dashboard-menu [aria-label="Apri menu"]:not([data-site-keep-menu-control]),html.site-no-dashboard-menu [aria-label="Apri il menu"]:not([data-site-keep-menu-control]){display:none!important;visibility:hidden!important;pointer-events:none!important}
    .site-dashboard-menu-button{position:fixed;top:16px;right:16px;z-index:2147483001;width:42px;height:42px;border:1px solid rgba(255,255,255,.25);border-radius:12px;background:rgba(7,25,45,.72);color:#fff;font:700 23px/1 Arial,sans-serif;cursor:pointer;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
    .site-dashboard-menu-panel{position:fixed;top:64px;right:16px;z-index:2147483001;display:none;min-width:190px;padding:8px;border:1px solid rgba(255,255,255,.22);border-radius:14px;background:rgba(7,25,45,.94);box-shadow:0 12px 30px rgba(0,0,0,.3);backdrop-filter:blur(16px)}
    .site-dashboard-menu-panel.open{display:grid;gap:4px}
    .site-dashboard-menu-panel a{display:block;padding:10px 12px;border-radius:8px;color:#fff;text-decoration:none;font:600 12px/1.3 Arial,sans-serif}
    .site-dashboard-menu-panel a:hover{background:rgba(255,255,255,.12)}
    body:has(>.exit-public)>.exit-public{top:auto!important;bottom:16px!important;left:auto!important;right:16px!important}
    @media(max-width:600px){.site-global-back{top:12px!important;left:12px!important;width:36px!important;height:36px!important}.site-dashboard-menu-button{top:12px;right:12px}.site-dashboard-menu-panel{top:60px;right:12px}}
  `;
  document.head.appendChild(style);
  if (!isDashboard) document.documentElement.classList.add('site-no-dashboard-menu');

  // Keep existing navigation functions accessible without showing hamburger icons off-dashboard.
  document.querySelectorAll('.menu-button,.mobile-menu,.hamburger,[aria-label="Apri menu"],[aria-label="Apri il menu"]').forEach(el => {
    if (isDashboard) return;
    el.dataset.siteKeepMenuControl = '1';
    if (page === 'tabellone.html' && el.classList.contains('menu-button')) {
      el.textContent = '⚙️ Regole';
      el.setAttribute('aria-label', 'Apri regole e formato del tabellone');
    } else {
      const text = (el.innerText || el.textContent || '').trim();
      if (!text || /^[☰≡\u2630\s]+$/.test(text)) el.textContent = 'Menu';
      el.setAttribute('aria-label', 'Menu di navigazione');
    }
    el.style.width = 'auto';
    el.style.minWidth = '72px';
    el.style.padding = '0 12px';
    el.style.fontSize = '13px';
  });

  function hasNavigationBack() {
    const candidates = document.querySelectorAll('.brand-back,.btn-back,.back,[aria-label*="indietro" i]');
    for (const el of candidates) {
      if (el.closest('[role="dialog"],dialog,.modal,[id*="Modal"],[id*="modal"]')) continue;
      if (el.classList.contains('brand-back') || el.classList.contains('btn-back')) return true;
      const text = (el.innerText || el.textContent || '').trim();
      const action = (el.getAttribute('onclick') || '').toLowerCase();
      if (el.id === 'back' || /indietro|torna|←|\bback\b/i.test(text) ||
          /history\.back|location\.href|location\.assign|tornatornei/.test(action)) return true;
    }
    return false;
  }

  if (!hasNavigationBack()) {
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'site-global-back';
    back.textContent = '←';
    back.setAttribute('aria-label', 'Torna indietro');
    back.title = 'Torna indietro';
    back.addEventListener('click', () => {
      if (window.history.length > 1) window.history.back();
      else if (page !== 'index.html') window.location.href = 'index.html';
    });
    document.body.appendChild(back);
  }

  if (isDashboard) {
    // Dashboard owns the only visible hamburger. Keep the menu self-contained and non-invasive.
    if (!document.querySelector('.site-dashboard-menu-button')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'site-dashboard-menu-button';
      button.textContent = '☰';
      button.setAttribute('aria-label', 'Apri menu');
      button.setAttribute('aria-expanded', 'false');
      const panel = document.createElement('nav');
      panel.className = 'site-dashboard-menu-panel';
      panel.setAttribute('aria-label', 'Menu dashboard');
      const links = [
        ['Home', 'index.html'],
        ['Tornei', 'visitatore.html'],
        ['News', 'news.html'],
        ['Sponsor', 'sponsor-pubblico.html'],
        ['Contatti', 'contatti.html']
      ];
      const query = new URLSearchParams(location.search);
      links.forEach(([label, href]) => {
        const link = document.createElement('a');
        link.textContent = label;
        if (query.has('azienda')) link.href = href + '?azienda=' + encodeURIComponent(query.get('azienda'));
        else link.href = href;
        panel.appendChild(link);
      });
      button.addEventListener('click', () => {
        const open = panel.classList.toggle('open');
        button.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', event => {
        if (!button.contains(event.target) && !panel.contains(event.target)) {
          panel.classList.remove('open');
          button.setAttribute('aria-expanded', 'false');
        }
      });
      document.body.append(button, panel);
    }
  }
})();