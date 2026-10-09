# Portale PT — consultazione e salvataggio sedute (30 settembre 2026)

Branch di lavoro: feature/whatsapp-agenda-pt-v1. Le altre lavorazioni locali restano intatte.

- Selettore referente sempre presente in un riquadro dedicato, con conteggio clienti.
  Cambio referente azzera la ricerca precedente. Referente visibile sulle card anche ai PT.
- Assegnazione dall'Archivio: dopo conferma del server apre programsView del cliente.
  In caso di errore resta la bozza nel builder.
- In Usa scheda: note specifiche per allenamento e settimana, salvate nello stato
  della scheda (`workoutSessions`), senza nuove tabelle.
- Salva allenamento conferma solo la coppia allenamento/settimana selezionata.
  Verde solo quando il marcatore è presente nella risposta salvata del server.
  Carichi precompilati o un errore di rete non confermano completamento.
- Note e completamento vengono riallineati rimuovendo settimane/allenamenti;
  nuove copie e nuovo mese non ereditano le sedute completate.
- Collaboratori: resta il registro dedicato alla seduta assegnata, con il suo campo
  Note della seduta. Nessuna estensione dei permessi sulla struttura del programma.

Verifiche: 22 test Node (visibilità, accessi, registrazione, salvataggi concorrenti,
flusso assegnazione e stati A/B/settimane); sintassi JS e script inline;
git diff --check. Prova browser con identità/dati sintetici: assegnazione,
inserimento carichi/nota, salvataggio, riapertura con nota/completamento conservati.
Prova mobile a 390 px: cambio referente e clienti visibili con ricerca azzerata.
Nessuna modifica ai clienti reali. La prova autenticata sui dispositivi di
Alessandro/Tamara resta da confermare dopo la riapertura della versione aggiornata.

Rilascio pubblicato e verificato: `6abd255e371df029481d0d35`.
Dominio: https://neacea-portale-personal-trainer.netlify.app/
Modificati soltanto `/index.html` e `/js/program-workflow.js`; 20 funzioni
conservate con gli stessi hash/configurazioni. API senza accesso: 401.
Blocco deploy automatici mantenuto. Nessun nuovo commit: modifiche nel working
tree sul branch indicato, insieme alle lavorazioni preesistenti.
