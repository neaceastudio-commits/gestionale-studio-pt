# Acquisizione — riepilogo prima visita

Pubblicato il 21 settembre 2026 su https://anamnesi-acquisizione-cliente.netlify.app/.

- Deploy: `6ab0fea36a0a4e481eb5384a`.
- Branch di rilascio: `release/acquisition-internal-note`, commit `5e77972aa401ac91e1de2b2cd95351cd1097d35f`.
- Base: `4578e5d291c75b7b375f50aed8950ff2faa9252b`, pagina verificata identica alla precedente produzione.
- Nuovo riepilogo dell'ultima anamnesi PT; nota operatore separata, dati amministrativi richiudibili, report tecnici e storico preservati durante la modifica della nota.
- File funzionali: `app/acquisizione/index.html`, `tests/acquisition-links.test.cjs`.
- Il branch isolato contiene un `netlify.toml` alla radice dedicato al packaging di Acquisizione e alle sole sette funzioni già presenti sul sito. Il riferimento all'integrazione calendario v2 già online è conservato.
- Verifiche: 22 test passati; HTML pubblico identico byte per byte al candidato; asset invariati; sorgenti e dipendenze delle sette funzioni identiche alla base Git, bundle ricompilati da Netlify, richieste OPTIONS senza errori 5xx o 404. Nessun dato cliente modificato.
- Build Git avviata temporaneamente sul branch di rilascio. Al termine ripristinati branch configurato `main`, allowed branches `[main]`, installazione GitHub `131219720`, `stop_builds=true`; nuova produzione bloccata contro pubblicazioni automatiche.
- Branch locale di lavoro invariato: `feature/whatsapp-agenda-pt-v1`. Le altre modifiche locali non sono incluse nel rilascio.

## Correzione disponibilità — 21 settembre 2026

- Deploy pubblicato e verificato: `6ab101357fdfaaf60554d519`.
- Commit: `f00f094e45183b943dfa82295f034717a6307c46`, stesso branch di rilascio.
- Lo specchio PT ignora il buffer tecnico nel controllo di sovrapposizione, come il Calendario e il pianificatore. Sedute adiacenti consentite, sovrapposizioni reali ancora bloccate.
- File: `app/acquisizione/index.html`, `tests/acquisition-availability-parity.test.cjs`.
- 29 test passati, inclusa parità sulle sei date segnalate usando appuntamenti simulati; HTML online identico al candidato, asset e hash delle sette funzioni invariati.
- Confermati `main`, blocco build automatiche e blocco della nuova produzione. Nessun appuntamento reale modificato.
