create extension if not exists btree_gist with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.user_role as enum ('student', 'admin');
create type public.room_status as enum ('available', 'maintenance');
create type public.booking_status as enum ('confirmed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  email text not null unique,
  display_name text not null,
  role public.user_role not null,
  active_booking_id uuid,
  created_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  capacity integer not null check (capacity > 0),
  status public.room_status not null default 'available',
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint rooms_name_not_blank check (length(btrim(name)) between 2 and 100)
);

create unique index rooms_active_name_unique
  on public.rooms (lower(name))
  where removed_at is null;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete restrict,
  room_name_snapshot text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.booking_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  constraint bookings_positive_interval check (starts_at < ends_at),
  constraint bookings_allowed_duration check (
    extract(epoch from (ends_at - starts_at)) / 60 in (30, 60, 90, 120)
  ),
  constraint bookings_local_day check (
    (starts_at at time zone 'Asia/Bangkok')::date =
    (ends_at at time zone 'Asia/Bangkok')::date
  ),
  constraint bookings_local_hours check (
    (starts_at at time zone 'Asia/Bangkok')::time >= time '06:00' and
    (ends_at at time zone 'Asia/Bangkok')::time <= time '18:00'
  ),
  constraint bookings_start_slot_alignment check (
    date_trunc('minute', starts_at at time zone 'Asia/Bangkok') =
      (starts_at at time zone 'Asia/Bangkok') and
    extract(minute from starts_at at time zone 'Asia/Bangkok')::integer % 30 = 0
  ),
  constraint bookings_end_slot_alignment check (
    date_trunc('minute', ends_at at time zone 'Asia/Bangkok') =
      (ends_at at time zone 'Asia/Bangkok') and
    extract(minute from ends_at at time zone 'Asia/Bangkok')::integer % 30 = 0
  )
);

create table public.booking_details (
  booking_id uuid primary key references public.bookings (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  meeting_name text not null,
  attendee_count integer not null check (attendee_count > 0),
  cancelled_by uuid references public.profiles (id) on delete restrict,
  cancelled_at timestamptz,
  constraint booking_details_meeting_name_not_blank check (
    length(btrim(meeting_name)) between 2 and 120
  ),
  constraint booking_details_cancellation_pair check (
    (cancelled_by is null) = (cancelled_at is null)
  )
);

alter table public.profiles
  add constraint profiles_active_booking_fk
  foreign key (active_booking_id)
  references public.bookings (id)
  on delete set null
  deferrable initially deferred;

create index bookings_room_starts_at_idx
  on public.bookings (room_id, starts_at)
  where status = 'confirmed';
create index bookings_ends_at_idx
  on public.bookings (ends_at)
  where status = 'confirmed';
create index booking_details_user_idx
  on public.booking_details (user_id, booking_id);
create index rooms_status_idx
  on public.rooms (status)
  where removed_at is null;

alter table public.bookings
  add constraint bookings_room_no_overlap
  exclude using gist (
    room_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status = 'confirmed');

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_details enable row level security;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  );
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create policy profiles_read_self_or_admin
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id or (select private.is_admin()));

create policy rooms_read_active_or_admin
  on public.rooms
  for select
  to authenticated
  using (removed_at is null or (select private.is_admin()));

create policy rooms_admin_insert
  on public.rooms
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy rooms_admin_update
  on public.rooms
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy bookings_read_schedule
  on public.bookings
  for select
  to authenticated
  using (true);

create policy booking_details_read_owner_or_admin
  on public.booking_details
  for select
  to authenticated
  using ((select auth.uid()) = user_id or (select private.is_admin()));

revoke all on table public.profiles, public.rooms, public.bookings, public.booking_details
  from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on table public.profiles, public.rooms, public.bookings, public.booking_details
  to authenticated;
grant insert, update on table public.rooms to authenticated;
grant select, insert, update on table public.profiles to service_role;
grant select, insert, update, delete on table public.rooms to service_role;
grant select, insert, update, delete on table public.bookings, public.booking_details to service_role;

