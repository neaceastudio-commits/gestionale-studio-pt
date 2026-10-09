# Consultazione clienti per PT referente — 29 settembre 2026

Richiesta: ogni PT può vedere i clienti degli altri scegliendo il referente.
Default sui propri clienti e su quelli condivisi. Solo Direzione vede l'opzione
Tutti. La consultazione non concede compilazione o modifica della scheda.
La condivisione del proprietario e l'assegnazione della seduta rimangono necessarie
per registrare risultati; la struttura del programma resta al referente.
Registro riepilogativo solo owner; revoca impedisce i salvataggi già aperti.

File: index.html del Portale, pt-data.js e due test API/visibilità.
Branch: feature/whatsapp-agenda-pt-v1. Lavorazioni preesistenti preservate.
Nessuna migrazione o modifica di record reali.

Verifiche: 15 test Node passati; persistenza programmi e test adapter passati;
build editor riuscita; 2 test PGlite su condivisione/revoca e transazioni passati
usando la dipendenza già installata in ~/.npm/_npx/da5c1b6ea715e8b4/node_modules.
Sintassi HTML/JS e git diff --check passati. Nessuna prova autenticata live PT.

Anteprima Netlify 6abbe9840e0da305e520c6bd verificata: hash asset e funzioni,
20 funzioni conservate, modifica solo index e pt-data, API anonima 401.
Pubblicato dopo conferma esplicita utente «sì pubblica».
Produzione: 6abbe9840e0da305e520c6bd, verificata sul dominio principale.
20 funzioni preservate; blocco deploy automatici mantenuto.
Baseline precedente: 6abae593da67596b668dc5b2.
