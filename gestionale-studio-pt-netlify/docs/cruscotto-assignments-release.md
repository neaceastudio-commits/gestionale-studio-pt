# Cruscotto PT — trasferimento assegnazioni, 21 settembre 2026

La scheda **Assegnazioni** nel Cruscotto contiene ricerca cliente, PT attuale,
selettore del nuovo PT e salvataggio riservato alla Direzione. Usa l'operazione
`assignment` del gateway esistente `studio-calendar-activity`, che aggiorna
anagrafica, relazione PT-cliente e audit. Nessuna migrazione o modifica backend.
In Centrale il precedente modulo è sostituito dal collegamento diretto
`https://cruscotto-pt.netlify.app/#assignments`. La gestione accessi già presente
nel Cruscotto resta separata e invariata.

File principali: `app/cruscotto-pt/index.html`, `studio-audit-access.js`,
`app/portale-pt-fase1/index.html`, `js/portal.js`.

Verifiche con dati fittizi: assegnazione riuscita, errore server senza falsa
conferma, rifiuto senza sessione Direzione; 42 clienti, ricerca, paginazione,
accessi e vista mobile; Centrale priva del vecchio pulsante e con link corretto,
altre funzioni di accesso invariate. Sei test server autorizzazioni superati.
Sintassi e `git diff --check` superati. Nessuna assegnazione reale eseguita.

Rilascio preparato applicando esclusivamente la differenza corrente ai file
online, senza includere altri lavori locali. Branch
`feature/whatsapp-agenda-pt-v1`, modifiche non committate.

Pubblicato: Cruscotto `6ab14444319f2d8ac6313675`, Centrale
`6ab14474433015e30d3193c5`. Verificati i file sui due domini pubblici.
I blocchi delle pubblicazioni automatiche sono preservati. Gli errori temporanei
502/503/504 di Netlify sono stati gestiti riprendendo gli stessi deploy e
controllando lo stato prima di ripetere le operazioni.
