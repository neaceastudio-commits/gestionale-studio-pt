# Agenda email PT

Invio autorizzato dalla Direzione il 17/09/2026: ogni PT attivo con sedute
personali prenotate riceve la propria agenda alle 06:30 Europe/Rome.
Destinatari: indirizzo corrente di `operators.email`; ruoli legacy o effettivi PT.
Sono inclusi PT 1:1 e PT 1:2, esclusi annullati, Fatto, No-show e Circuit,
come nell'agenda WhatsApp sostituita da questo canale. Nessuna email a chi non ha sedute.

Mittente: NEACEA Desk <desk@neacea.com>; risposte: neacea.desk@gmail.com.
Firma grafica ufficiale estratta da `/email-signature.html` (logo e contatti).
Il conteggio X/Y usa esclusivamente i residui salvati, prima della seduta odierna.
Le modifiche successive all'invio si consultano nel Calendario.

## Esecuzione

La funzione `email-agenda-scheduled.mjs` viene pubblicata sul sito dedicato
`neacea-email-agenda-pt` (stesso database Studio e provider Resend). L'allowlist `EMAIL_AGENDA_SITE_ID`
evita invii se la funzione viene distribuita anche su altri siti del monorepo.
Cron UTC `*/5 4-6 * * *`; controllo locale 06:30–07:00, estate/inverno.
Prima esecuzione alle 06:30; le successive recuperano solo invii non accettati.
Le funzioni programmate non sono endpoint pubblici di invio.

Configurazione Functions:
- EMAIL_AGENDA_ENABLED=true
- EMAIL_AGENDA_SITE_ID=4f4adb33-910e-45a8-89ca-3564c2d9930e
- EMAIL_AGENDA_FROM=NEACEA Desk <desk@neacea.com>
- EMAIL_AGENDA_REPLY_TO=neacea.desk@gmail.com
- RESEND_API_KEY e SUPABASE_SERVICE_ROLE_KEY già presenti, mai salvati nel repo.

## Affidabilità e riservatezza

`email_agenda_deliveries` ha chiave univoca giorno/PT, RLS senza accesso anon o
utenti, payload immutabile, claim con lease di due minuti e massimo sette tentativi.
Timeout/429/5xx usano lo stesso payload e Idempotency-Key Resend nella finestra
mattutina. `accepted` significa accettato dal provider, non conferma di lettura
né garanzia di recapito. Il corpo della mail viene rimosso dopo sette giorni
alla successiva attività della coda. I log function contengono solo ID/stato.
Nessun aggiornamento a appuntamenti, pacchetti, residui, audit o sincronizzazione Apple.

## Verifiche

- node --test tests/email-agenda.test.cjs tests/whatsapp-agenda.test.cjs (16 test)
- tests/email-agenda-postgres.test.cjs con EMBEDDED_POSTGRES_MODULE
- Prova API verso delivered@resend.dev con dati sintetici: accettata.
- Anteprima reale del 18 settembre: Alessandro, 6 sedute, nessun dato mancante.

Il rilascio è isolato nel sito dedicato: una sola funzione e una pagina statica.
Sorgente per i rilasci: `tools/email-agenda-production/`. Il Calendario resta
invariato; il Portale mantiene la release precedente `6aabf3e5f849cb00fa87fa6c`.
Il tentativo intermedio sul Portale è stato sostituito dal servizio dedicato
per non riconfezionare le funzioni preesistenti. Nessuna modifica locale
preesistente del repository è stata inclusa.

Produzione: https://neacea-email-agenda-pt.netlify.app
Deploy: `6aac319c320fef1c799a64b8`
Prima agenda prevista: 18 settembre 2026 alle 06:30 Europe/Rome.
La consegna reale ai PT potrà essere confermata solo dopo il primo invio.
