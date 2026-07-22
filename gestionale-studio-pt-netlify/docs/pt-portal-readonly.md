# Portale PT: perimetro temporaneo di sola lettura

La modalita Agenda aperta con `?pt=1&op=<operators.id>` non costituisce autenticazione.
Finche autenticazione e RLS non autorizzano le scritture lato server, il parametro
`op` serve soltanto a identificare il contesto visualizzato.

Restano disponibili in sola lettura:

- clienti collegati al PT responsabile;
- appuntamenti e dettagli della seduta;
- PT programmato ed eventuale PT esecutore registrato;
- pacchetto e sessioni residue;
- disponibilita e pianificazione esistenti.

Restano disabilitate nella modalita basata sul parametro URL:

- assegnazione o cambio del PT responsabile;
- creazione, modifica o eliminazione di appuntamenti;
- cambio del PT programmato;
- registrazione del PT esecutore e cambio stato seduta;
- modifica o rinnovo del pacchetto;
- modifica delle sessioni residue.

Le operazioni amministrative del gestionale studio non sono abilitate al portale PT
da questo documento. La futura riattivazione richiede una decisione esplicita su
autenticazione, ruoli e policy RLS.
