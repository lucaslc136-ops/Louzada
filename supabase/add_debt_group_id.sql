-- Liga cada dívida ao grupo de lançamentos que ela gera (parcelas como despesas de verdade,
-- pra contarem em Despesas do mês, Fluxo de Caixa e Orçamento 50/30/20).
-- Seguro rodar mesmo com dívidas já cadastradas — elas só ficam com group_id vazio até
-- você clicar em "Sincronizar lançamentos" na aba Dívidas.

alter table debts add column if not exists group_id uuid;
