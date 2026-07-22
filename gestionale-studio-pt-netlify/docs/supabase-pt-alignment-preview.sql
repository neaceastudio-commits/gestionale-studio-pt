-- NEACEA — report di anteprima, SOLO LETTURA.
-- Non contiene INSERT, UPDATE o DELETE.

with appointment_counts as (
  select
    client_rows.client_id,
    a.operator_id,
    count(*) as all_sessions,
    count(*) filter (where a.status = 'fatto') as completed_sessions,
    count(*) filter (where a.date >= current_date and a.status <> 'annullato') as future_sessions
  from public.appointments a
  cross join lateral unnest(coalesce(a.client_ids, array[]::text[])) as client_rows(client_id)
  where a.operator_id is not null and a.operator_id <> ''
  group by client_rows.client_id, a.operator_id
), active_assignment_counts as (
  select
    client_id,
    count(*) as active_rows,
    array_agg(trainer_id order by trainer_id) as active_trainer_ids
  from public.trainer_client_assignments
  where active is true and ended_at is null
  group by client_id
)
select
  c.id as client_id,
  c.nome,
  c.cognome,
  c.active,
  c.pt_assegnato as current_responsible_pt_id,
  responsible.nome || ' ' || responsible.cognome as current_responsible_pt,
  coalesce(assignment.active_rows, 0) as parallel_active_assignment_rows,
  assignment.active_trainer_ids as parallel_active_assignment_ids,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'operator_id', counts.operator_id,
        'operator_name', trim(operator.nome || ' ' || operator.cognome),
        'all_sessions', counts.all_sessions,
        'completed_sessions', counts.completed_sessions,
        'future_sessions', counts.future_sessions
      ) order by counts.completed_sessions desc, counts.all_sessions desc
    ) filter (where counts.operator_id is not null),
    '[]'::jsonb
  ) as appointment_evidence_only,
  case
    when c.pt_assegnato is not null and c.pt_assegnato <> '' then 'KEEP clients.pt_assegnato'
    when count(counts.operator_id) = 0 then 'MANUAL: no assignment evidence'
    else 'MANUAL: appointment evidence is not a stable assignment'
  end as proposed_action
from public.clients c
left join public.operators responsible on responsible.id = c.pt_assegnato
left join active_assignment_counts assignment on assignment.client_id = c.id
left join appointment_counts counts on counts.client_id = c.id
left join public.operators operator on operator.id = counts.operator_id
group by c.id, c.nome, c.cognome, c.active, c.pt_assegnato,
         responsible.nome, responsible.cognome,
         assignment.active_rows, assignment.active_trainer_ids
order by c.active desc, c.cognome, c.nome;

-- Template di applicazione intenzionalmente non eseguibile senza compilazione
-- manuale e seconda verifica. Non dedurre mai il valore dagli appuntamenti.
--
-- update public.clients
-- set pt_assegnato = '<OPERATORS.ID VERIFICATO>', updated_at = now()
-- where id = '<CLIENTS.ID VERIFICATO>'
--   and pt_assegnato is null;
