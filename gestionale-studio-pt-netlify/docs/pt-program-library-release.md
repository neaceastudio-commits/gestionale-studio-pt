# Portale PT — Archivio Programmi e storico cliente

Branch: `feature/whatsapp-agenda-pt-v1`. Intervento del 18 settembre 2026.

## Analisi e modello

- `pt_program_templates` conteneva già snapshot separati da `schede_allenamento`.
  Non esisteva un salvataggio automatico cliente → archivio: questa separazione è preservata.
- Mancavano cartelle, creazione e modifica diretta in libreria. La selezione aperta
  nell’editor non era distinta visivamente dalla scheda attuale prescritta.
- Aggiunte cartelle gerarchiche `pt_program_folders`, riferimento `folder_id`,
  versione `updated_at` e identificativo richiesta per le modifiche dei template.
- `pt_client_current_programs` conserva la scheda attuale del cliente. La nuova
  RPC `pt_save_program_with_current` riusa la transazione già esistente per
  scheda, revisioni e carichi; solo una nuova scheda diventa automaticamente attuale.
  Aprire/modificare/ripristinare una precedente non la promuove. È disponibile
  il comando esplicito “Imposta come attuale”. Eliminare l’attuale seleziona
  l’ultima scheda non eliminata; la scheda eliminata resta nel cestino cliente.
- L’editor esistente è riutilizzato anche in una finestra separata per la libreria.
  Le assegnazioni fanno una copia profonda con nuovi ID; `sourceTemplateId`
  è solo provenienza e non sincronizza le copie.

## Interfaccia e protezioni

Archivio: cartelle/sottocartelle personalizzate, ricerca globale con percorso,
nuovo programma senza cliente, anteprima, modifica, duplica con nome,
rinomina/sposta, elimina. Autore e Direzione mantengono i permessi esistenti;
gli altri PT possono leggere e creare proprie copie, non modificare originali altrui.

“Salva nell’Archivio” dalla scheda cliente chiede titolo e cartella, permette
di crearne una nella stessa finestra e crea SEMPRE un nuovo template. La
prescrizione viene conservata, senza identità, carichi/date delle sedute o note interne.
Il controllo umano sui dati personali eventualmente digitati nelle note tecniche resta esplicito.

Eliminare una cartella riporta i suoi programmi e le sottocartelle al livello
principale, senza cancellarli. Eliminare un template è un ritiro logico;
le copie cliente non sono toccate. Aggiornamenti concorrenti hanno controllo
versione; un conflitto non sovrascrive i dati. La bozza dell’editor archivio
resta aperta in caso di errore; chiudere senza salvare richiede conferma.

## Verifiche

- Suite Node PT: 17 test passati, inclusi nuovi test API libreria, permessi,
  rinomina/spostamento, copie indipendenti, retry e conflitti.
- Adapter editor: round-trip completo di settimane, gruppi, progressioni,
  riscaldamento e note; copie con ID indipendenti e senza sedute effettuate.
- PostgreSQL temporaneo, soli dati fittizi: migrazione, selezione iniziale,
  nuova scheda attuale, modifica storico, cestino/ripristino, errore transazionale
  con rollback, nessun template automatico, FK cartelle, versioni e permessi server-only.
- Browser locale con API simulate: creazione cartella e programma da zero,
  prescrizione su tutte le settimane, assegnazione al cliente, modifica della
  copia senza cambiare l’originale, salvataggio esplicito della variante in una
  sottocartella creata dal modal, modifica dell’originale senza cambiare la copia,
  nuova scheda attuale, modifica dello storico e ricaricamento, cestino cliente,
  duplicazione con nome, rinomina e spostamento del template.
- L’ultimo controllo aggiuntivo del browser (rinomina cartella/mobile) è stato
  fermato dall’auto-review del browser. Nessun aggiramento; rinomina/eliminazione
  cartelle sono coperte dai test API e SQL, ma non dichiarate collaudate in UI.
- Sintassi JS e `git diff --check` superati.

## Database e rilascio

Migrazione locale: `20260918182400_pt_program_library_and_current.sql`.
Applicata su `cdywqyqqmjhgkzwrrixc` dopo autorizzazione esplicita dell’utente;
versione registrata dal servizio MCP: `20260918193432`, nome
`pt_program_library_and_current`. Non ripetere con un push indiscriminato
delle migrazioni locali: i timestamp storici locali/remoti differiscono.

Verifica aggregata prima/dopo: 27 schede e 3 template; conteggi e impronte
dei contenuti identici. Nessuna scheda o snapshot reale riscritto/cancellato.
RLS attiva e nessun grant browser sulle nuove tabelle. L’avviso informativo
[RLS senza policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
è intenzionale: tabelle accessibili esclusivamente dalla API server autenticata.

Deploy precedente: `6aad61747fdfaa337a54d529`.
Deploy pubblicato: `6aad9299b7561ccfd9f6c21f`, stato `ready`, blocco pubblicazione
`locked: true` preservato. Online su https://neacea-portale-personal-trainer.netlify.app/.
Verificati sia anteprima sia produzione: hash identici dei cinque file previsti,
CSS servito correttamente e 13 azioni API senza credenziali respinte con 401.
Manifest di file/funzioni e pianificazioni confrontato integralmente. Nessuna
prova di scrittura sui clienti reali; collaudo autenticato solo su dati fittizi.
Un limite temporaneo Netlify ha interrotto l’upload: ripreso lo stesso deploy
dopo il reset, senza pubblicazioni duplicate.

Rilascio isolato tramite runtime Netlify già autenticato: solo index, moduli
archivio/workflow/CSS e `pt-data` con le sue dipendenze. Editor bundle invariato.
Manifest completo conserva tutti gli altri file, cinque funzioni e pianificazioni.
Il blocco della pubblicazione automatica del sito è preservato.

File principali: `app/portale-personal-trainer/index.html`,
`js/program-templates.js`, `js/program-templates.css`, `js/program-workflow.js`,
`netlify/functions/pt-data.js`, `netlify/functions/lib/pt-templates.js`, migrazione
e `tests/pt-library*.cjs`. Nessun commit creato: worktree con modifiche e file
non tracciati, incluse lavorazioni preesistenti preservate negli altri moduli.
