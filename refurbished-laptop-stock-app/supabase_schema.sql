create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.refurb_laptops(id uuid primary key default gen_random_uuid(),laptop_id text not null unique,brand text not null,model text not null,serial_number text not null unique,configuration text not null,location text not null default 'Bangalore' check(location in('Bangalore','Hosur')),processor text not null,processor_gen text not null,ram_slot_1_size text not null,ram_slot_1_type text not null,ram_slot_2_size text,ram_slot_2_type text,storage_1_capacity text not null,storage_1_type text not null,storage_2_capacity text,storage_2_type text,screen_size text not null,power_adapter_type text not null,stock_status text not null default 'Need to be Checked' check(stock_status in('Need to be Checked','Spares Need to be Replaced','Sold','Scrap')),date_received date,purchase_reference_no text,remarks text,condition_data jsonb not null default '{}'::jsonb,created_by uuid references auth.users(id),updated_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists refurb_laptops_location_idx on public.refurb_laptops(location);
create index if not exists refurb_laptops_status_idx on public.refurb_laptops(stock_status);
create index if not exists refurb_laptops_created_by_idx on public.refurb_laptops(created_by);
create index if not exists refurb_laptops_updated_by_idx on public.refurb_laptops(updated_by);

create table if not exists public.refurb_stock_movements(id uuid primary key default gen_random_uuid(),laptop_id uuid not null references public.refurb_laptops(id) on delete restrict,movement_type text not null check(movement_type in('Transfer','Sale','Receipt','Return','Service')),from_location text not null,to_location text not null,movement_at timestamptz not null default now(),reference_no text,amount numeric(14,2),payment_date date,payment_mode text,remarks text,version_no integer not null default 1,correction_reason text,corrected_movement_id uuid references public.refurb_stock_movements(id),created_by uuid references auth.users(id),created_at timestamptz not null default now());
create index if not exists refurb_movements_laptop_idx on public.refurb_stock_movements(laptop_id,movement_at desc);
create index if not exists refurb_stock_movements_created_by_idx on public.refurb_stock_movements(created_by);
create index if not exists refurb_stock_movements_corrected_idx on public.refurb_stock_movements(corrected_movement_id);

create table if not exists public.refurb_movement_history(id uuid primary key default gen_random_uuid(),movement_id uuid not null references public.refurb_stock_movements(id) on delete cascade,version_no integer not null,snapshot jsonb not null,correction_reason text,created_by uuid references auth.users(id),created_at timestamptz not null default now(),unique(movement_id,version_no));
create index if not exists refurb_movement_history_created_by_idx on public.refurb_movement_history(created_by);

create table if not exists public.refurb_audit_log(id bigint generated always as identity primary key,user_id uuid references auth.users(id),action text not null,entity_type text not null,entity_id uuid,entity_name text,details jsonb,created_at timestamptz not null default now());
create index if not exists refurb_audit_log_user_id_idx on public.refurb_audit_log(user_id);

create or replace function private.refurb_is_staff() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.employee_profiles p where p.user_id=(select auth.uid()) and p.active=true);
$$;
revoke all on function private.refurb_is_staff() from public,anon;
grant execute on function private.refurb_is_staff() to authenticated;

alter table public.refurb_laptops enable row level security;
alter table public.refurb_stock_movements enable row level security;
alter table public.refurb_movement_history enable row level security;
alter table public.refurb_audit_log enable row level security;

drop policy if exists refurb_laptops_staff_select on public.refurb_laptops;
create policy refurb_laptops_staff_select on public.refurb_laptops for select to authenticated using ((select private.refurb_is_staff()));
drop policy if exists refurb_laptops_staff_insert on public.refurb_laptops;
create policy refurb_laptops_staff_insert on public.refurb_laptops for insert to authenticated with check ((select private.refurb_is_staff()));
drop policy if exists refurb_laptops_staff_update on public.refurb_laptops;
create policy refurb_laptops_staff_update on public.refurb_laptops for update to authenticated using ((select private.refurb_is_staff())) with check ((select private.refurb_is_staff()));
drop policy if exists refurb_laptops_staff_delete on public.refurb_laptops;
create policy refurb_laptops_staff_delete on public.refurb_laptops for delete to authenticated using ((select private.refurb_is_staff()));

drop policy if exists refurb_movements_staff_select on public.refurb_stock_movements;
create policy refurb_movements_staff_select on public.refurb_stock_movements for select to authenticated using ((select private.refurb_is_staff()));
drop policy if exists refurb_movements_staff_insert on public.refurb_stock_movements;
create policy refurb_movements_staff_insert on public.refurb_stock_movements for insert to authenticated with check ((select private.refurb_is_staff()));
drop policy if exists refurb_movements_staff_update on public.refurb_stock_movements;
create policy refurb_movements_staff_update on public.refurb_stock_movements for update to authenticated using ((select private.refurb_is_staff())) with check ((select private.refurb_is_staff()));

drop policy if exists refurb_history_staff_select on public.refurb_movement_history;
create policy refurb_history_staff_select on public.refurb_movement_history for select to authenticated using ((select private.refurb_is_staff()));
drop policy if exists refurb_history_staff_insert on public.refurb_movement_history;
create policy refurb_history_staff_insert on public.refurb_movement_history for insert to authenticated with check ((select private.refurb_is_staff()));

drop policy if exists refurb_audit_staff_select on public.refurb_audit_log;
create policy refurb_audit_staff_select on public.refurb_audit_log for select to authenticated using ((select private.refurb_is_staff()));
drop policy if exists refurb_audit_staff_insert on public.refurb_audit_log;
create policy refurb_audit_staff_insert on public.refurb_audit_log for insert to authenticated with check ((select private.refurb_is_staff()));

create or replace function public.refurb_touch_updated_at() returns trigger language plpgsql set search_path=public,pg_temp as $$ begin new.updated_at=now();return new;end; $$;
drop trigger if exists refurb_laptops_touch_updated_at on public.refurb_laptops;
create trigger refurb_laptops_touch_updated_at before update on public.refurb_laptops for each row execute function public.refurb_touch_updated_at();