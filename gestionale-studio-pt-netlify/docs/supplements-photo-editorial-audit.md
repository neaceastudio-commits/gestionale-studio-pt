# Integratori — verifica foto e schede del 7 ottobre 2026

Applicazione: Gestionale Studio PT / Portale PT. Branch:
`feature/whatsapp-agenda-pt-v1`; HEAD preesistente `dd14a90`.

## Risultato verificato

- 20 prodotti pubblicati, 25 varianti attive con fotografia.
- Foto ufficiali aggiunte ad Ashwagandha 1000 e Wafer Zero, con immagini distinte
  per cocco fondente e pistacchio/cioccolato bianco.
- Testi completi dei due prodotti e delle tre varianti aggiornati nel database,
  con fonti e audit prima/dopo; passaggio da bozza a pubblicato.
- 25 firme PDF corrispondenti ai contenuti correnti del database.
- 25 PDF online verificati byte per byte rispetto ai file locali.
- Tre nuovi PDF renderizzati e controllati visivamente; controllate anche
  le pagine delle 22 schede precedenti. Catalogo cumulativo di 25 pagine.
- Stesso modello A4, logo NEACEA originale, Space Grotesk e Montserrat.
- Le tre varianti Hydro mantengono la foto rappresentativa già dichiarata
  nelle schede: non è una fotografia specifica di ogni gusto.
- Prezzi effettivi, prezzi pubblici, base IVA e aliquote confrontati con la
  lettura precedente: invariati. Nessuna modifica a stock, vendite, schema o RLS.

## Fonti delle nuove schede

- https://www.whynature.it/prodotto/ashwagandha-1000-60-cpr/
- https://www.whynature.it/prodotto/wafer-zero/
- https://www.nccih.nih.gov/health/ashwagandha

Per Ashwagandha la sezione «Cosa fa» distingue i risultati limitati su stress e
sonno dalle promesse non dimostrate sulla prestazione. Per i Wafer sono distinte
composizione, valori per pezzo e allergeni dei due gusti.

## File interessati da foto/editoriale/listino

- `../AGENTS.md`: memoria politica prezzi ai €0,50, IVA inclusa.
- `docs/supplements-ddt-workflow.md`: controllo completo delle nuove varianti.
- `docs/supplements-editorial.json`: due nuovi prodotti e tre varianti.
- `docs/supplements-photos.json`: fonti delle nuove immagini.
- `scripts/build-supplement-pdfs.py`: data scheda configurabile per prodotto.
- `scripts/build-supplement-price-list.py`: copertura delle nuove varianti,
  importi con centesimi e controllo di copertura del listino.
- `app/portale-personal-trainer/integratori/pdf-manifest.json`.
- `app/portale-personal-trainer/integratori/pdf/ashwagandha-1000-standard.pdf`.
- `app/portale-personal-trainer/integratori/pdf/wafer-zero-cocco-fondente.pdf`.
- `app/portale-personal-trainer/integratori/pdf/wafer-zero-pistacchio-cioccolato-bianco.pdf`.
- `app/portale-personal-trainer/integratori/pdf/neacea-catalogo-integratori.pdf`.
- PDF generati in `output/pdf/`; le 22 schede statiche precedenti non sostituite.
- Questo verbale.

## Verifiche e pubblicazione

`node scripts/build-supplement-inventory.cjs`: superato.
`scripts/check-supplements.sh`, con runtime PGlite già disponibile: 20/20 test.
Verificati ruoli, proiezione sicura PT, contabilità, prezzi storici e arrotondamenti.

Pubblicazione mirata delle sole cinque risorse PDF/manifest:
`6ac65daf1c2f7fb43aeaedd1`, verificata attiva; funzioni e altri asset preservati;
blocco della pubblicazione automatica Git mantenuto. Endpoint privato senza
credenziali respinto. Route: `/integratori/`.

Git finale: file del modulo già non tracciati, insieme ad altre modifiche
preesistenti nel repository; nessun commit o push generale eseguito.

## Listino prezzi: allineamento completato

Il 7 ottobre l’utente ha ribadito «ti ho già detto come fare e allineati».
Applicata a tutte le 25 varianti la regola pubblico IVA inclusa meno 20%,
arrotondamento finale ai €0,50 più vicini. Rettificati 18 prezzi, 7 già corretti;
nessuna modifica ai prezzi pubblici, ai costi o ai movimenti storici.
Aggiornamenti atomici con controllo concorrenza e 18 audit prima/dopo,
attore `codex-price-alignment-20261007`. Verifica SQL: 25/25 conformi.

I 29 movimenti mantengono la stessa impronta prima e dopo l’aggiornamento:
`73f66ab553d4bb7ebb93d476ddad136c`. Stock, incassi e utili storici invariati.

Aggiornati `docs/supplements-price-list.json`, il PDF in `output/pdf/` e
`app/portale-personal-trainer/integratori/pdf/neacea-listino-integratori.pdf`.
Listino A4: 21 righe raggruppate, tutte le 25 varianti, logo e font originali;
Wafer venduto al pezzo, senza prezzi di costo. PDF renderizzato e controllato.
Build superata e 20/20 test del modulo superati.

Listino pubblicato con deploy `6ac660de602809285f4704e0`: un solo asset statico
sostituito, nessuna funzione modificata, blocco pubblicazione Git mantenuto.
Route PDF: `/integratori/pdf/neacea-listino-integratori.pdf`.
Stato Git finale: i sei file del listino/procedura/generatore risultano `??`
(non tracciati, come il modulo preesistente); nessun commit/push eseguito.
