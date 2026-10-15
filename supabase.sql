create table if not exists public.urna_state (
  id text primary key,
  registry jsonb not null default '{}'::jsonb,
  voting jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  seeded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint urna_state_singleton check (id = 'current')
);

alter table public.urna_state enable row level security;

drop policy if exists "Leitura publica do estado da urna" on public.urna_state;
create policy "Leitura publica do estado da urna"
on public.urna_state
for select
to anon, authenticated
using (id = 'current');

revoke all on table public.urna_state from anon, authenticated;
grant select on table public.urna_state to anon, authenticated;

create or replace function public.ensure_urna_state(
  p_registry jsonb,
  p_voting jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.urna_state (id, registry, voting)
  values ('current', p_registry, p_voting)
  on conflict (id) do nothing;
end;
$$;

create or replace function public.compare_and_set_urna_state(
  p_expected_version bigint,
  p_registry jsonb,
  p_voting jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.urna_state
  set registry = p_registry,
      voting = p_voting,
      version = version + 1,
      updated_at = now()
  where id = 'current'
    and version = p_expected_version;

  return found;
end;
$$;

revoke execute on function public.ensure_urna_state(jsonb, jsonb) from public;
revoke execute on function public.compare_and_set_urna_state(bigint, jsonb, jsonb) from public;
grant execute on function public.ensure_urna_state(jsonb, jsonb) to anon, authenticated;
grant execute on function public.compare_and_set_urna_state(bigint, jsonb, jsonb) to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'urna_state'
  ) then
    alter publication supabase_realtime add table public.urna_state;
  end if;
end;
$$;
