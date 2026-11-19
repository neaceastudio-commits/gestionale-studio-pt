-- Read-only package rollups and per-client history for the existing Calendar gateway.
-- The gateway supplies the verified actor. Only service_role may execute these RPCs.
create index if not exists appointments_package_client_ids_idx
  on public.appointments using gin (client_ids jsonb_path_ops);

create function public.calendar_package_client_visible(p_actor_id text, p_actor_role text, p_client_id text, p_referent text)
returns boolean
language sql stable security invoker set search_path = ''
as $$
  select coalesce(p_actor_id <> '' and (
    p_actor_role in ('owner', 'secretary') or
    (p_actor_role = 'pt' and (
      p_referent = p_actor_id or
      exists (
        select 1 from public.trainer_client_assignments s
        where s.client_id = p_client_id and s.trainer_id = p_actor_id and s.active
      ) or
      exists (
        select 1 from public.appointments a
        where a.operator_id = p_actor_id and a.client_ids @> jsonb_build_array(p_client_id)
      )
    ))
  ), false);
$$;

create function public.calendar_package_read_json(p_notes text, p_marker text)
returns jsonb
language plpgsql immutable security invoker set search_path = ''
as $$
declare
  raw text;
  data jsonb;
begin
  select capture[1] into raw
  from regexp_matches(coalesce(p_notes, ''),
    '\[' || p_marker || '\]([\s\S]*?)\[/' || p_marker || '\]', 'g')
    with ordinality as m(capture, position)
  order by position desc limit 1;
  if raw is null then return null; end if;

  begin
    data := raw::jsonb;
  exception when invalid_text_representation then
    if p_marker = 'NEACEA-PT-SESSION-V1' then
      raise exception 'Metadati seduta PT non validi';
    end if;
    return null;
  end;

  if p_marker = 'NEACEA-PT-SESSION-V1' and
     (data->'version' is distinct from '1'::jsonb or
      coalesce(jsonb_typeof(data->'participants'), '') not in ('object', 'array')) then
    raise exception 'Metadati seduta PT non validi';
  end if;
  return data;
end;
$$;

