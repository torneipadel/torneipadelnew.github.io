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

async function boot() {
  const app = document.getElementById('app');
  if (!app) return;

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

    const results = await Promise.all([
      sb.from('aziende').select('id,ragione_sociale,nome_app,slug,stato,created_at,demo_scadenza').order('ragione_sociale'),
      sb.from('eventour_plans').select('*').order('code'),
      sb.from('eventour_company_plans').select('azienda_id,plan_code,starts_at,expires_at,status'),
      sb.from('tornei').select('id,azienda_id,stato,nome'),
      sb.from('azienda_utenti').select('azienda_id,user_id,ruolo,attivo'),
      sb.from('news').select('id,azienda_id'),
      sb.from('sponsor').select('id,azienda_id'),
      sb.from('mercatino').select('id,azienda_id')
    ]);

    results.forEach(r => { if (r.error) throw r.error; });

    const companies = results[0].data || [];
    const plans = results[1].data || [];
    const assignments = results[2].data || [];
    const tournaments = results[3].data || [];
    const users = results[4].data || [];
    const news = results[5].data || [];
    const sponsors = results[6].data || [];
    const market = results[7].data || [];

    const planMap = Object.fromEntries(plans.map(p => [p.code, p]));
    const assignmentMap = Object.fromEntries(assignments.map(a => [a.azienda_id, a]));

    const rows = companies.map(c => {
      const a = assignmentMap[c.id] || {plan_code:'START',status:'active'};
      const p = planMap[a.plan_code] || {};
      const activeUsers = users.filter(u => u.azienda_id === c.id && u.attivo !== false);
      const admins = activeUsers.filter(u => ['owner','admin','superadmin'].includes(String(u.ruolo || '').toLowerCase())).length;
      const activeTournaments = tournaments.filter(t => t.azienda_id === c.id &&
        !['chiuso','archiviato','annullato'].includes(String(t.stato || '').toLowerCase())).length;
      const content = news.filter(n => n.azienda_id === c.id).length;
      const photos = sponsors.filter(s => s.azienda_id === c.id).length +
                     market.filter(m => m.azienda_id === c.id).length + content;
      return {...c, plan:a.plan_code, status:a.status, expires:a.expires_at,
              users:activeUsers.length, admins, activeTournaments, content, photos, p};
    });

    const countPlan = code => rows.filter(r => r.plan === code).length;
    const totalUsers = users.filter(u => u.attivo !== false).length;

    app.innerHTML = `
      <section class="hero-grid">
        <div class="hero-card"><span>Società</span><b>${companies.length}</b><small>tenant</small></div>
        <div class="hero-card"><span>START</span><b>${countPlan('START')}</b><small>piano</small></div>
        <div class="hero-card"><span>PRO</span><b>${countPlan('PRO')}</b><small>piano</small></div>
        <div class="hero-card"><span>BUSINESS</span><b>${countPlan('BUSINESS')}</b><small>piano</small></div>
        <div class="hero-card"><span>Utenti</span><b>${totalUsers}</b><small>attivi</small></div>
        <div class="hero-card"><span>Tornei</span><b>${tournaments.length}</b><small>totali</small></div>
        <div class="hero-card"><span>News</span><b>${news.length}</b><small>contenuti</small></div>
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
            <div><b>Supabase</b><span>${companies.length} aziende · ${totalUsers} utenti · ${tournaments.length} tornei</span></div>
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
  }
}

window.addEventListener('error', e => showError(e.message || 'Errore JavaScript'));
window.addEventListener('unhandledrejection', e => showError(e.reason?.message || e.reason || 'Errore promessa'));
window.addEventListener('DOMContentLoaded', boot, {once:true});
})();