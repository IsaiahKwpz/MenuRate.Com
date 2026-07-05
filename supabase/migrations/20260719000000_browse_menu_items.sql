-- Backs the search page's filter-only mode: price/rating filters previously
-- only rendered once a query or category was picked, since there was no
-- query path for "just filters, no text/tag". Same shape as
-- search_menu_items minus the text predicate, so it drops into the same
-- grouping/rendering pipeline.

create function public.browse_menu_items(result_limit integer default 300)
returns table (
  id uuid,
  name text,
  price numeric,
  currency text,
  category text,
  restaurant_id uuid,
  restaurant_name text,
  brand_id uuid,
  brand_name text,
  avg_score numeric,
  rating_count bigint
)
language sql
stable
as $$
  select mi.id, mi.name, mi.price, mi.currency, mi.category, mi.restaurant_id,
    r.name as restaurant_name, r.brand_id, b.name as brand_name,
    mir.avg_score, mir.rating_count
  from public.menu_items mi
  join public.restaurants r on r.id = mi.restaurant_id
  left join public.brands b on b.id = r.brand_id
  left join public.menu_item_ratings mir on mir.menu_item_id = mi.id
  where mi.is_active and r.status = 'active'
  order by mir.avg_score desc nulls last, mi.name asc
  limit result_limit;
$$;

grant execute on function public.browse_menu_items(integer) to anon, authenticated;
