-- Fixes a real bug caught by verify-scraper.mjs: two DIFFERENT chain
-- locations on the same street ("10 Chain Rd" vs "20 Chain Rd" - names
-- also near-identical, "...Location A" vs "...Location B") got fuzzy-
-- matched as the same restaurant and silently merged, because trigram
-- similarity on two strings differing only in a couple of characters is
-- very high regardless of a reasonable-sounding threshold.
--
-- False positives here are worse than false negatives: silently merging
-- two real, different restaurants' menus has no easy automatic undo,
-- while a missed duplicate just falls back to the manual merge tool
-- (step 7) - exactly what spec Section 5 anticipates ("for when the
-- ingestion-time dedup check misses a match"). So this errs toward
-- precision: raise both thresholds, and additionally require the
-- leading civic number (if any) to match exactly - directly closes the
-- same-street-different-number case that trigram similarity alone can't
-- reliably distinguish.

create or replace function public.find_matching_restaurant(candidate_name text, candidate_address text)
returns uuid
language sql
stable
as $$
  select id
  from public.restaurants
  where similarity(name, candidate_name) > 0.5
    and similarity(address, candidate_address) > 0.5
    and coalesce(substring(address from '^\d+'), '') = coalesce(substring(candidate_address from '^\d+'), '')
  order by (similarity(name, candidate_name) + similarity(address, candidate_address)) desc
  limit 1;
$$;
