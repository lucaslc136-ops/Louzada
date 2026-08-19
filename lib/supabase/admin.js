import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Esse cliente usa a SERVICE ROLE KEY, que ignora todas as regras de RLS — é o equivalente a
// um superusuário do banco. Só pode ser usado em rotas que rodam no servidor sem um usuário
// logado (como o cron de sincronização noturna). NUNCA importar isso em código de cliente/browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados no servidor.");
  }
  return createSupabaseClient(url, serviceKey, { auth: { persistSession: false } });
}
