-- Keep the Student active-booking check before the room lock; the profile row remains locked through insertion.
create or replace function private.create_booking(
  p_room_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_meeting_name text,
  p_attendee_count integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz;
  v_profile public.profiles%rowtype;
  v_room public.rooms%rowtype;
  v_local_start timestamp without time zone;
  v_local_end timestamp without time zone;
  v_booking_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Sign in before booking a room.';
  end if;

  if p_starts_at is null or p_ends_at is null or p_room_id is null then
    raise exception using errcode = '22004', message = 'Choose a room and a start and end time.';
  end if;

  if p_meeting_name is null or length(btrim(p_meeting_name)) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'Meeting name must be between 2 and 120 characters.';
  end if;

  if p_attendee_count is null or p_attendee_count < 1 then
    raise exception using errcode = '22023', message = 'Number of people must be at least one.';
  end if;

  select p.*
    into v_profile
    from public.profiles as p
    where p.id = v_user_id
    for update;

  if not found then
    raise exception using errcode = '28000', message = 'Your demo account is not provisioned.';
  end if;

  v_now := clock_timestamp();

  if v_profile.role <> 'student' then
    raise exception using errcode = '42501', message = 'Only Students can create room bookings.';
  end if;

  if p_starts_at <= v_now or p_starts_at > v_now + interval '24 hours' then
    raise exception using errcode = '22023', message = 'Booking start must be within the next 24 hours.';
  end if;

  v_local_start := p_starts_at at time zone 'Asia/Bangkok';
  v_local_end := p_ends_at at time zone 'Asia/Bangkok';

  if p_ends_at <= p_starts_at then
    raise exception using errcode = '22023', message = 'Start time must be before end time.';
  end if;

  if extract(epoch from (p_ends_at - p_starts_at)) / 60 not in (30, 60, 90, 120) then
    raise exception using errcode = '22023', message = 'Choose a duration of 30, 60, 90, or 120 minutes.';
  end if;

  if date_trunc('minute', v_local_start) <> v_local_start or
     extract(minute from v_local_start)::integer % 30 <> 0 or
     date_trunc('minute', v_local_end) <> v_local_end or
     extract(minute from v_local_end)::integer % 30 <> 0 then
    raise exception using errcode = '22023', message = 'Booking times must align to 30-minute intervals.';
  end if;

  if v_local_start::date <> v_local_end::date then
    raise exception using errcode = '22023', message = 'A booking must start and end on the same local day.';
  end if;

  if v_local_start::time < time '06:00' or v_local_end::time > time '18:00' then
    raise exception using errcode = '22023', message = 'Booking hours are 06:00–18:00 Bangkok time.';
  end if;

  -- Fail fast before waiting on the room lock when this Student still has a booking.
  if v_profile.active_booking_id is not null and exists (
    select 1
    from public.bookings as b
    where b.id = v_profile.active_booking_id
      and b.status = 'confirmed'
      and b.ends_at > v_now
  ) then
    raise exception using errcode = '23505', message = 'You already have an active or upcoming booking.';
  end if;

  if exists (
    select 1
    from public.booking_details as d
    join public.bookings as b on b.id = d.booking_id
    where d.user_id = v_user_id
      and b.status = 'confirmed'
      and b.ends_at > v_now
  ) then
    raise exception using errcode = '23505', message = 'You already have an active or upcoming booking.';
  end if;

  select r.*
    into v_room
    from public.rooms as r
    where r.id = p_room_id
      and r.removed_at is null
    for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'This room is no longer available for booking.';
  end if;

  if v_room.status <> 'available' then
    raise exception using errcode = '22023', message = 'This room is under maintenance.';
  end if;

  if p_attendee_count > v_room.capacity then
    raise exception using errcode = '22023', message = 'Number of people exceeds this room’s capacity.';
  end if;

  -- Revalidate the rolling 24-hour boundary after any room-lock wait.
  v_now := clock_timestamp();

  if p_starts_at <= v_now or p_starts_at > v_now + interval '24 hours' then
    raise exception using errcode = '22023', message = 'Booking start must be within the next 24 hours.';
  end if;

  if exists (
    select 1
    from public.bookings as b
    where b.room_id = p_room_id
      and b.status = 'confirmed'
      and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then
    raise exception using errcode = '23P01', message = 'That time was just booked. Choose another slot.';
  end if;

  insert into public.bookings (room_id, room_name_snapshot, starts_at, ends_at)
  values (p_room_id, v_room.name, p_starts_at, p_ends_at)
  returning id into v_booking_id;

  insert into public.booking_details (booking_id, user_id, meeting_name, attendee_count)
  values (v_booking_id, v_user_id, btrim(p_meeting_name), p_attendee_count);

  update public.profiles
    set active_booking_id = v_booking_id
    where id = v_user_id;

  return v_booking_id;
end;
$$;
