create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.refurb_laptops(id uuid primary key default gen_random_uuid(),laptop_id text not null unique,brand text not null,model text not null,serial_number text not null unique,configuration text not null,location text not null default 'Bangalore' check(location in('Bangalore','Hosur')),processor text not null,processor_gen text not null,ram_slot_1_size text not null,ram_slot_1_type text not null,ram_slot_2_size text,ram_slot_2_type text,storage_1_capacity text not null,storage_1_type text not null,storage_2_capacity text,storage_2_type text,screen_size text not null,power_adapter_type text not null,stock_status text not null default 'Need to be Checked' check(stock_status in('Need to be Checked','Spares Need to be Replaced','Ready for Sale','Sold','Scrap')),date_received date,purchase_reference_no text,remarks text,condition_data jsonb not null default '{}'::jsonb,created_by uuid references auth.users(id),updated_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists refurb_laptops_location_idx on public.refurb_laptops(location);
create index if not exists refurb_laptops_status_idx on public.refurb_laptops(stock_status);
create index if not exists refurb_laptops_created_by_idx on public.refurb_laptops(created_by);
create index if not exists refurb_laptops_updated_by_idx on public.refurb_laptops(updated_by);

create table if not exists public.refurb_stock_movements(id uuid primary key default gen_random_uuid(),laptop_id uuid not null references public.refurb_laptops(id) on delete restrict,movement_type text not null check(movement_type in('Transfer','Sale','Receipt','Return')),from_location text not null,to_location text not null,movement_at timestamptz not null default now(),reference_no text,amount numeric(14,2),payment_date date,payment_mode text,person_handed_over text,remarks text,version_no integer not null default 1,correction_reason text,corrected_movement_id uuid references public.refurb_stock_movements(id),created_by uuid references auth.users(id),created_at timestamptz not null default now());
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

create table if not exists public.refurb_repair_jobs(id uuid primary key default gen_random_uuid(),laptop_id uuid not null references public.refurb_laptops(id) on delete restrict,technician text,priority text not null default 'Normal' check(priority in('Low','Normal','High','Critical')),status text not null default 'In Repair' check(status in('Awaiting Parts','In Repair','Ready for QC','Completed','Cancelled')),target_date date,started_at timestamptz not null default now(),completed_at timestamptz,estimated_cost numeric(14,2),actual_cost numeric(14,2),parts_reference text,diagnosis text,action_taken text,notes text,version_no integer not null default 1,created_by uuid references auth.users(id),updated_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists refurb_repair_jobs_laptop_idx on public.refurb_repair_jobs(laptop_id,updated_at desc);
create index if not exists refurb_repair_jobs_status_idx on public.refurb_repair_jobs(status,priority,target_date);
create table if not exists public.refurb_repair_parts(id uuid primary key default gen_random_uuid(),repair_job_id uuid not null references public.refurb_repair_jobs(id) on delete cascade,part_name text not null,part_number text,supplier text,reference_no text,required_qty numeric(10,2) not null default 1 check(required_qty>0),consumed_qty numeric(10,2) not null default 0 check(consumed_qty>=0 and consumed_qty<=required_qty),unit_cost numeric(14,2) not null default 0 check(unit_cost>=0),status text not null default 'Required' check(status in('Required','Ordered','Received','Consumed','Returned','Cancelled')),notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists refurb_repair_parts_job_idx on public.refurb_repair_parts(repair_job_id);
alter table public.refurb_repair_jobs enable row level security;
alter table public.refurb_repair_parts enable row level security;
drop policy if exists refurb_repair_jobs_staff_select on public.refurb_repair_jobs; create policy refurb_repair_jobs_staff_select on public.refurb_repair_jobs for select to authenticated using ((select private.refurb_is_staff()));
drop policy if exists refurb_repair_jobs_staff_insert on public.refurb_repair_jobs; create policy refurb_repair_jobs_staff_insert on public.refurb_repair_jobs for insert to authenticated with check ((select private.refurb_is_staff()));
drop policy if exists refurb_repair_jobs_staff_update on public.refurb_repair_jobs; create policy refurb_repair_jobs_staff_update on public.refurb_repair_jobs for update to authenticated using ((select private.refurb_is_staff())) with check ((select private.refurb_is_staff()));
drop policy if exists refurb_repair_parts_staff_select on public.refurb_repair_parts; create policy refurb_repair_parts_staff_select on public.refurb_repair_parts for select to authenticated using ((select private.refurb_is_staff()));
drop policy if exists refurb_repair_parts_staff_insert on public.refurb_repair_parts; create policy refurb_repair_parts_staff_insert on public.refurb_repair_parts for insert to authenticated with check ((select private.refurb_is_staff()));
drop policy if exists refurb_repair_parts_staff_update on public.refurb_repair_parts; create policy refurb_repair_parts_staff_update on public.refurb_repair_parts for update to authenticated using ((select private.refurb_is_staff())) with check ((select private.refurb_is_staff()));
drop policy if exists refurb_repair_parts_staff_delete on public.refurb_repair_parts; create policy refurb_repair_parts_staff_delete on public.refurb_repair_parts for delete to authenticated using ((select private.refurb_is_staff()));
create or replace function public.refurb_repair_touch_updated_at() returns trigger language plpgsql set search_path=public,pg_temp as $$ begin new.updated_at=now();return new;end; $$;
drop trigger if exists refurb_repair_jobs_touch_updated_at on public.refurb_repair_jobs; create trigger refurb_repair_jobs_touch_updated_at before update on public.refurb_repair_jobs for each row execute function public.refurb_repair_touch_updated_at();
drop trigger if exists refurb_repair_parts_touch_updated_at on public.refurb_repair_parts; create trigger refurb_repair_parts_touch_updated_at before update on public.refurb_repair_parts for each row execute function public.refurb_repair_touch_updated_at();

create table if not exists public.refurb_lifecycle_events(id uuid primary key default gen_random_uuid(),laptop_id uuid not null references public.refurb_laptops(id) on delete cascade,event_type text not null,event_status text,from_status text,to_status text,from_location text,to_location text,reference_id uuid,details jsonb not null default '{}'::jsonb,created_by uuid references auth.users(id),created_at timestamptz not null default now());
create index if not exists refurb_lifecycle_laptop_idx on public.refurb_lifecycle_events(laptop_id,created_at desc);
create index if not exists refurb_lifecycle_type_idx on public.refurb_lifecycle_events(event_type,created_at desc);
alter table public.refurb_lifecycle_events enable row level security;
drop policy if exists refurb_lifecycle_staff_select on public.refurb_lifecycle_events; create policy refurb_lifecycle_staff_select on public.refurb_lifecycle_events for select to authenticated using ((select private.refurb_is_staff()));
drop policy if exists refurb_lifecycle_staff_insert on public.refurb_lifecycle_events; create policy refurb_lifecycle_staff_insert on public.refurb_lifecycle_events for insert to authenticated with check ((select private.refurb_is_staff()));
grant select,insert on public.refurb_lifecycle_events to authenticated;


create or replace function public.refurb_save_movement_atomic(p_movement jsonb, p_user_id uuid)
returns public.refurb_stock_movements language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_laptop public.refurb_laptops%rowtype; v_row public.refurb_stock_movements%rowtype; v_type text:=nullif(trim(p_movement->>'type'),''); v_from text:=nullif(trim(p_movement->>'from'),''); v_to text:=nullif(trim(p_movement->>'to'),''); v_lid uuid:=nullif(p_movement->>'__laptopDbId','')::uuid; v_amount numeric(14,2); v_payment_date date;
begin
if v_lid is null then raise exception using message='Laptop is required'; end if;
select * into v_laptop from public.refurb_laptops where id=v_lid for update;
if not found then raise exception using message='Laptop not found'; end if;
if v_type not in('Sale','Transfer') then raise exception using message='Invalid movement type'; end if;
if v_from not in('Bangalore','Hosur') or v_laptop.location<>v_from then raise exception using message='Invalid source location'; end if;
if v_type='Transfer' and (v_to not in('Bangalore','Hosur') or v_from=v_to) then raise exception using message='Invalid transfer destination'; end if;
if v_type='Sale' and v_laptop.stock_status<>'Ready for Sale' then raise exception using message='Sale requires Ready for Sale status'; end if;
if nullif(p_movement->>'amount','') is not null then v_amount:=(p_movement->>'amount')::numeric; if v_amount<0 then raise exception using message='Sale amount cannot be negative'; end if; end if;
if nullif(p_movement->>'paymentDate','') is not null then v_payment_date:=(p_movement->>'paymentDate')::date; end if;
insert into public.refurb_stock_movements(laptop_id,movement_type,from_location,to_location,movement_at,reference_no,amount,payment_date,payment_mode,person_handed_over,remarks,version_no,created_by)
values(v_lid,v_type,v_from,coalesce(v_to,v_laptop.location),coalesce(nullif(p_movement->>'date','')::timestamptz,now()),nullif(p_movement->>'reference',''),v_amount,v_payment_date,nullif(p_movement->>'paymentMode',''),nullif(p_movement->>'personHandedOver',''),nullif(p_movement->>'remarks',''),1,p_user_id) returning * into v_row;
update public.refurb_laptops set location=case when v_type='Transfer' then v_to else location end,stock_status=case when v_type='Sale' then 'Sold' else stock_status end,updated_by=p_user_id where id=v_lid;
insert into public.refurb_lifecycle_events(laptop_id,event_type,event_status,from_status,to_status,from_location,to_location,reference_id,details,created_by)
values(v_lid,'STOCK_MOVEMENT',case when v_type='Sale' then 'Sold' else v_laptop.stock_status end,v_laptop.stock_status,case when v_type='Sale' then 'Sold' else v_laptop.stock_status end,v_from,coalesce(v_to,v_laptop.location),v_row.id,jsonb_build_object('type',v_type,'amount',v_amount,'reference',v_row.reference_no),p_user_id);
return v_row; end $$;

create or replace function public.refurb_correct_movement_atomic(p_movement_id uuid,p_type text,p_from text,p_to text,p_date timestamptz,p_reference text,p_amount numeric,p_payment_date date,p_payment_mode text,p_person_handed_over text,p_remarks text,p_reason text,p_user_id uuid)
returns public.refurb_stock_movements language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_old public.refurb_stock_movements%rowtype; v_laptop public.refurb_laptops%rowtype; v_row public.refurb_stock_movements%rowtype; v_status text; v_location text;
begin
if p_movement_id is null or nullif(trim(coalesce(p_reason,'')),'') is null then raise exception using message='Movement and correction reason are required'; end if;
select * into v_old from public.refurb_stock_movements where id=p_movement_id for update; if not found then raise exception using message='Movement not found'; end if;
select * into v_laptop from public.refurb_laptops where id=v_old.laptop_id for update; if not found then raise exception using message='Laptop not found'; end if;
if v_old.movement_type not in('Sale','Transfer') then raise exception using message='Only Sale and Transfer movements can be corrected'; end if;
if p_type not in('Sale','Transfer') then raise exception using message='Invalid corrected movement type'; end if;
if p_from not in('Bangalore','Hosur') then raise exception using message='Invalid correction source location'; end if;
if p_type='Transfer' and p_to not in('Bangalore','Hosur') then raise exception using message='Invalid transfer destination'; end if;
if p_type='Sale' and p_to <> 'Customer' then raise exception using message='Sale destination must be Customer'; end if;
if p_type='Transfer' and p_from=p_to then raise exception using message='Transfer source and destination must differ'; end if;
if p_type='Sale' and v_laptop.stock_status='Scrap' then raise exception using message='Scrap cannot be corrected into Sale'; end if;
if p_amount is not null and p_amount<0 then raise exception using message='Sale amount cannot be negative'; end if;
insert into public.refurb_movement_history(movement_id,version_no,snapshot,correction_reason,created_by) values(v_old.id,v_old.version_no,to_jsonb(v_old),p_reason,p_user_id);
update public.refurb_stock_movements set movement_type=p_type,from_location=p_from,to_location=p_to,movement_at=coalesce(p_date,movement_at),reference_no=p_reference,amount=p_amount,payment_date=p_payment_date,payment_mode=p_payment_mode,person_handed_over=p_person_handed_over,remarks=p_remarks,version_no=v_old.version_no+1,correction_reason=p_reason,corrected_movement_id=v_old.id where id=v_old.id returning * into v_row;
v_location:=case when p_type='Transfer' then p_to else p_from end;
v_status:=case when p_type='Sale' then 'Sold' when v_laptop.stock_status='Sold' then 'Ready for Sale' else v_laptop.stock_status end;
update public.refurb_laptops set location=v_location,stock_status=v_status,updated_by=p_user_id where id=v_old.laptop_id;
insert into public.refurb_lifecycle_events(laptop_id,event_type,event_status,from_status,to_status,from_location,to_location,reference_id,details,created_by)
values(v_old.laptop_id,'MOVEMENT_CORRECTED',v_status,v_laptop.stock_status,v_status,v_laptop.location,v_location,v_row.id,jsonb_build_object('reason',p_reason,'previous_movement',to_jsonb(v_old),'version',v_row.version_no),p_user_id);
return v_row; end $$;

create or replace function public.refurb_save_repair_atomic(p_job jsonb,p_parts jsonb,p_user_id uuid)
returns public.refurb_repair_jobs language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_job public.refurb_repair_jobs%rowtype; v_existing public.refurb_repair_jobs%rowtype; v_id uuid:=nullif(p_job->>'id','')::uuid; v_laptop_id uuid:=nullif(p_job->>'laptop_id','')::uuid; v_status text:=coalesce(nullif(p_job->>'status',''),'In Repair'); v_priority text:=coalesce(nullif(p_job->>'priority',''),'Normal'); v_part jsonb;
begin
if v_laptop_id is null then raise exception using message='Laptop is required'; end if;
perform 1 from public.refurb_laptops where id=v_laptop_id for update; if not found then raise exception using message='Laptop not found'; end if;
if v_priority not in('Low','Normal','High','Critical') then raise exception using message='Invalid repair priority'; end if;
if v_status not in('Awaiting Parts','In Repair','Ready for QC','Completed','Cancelled') then raise exception using message='Invalid repair status'; end if;
if v_id is not null then
 select * into v_existing from public.refurb_repair_jobs where id=v_id for update; if not found then raise exception using message='Repair job not found'; end if;
 update public.refurb_repair_jobs set laptop_id=v_laptop_id,technician=nullif(trim(p_job->>'technician'),''),priority=v_priority,status=v_status,target_date=nullif(p_job->>'target_date','')::date,completed_at=case when v_status='Completed' then coalesce(v_existing.completed_at,now()) else null end,estimated_cost=nullif(p_job->>'estimated_cost','')::numeric,actual_cost=nullif(p_job->>'actual_cost','')::numeric,parts_reference=nullif(trim(p_job->>'parts_reference'),''),diagnosis=nullif(trim(p_job->>'diagnosis'),''),action_taken=nullif(trim(p_job->>'action_taken'),''),notes=nullif(trim(p_job->>'notes'),''),version_no=v_existing.version_no+1,updated_by=p_user_id where id=v_id returning * into v_job;
else
 insert into public.refurb_repair_jobs(laptop_id,technician,priority,status,target_date,estimated_cost,actual_cost,parts_reference,diagnosis,action_taken,notes,created_by,updated_by,completed_at)
 values(v_laptop_id,nullif(trim(p_job->>'technician'),''),v_priority,v_status,nullif(p_job->>'target_date','')::date,nullif(p_job->>'estimated_cost','')::numeric,nullif(p_job->>'actual_cost','')::numeric,nullif(trim(p_job->>'parts_reference'),''),nullif(trim(p_job->>'diagnosis'),''),nullif(trim(p_job->>'action_taken'),''),nullif(trim(p_job->>'notes'),''),p_user_id,p_user_id,case when v_status='Completed' then now() else null end) returning * into v_job;
end if;
delete from public.refurb_repair_parts where repair_job_id=v_job.id;
if jsonb_typeof(coalesce(p_parts,'[]'::jsonb))='array' then for v_part in select * from jsonb_array_elements(p_parts) loop
insert into public.refurb_repair_parts(repair_job_id,part_name,part_number,supplier,reference_no,required_qty,consumed_qty,unit_cost,status,notes)
values(v_job.id,trim(v_part->>'part_name'),nullif(trim(v_part->>'part_number'),''),nullif(trim(v_part->>'supplier'),''),nullif(trim(v_part->>'reference_no'),''),coalesce((v_part->>'required_qty')::numeric,1),coalesce((v_part->>'consumed_qty')::numeric,0),coalesce((v_part->>'unit_cost')::numeric,0),coalesce(nullif(v_part->>'status',''),'Required'),nullif(trim(v_part->>'notes'),''));
end loop; end if;
insert into public.refurb_lifecycle_events(laptop_id,event_type,event_status,reference_id,details,created_by) values(v_job.laptop_id,'REPAIR_UPDATED',v_job.status,v_job.id,jsonb_build_object('priority',v_job.priority,'parts',jsonb_array_length(coalesce(p_parts,'[]'::jsonb))),p_user_id);
return v_job; end $$;

revoke all on function public.refurb_save_movement_atomic(jsonb,uuid) from public,anon,authenticated;
revoke all on function public.refurb_correct_movement_atomic(uuid,text,text,text,timestamptz,text,numeric,date,text,text,text,text,uuid) from public,anon,authenticated;
revoke all on function public.refurb_save_repair_atomic(jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.refurb_save_movement_atomic(jsonb,uuid) to service_role;
grant execute on function public.refurb_correct_movement_atomic(uuid,text,text,text,timestamptz,text,numeric,date,text,text,text,text,uuid) to service_role;
grant execute on function public.refurb_save_repair_atomic(jsonb,jsonb,uuid) to service_role;
