-- Pacote B, parte 1 (aditiva, segura de rodar a qualquer momento).
-- Cria as funções que o app passa a usar para criar uma família e para entrar por código.
-- Não muda nenhuma regra existente e não toca em nenhum dado.

create or replace function public.create_household(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  hid uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  -- Quem já tem família não cria outra por engano: devolve a que já existe.
  select household_id into hid
    from household_members
   where user_id = uid
   order by created_at asc
   limit 1;
  if hid is not null then
    return hid;
  end if;

  insert into households (name)
  values (coalesce(nullif(trim(p_name), ''), 'Família'))
  returning id into hid;

  insert into household_members (household_id, user_id, role)
  values (hid, uid, 'owner');

  return hid;
end;
$$;

create or replace function public.join_household_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  hid uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select id into hid
    from households
   where invite_code = lower(trim(p_code));
  if hid is null then
    raise exception 'invalid_code';
  end if;

  insert into household_members (household_id, user_id, role)
  values (hid, uid, 'member')
  on conflict (household_id, user_id) do nothing;

  return hid;
end;
$$;

revoke all on function public.create_household(text) from public, anon;
revoke all on function public.join_household_by_code(text) from public, anon;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household_by_code(text) to authenticated;
