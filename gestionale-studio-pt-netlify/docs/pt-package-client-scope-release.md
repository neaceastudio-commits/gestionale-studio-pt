# Portale PT — Clienti temporanei e ibernati

Pubblicato e verificato il 7 ottobre 2026 sul Portale PT:
`6ac6045e0b42da68c22cadd4`, baseline `6ac52c3ded8e625d99e2911f`.
Branch: `feature/whatsapp-agenda-pt-v1`.

## Regole approvate

- Il referente mantiene il cliente nel proprio elenco.
- Il PT temporaneo lo vede finché ha almeno una seduta non ancora salvata nel
  pacchetto corrente. Il salvataggio dell'ultima seduta lo rimuove immediatamente
  dall'elenco e dal conteggio; una seduta successiva nello stesso pacchetto lo
  mantiene visibile. Un vecchio grant di condivisione non basta a mantenerlo.
- I miei clienti e la scelta nominativa del PT usano lo stesso criterio.
- Clienti con `active=false` o stato contenente `ibern` sono esclusi dal bootstrap,
  dagli elenchi, dai selettori e dai conteggi del Portale, inclusa la Direzione.
  Riattivandoli tornano visibili al successivo caricamento secondo le assegnazioni.
- I salvataggi sono identificati per appuntamento, cliente e autore: una seduta
  1:2 conserva completamenti distinti; un nuovo PT non eredita il salvataggio
  del precedente. Lo stato calendario `fatto` non equivale a un allenamento salvato.
- Per distinguere i pacchetti si riusa il criterio del Calendario: registro dei
  cicli, ID esplicito anche per anticipi, poi marcatori e date dei dati legacy.
  Le sedute di pacchetti precedenti e quelle annullate non mantengono l'elenco.
- Il programma resta modificabile soltanto dal referente. Il PT temporaneo
  compila il registro della propria seduta; le verifiche server restano attive.

Lo storico non viene cancellato. Nessuna migrazione, modifica di clienti reali,
assegnazioni, ruoli o altri siti. Il filtro riguarda il Portale PT.

## File principali

- `app/portale-personal-trainer/index.html`: elenchi e conteggi uniformi, testi,
  aggiornamento immediato dopo conferma di salvataggio.
- `app/portale-personal-trainer/js/session-log.js`: notifica al Portale dopo
  aver ricevuto il record salvato; errore o conflitto non rimuovono il cliente.
- `netlify/functions/pt-data.js`: filtro ibernati e metadati dei PT con sedute
  ancora da salvare, senza esporre agli altri PT i record completi del registro.
- `netlify/functions/lib/pt-client-scope.js`: calcolo per pacchetto e autore.
- `netlify/functions/lib/pt-session-log.js`: lettura paginata delle assegnazioni
  per il calcolo; ogni scrittura continua a verificare solo il PT autenticato.
- Test nuovi `tests/pt-client-scope.test.cjs` e `tests/pt-client-scope-browser.cjs`;
  aggiornati `pt-client-visibility.test.cjs` e `pt-session-records-api.test.cjs`.

## Verifiche

- 30 test Node superati su filtri, permessi, API, workflow e salvataggi.
- Suite di persistenza programmi superata.
- Browser Chrome a 390 px, Portale completo e backend con soli dati sintetici:
  menu PT, conteggi, ibernazione/riattivazione, errore rete, ultima seduta,
  altre sedute, aggiornamento immediato e riapertura del Portale.
- Seconda prova browser su compilazione, carichi precedenti e protezione del
  programma del referente superata.
- Sintassi JavaScript, script inline, funzione impacchettata e `git diff --check`
  superati. Query Supabase esclusivamente in lettura sui campi usati.
- Anteprima e dominio principale: hash dei due asset verificati, bundle di
  `pt-data` verificato, altre 19 funzioni identiche per hash e configurazione,
  pianificazioni conservate, API anonima 401. Deploy automatici ancora bloccati.

Non sono stati eseguiti salvataggi autenticati sui clienti reali. Nessun passaggio
esterno necessario; ricaricare il Portale per caricare gli elenchi aggiornati.

Stato Git finale: pagina e script sedute modificati; API, helper, test e nota
release non tracciati nel branch corrente. Preesistenti modifiche e file non
tracciati preservati; nessun commit, reset o worktree.
# Correzione pubblicazione — 7 ottobre 2026

La release `6ac6080390999e7b9ec0ff32`, pur servita sul dominio principale,
conservava `context: deploy-preview`. Il flag `PT_SESSION_LOG_ENABLED=true`
è configurato per `production`: il Portale aggiornato mostrava quindi solo
il cliente di cui Gianluca è referente, senza le assegnazioni temporanee.

Pubblicata la nuova release `6ac6289be70f0e18e2691dbe` con `draft:false`
e contesto effettivo `production`. Tutti i 48 file e i 20 bundle funzione
sono identici per digest alla release precedente; conservate configurazioni,
pianificazioni e blocco dei deploy automatici. Nessuna modifica ai dati.
Netlify ha richiesto il caricamento di `pt-data` e `supplements`: entrambi
verificati identici per SHA-256 prima dell'upload.

Verifica autenticata sul dominio principale con il browser dell'utente:
il filtro Gianluca Pirisi mostra 8 clienti e il cliente temporaneo selezionato
mostra «Compilazione seduta abilitata · struttura protetta».
Superati 14 test su visibilità, ciclo pacchetto e autorizzazioni sedute;
verificati asset online, rifiuto anonimo 401/403 e `git diff --check`.

Per i prossimi rilasci, verificare il `context` restituito dall'API:
`draft:true` produce un'anteprima anche se il payload richiede `production`.
La promozione sul dominio principale non cambia quel contesto. Verificare
anche il comportamento autenticato, oltre agli hash e alle risposte anonime.
