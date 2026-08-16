-- Marca lançamentos importados automaticamente (via sincronização noturna) que ainda não
-- tiveram a categoria revisada por ninguém — diferente da sincronização manual, que já passa
-- pela tela de revisão antes de salvar.
alter table transactions add column if not exists needs_review boolean not null default false;

-- Aponta pra outro lançamento que parece ser a mesma coisa (mesmo valor, data próxima, mesma
-- conta) — usado quando um lançamento vindo do banco parece bater com algo já digitado à mão.
alter table transactions add column if not exists possible_duplicate_of uuid references transactions(id) on delete set null;
