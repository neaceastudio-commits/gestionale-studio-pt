# Portale PT Fase 1

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
- calendario sedute;
- assegnazione PT-cliente quando la migrazione Fase 1 e' applicata.

## Cosa non fa

- schede allenamento;
- libreria esercizi;
- blocchi N0-N11;
- foto PT;
- Visbody PT;
- PDF;
- grafici;
- storico carichi.

## Database

Quando esistono, usa le viste Fase 1:

- `operator_effective_roles`
- `pt_dashboard_metrics`
- `pt_client_overview`
- `pt_calendar_sessions`
- `trainer_client_assignments`

Finche' la migrazione non e' applicata su Supabase, usa un fallback di sola lettura su:

- `operators`
- `clients`
- `appointments`
- `acquisizioni`

Il fallback mostra un avviso giallo in alto.
