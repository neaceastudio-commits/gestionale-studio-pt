# Integratori — API e procedura operativa

Endpoint: `POST https://neacea-portale-personal-trainer.netlify.app/.netlify/functions/supplements`.
Content-Type: application/json. Autenticazione: `Authorization: Bearer <sessione Direzione>`
rilasciata dal normale accesso Portale PT (`pt-access-email`, action `verify`).
Il processo esterno deve conservare la sessione soltanto lato server e rinnovare
l'accesso quando scade; non esiste un token permanente o un servizio OCR già collegato.
Identità, ruolo, stato attivo e versione di accesso vengono ricontrollati a ogni richiesta.
La service key rimane nelle variabili server Netlify. Nessun nuovo segreto richiesto.

## Azioni

Tutte le azioni tranne `catalog` richiedono Direzione. Il catalogo PT contiene
soltanto schede pubblicate, tag, fonti verificate e disponibilità sì/no, senza costi,
stock numerico, documenti o margini. Il PDF listino contiene solo prezzi di vendita.

- `catalog`: catalogo condiviso; Direzione vede anche le bozze.
- `inventory`: dati gestionali, prezzi, movimenti, documenti e totali per base IVA.
- `intake`: identifica per EAN/SKU, poi marca + nome + variante + formato;
  crea una bozza se manca e registra il carico in una transazione.
- `enrich`: importa dati strutturati, tag e fonti; lascia in bozza.
- `publish`: approvazione esplicita dopo revisione; richiede foto, fonte verificata,
  prezzo pubblico e almeno cos'è/cosa fa/uso.
- `movement`: PURCHASE, SAMPLE, SALE, RETURN, ADJUSTMENT, DAMAGE, OTHER.
- `upload_document`: originale privato in base64; limite 2,5 MB, controllo firma
  PDF/JPEG/PNG/WebP e SHA-256, nessun movimento. Ritorna `result.id`.
- `document_file`: `{action:"document_file",id:"UUID"}` restituisce originale base64
  soltanto alla Direzione; utilizzabile dal processo autorizzato per l'estrazione.
- `match_document`: abbinamento conservativo di `rows`, nessun movimento.
- `document`: salva righe da verificare; `import_document`: conferma atomica.
  Una riga senza variant_id richiede marca/nome/formato e crea bozza più carico.
  Importare lo stesso documento due volte non raddoppia lo stock.
- `product`, `tag`, `acquire`: strumenti avanzati preesistenti.

## Esempio: carico campione

```json
{"action":"intake","data":{
 "request_id":"UUID-univoco-per-operazione",
 "brand":"OMEGOR","name":"OMEGOR Veg","variant":"Standard","format":"60 softgels",
 "ean":"8033120250613","quantity":1,"kind":"SAMPLE","unit_cost":0,
 "tax_basis":"gross","document_ref":"Campione fornitore","lot":""
}}
```

EAN/SKU sono facoltativi. Il server rifiuta identificativi discordanti e quantità
non intere. Per PURCHASE il costo è obbligatorio: nessuno sconto viene dedotto.
`request_id` dev'essere un vero UUID; riusare lo stesso UUID e identico contenuto
per i retry. Un payload diverso con lo stesso UUID viene rifiutato.
Risposta: `result.product_id`, `result.variant_id`, `result.movement`.

## Esempio: scheda verificata

Leggere `inventory` per ottenere `products[].updated_at` corrente e inviare:

```json
{"action":"enrich","data":{
 "request_id":"UUID-univoco","variant_id":"UUID-variante","updated_at":"timestamp-corrente",
 "description":"Descrizione verificata","what_it_is":"Cos'è",
 "what_it_does":"Effetti specifici e limiti","why_useful":"Contesto d'uso",
 "suggested_use":"Modalità riportata dal produttore","ingredients":"Ingredienti",
 "active_ingredients":"Quantità per dose","allergens":"Allergeni","warnings":"Avvertenze",
 "official_image":"https://produttore.example/foto.png",
 "public_price":24.90,"verification_date":"2026-09-30",
 "tags":[{"family":"Tipologia","label":"Omega-3","color":"#033d27"}],
 "sources":[{"url":"https://produttore.example/prodotto","name":"Produttore"}]
}}
```

Supportati anche `content` con chiavi what/effects/usefulness/audience/usage/
ingredients/nutrition/allergens/features/warnings. I campi sconosciuti sono scartati.
I testi comuni aggiornano il prodotto; per differenze tra gusti usare i contenuti
specifici delle varianti nella modifica avanzata. Non applicare a tutti i gusti
ingredienti o allergeni verificati soltanto per una variante.

Pubblicazione: `action:"publish"`, data con nuovo request_id, variant_id,
`updated_at` restituito da enrich e `approved:true`. Un aggiornamento concorrente
produce CONFLICT: ricaricare prima di approvare.

## Prezzi e contabilità

`public_price`, `suggested_price` (compatibilità), `suggested_neacea_price`
(arrotondato sul lordo), `actual_sale_price` sono distinti. Il valore manuale
prevale sul suggerimento. I valori persistiti seguono `tax_basis`: gross o net.
Per net serve aliquota nota per ricavare il prezzo lordo intero; si conservano
quattro decimali netti. L'API non assume IVA 10% né costo 50%.

SAMPLE è sempre zero. I movimenti conservano costo reale, lotto, riferimento,
autore e request_id. Le vendite usano costo medio ponderato; RETURN riferisce
una vendita e ripristina il suo costo, con limite di quantità resa. Non ci sono
scarichi FIFO per lotto. I totali con basi fiscali diverse vengono mostrati separati.

Le schede future si stampano/salvano in PDF dal browser senza codice. I PDF editoriali
A4 precostruiti e il listino PDF sono esportazioni datate: rigenerarli dopo cambi
ai contenuti/prezzi. Il manifest nasconde schede A4 che non corrispondono ai contenuti.

## Sicurezza e limiti verificati

RLS attiva su tutte le tabelle supplement_*; nessun grant anon/authenticated.
Le RPC sono eseguibili solo da service_role e ricontrollano il ruolo Direzione.
Gli avvisi informativi [RLS senza policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
sono intenzionali: l'accesso dal browser è vietato e passa dall'API autenticata.
Originali piccoli in tabella separata (non caricata nel catalogo), senza bucket pubblico.
Per volumi elevati spostare gli originali in storage privato con URL temporanei.
