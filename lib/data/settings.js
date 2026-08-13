const DEFAULT_SETTINGS = {
  budget_necessidades: 50,
  budget_desejos: 30,
  budget_futuro: 20,
  goal_valor_imovel: null,
  goal_pct_entrada: 20,
  goal_prazo_meses: null,
  goal_valor_inicial: 0,
};

export async function getSettings(supabase, householdId) {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("household_id", householdId)
    .maybeSingle();
  if (error) throw error;
  return data || { household_id: householdId, ...DEFAULT_SETTINGS };
}

// Sempre existe no máximo 1 linha de configurações por família — upsert cria se não existir.
export async function upsertSettings(supabase, householdId, patch) {
  const { data, error } = await supabase
    .from("settings")
    .upsert({ household_id: householdId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "household_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}