create function private.create_booking(
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

  -- Fail before waiting on the room lock when this Student still has a booking.
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

  -- The room lock may have delayed this transaction, so recheck clock-based rules before inserting.
  v_now := clock_timestamp();

  if p_starts_at <= v_now or p_starts_at > v_now + interval '24 hours' then
    raise exception using errcode = '22023', message = 'Booking start must be within the next 24 hours.';
  end if;

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

create function public.create_booking(
  p_room_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_meeting_name text,
  p_attendee_count integer
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_booking(
    p_room_id,
    p_starts_at,
    p_ends_at,
    p_meeting_name,
    p_attendee_count
  );
$$;

revoke all on function private.create_booking(uuid, timestamptz, timestamptz, text, integer)
  from public, anon;
grant execute on function private.create_booking(uuid, timestamptz, timestamptz, text, integer)
  to authenticated;
revoke all on function public.create_booking(uuid, timestamptz, timestamptz, text, integer)
  from public, anon;
grant execute on function public.create_booking(uuid, timestamptz, timestamptz, text, integer)
  to authenticated;

create function private.cancel_booking(p_booking_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_now timestamptz := statement_timestamp();
  v_actor_role public.user_role;
  v_owner_id uuid;
  v_starts_at timestamptz;
  v_status public.booking_status;
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'Sign in before cancelling a booking.';
  end if;

  select p.role
    into v_actor_role
    from public.profiles as p
    where p.id = v_actor_id;

  if not found then
    raise exception using errcode = '28000', message = 'Your demo account is not provisioned.';
  end if;

  select d.user_id
    into v_owner_id
    from public.booking_details as d
    where d.booking_id = p_booking_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Booking not found.';
  end if;

  if v_actor_role = 'student' and v_owner_id <> v_actor_id then
    raise exception using errcode = '42501', message = 'Students can only cancel their own booking.';
  end if;

  if v_actor_role not in ('student', 'admin') then
    raise exception using errcode = '42501', message = 'You are not allowed to cancel this booking.';
  end if;

  perform 1
    from public.profiles as p
    where p.id = v_owner_id
    for update;

  select b.starts_at, b.status
    into v_starts_at, v_status
    from public.bookings as b
    where b.id = p_booking_id
    for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Booking not found.';
  end if;

  v_now := clock_timestamp();

  if v_status <> 'confirmed' then
    raise exception using errcode = '22023', message = 'This booking has already been cancelled.';
  end if;

  if v_actor_role = 'student' and v_now > v_starts_at - interval '30 minutes' then
    raise exception using errcode = '22023', message = 'Student cancellation closes 30 minutes before the meeting.';
  end if;

  update public.bookings
    set status = 'cancelled'
    where id = p_booking_id;

  update public.booking_details
    set cancelled_by = v_actor_id,
        cancelled_at = v_now
    where booking_id = p_booking_id;

  update public.profiles
    set active_booking_id = null
    where id = v_owner_id
      and active_booking_id = p_booking_id;

  return p_booking_id;
end;
$$;

create function public.cancel_booking(p_booking_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.cancel_booking(p_booking_id);
$$;

revoke all on function private.cancel_booking(uuid) from public, anon;
grant execute on function private.cancel_booking(uuid) to authenticated;
revoke all on function public.cancel_booking(uuid) from public, anon;
grant execute on function public.cancel_booking(uuid) to authenticated;

comment on table public.profiles is 'Provisioned demo accounts and their protected Student/Admin roles.';
comment on table public.rooms is 'Bookable university rooms; removed_at preserves history while hiding a room from future booking.';
comment on table public.bookings is 'Room schedule intervals. Sensitive student and meeting details are stored separately.';
comment on table public.booking_details is 'Student-owned meeting details and cancellation audit fields.';
comment on function private.create_booking(uuid, timestamptz, timestamptz, text, integer) is 'Authenticated, atomic booking creation with role, timing, capacity, room-state, overlap, and student active-booking checks.';
comment on function private.cancel_booking(uuid) is 'Student cancellation with a 30-minute cutoff and Admin override.';
