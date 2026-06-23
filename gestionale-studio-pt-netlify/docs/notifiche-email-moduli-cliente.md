# Notifiche email moduli cliente

I moduli pubblici:

- `app/anamnesi-cliente/index.html`
- `app/consenso-cliente/index.html`

salvano i dati su Supabase e chiamano la funzione Netlify:

```text
/.netlify/functions/form-notify
```

La funzione invia la notifica a:

```text
neacea.desk@gmail.com
```

Per abilitare l'invio reale da Netlify impostare queste variabili ambiente nel sito:

```text
RESEND_API_KEY=...
FORM_NOTIFY_FROM=NEACEA <moduli@tuodominio.it>
```

`FORM_NOTIFY_FROM` e' opzionale. Se manca, viene usato `NEACEA <onboarding@resend.dev>`.
