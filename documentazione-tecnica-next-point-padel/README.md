# EVENTOUR — Documentazione tecnica

## Repository operativo
- Repository GitHub: `torneipadel/torneipadelnew.github.io`
- Branch di pubblicazione: `main`
- Pagina principale del tabellone: `tabellone.html`
- Hosting: GitHub Pages
- Backend: Supabase

Questa cartella conserva la documentazione tecnica storica e corrente del progetto Eventour. Alcuni nomi interni, commenti e moduli mantengono il riferimento storico **BOVE**: tale denominazione non implica che esista ancora una pagina `Bove.html`.

## Contenuti
- `MANUALE-TECNICO.md` — manuale completo.
- `ARCHITETTURA.md` — architettura e flussi.
- `DATABASE-SUPABASE.md` — schema, relazioni, RLS, trigger e funzioni.
- `BOVE-MOTORE-TORNEI.md` — documentazione del motore ora eseguito da `tabellone.html`; il nome del documento è storico.
- `ADMIN.md` — console amministrativa.
- `AREA-PUBBLICA.md` — area pubblica.
- `KING-COPPIE-VARIABILI.md` — modulo King.
- `DEPLOYMENT.md` — GitHub, Actions e Pages.
- `TEST-E-VERIFICHE.md` — test e verifiche.
- `INVENTARIO-FILE.md` — inventario del repository.

## Regola documentale
Ogni informazione non verificata direttamente nel codice o nel progetto Supabase corretto deve essere indicata come **DA VERIFICARE**. Le copie di backup e i file di audit non devono essere considerati automaticamente componenti runtime.

## Regola di manutenzione
Prima di rimuovere un file, verificare riferimenti HTML, import, caricamenti dinamici, chiamate runtime, workflow e possibili URL diretti esterni. La sola assenza di riferimenti interni non dimostra che una pagina pubblica non venga più utilizzata.
