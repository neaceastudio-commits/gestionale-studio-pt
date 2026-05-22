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
  schema.sql
archive/
```

## App

- `app/acquisizione/`: form/anamnesi prospect. Salva in Supabase `acquisizioni`.
- `app/calendario-studio/`: calendario operativo dello studio. Sincronizza `clients`, `operators`, `appointments` con Supabase.
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

Schema in `supabase/schema.sql`.

Prima di usare dati reali, rivedere le policy RLS: lo schema storico abilita lettura/scrittura pubblica.

## Deploy Netlify separati

Usa lo stesso repository GitHub per tre deploy Netlify separati:

- Acquisizione: publish directory `app/acquisizione`
- Calendario Studio: publish directory `app/calendario-studio`
- Scheda PT cliente: publish directory `app/scheda-cliente`
