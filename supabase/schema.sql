-- ─────────────────────────────────────────────────────────────────────────────
-- RideShare — Supabase Schema
-- Run this in the Supabase SQL editor (project → SQL editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable PostGIS for location data (Supabase has it pre-installed)
-- We store location as a simple JSONB {latitude, longitude} for the MVP

-- ─── Profiles (extends Supabase auth.users) ──────────────────────────────────
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text ,
  phone       text,
  role        text not null check (role in ('customer', 'driver', 'admin')),
  avatar_url  text,
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;

-- Helper: check admin role without querying profiles (avoids infinite RLS recursion)
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Admins can read all profiles"
  on public.profiles for select using (public.is_admin());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );
  if new.raw_user_meta_data->>'role' = 'driver' then
    insert into public.drivers (user_id, full_name, phone, vehicle_type, vehicle_plate, vehicle_model, vehicle_color)
    values (
      new.id,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'phone',
      coalesce(new.raw_user_meta_data->>'vehicle_type', 'economy'),
      coalesce(new.raw_user_meta_data->>'vehicle_plate', ''),
      coalesce(new.raw_user_meta_data->>'vehicle_model', ''),
      new.raw_user_meta_data->>'vehicle_color'
    );
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Drivers ─────────────────────────────────────────────────────────────────
create table public.drivers (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references auth.users(id) on delete cascade unique not null,
  full_name           text not null,
  phone               text,
  avatar_url          text,
  vehicle_type        text not null check (vehicle_type in ('economy', 'comfort', 'premium')),
  vehicle_plate       text not null,
  vehicle_model       text not null,
  vehicle_color       text,
  documents           jsonb default '{}',  -- { license_url, id_card_url }
  onboarding_complete boolean not null default false,
  approved            boolean not null default false,
  status              text not null default 'offline' check (status in ('online', 'offline', 'in_ride')),
  rating              numeric(3,2) not null default 5.0,
  total_trips         int not null default 0,
  location            jsonb,               -- { latitude, longitude }
  created_at          timestamptz default now()
);
alter table public.drivers enable row level security;

create policy "Driver can read own record"
  on public.drivers for select using (auth.uid() = user_id);
create policy "Driver can update own record"
  on public.drivers for update using (auth.uid() = user_id);
create policy "Admins can read all drivers"
  on public.drivers for select using (public.is_admin());
create policy "Admins can update all drivers"
  on public.drivers for update using (public.is_admin());
create or replace function public.customer_has_ride_with_driver(p_driver_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.orders
    where customer_id = auth.uid()
      and driver_id = p_driver_id
      and status in ('accepted', 'arriving', 'in_progress', 'completed')
  );
$$;

create policy "Customers can read basic driver info"
  on public.drivers for select
  using (public.customer_has_ride_with_driver(id));

-- ─── Orders ──────────────────────────────────────────────────────────────────
create table public.orders (
  id               uuid default gen_random_uuid() primary key,
  customer_id      uuid references auth.users(id) on delete cascade not null,
  driver_id        uuid references public.drivers(id),
  vehicle_type     text not null check (vehicle_type in ('economy', 'comfort', 'premium')),
  pickup           jsonb not null,   -- { label, lat, lng }
  dropoff          jsonb not null,   -- { label, lat, lng }
  status           text not null default 'pending'
                     check (status in ('pending','accepted','arriving','in_progress','completed','cancelled')),
  estimated_price  numeric(10,2) not null,
  final_price      numeric(10,2),
  distance_km      numeric(8,2),
  duration_min     numeric(8,2),
  created_at           timestamptz default now(),
  accepted_at          timestamptz,
  completed_at         timestamptz,
  declined_by          uuid[] not null default '{}',
  dispatch_expires_at  timestamptz
);
alter table public.orders enable row level security;

create policy "Customer can read own orders"
  on public.orders for select using (auth.uid() = customer_id);
create policy "Customer can insert orders"
  on public.orders for insert with check (auth.uid() = customer_id);
create policy "Customer can cancel own pending order"
  on public.orders for update
  using (auth.uid() = customer_id and status = 'pending')
  with check (auth.uid() = customer_id);
create policy "Driver can read assigned orders"
  on public.orders for select using (
    exists (select 1 from public.drivers where user_id = auth.uid() and id = orders.driver_id)
  );
-- Online drivers can see all pending unassigned orders (to receive incoming ride requests)
create policy "Online drivers can see pending orders"
  on public.orders for select using (
    status = 'pending' and driver_id is null and
    exists (select 1 from public.drivers where user_id = auth.uid() and status in ('online', 'in_ride'))
  );
create policy "Driver can update assigned orders"
  on public.orders for update using (
    exists (select 1 from public.drivers where user_id = auth.uid() and id = orders.driver_id)
  );
-- Allow driver to claim a pending order (set driver_id on a pending order)
create policy "Driver can accept pending orders"
  on public.orders for update using (
    status = 'pending' and driver_id is null and
    exists (select 1 from public.drivers where user_id = auth.uid() and status = 'online')
  );
create policy "Admins can read all orders"
  on public.orders for select using (public.is_admin());

-- ─── Ratings ─────────────────────────────────────────────────────────────────
create table public.ratings (
  id           uuid default gen_random_uuid() primary key,
  order_id     uuid references public.orders(id) on delete cascade not null,
  from_user_id uuid references auth.users(id) not null,
  to_user_id   uuid references auth.users(id) not null,
  score        int not null check (score between 1 and 5),
  comment      text,
  created_at   timestamptz default now(),
  unique (order_id, from_user_id)
);
alter table public.ratings enable row level security;

create policy "Users can insert ratings for their orders"
  on public.ratings for insert with check (auth.uid() = from_user_id);
