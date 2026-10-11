# Calendario — Situazione clienti

Vista `?view=situation` con Tabella e Schede. Lettura completa di clienti e appuntamenti del Calendario. Nessuna dipendenza dal registro degli spostamenti.

## Regole semplificate — revisione dell’11 ottobre 2026

L’utente ha chiesto una valutazione di massima: considerare come deficit soltanto un pacchetto che si allunga rispetto ai tempi previsti, senza report sugli stacchi.

- Durata prevista = lezioni / frequenza settimanale × 7 giorni, arrotondata al giorno superiore: 8 lezioni a 2/settimana → 28 giorni.
- **Tempi pacchetti % = media semplice di min(100, durata prevista / durata effettiva × 100)** per i pacchetti valutabili. Nessun bonus separato per rinnovi.
- Un pacchetto in corso resta al 100% finché non supera la durata prevista. A conclusione, la durata si ferma all’ultima delle N sedute consumate (presenze o no-show, incluso quel giorno); altrimenti si usa la data di chiusura registrata o il giorno corrente incluso. Un vecchio ciclo incompleto senza fine ricostruibile viene escluso.
- 4 settimane previste e 6 effettive → circa 67%; 8 effettive → 50%. Finire prima non dà un bonus oltre il 100%.
- Stacchi tra pacchetti e spostamenti non sottraggono punti. Gli spostamenti incidono indirettamente solo se allungano un pacchetto.
- Restano escluse dalla durata le pause concordate/Studio già documentate nelle note con date e motivo. Gli intervalli sovrapposti si contano una sola volta. La vista non contiene moduli per giustificazioni o report audit.
- Presenze % = svolte / (svolte + no-show), come dato separato. Inizio percorso, anzianità e rinnovi restano informazioni di contesto.
- I criteri Top usano mesi complessivi di percorso, sedute svolte e soglia dei tempi pacchetti. La soglia presenze è opzionale (default zero). Occorrono cliente attivo, non sospeso e presenze senza anomalie aperte; nessun premio automatico.
- Se un pacchetto non ha dati sufficienti viene escluso dalla media, senza inventare frequenze storiche. La frequenza corrente può integrare solo l’ultimo ciclo. Senza pacchetti valutabili si mostra **—**.
- Il dettaglio è breve: percentuale media, numero di pacchetti valutabili e durata prevista/effettiva dell’ultimo, con eventuali giorni di allungamento. Le pause tra presenze sono soltanto un’indicazione riassuntiva.

Le note di pausa già registrate restano compatibili:

```
Pausa concordata | YYYY-MM-DD | YYYY-MM-DD | motivo
Pausa Studio | YYYY-MM-DD | YYYY-MM-DD | motivo
```

Errori nella lettura dello storico rifiutano lo snapshot incompleto, preservando filtri e possibilità di riprovare.

## Verifiche

`node tests/client-journey.test.cjs` verifica indicatori, coppie, pause/riprese,
rinnovi annullati/futuri, date, Top, paginazione oltre 1.000 righe ed errori.
`tests/client-journey-browser.cjs` usa Playwright con richieste simulate per
mobile/desktop, ricerca, filtri, criteri, dettagli, errori/riprova, escape HTML e
ambito PT. Nessuna scrittura o modifica di dati reali.

Il controllo generale inizialmente si fermava sul test preesistente
`pt-program-persistence.test.cjs`: `Convertitore legacy individuato`. Il test
cercava esattamente `loadPortalData()` mentre la funzione ora accetta un
parametro. Aggiornata soltanto la delimitazione del test a `loadPortalData(`;
nessuna modifica al codice del Portale PT. Tutti i controlli funzionali della
suite generale e i test browser della nuova vista sono passati.

## Anteprima e pubblicazione

