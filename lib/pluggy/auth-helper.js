import { createClient } from "@/lib/supabase/server";

// Usado por todas as rotas /api/pluggy/* pra confirmar quem está fazendo a chamada e qual é a
// família dele — nenhuma rota confia em household_id vindo do corpo da requisição sem checar.
export async function getAuthedHousehold() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, householdId: null };

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return { supabase, user, householdId: membership?.household_id || null };
}
