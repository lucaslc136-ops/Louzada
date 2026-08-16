-- Guarda o último saldo real que a Pluggy informou pra cada conta vinculada, e quando foi
-- atualizado. Usado pra comparar com o saldo que CALCULAMOS (soma dos lançamentos) e avisar se
-- os dois divergirem — sinal de que algo escapou (lançamento faltando, duplicado, etc).
alter table accounts add column if not exists pluggy_balance numeric;
alter table accounts add column if not exists pluggy_balance_updated_at timestamptz;
