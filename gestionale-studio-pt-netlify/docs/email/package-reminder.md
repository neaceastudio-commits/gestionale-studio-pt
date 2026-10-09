# Promemoria penultima seduta Personal

Richiesto il 23/09/2026. Mittente vincolato: `neacea.desk@gmail.com`, nome NEACEA Desk,
firma ufficiale completa, nessun pulsante di conferma. Nessun invio tramite Resend.

## Regole

Alle 08:00 Europe/Rome, recuperi ogni cinque minuti fino alle 09:00.
Cliente attivo, email valida, due sedute residue salvate, pacchetto di almeno due
sedute, una seduta PT 1:1 o 1:2 prenotata oggi e non ancora iniziata nel ciclo corrente.
Esclusi circuit, annullati, fatto, no-show, prenotazioni arretrate, più prenotazioni
dei residui, due sedute lo stesso giorno e cicli ambigui/chiusi. La seduta finale
può essere ancora da pianificare. Nessuna deduzione dei residui dal numero di appuntamenti.
Un invio per cliente/ciclo; spostamenti, riavvii e deploy non creano un nuovo invio.

## Componenti

- `netlify/functions/lib/email-package-reminder.js`: selezione e messaggio approvato.
- `tools/email-agenda-production/functions/email-package-reminder.mjs`: cron cloud,
  vincolato al sito email `4f4adb33-910e-45a8-89ca-3564c2d9930e`, production.
- `tools/email-agenda-production/google-apps-script/package-reminder.gs`: invio
  dalla casella Google effettiva. Richiede account proprietario neacea.desk@gmail.com.
- Store privato `email-package-reminder-v1`: lease CAS, stato e payload immutabile.

## Collegamento Google ancora necessario

Creare uno script dedicato nell'account Desk, inserire il file `.gs` e nelle
Script Properties impostare `REMINDER_SECRET` con almeno 32 caratteri casuali.
Eseguire `verifySender` e autorizzare Google all'invio; verificare account e quota.
Pubblicare come web app eseguita dal proprietario. Le richieste sono autenticate
con il segreto condiviso; il server controlla mittente, destinatario singolo,
oggetto, finestra temporale e idempotency key. Non salvare il segreto nel repository.

Nel servizio Netlify impostare `GMAIL_REMINDER_WEBAPP_URL`, `GMAIL_REMINDER_SECRET`
e solo dopo prova del mittente `EMAIL_PACKAGE_REMINDER_ENABLED=true`.
Non cambiare `EMAIL_AGENDA_FROM` né gli invii PT e il riepilogo settimanale esistenti.

Il registro Google riserva l'invio prima di chiamare MailApp. In caso di esito
incerto non ripete l'invio alla cieca: conserva `uncertain` per verifica manuale.
Le risposte confermate vengono rigiocate senza inviare due volte. Nessuna
scrittura a pacchetti, appuntamenti, residui o calendario Apple.
`accepted` conferma l'invio da Google, non il recapito o l'apertura. MailApp non
fornisce eventi di apertura/consegna: nessuna finta conferma viene registrata.

Stato: preparato localmente, NON attivo finché il collegamento Google non è
configurato e verificato. Nessun messaggio inviato ai clienti durante lo sviluppo.

Verifica: `node --test tests/email-package-reminder.test.cjs`.
