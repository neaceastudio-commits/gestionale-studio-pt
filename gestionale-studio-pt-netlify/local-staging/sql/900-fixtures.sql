\set ON_ERROR_STOP on

begin;

insert into public.operators (id, nome, cognome, email, roles, active)
values
  ('pt-responsabile', 'Responsabile', 'Stabile', 'responsabile@example.test', '["PT"]', true),
  ('pt-sostituto', 'PT', 'Sostituto', 'sostituto@example.test', '["PT"]', true),
  ('pt-inattivo', 'PT', 'Inattivo', 'inattivo@example.test', '["PT"]', false);

insert into public.clients (
  id,
  nome,
  cognome,
  pt_assegnato,
  package_types,
  sessions_total,
  sessions_remaining,
  package_start,
  stato_abbonamento,
  active
)
values
  (
    'client-stabile',
    'Cliente',
    'Stabile',
    'pt-responsabile',
    '["PT 1:1"]',
    10,
    8,
    '2026-07-01',
    'Attivo',
    true
  ),
  (
    'client-legacy-invalido',
    'Cliente',
    'Legacy',
    'responsabile@example.test',
    '["PT 1:1"]',
    5,
    5,
    '2026-07-01',
    'Attivo',
    true
  );

insert into public.trainer_client_assignments (
  id,
  trainer_id,
  client_id,
  assignment_source,
  active
)
values (
  'assignment-client-stabile',
  'pt-responsabile',
  'client-stabile',
  'manual',
  true
);

insert into public.appointments (
  id,
  service_id,
  client_ids,
  operator_id,
  performed_by_operator_id,
  date,
  start_time,
  duration_min,
  status,
  notes
)
values
  (
    'appointment-substitution',
    'pt11',
    '["client-stabile"]',
    'pt-sostituto',
    null,
    current_date,
    '09:00',
    60,
    'prenotato',
    'Sostituzione programmata'
  ),
  (
    'appointment-performed-different',
    'pt11',
    '["client-stabile"]',
    'pt-responsabile',
    'pt-sostituto',
    current_date - 6,
    '09:00',
    60,
    'fatto',
    'Esecutore diverso dal programmato'
  ),
  (
    'appointment-missing-performer-history',
    'pt11',
    '["client-stabile"]',
    'pt-responsabile',
    null,
    current_date - 13,
    '09:00',
    60,
    'fatto',
    'Storico senza prova dell''esecutore'
  ),
  (
    'appointment-inactive-history',
    'pt11',
    '["client-stabile"]',
    'pt-inattivo',
    'pt-inattivo',
    current_date - 20,
    '09:00',
    60,
    'fatto',
    'Operatore successivamente disattivato'
  );

commit;
