// Registro economico dei pacchetti.
// I dati sono salvati in un blocco JSON versionato dentro clients.notes:
// in questo modo lo storico e' disponibile anche sullo schema Supabase attuale.

const PackageLedger = (() => {
  const VERSION = 1;
  const START = '[NEACEA-PACKAGE-LEDGER-V1]';
  const END = '[/NEACEA-PACKAGE-LEDGER-V1]';
  const BLOCK_RE = /\n?\[NEACEA-PACKAGE-LEDGER-V1\]\s*([\s\S]*?)\s*\[\/NEACEA-PACKAGE-LEDGER-V1\]\n?/g;

  function roundMoney(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return 0;
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  function parseMoneyInput(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    const compact = String(value ?? '').trim().replace(/\s+/g, '');
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(compact)) return NaN;
    const amount = Number(compact.replace(',', '.'));
    return Number.isFinite(amount) ? amount : NaN;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : '';
  }

  function normalizeStatus(total, paid) {
    const agreed = roundMoney(total);
    const received = roundMoney(paid);
    if (agreed <= 0) return 'Da definire';
    if (received <= 0) return 'Da pagare';
    if (received + 0.009 >= agreed) return 'Pagato';
    return 'Parziale';
  }

  function strip(notes) {
    return String(notes || '').replace(BLOCK_RE, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function parse(notesOrClient) {
    const notes = typeof notesOrClient === 'string' ? notesOrClient : notesOrClient?.notes;
    const matches = [...String(notes || '').matchAll(new RegExp(BLOCK_RE.source, 'g'))];
    if (!matches.length) return { version: VERSION, cycles: [], createdAt: '', updatedAt: '', parseError: '' };
    try {
      const parsed = JSON.parse(matches[matches.length - 1][1]);
      if (!parsed || !Array.isArray(parsed.cycles)) throw new Error('formato non valido');
      return {
        version: VERSION,
        cycles: parsed.cycles,
        createdAt: parsed.createdAt || '',
        updatedAt: parsed.updatedAt || '',
        parseError: '',
      };
    } catch (error) {
      return {
        version: VERSION,
        cycles: [],
        createdAt: '',
        updatedAt: '',
        parseError: `Registro pagamenti non leggibile: ${error.message || error}`,
      };
    }
  }

  function serialize(notes, ledger) {
    if (ledger?.parseError) throw new Error(ledger.parseError);
    const clean = strip(notes);
    const stored = {
      version: VERSION,
      createdAt: ledger.createdAt || new Date().toISOString(),
      updatedAt: ledger.updatedAt || new Date().toISOString(),
      cycles: Array.isArray(ledger.cycles) ? ledger.cycles : [],
    };
    return [clean, START, JSON.stringify(stored), END].filter(Boolean).join('\n');
  }

  function cycleFinancial(cycle) {
    const total = roundMoney(cycle?.amount);
    const openingPaid = roundMoney(cycle?.openingPaidAmount);
    const movements = Array.isArray(cycle?.payments) ? cycle.payments : [];
    const movementPaid = movements
      .filter(item => item?.kind !== 'storno')
      .reduce((sum, item) => sum + roundMoney(item?.amount), 0);
    const reversed = movements
      .filter(item => item?.kind === 'storno')
      .reduce((sum, item) => sum + Math.abs(roundMoney(item?.amount)), 0);
    const paid = roundMoney(Math.max(0, openingPaid + movementPaid - reversed));
    const balance = roundMoney(Math.max(0, total - paid));
    const inferred = cycle?.legacyPaymentStatus && cycle.legacyPaymentStatus !== 'Pagato' && cycle.legacyPaymentStatus !== 'Da pagare';
    return {
      total,
      paid,
      balance,
      status: inferred && paid <= 0 ? 'Da riconciliare' : normalizeStatus(total, paid),
    };
  }

  function currentCycle(ledgerOrClient) {
    const ledger = Array.isArray(ledgerOrClient?.cycles) ? ledgerOrClient : parse(ledgerOrClient);
    if (ledger.parseError || !ledger.cycles.length) return null;
    for (let index = ledger.cycles.length - 1; index >= 0; index -= 1) {
      if (!ledger.cycles[index].closedAt) return ledger.cycles[index];
    }
    return ledger.cycles[ledger.cycles.length - 1];
  }

  function legacyCycle(client, metrics = {}, now = new Date().toISOString()) {
    const startDate = normalizeDate(
      metrics.cycleStart || client?.packageCycleStart || client?.packageStart || client?.acquisitionStart
    );
    const total = roundMoney(client?.importo);
    const rawStatus = String(client?.statoPagamento || client?.stato_pagamento || 'Da pagare').trim();
    const isPaid = rawStatus.toLowerCase() === 'pagato';
    return {
      id: `legacy_${String(client?.id || 'client').replace(/[^a-zA-Z0-9_-]/g, '_')}_${startDate || 'unknown'}`,
      source: 'legacy',
      legacy: true,
      startDate,
      createdAt: now,
      closedAt: '',
      sessionsTotal: Number(metrics.total ?? client?.sessionsTotal ?? 0) || 0,
      sessionsCompletedAtClose: null,
      sessionsScheduledAtClose: null,
      amount: total,
      openingPaidAmount: isPaid ? total : 0,
      legacyPaymentStatus: rawStatus,
      dueDate: '',
      frequency: String(client?.packageFrequency || ''),
      days: Array.isArray(client?.giorniSettimana) ? client.giorniSettimana : [],
      time: '',
      operatorId: client?.ptAssegnato || '',
      note: 'Ciclo corrente importato dai dati precedenti',
      payments: [],
    };
  }

  function ensure(client, metrics = {}, options = {}) {
    const now = options.now || new Date().toISOString();
    const ledger = parse(client);
    if (ledger.parseError) throw new Error(ledger.parseError);
    if (!ledger.cycles.length) {
      ledger.createdAt = now;
      ledger.cycles.push(legacyCycle(client, metrics, now));
    }
    ledger.updatedAt = now;
    return ledger;
  }

  function applyToClient(client, ledger) {
    const current = currentCycle(ledger);
    const finance = cycleFinancial(current);
    return {
      ...client,
      notes: serialize(client?.notes, ledger),
      importo: finance.total,
      statoPagamento: finance.status === 'Da definire' ? 'Da pagare' : finance.status,
    };
  }

  function validateRenewalInput(input) {
    const sessions = Number(input?.sessions);
    const amount = roundMoney(input?.amount);
    const paidNow = roundMoney(input?.paidNow);
    const startDate = normalizeDate(input?.startDate);
    const paymentDate = normalizeDate(input?.paymentDate);
    const frequency = String(input?.frequency || '').trim();
    const days = [...new Set((Array.isArray(input?.days) ? input.days : [])
      .map(day => String(day || '').trim())
      .filter(Boolean))];
    const daysPerWeek = parseInt((frequency.match(/\d+/) || ['0'])[0], 10);
    if (!Number.isInteger(sessions) || sessions <= 0) throw new Error('Inserisci un numero valido di sedute');
    if (!startDate) throw new Error('Inserisci la data di inizio del nuovo pacchetto');
    if (!frequency) throw new Error('Seleziona la frequenza del nuovo pacchetto');
    if (!days.length) throw new Error('Seleziona almeno un giorno reale per il nuovo pacchetto');
    if (daysPerWeek > 0 && days.length !== daysPerWeek) {
      throw new Error(`La frequenza ${frequency} richiede esattamente ${daysPerWeek} ${daysPerWeek === 1 ? 'giorno' : 'giorni'} a settimana`);
    }
    if (amount < 0) throw new Error('L’importo del pacchetto non può essere negativo');
    if (paidNow < 0) throw new Error('L’incasso non può essere negativo');
    if (paidNow > amount) throw new Error('L’incasso non può superare l’importo concordato');
    if (paidNow > 0 && !paymentDate) throw new Error('Indica la data del pagamento ricevuto');
    return { sessions, amount, paidNow, startDate, paymentDate, frequency, days };
  }

  function renew(client, metrics, input, options = {}) {
    const values = validateRenewalInput(input);
    const now = options.now || new Date().toISOString();
    const idFactory = options.idFactory || (() => `pkg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const ledger = clone(ensure(client, metrics, { now }));
    const previous = currentCycle(ledger);
    if (previous && !previous.frequency) previous.frequency = String(client?.packageFrequency || '');
    if (previous && (!Array.isArray(previous.days) || !previous.days.length)) {
      previous.days = Array.isArray(client?.giorniSettimana) ? [...client.giorniSettimana] : [];
    }
    if (previous && !previous.closedAt && previous.startDate === values.startDate) {
      throw new Error('Esiste già un ciclo aperto con questa data di inizio');
    }
    if (previous?.startDate && values.startDate < previous.startDate) {
      throw new Error('Il nuovo ciclo non può iniziare prima del ciclo corrente');
    }
    if (previous && !previous.closedAt) {
      previous.closedAt = now;
      previous.sessionsCompletedAtClose = Number(metrics?.completed || 0);
      previous.sessionsScheduledAtClose = Number(metrics?.scheduled || 0);
      previous.sessionsRemainingAtClose = Number(metrics?.remaining || 0);
    }

    const cycleId = idFactory();
    const payment = values.paidNow > 0 ? [{
      id: `${cycleId}_pay_1`,
      kind: 'incasso',
      amount: values.paidNow,
      date: values.paymentDate,
      method: String(input?.paymentMethod || 'Non indicato'),
      note: String(input?.paymentNote || '').trim(),
      createdAt: now,
    }] : [];
    const cycle = {
      id: cycleId,
      source: 'renewal',
      legacy: false,
      startDate: values.startDate,
      createdAt: now,
      closedAt: '',
      sessionsTotal: values.sessions,
      sessionsCompletedAtClose: null,
      sessionsScheduledAtClose: null,
      amount: values.amount,
      openingPaidAmount: 0,
      dueDate: normalizeDate(input?.dueDate),
      frequency: values.frequency,
      days: values.days,
      time: String(input?.time || ''),
      operatorId: String(input?.operatorId || ''),
      note: String(input?.renewalNote || '').trim(),
      payments: payment,
    };
    ledger.cycles.push(cycle);
    ledger.updatedAt = now;
    const updated = applyToClient(client, ledger);
    return { client: updated, ledger, cycle, finance: cycleFinancial(cycle) };
  }

  function recordPayment(client, metrics, input, options = {}) {
    const now = options.now || new Date().toISOString();
    const idFactory = options.idFactory || (() => `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const amount = roundMoney(input?.amount);
    const date = normalizeDate(input?.date);
    if (amount <= 0) throw new Error('Inserisci l’importo incassato');
    if (!date) throw new Error('Indica la data dell’incasso');
    const ledger = clone(ensure(client, metrics, { now }));
    const cycle = currentCycle(ledger);
    if (!cycle) throw new Error('Nessun ciclo corrente disponibile');
    const before = cycleFinancial(cycle);
    if (amount > before.balance + 0.009) throw new Error(`L’incasso supera il saldo residuo di € ${before.balance.toFixed(2)}`);
    cycle.payments = Array.isArray(cycle.payments) ? cycle.payments : [];
    cycle.payments.push({
      id: idFactory(),
      kind: 'incasso',
      amount,
      date,
      method: String(input?.method || 'Non indicato'),
      note: String(input?.note || '').trim(),
      createdAt: now,
    });
    if (cycle.legacyPaymentStatus) cycle.legacyPaymentStatus = '';
    ledger.updatedAt = now;
    const updated = applyToClient(client, ledger);
    return { client: updated, ledger, cycle, finance: cycleFinancial(cycle) };
  }

  function updateCurrentAmount(client, metrics, amount, options = {}) {
    const now = options.now || new Date().toISOString();
    const nextAmount = roundMoney(amount);
    if (nextAmount < 0) throw new Error('L’importo concordato non può essere negativo');
    const ledger = clone(ensure(client, metrics, { now }));
    const cycle = currentCycle(ledger);
    if (!cycle) throw new Error('Nessun ciclo corrente disponibile');
    const paid = cycleFinancial(cycle).paid;
    if (nextAmount + 0.009 < paid) throw new Error(`L’importo non può essere inferiore a quanto già incassato (€ ${paid.toFixed(2)})`);
    cycle.amount = nextAmount;
    ledger.updatedAt = now;
    const updated = applyToClient(client, ledger);
    return { client: updated, ledger, cycle, finance: cycleFinancial(cycle) };
  }

  function reconcilePaidTotal(client, metrics, input, options = {}) {
    const now = options.now || new Date().toISOString();
    const idFactory = options.idFactory || (() => `adj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const targetPaid = roundMoney(input?.targetPaid);
    const date = normalizeDate(input?.date);
    const reason = String(input?.reason || '').trim();
    if (!date) throw new Error('Indica la data della rettifica');
    if (!reason) throw new Error('Scrivi il motivo della rettifica');
    const ledger = clone(ensure(client, metrics, { now }));
    const cycle = currentCycle(ledger);
    if (!cycle) throw new Error('Nessun ciclo corrente disponibile');
    const before = cycleFinancial(cycle);
    if (targetPaid < 0 || targetPaid > before.total) {
      throw new Error(`L’incassato totale deve essere compreso tra € 0,00 e € ${before.total.toFixed(2)}`);
    }
    const delta = roundMoney(targetPaid - before.paid);
    if (Math.abs(delta) < 0.009) throw new Error('Il totale incassato è già quello indicato');
    cycle.payments = Array.isArray(cycle.payments) ? cycle.payments : [];
    cycle.payments.push({
      id: idFactory(),
      kind: 'rettifica',
      amount: delta,
      date,
      method: String(input?.method || 'Rettifica manuale'),
      note: reason,
      createdAt: now,
    });
    if (cycle.legacyPaymentStatus) cycle.legacyPaymentStatus = '';
    ledger.updatedAt = now;
    const updated = applyToClient(client, ledger);
    return { client: updated, ledger, cycle, adjustment: delta, finance: cycleFinancial(cycle) };
  }

  function reversePayment(client, metrics, paymentId, input = {}, options = {}) {
    const now = options.now || new Date().toISOString();
    const idFactory = options.idFactory || (() => `void_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const date = normalizeDate(input?.date);
    const reason = String(input?.reason || '').trim();
    if (!date) throw new Error('Indica la data dello storno');
    if (!reason) throw new Error('Scrivi il motivo dello storno');
    const ledger = clone(ensure(client, metrics, { now }));
    const cycle = currentCycle(ledger);
    if (!cycle) throw new Error('Nessun ciclo corrente disponibile');
    cycle.payments = Array.isArray(cycle.payments) ? cycle.payments : [];
    const payment = cycle.payments.find(item => item.id === paymentId);
    if (!payment || payment.kind === 'storno' || roundMoney(payment.amount) <= 0) {
      throw new Error('Movimento non stornabile');
    }
    if (cycle.payments.some(item => item.kind === 'storno' && item.reversesPaymentId === paymentId)) {
      throw new Error('Questo movimento è già stato stornato');
    }
    cycle.payments.push({
      id: idFactory(),
      kind: 'storno',
      amount: Math.abs(roundMoney(payment.amount)),
      date,
      method: String(input?.method || payment.method || 'Storno'),
      note: reason,
      reversesPaymentId: paymentId,
      createdAt: now,
    });
    if (cycle.legacyPaymentStatus) cycle.legacyPaymentStatus = '';
    ledger.updatedAt = now;
    const updated = applyToClient(client, ledger);
    return { client: updated, ledger, cycle, reversedPayment: payment, finance: cycleFinancial(cycle) };
  }

  function summary(clients) {
    const rows = [];
    (Array.isArray(clients) ? clients : []).forEach(client => {
      let ledger;
      try {
        ledger = ensure(client, {
          total: Number(client?.sessionsTotal || client?.sessions_total || 0),
          cycleStart: client?.packageCycleStart || client?.packageStart || client?.package_start || '',
        });
      } catch (_) {
        return;
      }
      ledger.cycles.forEach((cycle, index) => rows.push({
        clientId: client.id,
        clientName: `${client.nome || ''} ${client.cognome || ''}`.trim(),
        cycleNumber: index + 1,
        cycle,
        finance: cycleFinancial(cycle),
      }));
    });
    return {
      rows,
      cycles: rows.length,
      renewals: rows.filter(row => row.cycle.source === 'renewal').length,
      expected: roundMoney(rows.reduce((sum, row) => sum + row.finance.total, 0)),
      collected: roundMoney(rows.reduce((sum, row) => sum + row.finance.paid, 0)),
      outstanding: roundMoney(rows.reduce((sum, row) => sum + row.finance.balance, 0)),
      openCycles: rows.filter(row => !row.cycle.closedAt).length,
    };
  }

  function appointmentCycleId(notes) {
    return String(notes || '').match(/\[CICLO-PACCHETTO-ID\s+([a-zA-Z0-9_-]+)\]/i)?.[1] || '';
  }

  return {
    VERSION,
    START,
    END,
    roundMoney,
    parseMoneyInput,
    normalizeStatus,
    strip,
    parse,
    serialize,
    ensure,
    applyToClient,
    currentCycle,
    cycleFinancial,
    renew,
    recordPayment,
    updateCurrentAmount,
    reconcilePaidTotal,
    reversePayment,
    summary,
    appointmentCycleId,
  };
})();
