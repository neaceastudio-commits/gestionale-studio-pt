# Feed Apple Calendar professionale (sola lettura)

Endpoint e token esistenti restano invariati. Nessun CalDAV, import, RRULE o scrittura.
Richiede `SUPABASE_SECRET_KEY` oppure `SUPABASE_SERVICE_ROLE_KEY`; le chiavi pubbliche non sono accettate come fallback. Tutte le letture REST sono paginate.

## Pacchetti e numerazione

L'adattatore `lib/apple-calendar-package.js` segue la selezione del ciclo di `Services`: registro/ID, data confermata, marcatori delle sedute, data di acquisizione. I test confrontano direttamente i risultati con il codice browser. Anche la normalizzazione dei totali dei vecchi rinnovi segue il Calendario.

Il residuo esposto è **sessions_remaining salvato**, senza correzioni, anche se storico e contatore sono disallineati. Le future programmate sono le prenotazioni del ciclo dalla data odierna di Roma; da programmare = max(0, residuo salvato − future), coerente con l'autorizzazione del pianificatore.

La posizione è ordinata per data, ora e ID tra Fatto e prenotazioni future del ciclo. Annullati e no-show non occupano una posizione: un no-show mostra la posizione che avrebbe occupato, condivisa con la seduta sostitutiva successiva. Le prenotazioni passate ancora aperte, gli eventi di cicli precedenti e le posizioni oltre il totale non ricevono una frazione inventata. Nei gruppi, una frazione comune compare solo se tutti i clienti attivi hanno la medesima posizione e totale; altrimenti il dettaglio resta individuale.

Giorni/orari sono le combinazioni distinte delle sedute Fatto/prenotate del ciclo, non `orario_preferito`. Fine prevista è l'ultima data pianificata solo quando non restano sedute da programmare; altrimenti è «Da definire». Nessuna estrapolazione di ricorrenze.

Gli UID conservano esattamente il formato `id-appuntamento@calendar.neacea.it`; un record senza ID non viene esportato. Il feed PT include solo pt11/pt12/circuit con operator_id coincidente e almeno un cliente attivo. I partecipanti inattivi sono omessi anche dai gruppi. Il feed generale conserva gli altri servizi e i blocchi agenda.

## Privacy

Nessuna esportazione di contatti, anamnesi, dati sanitari, nutrizionali o economici. I blocchi interni di notes vengono letti solo per identificare il ciclo e non serializzati nell'ICS.

Le note operative sono **a vocabolario chiuso**, su una riga autonoma:

- `[NOTA-OPERATIVA] Portare un asciugamano`
- `[NOTA-OPERATIVA] Portare scarpe pulite`
- `[NOTA-OPERATIVA] Presentarsi 5 minuti prima`

Qualsiasi altro testo, anche preceduto dal marcatore, viene scartato. Se non esiste una nota ammessa, la riga «Note operative» viene omessa interamente. Nessuna esportazione diretta di appointments.notes. Questo evita che un marcatore renda esportabili note personali o cliniche arbitrarie.

Il blocco finale riporta: «Gestione NEACEA» e «Data e orario gestiti dal Calendario NEACEA.».

## Verifica locale

`node --test tests/apple-calendar-professional.test.cjs`

`WRITE_ICS_EXAMPLE=/tmp/neacea-professional-simulated.ics node --test tests/apple-calendar-professional.test.cjs`

Il file `examples/apple-calendar-professional-simulated.ics` è generato dalle fixture sintetiche della suite: nomi dimostrativi, ID `sim-*`, nessun dato letto da Supabase. Le 8 sedute sono finite; martedì alle 17 e giovedì alle 18, fine 01/10/2026.
