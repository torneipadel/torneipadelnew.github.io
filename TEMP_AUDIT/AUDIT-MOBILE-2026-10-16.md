# Audit responsività mobile — 16 ottobre 2026

Repository: `torneipadel/torneipadelnew.github.io`

## Perimetro e metodo
- Esaminate le 37 pagine HTML attive nella root del sito.
- Controllati meta viewport, breakpoint CSS, larghezze/min-width rigide, tabelle, overflow e fogli di stile condivisi.
- Interventi limitati a CSS responsive e meta viewport; nessuna modifica alla logica JavaScript, autenticazione, menu o gestione dei tornei.
- **Limite della verifica:** audit statico dei sorgenti GitHub. Non è stata eseguita una prova visuale con browser emulato o smartphone fisico alle larghezze 320/375/390/430 px; quindi non si dichiara una certificazione visiva completa.

## Correzioni applicate e verificate nel sorgente GitHub

| File | Correzione mobile | Commit |
|---|---|---|
| `login-utente.html` | Card a larghezza contenuta nel viewport e padding mobile ridotto a 24 px (max 600 px). | [4de65f3](https://github.com/torneipadel/torneipadelnew.github.io/commit/4de65f34ed419e40f0fb9dcea32b2634356ce797) |
| `login-societa-admin.html` | Card con `box-sizing:border-box`, larghezza fluida e padding 24 px fino a 600 px. | [751d9e4](https://github.com/torneipadel/torneipadelnew.github.io/commit/751d9e4df47cdd3809b420b62c49192a9b864cb5) |
| `superadmin-login.html` | Card limitata alla larghezza del viewport con margine laterale mobile e padding 24 px fino a 600 px. | [f6bdb95](https://github.com/torneipadel/torneipadelnew.github.io/commit/f6bdb9587ef3fb09a5c0c04bc1c2c84e7fff6de2) |
| `reset-password.html` | Larghezza del riquadro ridotta automaticamente sotto 350 px, evitando overflow sui telefoni stretti. | [bbf23e5](https://github.com/torneipadel/torneipadelnew.github.io/commit/bbf23e5fb92a271e69d6eacfa0c64158d7301e72) |
| `manuale.html` | Tabelle scorrevoli orizzontalmente su schermi fino a 650 px; testo delle celle può andare a capo. | [483a502](https://github.com/torneipadel/torneipadelnew.github.io/commit/483a50291dfefa40a30ed4b52106fcef4bccbc6d) |
| `manuale-tecnico-completo.html` | Tabelle scorrevoli orizzontalmente su schermi fino a 650 px; testo delle celle può andare a capo. | [bf86cea](https://github.com/torneipadel/torneipadelnew.github.io/commit/bf86cea43a2b564886bb8627f072efeeb35e7bc2) |
| `tabellone.html` | Rimosso il blocco dello zoom pinch-to-zoom su smartphone; mantenuti i breakpoint e lo scorrimento delle aree del tabellone. | [faf0198](https://github.com/torneipadel/torneipadelnew.github.io/commit/faf0198d0b11eb7c75d591a43b9940146e40634f) |

## Inventario delle 37 pagine controllate

| Pagina | Esito del controllo sorgente |
|---|---|
| `2Page.html` | Viewport presente; pagina minimale |
| `admin-mercatino.html` | Viewport e breakpoint mobile presenti |
| `admin.html` | Viewport presente; layout responsive nei CSS condivisi |
| `configura-app.html` | Viewport presente; pagina minimale |
| `configurazione-app.html` | Viewport e breakpoint mobile presenti |
| `contatti.html` | Viewport e breakpoint mobile presenti |
| `cookie.html` | Viewport e breakpoint mobile presenti |
| `dashboard.html` | Viewport e regole mobile presenti |
| `eventour-control-center.html` | Viewport presente; responsive nel CSS collegato |
| `index.html` | Viewport e breakpoint mobile presenti |
| `informazioni.html` | Viewport e breakpoint mobile presenti |
| `iscrizione.html` | Viewport e breakpoint mobile presenti |
| `locandina.html` | Viewport e breakpoint mobile presenti |
| `login-societa-admin.html` | Viewport presente; corretta la card mobile |
| `login-utente.html` | Viewport presente; affinata la card mobile |
| `login.html` | Viewport e breakpoint mobile presenti |
| `manuale-tecnico-completo.html` | Viewport presente; corretto scorrimento tabelle mobile |
| `manuale.html` | Viewport presente; corretto scorrimento tabelle mobile |
| `mercatino.html` | Viewport e breakpoint mobile presenti |
| `news.html` | Viewport e breakpoint mobile presenti |
| `privacy.html` | Viewport e breakpoint mobile presenti |
| `profilo.html` | Viewport e breakpoint mobile presenti |
| `registrazione-demo.html` | Viewport presente; layout fluido |
| `registrazione-piva.html` | Viewport presente; layout fluido |
| `registrazione-societa.html` | Viewport e breakpoint mobile presenti |
| `registrazione-utente.html` | Viewport e breakpoint mobile presenti |
| `reset-password.html` | Viewport presente; corretta la larghezza mobile |
| `societa.html` | Viewport e breakpoint mobile presenti |
| `sponsor-pubblico.html` | Viewport e breakpoint mobile presenti |
| `sponsor.html` | Viewport presente; contenitori fluidi |
| `superadmin-login.html` | Viewport presente; corretta la card mobile |
| `tabellone.html` | Viewport presente; scorrimento delle aree e zoom mobile consentito |
| `termini.html` | Viewport e breakpoint mobile presenti |
| `tv.html` | Viewport e breakpoint mobile presenti |
| `utenti-societa.html` | Viewport e breakpoint mobile presenti; tabella in contenitore scorrevole |
| `visitatore.html` | Viewport e breakpoint mobile presenti |
| `wansport.html` | Viewport e breakpoint mobile presenti |

## Vincoli preservati
- Nessuna modifica ai fogli di stile desktop approvati.
- Nessuna modifica a JavaScript funzionale, autenticazione, menu, dati o flussi dei tornei.
- Nessuna pagina attiva eliminata o spostata.
