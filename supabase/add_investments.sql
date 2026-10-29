-- Carteira de investimentos da família. Só cria tabelas novas, não mexe em nada que já existe.
--
-- investments: uma linha por aplicação (ex.: "Tesouro Selic 2029", "CDB Banco X", "Ações PETR4").
--   valor_aplicado = quanto saiu do bolso (custo), valor_atual = quanto vale hoje.
--   taxa_anual = rentabilidade esperada em % ao ano, usada só nas projeções.
--   reserva = marca a aplicação como parte da reserva de emergência.
-- investment_entries: histórico de movimentos (saldo inicial, aporte, resgate, atualização de valor),
--   usado para o gráfico de evolução.

create table if not exists investments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  kind text not null default 'outro' check (kind in (
    'tesouro_selic','tesouro_ipca','tesouro_pre','cdb','lci_lca','fundo_di','renda_fixa_outro',
    'fii','acao','etf','fundo','cripto','previdencia','poupanca','dinheiro_aplicado','outro'
  )),
  institution text,
  valor_aplicado numeric not null default 0 check (valor_aplicado >= 0),
  valor_atual numeric not null default 0 check (valor_atual >= 0),
  taxa_anual numeric,
  vencimento date,
  reserva boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists investment_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  investment_id uuid not null references investments(id) on delete cascade,
  date date not null,
  kind text not null check (kind in ('saldo_inicial','aporte','resgate','valor')),
  amount numeric not null default 0 check (amount >= 0),
  valor_apos numeric not null check (valor_apos >= 0),
  created_at timestamptz not null default now()
);

create index if not exists investments_household_idx on investments (household_id);
create index if not exists investment_entries_household_idx on investment_entries (household_id, date);
create index if not exists investment_entries_investment_idx on investment_entries (investment_id);

alter table investments enable row level security;
drop policy if exists "membros gerenciam investimentos da familia" on investments;
create policy "membros gerenciam investimentos da familia"
  on investments for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

alter table investment_entries enable row level security;
drop policy if exists "membros gerenciam movimentos de investimento da familia" on investment_entries;
create policy "membros gerenciam movimentos de investimento da familia"
  on investment_entries for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));
