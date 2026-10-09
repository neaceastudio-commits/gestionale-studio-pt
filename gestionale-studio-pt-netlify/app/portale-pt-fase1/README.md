# Portale PT

Modulo locale separato dal cruscotto admin esistente.

## Ripristino Centrale PT — 16 settembre 2026

Ripristinato `index.html` dal commit `cf8962c`, ultima versione della pagina
originale prima della sostituzione con il Cruscotto. JavaScript, CSS e logo
erano già presenti e corrispondono a quella versione. Sono nuovamente visibili
la selezione del singolo PT, clienti, programmi, calendario, assegnazioni e
il pannello «Accesso personale PT» (email, abilitazione, invio accesso).

## Preparazione pubblicazione — 17 settembre 2026

La UI originale ora carica `studio-audit-access.js`: accessi operatore e
modifiche cliente passano dal gateway Studio esistente con sessione Direzione.
Le assegnazioni usano il PATCH cliente, che aggiorna anche la relazione PT in
una transazione auditata. Nessuna modifica ai privilegi del database.

Il database verificato non possiede `portal_access_enabled`: l'abilitazione
salva email, ruolo PT e stato attivo attraverso il gateway. La disabilitazione
del solo portale viene rifiutata esplicitamente senza simulare un salvataggio.
Un errore di autenticazione o di rete non attiva il fallback legacy.

Test dedicato: `node tests/centrale-restored-browser.cjs` (Playwright,
`PLAYWRIGHT_MODULE` e `CHROME_PATH` opzionali). Verifica filtro PT, accessi,
assegnazioni e rifiuto delle scritture senza sessione, con database ed email
simulati. Programmi e media conservano il percorso storico e non sono stati
validati sui dati reali da questo intervento.

Pubblicata il 17 settembre 2026 su https://neacea-centrale-pt.netlify.app/.
Deploy: `6aabea8fc12471f5805ad852`, pacchetto statico di sei file della sola
Centrale. Build riattivate con autorizzazione esplicita; il blocco della
pubblicazione automatica è rimasto attivo. Nessuna migrazione o modifica
alle funzioni condivise. Verificati in anteprima caricamento operatori e
indicatori della dashboard, quindi presenza della pagina sul dominio pubblico.
Salvataggi ed email verificati con simulazioni, non sui dati reali.

Percorso:

```text
app/portale-pt-fase1/index.html
```

## Cosa fa

- selezione operatore/PT temporanea;
- dashboard PT;
- clienti assegnati;
- scheda cliente solo anagrafica, anamnesi e alert;
- programmi/schede PT;
- creazione e modifica scheda;
- blocchi NEACEA ufficiali N0-N11;
- sedute con blocchi ed esercizi;
- duplicazione vuota, con storico e con progressione;
- archiviazione scheda;
- calendario sedute;
- assegnazione PT-cliente quando la migrazione Fase 1 e' applicata.

## Cosa non fa ancora

- libreria esercizi normalizzata;
- foto PT;
- Visbody PT;
- PDF;
- grafici;
- storico carichi avanzato.

## Database

Quando esistono, usa le viste Fase 1:

- `operator_effective_roles`
- `pt_dashboard_metrics`
- `pt_client_overview`
- `pt_calendar_sessions`
- `trainer_client_assignments`
- `schede_allenamento`

Finche' la migrazione non e' applicata su Supabase, usa un fallback di sola lettura su:

- `operators`
- `clients`
- `appointments`
- `acquisizioni`

Il fallback mostra un avviso giallo in alto.

Le schede Fase 2 sono salvate in `schede_allenamento.data` con `schema_version: 2`, mantenendo compatibilita' con le schede storiche gia' presenti.
