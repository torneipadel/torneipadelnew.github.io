# Inventario repository — Eventour

**Rilevazione:** 8 novembre 2026  
**Repository:** `torneipadel/torneipadelnew.github.io`  
**Branch analizzato:** `main`  
**Commit base dell'audit:** `c2d945e13280b66a6c2e62e3276b03c183eb377d`

## Fotografia del repository

La scansione ricorsiva Git del commit indicato ha rilevato:
- **370 file**
- **13 directory**
- **135 file HTML**
- **121 file JavaScript**

Il conteggio comprende anche archivi, documentazione, script, workflow e file di servizio: non rappresenta il numero di file caricati dal browser.

## Pagine e dipendenze operative confermate

- `tabellone.html` è la pagina corrente del tabellone.
- `bove-admin-flow-fix.js` è caricato direttamente da `tabellone.html`: va conservato.
- `scripts/build-legacy-tabellone.js` è richiamato da `npm run build:legacy-tabellone` nel workflow Pages e compila il tabellone per Safari 10.3.
- `tabellone-legacy-polyfills.js` è una dipendenza del processo di compatibilità.
- `admin.html` carica `admin-creazione-locandine-articoli-v1.js`, che implementa la funzione di creazione locandine e articoli.
- `site-navigation-v1.js`, `mobile-layout-fixes.css` e i moduli specifici delle pagine sono referenziati da più pagine.
- Il Service Worker `sw.js` e `manifest.json` fanno parte della configurazione PWA.

**Precisazione sul nome BOVE:** nel codice corrente sono ancora presenti identificatori, commenti e funzioni con prefisso `bove`. Sono riferimenti interni storici e non autorizzano a cancellare i moduli che li contengono. Il file `Bove.html` non è presente nel branch `main); la pagina da mantenere è `tabellone.html`.

## Directory di archivio e manutenzione

- `TEMP_AUDIT/`: 187 file di prove, copie e materiali temporanei. Non sono stati cancellati.
- `backup/`: archivio versionato. Non è stato cancellato.
- `docs/`: documentazione e materiali di riferimento.
- `documentazione-tecnica-next-point-padel/`: documentazione tecnica.
- `scripts/`: script di build.
- `supabase/`: funzione e migrazioni database.
- `loghi/`: risorse grafiche.

La modifica proposta al workflow Pages esclude `TEMP_AUDIT/` e `backup/` dall'artefatto pubblicato, lasciando intatti i file nel repository.

## Workflow GitHub Actions

- `.github/workflows/deploy-pages.yml`: workflow di pubblicazione Pages; la versione aggiornata prepara una cartella `_site` senza gli archivi di audit/backup.
- `.github/workflows/backup-completo-zip.yml`: crea un archivio ZIP e un bundle Git scaricabili come artifact.
- `.github/workflows/superadmin-code-backup.yml`: gestisce il bridge di backup/ripristino; il ramo giornaliero viene aggiornato solo se l'avanzamento è fast-forward, senza force-push.
- Il vecchio workflow `patch-bove-sponsor.yml` è stato disattivato e conservato in `\.github/workflow-archive/`: forzava il riferimento sponsor alla versione v10 e poteva sovrascrivere versioni più recenti.

## Elementi che NON vanno eliminati sulla sola base del nome

- `bove-admin-flow-fix.js` e gli altri moduli BOVE ancora richiamati.
- Script caricati dinamicamente o attraverso funzioni runtime.
- Pagine raggiungibili tramite link esterni, QR code o URL diretti.
- Migrazioni Supabase vuote di compatibilità: due file datati 15 ottobre sono placeholder intenzionali che documentano le migrazioni canoniche precedenti.
- Directory `TEMP_AUDIT/` e `backup/` prima di un'eventuale decisione separata di archiviazione o cancellazione.

## Limiti della verifica

La scansione dei riferimenti HTML è stata eseguita sulle pagine principali e su un gruppo di pagine amministrative/pubbliche; non costituisce una prova universale dell'assenza di utilizzi esterni o caricamenti dinamici per tutti i 370 file. Per questo motivo non viene dichiarato alcun file HTML inutilizzato con certezza sulla sola base dell'assenza di link interni.

**Regola di manutenzione:** prima di eliminare un file candidato occorre controllare riferimenti in tutto il repository, caricamenti dinamici, workflow, cronologia Git e possibili URL diretti esterni. In caso di dubbio, conservarlo o spostarlo in archivio solo dopo verifica.
