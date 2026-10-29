-- Pacote B, parte 2. RODAR SOMENTE DEPOIS que o app novo (que usa as funções da parte 1)
-- estiver publicado na Vercel. Fecha as brechas de households e household_members:
-- antes, qualquer pessoa logada lia todas as famílias (com os códigos de convite) e
-- podia se inserir em qualquer uma. Agora só membros leem a própria família, e criar
-- ou entrar passa obrigatoriamente pelas funções.
-- Não apaga nem altera nenhum dado.

drop policy if exists "logados podem localizar familia por convite" on households;
drop policy if exists "logado pode criar familia" on households;
drop policy if exists "usuario pode entrar em uma familia" on household_members;

create policy "membros veem a propria familia"
  on households for select
  using (is_household_member(id));
