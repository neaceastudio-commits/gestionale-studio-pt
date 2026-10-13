# Calendario — Compenso teorico a fine mese

Il riepilogo ore e il resoconto giornaliero mostrano, per PT e mese selezionato:

- compenso già maturato: sedute svolte e assenze effettivamente scalate;
- valore delle sedute ancora prenotate: 10 €/h individuale e 15 €/h coppia,
  proporzionato alla durata e con una sola quota per la coppia;
- compenso teorico finale: somma dei due importi, da confermare a fine mese
  in base agli stati definitivi delle sedute.

La stima usa tutte le prenotazioni ancora aperte nel mese, anche quelle passate
in attesa di aggiornamento; non anticipa una presenza o un pagamento.
Annullate, assenze non scalate, orari provvisori e sedute fuori mese sono esclusi.
Le anomalie già escluse dal calcolo rimangono visibili e rendono parziale il totale.
Il passaggio da prenotato a svolto/scalato trasferisce il compenso dalla stima al
maturato; la cancellazione recuperabile riduce la stima. Nessun pagamento reale
è creato e non viene introdotta una conferma automatica di fine mese.

Chiarite anche le etichette: «Ore PT ancora prenotate» e «Ore effettivamente
svolte», queste ultime senza duplicare sovrapposizioni e senza assenze scalate.

Verifiche: modello misto individuale/coppia e durata, cambio stato, esclusioni,
riconciliazione del resoconto e browser desktop/mobile sulle due viste, senza
scritture di dati; controllo completo scripts/check-calendar-release.sh.
