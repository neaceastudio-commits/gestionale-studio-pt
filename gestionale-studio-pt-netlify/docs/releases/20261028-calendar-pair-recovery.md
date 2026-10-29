# Calendario — recuperi della coppia nel pacchetto corrente

Stato: **preparato e collaudato localmente**, 28 ottobre 2026.
Applicazione: Gestionale Studio PT, Calendario Studio.
Branch: `feature/whatsapp-agenda-pt-v1`; HEAD iniziale `d242d2c`.
Nessun candidato committato e nessuna pubblicazione in questo intervento.

## Problema e comportamento corretto

Nel Quadro pacchetto, “Genera mancanti” per PT 1:2 chiamava
`PTPairSessions.open(id, false)`, ma il pannello apriva comunque la proposta
di rinnovo presente. Senza proposta, il modulo suggeriva il numero di sedute
del pacchetto intero. Anche “Modifica piano” ritornava alla modalità rinnovo.

Il percorso ora completa i pacchetti correnti. Il numero proposto è il minimo
fra i residui disponibili delle due persone, sottraendo le prenotazioni già
collegate ai rispettivi cicli correnti. Sono mostrati solo i dati per programmare
le sedute: data, ora, PT, giorni e quantità. I campi di rinnovo e pagamento non
sono presenti in questa modalità. L’anteprima e il ritorno al piano conservano
la scelta. La gestione commerciale continua ad aprire il rinnovo previsto.

Esempio collaudato: due pacchetti di otto sedute, sette svolte, una annullata e
otto date del prossimo rinnovo già prenotate. Si aggiunge un solo appuntamento
condiviso nei due cicli originali; la seduta annullata resta nello storico.
Date, quantità, stato e versione del rinnovo rimangono identici.

Si usa il gateway atomico già esistente con `renewal: null` per entrambi.
Nessuna nuova API, migrazione, autorizzazione o modifica ai consumatori.
Il caso coperto è il pacchetto originale ancora corrente con un successore
previsto/confermato in attesa; riaprire un ciclo già chiuso resta fuori ambito.
Se uno dei partecipanti non ha capacità disponibile, il recupero condiviso
viene fermato e occorre verificare i rispettivi conteggi.

## File principali

- `app/calendario-studio/js/pt-pair-sessions.js`: separazione recuperi/rinnovo.
- `app/calendario-studio/index.html`: versione dell’asset aggiornata.
- `tests/calendar-pair-recovery.test.cjs`: riproduzione del difetto e regressioni.
- `tests/calendar-pair-recovery-browser.cjs`: interfaccia, vero gateway e SQL locale.
- `scripts/check-calendar-pt-pair.sh`: nuovi controlli inclusi.
- `tests/package-early-session.test.cjs`: il DOM fittizio espone ora
  `getElementById`, richiesto dal salvataggio già presente nel workspace;
  nessuna aspettativa di comportamento modificata.

## Prove

Runtime Node 24.14.1, entro il vincolo `>=22 <25`; Playwright 1.56.1 e PGlite
0.3.10 dichiarati in `tools/coaching-editor/package.json` e installati nel repo.

```sh
bash scripts/check-calendar-pt-pair.sh
node tests/calendar-pair-recovery-browser.cjs
PGLITE_MODULE="$PWD/tools/coaching-editor/node_modules/@electric-sql/pglite" node --test tests/calendar-pt-pair-postgres.test.cjs tests/calendar-expected-renewals.test.cjs
bash scripts/check-calendar-release.sh
git diff --check
```

- Riproduzione: prima della correzione fallivano i due controlli su apertura
  e anteprima del recupero; il controllo sulla capacità esistente passava.
  Dopo la correzione passano tutti e quattro i casi mirati.
- Suite coppia: 30 test superati, oltre ai controlli registro economico e Apple.
- Integrazione SQL: cinque test superati, con partecipanti sia JSONB sia array SQL,
  rinnovi separati, attivazione, presenze, storico e permessi.
- Browser mobile 390×844: pagina reale → `CalendarAudit` → handler reale →
  funzioni SQL su PostgreSQL locale PGlite → rilettura e ricarica della pagina.
  Soltanto verifica identità e trasporti HTTP/database hanno adattatori di test.
  Tutte le richieste sono intercettate; non vengono contattati servizi reali.
  Coperti errore della transazione, rollback, risposta persa dopo commit,
  retry con stesso ID, ritorno al piano, rifiuto di un secondo recupero oltre
  il residuo, rifiuto del ruolo PT, registrazione presenza e successivo
  annullamento. Le otto date e la proposta successiva restano identiche.
  Screenshot ispezionati in `/tmp/neacea-pair-recovery-{form,current}.png`.
- Lo script completo Calendario supera i controlli funzionali e termina con
  `BLOCCATO: i file critici del Calendario non sono tutti salvati in un commit.`
  Il workspace contieneva numerose modifiche preesistenti: non sono state
  committate insieme a questa correzione. Non è un rilascio validato su un commit.
  Il browser ha richiesto esecuzione fuori sandbox per il limite macOS sui
  processi Chromium; nessuna aspettativa o controllo è stato rimosso.

La persistenza è provata sul database locale con dati sintetici. Non sono state
eseguite scritture nel Supabase reale né cambiamenti agli appuntamenti delle sorelle.

## Stato Git e prossimo intervento

Modifiche locali non committate: i sei file elencati sopra (i due nuovi test e
questo rapporto sono non tracciati), con tutte le lavorazioni precedenti conservate.
`git diff --check` senza rilievi. Nessun deploy, push o migrazione effettuato.

Prossimo passo esterno: su richiesta di pubblicazione, identificare il commit
effettivamente online, preparare un candidato Git circoscritto, collaudarlo e
verificare gli asset pubblicati. Solo dopo il rilascio il nuovo percorso sarà
disponibile nel Calendario online: Quadro pacchetto → Genera mancanti →
Continua → scegliere il recupero → anteprima → conferma.