`node tests/helpers/client-journey-preview.cjs` apre su loopback, porta 4178,
`http://127.0.0.1:4178/?view=situation`. Usa soltanto clienti fittizi, devia tutte
le richieste dati verso localhost e blocca salvataggi/funzioni esterne.
Non viene incluso nel sito pubblicato e non contiene dati o chiavi reali.

L’utente ha approvato Tabella e Schede e autorizzato la pubblicazione l’11 ottobre
2026: «mi piace, pubblichiamo». Il rilascio riguarda soltanto il Calendario,
partendo dal suo commit attualmente pubblicato per preservare tutte le funzioni
e le pianificazioni esistenti. Nessuna migrazione necessaria.

## Pubblicazione verificata — 11 ottobre 2026

- Commit applicativo sul branch di lavoro: `94b62cb`.
- Branch di rilascio: `release/calendar-client-journey`.
- Commit isolato: `c13e0109253084528a8a1636b7135559771f49d6`.
- Deploy Calendario: `6acb93a4a8b738d39dd7a6b5`.
- URL: https://new-calendar-neacea.netlify.app/?view=situation

Suite generale Calendario superata dopo la correzione del solo selettore nel test
legacy. Test della nuova vista e prova Chrome sugli asset reali del candidato
passati con dati simulati: tabella/schede, criteri, filtri, pause, dettagli, errori
e ambito PT; nessuna scrittura di dati reali.

Manifest del deploy verificato: 40 file, con 7 nuovi/modificati e 33 preesistenti
invariati. Verificati per hash tutti i 39 asset pubblici sul dominio principale;
il file di configurazione Netlify è correttamente non servito (HTTP 404). Conservate tutte le 15 funzioni server e le due
pianificazioni. Collegamento Git ripristinato a `main`, build automatiche sospese
e nuova produzione bloccata. Nessun rilascio del Portale PT o degli altri siti;
nessuna migrazione.

Il browser reale conferma la vista e il caricamento dello storico: 23 clienti
attivi. I criteri iniziali segnalano zero Top; sono modificabili e lo storico
disponibile non viene confuso con l’intera anzianità reale.

## Revisione della regolarità pubblicata — 11 ottobre 2026

Regole confermate dall’utente: durata = lezioni / frequenza settimanale;
escludere pause concordate/Studio documentate; 1 spostamento tollerato per
pacchetto, poi −5 punti per variazione non giustificata.

- Commit isolato: `e3f9f70374474c3b290fc823dc1b0d96b9610a1f`.
- Branch di rilascio: `release/calendar-client-regularity`.
- Deploy: `6acbc4ef4c2166f769de5026`.

Suite generale sul candidato passata. Test matematici: durata doppia → 50%
anche con tutte le presenze; stacchi tra cicli; nessun bonus per più rinnovi;
penalità spostamenti; eccezioni documentate e intervalli sovrapposti; no-show;
frequenze periodiche e casi senza durata concordata; storico degli spostamenti
con sedute eliminate. Browser locale e candidato reale: Tabella/Schede, click
sulla percentuale, dettagli, preparazione delle giustificazioni nell’editor
esistente con ledger preservato, 103 eventi audit su due pagine, errori/riprova
e permessi PT. Tutte le richieste di dati dei test sono simulate, senza scritture
di dati reali.

Verificati per hash 40 asset pubblici sul dominio principale, manifest di 41
file con configurazione non servita (404). Sei asset nuovi/modificati, tutti
gli altri preservati. Backend e cron invariati; 13 bundle funzioni identici,
due ricompilati dal build. `main`, build automatiche sospese e produzione
bloccata ripristinati. Nessuna migrazione o pubblicazione di altri siti.

Per ottenere la percentuale completa occorre l’accesso Direzione: il registro
spostamenti resta protetto dal gateway. Dati incompleti non vengono convertiti
in una percentuale perfetta.

La revisione complessa descritta nel rilascio precedente è stata sostituita dalla valutazione indicativa dei soli tempi dei pacchetti, su richiesta dell’utente.
