// Stato condiviso dalla Scheda Cliente.
// Le variabili restano globali per compatibilita' con i moduli storici.
let clientiAll = [];
let staffAll = [];
let filtroLista = 'tutti';
let clienteAtt = null;
let sezioneAtt = 'home';

let datiFisiciAtt = [];
let visiteAtt = [];
let schedeAtt = [];
let fotoAtt = [];
let carichiAtt = [];
let schedaAtt = null;
let giornoAtt = null;
let meEserc = null;
let meProg = null;
let meEditIdx = null;
let meSedutaIdx = null;

const centralePtParams = new URLSearchParams(window.location.search);
const accessoCentralePt = {
  attivo: centralePtParams.get('pt') === '1' || centralePtParams.has('op') || centralePtParams.has('email'),
  op: centralePtParams.get('op') || centralePtParams.get('ptId') || '',
  email: (centralePtParams.get('email') || '').trim().toLowerCase(),
};

function idPtCentraleCorrente() {
  if (!accessoCentralePt.attivo) return '';
  if (accessoCentralePt.op) return String(accessoCentralePt.op);
  const staff = staffAll.find(s => String(s.email || '').trim().toLowerCase() === accessoCentralePt.email);
  return staff ? String(staff.id) : '';
}

function clienteGestibileInCentrale(c) {
  if (!accessoCentralePt.attivo) return true;
  const ptId = idPtCentraleCorrente();
  return !!ptId && String(c?.ptAssegnato || '') === ptId;
}

function clientiGestibiliInCentrale() {
  return accessoCentralePt.attivo ? clientiAll.filter(clienteGestibileInCentrale) : clientiAll;
}

function bloccaClienteNonGestibile(c) {
  if (clienteGestibileInCentrale(c)) return false;
  if (typeof toast === 'function') toast('Cliente non assegnato a questo PT', 'err');
  return true;
}
