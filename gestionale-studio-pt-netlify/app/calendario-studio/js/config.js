// =============================================
// NEACEA — config.js  v3.0
// =============================================

const CONFIG = {
  centerName: 'NEACEA',
  SHEETS: { enabled: false },
  maxRoomCapacity: 6,   // Sala PT / Circuit
  maxRoomNutri: 1,      // Sala Nutrizione
  maxRoomValut: 1,      // Area Valutazioni (solo Visbody — Baiobit non occupa sala)
  defaultBufferMin: 10,
  workHours: { start: '07:00', end: '21:00' },
  slotIntervalMin: 15,

  ROOMS: {
    pt:    { id: 'pt',    label: 'Sala PT',         max: 6 },
    nutri: { id: 'nutri', label: 'Sala Nutrizione',  max: 1 },
    valut: { id: 'valut', label: 'Area Valutazioni', max: 1 },
  },

  ROLES: ['PT', 'Nutrizionista', 'Valutazioni', 'Circuit', 'Segreteria', 'Direzione'],

  // packageType → serviceId compatibili
  // Un cliente può avere più packageType → filtro OR su tutti
  PACKAGE_SERVICE_MAP: {
    'PT 1:1':      ['pt11'],
    'PT 1:2':      ['pt12'],
    'Nutrizione':  ['nutrizione', 'check'],
    'Circuit':     ['circuit'],
    'Visbody':     ['visbody'],
    'Baiobit':     ['baiobit'],
    'Valutazioni': ['visbody', 'baiobit'],
  },

  FREQUENCIES: ['1x settimana', '2x settimana', '3x settimana', 'Bisettimanale', 'Mensile', 'Su richiesta'],

  SERVICES: {
    pt11: {
      id: 'pt11', label: 'PT 1:1',
      color: '#2563EB', colorLight: '#DBEAFE',
      durationMin: 60, bufferMin: 10,
      requiredRoles: ['PT'],
      room: 'pt', roomLoad: 1, maxClients: 1, isGroup: false,
    },
    pt12: {
      id: 'pt12', label: 'PT 1:2',
      color: '#0EA5E9', colorLight: '#E0F2FE',
      durationMin: 60, bufferMin: 10,
      requiredRoles: ['PT'],
      room: 'pt', roomLoad: 2, maxClients: 2, isGroup: false,
    },
    nutrizione: {
      id: 'nutrizione', label: 'Nutrizione — 1ª visita',
      color: '#16A34A', colorLight: '#DCFCE7',
      durationMin: 60, bufferMin: 10,          // 60 min prima visita
      requiredRoles: ['Nutrizionista'],
      room: 'nutri', roomLoad: 1, maxClients: 1, isGroup: false,
      isNutri: true,
    },
    check: {
      id: 'check', label: 'Check Nutrizionale',
      color: '#4ADE80', colorLight: '#F0FDF4',
      durationMin: 30, bufferMin: 10,          // 30 min solo controllo
      requiredRoles: ['Nutrizionista'],
      room: 'nutri', roomLoad: 1, maxClients: 1, isGroup: false,
      isNutri: true,
    },
    visbody: {
      id: 'visbody', label: 'Visbody',
      color: '#7C3AED', colorLight: '#EDE9FE',
      durationMin: 30, bufferMin: 10,          // 30 min (era 20, corretto)
      requiredRoles: ['Valutazioni'],
      room: 'valut', roomLoad: 1, maxClients: 1, isGroup: false,
      isValuation: true,
    },
    baiobit: {
      id: 'baiobit', label: 'Baiobit',
      color: '#c9a84c', colorLight: '#fdf8ee',
      durationMin: 30, bufferMin: 10,          // 30 min
      requiredRoles: ['Valutazioni'],
      room: null,     // Baiobit non occupa sala — può farsi con sala piena
      roomLoad: 0, maxClients: 1, isGroup: false,
      isValuation: true,
    },
    circuit: {
      id: 'circuit', label: 'Circuit Training',
      color: '#DC2626', colorLight: '#FEE2E2',
      durationMin: 60, bufferMin: 10,
      requiredRoles: ['Circuit', 'PT'],
      room: 'pt', roomLoad: 6, maxClients: 6, isGroup: true,
      durationOptions: [45, 60],
    },
    blocco: {
      id: 'blocco', label: 'Blocco agenda',
      color: '#64748B', colorLight: '#F1F5F9',
      durationMin: 60, bufferMin: 0,
      requiredRoles: [],
      room: null, roomLoad: 0, maxClients: 0, isGroup: false,
      isBlock: true,
    },
  },

  STATUS: {
    prenotato: { label: 'Prenotato', color: '#64748B' },
    fatto:     { label: 'Fatto',     color: '#16A34A' },
    annullato: { label: 'Annullato', color: '#DC2626' },
    noshow:    { label: 'No-show',   color: '#F59E0B' },
  },
};
