# Magazzino Integratori — navigazione interna

Data: 7 ottobre 2026. Applicazione: Gestionale Studio PT / Portale Personal Trainer.
Branch: `feature/whatsapp-agenda-pt-v1`; HEAD iniziale `dd14a90`.

## Comportamento

Un solo ingresso Magazzino Integratori, cinque tab interne con una sola vista
visibile: Panoramica, Prodotti, Vendite, Movimenti, Riordini. Le azioni precedenti
(vendita, reso, carico/rettifica, modifica prodotto, schede, pubblicazione e DDT)
restano disponibili nelle rispettive viste. Nessuna nuova tabella o migrazione.

La Panoramica riassume il magazzino e le vendite del mese, con cinque attività
recenti. Prodotti usa schede con foto e dettagli espandibili. Vendite offre
periodi Oggi/7 giorni/Mese/Anno/intervallo, storico paginato e classifica per
quantità, fatturato e utile. Movimenti mantiene l'audit completo e i documenti.
Riordini mostra soltanto varianti attive esaurite o alla/sotto soglia: suggerisce
il reintegro fino a due volte la soglia, con almeno una confezione.

## Calcoli e accesso

- Le vendite derivano esclusivamente dai movimenti SALE già registrati;
  ogni movimento conta come una vendita. Nessuna duplicazione persistita.
- Prezzo effettivo, costo e IVA dello storico provengono dal movimento, senza
  ricalcolo dai prezzi correnti. Il costo usa il valore storico scaricato.
- I totali delle vendite sono prima dei resi, come indicato nell'interfaccia;
  i resi restano nell'audit e l'azione Reso resta disponibile.
- Incassi IVA inclusa, costo e utile su base netta quando l'IVA è nota;
  basi non confrontabili sono mostrate separatamente. Margine ponderato sui
  ricavi, non media aritmetica delle percentuali. Valori mancanti non inventati.
- Filtri temporali con giorni inclusivi nel fuso Europe/Rome.
- Nuovi prezzi suggeriti: pubblico IVA inclusa × 0,8, arrotondato ai €0,50
  più vicini. Prezzi effettivi già salvati conservati senza aggiornamenti.
- Endpoint inventario ancora riservato alla Direzione; nessun cambiamento
  a RLS o permessi. Nomi operatori proiettati solo nella risposta privata.
  I PT ricevono il catalogo sicuro e non vedono dati di magazzino.

## File della modifica

Percorsi relativi a `gestionale-studio-pt-netlify/`:

1. `app/portale-personal-trainer/integratori/index.html`
2. `app/portale-personal-trainer/integratori/integratori.js`
3. `app/portale-personal-trainer/integratori/integratori.css`
4. `app/portale-personal-trainer/integratori/pricing.js`
5. `app/portale-personal-trainer/integratori/warehouse-model.js` (nuovo)
6. `app/portale-personal-trainer/integratori/warehouse-view.js` (nuovo)
7. `netlify/functions/supplements.mjs`
8. `scripts/check-supplements.sh`
9. `scripts/build-supplement-inventory.cjs` (nuovo)
10. `tests/supplements-api.test.mjs`
11. `tests/supplements-pricing.test.cjs`
12. `tests/supplements-preview.cjs`
13. `tests/supplements-warehouse.test.cjs` (nuovo)
14. `docs/supplements-navigation-release.md` (nuovo)

Il repository contiene molte modifiche precedenti e l'intero modulo Integratori
risultava già non tracciato: lo stato Git non distingue da solo questo intervento.
Nessun commit/push generale; le altre lavorazioni non sono incluse nel rilascio.

## Verifiche

- `node scripts/build-supplement-inventory.cjs`: build statico e riferimenti
  locali verificati, output temporaneo fuori dal repository.
- `PGLITE_MODULE=/Users/gianluca/.npm/_npx/da5c1b6ea715e8b4/node_modules/@electric-sql/pglite bash scripts/check-supplements.sh`:
  20 test superati, inclusi ledger Postgres temporaneo, RLS/ruoli, idempotenza,
  import DDT atomico, IVA, arrotondamenti e prezzi già registrati.
- Browser con fixture locali: iPad 820×1180 e telefono 390×844, nessun overflow
  di pagina, tab esclusive, filtri, paginazione 20+4 vendite, riordini, apertura
  e annullamento vendita; profilo PT senza righe private nel DOM.
- Nessuna vendita o modifica dei dati reali durante le verifiche.

## Rilascio

Site ID: `3c87fb2e-525d-43b0-9a84-4699994352e4`.
Anteprima verificata: `6ac6418115589319df56029a`.
Nuova produzione: `6ac642033d0fa51a3f433d14`.
Rilascio mirato: sei asset Integratori e sola funzione `supplements`, con
manifest completo degli altri asset e funzioni preservato. Blocco delle
pubblicazioni automatiche ripristinato sulla nuova produzione.
Verifica successiva riuscita: ID effettivamente pubblicato, hash di tutti gli
asset e delle funzioni, sei file sul dominio pubblico, schedule preservate e
risposta HTTP 403 dell'endpoint inventory privo di autorizzazione.

Route amministrativa:
`https://neacea-portale-personal-trainer.netlify.app/integratori/?view=inventory&tab=overview`

Aprire dopo l'accesso come Direzione, oppure dal pulsante Magazzino Integratori
della dashboard. I parametri `tab=products|sales|movements|reorders` aprono le
altre viste interne. Nessuna credenziale nell'URL di consegna.

## Correzione foto — 7 ottobre 2026

Aggiunte le miniature già associate a prodotto/variante anche nelle scorte e
attività della Panoramica, nello storico e nella classifica Vendite e nei
Movimenti. Prodotti e Riordini conservano le proprie fotografie senza duplicati.
Modificati soltanto `integratori/warehouse-view.js`, `integratori/integratori.css`
e questo resoconto. Nessun dato o funzione server modificato.

Build riuscita, 20 test superati, fotografie caricate nel browser di prova,
assenza di overflow su iPad 820×1180 e telefono 390×844. Anteprima con dati
dimostrativi; nuovo deploy produzione `6ac650b27a068c2b8d367889`, blocco delle
pubblicazioni automatiche mantenuto.
