export async function listBankConnections(supabase, householdId) {
  const { data, error } = await supabase
    .from("bank_connections")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

// Salva (ou atualiza, se já existir) uma conexão bancária pra família.
export async function upsertBankConnection(supabase, householdId, { pluggyItemId, connectorName, status }) {
  const { data, error } = await supabase
    .from("bank_connections")
    .upsert(
      { household_id: householdId, pluggy_item_id: pluggyItemId, connector_name: connectorName, status },
      { onConflict: "household_id,pluggy_item_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function touchBankConnectionSync(supabase, id) {
  const { error } = await supabase
    .from("bank_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Liga uma conta/cartão nosso à conta correspondente na Pluggy.
export async function linkAccountToPluggy(supabase, accountId, pluggyAccountId) {
  const { data, error } = await supabase
    .from("accounts")
    .update({ pluggy_account_id: pluggyAccountId })
    .eq("id", accountId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function unlinkAccountFromPluggy(supabase, accountId) {
  const { error } = await supabase.from("accounts").update({ pluggy_account_id: null }).eq("id", accountId);
  if (error) throw error;
}
