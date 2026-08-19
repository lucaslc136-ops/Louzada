-- Assinaturas/recorrências definidas manualmente pela família — substitui a detecção 100%
-- automática (que tinha falsos positivos com parcelamento) por uma lista que a própria pessoa
-- controla.
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  valor numeric not null,
  dia_cobranca int,
  account_id uuid references accounts(id) on delete set null,
  category_id text,
  subcategory text,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

alter table subscriptions enable row level security;
drop policy if exists "membros gerenciam assinaturas da familia" on subscriptions;
create policy "membros gerenciam assinaturas da familia"
  on subscriptions for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));
