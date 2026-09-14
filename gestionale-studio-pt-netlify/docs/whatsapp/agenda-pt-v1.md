# WhatsApp Agenda PT — V1

Implementazione isolata per il sito Calendario; nessuna modifica a salvataggi appuntamenti, pacchetti, residui o sync Apple. Il mittente ufficiale si configura con `WHATSAPP_SENDER_PHONE`; non compare nella logica.

## Funzionamento

- Sorgente: dati NEACEA correnti, già aggiornati dalla sync Apple. Nessuna lettura o modifica iCloud.
- Giorno locale Europe/Rome; solo `pt11`/`pt12`, stato `prenotato`, stesso `operator_id`, operatore PT attivo. Circuit, altri servizi, Fatto, annullamenti, no-show e blocchi esclusi.
- `sessions_total - sessions_remaining` su `sessions_total`, senza ricostruire la cronologia e senza correggere valori. Ogni partecipante PT 1:2 ha il proprio progresso. Una seduta condivisa conta una volta.
- Le query escludono note, dati clinici, pagamenti e contatti cliente. Nessun corpo messaggio o telefono nel log invii.
- Staff → **WhatsApp Agenda PT**: impostazioni per ciascun PT e anteprima Direzione. L'interfaccia chiama sempre `dryRun=true` e non ha pulsanti di invio. Il server ricontrolla la sessione firmata e il ruolo Direzione nel DB; nomi/ruoli forniti dal browser non danno permessi.
- Impostazioni salvate mediante il gateway/RPC audit già esistente (`operator` + `PATCH`). Nessuna modifica al codice audit. Il suo allowlist esistente non include i numeri WhatsApp.
- Prima della migrazione è possibile generare anteprime: gli operatori vengono considerati non abilitati e i campi di configurazione sono disabilitati.

## Pianificazione e idempotenza

`whatsapp-agenda-scheduled.mjs`: cron UTC `30 4,5 * * *`, con controllo server Europe/Rome alle 06:30. D'estate passa 04:30 UTC; d'inverno 05:30 UTC. L'altra chiamata non invia. Solo il sito identificato da `WHATSAPP_AGENDA_SITE_ID=SITE_ID` può inviare, e solo con `WHATSAPP_AGENDA_ENABLED=true` e provider completo.

Una PK `(agenda_day, operator_id)` e una insert atomica assegnano una sola possibilità di invio. Il claim precede la richiesta Meta e non viene cancellato dopo errore, timeout, riavvio o mancata registrazione della risposta. Questo assicura al massimo un tentativo per PT/giorno; non garantisce consegna esattamente una volta. Un tentativo incerto non viene ritentato automaticamente, per evitare duplicati. Il giorno successivo ha una nuova chiave.

Stati: `claimed` (richiesta riservata), `accepted` (Meta ha restituito un `wamid`, non conferma di consegna), `failed` (rifiuto Meta), `uncertain` (esito non determinabile). Un crash può lasciare `claimed`. Il log non si cancella dall'interfaccia e anon/authenticated non possono leggerlo o modificarlo. Nessun webhook di consegna è incluso nella V1.

## Cloud API e template

Per l'agenda automatica si usano **template approvati**, non messaggi liberi dipendenti dalla finestra di conversazione. La Cloud API identifica il mittente tramite `WHATSAPP_PHONE_NUMBER_ID`; prima di inviare il server controlla che `display_phone_number` corrisponda a `WHATSAPP_SENDER_PHONE`.

`WHATSAPP_AGENDA_TEMPLATES_JSON` associa il numero esatto di sedute al nome del relativo template approvato, ad esempio `{"1":"neacea_agenda_pt_1","2":"neacea_agenda_pt_2","3":"neacea_agenda_pt_3"}`. Il template deve avere **solo BODY**, in lingua `WHATSAPP_TEMPLATE_LANGUAGE`, una variabile testuale per ogni riga. Interruzioni di riga e totale sono fissi nel template, non nei parametri.

Esempio del BODY da sottoporre a Meta per tre sedute:

```
NEACEA · Agenda di oggi

{{1}}
{{2}}
{{3}}

Totale: 3 sedute
```

Ogni parametro contiene una sola riga, ad esempio `07:00 · Cliente Esempio · PT 1:1 · 0/8`. Devono essere approvati i template per le dimensioni di agenda effettivamente necessarie, con esempi simulati. Nessuna creazione o approvazione automatica dei template viene effettuata. Agenda oltre 1024 caratteri, template mancante o dati incompleti bloccano quell'invio, senza troncare o inviare più messaggi.

Riferimenti ufficiali: [Meta Cloud API](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api), [invio template con parametri](https://www.postman.com/meta/whatsapp-business-platform/request/o65u5m5/send-message-template-text), [Netlify cron UTC](https://docs.netlify.com/snippets/functions/scheduled-functions/cron-expression-format/).

## Primo invio reale (ancora disabilitato)

1. Applicare solo `20260914152909_whatsapp_agenda_pt_v1.sql`, quindi pubblicare i file V1 sul sito Calendario con flag ancora `false`. Non coinvolgere Acquisizione, altri siti o worker Apple.
2. Configurare nelle env Functions production il Phone Number ID associato al mittente ufficiale, access token Meta di sistema con permessi WhatsApp, versione Graph supportata, lingua, mappa template approvati e ID sito. I nomi completi sono in `config/whatsapp-agenda.env.example`. Riutilizzare le chiavi server Supabase e la sessione PT/Direzione esistenti.
3. Direzione inserisce i numeri E.164 e abilita solo i PT che hanno accettato l'agenda; default `false` per tutti.
4. Verificare una nuova preview. Dopo autorizzazione esplicita al primo invio, impostare `WHATSAPP_AGENDA_ENABLED=true` e ridistribuire le Functions se necessario. Il job invia alle 06:30; un POST Direzione con `dryRun:false` può avviare il primo invio controllato del giorno, sempre con la stessa idempotenza.

Non confondere un deploy Netlify bloccato alla pubblicazione automatica con il job già pubblicato: il job schedulato segue il flag runtime e il contesto del deploy.

## Verifiche

- `node --test tests/whatsapp-agenda.test.cjs`
- `EMBEDDED_POSTGRES_MODULE=… node tests/whatsapp-agenda-postgres.test.cjs`
- `PLAYWRIGHT_MODULE=… CHROME_PATH=… node tests/whatsapp-agenda-browser.cjs`
- Suite release Calendario, disponibilità e audit esistenti sul commit esatto.
- `scripts/preview-whatsapp-agenda.cjs` genera HTML locale da un JSON con soli campi agenda, senza rete o invio. Le letture production e le preview reali restano fuori dal repository.
