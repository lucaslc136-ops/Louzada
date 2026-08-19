-- Categorias customizadas — além das categorias padrão do app (que continuam existindo e
-- funcionando exatamente como antes, sem nenhuma migração necessária), cada família pode
-- criar as próprias. Seguro rodar mesmo com lançamentos já existentes.

create extension if not exists "pgcrypto";

create table if not exists custom_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  group_name text not null check (group_name in ('necessidades','desejos','futuro','receita')),
  subcategories text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table custom_categories enable row level security;

drop policy if exists "membros gerenciam categorias da familia" on custom_categories;
create policy "membros gerenciam categorias da familia"
  on custom_categories for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));
