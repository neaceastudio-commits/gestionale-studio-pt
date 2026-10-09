# Portale PT — uso della scheda su cellulare, 21 settembre 2026

Ambito: vista **Usa scheda** durante l'allenamento. Il contenitore delle serie
condivideva la classe `progress-table` con uno storico tabellare: ereditava
`min-width: 880px` anche a 390px, spingendo carichi e azioni fuori dal riquadro.

Correzione: larghezza fluida del form serie; su telefono ripetizioni, carico e
RIR sulla stessa riga; note sotto, intestazione e riepilogo compatti. Navigazione
inferiore su due righe con tutte le destinazioni visibili e spazio di scorrimento
per raggiungere i comandi. Campi da 16px per evitare lo zoom automatico iOS;
controlli tattili da almeno 44px. Nessuna modifica al modello dati o ai salvataggi.

File: `app/portale-personal-trainer/index.html`, `js/pt-mobile.css`,
`tests/pt-mobile-browser.cjs`.

Verifiche: test browser con dati sintetici a 320, 360, 390, 430 e 768px;
nessun campo/etichetta/comando della scheda fuori viewport; inserimento carico,
salvataggio e riapertura persistenti; verifica desktop 1440px e zero errori JS.
Ripetuto sul frontend isolato ricavato dalla produzione. Nove test di usabilità,
coda salvataggi e protezione dati, otto suite/test di libreria, persistenza,
Hand Grip, template e accessi superati. `git diff --check` superato.
Nessuna scrittura di prova sui dati reali; nessun login reale.

Rilascio isolato: pagina attualmente online più il nuovo foglio CSS. Gli altri
asset conservano gli hash precedenti. Netlify ha richiesto nuovamente tre bundle:
`pt-access-email` e `pt-portal-admin` ricostruiti byte-identici;
`pt-data` riconfezionato con zisi dagli stessi sorgenti locali già usati nella
release del 18 settembre, senza modifiche, mantenendo Node 22. Le altre tre
funzioni riutilizzate. Nessuna migrazione, cambio permessi o altro sito coinvolto.

Branch `feature/whatsapp-agenda-pt-v1`; modifiche non committate, lavorazioni
preesistenti preservate. Baseline online: `6aada43a64d3963d3127855d`.

Pubblicato e verificato: `6ab0bd88f08a71b47e59ab56`, stato ready,
blocco pubblicazione automatica preservato (`locked: true`). HTML e CSS online
identici al candidato collaudato; API dati senza sessione respinta con 401 in
anteprima e in produzione. Nessun passaggio esterno residuo.
