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
   - Il browser usa la sessione PT firmata e chiama la funzione Netlify `pt-data`.
   - La funzione legge i clienti autorizzati e legge/scrive schede da `schede_allenamento` con chiave esclusivamente server-side.
   - Ogni salvataggio aggiorna nella stessa transazione scheda, revisione precedente e righe di `carichi_allenamento`.
   - Il test Hand Grip salva una nuova rilevazione in `pt_hand_grip_measurements` per ogni controllo, mantenendo separati mano destra, mano sinistra, data e protocollo.
   - I giorni selezionabili per una scheda devono rispettare i giorni del pacchetto cliente.

## Tabelle Supabase coinvolte

- `acquisizioni`: prospect e anamnesi iniziale.
- `clients`: clienti attivi, pacchetti, sessioni, giorni, PT assegnato.
- `operators`: staff e professionisti.
- `appointments`: calendario e stato sedute.
- `schede_allenamento`: schede e programmi PT.
- `dati_fisici`: rilevazioni fisiche e test.
- `pt_hand_grip_measurements`: storico dedicato dei test di forza della presa.
- `visite_allenamento`: visite/check allenamento.
- `foto_allenamento`: foto tecniche.
- `carichi_allenamento`: carichi e storico sedute.
- `pt_program_revisions`: copie precedenti delle schede, usate per il ripristino.

## Salvataggi schede PT

- `schede_allenamento.data` salva la scheda completa come sorgente principale: cliente, PT, stato, note, settimane, date delle sedute, esercizi, progressioni e serie.
- Dalla versione `schema_version: 4` il payload include anche `matrix`, una fotografia leggera della struttura della scheda utile per duplicazioni, template e analisi future.
- `carichi_allenamento` conserva una riga deterministica per ogni serie svolta: data seduta, allenamento, settimana, esercizio, ripetizioni, carico, RIR/RPE e nota. Le righe vengono sincronizzate atomicamente con la scheda.
- `pt_program_revisions` conserva al massimo una fotografia precedente per finestra di modifica di dieci minuti; ogni versione mostrata nel portale puo' essere ripristinata.
- L'aggiornamento usa `updated_at` come controllo di concorrenza: se un'altra sessione ha salvato nel frattempo, il portale non sovrascrive e chiede al PT quale versione mantenere.
- `localStorage` puo' contenere solo bozze temporanee anti-perdita. Il salvataggio ufficiale resta sempre Supabase.
- Se `localStorage` e' bloccato o pieno, l'errore non deve impedire il tentativo di salvataggio server.

## Storico Hand Grip

- Ogni pressione su `Salva nello storico` crea una nuova riga: il valore iniziale non viene sovrascritto dai controlli successivi.
- Un inserimento errato può essere annullato: resta tracciato con autore e data dell'annullamento, ma viene escluso dai confronti senza cancellazione definitiva.
- La rilevazione conserva data, miglior valore destro e sinistro in kg, mano dominante, numero di tentativi, posizione, note e PT che ha registrato il test.
- Il Portale confronta ogni controllo con la prima misurazione dello stesso cliente e mostra la variazione assoluta e percentuale per mano.
- Per confronti attendibili il PT deve usare lo stesso dinamometro, la stessa regolazione dell'impugnatura, la stessa posizione e lo stesso numero di tentativi.
- Lettura e scrittura passano da `pt-data`: un PT può modificare solo i clienti assegnati, mentre l'accesso Proprietario resta in sola lettura sui clienti altrui.

## Ordine di rilascio Portale PT

1. Configurare nell'ambiente Netlify `PT_ACCESS_SECRET`, `SUPABASE_URL` e `SUPABASE_SECRET_KEY` oppure `SUPABASE_SERVICE_ROLE_KEY`.
2. Applicare la migrazione `supabase/migrations/20260901094141_secure_pt_program_persistence.sql`.
3. Verificare la funzione `pt_save_program` e l'accesso server-side.
4. Pubblicare funzioni Netlify e `app/portale-personal-trainer` nello stesso deploy.

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
