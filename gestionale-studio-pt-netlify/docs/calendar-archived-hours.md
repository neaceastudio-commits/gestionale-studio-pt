# Calendario — Ore PT conservate dopo archiviazione

Correzione del 13 ottobre 2026. Il cliente può essere eliminato dal calendario,
non rinnovare o essere ibernato: le sedute già chiuse mantengono cliente, PT,
data, durata e stato. Le presenze svolte continuano a entrare nel monte ore e
nei compensi secondo le regole esistenti. Nessuna presenza o pagamento viene
inventato o riscritto.

- Le sedute `fatto` e `noshow` restano visibili nello storico e nell’agenda,
  anche quando i clienti sono archiviati o l’anagrafica non è più presente.
  Nei PT 1:2 non vengono rimossi i partecipanti dalla seduta chiusa.
- L’archiviazione modifica soltanto sedute future ancora `prenotato`. Il normale
  salvataggio atomico verifica lo stato originale: se un PT chiude una lezione
  nel frattempo, l’archiviazione si ferma senza annullarla. L’anagrafica viene
  archiviata cambiando soltanto attivazione e stato amministrativo: note del
  pacchetto e residui aggiornati da altri PT restano nel database.
  Presenze, assenze scalate e relative identità vengono preservate integralmente.
- Un PT 1:2 futuro viene annullato per la coppia, conservando entrambi gli ID e
  senza consumare il pacchetto del partner; i gruppi diversi dal PT 1:2 mantengono
  il comportamento di rimozione del solo cliente archiviato.
- Il riepilogo ore PT usa tutto lo storico, indipendentemente dai clienti attivi.
  Una riga indica quante ore delle sedute svolte riguardano clienti archiviati,
  sospesi o non più presenti. È un sottoinsieme delle ore già maturate.

## Riscontro del caso segnalato

Letture del database e del normale sito online, senza scritture di dati reali:
le sedute svolte del cliente segnalato sono ancora presenti; 31 ore PT 1:1 con
Alessandro, di cui 3 a ottobre. Nel riepilogo online di ottobre Alessandro ha
30 ore remunerate (25 PT 1:1 e 5 PT 1:2), con 29 ore occupate per gli orari
sovrapposti. Le 3 ore svolte con il cliente archiviato sono comprese nel totale.

L’audit mostra invece che l’archiviazione precedente ha annullato anche quattro
assenze scalate datate dal 12 al 19 ottobre, oltre alle prenotazioni future.
Il difetto è corretto per le nuove archiviazioni; quelle quattro righe non sono
state trasformate in presenze svolte o rettificate automaticamente. Non costituiscono
ore lavorate già registrate e non si cambiano regole di compenso o pacchetti.

## Verifiche

`node --test tests/calendar-archived-hours.test.cjs` verifica visibilità e ore
con clienti attivi, archiviati, ibernati e anagrafiche mancanti, identità complete
PT 1:2 e archiviazione delle sole prenotazioni future.

`tests/calendar-archived-hours-browser.cjs` verifica con dati simulati il normale
flusso di archiviazione, ore e compensi invariati dopo ricarica, storico visibile,
identità della coppia e assenze scalate preservate. Suite generale Calendario.

Nessuna migrazione o modifica di dati reali necessaria per questa correzione.
