# Calendario — visibilità delle sedute riassegnate

17 ottobre 2026. Applicazione: Calendario Studio, repository `gestionale-studio-pt`.
Branch: `feature/whatsapp-agenda-pt-v1`.

## Modifica pronta

La vista personale PT usa il PT assegnato alla singola seduta. La precedente
regola includeva anche qualsiasi appuntamento di un cliente del referente,
facendo comparire la stessa seduta sia al referente sia al collega che doveva
svolgerla.

Dopo la riassegnazione di una sola seduta da A a B:

- A non vede più quella seduta nella propria agenda o nei relativi contatori;
- B vede la seduta anche se il cliente rimane di riferimento ad A;
- le altre sedute ancora assegnate ad A rimangono nella sua agenda;
- la Direzione conserva la vista generale di tutte le sedute e dei rispettivi PT;
- per le coppie conta il PT della seduta, non il referente di uno dei partecipanti;
- disponibilità fisica delle sale e controlli dei conflitti continuano a usare
  gli appuntamenti completi: nessun appuntamento viene cancellato o riassegnato
  da questa modifica di visibilità.

Giorno, Settimana, Dashboard e schede appuntamento della vista Sale usano il
filtro condiviso `Services.getAppointmentsForDate` e la stessa regola. Il normale
aggiornamento del Calendario rilegge anche le riassegnazioni effettuate altrove.

## File

- `app/calendario-studio/js/app.js`: `App.canViewAppointment` segue esclusivamente
  l'operatore della seduta in modalità personale PT.
- `app/calendario-studio/index.html`: versione `20261017-session-pt` dello script.
- `tests/calendar-session-visibility.test.cjs`: riferimento cliente, sostituzione,
  ritorno al PT originario, coppie, contatori, occupazione sale e alias legacy.
- `tests/calendar-release-regression.cjs`: aspettative aggiornate alla nuova regola.

## Verifiche

- 7 test superati: 4 di visibilità delle sedute e 3 di refresh/sincronizzazione.
- Sintassi `app.js` e `git diff --check`: superati.
- `scripts/check-calendar-release.sh`: tutte le verifiche funzionali superate;
  gate Git finale bloccato perché i file critici non sono tutti committati,
  comprese le modifiche precedenti del Portale PT già presenti all'inizio.
  Non sono stati committati o pubblicati indiscriminatamente quei cambiamenti.

Git: modifiche locali non committate; nessun push, migrazione o dato reale modificato.

## Pubblicazione

Non ancora pubblicato. Autorizzazione richiesta per il sito
https://new-calendar-neacea.netlify.app/: l'autorizzazione automatica del repository
copre solo il sito Portale PT, non quello Calendario. Dopo l'autorizzazione occorre
un rilascio isolato del Calendario, preservando funzioni e pianificazioni esistenti.
