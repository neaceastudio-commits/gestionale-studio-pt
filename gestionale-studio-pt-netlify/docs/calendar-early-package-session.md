# Calendario — sedute anticipate rispetto all’inizio del pacchetto

## Correzione pubblicata — 21 settembre 2026

Il quadro pacchetto escludeva una seduta precedente alla data iniziale del ciclo,
anche se aggiunta in sostituzione di una lezione eliminata. I collegamenti espliciti
al ciclo ora hanno precedenza sulla data. Gli ID dei rinnovi mantengono la priorità.

- Nuove sedute individuali e spostamenti di sedute del ciclo conservano il collegamento.
- Per una seduta futura individuale già in agenda ma esclusa, il quadro offre
  “Includi nel ciclo”. Aggiorna il collegamento della stessa seduta, mantenendo ID,
  data e orario; non crea duplicati. Occorre un posto ancora da programmare.
- Prima di generare lezioni mancanti, un avviso evidenzia quelle già in agenda
  fuori ciclo. Non vengono riclassificate automaticamente sedute storiche.
- Il flusso non riassegna automaticamente sedute con più partecipanti.

## Ordine di rilascio

Migrazione Supabase e pubblicazione Calendario autorizzate e completate il 21 settembre 2026.
Applicare prima `20260921101845_calendar_early_package_session.sql`, poi rilasciare
`app/calendario-studio/js/{app,services}.js` e la funzione Apple Calendar con
`netlify/functions/lib/apple-calendar-package.js`. La migrazione sostituisce solo
la funzione di appartenenza al ciclo, preservando i privilegi; nessun aggiornamento
massivo dei dati. Dopo il rilascio, per il caso già esistente selezionare la seduta
anticipata nell’elenco e usare “Includi nel ciclo”.

## Verifiche

24 test/check superati per anticipo, eliminazione/sostituzione, rinnovi, pagamenti,
planner e Apple Calendar. Test PostgreSQL locale superato: residuo 8→7→8 passando
prenotato→fatto→annullato, storico escluso e privilegi invariati.
Nessun dato reale modificato. Branch locale: `feature/whatsapp-agenda-pt-v1`.

## Rilascio verificato

- Sito: https://new-calendar-neacea.netlify.app/
- Deploy: `6ab1062ebef698ecb454e698`.
- Branch isolato: `release/calendar-early-session`, commit `581896f377f41fb2f921bfbdca1e992521a81291`.
- Base `d73c6ba576f5ca32657c0a2e98e47affc461a050`: i 30 asset della release precedente corrispondevano alla base Git.
- I due script pubblici modificati sono stati confrontati byte per byte; tutti gli altri asset, l’insieme delle 14 funzioni e le pianificazioni sono preservati. Tra le sorgenti delle funzioni cambia soltanto il calcolo del pacchetto Apple.
- Migrazione applicata sul progetto Studio `cdywqyqqmjhgkzwrrixc`; query di verifica con dati sintetici: anticipo incluso, storico senza collegamento escluso. ACL e SECURITY INVOKER invariati.
- Advisor di sicurezza senza rilievi sulla funzione modificata; restano segnalazioni fuori ambito su viste SECURITY DEFINER, RLS senza policy e protezione password.
- Netlify riportato a `main`, build automatiche ferme e produzione bloccata. Nessun appuntamento cliente modificato durante il rilascio.