create policy "Users can read ratings about them"
  on public.ratings for select using (auth.uid() = to_user_id or auth.uid() = from_user_id);

-- Increment driver total_trips when an order is completed
create or replace function public.increment_driver_trips()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'completed' and old.status != 'completed' and new.driver_id is not null then
    update public.drivers
    set total_trips = total_trips + 1
    where id = new.driver_id;
  end if;
  return new;
end;
$$;
create trigger on_order_completed
  after update on public.orders
  for each row execute procedure public.increment_driver_trips();

-- Update driver rating after new rating is inserted
create or replace function public.update_driver_rating()
returns trigger language plpgsql security definer as $$
begin
  update public.drivers
  set rating = (
    select round(avg(score)::numeric, 2)
    from public.ratings
    where to_user_id = new.to_user_id
  )
  where user_id = new.to_user_id;
  return new;
end;
$$;
create trigger on_rating_inserted
  after insert on public.ratings
  for each row execute procedure public.update_driver_rating();

-- ─── Settings ────────────────────────────────────────────────────────────────
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);
alter table public.settings enable row level security;

create policy "Admins can manage settings"
  on public.settings for all using (public.is_admin());

insert into public.settings (key, value) values
  ('rates', '{"economy": {"base_fare": 5, "per_km": 2.5, "per_min": 0.4}, "comfort": {"base_fare": 8, "per_km": 3.5, "per_min": 0.6}, "premium": {"base_fare": 15, "per_km": 6, "per_min": 1}}');

-- ─── Dispatch logic ───────────────────────────────────────────────────────────

-- Finds the closest online driver to the order's pickup and assigns them.
-- Skips drivers in the order's declined_by list.
create or replace function public.dispatch_nearest_driver(p_order_id uuid)
returns void language plpgsql security definer as $$
declare
  v_pickup         jsonb;
  v_declined       uuid[];
  v_pickup_lat     float;
  v_pickup_lng     float;
  v_driver_id      uuid;
  v_vehicle_type   text;
begin
  select pickup, declined_by, vehicle_type
    into v_pickup, v_declined, v_vehicle_type
    from public.orders
   where id = p_order_id and status = 'pending';

  if not found then return; end if;

  v_pickup_lat := (v_pickup->>'lat')::float;
  v_pickup_lng := (v_pickup->>'lng')::float;

  -- Find closest online driver of the right vehicle type, not already declined
  select d.id into v_driver_id
    from public.drivers d
   where d.status = 'online'
     and d.vehicle_type = v_vehicle_type
     and d.location is not null
     and not (d.id = any(v_declined))
   order by
     -- Euclidean distance on lat/lng (good enough for local fleet, avoids PostGIS dep)
     sqrt(
       power(((d.location->>'latitude')::float  - v_pickup_lat) * 111.0, 2) +
       power(((d.location->>'longitude')::float - v_pickup_lng) * 111.0
             * cos(radians(v_pickup_lat)), 2)
     )
   limit 1;

  if v_driver_id is not null then
    update public.orders
       set driver_id            = v_driver_id,
           dispatch_expires_at  = now() + interval '20 seconds'
     where id = p_order_id;
  end if;
end;
$$;

-- Called by the driver app when they decline or their 20s timer expires.
-- Adds the driver to declined_by, clears assignment, then re-dispatches.
create or replace function public.skip_dispatch(p_order_id uuid, p_driver_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.orders
     set declined_by           = array_append(declined_by, p_driver_id),
         driver_id             = null,
         dispatch_expires_at   = null
   where id = p_order_id
     and status = 'pending'
     and driver_id = p_driver_id;

  if found then
    perform public.dispatch_nearest_driver(p_order_id);
  end if;
end;
$$;

-- Dispatches all currently unassigned pending orders to the nearest available driver.
-- Called when a driver comes online so they can pick up waiting orders immediately.
create or replace function public.dispatch_pending_orders()
returns void language plpgsql security definer as $$
declare
  v_order_id uuid;
begin
  for v_order_id in
    select id from public.orders
    where status = 'pending' and driver_id is null
    order by created_at asc
  loop
    perform public.dispatch_nearest_driver(v_order_id);
  end loop;
end;
$$;

-- Trigger: auto-dispatch as soon as a new order is created
create or replace function public.trigger_dispatch_new_order()
returns trigger language plpgsql security definer as $$
begin
  perform public.dispatch_nearest_driver(new.id);
  return new;
end;
$$;

create trigger on_order_created
  after insert on public.orders
  for each row execute function public.trigger_dispatch_new_order();

-- pg_cron fallback: every minute, expire stuck dispatches and re-dispatch.
-- (Primary mechanism is the 20s client-side timer; this handles crashed phones.)
-- Run this after enabling pg_cron in Supabase → Database → Extensions.
select cron.schedule(
  'expire-stuck-dispatches',
  '* * * * *',
  $$
    with expired as (
      update public.orders
         set declined_by          = array_append(declined_by, driver_id),
             driver_id            = null,
             dispatch_expires_at  = null
       where status = 'pending'
         and driver_id is not null
         and dispatch_expires_at < now()
      returning id
    )
    select public.dispatch_nearest_driver(id) from expired;
  $$
);

-- ─── Storage ─────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('driver-documents', 'driver-documents', false)
  on conflict do nothing;

create policy "Drivers can upload own documents"
  on storage.objects for insert
  with check (bucket_id = 'driver-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Drivers can read own documents"
  on storage.objects for select
  using (bucket_id = 'driver-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Admins can read all driver documents"
  on storage.objects for select
  using (bucket_id = 'driver-documents' and public.is_admin());

-- ─── Realtime ────────────────────────────────────────────────────────────────
-- Enable realtime for these tables in Supabase dashboard:
-- Database → Replication → enable for: orders, drivers
