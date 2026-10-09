-- Mantiene firma, SECURITY INVOKER, search_path e privilegi esistenti.
-- Non modifica appuntamenti, clienti o permessi.
create or replace function public.calendar_uses_current_session(a jsonb, c jsonb)
returns boolean language plpgsql volatile security invoker set search_path = '' as $$
declare ledger_text text; ledger jsonb; cycle jsonb; start_date text; marker text; cycle_id text; persisted text; inferred text;
begin
  if a is null or a->>'status' is distinct from 'fatto' or a->>'service_id' not in ('pt11','pt12','circuit')
     or not coalesce(a->'client_ids' @> jsonb_build_array(c->>'id'), false) then return false; end if;
  ledger_text := substring(coalesce(c->>'notes','') from '\[NEACEA-PACKAGE-LEDGER-V1\]\s*([\s\S]*?)\s*\[/NEACEA-PACKAGE-LEDGER-V1\]');
  if ledger_text is not null then
    ledger := ledger_text::jsonb;
    select value into cycle from jsonb_array_elements(ledger->'cycles') with ordinality e(value, n)
      order by case when coalesce(value->>'closedAt','') = '' then 0 else 1 end, n desc limit 1;
  end if;
  persisted := coalesce(substring(coalesce(c->>'notes','') from '\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]'), nullif(c->>'data_conferma',''));
  select max(coalesce(substring(coalesce(x.notes,'') from '\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]'),
    substring(coalesce(x.notes,'') from 'Rinnovo pacchetto da\s+(\d{4}-\d{2}-\d{2})'))) into inferred
    from public.appointments x where to_jsonb(x.client_ids) @> jsonb_build_array(c->>'id') and x.service_id in ('pt11','pt12','circuit');
  start_date := coalesce(nullif(cycle->>'startDate',''), persisted, inferred, nullif(c->>'data_inizio',''), nullif(c->>'package_start',''));
  marker := coalesce(substring(coalesce(a->>'notes','') from '\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]'),
    substring(coalesce(a->>'notes','') from 'Rinnovo pacchetto da\s+(\d{4}-\d{2}-\d{2})'));
  cycle_id := substring(coalesce(a->>'notes','') from '\[CICLO-PACCHETTO-ID\s+([a-zA-Z0-9_-]+)\]');
  if nullif(cycle->>'id','') is not null then
    if cycle_id is not null then return cycle_id = cycle->>'id'; end if;
    if coalesce((cycle->>'legacy')::boolean,false) = false then return false; end if;
  end if;
  -- Una seduta collegata esplicitamente resta nel ciclo anche se anticipata.
  if marker is not null and marker = start_date then return true; end if;
  if persisted is not null then return start_date is null or a->>'date' >= start_date; end if;
  if marker is not null then return start_date is null or marker = start_date; end if;
  return start_date is null or a->>'date' >= start_date;
end;
$$;
