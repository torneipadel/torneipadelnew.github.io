# Deployment e infrastruttura — Eventour

## Repository operativo
- Repository: `torneipadel/torneipadelnew.github.io`
- Branch pubblicato: `main`
- Hosting: GitHub Pages
- Pagina corrente del tabellone: `tabellone.html`

## Workflow di pubblicazione
File: `.github/workflows/deploy-pages.yml`

Trigger:
- push su `main`;
- avvio manuale (`workflow_dispatch`).

Passaggi principali:
1. checkout del repository;
2. installazione delle dipendenze di compilazione;
3. esecuzione di `npm run build:legacy-tabellone` per la compatibilità Safari 10.3;
4. preparazione dell'artefatto Pages nella cartella `_site`;
5. esclusione di `TEMP_AUDIT/`, `backup/`, `.github/`, `.git/` e `node_modules/` dall'artefatto;
6. upload e deploy su GitHub Pages.

L'esclusione dall'artefatto non cancella né modifica le directory archivio nel repository.

## Backup e ripristino
- `.github/workflows/backup-completo-zip.yml` genera un archivio ZIP e un bundle della cronologia Git come artifact con retention di 90 giorni.
- `.github/workflows/superadmin-code-backup.yml` gestisce il backup giornaliero e il bridge di ripristino.
- L'aggiornamento del ramo giornaliero ora è consentito solo se fast-forward; in caso di divergenza il workflow si ferma senza sovrascrivere la cronologia.

Il workflow di backup usa ancora l'endpoint Supabase configurato nel file. Questa modifica non cambia progetto, credenziali, funzione Edge o database.

## Workflow sponsor storico
Il workflow attivo `patch-bove-sponsor.yml` è stato rimosso da `.github/workflows/` perché imponeva lo script sponsor v10 e poteva sovrascrivere una versione più recente. Il contenuto originale è conservato in:
`docs/archived-workflows/patch-bove-sponsor.yml`

Non riattivarlo senza una nuova verifica delle versioni effettivamente usate dalle pagine.

## PWA
File:
- `manifest.json`
- `sw.js`

Il Service Worker attuale esegue installazione/attivazione e lascia le richieste applicative alla rete/browser; non implementa una cache offline completa.

## Regola di rilascio
1. controllare il diff sul branch di manutenzione;
2. verificare che il workflow Pages completi build, upload e deploy;
3. controllare le pagine principali e la console browser dopo il deploy;
4. verificare il comportamento reale di login, amministrazione e tabellone prima di considerare concluso il rilascio.

Lo stato di un deploy non va dichiarato riuscito senza controllare l'esecuzione GitHub Actions corrispondente.
