-- Esquema do Planejamento Financeiro Família Louzada
-- Rode isso inteiro no Supabase em: SQL Editor → New query → cole tudo → Run

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------
-- FAMÍLIAS: cada família compartilha os mesmos dados financeiros.
-- Um usuário pode pertencer a uma ou mais famílias (aqui, na prática, uma só).
-- ------------------------------------------------------------------
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now()
);

create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- ------------------------------------------------------------------
-- DADOS FINANCEIROS
-- ------------------------------------------------------------------
create table accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  type text not null check (type in ('conta','cartao')),
  saldo_inicial numeric default 0,
  limite numeric,
  dia_fechamento int,
  dia_vencimento int,
  created_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  type text not null check (type in ('receita','despesa')),
  value numeric not null,
  date date not null,
  category_id text not null,
  subcategory text,
  account_id uuid references accounts(id) on delete set null,
  payment_method text,
  installment boolean default false,
  installment_current int,
  installment_total int,
  recurrence text default 'nenhuma',
  group_id uuid,
  group_type text,
  invoice_bucket text,
  note text,
  source text default 'manual',
  created_at timestamptz not null default now()
);

create table debts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  nome text not null,
  valor_total numeric not null,
  parcela numeric not null,
  total_parcelas int not null,
  data_primeira_parcela date not null,
  taxa_juros numeric default 0,
  conta_id uuid references accounts(id) on delete set null,
  created_at timestamptz not null default now()
);

create table settings (
  household_id uuid primary key references households(id) on delete cascade,
  budget_necessidades numeric default 50,
  budget_desejos numeric default 30,
  budget_futuro numeric default 20,
  goal_valor_imovel numeric,
  goal_pct_entrada numeric default 20,
  goal_prazo_meses int,
  goal_valor_inicial numeric default 0,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- SEGURANÇA: cada família só vê e edita os próprios dados.
-- ------------------------------------------------------------------
alter table households enable row level security;
alter table household_members enable row level security;
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table debts enable row level security;
alter table settings enable row level security;

-- Households: qualquer usuário logado pode procurar uma família pelo código de convite
-- (necessário pra poder entrar numa família existente antes de ainda ser membro dela).
create policy "logados podem localizar familia por convite"
  on households for select
  using (auth.uid() is not null);

create policy "logado pode criar familia"
  on households for insert
  with check (auth.uid() is not null);

create policy "membros veem outros membros da familia"
  on household_members for select
  using (household_id in (select household_id from household_members where user_id = auth.uid()));

create policy "usuario pode entrar em uma familia"
  on household_members for insert
  with check (user_id = auth.uid());

create policy "membros gerenciam contas da familia"
  on accounts for all
  using (household_id in (select household_id from household_members where user_id = auth.uid()))
  with check (household_id in (select household_id from household_members where user_id = auth.uid()));

create policy "membros gerenciam lancamentos da familia"
  on transactions for all
  using (household_id in (select household_id from household_members where user_id = auth.uid()))
  with check (household_id in (select household_id from household_members where user_id = auth.uid()));

create policy "membros gerenciam dividas da familia"
  on debts for all
  using (household_id in (select household_id from household_members where user_id = auth.uid()))
  with check (household_id in (select household_id from household_members where user_id = auth.uid()));

create policy "membros gerenciam configuracoes da familia"
  on settings for all
  using (household_id in (select household_id from household_members where user_id = auth.uid()))
  with check (household_id in (select household_id from household_members where user_id = auth.uid()));

-- Índices para as consultas mais comuns
create index idx_transactions_household_date on transactions(household_id, date);
create index idx_accounts_household on accounts(household_id);
create index idx_debts_household on debts(household_id);
