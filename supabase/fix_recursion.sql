-- Correção: as políticas de segurança de accounts/transactions/debts/settings/household_members
-- checavam a tabela household_members consultando ela mesma, o que causa erro de
-- "recursão infinita" no Postgres. Isso fazia a checagem "essa pessoa pertence à família?"
-- falhar sempre, jogando o app de volta pra tela de onboarding.
--
-- Rode isso inteiro no SQL Editor do Supabase. É seguro rodar mesmo com dados já existentes —
-- só troca as regras, não apaga nenhum lançamento, conta ou família.

create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

drop policy if exists "membros veem outros membros da familia" on household_members;
create policy "membros veem outros membros da familia"
  on household_members for select
  using (is_household_member(household_id));

drop policy if exists "membros gerenciam contas da familia" on accounts;
create policy "membros gerenciam contas da familia"
  on accounts for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

drop policy if exists "membros gerenciam lancamentos da familia" on transactions;
create policy "membros gerenciam lancamentos da familia"
  on transactions for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

drop policy if exists "membros gerenciam dividas da familia" on debts;
create policy "membros gerenciam dividas da familia"
  on debts for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

drop policy if exists "membros gerenciam configuracoes da familia" on settings;
create policy "membros gerenciam configuracoes da familia"
  on settings for all
  using (is_household_member(household_id))
  with check (is_household_member(household_id));
