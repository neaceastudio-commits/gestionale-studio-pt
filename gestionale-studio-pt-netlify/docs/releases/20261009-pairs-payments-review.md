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

257 test automatici superati, zero fallimenti e zero saltati; inclusi autorizzazioni, migrazione PostgreSQL locale, assenze miste, residui, pagamenti duplicati/rettificati e ore simultanee.
Browser: associazione obbligatoria, salvataggio concorrente rifiutato senza perdere residui, rinnovo condiviso, presenze, compenso unico, registrazione/rettifica dei pagamenti su mobile.

## Rilascio e verifiche online

Autorizzazione esplicita ricevuta per migrazione, rettifiche e pubblicazione. Migrazione applicata come `20261009093137_calendar_pair_payments_review`.

- 40 righe delle due coppie consolidate in 20 appuntamenti; 20 righe annullate e conservate nel registro.
- Residui dopo la rettifica delle assenze: Patrizia 6, Vincenza 6, Cristiano 1, Silvia 1.
- Cinque sedute di Fabrizio assegnate ad Alessandro; Valentina del 16 luglio riclassificata PT 1:1; Alessia del 28 ottobre marcata con orario provvisorio.
- Sette etichette corrette dopo autorizzazione nominativa: Simone Cao, Maura Ganga, Aurora Margini, Maria Mura, Luciana Pibiri, Valentina Pilia e Camilla Pinna. Altri servizi, importi e residui conservati.
- Nessuna seduta attiva PT 1:2 con un solo partecipante e nessuna seduta PT svolta senza operatore.
- Verifica browser sul Calendario pubblicato: 743 appuntamenti caricati, zero sedute escluse per anomalie nei riepiloghi giugno/luglio/settembre/ottobre, nessun errore JavaScript, nessuno scorrimento orizzontale mobile.
- Zero pagamenti reali inseriti: il registro è pronto, senza inventare lo storico degli importi versati.
- Consenso conserva minorenni/tutori. Anamnesi usa il gateway Nutrizione tramite `nutrition-import-bridge`, con sessione verificata dal servizio esistente. Nessun segreto copiato.

La Direzione ha chiesto di lasciare a sé la chiusura della lezione ancora prenotata di Cristiano/Silvia e il rinnovo dalla seduta successiva: non sono stati registrati presenza, rinnovo o incasso presunti.

Deploy verificati:
- Calendario: `6ac8b4ffe683f660199d8499`, commit applicativo `0287dc3`; branch di build ripristinato a main e build automatiche nuovamente disabilitate.
- Portale: `6ac8b52d36cbbab7912f8c10`, manifest statico e funzioni estranee preservati.
- Consenso: `6ac8b614c4027d5818799c77`.
- Anamnesi: `6ac8b71b6651e3686af2bd63`, sorgente locale allineata e bridge autenticato verificato.

Gli advisor Supabase non hanno segnalato nuovi errori per questo rilascio; RLS senza policy su `pt_trainer_payments` è intenzionale, con accesso revocato ai ruoli pubblici e solo gateway della Direzione. Le segnalazioni preesistenti su altre viste rimangono fuori da questa modifica.
