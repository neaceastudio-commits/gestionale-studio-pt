# Calendario — Sospensione recuperabile del pacchetto

## Comportamento richiesto e causa

Sospendere un cliente conservando il pacchetto e le lezioni residue per la
ripresa. Preservare tutte le sedute già chiuse, le ore maturate e i compensi
nel gestionale e nei riepiloghi PT. Non trasformare prenotazioni precedenti
rimaste aperte in presenze o assenze.

L'archiviazione online chiamava `saveAppointmentAtomic` per annullare le
prenotazioni future. Dal recupero automatico questo percorso richiede invece
`cancel_and_recover`: tenta di prenotare un'altra lezione, anche durante
l'archiviazione. Se le prenotazioni superano il residuo, il recupero è respinto
e il cliente resta attivo. Nel caso esaminato in sola lettura risultano quattro
lezioni residue e sei prenotazioni aperte, di cui due precedenti alla data
odierna. Nessun dato reale è stato modificato nell'indagine o nei collaudi.

## Correzione locale

- Comando esplicito **Sospendi pacchetto**, con stato `Ibernato`, dalla lista e
  dal quadro pacchetto. **Non rinnova** ed **Elimina** conservano le rispettive
  etichette e passano dallo stesso salvataggio amministrativo.
- `calendar_client_lifecycle` salva in una sola transazione l'annullamento delle
  sole prenotazioni da oggi e lo stato cliente. Non chiama il recupero automatico.
  Una coppia futura si annulla conservando entrambi gli ID; dagli altri gruppi
  si rimuove soltanto il cliente sospeso.
- Il pacchetto, il registro incassi nelle note, le date del ciclo, il referente,
  i totali e i residui non vengono riscritti. Le righe `fatto` e `noshow`, anche
  con assenza scalata, restano identiche. I consumatori conservano le stesse
  sorgenti: riepiloghi `PTSessionModel`/`pt-hours-report`, agenda e Portale PT.
- **Riattiva cliente** cambia soltanto attivazione e stato, rilegge il record dal
  server e apre lo stesso quadro pacchetto. Non apre il modulo di rinnovo e non
  ricrea automaticamente le prenotazioni annullate.
- Gateway riservato alla Direzione autenticata; identità ricavata dalla sessione.
  RPC `security invoker`, eseguibile soltanto da `service_role`, senza nuove
  tabelle, permessi ampliati o policy RLS. Snapshot del cliente e delle
  prenotazioni verificati sotto lock: sedute chiuse o aggiunte dopo l'anteprima
  fanno rifiutare l'intera operazione. Una risposta persa si può ritentare senza
  cancellazioni aggiuntive, rimborsi o duplicati.
- Protocollo `20261111-package-suspension-v1` e URL degli asset aggiornati;
  necessario includere anche `calendar-client-finance` nel futuro candidato,
  perché usa lo stesso protocollo. Gli altri gateway conservano il loro contratto.

File principali: `clients.js`, `supabase.js`, `app.js`,
`netlify/functions/lib/calendar-audit-endpoint.js`,
`supabase/migrations/20261111091927_calendar_package_suspension.sql`.

## Prove e limiti

Runtime dichiarato Node 24.14.1 e dipendenze del lockfile
`tools/coaching-editor/package-lock.json`.

- La nuova riproduzione automatizzata è fallita sul codice precedente:
  `active` restava `true` e il messaggio era «alcune prenotazioni future non
  sono state aggiornate». Dopo la correzione passa con prenotazioni superiori
  al residuo, senza creare recuperi.
- `tests/calendar-package-suspension.test.cjs`: JavaScript effettivo del
  frontend collegato alle funzioni SQL su PGlite locale. Verifica modifica,
  risposta, rilettura distinta e riapertura; sospensione e ripresa, saldo e
  note invariati, ore maturate identiche, coppie, assenze scalate, gruppi,
  pacchetti precedenti senza ledger, autorizzazioni, annullamento del dialogo,
  errore/rollback incluso audit, risposta persa, rilettura fallita e retry.
- `tests/calendar-package-suspension-concurrency.test.cjs`: PostgreSQL locale
  reale, due connessioni indipendenti. Una seduta chiusa mentre la sospensione
  attende il lock resta `fatto`; la vecchia anteprima è respinta e il retry
  conserva presenza e residuo aggiornato.
- `tests/calendar-archived-hours-browser.cjs`: browser su asset locali con API
  simulate; pulsanti Sospendi/Riattiva, ricarica, storico, identità delle coppie,
  residuo, ore e compensi. Non è una prova di persistenza nel database online.
- Restano i controlli di visibilità Portale PT, report ore e blocco delle vecchie
  pagine; le fixture aggiornano il protocollo atteso e provano il rifiuto della
  revisione sostituita, senza rimuovere controlli o allargare permessi.

I primi avvii di Chromium e PostgreSQL sono stati impediti dal sandbox locale;
i collaudi sono stati ripetuti con avvio locale consentito. Nessun servizio
esterno, invio o API a pagamento coinvolto.

Esito finale dell'11 novembre 2026:

- Nove test dedicati frontend/SQL PGlite superati; prova PostgreSQL con due
  connessioni superata; prova browser Sospendi/Riattiva superata.
- Gruppo di 35 controlli su archiviazione, autorizzazioni, protocollo, report ore
  e ambito clienti PT superato. Il test dedicato è stato poi esteso da sette a
  nove casi, tutti superati nella configurazione finale.
- `scripts/check-calendar-release.sh` ha completato tutti i controlli funzionali
  previsti. L'esito complessivo resta **non superato**: il controllo Git finale
  ferma il rilascio con «i file critici del Calendario non sono tutti salvati in
  un commit». Il controllo non è stato rimosso o aggirato.
- `git diff --check` superato. Stato finale del checkout: branch
  `feature/whatsapp-agenda-pt-v1`, HEAD `105650c`, 32 file tracciati modificati e
  93 elementi non tracciati, comprese le lavorazioni preesistenti. Nessun file
  preesistente ripristinato, nessun commit o push in questa lavorazione.

## Stato e prossimo passo

Lavoro locale nel branch `feature/whatsapp-agenda-pt-v1`, HEAD iniziale
`105650c`. Le numerose modifiche e i file non tracciati preesistenti sono
conservati; questa lavorazione non crea altri repository, copie o worktree.
Migrazione **solo preparata**, nessun deploy e nessuna sospensione del cliente
reale eseguiti. Non dichiarare la correzione attiva in produzione.

Per il rilascio occorre autorizzazione esplicita a migrazione e pubblicazione,
come richiesto dalle istruzioni Studio. Poi identificare il commit realmente
online, preparare e salvare in Git il solo candidato previsto, collaudarlo,
applicare la migrazione prima del nuovo gateway/client e verificare gli asset.
L'eventuale sospensione reale deve mantenere un confronto prima/dopo di
presenze, residuo, registro incassi e monte ore, con conferma da rilettura del
database reale. Non sistemare automaticamente le due prenotazioni passate.
