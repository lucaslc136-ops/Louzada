import { createBrowserClient } from "@supabase/ssr";

// Cliente do Supabase para rodar no navegador (Client Components).
// As duas variáveis abaixo vêm do painel do Supabase: Project Settings → API.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
