# Flusso Operativo Gestionale Studio PT

Questo progetto tiene i deploy separati, ma usa Supabase come sorgente unica dei dati.

## Principio guida

Supabase e' la verita'. Le app Netlify possono avere cache locale per velocita' e continuita' temporanea, ma non devono considerare localStorage come archivio principale.

## Flusso cliente

1. Acquisizione
   - Registra prospect, anamnesi, obiettivi, disponibilita', servizi richiesti e note.
   - Tabella principale: `acquisizioni`.

2. Conferma cliente
   - Trasforma un prospect in cliente attivo.
   - Scrive in `clients`:
     - anagrafica
     - pacchetto/servizi
     - frequenza
     - sessioni totali e rimanenti
     - giorni del pacchetto
     - PT assegnato
     - stato pagamento/abbonamento
   - Crea gli appuntamenti iniziali in `appointments` quando vengono scelti data, giorni e pacchetto.
   - Rimuove il prospect da `acquisizioni`.

3. Calendario studio
   - Legge clienti, staff e appuntamenti da Supabase.
   - Gestisce prenotazioni, spostamenti, no-show, eliminazioni, partecipanti circuit.
   - Non deve generare automaticamente appuntamenti durante il sync ordinario.
   - Quando una seduta PT passa a `fatto`, ricalcola le sessioni residue partendo dagli appuntamenti realmente completati.
   - Nutrizione, valutazioni e blocchi agenda non scalano sessioni PT.

4. Scheda PT cliente
   - Legge i clienti attivi da `clients`.
   - Legge/scrive schede da `schede_allenamento`.
   - Legge/scrive dati fisici, visite, foto e carichi dalle tabelle dedicate.
   - I giorni selezionabili per una scheda devono rispettare i giorni del pacchetto cliente.

## Tabelle Supabase coinvolte

- `acquisizioni`: prospect e anamnesi iniziale.
- `clients`: clienti attivi, pacchetti, sessioni, giorni, PT assegnato.
- `operators`: staff e professionisti.
- `appointments`: calendario e stato sedute.
- `schede_allenamento`: schede e programmi PT.
- `dati_fisici`: rilevazioni fisiche e test.
- `visite_allenamento`: visite/check allenamento.
- `foto_allenamento`: foto tecniche.
- `carichi_allenamento`: carichi e storico sedute.

## Responsabilita' per evitare doppioni

- Acquisizione confermata crea cliente e appuntamenti iniziali.
- Calendario sincronizza, modifica e aggiorna appuntamenti esistenti.
- Calendario puo' creare appuntamenti manuali solo su azione esplicita dell'utente.
- Il sync del calendario non deve riempire automaticamente appuntamenti mancanti a ogni caricamento.

## Regole sessioni

- Scalano solo i servizi PT/circuit compatibili con sessioni pacchetto.
- Non scalano nutrizione, valutazioni, Visbody/Baiobit, blocchi agenda.
- Il residuo e' ricalcolato come:

```text
sessioni_rimanenti = sessioni_totali - appuntamenti_fatti_che_consumano_sessioni
```

- Se una seduta fatta viene rimessa a prenotata/no-show o viene eliminata, il residuo deve tornare coerente.

## Regole giorni

- Se il cliente ha giorni pacchetto definiti, calendario e scheda PT devono accettare solo quei giorni per sedute PT.
- Pacchetto da 2 sessioni: massimo 1 giorno a settimana.
- Frequenza `2x`, `3x`, ecc.: massimo pari alla frequenza indicata.

## Deploy

I deploy possono restare separati:

- acquisizione
- calendario studio
- scheda PT cliente

Ogni deploy deve pero' puntare allo stesso progetto Supabase e allo stesso modello dati.
