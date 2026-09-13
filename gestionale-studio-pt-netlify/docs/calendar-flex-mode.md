# Modalità temporanea di pianificazione flessibile

`CALENDAR_FLEX_MODE` ha una sola sorgente autorevole: la riga omonima di
`public.calendar_runtime_flags`. Il browser legge il booleano tramite la Function
GET/HEAD `calendar-runtime`; il salvataggio PostgreSQL legge la stessa riga dopo
il lock esistente. Il browser non può impostare il flag e nemmeno il service role
può modificarlo tramite REST. Nessuna variabile locale o payload può aggirarlo.

Attivazione/disattivazione riservata all'amministratore del DB:

```sql
update public.calendar_runtime_flags set enabled = true where key = 'CALENDAR_FLEX_MODE';
-- Per ripristinare i vincoli, impostare false e ricaricare il Calendario.
```

La migrazione crea il flag inizialmente false. La sua attivazione non modifica
clienti, appuntamenti o contatori esistenti. La UI aggiorna il flag prima del
salvataggio; l'RPC resta comunque autorevole. Un errore nel caricamento riporta
la UI alla modalità rigida.

In modalità flessibile conflitti PT/cliente/sala, orari e buffer sono warning.
Durate nuove/modificate: multipli di 15, tra 15 e 240. Identità, permessi, controlli
di concorrenza su modifiche allo stesso record, pacchetti, Fatto e residui restano
inalterati. Nessuna modifica a funzioni o trigger audit, né al worker CalDAV.
I vincoli precedenti rimangono integri nel ramo false.
