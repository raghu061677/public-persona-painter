
create or replace function public.fn_media_availability_range(
  p_company_id uuid,
  p_start date,
  p_end date,
  p_city text default null,
  p_media_type text default null
)
returns table (
  asset_id text,
  media_asset_code text,
  area text,
  location text,
  direction text,
  dimension text,
  sqft numeric,
  illumination text,
  card_rate numeric,
  city text,
  media_type text,
  primary_photo_url text,
  qr_code_url text,
  latitude numeric,
  longitude numeric,
  availability_status text,
  available_from date,
  booked_till date,
  current_campaign_id text,
  current_campaign_name text,
  current_client_name text,
  booking_start text,
  booking_end text
)
language plpgsql
stable
as $$
begin
  return query
  with asset_base as (
    select
      a.id as asset_id,
      a.media_asset_code,
      a.area,
      a.location,
      a.direction,
      a.dimensions as dimension,
      coalesce(a.total_sqft, 0) as sqft,
      coalesce(a.illumination_type, '') as illumination,
      a.card_rate,
      a.city,
      a.media_type,
      a.primary_photo_url,
      a.qr_code_url,
      a.latitude,
      a.longitude,
      a.current_campaign_id
    from public.media_assets a
    where a.company_id = p_company_id
      and coalesce(a.status::text, 'Available') not in ('Inactive', 'Expired')
      and (p_city is null or p_city = 'all' or a.city = p_city)
      and (p_media_type is null or p_media_type = 'all' or a.media_type = p_media_type)
  ),
  bookings as (
    select
      ca.asset_id,
      case when ca.booking_start_date is not null and ca.booking_start_date <> '' 
           then ca.booking_start_date::date else null end as b_start,
      case when ca.booking_end_date is not null and ca.booking_end_date <> '' 
           then ca.booking_end_date::date else null end as b_end,
      ca.campaign_id,
      c.campaign_name,
      c.client_name
    from public.campaign_assets ca
    join public.campaigns c on c.id = ca.campaign_id
    where coalesce(c.is_deleted, false) = false
      and c.status::text not in ('Cancelled','Archived')
      and ca.booking_start_date is not null and ca.booking_start_date <> ''
      and ca.booking_end_date is not null and ca.booking_end_date <> ''
      and ca.asset_id in (select ab.asset_id from asset_base ab)
  ),
  valid_bookings as (
    select * from bookings where b_start is not null and b_end is not null and b_end >= b_start
  ),
  last_booking_in_range as (
    select
      b.asset_id,
      max(b.b_end) as booked_till,
      (array_agg(b.campaign_id order by b.b_end desc))[1] as latest_campaign_id,
      (array_agg(b.campaign_name order by b.b_end desc))[1] as latest_campaign_name,
      (array_agg(b.client_name order by b.b_end desc))[1] as latest_client_name,
      (array_agg(b.b_start::text order by b.b_end desc))[1] as latest_booking_start,
      (array_agg(b.b_end::text order by b.b_end desc))[1] as latest_booking_end
    from valid_bookings b
    where b.b_end >= p_start
    group by b.asset_id
  ),
  has_overlap_in_range as (
    select distinct b.asset_id
    from valid_bookings b
    where b.b_start <= p_end
      and b.b_end >= p_start
  ),
  availability_calc as (
    select
      ab.*,
      lb.booked_till,
      lb.latest_campaign_id,
      lb.latest_campaign_name,
      lb.latest_client_name,
      lb.latest_booking_start,
      lb.latest_booking_end,
      case
        when ho.asset_id is null then p_start
        when lb.booked_till is not null then (lb.booked_till + interval '1 day')::date
        else p_start
      end as calc_available_from
    from asset_base ab
    left join last_booking_in_range lb on lb.asset_id = ab.asset_id
    left join has_overlap_in_range ho on ho.asset_id = ab.asset_id
  )
  select
    ac.asset_id,
    ac.media_asset_code,
    ac.area,
    ac.location,
    ac.direction,
    ac.dimension,
    ac.sqft,
    ac.illumination,
    ac.card_rate,
    ac.city,
    ac.media_type,
    ac.primary_photo_url,
    ac.qr_code_url,
    ac.latitude,
    ac.longitude,
    case
      when ac.calc_available_from <= p_start then 'VACANT_NOW'
      when ac.calc_available_from > p_start and ac.calc_available_from <= p_end then 'AVAILABLE_SOON'
      else 'BOOKED_THROUGH_RANGE'
    end as availability_status,
    ac.calc_available_from as available_from,
    ac.booked_till,
    ac.latest_campaign_id as current_campaign_id,
    ac.latest_campaign_name as current_campaign_name,
    ac.latest_client_name as current_client_name,
    ac.latest_booking_start as booking_start,
    ac.latest_booking_end as booking_end
  from availability_calc ac
  where ac.calc_available_from <= p_end
  order by
    case
      when ac.calc_available_from <= p_start then 1
      when ac.calc_available_from <= p_end then 2
      else 3
    end,
    ac.calc_available_from asc,
    ac.area asc,
    ac.location asc,
    ac.asset_id asc;
end;
$$;
