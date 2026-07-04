-- Fixes a real bug caught by verify-integrity.mjs: Postgres fires BEFORE
-- INSERT row triggers for an `INSERT ... ON CONFLICT DO UPDATE` statement
-- even when the row ends up being routed to the UPDATE path (the trigger
-- output feeds EXCLUDED). That meant re-rating an item you'd already rated
-- - an upsert that should hit the update path, per spec's "re-rating
-- updates the existing rating" - was being counted against, and could be
-- blocked by, the new-rating daily cap. AFTER INSERT triggers don't have
-- this problem (they only fire for rows actually inserted), so the burst
-- flagging trigger from the same migration is unaffected.

create or replace function public.enforce_rating_rate_limit()
returns trigger
language plpgsql
as $$
declare
  daily_limit constant integer := 20;
  recent_count integer;
  already_rated boolean;
begin
  select exists (
    select 1 from public.ratings
    where user_id = new.user_id and menu_item_id = new.menu_item_id
  ) into already_rated;

  if already_rated then
    -- This insert will conflict and become an update (re-rating) - don't
    -- count it against the new-rating cap.
    return new;
  end if;

  select count(*) into recent_count
  from public.ratings
  where user_id = new.user_id
    and created_at > now() - interval '24 hours';

  if recent_count >= daily_limit then
    raise exception 'Rate limit exceeded: you can submit up to % new ratings per 24 hours.', daily_limit;
  end if;

  return new;
end;
$$;
