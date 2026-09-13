-- HNBT Inventory multi-user authorization foundation
-- Run in Supabase SQL Editor only when the multi-user feature is ready for activation.

create table if not exists public.employee_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'employee' check (role in ('admin','employee')),
  branch text not null default 'Both' check (branch in ('Bangalore','Hosur','Both')),
  active boolean not null default true,
  can_manage_products boolean not null default false,
  can_stock_movement boolean not null default true,
  can_view_reports boolean not null default true,
  can_manage_masters boolean not null default false,
  can_view_audit_logs boolean not null default false,
  can_manage_users boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_profiles_role_idx on public.employee_profiles(role);
create index if not exists employee_profiles_branch_idx on public.employee_profiles(branch);

alter table public.employee_profiles enable row level security;

-- A signed-in employee can read their own profile.
drop policy if exists "employee_read_own_profile" on public.employee_profiles;
create policy "employee_read_own_profile"
on public.employee_profiles for select
to authenticated
using (auth.uid() = user_id);

-- Admins can read all profiles. User creation itself will be performed server-side
-- with the Supabase service role key; the service role bypasses RLS.
drop policy if exists "admin_read_all_profiles" on public.employee_profiles;
create policy "admin_read_all_profiles"
on public.employee_profiles for select
to authenticated
using (
  exists (
    select 1 from public.employee_profiles p
    where p.user_id = auth.uid() and p.role = 'admin' and p.active = true
  )
);

-- Admins may update profiles/permissions, but users cannot promote themselves
-- unless they are already an active admin.
drop policy if exists "admin_update_profiles" on public.employee_profiles;
create policy "admin_update_profiles"
on public.employee_profiles for update
to authenticated
using (
  exists (
    select 1 from public.employee_profiles p
    where p.user_id = auth.uid() and p.role = 'admin' and p.active = true
  )
)
with check (
  exists (
    select 1 from public.employee_profiles p
    where p.user_id = auth.uid() and p.role = 'admin' and p.active = true
  )
);

grant select, update on public.employee_profiles to authenticated;
revoke insert, delete on public.employee_profiles from anon, authenticated;

-- Audit records become attributable to the authenticated Supabase user.
alter table public.audit_logs add column if not exists actor_user_id uuid references auth.users(id) on delete set null;
create index if not exists audit_logs_actor_user_id_idx on public.audit_logs(actor_user_id);
