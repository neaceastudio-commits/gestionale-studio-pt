# Magazzino Integratori — riepiloghi economici

Correzione del 4 ottobre 2026 nel repository Gestionale Studio PT, checkout normale,
branch `feature/whatsapp-agenda-pt-v1` (HEAD preesistente `b14de2a`).

La presenza contemporanea di acquisti STIV con importi netti e campioni OMEGOR
con base lorda rendeva i totali globali non confrontabili. Il backend restituiva
correttamente i dettagli per base IVA e null per la somma globale; i tre riquadri
principali stampavano soltanto «Da verificare». Ora ogni riquadro mostra i valori
separati con la rispettiva base IVA, senza sommare importi non omogenei.

Aggiunti aggiornamento manuale, orario dell'ultima lettura e aggiornamento quando
si ritorna sulla scheda browser. Dopo un movimento viene mostrata la conferma
con la giacenza letta dal server. Se la scrittura riesce ma la lettura fallisce,
il messaggio distingue il movimento registrato e chiede di aggiornare, non reinserire.

Verifica read-only: vendita di una creatina il 30 settembre, stock da 3 a 2;
ricavo netto 31,8182 euro, utile lordo netto IVA 11,8215 euro. Nessuna vendita
è stata aggiunta, cancellata o modificata per eseguire questa correzione.

File applicativi: integratori/index.html, integratori.js, integratori.css.
Controlli: 13 test esistenti superati (ledger, API, permessi, prezzi/importazioni),
syntax check; anteprima browser con basi miste mostra 409,47 / 31,82 / 11,82 euro
netti e gruppi lordi a zero; verificato il pulsante di aggiornamento.
Rilascio mirato di soli 3 file statici, hash delle funzioni preservati.
Le modifiche locali preesistenti degli altri moduli restano nel checkout.
