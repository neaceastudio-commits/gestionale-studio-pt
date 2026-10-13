# Calendario — Aggiornamento senza flash e regole compensi ordinate

Il timer di 30 secondi e gli eventi focus/visibilitychange ricostruivano la vista
anche con dati identici. Nelle viste Staff e Disponibilità gli hook ripetevano
inoltre l'inserimento dei pannelli al tempo zero e dopo 250 ms.

La lettura completa confronta ora le righe convertite con la cache attuale e
segnala se qualcosa è cambiato. In assenza di modifiche non salva nuovamente gli
stessi dati e il refresh automatico conserva i nodi DOM, i filtri e lo scroll.
Eventi simultanei condividono la stessa lettura in corso. Il refresh iniziale
forzato e gli aggiornamenti reali continuano a ridisegnare la vista; la vista
Clienti non viene più disegnata due volte. Le date server mancanti restano
sconosciute (null), senza generare un nuovo timestamp ad ogni lettura.
Gli indicatori temporali della Dashboard (persone ora in sala, sedute in corso
o passate) continuano ad aggiornarsi senza ricostruire gli appuntamenti; il
cambio di giorno aggiorna la Dashboard.

Gli hook Staff/Disponibilità completano ora il pannello nella stessa operazione
di render/switch, senza il secondo passaggio ritardato; l'avvio iniziale viene
accorpato in un solo callback. La sincronizzazione delle disponibilità resta
attiva e la modifica delle disponibilità continua a sospendere il refresh.

Le regole compensi nel riepilogo e nel resoconto giornaliero sono presentate con
una tabella tariffe (PT 1:1 10 €/h; coppia 15 €/h), due righe per maturato e
teorico, una nota di conferma di fine mese e dettagli apribili per le altre
regole. Nessuna modifica a tariffe, ore remunerate, incassi o pagamenti.

Verifiche: confronto di 1.234 sedute, modifiche di stato/cancellazioni, errori e
retry, aggiornamenti concorrenti; browser con timer/focus/visibilità, identità
dei nodi e scroll, modifica remota applicata una sola volta, mantenimento del
filtro resoconto, disponibilità settimanali, desktop/mobile, censimento UI e
controllo completo scripts/check-calendar-release.sh. Tutti con dati simulati.
