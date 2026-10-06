create table if not exists public.daily_plans (
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_date date not null,
  plan jsonb not null check (jsonb_typeof(plan) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, plan_date)
);

alter table public.daily_plans enable row level security;

revoke all on table public.daily_plans from anon, authenticated;
grant select, insert, update, delete on table public.daily_plans to authenticated;

drop policy if exists "Users can read their own daily plans" on public.daily_plans;
create policy "Users can read their own daily plans"
  on public.daily_plans for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own daily plans" on public.daily_plans;
create policy "Users can create their own daily plans"
  on public.daily_plans for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own daily plans" on public.daily_plans;
create policy "Users can update their own daily plans"
  on public.daily_plans for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own daily plans" on public.daily_plans;
create policy "Users can delete their own daily plans"
  on public.daily_plans for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_daily_plans_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_daily_plans_updated_at() from public, anon, authenticated;

drop trigger if exists set_daily_plans_updated_at on public.daily_plans;
create trigger set_daily_plans_updated_at
  before update on public.daily_plans
  for each row
  execute function public.set_daily_plans_updated_at();
