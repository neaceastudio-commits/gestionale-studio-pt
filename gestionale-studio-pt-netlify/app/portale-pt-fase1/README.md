# Portale PT

Modulo locale separato dal cruscotto admin esistente.

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
