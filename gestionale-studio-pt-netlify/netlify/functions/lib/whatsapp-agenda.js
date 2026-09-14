'use strict';
const crypto = require('node:crypto');
const SERVICES = { pt11: 'PT 1:1', pt12: 'PT 1:2' };
const E164 = /^\+[1-9]\d{7,14}$/;
const clean = value => String(value || '').replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
function romeTime(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
function isPt(op) {
  return op.active === true && [...(op.roles || []), ...(op.system_roles || []), ...(op.legacy_roles || [])].some(r => ['pt', 'personal_trainer', 'personal trainer'].includes(String(r).toLowerCase()));
}
function progress(client) {
  const total = client.sessions_total, remaining = client.sessions_remaining;
  return Number.isInteger(total) && Number.isInteger(remaining) ? `${total - remaining}/${total}` : '—';
}
function buildAgendas({ operators, clients, appointments }, day) {
  const byId = new Map(clients.map(c => [c.id, c]));
  return operators.filter(isPt).map(op => {
    const seen = new Set(), issues = [];
    const rows = appointments.filter(a => a.date === day && a.operator_id === op.id && a.status === 'prenotato' && SERVICES[a.service_id] && !seen.has(a.id) && seen.add(a.id))
      .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)) || String(a.id).localeCompare(String(b.id)));
    const lines = rows.map(a => {
      const ids = [...new Set(a.client_ids || [])], participants = ids.map(id => byId.get(id));
      if (!ids.length || participants.some(c => !c)) { issues.push('missing_client'); return null; }
      if (participants.some(c => progress(c) === '—')) issues.push('invalid_progress');
      const names = participants.map(c => clean(`${c.nome || ''} ${c.cognome || ''}`) || 'Cliente');
      const time = String(a.start_time).slice(0, 5);
      if (!/^\d{2}:\d{2}$/.test(time)) { issues.push('invalid_time'); return null; }
      if (participants.length === 1) return `${time} · ${names[0]} · ${SERVICES[a.service_id]} · ${progress(participants[0])}`;
      return `${time} · ${participants.map((c, i) => `${names[i]} (${progress(c)})`).join(' + ')} · ${SERVICES[a.service_id]}`;
    }).filter(Boolean);
    return { operatorId: op.id, operatorName: clean(`${op.nome || ''} ${op.cognome || ''}`), day, enabled: op.whatsapp_agenda_enabled === true,
      count: rows.length, lines, issues: [...new Set(issues)], text: `NEACEA · Agenda di oggi\n\n${lines.join('\n')}\n\nTotale: ${rows.length} sedute` };
  });
}
function providerConfig(env) {
  let templates = {}; try { templates = JSON.parse(env.WHATSAPP_AGENDA_TEMPLATES_JSON || '{}'); } catch {}
  if (!templates || typeof templates !== 'object' || Array.isArray(templates)) templates = {};
  const missing = [];
  for (const key of ['WHATSAPP_SENDER_PHONE', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_API_VERSION', 'WHATSAPP_TEMPLATE_LANGUAGE', 'WHATSAPP_AGENDA_SITE_ID']) if (!env[key]) missing.push(key);
  if (!E164.test(env.WHATSAPP_SENDER_PHONE || '')) missing.push('invalid_sender');
  if (!/^\d+$/.test(env.WHATSAPP_PHONE_NUMBER_ID || '')) missing.push('invalid_phone_number_id');
  if (!/^v\d+\.\d+$/.test(env.WHATSAPP_API_VERSION || '')) missing.push('invalid_api_version');
  if (!Object.keys(templates).length) missing.push('WHATSAPP_AGENDA_TEMPLATES_JSON');
  if (!env.SITE_ID || env.SITE_ID !== env.WHATSAPP_AGENDA_SITE_ID) missing.push('site_mismatch');
  return { templates, missing, enabled: env.WHATSAPP_AGENDA_ENABLED === 'true' };
}
function templatePayload(agenda, phone, env, templates) {
  const name = templates[String(agenda.count)];
  if (!/^[a-z0-9_]+$/.test(name || '')) throw Error('template_missing');
  // One approved fixed template per line count. Line breaks are static in Meta,
  // never injected inside text parameters. No second message or truncated agenda.
  if (agenda.text.length > 1024) throw Error('agenda_too_long');
  return { messaging_product: 'whatsapp', recipient_type: 'individual', to: phone.slice(1), type: 'template',
    template: { name, language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE }, components: [{ type: 'body', parameters: agenda.lines.map(text => ({ type: 'text', text })) }] } };
}
function createService({ db, env = process.env, fetchImpl = global.fetch, now = () => new Date() }) {
  async function all(table, query) {
    const rows = [];
    for (let offset = 0; ; offset += 1000) { const page = await db(table, { query: `${query}&limit=1000&offset=${offset}` }); rows.push(...page); if (page.length < 1000) return rows; }
  }
  async function load(day) {
    const [operators, roles, clients, appointments] = await Promise.all([
      all('operators', '?select=id,nome,cognome,active,roles&order=id'),
      all('operator_effective_roles', '?select=operator_id,active,system_roles,legacy_roles&order=operator_id'),
      all('clients', '?select=id,nome,cognome,sessions_total,sessions_remaining&order=id'),
      all('appointments', '?select=id,date,start_time,service_id,client_ids,operator_id,status&status=eq.prenotato&service_id=in.(pt11,pt12)&date=eq.' + day + '&order=id')
    ]);
    let config = [], migrationReady = true;
    try { config = await all('operators', '?select=id,whatsapp_phone,whatsapp_agenda_enabled&order=id'); }
    catch (e) { if (e.status === 400 && /whatsapp_(phone|agenda_enabled)/.test(e.message)) migrationReady = false; else throw e; }
    return { migrationReady, clients, appointments, operators: operators.map(o => ({ ...o, ...roles.find(r => r.operator_id === o.id), ...config.find(c => c.id === o.id) })) };
  }
  async function preview() {
    const day = romeTime(now()).day, data = await load(day), config = providerConfig(env);
    return { day, migrationReady: data.migrationReady, sendingEnabled: config.enabled, providerReady: !config.missing.length, missing: config.missing, agendas: buildAgendas(data, day) };
  }
  async function settings() {
    const data = await load(romeTime(now()).day);
    return { migrationReady: data.migrationReady, operators: data.operators.filter(o => isPt({ ...o, active: true })).map(o => ({ id: o.id, name: clean(`${o.nome || ''} ${o.cognome || ''}`), active: o.active, whatsapp_phone: o.whatsapp_phone || '', whatsapp_agenda_enabled: o.whatsapp_agenda_enabled === true })) };
  }
  async function configure(actor, input) {
    if (actor?.role !== 'owner') throw Error('direction_only');
    const phone = String(input.whatsapp_phone || '').trim() || null, enabled = input.whatsapp_agenda_enabled;
    if (typeof enabled !== 'boolean' || (phone && !E164.test(phone)) || (enabled && !phone)) throw Error('invalid_phone');
    const data = await settings();
    if (!data.migrationReady) throw Error('migration_required');
    if (!data.operators.some(o => o.id === input.operatorId)) throw Error('operator_missing');
    await db('rpc/calendar_audit_write', { method: 'POST', body: { p_actor_id: actor.id, p_actor_role: actor.role, p_source: 'calendar', p_request_id: crypto.randomUUID(), p_operation: 'operator', p_payload: { method: 'PATCH', rows: [{ id: input.operatorId, whatsapp_phone: phone, whatsapp_agenda_enabled: enabled }] } } });
    return { success: true };
  }
  async function meta(path, body) {
    const response = await fetchImpl(`https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(6000) });
    let data; try { data = await response.json(); } catch { throw Error('provider_response_unknown'); }
    if (!response.ok) { const error = Error('provider_rejected'); error.providerCode = Number.isInteger(data?.error?.code) ? data.error.code : null; throw error; }
    return data;
  }
  async function run({ dryRun = true, scheduled = false } = {}) {
    if (dryRun !== false) return { dryRun: true, ...await preview() };
    if (scheduled && romeTime(now()).time !== '06:30') return { skipped: 'outside_rome_0630' };
    const config = providerConfig(env);
    if (!config.enabled || config.missing.length) return { sent: 0, blocked: !config.enabled ? 'disabled' : 'provider_not_configured', missing: config.missing };
    const day = romeTime(now()).day, data = await load(day);
    if (!data.migrationReady) return { sent: 0, blocked: 'migration_required' };
    const agendas = buildAgendas(data, day).filter(a => a.enabled && a.count > 0);
    if (!agendas.length) return { sent: 0, results: [] };
    const sender = await meta('?fields=display_phone_number');
    if ('+' + String(sender.display_phone_number || '').replace(/\D/g, '') !== env.WHATSAPP_SENDER_PHONE) throw Error('sender_mismatch');
    const results = await Promise.all(agendas.map(async agenda => {
      let status = 'failed', messageId = null, error = null, payload;
      const phone = data.operators.find(o => o.id === agenda.operatorId).whatsapp_phone;
      try { if (!E164.test(phone || '')) throw Error('invalid_phone'); if (agenda.issues.length) throw Error('agenda_data_invalid'); payload = templatePayload(agenda, phone, env, config.templates); }
      catch (e) { return { operatorId: agenda.operatorId, status: 'blocked', error: e.message }; }
      const claim = { p_day: day, p_operator_id: agenda.operatorId };
      if (await db('rpc/whatsapp_agenda_claim', { method: 'POST', body: claim }) !== true) return { operatorId: agenda.operatorId, status: 'already_attempted' };
      try {
        const response = await meta('/messages', payload);
        messageId = response.messages?.[0]?.id;
        if (typeof messageId !== 'string' || !messageId.startsWith('wamid.')) throw Error('provider_response_unknown');
        status = 'accepted';
      } catch (e) { status = e.message === 'provider_rejected' ? 'failed' : 'uncertain'; messageId = null; error = status === 'failed' ? `provider_rejected${e.providerCode ? '_' + e.providerCode : ''}` : 'provider_outcome_unknown'; }
      // A timeout or failed final update never frees the unique day/operator claim.
      try { if (await db('rpc/whatsapp_agenda_finish', { method: 'POST', body: { ...claim, p_status: status, p_message_id: messageId, p_error: error } }) !== true) throw Error(); }
      catch { return { operatorId: agenda.operatorId, status: 'uncertain', error: 'delivery_log_update_failed' }; }
      return { operatorId: agenda.operatorId, status, messageId, error };
    }));
    return { sent: results.filter(r => r.status === 'accepted').length, results };
  }
  return { preview, settings, configure, run };
}
module.exports = { createService, buildAgendas, romeTime, isPt, progress, providerConfig, templatePayload };
