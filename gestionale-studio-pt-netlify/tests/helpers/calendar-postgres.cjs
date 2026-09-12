const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
exports.start = async () => {
  const modulePath = process.env.EMBEDDED_POSTGRES_MODULE;
  if (!modulePath) throw Error('Set EMBEDDED_POSTGRES_MODULE to a local embedded-postgres installation');
  const { default: EmbeddedPostgres } = await import(pathToFileURL(require.resolve(modulePath)).href);
  const net = require('node:net');
  const port = await new Promise(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); }); });
  const databaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neacea-calendar-pg-'));
  const cluster = new EmbeddedPostgres({ databaseDir, port, user: 'postgres', password: 'local-test-only', persistent: false,
    postgresFlags: ['-h', '127.0.0.1'], onLog() {}, onError() {} });
  await cluster.initialise(); await cluster.start();
  const client = cluster.getPgClient(); await client.connect();
  await client.query(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create table clients(id text primary key, nome text, cognome text, active boolean default true,
      package_types text[], sessions_total int, sessions_remaining int, pt_assegnato text, package_start date,
      data_inizio date, data_conferma date, notes text default '', updated_at timestamptz default now());
    create table trainer_client_assignments(id text primary key, trainer_id text not null, client_id text not null, assigned_by text, assignment_source text default 'manual',active boolean default true,notes text default '',created_at timestamptz default now(),updated_at timestamptz default now(),ended_at timestamptz,unique(trainer_id,client_id));
    create table operators(id text primary key, nome text, cognome text, email text, active boolean default true, roles text[]);
    create table operator_availability(operator_id text, day_key text, slots jsonb, updated_at timestamptz default now(), primary key(operator_id,day_key));
    create table appointments(id text primary key, service_id text, client_ids text[], operator_id text, date date,
      start_time time, duration_min int, buffer_min int, status text, notes text default '', created_at timestamptz default now(), updated_at timestamptz default now());
    grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
  `);
  await client.query(fs.readFileSync(path.resolve(__dirname, '../../supabase/migrations/20260912151523_calendar_prerelease_atomic.sql'), 'utf8'));
  return { client, async connection() { const c = cluster.getPgClient(); await c.connect(); return c; }, async close() { await client.end(); await cluster.stop(); fs.rmSync(databaseDir, { recursive: true, force: true }); } };
};
exports.seed = async client => {
  await client.query(`truncate appointments,clients,operators,operator_availability;
    insert into clients(id,nome,active,package_types,sessions_total,sessions_remaining,pt_assegnato,package_start,data_inizio,notes) values
    ('test','SIMULATO',true,array['PT 1:1'],8,8,'pt','2026-09-15','2026-09-15','[CICLO-PACCHETTO 2026-09-15]'),
    ('other','ALTRO',true,array['PT 1:1'],8,8,'pt2','2026-09-15','2026-09-15','[CICLO-PACCHETTO 2026-09-15]');
    insert into operators(id,email,roles) values('pt','pt@example.test',array['PT']),('pt2','pt2@example.test',array['PT']);
    insert into operator_availability(operator_id,day_key,slots) values
    ('pt','tue','["17:00-18:00"]'),('pt','thu','["18:00-19:00"]'),('pt2','tue','["17:00-18:00"]');`);
};
exports.rpc = async (client, name, body = {}) => {
  const specs = { calendar_audit_write: ['p_actor_id','p_actor_role','p_source','p_request_id','p_operation','p_payload'], calendar_planning_snapshot: [], calendar_commit_package: ['p_revision','p_client_id','p_rows'], calendar_save_appointment: ['p_appointment','p_expected'] };
  const keys = specs[name]; if (!keys) throw Error('Unexpected RPC ' + name);
  const values = keys.map(k => typeof body[k] === 'object' && body[k] !== null ? JSON.stringify(body[k]) : body[k]);
  const r = await client.query(`select public.${name}(${keys.map((_, i) => '$' + (i + 1)).join(',')}) as result`, values);
  return r.rows[0].result;
};
