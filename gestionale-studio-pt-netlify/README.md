# Gestionale Studio PT

Progetto ordinato per lavorare in modalita' codice + deploy, come il progetto nutrizione.

## Struttura

```text
app/
  index.html
  scheda-cliente/
  calendario-studio/
  acquisizione/
supabase/
  migrations/
archive/
```

## App

- `app/acquisizione/`: form/anamnesi prospect. Salva in Supabase `acquisizioni`.
- `app/anamnesi-cliente/`: modulo PT pubblico; quando viene aperto dalla Dashboard con la sessione owner verificata consente anche il recupero dei soli dati comuni dall'anamnesi Nutrizione.
- `app/calendario-studio/`: calendario operativo dello studio. Sincronizza `clients`, `operators`, `appointments` con Supabase.
- `app/portale-personal-trainer/`: portale attivo per schede, sedute e storico Hand Grip; usa la funzione autenticata `pt-data` e non accede direttamente alle tabelle di allenamento dal browser.
- `app/scheda-cliente/`: gestione clienti PT, dati fisici, schede, foto e carichi. Usa Supabase.

## Flusso operativo

1. Acquisizione salva il prospect in `acquisizioni`.
2. Conferma cliente crea una riga in `clients`, con pacchetto servizio, abbonamento e PT assegnato.
3. Calendario legge gli stessi `clients` e usa pacchetto/PT per creare appuntamenti in `appointments`.
4. Scheda Cliente legge gli stessi `clients` e crea schede personalizzate in `schede_allenamento`.
5. Dati fisici, visite, foto e carichi restano collegati al cliente tramite `cliente_id`.

## Supabase

Config frontend attuale in `app/scheda-cliente/js/config.js`, `app/calendario-studio/js/supabase.js` e `app/acquisizione/index.html`:

```js
const SUPABASE_URL = 'https://cdywqyqqmjhgkzwrrixc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_x55VTWLsaSYprArqVIluDQ_oUg3RO24';
```

Le migrazioni versionate sono in `supabase/migrations/`. La migrazione `secure_pt_program_persistence` introduce revisioni recuperabili, salvataggio atomico di scheda e carichi e lo storico Hand Grip dedicato in `pt_hand_grip_measurements`. Le nuove tabelle PT sono accessibili solo lato server; i permessi delle tabelle condivise `schede_allenamento` e `carichi_allenamento` restano compatibili con la Scheda Cliente legacy, la cui migrazione di sicurezza va coordinata separatamente.

Il Portale PT richiede `PT_ACCESS_SECRET`, `SUPABASE_URL` e `SUPABASE_SECRET_KEY` (oppure `SUPABASE_SERVICE_ROLE_KEY`) nell'ambiente Netlify. La chiave server non deve mai essere inserita nei file frontend.

## Deploy Netlify

Il file `netlify.toml` pubblica la cartella `app/portale-personal-trainer`.

Flusso consigliato:

1. compilare e verificare `tools/coaching-editor`;
2. pubblicare soltanto `app/portale-personal-trainer` sul sito `neacea-portale-personal-trainer`;
3. includere le funzioni PT e le funzioni già presenti sul sito, senza i processi pianificati di altre applicazioni;
4. usare Supabase come database master. Dettagli del rilascio: `docs/pt-coaching-release.md`.

Il sito separato dell'Anamnesi Cliente richiede nell'ambiente Netlify le variabili elencate in `.env.example` per abilitare il recupero riservato da Nutrizione. Senza tali variabili il modulo pubblico continua a funzionare, ma il pannello riservato fallisce chiuso.

Per il Portale PT applicare prima la migrazione Supabase, configurare le variabili server e soltanto dopo pubblicare il nuovo frontend e le funzioni Netlify. Non invertire l'ordine: il portale aggiornato usa la funzione SQL atomica `pt_save_program`.

## Stato consolidato — 9 ottobre 2026

Per branch operativo, commit riuniti, versioni online e differenze ancora aperte di Consenso/Anamnesi, leggere [allineamento-20261009.md](docs/allineamento-20261009.md). Questa ricognizione aggiorna le note di rilascio precedenti; i loro stati locali/non committati restano riferimenti storici.
