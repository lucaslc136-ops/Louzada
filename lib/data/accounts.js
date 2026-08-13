// Camada de acesso a dados que roda no navegador (Client Components).
// Sempre recebe um "supabase" client já criado, pra não instanciar um novo em cada função.

export async function getMyHouseholdId(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.household_id;
}

export async function listAccounts(supabase, householdId) {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createAccount(supabase, householdId, fields) {
  const { data, error } = await supabase
    .from("accounts")
    .insert({ household_id: householdId, saldo_inicial: 0, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAccount(supabase, id, patch) {
  const { data, error } = await supabase.from("accounts").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteAccount(supabase, id) {
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}
