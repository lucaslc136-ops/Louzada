export async function listCustomCategories(supabase, householdId) {
  const { data, error } = await supabase
    .from("custom_categories")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createCustomCategory(supabase, householdId, { name, group_name, subcategories }) {
  const { data, error } = await supabase
    .from("custom_categories")
    .insert({ household_id: householdId, name, group_name, subcategories: subcategories.length ? subcategories : ["Diversos"] })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCustomCategory(supabase, id) {
  const { error } = await supabase.from("custom_categories").delete().eq("id", id);
  if (error) throw error;
}
