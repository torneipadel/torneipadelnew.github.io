(() => {
'use strict';

const URL = 'https://dkeqicstprvvfebiaooc.supabase.co';
const KEY = 'sb_publishable_EBgrU25BpXMp9x6a2n7_Pg_FTFa5JLu';

const esc = v => String(v ?? '').replace(/[&<>"']/g, x =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])
);

function showError(message) {
  const app = document.getElementById('app');
  if (app) app.innerHTML = '<div class="error">❌ ' + esc(message) + '</div>';
}

let bootInProgress = false;

async function boot() {
  const app = document.getElementById('app');
  if (!app || bootInProgress) return;
  bootInProgress = true;
  app.innerHTML = '<div class="loading">Caricamento Control Center…</div>';

  try {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Libreria Supabase non caricata');
    }

    const sb = window.supabase.createClient(URL, KEY);

    const auth = await sb.auth.getUser();
    if (!auth.data.user) throw new Error('Sessione Superadmin non autenticata');

    const role = await sb.rpc('is_superadmin');
    if (role.error) throw role.error;
    if (role.data !== true) throw new Error('Accesso riservato al Superadmin');

    const overviewResult = await sb.rpc('eventour_superadmin_overview');
    if (overviewResult.error) throw overviewResult.error;
    const overview = overviewResult.data || {};
    const companies = Array.isArray(overview.companies) ? overview.companies : [];
    const plans = Array.isArray(overview.plans) ? overview.plans : [];

    const rows = companies.map(c => ({
      ...c,
      plan: c.plan || 'NON ASSEGNATO',
      status: c.status || c.stato || '—',
      expires: c.expires || null,
      users: Number(c.users || 0),
      admins: Number(c.admins || 0),
      activeTournaments: Number(c.activeTournaments || 0),
      content: Number(c.content || 0),
      photos: Number(c.photos || 0),
      p: c.plan_config || {}
    }));

    const countPlan = code => rows.filter(r => r.plan === code).length;
    const totalUsers = rows.reduce((sum, r) => sum + r.users, 0);
    const totalTournaments = rows.reduce((sum, r) => sum + r.activeTournaments, 0);
    const totalNews = rows.reduce((sum, r) => sum + r.content, 0);

    app.innerHTML = `
      <section class="hero-grid">
        <div class="hero-card"><span>Società</span><b>${companies.length}</b><small>tenant</small></div>
        <div class="hero-card"><span>START</span><b>${countPlan('START')}</b><small>piano</small></div>
        <div class="hero-card"><span>PRO</span><b>${countPlan('PRO')}</b><small>piano</small></div>
        <div class="hero-card"><span>BUSINESS</span><b>${countPlan('BUSINESS')}</b><small>piano</small></div>
        <div class="hero-card"><span>Utenti</span><b>${totalUsers}</b><small>attivi</small></div>
        <div class="hero-card"><span>Tornei</span><b>${totalTournaments}</b><small>attivi</small></div>
        <div class="hero-card"><span>News</span><b>${totalNews}</b><small>contenuti</small></div>
        <div class="hero-card"><span>MRR</span><b>—</b><small>prezzi da configurare</small></div>
      </section>

      <section class="panel">
        <div class="panel-title"><div><h2>Aziende</h2><p>Azienda → Piano → Funzioni → Consumi → Limiti.</p></div>
        <input id="search" placeholder="Cerca società…"></div>
        <div class="table-wrap"><table><thead><tr>
          <th>Società</th><th>Piano</th><th>Stato</th><th>Scadenza</th>
          <th>Utenti/Admin</th><th>Tornei</th><th>News</th><th>Limiti</th>
        </tr></thead><tbody>
        ${rows.map(r => `<tr>
          <td><b>${esc(r.ragione_sociale || r.nome_app || r.slug)}</b><small>${esc(r.slug || '')}</small></td>
          <td><span class="plan ${esc(r.plan)}">${esc(r.plan)}</span></td>
          <td>${esc(r.status || r.stato || '-')}</td>
          <td>${r.expires ? new Date(r.expires).toLocaleDateString('it-IT') : '—'}</td>
          <td>${r.users} / ${r.admins}<small>max ${r.p.max_admins ?? '—'}</small></td>
          <td>${r.activeTournaments} / ${r.p.max_active_tournaments ?? '—'}</td>
          <td>${r.content} / ${r.p.max_news ?? '—'}</td>
          <td>Foto/contenuti: ${r.photos} / ${r.p.max_photos ?? '—'}<br>Storage: n/d</td>
        </tr>`).join('')}
        </tbody></table></div>
      </section>

      <section class="grid2">
        <div class="panel"><div class="panel-title"><div><h2>Piani e permessi</h2><p>Un solo motore EVENTOUR.</p></div></div>
          <div class="plan-grid">
          ${plans.map(p => `<article class="plan-card"><h3>${esc(p.name)}</h3>
            <div class="big">${Number(p.monthly_price) ? Number(p.monthly_price).toLocaleString('it-IT',{style:'currency',currency:'EUR'}) : 'Prezzo da configurare'}</div>
            <ul><li>Storage: ${p.storage_mb} MB</li><li>Foto: ${p.max_photos}</li><li>News: ${p.max_news}</li>
            <li>Tornei attivi: ${p.max_active_tournaments}</li><li>Admin: ${p.max_admins}</li>
            <li>Statistiche: ${p.stats_advanced ? 'avanzate' : 'base'}</li>
            <li>Automazioni: ${esc(p.automations_level)}</li><li>Personalizzazione: ${esc(p.customization_level)}</li>
            <li>Report: ${esc(p.reports_level)}</li><li>Premium: ${esc(p.premium_level)}</li></ul>
          </article>`).join('')}
          </div>
        </div>
        <div class="panel"><div class="panel-title"><div><h2>Risorse piattaforma</h2><p>Monitoraggio applicativo.</p></div></div>
          <div class="resource-list">
            <div><b>Supabase</b><span>${companies.length} aziende · ${totalUsers} utenti · ${totalTournaments} tornei attivi</span></div>
            <div><b>GitHub</b><span>Repository unico EVENTOUR</span></div>
            <div><b>Aruba</b><span>Telemetry non collegata</span></div>
            <div><b>Storage</b><span>Telemetry per byte non ancora collegata</span></div>
          </div>
        </div>
      </section>
    `;

    document.getElementById('search').oninput = e => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('tbody tr').forEach(tr =>
        tr.style.display = tr.innerText.toLowerCase().includes(q) ? '' : 'none'
      );
    };
  } catch (e) {
    showError(e && e.message ? e.message : String(e));
  } finally {
    bootInProgress = false;
  }
}

window.addEventListener('error', e => showError(e.message || 'Errore JavaScript'));
window.addEventListener('unhandledrejection', e => showError(e.reason?.message || e.reason || 'Errore promessa'));
window.addEventListener('DOMContentLoaded', () => {
  const refreshBtn = document.getElementById('refreshBtn');
  const backBtn = document.getElementById('backBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', async () => {
    if (bootInProgress) return;
    refreshBtn.disabled = true;
    const originalLabel = refreshBtn.textContent;
    refreshBtn.textContent = 'Aggiornamento…';
    try { await boot(); }
    finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = originalLabel;
    }
  });
  if (backBtn) backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  boot();
}, {once:true});
})();