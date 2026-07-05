-- Build Order step 11 (spec Section 11 / Section 6 "Photo moderation" /
-- Section 5 legal note on photos): users attach photos to a menu item or
-- restaurant; every upload is proactively moderated before it's ever shown
-- publicly, not left to reactive community reports alone.
--
-- "Run uploaded photos through an automated image-moderation API (e.g. AWS
-- Rekognition, Google Vision SafeSearch)" - no such API is configured in
-- this environment (IMAGE_MODERATION_API_KEY in .env.local is an empty
-- placeholder, same situation step 9 hit with geocoding before it fell back
-- to free Nominatim). Rather than fake an integration, every upload holds
-- in 'pending' for manual admin review - see lib/moderation/scan.ts. This is
-- a *stricter* proactive posture than an automated scan alone (100% human
-- review vs. a probabilistic filter before launch), not a workaround.

-- Private bucket - no storage.objects RLS policies are added here. All
-- reads (signed URLs) and writes go through server actions using the
-- service-role client (lib/supabase/admin.ts), gated by the `photos`
-- table's own RLS below rather than duplicating that logic as storage
-- policies. storage.objects has RLS enabled with no policies by default,
-- which already denies direct anon/authenticated access - service_role
-- bypasses RLS regardless, same as every other admin-only write path in
-- this app.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

-- Photos are reportable too ("every item/photo/comment has a flag icon" -
-- spec Section 6) - extends the same enum the report flow already uses.
alter type public.report_target_type add value 'photo';

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  target_type public.report_target_type not null,
  target_id uuid not null,
  storage_path text not null,
  uploaded_by uuid not null references public.profiles (id),
  status public.edit_status not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id),
  constraint photos_target_type_check check (target_type in ('menu_item', 'restaurant'))
);

create index photos_target_idx on public.photos (target_type, target_id);

alter table public.photos enable row level security;

create policy "anyone can see approved photos"
  on public.photos for select
  using (status = 'approved');

create policy "uploaders can see their own photos"
  on public.photos for select
  using (auth.uid() = uploaded_by);

create policy "authenticated users can submit a photo"
  on public.photos for insert
  with check (auth.uid() = uploaded_by);

-- No update/delete policy for regular users - approval/rejection happens
-- via the admin service-role client, same as pending_edits/pending_tags/
-- restaurant_claims.
