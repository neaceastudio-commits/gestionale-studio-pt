-- Presentation markers on cancelled reservations are historical data too.
-- Activation only updates the still-active rows; never rewrite old cancellations.
do $$ declare def text; oldtext text; newtext text;begin
 def:=pg_get_functiondef('public.calendar_expected_renewal(text,text,jsonb)'::regprocedure);
 oldtext:=$old$where m.proposal_id=p.id loop
   -- Remove only presentation markers.$old$;
 newtext:=$new$where m.proposal_id=p.id and a.status<>'annullato' loop
   -- Remove only presentation markers.$new$;
 if position(oldtext in def)=0 then raise exception 'Activation history loop mismatch';end if;
 def:=replace(def,oldtext,newtext);execute def;
end $$;
