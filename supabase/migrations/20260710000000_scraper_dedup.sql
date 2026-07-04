-- Build Order step 9 (spec Section 5: "Duplicate check at ingestion -
-- fuzzy-match new entries against existing restaurants (name + address)
-- before creating a new row"). pg_trgm's trigram similarity is the natural
-- fit for "same restaurant, slightly different name/address formatting"
-- (e.g. "Joe's Diner" vs "Joes Diner", or minor address punctuation
-- differences) - exact-match would miss these, which is exactly the
-- failure mode this check exists to prevent.

create extension if not exists pg_trgm;

create function public.find_matching_restaurant(candidate_name text, candidate_address text)
returns uuid
language sql
stable
as $$
  select id
  from public.restaurants
  where similarity(name, candidate_name) > 0.4
    and similarity(address, candidate_address) > 0.4
  order by (similarity(name, candidate_name) + similarity(address, candidate_address)) desc
  limit 1;
$$;

-- Scraper-only (service_role) - this is an ingestion-time helper, not
-- something the public API or app code has any reason to call.
revoke execute on function public.find_matching_restaurant(text, text) from public;
grant execute on function public.find_matching_restaurant(text, text) to service_role;
