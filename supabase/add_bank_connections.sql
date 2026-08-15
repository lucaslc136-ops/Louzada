-- Rastreia cada conexão bancária (Nubank, Caixa, Itaú...) vinda da Pluggy, por família.
create table if not exists bank_connections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  pluggy_item_id uuid not null,
  connector_name text,
  status text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (household_id, pluggy_item_id)
);

alter table bank_connections enable row level security;
drop policy if exists "membros gerenciam conexoes bancarias da familia" on bank_connections;
create policy "membros gerenciam conexoes bancarias da familia"
  on bank_connections for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

-- Liga uma conta/cartão nosso à conta correspondente na Pluggy (pra saber onde importar).
alter table accounts add column if not exists pluggy_account_id uuid;

-- Evita importar o mesmo lançamento duas vezes numa sincronização futura.
alter table transactions add column if not exists external_id text;
create unique index if not exists transactions_external_id_unique
  on transactions (household_id, external_id) where external_id is not null;