create function public.calendar_package_summaries(
  p_actor_id text, p_actor_role text, p_day date, p_limit integer, p_offset integer
)
returns setof jsonb
language sql stable security invoker set search_path = ''
as $$
  with clients as materialized (
    select c.*
    from public.clients c
    where public.calendar_package_client_visible(p_actor_id, p_actor_role, c.id, c.pt_assegnato)
    order by c.id
    limit least(500, greatest(1, p_limit)) offset greatest(0, p_offset)
  ), lessons as materialized (
    select c.id as client_id, a.service_id, a.date as day,
      coalesce(nullif(a.status, ''), 'prenotato') as status,
      strpos(coalesce(a.notes, ''), '[RINNOVO-PREVISTO ') > 0 as expected_renewal,
      strpos(coalesce(a.notes, ''), '[ASSENZA-SCALATA]') > 0 as charged_single,
      coalesce(
        substring(coalesce(a.notes, '') from '(?i)\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]'),
        (select capture[1] from regexp_matches(coalesce(a.notes, ''),
          'Rinnovo pacchetto da\s+(\d{4}-\d{2}-\d{2})', 'gi')
          with ordinality as m(capture, position) order by position desc limit 1)
      ) as declared_start,
      substring(coalesce(a.notes, '') from '(?i)\[CICLO-PACCHETTO-ID\s+([a-zA-Z0-9_-]+)\]') as declared_id,
      case when a.status is distinct from 'annullato' and
        (a.service_id = 'pt12' or strpos(coalesce(a.notes, ''), '[RINNOVO-PREVISTO ') = 0)
        then public.calendar_package_read_json(a.notes, 'NEACEA-PT-SESSION-V1') end as attendance
    from clients c
    join public.appointments a on a.client_ids @> jsonb_build_array(c.id)
    where a.service_id in ('pt11', 'pt12', 'circuit')
      and (p_actor_role <> 'pt' or a.operator_id = p_actor_id)
  ), inferred as (
    select client_id, max(declared_start) as day
    from lessons where not expected_renewal group by client_id
  ), contexts as materialized (
    select c.id,
      coalesce(nullif(cycle.value->>'startDate', ''), saved.day, i.day, c.data_inizio::text, c.package_start::text, '') as cycle_start,
      nullif(cycle.value->>'id', '') as cycle_id,
      cycle.value is null or cycle.value->'legacy' = 'true'::jsonb as legacy,
      saved.day is not null as persisted,
      saved.day is null and i.day is not null as inferred,
      coalesce(adjustment.total, 0) as adjustment
    from clients c
    left join inferred i on i.client_id = c.id
    cross join lateral (select coalesce(
      substring(coalesce(c.notes, '') from '(?i)\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]'),
      c.data_conferma::text
    ) as day) saved
    cross join lateral (select public.calendar_package_read_json(c.notes, 'NEACEA-PACKAGE-LEDGER-V1')->'cycles' as cycles) ledger
    left join lateral (
      select value from jsonb_array_elements(case when jsonb_typeof(ledger.cycles) = 'array' then ledger.cycles else '[]'::jsonb end)
        with ordinality as j(value, position)
      order by (coalesce(value->>'closedAt', '') = '') desc, position desc limit 1
    ) cycle on true
    left join lateral (
      select sum(case when jsonb_typeof(value->'sessions') = 'number' then
          case when (value->>'sessions')::numeric >= 0 and
               trunc((value->>'sessions')::numeric) = (value->>'sessions')::numeric
               then (value->>'sessions')::numeric end end) as total
      from jsonb_array_elements(case when jsonb_typeof(cycle.value->'sessionAdjustments') = 'array'
        then cycle.value->'sessionAdjustments' else '[]'::jsonb end)
    ) adjustment on true
  ), participation as (
    select l.*,
      case when l.service_id = 'pt12' then coalesce(nullif(p.value->>'status', ''), l.status) else l.status end as own_status,
      case
        when l.status = 'annullato' or l.expected_renewal then false
        when p.value is not null and p.value <> 'null'::jsonb then case
          when context.cycle_id is not null and nullif(p.value->>'cycleId', '') is not null then p.value->>'cycleId' = context.cycle_id
          when context.cycle_id is not null and context.legacy is not true then false
          else context.cycle_start = '' or p.value->>'start' = context.cycle_start
        end
        when context.cycle_id is not null and l.declared_id is not null then l.declared_id = context.cycle_id
        when context.cycle_id is not null and context.legacy is not true then false
        when l.declared_start = context.cycle_start then true
        when context.persisted then context.cycle_start = '' or l.day::text >= context.cycle_start
        when l.declared_start is not null then context.cycle_start = '' or l.declared_start = context.cycle_start
        else context.cycle_start = '' or l.day::text >= context.cycle_start
      end as in_cycle
    from lessons l
    join contexts context on context.id = l.client_id
    cross join lateral (select l.attendance->'participants'->l.client_id as value) p
  ), counts as (
    select client_id,
      count(*) filter (where in_cycle and own_status = 'fatto') as completed,
      count(*) filter (where status <> 'annullato' and own_status = 'fatto') as lifetime,
      count(*) filter (where in_cycle and own_status = 'noshow') as no_show,
      count(*) filter (where in_cycle and own_status = 'noshow' and
        case when service_id = 'pt12' then attendance is not null else charged_single end) as charged,
      count(*) filter (where in_cycle and status = 'prenotato' and day >= p_day) as scheduled,
      min(day) filter (where in_cycle and status = 'prenotato' and day >= p_day) as next,
      max(day) filter (where in_cycle and status = 'fatto') as last_done,
      max(day) filter (where status = 'fatto') as last_done_lifetime,
      max(day) filter (where in_cycle) as last_planned
    from participation group by client_id
  ), totals as (
    select c.id, context.cycle_start, context.persisted, context.inferred, context.adjustment,
      coalesce(c.sessions_total, 0) as raw_total, coalesce(c.sessions_remaining, 0) as stored,
      coalesce(n.completed, 0) as completed, coalesce(n.lifetime, 0) as lifetime,
      coalesce(n.lifetime - n.completed, 0) as previous,
      coalesce(n.no_show, 0) as no_show, coalesce(n.charged, 0) as charged,
      coalesce(n.completed + n.charged, 0) + context.adjustment as consumed,
      coalesce(n.scheduled, 0) as scheduled, n.next, n.last_done, n.last_done_lifetime, n.last_planned
    from clients c join contexts context on context.id = c.id left join counts n on n.client_id = c.id
  ), normalized as (
    select t.*, case when inferred and previous > 0 and raw_total > 0 and inferred_total > 0
      then least(raw_total, case when raw_total % 4 = 0 and inferred_total < raw_total
        then ceil(inferred_total / 4) * 4 else inferred_total end)
      else raw_total end as total
    from totals t cross join lateral (select greatest(consumed + scheduled, stored + consumed) as inferred_total) f
  )
  select jsonb_build_object(
    'client', to_jsonb(c),
    'metrics', jsonb_build_object(
      'total', t.total, 'rawTotal', t.raw_total, 'completed', t.completed, 'consumed', t.consumed,
      'chargedAbsences', t.charged, 'sessionAdjustment', t.adjustment, 'lifetimeCompleted', t.lifetime,
      'previousCompleted', t.previous, 'scheduled', t.scheduled, 'noShow', t.no_show,
      'plannedTotal', t.consumed + t.scheduled, 'remaining', b.remaining,
      'toSchedule', case when t.total > 0 then greatest(0, t.total - t.consumed - t.scheduled) else 0 end,
      'overPlanned', case when t.total > 0 then greatest(0, t.consumed + t.scheduled - t.total) else 0 end,
      'storedRemaining', t.stored, 'computedRemaining', b.remaining,
      'cycleStart', t.cycle_start, 'cyclePersisted', t.persisted, 'needsCycleSetup', t.inferred
    ),
    'dates', jsonb_build_object('next', t.next, 'lastDone', t.last_done,
      'lastDoneLifetime', t.last_done_lifetime, 'lastPlanned', t.last_planned)
  )
  from clients c join normalized t on t.id = c.id
  cross join lateral (select case when t.total > 0 then greatest(0, t.total - t.consumed) else t.stored end as remaining) b
  order by c.id;
$$;

create function public.calendar_client_history(
  p_actor_id text, p_actor_role text, p_client_id text, p_limit integer, p_offset integer
)
returns setof public.appointments
language sql stable security invoker set search_path = ''
as $$
  select a.*
  from public.appointments a
  where a.client_ids @> jsonb_build_array(p_client_id)
    and (p_actor_role <> 'pt' or a.operator_id = p_actor_id)
    and exists (
      select 1 from public.clients c where c.id = p_client_id
        and public.calendar_package_client_visible(p_actor_id, p_actor_role, c.id, c.pt_assegnato)
    )
  order by a.date desc, a.start_time desc, a.id
  limit least(500, greatest(1, p_limit)) offset greatest(0, p_offset);
$$;

revoke all on function public.calendar_package_client_visible(text, text, text, text),
  public.calendar_package_read_json(text, text),
  public.calendar_package_summaries(text, text, date, integer, integer),
  public.calendar_client_history(text, text, text, integer, integer)
from public, anon, authenticated;
grant execute on function public.calendar_package_client_visible(text, text, text, text),
  public.calendar_package_read_json(text, text),
  public.calendar_package_summaries(text, text, date, integer, integer),
  public.calendar_client_history(text, text, text, integer, integer)
to service_role;
