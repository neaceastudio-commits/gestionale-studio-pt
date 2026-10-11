# Calendario — Situazione clienti

Vista `?view=situation` con Tabella e Schede. Lettura completa di clienti,
appuntamenti e, per la Direzione autenticata, spostamenti dal registro audit
esistente (paginato per ID, senza query pubbliche alla tabella audit).

## Regole approvate nella revisione dell’11 ottobre 2026

La percentuale principale è **Regolarità del percorso**. La percentuale delle
presenze resta separata: svolte / (svolte + no-show).

- Durata prevista = lezioni / frequenza concordata × 7 giorni, arrotondata al
  giorno superiore. Esempio: 8 sedute a 2/settimana → 28 giorni.
- A conclusione del pacchetto, durata effettiva fino all’ultima delle N sedute
  consumate (presenze e no-show); solo le presenze danno credito. Per un ciclo
  aperto si valuta l’avanzamento rispetto alle lezioni dovute alla frequenza
  concordata (numero intero), senza oscillazioni giornaliere per lezioni non ancora
  dovute; non si valuta
  il primo intervallo prima che possa essere dovuta una lezione.
- Nei cicli conclusi: min(1, giorni previsti / effettivi) × presenze / lezioni
  previste. Nei cicli aperti: min(1, sedute consumate / dovute) × quota di presenze
  tra le consumate. Credito in giorni = percentuale del ciclo × giorni effettivi.
  Finire prima non compensa il ritardo di altri pacchetti e non azzera i no-show. Ritardo = max(0, durata effettiva − durata prevista).
- Regolarità nei tempi = credito totale / giorni effettivi totali × 100.
- Stacco tra pacchetti = giorni fra la fine del precedente (la più tarda fra
  fine effettiva e fine prevista) e inizio successivo. Anche lo stacco attuale
  dopo un pacchetto concluso entra nel denominatore per i clienti attivi.
- La perdita per stacchi è la differenza fra regolarità nei tempi e credito /
  (giorni effettivi + giorni di stacco). Non si conta due volte un ritardo.
- Spostamenti: solo eventi `appointment_moved`, con variazione reale di data/ora
  di una seduta PT prenotata e riconducibile al ciclo. Deduplicazione per richiesta
  e appuntamento; esclusi eventi automatici, TEST, correzioni di sedute già fatte
  e conversioni da blocchi. Non si attribuisce automaticamente la causa all’utente:
  il dettaglio indica quando la causa non è documentata.
- 1 variazione tollerata per pacchetto, poi −5 punti per ogni ulteriore variazione
  non giustificata (massimo 100 sul singolo ciclo). La perdita fra più cicli è
  mediata pesando la durata effettiva dei pacchetti.
- **Percentuale finale = nei tempi − perdita per stacchi − perdita per
  spostamenti**, minimo zero. Il dettaglio espone ogni componente, cicli,
  durate, ritardi, date degli stacchi e prima/dopo degli spostamenti.
- Nessun bonus per numero di rinnovi. Ordinamento iniziale per regolarità,
  poi mesi continuativi. I mesi continuativi ripartono dopo uno stacco non
  documentato. I criteri Top usano regolarità e mesi continuativi, non rinnovi.
- Pause concordate/Studio: richiedono date e motivo; i giorni sono esclusi
  dalla durata effettiva e dagli stacchi. Le pause estendono la scadenza prevista;
  intervalli sovrapposti si contano una volta sola.
- Spostamenti concordati/Studio: richiedono riferimento dell’evento e motivo,
  e vengono esclusi dalla penalità. Nulla viene desunto dal nome dell’operatore.

## Giustificazioni e limiti dei dati

Il comando riservato alla Direzione **Registra una giustificazione** prepara
nelle note della scheda cliente una riga leggibile, da controllare e salvare
con il normale editor autenticato/auditato. Nessun salvataggio automatico.
Il registro economico è preservato dal normale flusso dell’editor. Sintassi
interna nelle note (compatibile senza migrazioni):

```
Pausa concordata | YYYY-MM-DD | YYYY-MM-DD | motivo
Pausa Studio | YYYY-MM-DD | YYYY-MM-DD | motivo
Spostamento concordato | ID_AUDIT | motivo
Spostamento Studio | ID_AUDIT | motivo
```

Senza frequenza, numero lezioni, decorrenza o collegamenti affidabili non si
inventa una durata storica. I cicli sovrapposti o mancanti restano da verificare.
La frequenza corrente può integrare il solo ultimo ciclo, non quelli vecchi.
La regolarità è relativa ai pacchetti PT; le altre statistiche possono essere
filtrate per tutti i servizi del Calendario. Gli spostamenti antecedenti alla
creazione del registro non vengono ricostruiti.

Senza accesso Direzione la componente spostamenti non è disponibile e la
percentuale completa resta **—**: non si presume zero. Errori durante una pagina
rifiutano lo snapshot completo, preservando filtri e possibilità di riprovare.

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
