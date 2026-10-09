# Gestionale Studio PT — allineamento del 9 ottobre 2026

Questo documento è il riferimento aggiornato per lo stato Git e i rilasci elencati. I documenti precedenti descrivono la situazione alla rispettiva data, comprese le vecchie note «locale» o «non committato».

## Sorgenti e Git

Branch operativo: `feature/whatsapp-agenda-pt-v1`.

- `d76a34f`: consolidamento delle lavorazioni preesistenti, inclusi Portale, cartelle/programmi, Integratori, Cruscotto, Calendario, strumenti Apple/email, migrazioni, test e documentazione.
- `7a7c568`: integrazione della storia di `release/calendar-pt-pair-rules`, mantenendo il Portale e le correzioni Apple più recenti.
- `4d0374c`: integrazione della release Acquisizione già online, compresa l'anteprima e la durata delle sedute. Recuperata una funzionalità che mancava nel precedente checkout locale.

Non sono stati eliminati file di lavoro né modificati altri repository. Output riproducibili, cartelle temporanee, cache Supabase e file ambiente reali sono esclusi da Git; PDF e immagini distribuiti dal Portale sono invece versionati come binari. Il controllo dei sorgenti non ha trovato token o chiavi private; `.env.example` contiene soltanto campi vuoti.

Il branch operativo viene sincronizzato con il ramo omonimo su origin. `main` e i rami storici non vengono riscritti. Non è corretto usare un ramo storico come sorgente del prossimo intervento ignorando il consolidamento.

## Versioni online verificate

| Modulo | Deploy | Corrispondenza delle risorse applicative locali |
| --- | --- | --- |
| Calendario | `6ac8a830c4027dec4f799cf5` | 32/32 file applicativi identici; configurazione di rilascio aggiunta da Netlify |
| Portale PT e Integratori | `6ac8a8367390b821c3f16180` | 52/52 file applicativi identici; aggiornato solo pt-data, conservate altre 19 funzioni e pianificazioni |
| Cruscotto | `6abad55d18fa3d589f3ff899` | 3/3 identici |
| Acquisizione | `6ab101357fdfaaf60554d519` | 5/5 identici dopo l'integrazione della release f00f094 |
| Centrale PT | `6ab164ba20588b00b7684c63` | 5/5 applicativi identici; configurazione di distribuzione specifica |
| Apple | `6ac8a8bae683f604e29d837c` | pagina invariata; quattro bundle aggiornati nel solo adattatore cicli/metadata |

Il confronto statico non certifica che tutte le funzioni di tutti i siti abbiano lo stesso bundle: i servizi hanno configurazioni e rilasci distinti. I nuovi bundle del Calendario e di pt-data sono stati verificati; per Apple sono state conservate byte per byte le altre voci degli archivi e le pianificazioni esistenti.

Calendario e Portale: nuove release in contesto `production`, pubblicazione verificata e blocco automatico preservato. Calendario: collegamento GitHub ripristinato, ramo configurato main e `stop_builds=true`. Nessun push del consolidamento deve essere interpretato come pubblicazione automatica di tutti i siti.

## Differenze storiche ancora aperte

- **Consenso Cliente**: la pagina online comprende anche campi per minore/tutore che il sorgente locale non contiene. Nessuna delle due versioni è stata sovrascritta durante l'allineamento.
- **Anamnesi Cliente**: il sito standalone pubblica ancora una distribuzione precedente, con struttura e risorse diverse dal modulo locale e dall'integrazione Nutrizione. Nessun deploy di questo sito eseguito.

Questi due siti non sono dichiarati allineati: richiedono una verifica funzionale e un rilascio dedicato, senza sovrascrivere il comportamento corrente sulla sola base della data dei file.

## Database e regole PT 1:2

Inventario migrazioni remote: `database-migrations-production.json`. I nomi delle migrazioni sono il riferimento; i timestamp locali e quelli assegnati dal servizio possono differire. Non rieseguire tutte le migrazioni per il solo fatto che i numeri non coincidono.

Migrazione della coppia applicata come `20261009083023_calendar_pt_pair_rules`. Nessun rinnovo reale effettuato: la Direzione può procedere dopo avere chiuso/annullato eventuali sedute ancora prenotate del vecchio pacchetto. Dettagli in `calendar/pt12-client-save.md`.

PT 1:1: €10/ora. PT 1:2: una seduta, un'ora e €15 complessivi; ogni assenza scala la seduta a entrambi. Il tipo resta PT 1:2 salvo modifica esplicita della Direzione. Pacchetti e presenze sono individuali. I duplicati storici sono segnalati, non corretti automaticamente.

## Verifiche eseguite

- Intera suite `node --test --test-concurrency=2 tests/*.test.cjs tests/*.test.mjs`: **254 test superati, zero errori e zero test saltati**, compresi PostgreSQL temporaneo e PGlite.
- `scripts/check-calendar-release.sh`: superato, incluso controllo che i file critici siano committati.
- Editor `tools/coaching-editor/test.mjs`: superato (round-trip, copie, gruppi, settimane e separazione dati delle sedute).
- Chrome con richieste simulate: rinnovo PT 1:2, preview, retry idempotente, presenza/assenza, reload e €15 per un'ora; flusso Acquisizione con calendario; spostamento programmi/cartelle e creazione senza dati del cliente: superati.
- Database produzione: prova transazionale poi annullata su dati di collaudo; contatori reali invariati e zero righe di collaudo residue.
- Advisor Supabase: nessun nuovo errore; la nuova tabella receipt è intenzionalmente accessibile solo al servizio. Restano le segnalazioni preesistenti (sei viste security-definer e protezione password compromesse non attiva), estranee a questo allineamento.

Due test obsoleti sono stati adeguati alle specifiche già implementate: esclusione degli ibernati e distinta azione «Salva allenamento». Il test di modifica singola seduta usa ora il percorso atomico effettivo.

## Configurazioni di rilascio

- `netlify.toml` alla radice del repository: Calendario, dal ramo release verificato.
- `netlify-acquisizione.toml` alla radice: configurazione Acquisizione conservata dalla release già pubblicata.
- `gestionale-studio-pt-netlify/netlify.toml`: Portale PT.
- `tools/apple-caldav-production/netlify.toml`: worker Apple.

Prima di ogni rilascio scegliere esplicitamente sito, configurazione e commit. Dopo il lavoro salvare i file pertinenti, verificare lo stato Git e sincronizzare il branch, evitando di accumulare altri rilasci fuori dalla storia del repository.
