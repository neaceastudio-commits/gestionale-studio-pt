-- Reprogram only an empty, confirmed successor. Keep its identity and source
-- cycles, require a fresh confirmation, and retain all existing audit/locks.
-- No customer rows are changed by this migration.
do $migration$
declare
 def text := pg_get_functiondef('public.calendar_expected_renewal(text,text,jsonb)'::regprocedure);
 old_guard text := $old$if p_action in ('edit','confirm','decline') and p.state<>'pending' or p_action='activate' and p.state<>'confirmed' then raise exception 'Stato proposta non compatibile'; end if;$old$;
 new_guard text := $new$if p_action='edit' and p.state='confirmed' then
   if exists(select 1 from public.calendar_expected_renewal_appointments m join public.appointments a on a.id=m.appointment_id where m.proposal_id=p.id and a.status<>'annullato') then raise exception 'Stato proposta non compatibile: il rinnovo ha lezioni attive'; end if;
  elsif p_action in ('edit','confirm','decline') and p.state<>'pending' or p_action='activate' and p.state<>'confirmed' then raise exception 'Stato proposta non compatibile'; end if;$new$;
 old_update text := $old$update public.calendar_expected_renewals set plan=p_payload->'plan' where id=p.id returning * into p;$old$;
 new_update text := $new$update public.calendar_expected_renewals set plan=p_payload->'plan',state='pending' where id=p.id returning * into p;$new$;
 old_activate text := $old$elsif p_action='activate' then
  perform set_config('neacea.expected_activate',p.id::text,true);$old$;
 new_activate text := $new$elsif p_action='activate' then
  if not exists(select 1 from public.calendar_expected_renewal_appointments m join public.appointments a on a.id=m.appointment_id where m.proposal_id=p.id and a.status<>'annullato') then raise exception 'Riprogramma il rinnovo: tutte le prenotazioni sono state annullate'; end if;
  perform set_config('neacea.expected_activate',p.id::text,true);$new$;
begin
 if position(old_guard in def)=0 or position(old_update in def)=0 or position(old_activate in def)=0 then
  raise exception 'Definizione rinnovi diversa da quella verificata: migrazione interrotta';
 end if;
 def:=replace(replace(replace(def,old_guard,new_guard),old_update,new_update),old_activate,new_activate);
 execute def;
end $migration$;
