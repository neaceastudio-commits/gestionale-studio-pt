# Calendario — Correzione prenotazioni a residuo zero

Il residuo zero impediva anche lo spostamento e l’annullamento di una
prenotazione già esistente. La cancellazione ora evita i controlli di residuo,
capienza e disponibilità (non occupa uno slot). Uno spostamento conserva il
controllo sala/cliente/PT, ma non richiede residuo se prenotazione, clienti,
servizio, stato e ciclo sono invariati. Nessuna eccezione per ID nuovi o
falsificati, riattivazioni, cambi di partecipante/ciclo o nuovi consumi.

Nei rinnovi confermati vengono indicate le prenotazioni ancora aperte nel ciclo
precedente, anche molto vecchie, con pulsante per aprire la seduta. Compare
Riprova attivazione, che usa la conferma idempotente e l’attivazione server già
esistenti. Un avviso segnala proposte senza prenotazioni: dopo l’attivazione
si devono programmare le lezioni. Non si modificano automaticamente dati reali.

Riscontro Portas in sola lettura: prenotazione del 5 maggio 2026, ore 16:00,
collegata al ciclo di settembre; audit 14 settembre 17:06, spostamento da
15 settembre a 5 maggio, stato prenotato conservato. Verificato predicato SQL:
la seduta blocca l’attivazione. Rinnovo confermato il 13 ottobre 19:36, otto
prenotazioni poi eliminate, proposta rimasta confirmed. Nessuna rettifica
automatica della presenza o del rinnovo di Portas in questa correzione.

Test unitario: movimenti/cancellazioni con residuo zero, conflitti mantenuti,
nessuna nuova prenotazione o consumo senza residuo. Browser con dati simulati:
salvataggio dalla riga del Quadro pacchetto, cancellazione, residuo invariato,
blocco passato visibile, avviso lezioni assenti e riprova attivazione.

## Rilascio verificato

Lavoro `0ce4c14`; commit isolato `f4148e4c9b728b8124e6cc5516766f2fbeee4277`,
branch `release/calendar-exhausted-edit`; deploy `6ace710a75cf072457a6d772`.
Suite completa e prova browser locale/candidato superate; tre asset modificati,
41 asset pubblici verificati per hash, nomi delle funzioni e pianificazioni
preservati. Produzione bloccata e impostazioni Git ripristinate.
