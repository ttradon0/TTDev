create index profiles_active_booking_idx
  on public.profiles (active_booking_id)
  where active_booking_id is not null;

create index booking_details_cancelled_by_idx
  on public.booking_details (cancelled_by)
  where cancelled_by is not null;
