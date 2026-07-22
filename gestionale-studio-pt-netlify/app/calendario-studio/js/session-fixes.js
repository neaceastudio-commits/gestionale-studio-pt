// Compatibilita: il ricalcolo idempotente delle sessioni ora vive in
// Services.recalculateClientSessions ed e richiamato direttamente da App.
// Questo file resta caricato per non rompere URL/versioni gia distribuite,
// ma non applica piu wrapper multipli agli handler dell'Agenda.
