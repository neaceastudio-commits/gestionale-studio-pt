# NEACEA PT — staging Supabase locale

Ambiente isolato per verificare lo schema PT con dati esclusivamente sintetici.

Regole di sicurezza:

- non collegare questa directory a un progetto Supabase remoto;
- non eseguire `supabase link`, `db push` o comandi di deploy;
- non inserire URL, chiavi o dump di produzione;
- applicare la migrazione candidata direttamente dal file in `../docs`;
- mantenere le mutazioni anonime disabilitate finché Auth e RLS non sono definiti.

Lo script di applicazione rifiuta di procedere se l'API Supabase non risponde su
`127.0.0.1`/`localhost` o se rileva un project ref remoto.

## Servizi inclusi

Lo staging avvia soltanto ciò che serve a questa validazione:

- PostgreSQL;
- Data API/PostgREST;
- Auth;
- API gateway.

Studio, Storage, Realtime, Edge Functions, analytics e posta locale restano
disabilitati per ridurre l'uso di memoria sul Mac.

## Comandi

Da `gestionale-studio-pt-netlify`:

```text
npm run staging:up
npm run staging:check
npm run staging:status
npm run staging:down
```

`staging:check` ricrea esclusivamente lo schema `public` del database locale,
applica la baseline sintetica, esegue due volte la migrazione candidata per
verificarne l'idempotenza, estende la vista calendario e carica le fixture.

## Limiti intenzionali

- la baseline riproduce soltanto le tabelle e le colonne coinvolte nel dominio PT;
- non contiene dump o clienti reali;
- non definisce ancora i ruoli applicativi PT/coordinamento/reception/amministrazione;
- `anon` e `authenticated` sono in sola lettura; `service_role` viene usato solo
  dai test locali;
- la versione PostgreSQL remota deve essere verificata prima di una futura
  esecuzione cloud.
