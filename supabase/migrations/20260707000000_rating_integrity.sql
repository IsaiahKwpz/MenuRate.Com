-- Build Order step 6 (spec Section 6, "Rating integrity & anti-fraud").
-- Signup throttling per IP is already covered by Supabase Auth's built-in
-- auth.rate_limit.sign_in_sign_ups (30 per 5 min per IP, live since step 2)
-- - no app code needed for that piece. This migration covers the other two:
-- per-account daily rate limits, and burst/anomaly flagging for review.

-- ── Per-account rate limit ──────────────────────────────────────────────
-- Only fires on genuinely new ratings - an upsert that hits the ON
-- CONFLICT DO UPDATE path (re-rating something you already rated) never
-- reaches an INSERT trigger, so re-rating never counts against the cap.

create function public.enforce_rating_rate_limit()
returns trigger
language plpgsql
as $$
declare
  daily_limit constant integer := 20;
  recent_count integer;
begin
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

create trigger ratings_rate_limit
  before insert on public.ratings
  for each row execute function public.enforce_rating_rate_limit();

-- ── Burst/anomaly flagging ───────────────────────────────────────────────
-- "a burst of same-direction ratings hitting one restaurant in a short
-- window (competitor sabotage, or an owner rallying friends to inflate
-- their own score)" - reuses the reports table (rather than a parallel
-- table) so these show up in the /admin/reports queue being built in step
-- 7 with no extra UI work. reporter_id is nullable so a system-generated
-- flag isn't attributed to a user; the existing "insert as yourself" RLS
-- policy on reports still blocks any authenticated user from forging a
-- null-reporter row directly, since auth.uid() is never null for them.

alter table public.reports alter column reporter_id drop not null;

create function public.flag_rating_bursts()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  window_minutes constant integer := 60;
  burst_threshold constant integer := 5;
  target_restaurant uuid;
  high_count integer;
  low_count integer;
  already_flagged boolean;
begin
  select restaurant_id into target_restaurant
  from public.menu_items
  where id = new.menu_item_id;

  select count(distinct r.user_id) into high_count
  from public.ratings r
  join public.menu_items mi on mi.id = r.menu_item_id
  where mi.restaurant_id = target_restaurant
    and r.score >= 4
    and r.created_at > now() - make_interval(mins => window_minutes);

  select count(distinct r.user_id) into low_count
  from public.ratings r
  join public.menu_items mi on mi.id = r.menu_item_id
  where mi.restaurant_id = target_restaurant
    and r.score <= 2
    and r.created_at > now() - make_interval(mins => window_minutes);

  if high_count >= burst_threshold then
    select exists (
      select 1 from public.reports
      where target_type = 'restaurant'
        and target_id = target_restaurant
        and reporter_id is null
        and status = 'open'
        and reason like 'Automated: burst of high ratings%'
        and created_at > now() - make_interval(mins => window_minutes)
    ) into already_flagged;

    if not already_flagged then
      insert into public.reports (target_type, target_id, reporter_id, reason, status)
      values (
        'restaurant', target_restaurant, null,
        format(
          'Automated: burst of high ratings - %s distinct users rated 4+ within %s minutes',
          high_count, window_minutes
        ),
        'open'
      );
    end if;
  end if;

  if low_count >= burst_threshold then
    select exists (
      select 1 from public.reports
      where target_type = 'restaurant'
        and target_id = target_restaurant
        and reporter_id is null
        and status = 'open'
        and reason like 'Automated: burst of low ratings%'
        and created_at > now() - make_interval(mins => window_minutes)
    ) into already_flagged;

    if not already_flagged then
      insert into public.reports (target_type, target_id, reporter_id, reason, status)
      values (
        'restaurant', target_restaurant, null,
        format(
          'Automated: burst of low ratings - %s distinct users rated 2 or below within %s minutes',
          low_count, window_minutes
        ),
        'open'
      );
    end if;
  end if;

  return new;
end;
$$;

create trigger ratings_flag_bursts
  after insert on public.ratings
  for each row execute function public.flag_rating_bursts();
