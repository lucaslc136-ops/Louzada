export async function listSubscriptions(supabase, householdId) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createSubscription(supabase, householdId, fields) {
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({ household_id: householdId, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSubscription(supabase, id, patch) {
  const { data, error } = await supabase
    .from("subscriptions")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSubscription(supabase, id) {
  const { error } = await supabase.from("subscriptions").delete().eq("id", id);
  if (error) throw error;
}
