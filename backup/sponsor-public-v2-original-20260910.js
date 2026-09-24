/* SPONSOR PUBBLICI — barra scorrevole automatica */
(function () {
    'use strict';

    function getClient() {
        return window.supabaseClient || window.sb || null;
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, function (char) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[char];
        });
    }

    function addStyles() {
        if (document.getElementById('sponsor-public-v2-style')) return;
        const style = document.createElement('style');
        style.id = 'sponsor-public-v2-style';
        style.textContent = `
#sponsor-public-wrap{display:block;width:100%;margin:22px 0 8px;padding:0;box-sizing:border-box;clear:both}
#sponsor-public-title{text-align:center;margin:0 0 10px;color:rgba(255,255,255,.88);font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;text-shadow:0 2px 8px rgba(0,0,0,.35)}
#sponsor-public-window{display:block;width:100%;overflow:hidden;border:1px solid rgba(255,255,255,.28);border-radius:20px;background:linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.055));backdrop-filter:blur(16px) saturate(145%);-webkit-backdrop-filter:blur(16px) saturate(145%);box-shadow:0 12px 34px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.18);box-sizing:border-box}
#sponsor-public-window::before{content:"";display:block;height:1px;margin:0 10%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)}
#sponsor-public-track{display:flex;align-items:center;width:max-content;min-height:76px;padding:8px 10px;box-sizing:border-box;will-change:transform}
#sponsor-public-window:hover #sponsor-public-track,#sponsor-public-window:focus-within #sponsor-public-track{animation-play-state:paused}
.sponsor-public-item{flex:0 0 auto;display:flex;align-items:center;justify-content:center;gap:12px;min-width:180px;height:58px;margin:0 7px;padding:7px 15px;border:1px solid rgba(255,255,255,.20);border-radius:16px;background:rgba(255,255,255,.08);color:#fff;text-decoration:none;box-sizing:border-box;box-shadow:inset 0 1px 0 rgba(255,255,255,.10);transition:transform .2s ease,background .2s ease,border-color .2s ease}
.sponsor-public-item:hover{transform:translateY(-2px);background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.34)}
.sponsor-public-logo{display:block;width:auto;height:auto;max-width:115px;max-height:42px;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,.22))}
.sponsor-public-name{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:800}
.sponsor-public-empty{width:100%;text-align:center;padding:15px;color:rgba(255,255,255,.70);font-size:11px}
@keyframes sponsorPublicScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media(max-width:599px){#sponsor-public-wrap{margin:18px 0 6px}#sponsor-public-title{font-size:8px;letter-spacing:1.5px}#sponsor-public-window{border-radius:17px}#sponsor-public-track{min-height:68px}.sponsor-public-item{min-width:145px;height:52px;margin:0 5px;padding:6px 10px;gap:8px;border-radius:14px}.sponsor-public-logo{max-width:82px;max-height:34px}.sponsor-public-name{max-width:100px;font-size:10px}}
`;
        document.head.appendChild(style);
    }

    function findTarget() {
        const page = location.pathname.toLowerCase();
        if (page.endsWith('/bove.html') || page.endsWith('bove.html')) {
            return document.querySelector('.container') || document.querySelector('main');
        }
        if (page.endsWith('/2page.html') || page.endsWith('2page.html')) {
            return document.querySelector('.box') || document.querySelector('main');
        }
        if (page.endsWith('/visitatore.html') || page.endsWith('visitatore.html')) {
            return document.querySelector('.container') || document.querySelector('main');
        }
        return document.querySelector('main') || document.querySelector('.container') || document.body;
    }

    function placeSponsor() {
        const wrap = document.getElementById('sponsor-public-wrap');
        const target = findTarget();
        if (!wrap || !target) return false;
        if (wrap.parentElement !== target) target.appendChild(wrap);
        return true;
    }

    function ensureUI() {
        let wrap = document.getElementById('sponsor-public-wrap');
        if (wrap) {
            placeSponsor();
            return wrap;
        }
        wrap = document.createElement('section');
        wrap.id = 'sponsor-public-wrap';
        wrap.setAttribute('aria-label', 'Sponsor');
        wrap.innerHTML = `
            <div id="sponsor-public-title">Sponsorizzato da</div>
            <div id="sponsor-public-window">
                <div id="sponsor-public-track">
                    <div class="sponsor-public-empty">Caricamento sponsor...</div>
                </div>
            </div>
        `;
        const target = findTarget();
        if (target) target.appendChild(wrap);
        else document.body.appendChild(wrap);
        return wrap;
    }

    function render(sponsors) {
        const track = document.getElementById('sponsor-public-track');
        if (!track) return;
        if (!sponsors.length) {
            track.style.animation = 'none';
            track.innerHTML = '<div class="sponsor-public-empty">Nessuno sponsor disponibile</div>';
            return;
        }
        const cards = sponsors.map(function (sponsor) {
            const logo = sponsor.immagine
                ? `<img class="sponsor-public-logo" src="${escapeHtml(sponsor.immagine)}" alt="${escapeHtml(sponsor.nome)}" loading="lazy">`
                : '';
            const name = `<span class="sponsor-public-name">${escapeHtml(sponsor.nome)}</span>`;
            const content = logo + name;
            if (sponsor.link) {
                return `<a class="sponsor-public-item" href="${escapeHtml(sponsor.link)}" target="_blank" rel="noopener noreferrer">${content}</a>`;
            }
            return `<div class="sponsor-public-item">${content}</div>`;
        }).join('');
        track.innerHTML = cards + cards;
        track.style.animation = sponsors.length > 1 ? 'sponsorPublicScroll 28s linear infinite' : 'none';
        track.style.justifyContent = sponsors.length === 1 ? 'center' : 'flex-start';
    }

    async function loadSponsors() {
        const client = getClient();
        if (!client || !client.from) return;
        try {
            const result = await client.from('sponsor').select('id,nome,immagine,video,link').order('id', { ascending: true });
            if (result.error) {
                console.error('Sponsor pubblici:', result.error);
                return;
            }
            const sponsors = (result.data || []).filter(function (sponsor) {
                return sponsor && sponsor.nome;
            });
            window.__PUBLIC_SPONSORS__ = sponsors;
            render(sponsors);
        } catch (error) {
            console.error('Errore caricamento sponsor pubblici:', error);
        }
    }

    function start() {
        addStyles();
        const page = location.pathname.toLowerCase();
        if (page.endsWith('/2page.html') || page.endsWith('2page.html')) {
            const legacy = document.querySelector('.sponsor-banner');
            if (legacy) legacy.style.display = 'none';
        }
        ensureUI();
        loadSponsors();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
