# Calendario, coppie e pagamenti — rilascio del 9 ottobre 2026

Branch: `feature/whatsapp-agenda-pt-v1`.

## Regole confermate dalla Direzione

- Solo Patrizia–Vincenza e Cristiano–Silvia sono PT 1:2. Una seduta condivisa per data, con due partecipanti e pacchetti indipendenti. La modalità richiede un partner associato reciprocamente.
- PT 1:2: 15 €/ora complessivi, anche con uno o entrambi assenti; ogni assenza scala il pacchetto di entrambi.
- PT 1:1: 10 €/ora per ogni seduta individuale, anche quando più sedute coincidono. Due sedute individuali di 60 minuti valgono 20 € e 120 minuti remunerati; se coincidono, l’occupazione dell’agenda è di 60 minuti. I conteggi rimangono distinti.
- Orario provvisorio: PT e orario indicativo rimangono salvati. Escluso dalle ore pianificate e maturate; la conferma richiede uno slot senza conflitti. Il promemoria PT indica «da confermare».
- Registro pagamenti: riservato alla Direzione; importo, mese, data, metodo e note. Registra soldi già versati, non dispone bonifici. Rettifica motivata, storico immutabile, invio ripetuto senza duplicati. Maturato incompleto segnalato separatamente.
- Foto: sezione rimossa; vecchio endpoint restituisce 410 e non accede a Storage. Nessun file dei clienti eliminato.

## Rettifiche reali preparate

- Unire gli appuntamenti corrispondenti delle due coppie. Annullare la riga duplicata mantenendola nel registro; preservare i collegamenti individuali ai cicli e le presenze. Applicare lo scalo anche alle assenze PT 1:2.
- Cinque sedute di Fabrizio Lampis del 13, 16, 20, 23 e 27 giugno: assegnare Alessandro Pirisi.
- Valentina Pilia del 16 luglio: correggere la modalità in PT 1:1.
- Alessia Dessalvi del 28 ottobre alle 17:00: mantenere Martina e l’orario, qualificandolo come provvisorio.
- Le altre sovrapposizioni PT 1:1 rimangono individuali, come chiarito dalla Direzione; nessun orario storico inventato.
- Nessun pagamento pregresso inventato o marcato come saldato.

## Allineamento dei moduli

- Consenso: recuperata nel file locale la versione già online, inclusi minorenni e tutori.
- Anamnesi: pubblicare l’attuale sorgente locale e il collegamento al gateway Nutrizione già esistente. Preservare le funzioni online estranee al cambiamento. Escludere dalla nuova pubblicazione vecchi ZIP, sorgenti server e file di test che erano erroneamente presenti tra gli asset pubblici.

## Verifiche

256 test automatici superati, zero fallimenti e zero saltati; inclusi autorizzazioni, migrazione PostgreSQL locale, assenze miste, residui, pagamenti duplicati/rettificati e ore simultanee.
Browser: associazione obbligatoria, salvataggio concorrente rifiutato senza perdere residui, rinnovo condiviso, presenze, compenso unico, registrazione/rettifica dei pagamenti su mobile.

## Stato prima dell’approvazione di produzione

La migrazione `20261009091426_calendar_pair_payments_review.sql` è verificata localmente. Il controllo automatico ha rifiutato l’applicazione online richiedendo un’approvazione esplicita per il database di produzione. Nessuna rettifica reale o migrazione di questo rilascio è stata applicata.

Per completare: applicare la migrazione, eseguire le rettifiche tramite transazioni auditate con controllo delle versioni, pubblicare Calendario/Portale/moduli preservando i manifest esistenti e verificare file e comportamenti online. Gli endpoint che dipendono dalla migrazione non vanno pubblicati prima della sua applicazione.
